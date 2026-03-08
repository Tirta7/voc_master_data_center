import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual, EntityManager } from 'typeorm';
import { Expense, ExpenseCategory } from './entities/expense.entity';
import { Cashflow, CashflowType } from './entities/cashflow.entity';

import { BilliardGateway } from '../socket/billiard.gateway';

@Injectable()
export class FinanceService {
    constructor(
        @InjectRepository(Expense)
        private readonly expenseRepository: Repository<Expense>,
        @InjectRepository(Cashflow)
        private readonly cashflowRepository: Repository<Cashflow>,
        private readonly billiardGateway: BilliardGateway,
    ) { }

    private parseDate(dateStr: string | undefined, defaultDate: Date, endOfDay = false): Date {
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
        shiftId?: number;
        businessDayId?: number;
    }): Promise<Expense> {
        return this.expenseRepository.manager.transaction(async (manager) => {
            const expense = manager.create(Expense, data);
            const savedExpense = await manager.save(Expense, expense);

            await this.logCashflow({
                amount: data.amount,
                type: CashflowType.OUT,
                source: 'expense',
                referenceId: savedExpense.id.toString(),
                description: data.description,
                businessDayId: data.businessDayId,
                shiftId: data.shiftId,
            }, manager);

            return savedExpense;
        });
    }

    // ── Update Expense ──────────────────────────────────────────────────────
    async updateExpense(id: number, data: {
        amount?: number;
        category?: ExpenseCategory;
        description?: string;
        recordedBy?: string;
    }): Promise<Expense> {
        const expense = await this.expenseRepository.findOne({ where: { id } });
        if (!expense) throw new NotFoundException(`Expense #${id} not found`);

        Object.assign(expense, data);
        return this.expenseRepository.save(expense);
    }

    // ── Delete Expense ──────────────────────────────────────────────────────
    async deleteExpense(id: number): Promise<{ deleted: boolean }> {
        return this.expenseRepository.manager.transaction(async (manager) => {
            const expense = await manager.findOne(Expense, { where: { id } });
            if (!expense) throw new NotFoundException(`Expense #${id} not found`);

            // Reverse the cashflow entry by adding the amount back in
            await this.logCashflow({
                amount: Number(expense.amount),
                type: CashflowType.IN,
                source: 'expense_reversal',
                referenceId: id.toString(),
                description: `Reversal: ${expense.description}`,
                businessDayId: expense.businessDayId,
                shiftId: expense.shiftId,
            }, manager);

            await manager.remove(Expense, expense);
            return { deleted: true };
        });
    }

    async logCashflow(data: {
        amount: number;
        type: CashflowType;
        source: string;
        referenceId?: string;
        description?: string;
        businessDayId?: number;
        shiftId?: number;
    }, manager?: any): Promise<Cashflow> {
        const queryManager = manager || this.cashflowRepository.manager;
        return queryManager.transaction(async (transactionalManager: EntityManager) => {
            return this.performLogCashflow(data, transactionalManager);
        });
    }

    private async performLogCashflow(data: {
        amount: number;
        type: CashflowType;
        source: string;
        referenceId?: string;
        description?: string;
        businessDayId?: number;
        shiftId?: number;
    }, queryManager: any): Promise<Cashflow> {
        // We MUST find the last entry and lock it to prevent race conditions on balanceAfter
        const lastEntry = await queryManager.findOne(Cashflow, {
            where: {},
            order: { id: 'DESC' },
            lock: { mode: 'pessimistic_write' as any }
        });

        const currentBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;
        const numAmount = Number(data.amount);

        const balanceAfter = data.type === CashflowType.IN
            ? currentBalance + numAmount
            : currentBalance - numAmount;

        const cashflow = queryManager.create(Cashflow, {
            ...data,
            amount: numAmount,
            balanceAfter: Number(balanceAfter.toFixed(2)),
            timestamp: new Date()
        });

        const saved = await queryManager.save(Cashflow, cashflow);

        // Broadcast outside transaction or use afterCommit pattern
        // In NestJS/TypeORM, we manually broadcast after save here.
        this.billiardGateway.broadcastFinanceUpdate(saved);

        return saved;
    }

    async getLedger(limit = 50) {
        return this.cashflowRepository.find({
            order: { timestamp: 'DESC' },
            take: limit,
        });
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
            where.date = MoreThanOrEqual(this.parseDate(filters.startDate, new Date()));
        } else if (filters?.endDate) {
            where.date = LessThanOrEqual(this.parseDate(filters.endDate, new Date(), true));
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
        const start = this.parseDate(startDate, new Date(now.getFullYear(), now.getMonth(), 1));
        const end = this.parseDate(endDate, new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59), true);

        // Get expenses in period
        const expenses = await this.expenseRepository.find({
            where: { date: Between(start, end) },
        });

        const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

        // Category breakdown
        const byCategory: Record<string, number> = {};
        for (const exp of expenses) {
            byCategory[exp.category] = (byCategory[exp.category] || 0) + Number(exp.amount);
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
            .filter(i => i.source !== 'expense_reversal')
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
                timestamp: Between(startDate, endDate)
            },
        });
        const expenses = await this.cashflowRepository.find({
            where: {
                type: CashflowType.OUT,
                timestamp: Between(startDate, endDate)
            },
        });

        const totalIn = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
        const totalOut = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

        return {
            totalIn,
            totalOut,
            netProfit: totalIn - totalOut,
        };
    }
}
