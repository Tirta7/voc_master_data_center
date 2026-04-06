import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  EntityManager,
  DataSource,
} from 'typeorm';
import { Expense, ExpenseCategory, ExpenseStatus } from './entities/expense.entity';
import { Cashflow, CashflowType } from './entities/cashflow.entity';
import { AuditLog } from '../report/entities/audit-log.entity';
import { Setting } from '../settings/entities/setting.entity';
import { ApprovalService } from '../common/approval/approval.service';
import { ApprovalModuleType } from '../common/entities/approval.entity';

import { BilliardGateway } from '../socket/billiard.gateway';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(Cashflow)
    private readonly cashflowRepository: Repository<Cashflow>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(Setting)
    private readonly settingRepo: Repository<Setting>,
    private readonly billiardGateway: BilliardGateway,
    private readonly approvalService: ApprovalService,
    private readonly dataSource: DataSource,
  ) {}

  private parseDate(
    dateStr: string | undefined,
    defaultDate: Date,
    endOfDay = false,
  ): Date {
    if (!dateStr) return defaultDate;

    // Remove trailing 'Z' if present to treat as local or as defined by the string
    let cleanStr = dateStr;

    // Handle ISO strings that might already have seconds or not
    // If it doesn't have 'T', it's likely just YYYY-MM-DD
    if (!cleanStr.includes('T')) {
      cleanStr += endOfDay ? 'T23:59:59' : 'T00:00:00';
    } else {
      // It has a 'T', check if it has seconds
      const timePart = cleanStr.split('T')[1];
      const colonCount = (timePart.match(/:/g) || []).length;
      if (colonCount === 1) {
        // HH:mm format, add seconds
        cleanStr += endOfDay ? ':59' : ':00';
      }
    }

    const date = new Date(cleanStr);
    // Fallback for invalid dates
    return isNaN(date.getTime()) ? defaultDate : date;
  }

  async recordExpense(data: {
    amount: number;
    category: ExpenseCategory;
    description: string;
    recordedBy: string;
    recordedByUserId?: number;
    shiftId?: number;
    businessDayId?: number;
  }): Promise<Expense> {
    return this.expenseRepository.manager.transaction(async (manager) => {
      // 1. Fetch Dynamic Approval Levels
      const settings = await this.settingRepo.findOne({ where: {} });
      let requiredLevels = settings?.approvalConfig?.EXPENSE || [];
      
      // Safety Fallback (minimalism)
      if (requiredLevels.length === 0) {
        requiredLevels = [2]; 
      }
      requiredLevels = [...requiredLevels].sort((a,b) => a-b);

      const expense = manager.create(Expense, {
        ...data,
        status: ExpenseStatus.PENDING,
      });
      const savedExpense = await manager.save(Expense, expense);

      await this.approvalService.createRequest({
        moduleType: ApprovalModuleType.EXPENSE,
        referenceId: savedExpense.id,
        requestedByUserId: data.recordedByUserId || 1, // Fallback to 1 only if absolutely mission critical, but now enforced by controller
        requiredLevels,
        metadata: {
          amount: data.amount,
          category: data.category,
          description: data.description,
          recordedBy: data.recordedBy,
        },
      });

      // Audit trail record (Requested)
      const audit = manager.create(AuditLog, {
        action: 'EXPENSE_REQUESTED',
        user: data.recordedBy,
        details: `Requested expense: ${data.description} (Rp ${Number(data.amount).toLocaleString()}) - Status: PENDING APPROVAL`,
      });
      await manager.save(AuditLog, audit);

      return savedExpense;
    });
  }

  // ── Update Expense ──────────────────────────────────────────────────────
  async updateExpense(
    id: number,
    data: {
      amount?: number;
      category?: ExpenseCategory;
      description?: string;
      recordedBy?: string;
    },
  ): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({ where: { id } });
    if (!expense) throw new NotFoundException(`Expense #${id} not found`);

    Object.assign(expense, data);
    const updated = await this.expenseRepository.save(expense);

    // Audit trail record
    const audit = this.auditLogRepository.create({
      action: 'EXPENSE_UPDATED',
      user: data.recordedBy || 'System',
      details: `Updated expense #${id}: ${updated.description} (Rp ${Number(updated.amount).toLocaleString()})`,
    });
    await this.auditLogRepository.save(audit);

    return updated;
  }

  async deleteExpense(id: number): Promise<{ deleted: boolean }> {
    return this.expenseRepository.manager.transaction(async (manager) => {
      const expense = await manager.findOne(Expense, { where: { id } });
      if (!expense) throw new NotFoundException(`Expense #${id} not found`);

      // Reverse the cashflow entry by adding the amount back in
      await this.logCashflow(
        {
          amount: Number(expense.amount),
          type: CashflowType.IN,
          source: 'expense_reversal',
          referenceId: id.toString(),
          description: `Reversal: ${expense.description}`,
          businessDayId: expense.businessDayId,
          shiftId: expense.shiftId,
        },
        manager,
      );

      // Audit trail record
      const audit = manager.create(AuditLog, {
        action: 'EXPENSE_DELETED',
        user: 'System/Manager',
        details: `Deleted expense #${id}: ${expense.description} (Rp ${Number(expense.amount).toLocaleString()})`,
      });
      await manager.save(AuditLog, audit);

      await manager.remove(Expense, expense);
      return { deleted: true };
    });
  }

  async logCashflow(
    data: {
      amount: number;
      type: CashflowType;
      source: string;
      referenceId?: string;
      description?: string;
      businessDayId?: number;
      shiftId?: number;
      paymentMethod?: string;
    },
    manager?: any,
  ): Promise<Cashflow> {
    const queryManager = manager || this.cashflowRepository.manager;
    return queryManager.transaction(
      async (transactionalManager: EntityManager) => {
        return this.performLogCashflow(data, transactionalManager);
      },
    );
  }

  private async performLogCashflow(
    data: {
      amount: number;
      type: CashflowType;
      source: string;
      referenceId?: string;
      description?: string;
      businessDayId?: number;
      shiftId?: number;
      paymentMethod?: string;
    },
    queryManager: any,
  ): Promise<Cashflow> {
    // We MUST find the last entry and lock it to prevent race conditions on balanceAfter
    const lastEntry = await queryManager.findOne(Cashflow, {
      where: {},
      order: { id: 'DESC' },
      lock: { mode: 'pessimistic_write' as any },
    });

    const currentBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;
    const numAmount = Number(data.amount);

    const balanceAfter =
      data.type === CashflowType.IN
        ? currentBalance + numAmount
        : currentBalance - numAmount;

    const cashflow = queryManager.create(Cashflow, {
      ...data,
      amount: numAmount,
      balanceAfter: Number(balanceAfter.toFixed(2)),
      paymentMethod: data.paymentMethod,
      timestamp: new Date(),
    });

    const saved = await queryManager.save(Cashflow, cashflow);

    // Broadcast outside transaction or use afterCommit pattern
    // In NestJS/TypeORM, we manually broadcast after save here.
    this.billiardGateway.broadcastFinanceUpdate(saved);

    return saved;
  }

  async getLedger(limit = 150, startDate?: string, endDate?: string) {
    const where: any = {};
    const start = startDate ? this.parseDate(startDate, new Date()) : null;
    const end = endDate ? this.parseDate(endDate, new Date(), true) : null;

    if (start && end) {
      where.timestamp = Between(start, end);
    } else if (start) {
      where.timestamp = MoreThanOrEqual(start);
    } else if (end) {
      where.timestamp = LessThanOrEqual(end);
    }

    const [entries, stats] = await Promise.all([
      // 1. Get limited entries for display
      this.cashflowRepository.find({
        where,
        relations: ['businessDay', 'shift'],
        order: { timestamp: 'DESC' },
        take: limit > 0 ? limit : undefined,
      }),
      // 2. Get full period summary for stats cards
      this.cashflowRepository
        .createQueryBuilder('c')
        .leftJoin('c.shift', 's')
        .select('c.type', 'type')
        .addSelect('c.source', 'source')
        .addSelect('SUM(c.amount)', 'total')
        .addSelect('s.shiftName', 'shiftName')
        .where('1=1')
        .andWhere(start ? 'c.timestamp >= :start' : '1=1', { start })
        .andWhere(end ? 'c.timestamp <= :end' : '1=1', { end })
        .groupBy('c.type')
        .addGroupBy('c.source')
        .addGroupBy('s.shiftName')
        .getRawMany(),
    ]);

    // Process stats in JS to handle Member Usage exclusion clearly
    let totalIn = 0;
    let totalOut = 0;
    const shiftPerf: Record<string, number> = {};

    stats.forEach((s) => {
      const amount = Number(s.total || 0);
      const isMemberUsage = (s.source || '').toLowerCase() === 'usage:member';

      if (s.type === CashflowType.IN) {
        if (!isMemberUsage) {
          totalIn += amount;
          const sName = s.shiftName || 'Lainnya';
          shiftPerf[sName] = (shiftPerf[sName] || 0) + amount;
        }
      } else {
        totalOut += amount;
      }
    });

    // To get splitCount and memberUsageCount accurately for the whole period:
    const countStats = await this.cashflowRepository
      .createQueryBuilder('c')
      .select('COUNT(DISTINCT c.referenceId)', 'count')
      .addSelect('c.source', 'source')
      .where('1=1')
      .andWhere(start ? 'c.timestamp >= :start' : '1=1', { start })
      .andWhere(end ? 'c.timestamp <= :end' : '1=1', { end })
      .andWhere(
        "(LOWER(c.source) LIKE '%split%' OR LOWER(c.source) LIKE '%multi%' OR LOWER(c.source) = 'usage:member')",
      )
      .groupBy('c.source')
      .getRawMany();

    let splitCount = 0;
    let memberUsageCount = 0;
    countStats.forEach((cs) => {
      const src = (cs.source || '').toLowerCase();
      if (src === 'usage:member') {
        memberUsageCount += Number(cs.count);
      } else {
        splitCount += Number(cs.count);
      }
    });

    return {
      entries,
      summary: {
        totalIn,
        totalOut,
        splitCount,
        memberUsageCount,
        shiftPerformance: Object.entries(shiftPerf)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total),
      },
    };
  }

  // ── Get Expense History (with optional filters) ─────────────────────────
  async getExpenseHistory(filters?: {
    startDate?: string;
    endDate?: string;
    category?: string;
  }) {
    const where: any = {};

    if (filters?.startDate && filters?.endDate) {
      const start = this.parseDate(filters.startDate, new Date());
      const end = this.parseDate(filters.endDate, new Date(), true);
      where.date = Between(start, end);
    } else if (filters?.startDate) {
      where.date = MoreThanOrEqual(
        this.parseDate(filters.startDate, new Date()),
      );
    } else if (filters?.endDate) {
      where.date = LessThanOrEqual(
        this.parseDate(filters.endDate, new Date(), true),
      );
    }

    if (filters?.category && filters.category !== 'all') {
      where.category = filters.category;
    }

    return this.expenseRepository.find({
      where,
      order: { date: 'DESC' },
    });
  }

  // ── Expense Summary with Net Profit ──────────────────────────────────────
  async getExpenseSummary(startDate?: string, endDate?: string) {
    // Build date range (default: current month)
    const now = new Date();
    const start = this.parseDate(
      startDate,
      new Date(now.getFullYear(), now.getMonth(), 1),
    );
    const end = this.parseDate(
      endDate,
      new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      true,
    );

    // Get expenses in period
    const expenses = await this.expenseRepository.find({
      where: { date: Between(start, end) },
    });

    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

    // Category breakdown
    const byCategory: Record<string, number> = {};
    for (const exp of expenses) {
      byCategory[exp.category] =
        (byCategory[exp.category] || 0) + Number(exp.amount);
    }

    // Get revenue (cashflow IN) in same period
    const incomes = await this.cashflowRepository.find({
      where: {
        type: CashflowType.IN,
        timestamp: Between(start, end),
      },
    });
    // Exclude expense_reversal from revenue count
    const totalRevenue = incomes
      .filter((i) => i.source !== 'expense_reversal')
      .reduce((s, i) => s + Number(i.amount), 0);

    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      byCategory,
      expenseCount: expenses.length,
      period: { start: start.toISOString(), end: end.toISOString() },
    };
  }

  async getNetProfit(startDate: Date, endDate: Date) {
    const incomes = await this.cashflowRepository.find({
      where: {
        type: CashflowType.IN,
        timestamp: Between(startDate, endDate),
      },
    });
    const expenses = await this.cashflowRepository.find({
      where: {
        type: CashflowType.OUT,
        timestamp: Between(startDate, endDate),
      },
    });

    const totalIn = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalOut = expenses.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );

    return {
      totalIn,
      totalOut,
      netProfit: totalIn - totalOut,
    };
  }

  // ── Finalize Expense (called by ApprovalListener after full approval) ──────
  async finalizeExpense(expenseId: number): Promise<void> {
    const expense = await this.expenseRepository.findOne({ where: { id: expenseId } });
    if (!expense || expense.status !== ExpenseStatus.PENDING) return;

    await this.expenseRepository.manager.transaction(async (manager) => {
      // 1. Mark expense as APPROVED
      expense.status = ExpenseStatus.APPROVED;
      await manager.save(Expense, expense);

      // 2. Log the actual cashflow deduction
      await this.logCashflow(
        {
          amount: Number(expense.amount),
          type: CashflowType.OUT,
          source: 'expense',
          referenceId: expense.id.toString(),
          description: expense.description,
          businessDayId: expense.businessDayId,
          shiftId: expense.shiftId,
          paymentMethod: 'CASH',
        },
        manager,
      );

      // 3. Audit trail
      const audit = manager.create(AuditLog, {
        action: 'EXPENSE_APPROVED',
        user: 'System/Approval',
        details: `Expense #${expenseId} approved & posted: ${expense.description} (Rp ${Number(expense.amount).toLocaleString()})`,
      });
      await manager.save(AuditLog, audit);
    });
  }

  async getLoyaltyAnalytics(startDate?: string, endDate?: string) {
    const now = new Date();
    const start = this.parseDate(
      startDate,
      new Date(now.getFullYear(), now.getMonth(), 1),
    );
    const end = this.parseDate(
      endDate,
      new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      true,
    );

    const pointLedgers = await this.dataSource
      .getRepository('point_ledgers')
      .find({
        where: {
          createdAt: Between(start, end),
        },
        relations: ['member'],
      });

    // 1. Topup Revenue (from cashflows)
    const topupCashflows = await this.cashflowRepository.find({
      where: {
        source: 'topup',
        timestamp: Between(start, end),
      },
    });
    const totalTopupRevenue = topupCashflows.reduce(
      (s, c) => s + Number(c.amount),
      0,
    );

    // 2. Point Redemption Analytics
    const redemptions = pointLedgers.filter((l: any) => l.type === 'REDEEM');
    const totalPointsRedeemed = Math.abs(
      redemptions.reduce((s: number, r: any) => s + Number(r.amount), 0),
    );

    // Breakdown by item
    const itemBreakdown: Record<string, { count: number; points: number }> = {};
    for (const r of redemptions) {
      // Description format "Tukar [Item Name]"
      const itemName = r.description?.replace('Tukar ', '') || 'Unknown Item';
      if (!itemBreakdown[itemName]) {
        itemBreakdown[itemName] = { count: 0, points: 0 };
      }
      itemBreakdown[itemName].count += 1;
      itemBreakdown[itemName].points += Math.abs(Number(r.amount));
    }

    return {
      totalTopupRevenue,
      totalPointsRedeemed,
      redemptionCount: redemptions.length,
      items: Object.entries(itemBreakdown).map(([name, stats]) => ({
        name,
        ...stats,
      })),
      period: { start: start.toISOString(), end: end.toISOString() },
    };
  }
}
