import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull, Between } from 'typeorm';
import { Shift, ShiftStatus } from './entities/shift.entity';
import { ShiftStockReport } from './entities/shift-stock-report.entity';
import { BusinessDay } from './entities/business-day.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../transaction/entities/transaction.entity';
import { OrderItem, OrderItemStatus } from '../cafe/entities/order-item.entity';
import { Ingredient } from '../inventory/entities/ingredient.entity';
import { MenuItem } from '../cafe/entities/menu-item.entity';
import { Cashflow, CashflowType } from './entities/cashflow.entity';
import { FinanceService } from './finance.service';
import { User } from '../user/entities/user.entity';
import { Setting } from '../settings/entities/setting.entity';
import { Expense } from './entities/expense.entity';
import type { EventsGateway } from '../socket/events.gateway';

import { PointLedger } from '../loyalty/entities/point-ledger.entity';

@Injectable()
export class ShiftService {
  private readonly logger = new Logger(ShiftService.name);

  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
    @InjectRepository(BusinessDay)
    private readonly businessDayRepo: Repository<BusinessDay>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Setting)
    private readonly settingRepo: Repository<Setting>,
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(Cashflow)
    private readonly cashflowRepo: Repository<Cashflow>,
    @InjectRepository(ShiftStockReport)
    private readonly shiftStockReportRepo: Repository<ShiftStockReport>,
    @InjectRepository(Ingredient)
    private readonly ingredientRepo: Repository<Ingredient>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepo: Repository<MenuItem>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(PointLedger)
    private readonly pointLedgerRepo: Repository<PointLedger>,
    private readonly financeService: FinanceService,
    @Inject(
      forwardRef(() => {
        const { EventsGateway } = require('../socket/events.gateway');
        return EventsGateway;
      }),
    )
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Mendapatkan Business Day yang aktif atau membuat baru jika belum ada
   */
  async getOrCreateActiveBusinessDay(): Promise<BusinessDay> {
    // 1. Fetch Offset from Settings
    const settings = await this.settingRepo.findOne({ where: {} });
    const offset = settings?.businessDayOffset || '00:00';
    const [offsetHours, offsetMinutes] = offset.split(':').map(Number);

    // 2. Calculate Logical Date
    const now = new Date();
    const logicalDate = new Date(now);

    // If current time is before offset, it belongs to "yesterday"
    const cutoffToday = new Date(now);
    cutoffToday.setHours(offsetHours, offsetMinutes, 0, 0);

    if (now < cutoffToday) {
      logicalDate.setDate(logicalDate.getDate() - 1);
    }

    const dateString = logicalDate.toISOString().split('T')[0];

    // 3. Find if there's an OPEN business day for this logical date
    // OR simply the MOST RECENT open day
    let activeDay = await this.businessDayRepo.findOne({
      where: { isClosed: false },
      order: { id: 'DESC' },
    });

    // 4. If an active day exists, we reuse it regardless of date string
    // (to allow flexibility if they started late).
    // BUT if it doesn't exist, we create one for the calculated logical date.
    if (!activeDay) {
      activeDay = this.businessDayRepo.create({
        date: dateString,
        startTime: new Date(),
        isClosed: false,
        totalRevenue: 0,
        totalExpenses: 0,
      });
      activeDay = await this.businessDayRepo.save(activeDay);
      this.logger.log(`New Business Day started: ${dateString} (Logical Date)`);
    }

    return activeDay;
  }

  /**
   * Memulai shift baru untuk user
   */
  async startShift(
    userId: number,
    cashStart: number,
    shiftName?: string,
    assignedTableIds?: any[],
  ): Promise<Shift> {
    // Cek jika user sudah punya shift yang masih OPEN
    const existingShift = await this.shiftRepo.findOne({
      where: { userId, status: ShiftStatus.OPEN },
    });

    if (existingShift) {
      throw new ConflictException(
        'Anda masih memiliki shift yang belum ditutup.',
      );
    }

    const activeDay = await this.getOrCreateActiveBusinessDay();
    const user = await this.userRepo.findOneBy({ id: userId });

    // Use provided assignments OR user defaults
    const finalAssignments =
      assignedTableIds || user?.assignedTableIds || undefined;

    // Calculate Lateness
    let latenessMinutes = 0;
    if (shiftName && shiftName !== 'CUSTOM') {
      const settings = await this.settingRepo.findOne({ where: {} });
      const matchingShift = settings?.availableShifts?.find(
        (s) => s.name.toUpperCase() === shiftName.toUpperCase(),
      );

      if (matchingShift && matchingShift.startTime) {
        const now = new Date();
        const [h, m] = matchingShift.startTime.split(':').map(Number);
        const scheduledStart = new Date(now);
        scheduledStart.setHours(h, m, 0, 0);

        // Adjust for cross-midnight if necessary (within 12h window)
        if (scheduledStart.getTime() - now.getTime() > 12 * 60 * 60 * 1000) {
          scheduledStart.setDate(scheduledStart.getDate() - 1);
        } else if (
          now.getTime() - scheduledStart.getTime() >
          12 * 60 * 60 * 1000
        ) {
          scheduledStart.setDate(scheduledStart.getDate() + 1);
        }

        const diffMs = now.getTime() - scheduledStart.getTime();
        if (diffMs > 0) {
          latenessMinutes = Math.floor(diffMs / 60000);
        }
      }
    }

    const shift = this.shiftRepo.create({
      userId,
      businessDayId: activeDay.id,
      startTime: new Date(),
      shiftName,
      cashStart,
      assignedTableIds: finalAssignments as any,
      cashSystem: 0,
      cashPhysical: 0,
      discrepancy: 0,
      status: ShiftStatus.OPEN,
      startedBy: user?.name || 'Unknown',
      isActive: true,
      latenessMinutes,
    });

    const savedShift = await this.shiftRepo.save(shift);
    this.eventsGateway.shiftStarted(savedShift);
    return savedShift;
  }

  /**
   * Mendapatkan shift aktif milik user dengan kalkulasi kas sistem live
   */
  async getActiveShift(userId: number): Promise<Shift | null> {
    const shift = await this.shiftRepo.findOne({
      where: { userId, status: ShiftStatus.OPEN },
      relations: ['businessDay'],
    });

    if (shift) {
      shift.cashSystem = await this.calculateExpectedCash(shift.id);

      // Live top-up calculation
      const shiftTxs = await this.transactionRepo.find({
        where: {
          shiftId: shift.id,
          type: TransactionType.TOPUP,
        },
      });
      shift.totalTopUp = shiftTxs.reduce(
        (sum, tx) => sum + Number(tx.grandTotal || 0),
        0,
      );
    }

    return shift;
  }

  /**
   * Kalkulasi uang tunai yang seharusnya ada di laci (Modal + Tunai Masuk - Pengeluaran Kas)
   */
  async calculateExpectedCash(shiftId: number): Promise<number> {
    const shift = await this.shiftRepo.findOneBy({ id: shiftId });
    if (!shift) return 0;

    // 1. Initial Cash (Modal)
    const openingCash = Number(shift.cashStart || 0);

    // 2. Query Unified Ledger (Cashflow) for this shift
    const ledgerEntries = await this.cashflowRepo.find({
      where: { shiftId },
    });

    let netCashflow = 0;
    ledgerEntries.forEach((entry) => {
      const amount = Number(entry.amount);
      if (entry.type === CashflowType.IN) {
        netCashflow += amount;
      } else {
        netCashflow -= amount;
      }
    });

    return openingCash + netCashflow;
  }

  /**
   * Mendapatkan semua shift yang sedang terbuka (untuk Admin)
   */
  async getOpenShifts(): Promise<Shift[]> {
    return this.shiftRepo.find({
      where: { status: ShiftStatus.OPEN },
      relations: ['user', 'user.role'],
      order: { startTime: 'DESC' },
    });
  }

  /**
   * Update penugasan meja pada shift yang sedang berjalan
   */
  async updateAssignments(
    shiftId: number,
    assignedTableIds: any[],
  ): Promise<Shift> {
    const shift = await this.shiftRepo.findOne({
      where: { id: shiftId },
      relations: ['user'],
    });
    if (!shift) throw new NotFoundException('Shift tidak ditemukan.');

    shift.assignedTableIds = assignedTableIds;
    const savedShift = await this.shiftRepo.save(shift);

    // Also save to user as persistent default
    if (shift.user) {
      shift.user.assignedTableIds = assignedTableIds;
      await this.userRepo.save(shift.user);
    }

    // Notify the waiter in real-time
    this.eventsGateway.assignmentsUpdated(shift.userId, assignedTableIds);

    return savedShift;
  }

  /**
   * Update penugasan meja permanen untuk user (bahkan jika tidak ada shift)
   */
  async updatePersistentAssignments(
    userId: number,
    assignedTableIds: any[],
  ): Promise<User> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User tidak ditemukan.');

    user.assignedTableIds = assignedTableIds;
    const saved = await this.userRepo.save(user);

    // Notify
    this.eventsGateway.assignmentsUpdated(userId, assignedTableIds);

    return saved;
  }

  /**
   * Menutup shift dan melakukan rekonsiliasi
   */
  async endShift(
    userId: number,
    cashPhysical: number,
    note?: string,
    stockReports?: any[],
  ): Promise<Shift> {
    const shift = await this.getActiveShift(userId);
    if (!shift) {
      throw new NotFoundException('Tidak ada shift aktif untuk user ini.');
    }

    // Kalkulasi uang tunai yang seharusnya ada
    const totalCashInSystem = await this.calculateExpectedCash(shift.id);

    const user = await this.userRepo.findOneBy({ id: userId });
    const now = new Date();

    // Calculate Performance Summary BEFORE closing shift object
    const performance = await this.calculateShiftPerformance(shift.id);

    // Calculate Overtime
    let overtimeMinutes = 0;
    if (shift.shiftName && shift.shiftName !== 'CUSTOM') {
      const settings = await this.settingRepo.findOne({ where: {} });
      const matchingShift = settings?.availableShifts?.find(
        (s) => s.name.toUpperCase() === shift.shiftName.toUpperCase(),
      );

      if (matchingShift && matchingShift.endTime) {
        const [h, m] = matchingShift.endTime.split(':').map(Number);
        const scheduledEnd = new Date(now);
        scheduledEnd.setHours(h, m, 0, 0);

        // Adjust for cross-midnight: if scheduledEnd is before shift start, it must be the next day
        if (scheduledEnd < shift.startTime) {
          scheduledEnd.setDate(scheduledEnd.getDate() + 1);
        }

        const diffMs = now.getTime() - scheduledEnd.getTime();
        if (diffMs > 0) {
          overtimeMinutes = Math.floor(diffMs / 60000);
        }
      }
    }

    // Calculate Shift Totals
    const shiftTxs = await this.transactionRepo.find({
      where: { shiftId: shift.id },
    });
    const totalTopUp = shiftTxs
      .filter((tx) => tx.type === 'TOPUP')
      .reduce((sum, tx) => sum + Number(tx.grandTotal || 0), 0);

    shift.endTime = now;
    shift.cashSystem = totalCashInSystem;
    shift.cashPhysical = cashPhysical;
    shift.discrepancy = cashPhysical - totalCashInSystem; // Selisih
    shift.totalTopUp = totalTopUp;
    shift.note = note || '';
    shift.status = ShiftStatus.CLOSED;
    shift.endedBy = user?.name || 'Unknown';
    shift.isActive = false;
    shift.overtimeMinutes = overtimeMinutes;
    shift.performanceSummary = performance;

    const savedShift = await this.shiftRepo.save(shift);

    // Handle Stock Reports if provided
    if (stockReports && Array.isArray(stockReports)) {
      await this.handleShiftStockReporting(savedShift.id, stockReports);
    }

    this.logger.log(
      `Shift closed for User ${userId}. Discrepancy: ${shift.discrepancy}`,
    );

    await this.eventsGateway.shiftEnded(userId);

    return savedShift;
  }

  /**
   * Menghitung statistik performa shift
   */
  async calculateShiftPerformance(shiftId: number): Promise<any> {
    const transactions = await this.transactionRepo.find({
      where: { shiftId },
      relations: ['orderItems', 'orderItems.menuItem', 'createdBy'],
    });

    const stats = {
      totalTransactions: transactions.length,
      topWaiters: {} as Record<string, { name: string; count: number }>,
      topPackages: {} as Record<string, number>,
      topPromos: {} as Record<string, number>,
      topItems: {} as Record<string, number>,
      billiardRevenue: 0,
      cafeRevenue: 0,
      topupRevenue: 0,
    };

    transactions.forEach((tx) => {
      // Waiters
      const waiterId = tx.createdByUserId;
      if (waiterId) {
        const name = tx.createdBy?.name || 'Unknown';
        if (!stats.topWaiters[waiterId])
          stats.topWaiters[waiterId] = { name, count: 0 };
        stats.topWaiters[waiterId].count++;
      }

      // Packages
      if (tx.type === TransactionType.BILLIARD && tx.fareName) {
        stats.topPackages[tx.fareName] =
          (stats.topPackages[tx.fareName] || 0) + 1;
        stats.billiardRevenue += Number(tx.billiardTotal || 0);
      }

      // Promos
      if (tx.appliedPromos && Array.isArray(tx.appliedPromos)) {
        tx.appliedPromos.forEach((p: any) => {
          const name = p.name || 'Promo';
          stats.topPromos[name] = (stats.topPromos[name] || 0) + 1;
        });
      }

      // Items (Cafe/Store)
      if (tx.orderItems) {
        tx.orderItems.forEach((oi) => {
          if (
            oi.status === OrderItemStatus.DONE ||
            oi.status === OrderItemStatus.QUEUED ||
            oi.status === OrderItemStatus.PROCESSING
          ) {
            const name = oi.menuItem?.name || oi.customName || 'Item';
            stats.topItems[name] =
              (stats.topItems[name] || 0) + Number(oi.quantity);
          }
        });
      }

      if (tx.type === TransactionType.CAFE)
        stats.cafeRevenue += Number(tx.cafeTotal || 0);
      if (tx.type === TransactionType.TOPUP)
        stats.topupRevenue += Number(tx.grandTotal || 0);
    });

    return {
      ...stats,
      topWaiters: Object.values(stats.topWaiters)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      topPackages: Object.entries(stats.topPackages)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      topPromos: Object.entries(stats.topPromos)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      topItems: Object.entries(stats.topItems)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  /**
   * Proses pelaporan stok di akhir shift
   */
  async handleShiftStockReporting(
    shiftId: number,
    reports: any[],
  ): Promise<void> {
    const queryRunner = this.shiftRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const report of reports) {
        let systemStock = 0;
        let itemName = report.itemName;
        let unit = report.unit;

        // Capture current system stock for tracking
        if (report.ingredientId) {
          const ing = await queryRunner.manager.findOne(Ingredient, {
            where: { id: report.ingredientId },
          });
          if (ing) {
            systemStock = Number(ing.stockQuantity);
            itemName = ing.name;
            unit = ing.unit;
          }
        } else if (report.menuItemId) {
          const menu = await queryRunner.manager.findOne(MenuItem, {
            where: { id: report.menuItemId },
          });
          if (menu) {
            systemStock = Number((menu as any).stockQuantity || 0);
            itemName = menu.name;
          }
        }

        const discrepancy = Number(report.physicalStock) - systemStock;
        let lostValue = 0;

        // Calculate loss value (negative discrepancy means items are missing)
        if (discrepancy < 0) {
          const absLoss = Math.abs(discrepancy);
          if (report.ingredientId) {
            const ing = await queryRunner.manager.findOne(Ingredient, {
              where: { id: report.ingredientId },
            });
            lostValue = absLoss * Number(ing?.costPrice || 0);
          } else if (report.menuItemId) {
            const menu = await queryRunner.manager.findOne(MenuItem, {
              where: { id: report.menuItemId },
            });
            lostValue = absLoss * Number(menu?.price || 0);
          }
        }

        const stockReport = this.shiftStockReportRepo.create({
          shiftId,
          ingredientId: report.ingredientId,
          menuItemId: report.menuItemId,
          itemName,
          systemStock,
          physicalStock: Number(report.physicalStock),
          discrepancy,
          lostValue,
          unit,
          note: report.note,
        });

        await queryRunner.manager.save(stockReport);
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to save shift stock reports', error);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Mendapatkan laporan stok untuk shift tertentu
   */
  async getShiftStockReports(shiftId: number): Promise<ShiftStockReport[]> {
    return this.shiftStockReportRepo.find({
      where: { shiftId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Mendapatkan rekapitulasi untuk Business Day tertentu
   */
  async getBusinessDayReport(businessDayId: number): Promise<any> {
    const businessDay = await this.businessDayRepo.findOne({
      where: { id: businessDayId },
      relations: [
        'shifts',
        'shifts.user',
        'shifts.user.role',
        'shifts.stockReports',
      ],
    });

    if (!businessDay)
      throw new NotFoundException('Business Day tidak ditemukan.');

    const transactions = await this.transactionRepo.find({
      where: { businessDayId },
      relations: [
        'orderItems',
        'orderItems.menuItem',
        'orderItems.menuItem.category',
        'table',
        'cafeTable',
        'createdBy',
        'createdBy.role',
        'payments',
      ],
      order: { createdAt: 'DESC' },
    });

    // Ensure shifts are sorted newest first
    businessDay.shifts.sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime(),
    );

    const dayItemCounts: Record<string, { name: string; qty: number }> = {};
    const dayPaymentMethods: Record<string, number> = {};
    let totalVat = 0;
    let totalService = 0;
    let totalDiscount = 0;
    let totalRounding = 0;
    let totalRevenue = 0; // Actual external cash flow (Cash, Bank, QRIS, etc.)
    let totalTopUp = 0;
    let totalBilliardSales = 0;
    let totalCafeSales = 0;
    const waiterCounts: Record<string, { name: string; count: number }> = {};

    // 1. Fetch loyalty redemptions for this period
    const settings = await this.settingRepo.findOne({ where: {} });
    const offsetString = settings?.businessDayOffset || '00:00';
    const [offsetH, offsetM] = offsetString.split(':').map(Number);
    const dayStart = new Date(businessDay.date);
    dayStart.setHours(offsetH, offsetM, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const redemptions = await this.pointLedgerRepo.find({
      where: {
        type: 'REDEEM',
        createdAt: Between(dayStart, dayEnd),
      },
      relations: ['member'],
    });

    const totalPointsRedeemed = Math.abs(
      redemptions.reduce((s, r) => s + Number(r.amount), 0),
    );
    const redemptionBreakdown = Object.entries(
      redemptions.reduce((acc: any, r) => {
        const item = r.description?.replace('Tukar ', '') || 'Reward Item';
        if (!acc[item]) acc[item] = { count: 0, points: 0 };
        acc[item].count++;
        acc[item].points += Math.abs(Number(r.amount));
        return acc;
      }, {}),
    ).map(([name, stats]: [string, any]) => ({ name, ...stats }));

    transactions.forEach((tx) => {
      // Count transactions per creator (waiter)
      const creatorId = tx.createdByUserId;
      if (creatorId) {
        const creatorName = tx.createdBy?.name || 'Unknown';
        if (!waiterCounts[creatorId])
          waiterCounts[creatorId] = { name: creatorName, count: 0 };
        waiterCounts[creatorId].count++;
      }
      const isTopUp = tx.type === 'TOPUP';
      const txGrandTotal = Number(tx.grandTotal || 0);

      // 1. Calculate Revenue and aggregate global methods
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
        // Global methods for the whole day (including those without shiftId)
        dayPaymentMethods[m] = (dayPaymentMethods[m] || 0) + p.amount;

        if (m !== 'MEMBER' && m !== 'MEMBERSHIP') {
          totalRevenue += p.amount;
        }
      });

      if (isTopUp) {
        totalTopUp += txGrandTotal;
      } else {
        totalBilliardSales += Number(tx.billiardTotal || 0);

        // Robust Cafe Total: Use column if > 0, otherwise sum orderItems
        let txCafe = Number(tx.cafeTotal || 0);
        if (txCafe === 0 && tx.orderItems && tx.orderItems.length > 0) {
          tx.orderItems.forEach((oi: any) => {
            txCafe += Number(oi.price || 0) * Number(oi.quantity || 0);
          });
        }
        totalCafeSales += txCafe;

        totalVat += Number(tx.vatAmount || 0);
        totalService += Number(tx.serviceChargeAmount || 0);
        totalDiscount += Number(tx.discountAmount || 0);
        totalRounding += Number(tx.roundingAmount || 0);
      }

      // Item aggregation
      if (tx.orderItems && Array.isArray(tx.orderItems)) {
        tx.orderItems.forEach((oi: any) => {
          const menuId = oi.menuItemId || `custom-${oi.customName}`;
          if (!dayItemCounts[menuId]) {
            dayItemCounts[menuId] = {
              name: oi.menuItem?.name || oi.customName,
              qty: 0,
            };
          }
          dayItemCounts[menuId].qty += Number(oi.quantity);
        });
      }
    });

    const dayTopItems = Object.values(dayItemCounts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // Map shift summaries with the same logic
    const shiftSummaries = businessDay.shifts.map((shift) => {
      const shiftTx = transactions.filter((t) => t.shiftId === shift.id);
      const methods: any = {};
      let sTotalRevenue = 0;
      let sBilliardSales = 0;
      let sCafeSales = 0;
      let sTopUp = 0;
      let sRounding = 0;
      const sItemCounts: Record<
        string,
        { name: string; qty: number; notes: string[] }
      > = {};
      const sPackageCounts: Record<
        string,
        { name: string; count: number; revenue: number }
      > = {};
      const sTablePerformance: Record<
        string,
        { name: string; sessions: number; revenue: number }
      > = {};
      const sWaiterPerformance: Record<
        number,
        {
          id: number;
          name: string;
          revenue: number;
          billiardRevenue: number;
          cafeRevenue: number;
          packageCounts: Record<string, { name: string; count: number }>;
          itemCounts: Record<string, { name: string; qty: number }>;
        }
      > = {};

      shiftTx.forEach((tx) => {
        // Tracking Waiter (Creator) Performance within this shift
        const waiterId = tx.createdByUserId;
        if (waiterId) {
          if (!sWaiterPerformance[waiterId]) {
            sWaiterPerformance[waiterId] = {
              id: waiterId,
              name: tx.createdBy?.name || 'Unknown',
              revenue: 0,
              billiardRevenue: 0,
              cafeRevenue: 0,
              packageCounts: {},
              itemCounts: {},
            };
          }
          const w = sWaiterPerformance[waiterId];
          w.billiardRevenue += Number(tx.billiardTotal || 0);
          w.cafeRevenue += Number(tx.cafeTotal || 0);
          w.revenue +=
            Number(tx.billiardTotal || 0) + Number(tx.cafeTotal || 0);

          if (tx.fareName) {
            const pkg = tx.fareName;
            if (!w.packageCounts[pkg])
              w.packageCounts[pkg] = { name: pkg, count: 0 };
            w.packageCounts[pkg].count++;
          }

          if (tx.orderItems && Array.isArray(tx.orderItems)) {
            tx.orderItems.forEach((oi: any) => {
              const mId = oi.menuItemId || `c-${oi.customName}`;
              if (!w.itemCounts[mId])
                w.itemCounts[mId] = {
                  name: oi.menuItem?.name || oi.customName,
                  qty: 0,
                };
              w.itemCounts[mId].qty += Number(oi.quantity);
            });
          }
        }

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
          methods[m] = (methods[m] || 0) + p.amount;
          if (m !== 'MEMBER' && m !== 'MEMBERSHIP') {
            sTotalRevenue += p.amount;
          }
        });

        if (tx.type === 'TOPUP') {
          sTopUp += Number(tx.grandTotal || 0);
        } else {
          sBilliardSales += Number(tx.billiardTotal || 0);
          sCafeSales += Number(tx.cafeTotal || 0);
          sRounding += Number(tx.roundingAmount || 0);

          // Table performance (using joined table or cafeTable)
          const tbl = tx.table || tx.cafeTable;
          if (tbl) {
            const tId = tbl.id.toString();
            if (!sTablePerformance[tId]) {
              sTablePerformance[tId] = {
                name: (tbl as any).tableName,
                sessions: 0,
                revenue: 0,
              };
            }
            sTablePerformance[tId].sessions += 1;
            sTablePerformance[tId].revenue += Number(tx.billiardTotal || 0);
          }

          // Package performance (using fareName for package)
          if (tx.fareName) {
            const pkgName = tx.fareName;
            if (!sPackageCounts[pkgName]) {
              sPackageCounts[pkgName] = { name: pkgName, count: 0, revenue: 0 };
            }
            sPackageCounts[pkgName].count += 1;
            sPackageCounts[pkgName].revenue += Number(tx.billiardTotal || 0);
          }
        }

        if (tx.orderItems && Array.isArray(tx.orderItems)) {
          tx.orderItems.forEach((oi: any) => {
            const menuId = oi.menuItemId || `custom-${oi.customName}`;
            if (!sItemCounts[menuId]) {
              sItemCounts[menuId] = {
                name: oi.menuItem?.name || oi.customName,
                qty: 0,
                notes: [],
              };
            }
            sItemCounts[menuId].qty += Number(oi.quantity);
            if (oi.note) {
              sItemCounts[menuId].notes.push(oi.note);
            }
          });
        }
      });

      const roleName = (shift.user?.role?.name || '').toUpperCase();
      const isWaiter =
        roleName.includes('WAITER') || roleName.includes('PELAYAN');

      return {
        shiftId: shift.id,
        userName: shift.user?.name || 'Unknown',
        userRole: shift.user?.role?.name || 'UNKNOWN',
        isWaiter,
        shiftName: shift.shiftName || 'N/A',
        startTime: shift.startTime,
        endTime: shift.endTime,
        totalRevenue: isWaiter ? 0 : sTotalRevenue,
        billiardRevenue: isWaiter ? 0 : sBilliardSales,
        cafeRevenue: isWaiter ? 0 : sCafeSales,
        topUpRevenue: isWaiter ? 0 : sTopUp,
        roundingAmount: isWaiter ? 0 : sRounding,
        paymentMethods: isWaiter ? {} : methods,
        topItems: isWaiter
          ? []
          : Object.values(sItemCounts).sort((a, b) => b.qty - a.qty),
        topPackages: isWaiter
          ? []
          : Object.values(sPackageCounts).sort((a, b) => b.count - a.count),
        tablePerformance: isWaiter
          ? []
          : Object.values(sTablePerformance).sort(
              (a, b) => b.revenue - a.revenue,
            ),
        waiterPerformance: Object.values(sWaiterPerformance).sort(
          (a, b) => b.revenue - a.revenue,
        ),
        discrepancy: shift.discrepancy,
        latenessMinutes: shift.latenessMinutes,
        overtimeMinutes: shift.overtimeMinutes,
        performance: shift.performanceSummary || {},
        stockReports: shift.stockReports || [],
      };
    });

    // Enrich each transaction: override paymentDetails with data from the
    // authoritative `payments` relation (TransactionPayment entity) so the
    // frontend always sees the correct payment method (MEMBER, CASH, QRIS, etc.)
    const enrichedTransactions = transactions.map((tx) => {
      let resolvedPaymentDetails: {
        method: string;
        amount: number;
        payer: string;
        paymentId: number;
      }[];

      if (tx.payments && tx.payments.length > 0) {
        // Use the formal payment records — most accurate source
        resolvedPaymentDetails = tx.payments.map((p) => ({
          method: p.paymentMethod, // e.g. 'MEMBER', 'CASH', 'QRIS'
          amount: Number(p.totalPaid),
          payer: p.payerName || tx.customerName || 'Payer',
          paymentId: p.id,
        }));
      } else if (
        tx.paymentDetails &&
        Array.isArray(tx.paymentDetails) &&
        tx.paymentDetails.length > 0
      ) {
        // Fallback to JSON column but normalize unknown methods
        resolvedPaymentDetails = tx.paymentDetails.map((p: any) => ({
          method: p.method || 'UNKNOWN',
          amount: Number(p.amount || 0),
          payer: p.payer || tx.customerName || 'Payer',
          paymentId: p.paymentId,
        }));
      } else if (Number(tx.paidAmount) > 0) {
        // Last resort: single lump payment
        resolvedPaymentDetails = [
          {
            method: (tx as any).paymentMethod || 'UNKNOWN',
            amount: Number(tx.paidAmount),
            payer: tx.customerName || 'Customer',
            paymentId: 0,
          },
        ];
      } else {
        resolvedPaymentDetails = [];
      }

      return {
        ...tx,
        paymentDetails: resolvedPaymentDetails,
      };
    });

    return {
      businessDay,
      summary: {
        totalRevenue, // External Omzet (excludes MEMBER payments)
        billiardRevenue: totalBilliardSales,
        cafeRevenue: totalCafeSales,
        topUpRevenue: totalTopUp,
        totalVat,
        totalService,
        totalDiscount,
        totalRounding,
        totalAwardedPoints: transactions.reduce(
          (sum, tx) => sum + Number((tx as any).awardedPoints || 0),
          0,
        ),
        totalPointsRedeemed,
        redemptionBreakdown,
        totalMemberUsage: Object.entries(dayPaymentMethods).reduce(
          (sum, [method, amount]) => {
            return method === 'MEMBER' || method === 'MEMBERSHIP'
              ? sum + amount
              : sum;
          },
          0,
        ),
        transactionCount: transactions.length,
        topItems: dayTopItems,
        paymentMethods: dayPaymentMethods,
        topWaiters: Object.values(waiterCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      },
      shifts: shiftSummaries,
      transactions: enrichedTransactions,
    };
  }

  /**
   * Menutup Business Day (Closing Harian)
   */
  async closeBusinessDay(id: number): Promise<BusinessDay> {
    const businessDay = await this.businessDayRepo.findOneBy({ id });
    if (!businessDay)
      throw new NotFoundException('Business Day tidak ditemukan.');

    // Pastikan semua shift sudah CLOSED
    const openShifts = await this.shiftRepo.find({
      where: { businessDayId: id, status: ShiftStatus.OPEN },
      relations: ['user'],
    });

    if (openShifts.length > 0) {
      const userNames = openShifts
        .map((s) => s.user?.name || 'Unknown')
        .join(', ');
      throw new ConflictException(
        `Gagal tutup buku: Masih ada ${openShifts.length} shift yang belum ditutup (Oleh: ${userNames}).`,
      );
    }

    businessDay.isClosed = true;
    businessDay.endTime = new Date();

    // Hitung total akhir
    const transactions = await this.transactionRepo.find({
      where: { businessDayId: id },
    });
    businessDay.totalRevenue = transactions.reduce(
      (sum, t) => sum + Number(t.grandTotal),
      0,
    );
    businessDay.totalTopUp = transactions
      .filter((t) => t.type === 'TOPUP')
      .reduce((sum, t) => sum + Number(t.grandTotal || 0), 0);

    return this.businessDayRepo.save(businessDay);
  }
  /**
   * Mendapatkan daftar semua Business Day
   */
  async getBusinessDays(): Promise<BusinessDay[]> {
    return this.businessDayRepo.find({
      order: { date: 'DESC', id: 'DESC' },
    });
  }

  /**
   * Find the waiter currently assigned to a table in an open shift
   */
  async findAssignedWaiterForTable(
    type: 'CAFE' | 'BILLIARD',
    tableId: number,
  ): Promise<number | null> {
    const openShifts = await this.getOpenShifts();
    for (const shift of openShifts) {
      if (shift.assignedTableIds && Array.isArray(shift.assignedTableIds)) {
        const isAssigned = shift.assignedTableIds.some(
          (t) => t.type === type && Number(t.id) === Number(tableId),
        );
        if (isAssigned) {
          return shift.userId;
        }
      }
    }
    return null;
  }

  /**
   * Find the active cashier (Kasir) shift.
   * Revenue from ANY payment should always be attributed to the cashier on duty,
   * regardless of who (admin, super admin, waiter) performed the payment action.
   * Falls back to null if no cashier is currently on shift.
   */
  async findActiveCashierShift(): Promise<Shift | null> {
    const openShifts = await this.shiftRepo.find({
      where: { status: ShiftStatus.OPEN },
      relations: ['user', 'user.role'],
      order: { startTime: 'DESC' },
    });

    // Find first open shift whose user has a cashier/kasir role
    const cashierShift = openShifts.find((shift) => {
      const roleName = (shift.user?.role?.name || '').toUpperCase();
      return roleName.includes('KASIR') || roleName.includes('CASHIER');
    });

    return cashierShift ?? null;
  }
}
