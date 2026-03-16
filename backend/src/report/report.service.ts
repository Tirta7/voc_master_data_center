import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between, Not } from 'typeorm';
import { Shift } from '../finance/entities/shift.entity';
import { ShiftService } from '../finance/shift.service';
import { FinanceService } from '../finance/finance.service';
import {
  Transaction,
  TransactionStatus,
} from '../transaction/entities/transaction.entity';
import { Ingredient } from '../inventory/entities/ingredient.entity';
import { MenuItem } from '../cafe/entities/menu-item.entity';
import { OrderItem, OrderItemStatus } from '../cafe/entities/order-item.entity';
import { Expense } from '../finance/entities/expense.entity';
import type { SettingsService } from '../settings/settings.service';
import { AuditLog } from './entities/audit-log.entity';
import { UserService } from '../user/user.service';
import * as path from 'path';
import * as fs from 'fs';
import * as puppeteer from 'puppeteer';
import * as handlebars from 'handlebars';
import { MqttService } from '../mqtt/mqtt.service';
import { BilliardGateway } from '../socket/billiard.gateway';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
const pdfmake = require('pdfmake');

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Ingredient)
    private readonly ingredientRepository: Repository<Ingredient>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    @Inject(
      forwardRef(() => {
        const { SettingsService } = require('../settings/settings.service');
        return SettingsService;
      }),
    )
    private readonly settingsService: SettingsService,
    private readonly mqttService: MqttService,
    private readonly billiardGateway: BilliardGateway,
    private readonly whatsappService: WhatsAppService,
    private readonly shiftService: ShiftService,
    private readonly financeService: FinanceService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  private readonly logger = new Logger(ReportService.name);

  private parseDate(
    dateStr: string | undefined,
    defaultDate: Date,
    endOfDay = false,
  ): Date {
    if (!dateStr) return defaultDate;
    let cleanStr = dateStr;
    if (!cleanStr.includes('T')) {
      cleanStr += endOfDay ? 'T23:59:59' : 'T00:00:00';
    } else {
      const timePart = cleanStr.split('T')[1];
      const colonCount = (timePart.match(/:/g) || []).length;
      if (colonCount === 1) {
        cleanStr += endOfDay ? ':59' : ':00';
      }
    }
    const date = new Date(cleanStr);
    return isNaN(date.getTime()) ? defaultDate : date;
  }

  async getDailySummary() {
    const settings = await this.settingsService.getSettings();
    const [hours, minutes] = (settings.businessDayOffset || '00:00')
      .split(':')
      .map(Number);

    // Get current moment in System Local Time
    const now = new Date();

    // Determine the "Business Day" date in Local Time
    // If it's 2 AM and offset is 4 AM, the effective business day is still the previous calendar day.
    const effectiveDay = new Date(
      now.getTime() - (hours * 3600000 + minutes * 60000),
    );
    effectiveDay.setHours(0, 0, 0, 0);

    // The business day for 'effectiveDay' starts at 'hours:minutes' Local Time
    const businessDayStart = new Date(effectiveDay);
    businessDayStart.setHours(hours, minutes, 0, 0);

    const detailed = await this.getDetailedRevenueReport(businessDayStart, now);

    return {
      ...detailed.summary,
      paymentMethods: detailed.paymentMethods,
    };
  }

  async getInventoryHealth() {
    const ingredients = await this.ingredientRepository.find();

    return ingredients.filter((ing) => {
      return Number(ing.stockQuantity) <= Number(ing.minStockLevel);
    });
  }

  async getBestSellers(limit: number = 3) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const results = await this.orderItemRepository
      .createQueryBuilder('oi')
      .select('oi.menuItemId', 'menuItemId')
      .addSelect('SUM(oi.quantity)', 'totalQuantity')
      .innerJoin('oi.menuItem', 'menuItem')
      .addSelect('menuItem.name', 'name')
      .where('oi.status = :status', { status: OrderItemStatus.DONE })
      .andWhere('oi.createdAt >= :date', { date: thirtyDaysAgo })
      .groupBy('oi.menuItemId')
      .addGroupBy('menuItem.name')
      .orderBy('SUM(oi.quantity)', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map((r) => ({
      id: Number(r.menuItemId),
      name: r.name,
      totalSales: Number(r.totalQuantity),
    }));
  }

  async getItemsPerformance() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // All menu items with their sales in last 30 days
    const allItems = await this.menuItemRepository.find({
      where: { isActive: true },
      relations: ['category'],
    });

    const salesData = await this.orderItemRepository
      .createQueryBuilder('oi')
      .select('oi.menuItemId', 'menuItemId')
      .addSelect('SUM(oi.quantity)', 'totalQuantity')
      .addSelect('SUM(oi.quantity * oi.priceAtOrder)', 'totalRevenue')
      .where('oi.status = :status', { status: OrderItemStatus.DONE })
      .andWhere('oi.createdAt >= :date', { date: thirtyDaysAgo })
      .groupBy('oi.menuItemId')
      .getRawMany();

    const salesMap = new Map(
      salesData.map((r) => [
        Number(r.menuItemId),
        { qty: Number(r.totalQuantity), revenue: Number(r.totalRevenue) },
      ]),
    );

    const ranked = allItems
      .map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category?.name || '—',
        price: Number(item.price),
        totalQty: salesMap.get(item.id)?.qty || 0,
        totalRevenue: salesMap.get(item.id)?.revenue || 0,
      }))
      .sort((a, b) => b.totalQty - a.totalQty);

    const sold = ranked.filter((i) => i.totalQty > 0);
    const unsold = ranked.filter((i) => i.totalQty === 0);

    return {
      all: ranked,
      topItems: sold.slice(0, 8),
      slowItems: [...sold.slice(-5).reverse(), ...unsold.slice(0, 3)],
      totalMenuItems: allItems.length,
      activeItems: sold.length,
      unsoldItems: unsold.length,
    };
  }

  async startShift(startedBy: string, openingCash: number) {
    const existingActive = await this.shiftRepository.findOne({
      where: { isActive: true },
    });
    if (existingActive) throw new Error('A shift is already active');

    const shift = this.shiftRepository.create({
      startedBy,
      cashStart: openingCash,
      isActive: true,
    });

    return this.shiftRepository.save(shift);
  }

  async closeShift(
    id: number,
    endedBy: string,
    closingCash: number,
    remarks?: string,
  ) {
    const shift = await this.shiftRepository.findOne({
      where: { id, isActive: true },
    });
    if (!shift) throw new NotFoundException('Active shift not found');

    shift.endTime = new Date();
    shift.endedBy = endedBy;
    shift.cashPhysical = closingCash;
    if (remarks) shift.note = remarks;
    shift.isActive = false;

    // 1. Calculate Sales (IN)
    const transactions = await this.transactionRepository.find({
      where: { createdAt: MoreThanOrEqual(shift.startTime) },
    });
    const totalSales = transactions.reduce(
      (sum, tx) => sum + Number(tx.paidAmount),
      0,
    );

    // 2. Calculate Expenses (OUT)
    const expenses = await this.expenseRepository.find({
      where: { date: MoreThanOrEqual(shift.startTime) },
    });
    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + Number(exp.amount),
      0,
    );

    // 3. Final Reconciliation
    shift.cashSystem = Number(shift.cashStart) + totalSales - totalExpenses;

    return this.shiftRepository.save(shift);
  }

  async getActiveShift() {
    return this.shiftRepository.findOne({ where: { isActive: true } });
  }

  async getShiftHistory() {
    return this.shiftRepository.find({ order: { startTime: 'DESC' } });
  }

  async logAction(
    action: string,
    user: string,
    details?: string,
    tableId?: number,
    invoiceNumber?: string,
  ) {
    const log = this.auditRepository.create({
      action,
      user,
      details,
      tableId,
      invoiceNumber,
    });
    const saved = await this.auditRepository.save(log);
    this.mqttService.broadcastAuditUpdate(saved);
    this.billiardGateway.broadcastAuditUpdate(saved);
    return saved;
  }

  async getAuditLogs(
    filters: {
      action?: string;
      user?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { action, user, startDate, endDate, page = 1, limit = 100 } = filters;
    const query = this.auditRepository.createQueryBuilder('log');

    if (action) {
      query.andWhere('log.action = :action', { action });
    }

    if (user) {
      query.andWhere('log.user LIKE :user', { user: `%${user}%` });
    }

    if (startDate && endDate) {
      query.andWhere('log.createdAt BETWEEN :start AND :end', {
        start: new Date(startDate),
        end: new Date(endDate),
      });
    } else if (startDate) {
      query.andWhere('log.createdAt >= :start', { start: new Date(startDate) });
    } else if (endDate) {
      query.andWhere('log.createdAt <= :end', { end: new Date(endDate) });
    }

    const [items, total] = await query
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAuditStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalToday = await this.auditRepository.count({
      where: { createdAt: MoreThanOrEqual(today) },
    });

    const criticalActions = [
      'CANCEL_ORDER',
      'CANCEL_REQUESTED',
      'CANCEL_CONFIRMED',
      'DELETE_ITEM',
      'VOID_TRANSACTION',
      'STOCK_ADJUSTMENT',
      'PRICE_CHANGE',
      'BILLIARD_PRICE_OVERRIDE',
    ];
    const criticalToday = await this.auditRepository
      .createQueryBuilder('log')
      .where('log.createdAt >= :today', { today })
      .andWhere('log.action IN (:...actions)', { actions: criticalActions })
      .getCount();

    const topUserRaw = await this.auditRepository
      .createQueryBuilder('log')
      .select('log.user', 'user')
      .addSelect('COUNT(log.id)', 'count')
      .where('log.createdAt >= :today', { today })
      .groupBy('log.user')
      .orderBy('count', 'DESC')
      .limit(1)
      .getRawOne();

    const actionDistribution = await this.auditRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(log.id)', 'count')
      .where('log.createdAt >= :today', { today })
      .groupBy('log.action')
      .getRawMany();

    return {
      totalToday,
      criticalToday,
      topUser: topUserRaw || { user: 'None', count: 0 },
      distribution: actionDistribution.map((d) => ({
        action: d.action,
        count: Number(d.count),
      })),
    };
  }

  async getFullTransactions(limit: number = 300) {
    return this.transactionRepository.find({
      where: { status: TransactionStatus.PAID },
      relations: [
        'table',
        'cafeTable',
        'payments',
        'orderItems',
        'orderItems.menuItem',
        'orderItems.menuItem.category',
      ],
      order: { updatedAt: 'DESC' },
      take: limit,
    });
  }

  async getSettings() {
    return this.settingsService.getSettings();
  }

  async getDetailedRevenueReport(
    startQuery: string | Date,
    endQuery: string | Date,
  ) {
    const start =
      typeof startQuery === 'string'
        ? this.parseDate(startQuery, new Date())
        : startQuery;
    const end =
      typeof endQuery === 'string'
        ? this.parseDate(endQuery, new Date(), true)
        : endQuery;

    // 1. Fetch Transactions in range (based on createdAt for full coverage)
    const transactions = await this.transactionRepository.find({
      where: {
        createdAt: Between(start, end),
        status: Not(TransactionStatus.CANCELLED),
      },
      relations: ['table', 'cafeTable', 'payments', 'orderItems', 'createdBy'],
    });

    // 2. Fetch Order Items in range (based on createdAt - order time)
    const orderItems = await this.orderItemRepository.find({
      where: {
        createdAt: Between(start, end),
        status: Not(OrderItemStatus.CANCELLED),
      },
      relations: ['menuItem', 'menuItem.productFinance'],
    });

    // 3. Aggregate By Hour
    const hourlyData: Record<
      number,
      { billiard: number; cafe: number; topup: number; count: number }
    > = {};
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { billiard: 0, cafe: 0, topup: 0, count: 0 };
    }

    // Helper to get hour in Local Time
    const getLocalHour = (d: Date) => {
      return d.getHours();
    };

    // Billiard & Topup revenue grouped by startTime hour (Local)
    transactions.forEach((tx) => {
      const hour = getLocalHour(new Date(tx.startTime || tx.createdAt));
      if (tx.type === 'TOPUP') {
        hourlyData[hour].topup += Number(tx.grandTotal || 0);
      } else {
        hourlyData[hour].billiard += Number(tx.billiardTotal || 0);
      }
      hourlyData[hour].count += 1;
    });

    // Cafe revenue grouped by OrderItem createdAt hour (Local)
    orderItems.forEach((item) => {
      const hour = getLocalHour(new Date(item.createdAt));
      hourlyData[hour].cafe +=
        Number(item.quantity) * Number(item.priceAtOrder);
    });

    // 4. Payment Method Totals & Breakdown Accuracy
    const paymentMethods: Record<string, number> = {};
    const paymentCounts: Record<string, number> = {};
    const tableUsage: Record<string, { count: number; duration: number }> = {};
    const staffRevenue: Record<string, number> = {};
    let totalTaxService = 0;
    let totalAwardedPoints = 0;
    let totalRewardCount = 0;
    let totalRewardValue = 0;
    let totalOccupancyMinutes = 0;

    transactions.forEach((tx) => {
      // 4.1 Payment Distribution (Authoritative source: payments relation)
      const txPayments: { method: string; amount: number }[] = [];
      if (tx.payments && tx.payments.length > 0) {
        tx.payments.forEach((p) => {
          txPayments.push({
            method: p.paymentMethod,
            amount: Number(p.totalPaid),
          });
        });
      } else if (tx.paymentDetails && Array.isArray(tx.paymentDetails)) {
        tx.paymentDetails.forEach((p: any) => {
          txPayments.push({
            method: p.method || 'UNKNOWN',
            amount: Number(p.amount),
          });
        });
      } else if (Number(tx.paidAmount) > 0) {
        txPayments.push({
          method: (tx as any).paymentMethod || 'CASH',
          amount: Number(tx.paidAmount),
        });
      }

      txPayments.forEach((p) => {
        const m = p.method.toUpperCase();
        paymentMethods[m] = (paymentMethods[m] || 0) + p.amount;
        paymentCounts[m] = (paymentCounts[m] || 0) + 1;
      });

      // 4.2 Tax, Service, and Points Summation
      if (tx.type !== 'TOPUP') {
        totalTaxService +=
          Number(tx.vatAmount || 0) + Number(tx.serviceChargeAmount || 0);
        
        // table / facility metrics
        const tableId = tx.table?.id || tx.cafeTable?.id;
        if (tableId) {
          const tableName = tx.table?.tableName || tx.cafeTable?.tableName || 'Unknown';
          if (!tableUsage[tableName]) tableUsage[tableName] = { count: 0, duration: 0 };
          tableUsage[tableName].count++;
          
          if (tx.startTime && tx.updatedAt) {
            const duration = Math.max(0, (tx.updatedAt.getTime() - tx.startTime.getTime()) / 60000);
            tableUsage[tableName].duration += duration;
            totalOccupancyMinutes += duration;
          }
        }

        // staff attribution
        const staffName = tx.createdBy?.name || 'System';
        staffRevenue[staffName] = (staffRevenue[staffName] || 0) + Number(tx.grandTotal || 0);
      }
      totalAwardedPoints += Number((tx as any).awardedPoints || 0);
    });

    // Calculate real cash omzet (exclude MEMBER balance usage — not physical cash)
    let totalOmzetCash = 0;
    let totalVat = 0;
    let totalServiceCharge = 0;
    let totalDiscount = 0;
    let totalRounding = 0;
    let totalMemberUsage = 0;

    Object.entries(paymentMethods).forEach(([method, amount]) => {
      const m = method.toUpperCase();
      if (m !== 'MEMBER' && m !== 'MEMBERSHIP') {
        totalOmzetCash += Number(amount);
      } else {
        totalMemberUsage += Number(amount);
      }
    });

    // 4.3 Reward Analytics
    orderItems.forEach((item) => {
      if (
        item.priceAtOrder === 0 &&
        (item.customName?.includes('[RWD]') || item.note?.includes('POIN'))
      ) {
        totalRewardCount += Number(item.quantity || 0);
        totalRewardValue +=
          Number(item.quantity || 0) * Number(item.menuItem?.price || 0);
      }
    });

    // Aggregate per-transaction tax, service charge, and discount
    transactions.forEach((tx) => {
      if (tx.type !== 'TOPUP') {
        totalVat += Number(tx.vatAmount || 0);
        totalServiceCharge += Number(tx.serviceChargeAmount || 0);
        totalDiscount += Number(tx.discountAmount || 0);
        totalRounding += Number(tx.roundingAmount || 0);
      }
    });

    return {
      startTime: start,
      endTime: end,
      hourly: Object.entries(hourlyData).map(([hour, data]) => ({
        hour: Number(hour),
        ...data,
        total: data.billiard + data.cafe + data.topup,
      })),
      paymentMethods,
      summary: {
        totalBilliard: transactions
          .filter((tx) => tx.type !== 'TOPUP')
          .reduce((s, t) => s + Number(t.billiardTotal || 0), 0),
        totalCafe: orderItems.reduce(
          (s, i) => s + Number(i.quantity) * Number(i.priceAtOrder),
          0,
        ),
        totalTopUp: transactions
          .filter((tx) => tx.type === 'TOPUP')
          .reduce((s, t) => s + Number(t.grandTotal || 0), 0),
        taxServiceRevenue: totalTaxService,
        totalOmzet: totalOmzetCash, // Only real cash income (excludes MEMBER balance usage)
        grossRevenue: transactions.reduce(
          (s, t) => s + Number(t.grandTotal || 0),
          0,
        ), // Total Sales Volume
        totalVat, // PPN collected
        totalServiceCharge, // Service charge collected
        totalDiscount, // Promo/discount deductions
        totalRounding, // Rounding adjustments
        totalMemberUsage, // Member balance used (non-cash)
        totalAwardedPoints, // Total loyalty points gifted
        transactionCount: transactions.length,
        paymentCounts,
        unpaidAmount: transactions
          .filter((tx) => tx.status !== TransactionStatus.PAID)
          .reduce(
            (s, t) =>
              s + (Number(t.grandTotal || 0) - Number(t.paidAmount || 0)),
            0,
          ),
        totalRewardCount,
        totalRewardValue,
        tableUsage,
        staffRevenue,
        avgOccupancyMinutes: transactions.length > 0 ? totalOccupancyMinutes / transactions.length : 0,
        totalOccupancyMinutes
      },
    };
  }

  async getStoreStockReport(): Promise<any[]> {
    const storeItems = (await this.menuItemRepository.find({
      where: { category: { name: 'STORE' } },
      relations: ['category'],
    })) as any[];

    const reportData = await Promise.all(
      storeItems.map(async (item) => {
        const salesData = await this.orderItemRepository
          .createQueryBuilder('orderItem')
          .select('SUM(orderItem.quantity)', 'totalSold')
          .addSelect(
            'SUM(orderItem.quantity * orderItem.priceAtOrder)',
            'totalRevenue',
          )
          .where('orderItem.menuItemId = :itemId', { itemId: item.id })
          .andWhere('orderItem.status != :cancelled', {
            cancelled: OrderItemStatus.CANCELLED,
          })
          .getRawOne();

        const totalSold = Number(salesData.totalSold || 0);
        const totalRevenue = Number(salesData.totalRevenue || 0);
        const currentStock = Number(item.stockQuantity || 0);
        // Assuming Total Stock = Current + Sold (since we don't have a history of additions yet,
        // this is the best estimate of "Total stock that has passed through")
        const totalStock = currentStock + totalSold;

        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category?.name,
          price: Number(item.price),
          totalStock,
          totalSold,
          currentStock,
          totalRevenue,
          minStockLevel: Number(item.minStockLevel || 0),
          isLowStock: currentStock <= Number(item.minStockLevel || 0),
        };
      }),
    );

    return reportData;
  }
  async generateDailyReportPdf(startDate?: Date, endDate?: Date): Promise<Buffer> {
    const startStr = startDate ? startDate.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    const endStr = endDate ? endDate.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    const rangeLabel = startDate && endDate ? `${startStr} — ${endStr}` : 'Laporan Harian (Business Day)';

    this.logger.log(`Generating Premium Business Day PDF... Range: ${rangeLabel}`);
    
    let reportData: any;
    try {
      const activeBd = await this.shiftService.getOrCreateActiveBusinessDay();
      reportData = await this.shiftService.getBusinessDayReport(activeBd.id);
    } catch (e) {
      this.logger.error(`Failed to retrieve detailed report data: ${e.message}`);
      throw e;
    }

    const bd = reportData.businessDay || {};
    const summary = reportData.summary || {};
    const shifts = reportData.shifts || [];
    const txs = reportData.transactions || [];
    const settings = await this.settingsService.getSettings();

    const venue = settings.businessName || 'VOC BILLIARD';
    const printAt = new Date();

    const fmt = (n: number) => `Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`;
    const fDate = (d: any) => d ? new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—';
    const fTime = (d: any) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—';

    // Calculation for waterfall
    const grossBilliard = summary.billiardRevenue || 0;
    const grossCafe = summary.cafeRevenue || 0;
    const grossRevenue = grossBilliard + grossCafe;
    const netPenjualan = grossRevenue - (summary.totalDiscount || 0) + (summary.totalVat || 0) + (summary.totalService || 0) + (summary.totalRounding || 0);

    // Global Deep Dives
    const globalPackages: Record<string, { count: number, revenue: number }> = {};
    const globalItems: Record<string, { qty: number }> = {};
    
    const allShifts = reportData.allShifts || shifts;
    
    allShifts.forEach((s: any) => {
      (s.topPackages || []).forEach((p: any) => {
        if (!globalPackages[p.name]) globalPackages[p.name] = { count: 0, revenue: 0 };
        globalPackages[p.name].count += p.count;
        globalPackages[p.name].revenue += Number(p.revenue);
      });
      (s.topItems || []).forEach((it: any) => {
        if (!globalItems[it.item]) globalItems[it.item] = { qty: 0 };
        globalItems[it.item].qty += it.count;
      });
    });

    const sortedPackages = Object.entries(globalPackages)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    const sortedItems = Object.entries(globalItems)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // 2. Prepare Template Data
    const templatePath = path.join(__dirname, 'templates', 'business-day.hbs');
    if (!fs.existsSync(templatePath)) {
      this.logger.error(`Template not found at ${templatePath}`);
      throw new Error(`Template not found at ${templatePath}`);
    }
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);

    const context = {
      venueName: venue,
      rangeLabel,
      totalTransactions: txs.length,
      totalOmzet: summary.totalOmzet || 0,
      grossRevenue,
      businessDate: bd.date || fDate(printAt),
      printTime: fTime(printAt),
      grossBilliard,
      grossCafe,
      totalDiscount: summary.totalDiscount,
      totalService: summary.totalService,
      totalVat: summary.totalVat,
      totalRounding: summary.totalRounding,
      netPenjualan,
      totalTopUp: summary.totalTopUp || 0,
      sortedPackages: sortedPackages.slice(0, 5),
      sortedItems: sortedItems.slice(0, 5).map(it => ({ name: it.name, qty: it.qty })),
      shifts: shifts.map((s: any) => ({
        userName: s.userName,
        startTime: fTime(s.startTime),
        endTime: s.endTime ? fTime(s.endTime) : null,
        revenue: fmt(s.totalRevenue || 0),
        discrepancy: s.discrepancy !== 0 ? fmt(s.discrepancy) : '0',
        isDiscrepancy: s.discrepancy !== 0
      })),
      transactions: txs.map((t: any) => {
        const itemNames: string[] = [];
        
        // 1. Cafe Items
        if (Array.isArray(t.orderItems)) {
          t.orderItems.forEach((oi: any) => {
            if (oi.status?.toUpperCase() === 'CANCELLED') return;
            const name = oi.menuItem?.name || oi.customName || 'Item';
            itemNames.push(`${name} x${oi.quantity}`);
          });
        }

        // 2. Billiard Segments
        if (Array.isArray(t.billingDetails)) {
          t.billingDetails.forEach((seg: any) => {
            const mins = Number(seg.duration || 0);
            const durStr = mins % 60 === 0 ? `${mins / 60} Jam (${mins}m)` : `${mins}m`;
            const timeRange = (seg.startTimeFormatted && seg.endTimeFormatted) 
              ? ` (${(seg.startTimeFormatted || '').replace(/:/g, '.')}-${(seg.endTimeFormatted || '').replace(/:/g, '.')})` 
              : '';
            itemNames.push(`${seg.isExtension ? 'Extend: ' : ''}${seg.title || 'Table'} ${durStr}${timeRange}`);
          });
        }

        return {
          invoiceNumber: t.invoiceNumber,
          time: fTime(t.createdAt),
          tableNumber: t.table?.tableName || t.cafeTable?.tableName || 'POS',
          customerName: t.customerName || 'Walk-in',
          items: itemNames.join(', '),
          paymentMethod: t.paymentMethod || 'CASH',
          amount: fmt(t.grandTotal)
        };
      }),
      fmt: (n: number) => `Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`
    };

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
      const page = await browser.newPage();
      
      const html = template(context, {
        helpers: {
          fmt: (n: any) => `Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`
        }
      });
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 7px; font-family: 'Inter', sans-serif; width: 100%; padding: 15px 50px 0 50px; display: flex; justify-content: space-between; align-items: center; color: #94a3b8; border-bottom: 1px solid #f1f5f9; margin: 0 15mm; height: 30px;">
            <div style="font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">${venue} · Operational Audit</div>
            <div style="font-weight: 500;">Premium Report Ecosystem</div>
          </div>`,
        footerTemplate: `
          <div style="font-size: 7px; color: #94a3b8; width: 100%; padding: 0 50px 15px 50px; display: flex; justify-content: space-between; align-items: center; font-family: 'Inter', sans-serif; border-top: 1px solid #f1f5f9; margin: 0 15mm;">
            <div style="font-weight: bold; text-transform: uppercase;">Verified Business Data · Confidential</div>
            <div style="font-weight: 800;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
          </div>`,
        preferCSSPageSize: true,
        margin: { top: '25mm', bottom: '20mm', left: '15mm', right: '15mm' }
      });
      this.logger.log('Premium Business Day PDF created successfully.');
      return Buffer.from(pdfBuffer);
    } catch (e) {
      this.logger.error(`Failed to generate High-Fidelity PDF: ${e.message}`);
      throw e;
    } finally {
      await browser.close();
    }
  }

  async generateDashboardExecutivePdf(startDate: Date, endDate: Date): Promise<Buffer> {
    const startStr = startDate.toLocaleString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const rangeLabel = startStr;

    this.logger.log(`Performing Extreme Premium PDF Redesign... Range: ${rangeLabel}`);
    
    // 1. Data Aggregation
    const detailed = await this.getDetailedRevenueReport(startDate, endDate);
    const perf = await this.getItemsPerformance();
    const inventory = await this.getInventoryHealth();
    const financeSummary = await this.financeService.getExpenseSummary(startDate.toISOString(), endDate.toISOString());
    const settings = await this.settingsService.getSettings();

    const venue = settings.businessName || 'VOC BILLIARD';
    const fmt = (n: number) => `Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`;
    const pfmt = (n: number) => `${(n || 0).toFixed(1)}%`;

    // 1b. Accrued Payroll Fetching (matching dashboard)
    const month = startDate.getMonth() + 1;
    const year = startDate.getFullYear();
    const payrollDataMap = await this.userService.calculateBulkPayroll(
      month,
      year,
      startDate.toISOString(),
      endDate.toISOString(),
      true,
    );
    const payrollData: any[] = Object.values(payrollDataMap);
    const totalCommissions = payrollData.reduce(
      (sum: number, p: any) =>
        sum +
        (Number(p.commissionService || 0) +
          Number(p.commissionSales || 0) +
          Number(p.commissionProduction || 0)),
      0,
    );
    const totalPenalties = payrollData.reduce(
      (sum: number, p: any) => sum + Number(p.penalties || 0),
      0,
    );
    const totalSalaryAccrual = payrollData.reduce(
      (sum: number, p: any) => sum + Number(p.basicSalary || 0),
      0,
    );
    
    // Detailed Accounting Calculations
    const sum = detailed.summary;
    const grossTotal = Number(sum?.grossRevenue || 0);
    const totalTax = Number(sum?.totalVat || 0);
    const totalService = Number(sum?.totalServiceCharge || 0);
    const totalDiscount = Number(sum?.totalDiscount || 0);
    const totalRounding = Number(sum?.totalRounding || 0);
    const totalExpenses = Number(financeSummary.totalExpenses || 0);

    // Adjusted Profit: Real Revenue - Recorded Expenses - Accrued Payroll (matching Dashboard logic)
    // Note: grossTotal is already net of discounts (sum of grandTotal)
    const netProfit =
      Number(grossTotal) -
      totalExpenses -
      totalCommissions -
      totalSalaryAccrual +
      totalPenalties;

    const hourly = detailed.hourly || [];
    const maxHourly = Math.max(...hourly.map(h => h.total), 1);

    // 2. Prepare Template Data
    const templatePath = path.join(__dirname, 'templates', 'dashboard-executive.hbs');
    if (!fs.existsSync(templatePath)) {
      this.logger.error(`Template not found at ${templatePath}`);
      throw new Error(`Template not found at ${templatePath}`);
    }
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);

    const hourlyData = (detailed.hourly || []).map(h => ({
      hour: String(h.hour).padStart(2, '0'),
      value: fmt(h.total),
      width: h.total === 0 ? 0 : (h.total / maxHourly * 100),
      isNight: h.hour > 17 || h.hour < 6
    }));

    const topItems = (perf.topItems || []).slice(0, 10).map((it, idx) => ({
      rank: idx + 1,
      name: it.name,
      category: it.category,
      qty: it.totalQty,
      revenue: fmt(it.totalRevenue)
    }));

    const criticalStock = inventory.slice(0, 8).map(i => ({
      name: i.name,
      stock: i.stockQuantity,
      unit: i.unit
    }));

    const revenueStreams = [
      { label: 'Billiard / Session', value: fmt(sum?.totalBilliard), percentage: pfmt((sum?.totalBilliard || 0) / grossTotal * 100) },
      { label: 'Cafe / F&B', value: fmt(sum?.totalCafe), percentage: pfmt((sum?.totalCafe || 0) / grossTotal * 100) },
      { label: 'Top-up Member', value: fmt(sum?.totalTopUp), percentage: pfmt((sum?.totalTopUp || 0) / grossTotal * 100) },
      { label: 'Service Charge (SC)', value: fmt(totalService), percentage: pfmt(totalService / grossTotal * 100) },
      { label: 'PPN / VAT', value: fmt(totalTax), percentage: pfmt(totalTax / grossTotal * 100) },
      { label: 'Pembulatan', value: fmt(totalRounding), percentage: pfmt(totalRounding / grossTotal * 100) }
    ];

    const paymentMethodsArr = Object.entries(detailed.paymentMethods).map(([method, amount]) => ({
      method,
      amount: fmt(amount as number),
      count: (sum?.paymentCounts || {})[method] || 0
    }));

    const context = {
      rangeLabel,
      netProfit,
      grossTotal,
      transactionCount: sum?.transactionCount || 0,
      totalOmzet: sum?.totalOmzet,
      unpaidAmount: sum?.unpaidAmount,
      inventoryCount: inventory.length,
      revenueStreams,
      totalMemberUsage: sum?.totalMemberUsage || 0,
      paymentMethods: paymentMethodsArr,
      totalTax,
      totalService,
      totalTaxService: totalTax + totalService,
      totalRounding,
      totalDiscount,
      totalCommissions,
      totalPenalties,
      totalSalaryAccrual,
      totalAwardedPoints: sum?.totalAwardedPoints || 0,
      totalExpenses,
      hourlyData,
      topItems,
      criticalStock,
      staffPerformance: Object.entries(sum?.staffRevenue || {}).map(([name, revenue]) => ({
        name,
        revenue: fmt(revenue as number),
        percentage: pfmt((revenue as number) / grossTotal * 100)
      })).sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue)).slice(0, 5),
      tableOccupancy: Object.entries(sum?.tableUsage || {}).map(([name, data]: [string, any]) => ({
        name,
        minutes: Math.round(data.duration),
        sessions: data.count
      })).sort((a, b) => b.minutes - a.minutes).slice(0, 8),
      avgOccupancyMinutes: Math.round(sum?.avgOccupancyMinutes || 0),
      reportId: `REP-${Date.now()}`,
      financeSummaryByCategory: Object.entries(financeSummary.byCategory || {}).map(([c, a]) => ({ c, a })),
      netRevenueCash: grossTotal - totalDiscount,
      avgTransactionValue: grossTotal > 0 ? (grossTotal / (sum?.transactionCount || 1)) : 0,
    };

    // 3. Render HTML to PDF via Puppeteer
    let browser;
    try {
      this.logger.log('Launching Puppeteer for high-fidelity PDF rendering...');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const page = await browser.newPage();
      
      const html = template(context, {
        helpers: {
          fmt: (n: any) => `Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`
        }
      });
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 7px; font-family: 'Inter', sans-serif; width: 100%; padding: 15px 50px 0 50px; display: flex; justify-content: space-between; align-items: center; color: #94a3b8; border-bottom: 1px solid #f1f5f9; margin: 0 15mm; height: 30px;">
            <div style="font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">${venue} · Executive Dashboard</div>
            <div style="font-weight: 500;">Premium Report Ecosystem</div>
          </div>`,
        footerTemplate: `
          <div style="font-size: 7px; color: #94a3b8; width: 100%; padding: 0 50px 15px 50px; display: flex; justify-content: space-between; align-items: center; font-family: 'Inter', sans-serif; border-top: 1px solid #f1f5f9; margin: 0 15mm;">
            <div style="font-weight: bold; text-transform: uppercase;">Verified Business Data · Confidential</div>
            <div style="font-weight: 800;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
          </div>`,
        preferCSSPageSize: true,
        margin: { top: '25mm', bottom: '20mm', left: '15mm', right: '15mm' }
      });

      await browser.close();
      this.logger.log('PDF generation complete (Next-Gen Web-to-PDF).');
      return Buffer.from(pdfBuffer);
    } catch (error) {
      if (browser) await browser.close();
      this.logger.error(`Puppeteer PDF generation failed: ${error.message}`);
      throw error;
    }
  }

  async sendExecutiveDashboardToWhatsApp(
    phone: string,
    startDate: Date,
    endDate: Date,
  ) {
    this.logger.log(`Request to send Executive Dashboard to WhatsApp: ${phone}`);
    try {
      const pdfBuffer = await this.generateDashboardExecutivePdf(startDate, endDate);
      
      const startStr = startDate.toLocaleDateString('id-ID');
      const endStr = endDate.toLocaleDateString('id-ID');

      const result = await this.whatsappService.sendDocument(
        phone,
        pdfBuffer,
        `Executive_Summary_VOC_${new Date().toISOString().split('T')[0]}.pdf`,
        `Halo Owner, berikut adalah **EXECUTIVE SUMMARY DASHBOARD** VOC BILLIARD periode ${startStr} s/d ${endStr}.\n\nLaporan ini mencakup Ringkasan Keuangan, Performa Menu, dan Status Inventori Kritis.`,
      );

      if (!result) throw new Error('STATUS_DISCONNECTED');
      return { status: 'success' };
    } catch (err) {
      this.logger.error(`Failed to send Executive Dashboard: ${err.message}`);
      throw err;
    }
  }

  async sendReportToWhatsApp(
    phone: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    this.logger.log(`Request to send report to WhatsApp: ${phone}`);
    try {
      const pdfBuffer = await this.generateDailyReportPdf(startDate, endDate);
      this.logger.log(`PDF Buffer ready (${pdfBuffer.length} bytes). Sending to WhatsApp...`);
      
      const startStr = startDate
        ? startDate.toLocaleDateString('id-ID')
        : new Date().toLocaleDateString('id-ID');
      const endStr = endDate ? ` s/d ${endDate.toLocaleDateString('id-ID')}` : '';

      const result = await this.whatsappService.sendDocument(
        phone,
        pdfBuffer,
        `Laporan_VOC_${new Date().toISOString().split('T')[0]}.pdf`,
        `Halo Owner, berikut adalah Laporan Pendapatan VOC BILLIARD tanggal ${startStr}${endStr}.`,
      );

      if (!result) {
        this.logger.error('WhatsApp Gateway returned null result (Disconnected?)');
        throw new Error('STATUS_DISCONNECTED');
      }

      this.logger.log('WhatsApp report sent successfully.');
      return { status: 'success' };
    } catch (err) {
      this.logger.error(`Failed to send report to WhatsApp: ${err.message}`);
      throw err;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndSendAutoReport() {
    const settings = await this.settingsService.getSettings();
    if (!settings.autoReportEnabled || !settings.ownerPhone) return;

    const now = new Date();
    // Use local time for HH:mm check
    const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (currentHHmm === settings.reportSchedule) {
      this.logger.log(`Starting automated daily report delivery to ${settings.ownerPhone}`);
      try {
        await this.sendReportToWhatsApp(settings.ownerPhone);
      } catch (e) {
        this.logger.error('Auto report delivery failed');
      }
    }
  }
}
