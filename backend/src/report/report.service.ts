import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between, Not, In } from 'typeorm';
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
import type { AIService } from '../ai/ai.service';
// AIService implementation imported via forwardRef/require below
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
    @Inject(
      forwardRef(() => {
        const { AIService } = require('../ai/ai.service');
        return AIService;
      }),
    )
    private readonly aiService: AIService,
    private readonly eventEmitter: EventEmitter2,
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

  async getDailySummaryWithBreakdown() {
    const settings = await this.settingsService.getSettings();
    const [hours, minutes] = (settings.businessDayOffset || '00:00')
      .split(':')
      .map(Number);
    const now = new Date();
    const effectiveDay = new Date(now.getTime() - (hours * 3600000 + minutes * 60000));
    effectiveDay.setHours(0, 0, 0, 0);
    const businessDayStart = new Date(effectiveDay);
    businessDayStart.setHours(hours, minutes, 0, 0);
    return this.getDetailedRevenueReport(businessDayStart, now);
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
      .where('(oi.status = :status OR oi.isPaid = :isPaid)', {
        status: OrderItemStatus.DONE,
        isPaid: true,
      })
      .andWhere('oi.status NOT IN (:...excluded)', {
        excluded: [OrderItemStatus.CANCELLED, OrderItemStatus.CANCEL_REQUESTED],
      })
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

  async getGlobalItemTrends(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orderItems = await this.orderItemRepository.find({
      where: {
        createdAt: MoreThanOrEqual(startDate),
        status: Not(OrderItemStatus.CANCELLED),
      },
      select: ['menuItemId', 'quantity', 'createdAt'],
    });

    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const itemIds = Array.from(new Set(orderItems.map((oi) => oi.menuItemId)));
    const trends: Record<number, any[]> = {};

    itemIds.forEach((id) => {
      trends[id] = dates.map((dateStr) => {
        let count = 0;
        orderItems.forEach((oi) => {
          if (oi.menuItemId !== id) return;
          const oiDate = new Date(oi.createdAt).toISOString().split('T')[0];
          if (oiDate === dateStr) count += Number(oi.quantity);
        });
        return { day: dateStr.split('-').slice(2).join('/'), count };
      });
    });

    return trends;
  }

  async getItemsPerformance(startDate?: string, endDate?: string) {
    let startD: Date;
    let endD: Date;

    if (startDate && endDate) {
      startD = new Date(startDate);
      endD = new Date(endDate);
      // Ensure end of day for endD
      if (endDate.length <= 10) {
        endD.setHours(23, 59, 59, 999);
      }
    } else {
      startD = new Date();
      startD.setDate(startD.getDate() - 30);
      startD.setHours(0, 0, 0, 0);
      endD = new Date();
    }

    // 1. Fetch Menu Items with Finance Data (for HPP/Margin)
    const allItems = await this.menuItemRepository.find({
      where: { isActive: true },
      relations: ['category', 'productFinance'],
    });

    // 2. Fetch Sales Aggregate Data
    const salesData = await this.orderItemRepository
      .createQueryBuilder('oi')
      .select('oi.menuItemId', 'menuItemId')
      .addSelect('SUM(oi.quantity)', 'totalQuantity')
      .addSelect('SUM(oi.quantity * (oi.priceAtOrder - oi.discountAmount / oi.quantity))', 'totalRevenue')
      .where('(oi.status = :status OR oi.isPaid = :isPaid)', {
        status: OrderItemStatus.DONE,
        isPaid: true,
      })
      .andWhere('oi.status NOT IN (:...excluded)', {
        excluded: [OrderItemStatus.CANCELLED, OrderItemStatus.CANCEL_REQUESTED],
      })
      .andWhere('oi.createdAt BETWEEN :start AND :end', { 
        start: startD, 
        end: endD 
      })
      .groupBy('oi.menuItemId')
      .getRawMany();

    const salesMap = new Map(
      salesData.map((r) => [
        Number(r.menuItemId),
        { qty: Number(r.totalQuantity), revenue: Number(r.totalRevenue) },
      ]),
    );

    // 3. Menu Engineering Logic
    let totalCombinedQty = 0;
    let totalCombinedProfit = 0;
    const itemsWithMargin = allItems.map((item) => {
      const stats = salesMap.get(item.id) || { qty: 0, revenue: 0 };
      const hpp = Number(item.productFinance?.baseHpp || 0);
      const marginPerUnit = Number(item.price) - hpp;
      const totalMargin = marginPerUnit * stats.qty;

      totalCombinedQty += stats.qty;
      totalCombinedProfit += totalMargin;

      return {
        id: item.id,
        name: item.name,
        category: item.category?.name || '—',
        price: Number(item.price),
        hpp,
        margin: marginPerUnit,
        totalQty: stats.qty,
        totalRevenue: stats.revenue,
        totalMargin,
      };
    });

    const avgVolume = totalCombinedQty / (allItems.length || 1);
    const avgMargin = totalCombinedProfit / (totalCombinedQty || 1);

    const engineering = itemsWithMargin.map((it) => {
      let cat = 'DOGS'; // Default: Low Volume, Low Margin
      let advice = 'Pertimbangkan untuk dihapus atau di-rebranding.';
      
      const isHighVolume = it.totalQty >= avgVolume;
      const isHighMargin = it.margin >= avgMargin;

      if (isHighVolume && isHighMargin) {
        cat = 'STARS';
        advice = 'Pertahankan & Promosikan lebih intensif!';
      } else if (isHighVolume && !isHighMargin) {
        cat = 'PLOWHORSES';
        advice = 'Populer tapi untung tipis. Coba naikkan harga sedikit atau kontrol porsi.';
      } else if (!isHighVolume && isHighMargin) {
        cat = 'PUZZLES';
        advice = 'Kurang laku tapi untung besar. Masukkan ke dalam paket bundling!';
      }

      return { ...it, engineeringCategory: cat, aiAdvice: advice };
    }).sort((a, b) => b.totalQty - a.totalQty);

    // 4. Table Profitability Analysis
    const transactions = await this.transactionRepository.find({
      where: {
        createdAt: Between(startD, endD),
        status: TransactionStatus.PAID,
      },
      relations: ['table', 'orderItems', 'orderItems.menuItem', 'orderItems.menuItem.category'],
    });


    const tableStats: Record<string, { billiard: number; cafe: number; total: number; count: number; type: 'BILLIARD' | 'CAFE' }> = {};
    transactions.forEach(tx => {
      const tableId = tx.table?.id || tx.cafeTable?.id;
      if (!tableId) return;
      const tName = tx.table?.tableName || tx.cafeTable?.tableName || 'Unknown';
      
      if (!tableStats[tName]) tableStats[tName] = { 
        billiard: 0, 
        cafe: 0, 
        total: 0, 
        count: 0, 
        type: tx.table ? 'BILLIARD' : 'CAFE' 
      };
      
      const billiard = Number(tx.billiardTotal || 0);
      const cafe = (tx.orderItems || []).reduce((sum, oi) => sum + (Number(oi.quantity) * Number(oi.priceAtOrder)), 0);
      
      tableStats[tName].billiard += billiard;
      tableStats[tName].cafe += cafe;
      tableStats[tName].total += (billiard + cafe);
      tableStats[tName].count += 1;
    });

    const tableRanking = Object.entries(tableStats).map(([name, data]) => ({
      name,
      ...data,
      avgPerSession: data.total / data.count,
    })).sort((a: any, b: any) => b.total - a.total);

    // 5. Staff/Waiter Audit (Bundle Conversion)
    const waiterSales = await this.userService.findManagementStaff();
    const staffAudit = await Promise.all(waiterSales.map(async (u: any) => {
      const staffTxs = transactions.filter(tx => tx.createdByUserId === u.id);
      const totalTxs = staffTxs.length;
      const bundleTxs = staffTxs.filter(tx => (tx.orderItems || []).some(oi => oi.bundleGroupId || oi.note?.includes('PACKAGE'))).length;
      
      let totalRevenue = 0;
      let billiardTotal = 0;
      let cafeTotal = 0;
      const categories: Record<string, Record<string, number>> = {};
      const packages: Record<string, number> = {};

      staffTxs.forEach(tx => {
        const bTotal = Number(tx.billiardTotal || 0);
        billiardTotal += bTotal;
        
        tx.orderItems?.forEach(oi => {
          const price = Number(oi.priceAtOrder) * Number(oi.quantity);
          cafeTotal += price;

          const isPackage = oi.bundleGroupId || oi.note?.includes('PACKAGE');
          const itemName = oi.menuItem?.name || oi.customName || 'Unknown Item';
          
          if (isPackage) {
            packages[itemName] = (packages[itemName] || 0) + Number(oi.quantity);
          } else {
            const catName = oi.menuItem?.category?.name || 'OTHERS';
            if (!categories[catName]) categories[catName] = {};
            categories[catName][itemName] = (categories[catName][itemName] || 0) + Number(oi.quantity);
          }
        });
        totalRevenue += (bTotal + (tx.orderItems || []).reduce((sum, oi) => sum + (Number(oi.priceAtOrder) * Number(oi.quantity)), 0));
      });

      return {
        id: u.id,
        name: u.name,
        totalTxs,
        bundleTxs,
        conversionRate: totalTxs > 0 ? (bundleTxs / totalTxs) * 100 : 0,
        totalRevenue,
        billiardTotal,
        cafeTotal,
        categories,
        packages
      };
    }));

    const ranked = engineering;
    const sold = ranked.filter((i) => i.totalQty > 0);
    const unsold = ranked.filter((i) => i.totalQty === 0);

    return {
      all: ranked,
      topItems: sold.slice(0, 8),
      slowItems: [...sold.slice(-5).reverse(), ...unsold.slice(0, 3)],
      totalMenuItems: allItems.length,
      activeItems: sold.length,
      unsoldItems: unsold.length,
      // Executive Synthesis
      menuEngineering: {
        stars: engineering.filter(it => it.engineeringCategory === 'STARS'),
        plowhorses: engineering.filter(it => it.engineeringCategory === 'PLOWHORSES'),
        puzzles: engineering.filter(it => it.engineeringCategory === 'PUZZLES'),
        dogs: engineering.filter(it => it.engineeringCategory === 'DOGS'),
        avgMargin,
        avgVolume,
      },
      tableProfitability: tableRanking,
      staffAudit: staffAudit.sort((a: any, b: any) => b.conversionRate - a.conversionRate),
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
    stockReports?: any[],
    attachmentUrl?: string,
  ) {
    const shift = await this.shiftRepository.findOne({
      where: { id, isActive: true },
    });
    if (!shift) throw new NotFoundException('Active shift not found');
        // Check if all mandatory department reports are DONE (only for those the user is responsible for)
    const pendingDepts: string[] = [];
    const userRole = (shift.user?.role?.name || '').toUpperCase();
    const userDepts = this.shiftService.getDepartmentsByRole(userRole);
    
    if (userDepts.length > 0) {
      const reportStatus = shift.stockReportStatus || {};
      
      for (const dept of userDepts) {
        if (dept === 'CASHIER') continue;

        const hasHvi = await this.ingredientRepository.exists({ 
          where: { department: dept, isHighValue: true }
        }) || await this.menuItemRepository.exists({
          where: { department: dept, isHighValue: true }
        });

        if (hasHvi && reportStatus[dept] !== 'DONE') {
          pendingDepts.push(dept);
        }
      }
    }


    if (pendingDepts.length > 0) {
      throw new Error(
        `Shift tidak bisa ditutup. Laporan stok departemen berikut belum selesai: ${pendingDepts.join(', ')}`,
      );
    }

    shift.endTime = new Date();
    shift.endedBy = endedBy;
    shift.cashPhysical = closingCash;
    if (remarks) shift.note = remarks;
    shift.attachmentUrl = attachmentUrl || '';
    shift.isActive = false;

    // 3. Final Reconciliation (Use ShiftService for precision)
    const breakdown = await this.shiftService.calculateExpectedCash(id);
    shift.cashSystem = breakdown.expectedTotal;
    shift.cashRevenue = breakdown.cashRevenue;
    shift.nonCashRevenue = breakdown.nonCashRevenue;
    shift.totalExpenses = breakdown.totalExpenses;
    shift.discrepancy = Number(shift.cashPhysical) - Number(shift.cashSystem);

    // 3.5 Calculate Performance Summary (for the frontend summary card)
    shift.performanceSummary = await this.shiftService.calculateShiftPerformance(
      id,
    );

    const saved = await this.shiftRepository.save(shift);

    // 4. Handle Stock Reports
    if (stockReports && Array.isArray(stockReports)) {
      await this.shiftService.handleShiftStockReporting(id, stockReports);
    }

    // 5. Notify Owner via WhatsApp
    this.shiftService.notifyOwnerShiftClosed(id).catch((err) => {
      this.logger.error(
        'Failed to notify owner about shift closing (ReportService):',
        err,
      );
    });

    return saved;
  }

  async getActiveShift() {
    const shift = await this.shiftRepository.findOne({
      where: { isActive: true },
    });
    if (shift) {
      const breakdown = await this.shiftService.calculateExpectedCash(
        shift.id,
      );
      shift.cashSystem = breakdown.expectedTotal;
      shift.cashRevenue = breakdown.cashRevenue;
      shift.nonCashRevenue = breakdown.nonCashRevenue;
      shift.totalExpenses = breakdown.totalExpenses;
    }
    return shift;
  }

  async getShiftAuditReport(startDate?: string, endDate?: string, shiftId?: number) {
    let shifts: Shift[] = [];

    if (shiftId) {
      const singleShift = await this.shiftRepository.findOne({
        where: { id: shiftId },
        relations: ['user', 'user.role', 'stockReports'],
      });
      if (singleShift) shifts = [singleShift];
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (endDate.length <= 10) end.setHours(23, 59, 59, 999);
      shifts = await this.shiftRepository.find({
        where: { startTime: Between(start, end) },
        relations: ['user', 'user.role', 'stockReports'],
        order: { startTime: 'DESC' },
      });
    } else {
      const now = new Date();
      shifts = await this.shiftRepository.find({
        where: { startTime: Between(new Date(now.setHours(0,0,0,0)), new Date(now.setHours(23,59,59,999))) },
        relations: ['user', 'user.role', 'stockReports'],
        order: { startTime: 'DESC' },
      });
    }

    const filteredShifts = shiftId 
      ? shifts 
      : shifts.filter(shift => {
          const role = (shift.user?.role?.name || '').toUpperCase();
          return !role.includes('WAITER') && !role.includes('PELAYAN');
        });

    const mappedShifts = await Promise.all(filteredShifts.map(async (shift) => {
      const shiftExpenses = await this.getShiftExpenses(shift.id, shift.user?.id, shift.startTime, shift.endTime || new Date());
      const totalExp = shiftExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const paymentMethods = await this.getShiftPaymentBreakdown(shift.id);
      const totalRev = Object.values(paymentMethods).reduce((s, v) => s + Number(v), 0);

      return {
        id: shift.id,
        status: shift.status,
        shiftName: shift.shiftName,
        userName: shift.user?.name || 'Unknown',
        role: shift.user?.role?.name || 'Staff',
        startTime: shift.startTime,
        endTime: shift.endTime,
        cashSystem: Number(shift.cashSystem),
        cashPhysical: Number(shift.cashPhysical),
        cashStart: Number(shift.cashStart),
        discrepancy: Number(shift.discrepancy),
        cashRevenue: Number(paymentMethods['CASH'] || 0),
        nonCashRevenue: totalRev - Number(paymentMethods['CASH'] || 0),
        totalExpenses: totalExp,
        netCashflow: totalRev - totalExp,
        stockReportStatus: shift.stockReportStatus,
        stockReportsGrouped: this.groupStockReportsByDepartment(shift.stockReports || []),
        aiAnalysis: this.generateShiftAIAnalysis(shift),
        paymentBreakdown: paymentMethods,
        expenses: shiftExpenses
      };
    }));

    return mappedShifts;
  }

  private groupStockReportsByDepartment(reports: any[]) {
    const grouped: Record<string, any[]> = {};
    reports.forEach(sr => {
      const dept = sr.department || 'OTHER';
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push({
        itemName: sr.itemName,
        systemStock: Number(sr.systemStock),
        physicalStock: Number(sr.physicalStock),
        discrepancy: Number(sr.discrepancy),
        lostValue: Number(sr.lostValue || 0),
        note: sr.note
      });
    });
    return grouped;
  }

  private async getShiftPaymentBreakdown(shiftId: number) {
    const transactions = await this.transactionRepository.find({
      where: { shiftId }
    });

    const breakdown: Record<string, number> = { CASH: 0, QRIS: 0, TRANSFER: 0, MEMBER: 0 };
    
    transactions.forEach((tx: any) => {
      if (tx.paymentDetails && Array.isArray(tx.paymentDetails)) {
        tx.paymentDetails.forEach((p: any) => {
          const method = (p.method || 'CASH').toUpperCase();
          const normalized = method === 'MEMBERSHIP' ? 'MEMBER' : method;
          breakdown[normalized] = (breakdown[normalized] || 0) + Number(p.amount);
        });
      } else if (Number(tx.paidAmount) > 0) {
        const method = (tx.paymentMethod || 'CASH').toUpperCase();
        const normalized = method === 'MEMBERSHIP' ? 'MEMBER' : method;
        breakdown[normalized] = (breakdown[normalized] || 0) + Number(tx.paidAmount);
      }
    });

    return breakdown;
  }

  private async getShiftExpenses(shiftId: number, userId: number, start: Date, end: Date) {
    if (!userId) {
      return this.expenseRepository.find({
        where: { shiftId },
        order: { date: 'DESC' }
      });
    }

    return this.expenseRepository.find({
      where: [
        { shiftId },
        { recordedByUserId: userId, date: Between(start, end) }
      ],
      order: { date: 'DESC' }
    });
  }

  private generateShiftAIAnalysis(shift: any) {
    const cashDisc = Number(shift.discrepancy);
    const stockDisc = (shift.stockReports || []).filter((r: any) => Number(r.discrepancy) !== 0).length;
    
    const insights = [];
    let riskLevel = 'LOW';
    let summary = 'Shift berjalan normal dengan integritas data yang baik.';

    if (Math.abs(cashDisc) > 100000) {
      riskLevel = 'HIGH';
      insights.push(`Selisih kas signifikan sebesar ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(cashDisc)}. Periksa log pembatalan transaksi.`);
    } else if (Math.abs(cashDisc) > 0) {
      riskLevel = 'MEDIUM';
      insights.push(`Ditemukan selisih kas minor. Pastikan akurasi pengembalian uang tunai.`);
    }

    if (stockDisc > 3) {
      riskLevel = riskLevel === 'HIGH' ? 'CRITICAL' : 'HIGH';
      insights.push(`Variansi stok tinggi ditemukan pada ${stockDisc} item. Potensi kebocoran inventori terdeteksi.`);
    } else if (stockDisc > 0) {
      insights.push(`Terdapat ${stockDisc} item dengan selisih stok. Harap verifikasi catatan waste.`);
    }

    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      summary = 'Ditemukan anomali signifikan pada shift ini. Diperlukan audit mendalam oleh manajemen.';
    } else if (riskLevel === 'MEDIUM') {
      summary = 'Shift menunjukkan variansi kecil. Perlu perhatian pada prosedur standar kasir.';
    }

    return {
      riskLevel,
      summary,
      insights,
      recommendation: riskLevel !== 'LOW' ? 'Lakukan cross-check dengan CCTV pada jam-jam sibuk.' : 'Pertahankan performa operasional saat ini.'
    };
  }

  async getAuditAIInsights(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (endDate.length <= 10) end.setHours(23, 59, 59, 999);

    const shifts = await this.shiftRepository.find({
      where: { startTime: Between(start, end) },
      relations: ['stockReports']
    });

    if (shifts.length === 0) return null;

    let totalCashDisc = 0;
    let totalStockDisc = 0;
    const itemRisks: Record<string, number> = {};

    shifts.forEach((s: any) => {
      totalCashDisc += Math.abs(Number(s.discrepancy || 0));
      (s.stockReports || []).forEach((r: any) => {
        if (Number(r.discrepancy) !== 0) {
          totalStockDisc++; // Keep as anomaly event count
          itemRisks[r.itemName] = (itemRisks[r.itemName] || 0) + Math.abs(Number(r.discrepancy));
        }
      });
    });

    const integrityScore = Math.max(0, 100 - (totalCashDisc / 200000) - (totalStockDisc * 2));
    const topRisks = Object.entries(itemRisks)
      .sort((a, b) => b[1] - a[1])
      .map(([name, qty]) => ({ name, frequency: Number(qty) }));

    let aiSummary = 'Integritas operasional stabil.';
    if (integrityScore < 70) aiSummary = 'Terdeteksi anomali pola kehilangan aset yang konsisten.';
    else if (integrityScore < 90) aiSummary = 'Operasional berjalan baik dengan variansi minor yang wajar.';

    return {
      integrityScore: Math.round(integrityScore),
      totalCashDiscrepancy: totalCashDisc,
      totalStockDiscrepancy: totalStockDisc,
      topRisks,
      aiSummary,
      recommendations: [
        'Tingkatkan frekuensi audit stok pada item: ' + (topRisks.map(r => r.name).join(', ') || 'Semua Item'),
        'Lakukan evaluasi prosedur serah terima kasir.',
        'Aktifkan notifikasi real-time untuk selisih di atas Rp 50.000.'
      ]
    };
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
    this.eventEmitter.emit('audit.log', saved);
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
    const settings = await this.settingsService.getSettings();
    const [h, m] = (settings.businessDayOffset || '00:00').split(':').map(Number);
    
    const now = new Date();
    const today = new Date(now);
    if (now.getHours() < h) today.setDate(today.getDate() - 1);
    today.setHours(h, m, 0, 0);

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
      relations: [
        'table',
        'cafeTable',
        'payments',
        'orderItems',
        'orderItems.menuItem',
        'createdBy',
        'member',
      ],
    });

    // 2. Fetch Order Items in range (based on createdAt - order time)
    const orderItems = await this.orderItemRepository.find({
      where: {
        createdAt: Between(start, end),
        status: Not(OrderItemStatus.CANCELLED),
      },
      relations: ['menuItem', 'menuItem.productFinance', 'transaction'],
    });

    // 3. Aggregate By Hour
    const hourlyData: Record<
      number,
      { billiard: number; cafe: number; topup: number; taxService: number; rounding: number; count: number }
    > = {};
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { billiard: 0, cafe: 0, topup: 0, taxService: 0, rounding: 0, count: 0 };
    }

    // Helper to get hour in Local Time
    const getLocalHour = (d: Date) => {
      return d.getHours();
    };

    // Billiard & Topup revenue grouped by startTime hour (Local)
    transactions.forEach((tx) => {
      // ONLY COUNT REVENUE FROM NON-UNPAID TRANSACTIONS
      if (tx.status === TransactionStatus.UNPAID) return;

      const hour = getLocalHour(new Date(tx.startTime || tx.createdAt));
      if (tx.type === 'TOPUP') {
        hourlyData[hour].topup += Number(tx.grandTotal || 0);
      } else {
        hourlyData[hour].billiard += Number(tx.billiardTotal || 0);
        hourlyData[hour].taxService += Number(tx.vatAmount || 0) + Number(tx.serviceChargeAmount || 0);
        hourlyData[hour].rounding += Number(tx.roundingAmount || 0);
        hourlyData[hour].cafe += Number(tx.cafeTotal || 0);
      }
      hourlyData[hour].count += 1;
    });

    // Cafe revenue grouped by OrderItem createdAt hour (Local)
    // Note: We need to be careful not to double count cafe revenue already in tx.cafeTotal
    orderItems.forEach((item) => {
      const isActuallyPaid = item.isPaid || (item.transaction && item.transaction.status !== TransactionStatus.UNPAID);
      if (!isActuallyPaid) return;

      const hour = getLocalHour(new Date(item.createdAt));
      
      // If item is linked to a transaction we already processed, 
      // we only add to hourlyData[hour].cafe if it wasn't already added.
      // Actually, the previous logic was better at separating standalone vs billiard-linked.
      
      const txId = item.transaction?.id;
      const isLinkedToProcessedTx = txId && transactions.some(t => t.id === txId);
      
      if (!isLinkedToProcessedTx) {
        hourlyData[hour].cafe += Number(item.quantity) * Number(item.priceAtOrder);
      }
    });

    // 4. Payment Method Totals & Breakdown Accuracy
    const paymentMethods: Record<string, number> = {};
    const paymentCounts: Record<string, number> = {};
    const tableUsage: Record<string, { count: number; duration: number; revenue: number; billiardRevenue: number; cafeRevenue: number; hourlyStats: Record<number, number>; type: 'BILLIARD' | 'CAFE' }> = {};
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
          const isBilliard = !!tx.table;
          const tableName =
            tx.table?.tableName || tx.cafeTable?.tableName || 'Unknown';
          if (!tableUsage[tableName])
            tableUsage[tableName] = { 
              count: 0, 
              duration: 0, 
              revenue: 0, 
              billiardRevenue: 0, 
              cafeRevenue: 0, 
              hourlyStats: {},
              type: isBilliard ? 'BILLIARD' : 'CAFE'
            };
          tableUsage[tableName].count++;
          if (tx.status !== TransactionStatus.UNPAID) {
            tableUsage[tableName].revenue += Number(tx.grandTotal || 0);
            tableUsage[tableName].billiardRevenue += Number((tx as any).billiardTotal || 0);
            tableUsage[tableName].cafeRevenue += Number((tx as any).cafeTotal || 0);
          }

          if (tx.startTime) {
            const hour = new Date(tx.startTime).getHours();
            tableUsage[tableName].hourlyStats[hour] = (tableUsage[tableName].hourlyStats[hour] || 0) + 1;
          }

          if (tx.startTime && tx.updatedAt) {
            const duration = Math.max(
              0,
              (tx.updatedAt.getTime() - tx.startTime.getTime()) / 60000,
            );
            tableUsage[tableName].duration += duration;
            totalOccupancyMinutes += duration;
          }
        }

        // staff attribution
        const staffName = tx.createdBy?.name || 'System';
        staffRevenue[staffName] =
          (staffRevenue[staffName] || 0) + (tx.status !== TransactionStatus.UNPAID ? Number(tx.grandTotal || 0) : 0);
      }
      totalAwardedPoints += tx.status !== TransactionStatus.UNPAID ? Number((tx as any).awardedPoints || 0) : 0;
    });

    // Calculate real cash omzet (exclude MEMBER balance usage — not physical cash)
    let totalOmzetCash = 0;
    let totalVat = 0;
    let totalServiceCharge = 0;
    let totalDiscount = 0;
    let totalRounding = 0;
    let totalMemberUsage = 0;
    let memberRevenue = 0;
    let guestRevenue = 0;

    transactions.forEach((tx) => {
      if (tx.status === TransactionStatus.UNPAID) return;
      const gtotal = Number(tx.grandTotal || 0);
      if (tx.memberId) {
        memberRevenue += gtotal;
      } else {
        guestRevenue += gtotal;
      }
    });

    // Recalculate based on payment distribution...

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
      if (tx.type !== 'TOPUP' && tx.status !== TransactionStatus.UNPAID) {
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
        total: data.billiard + data.cafe + data.topup + data.taxService + data.rounding,
      })),
      paymentMethods,
      summary: {
        totalBilliard: transactions
          .filter((tx) => tx.type !== 'TOPUP' && tx.status !== TransactionStatus.UNPAID && tx.table?.stationType !== 'PLAYSTATION')
          .reduce((s, t) => s + Number(t.billiardTotal || 0), 0),
        totalPlaystation: transactions
          .filter((tx) => tx.type !== 'TOPUP' && tx.status !== TransactionStatus.UNPAID && tx.table?.stationType === 'PLAYSTATION')
          .reduce((s, t) => s + Number(t.billiardTotal || 0), 0),
        totalCafe: orderItems
          .filter(i => i.isPaid || (i.transaction && i.transaction.status !== TransactionStatus.UNPAID))
          .reduce(
            (s, i) => s + Number(i.quantity) * Number(i.priceAtOrder),
            0,
          ),
        totalTopUp: transactions
          .filter((tx) => tx.type === 'TOPUP' && tx.status !== TransactionStatus.UNPAID)
          .reduce((s, t) => s + Number(t.grandTotal || 0), 0),
        taxServiceRevenue: totalTaxService,
        totalOmzet: totalOmzetCash, // Only real cash income (excludes MEMBER balance usage)
        grossRevenue: transactions
          .filter((tx) => tx.status !== TransactionStatus.UNPAID)
          .reduce(
            (s, t) => s + Number(t.grandTotal || 0),
            0,
          ), // Total Sales Volume
        totalVat, // PPN collected
        totalServiceCharge, // Service charge collected
        totalDiscount, // Promo/discount deductions
        totalRounding, // Rounding adjustments
        totalMemberUsage, // Member balance used (non-cash)
        totalAwardedPoints, // Total loyalty points gifted
        transactionCount: transactions.filter(tx => tx.status !== TransactionStatus.UNPAID).length,
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
        tableUsage: Object.entries(tableUsage).reduce((acc, [name, stats]) => {
          let peakHour = 0;
          let maxSessions = 0;
          Object.entries(stats.hourlyStats).forEach(([hour, sessions]) => {
            if (sessions > maxSessions) {
              maxSessions = sessions;
              peakHour = Number(hour);
            }
          });
          
          acc[name] = {
            ...stats,
            peakHour,
            avgSessionMinutes: stats.count > 0 ? stats.duration / stats.count : 0,
          };
          return acc;
        }, {} as any),
        totalOccupancyMinutes,
        memberRevenue,
        currentBusinessDayId:
          transactions.length > 0 ? transactions[0].businessDayId : null,
        transactions: transactions
          .filter((tx) => tx.status !== TransactionStatus.PAID)
          .map(tx => ({
            id: tx.id,
            invoiceNumber: tx.invoiceNumber,
            customerName: tx.customerName,
            customerPhone: tx.customerPhone,
            status: tx.status,
            grandTotal: Number(tx.grandTotal || 0),
            paidAmount: Number(tx.paidAmount || 0),
            createdAt: tx.createdAt,
            tableName: tx.table?.tableName || tx.cafeTable?.tableName || 'Tanpa Meja',
            durationMinutes: tx.startTime && tx.updatedAt ? Math.max(0, Math.round((tx.updatedAt.getTime() - tx.startTime.getTime()) / 60000)) : 0,
            orders: (() => {
              const items = (tx.orderItems || []).map(oi => ({
                name: oi.menuItem?.name || oi.customName || 'Item',
                qty: Number(oi.quantity),
                price: Number(oi.priceAtOrder)
              }));
              
              if (Array.isArray(tx.billingDetails) && tx.billingDetails.length > 0) {
                 tx.billingDetails.forEach(seg => {
                   const isExt = seg.isExtension ? '[EXT] ' : '';
                   const durLabel = typeof seg.duration === 'string' ? seg.duration : (seg.duration > 0 ? `${seg.duration}m` : '');
                   items.unshift({
                     name: `${isExt}${seg.title || 'Billiard'} (${durLabel})`,
                     qty: 1,
                     price: Number(seg.subtotal || 0)
                   });
                 });
              } else if (Number(tx.billiardTotal) > 0) {
                 const d = tx.startTime && tx.updatedAt ? Math.max(0, Math.round((tx.updatedAt.getTime() - tx.startTime.getTime()) / 60000)) : 0;
                 items.unshift({
                   name: `Billiard (${d}m)`,
                   qty: 1,
                   price: Number(tx.billiardTotal)
                 });
              }
              return items;
            })()
          })),
        // Phase 5 Additions
        staffPerformance: Object.entries(staffRevenue).map(
          ([name, revenue]) => {
            const staffShiftDurations = transactions
              .filter(
                (tx) =>
                  (tx.createdBy?.name || 'System') === name &&
                  tx.startTime &&
                  tx.updatedAt,
              )
              .map(
                (tx) =>
                  (tx.updatedAt.getTime() - tx.startTime.getTime()) / 3600000,
              ); // in hours
            const totalHours =
              staffShiftDurations.length > 0
                ? staffShiftDurations.reduce((a, b) => a + b, 0)
                : 1;

            // Upsell Ratio: (Cafe Revenue / Billiard Revenue) for this staff
            const staffBilliard = transactions
              .filter(
                (tx) =>
                  (tx.createdBy?.name || 'System') === name &&
                  tx.type !== 'TOPUP' &&
                  tx.status !== TransactionStatus.UNPAID,
              )
              .reduce((s, t) => s + Number(t.billiardTotal || 0), 0);
            const staffTransactions = transactions.filter(
              (tx) => (tx.createdBy?.name || 'System') === name && tx.status !== TransactionStatus.UNPAID,
            );
            const staffCafeItems = orderItems.filter((oi) =>
              staffTransactions.some((tx) =>
                tx.orderItems?.some((ti) => ti.id === oi.id),
              ),
            );
            const staffCafe = staffCafeItems.reduce(
              (s, i) => s + Number(i.quantity) * Number(i.priceAtOrder),
              0,
            );

            const stabilizedRph = totalHours > 0.2 
              ? (revenue / totalHours) 
              : (revenue / Math.max(staffTransactions.length, 1));

            return {
              name,
              revenue,
              rph: stabilizedRph,
              upsellRatio: staffBilliard > 0 ? staffCafe / staffBilliard : 0,
              txCount: staffTransactions.length,
            };
          },
        ),
      },
      hourlyForecast: (await this.aiService.predictDailyTraffic())
        .hourlyTraffic,
      churnRiskMembers: await (async () => {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const members = await this.transactionRepository
          .createQueryBuilder('t')
          .innerJoinAndSelect('t.member', 'm')
          .select('m.id', 'id')
          .addSelect('m.name', 'name')
          .addSelect('m.phone', 'phone')
          .addSelect('MAX(t.createdAt)', 'lastVisit')
          .groupBy('m.id')
          .addGroupBy('m.name')
          .addGroupBy('m.phone')
          .having('MAX(t.createdAt) < :date', { date: fourteenDaysAgo })
          .orderBy('MAX(t.createdAt)', 'DESC')
          .limit(5)
          .getRawMany();
        return members;
      })(),
    };
  }

  async getStoreStockReport(): Promise<any[]> {
    const storeItems = (await this.menuItemRepository.find({
      where: { category: { name: 'STORE' } },
      relations: ['category'],
    })) as any[];

    const ingredients = await this.ingredientRepository.find();
    const reportMap = new Map<string, any>();

    // 1. Process Ingredients first (Primary source for raw materials)
    for (const ing of ingredients) {
      const usageData = await this.orderItemRepository
        .createQueryBuilder('oi')
        .leftJoin('oi.menuItem', 'mi')
        .leftJoin('mi.recipes', 'rec')
        .where('rec.ingredientId = :ingId', { ingId: ing.id })
        .andWhere('oi.status != :cancelled', {
          cancelled: OrderItemStatus.CANCELLED,
        })
        .select('SUM(oi.quantity * rec.quantity)', 'estimatedUsage')
        .getRawOne();

      const sumData = await this.ingredientRepository.manager
        .createQueryBuilder('shift_stock_reports', 'ssr')
        .select('SUM(ssr.lostValue)', 'totalLostValue')
        .where('ssr.ingredientId = :ingId', { ingId: ing.id })
        .getRawOne();

      const latestData = await this.ingredientRepository.manager
        .createQueryBuilder('shift_stock_reports', 'ssr')
        .select('ssr.discrepancy', 'latestDiscrepancy')
        .addSelect('ssr.createdAt', 'lastAuditAt')
        .where('ssr.ingredientId = :ingId', { ingId: ing.id })
        .orderBy('ssr.createdAt', 'DESC')
        .getRawOne();

      const netDiscrepancy = Number(latestData?.latestDiscrepancy || 0);
      const totalLostValue = Number(sumData?.totalLostValue || 0);
      const lastAuditAt = latestData?.lastAuditAt || null;

      const totalUsage = Number(usageData.estimatedUsage || 0);
      const currentStock = Number(ing.stockQuantity || 0);
      const totalStock = currentStock + totalUsage;

      reportMap.set(ing.name.toLowerCase(), {
        id: `ing_${ing.id}`,
        originalId: ing.id,
        type: 'ingredient',
        name: ing.name,
        sku: ing.sku,
        category: ing.category || 'Raw Material',
        price: Number(ing.costPrice),
        totalStock,
        totalSold: totalUsage,
        currentStock,
        totalRevenue: 0,
        minStockLevel: Number(ing.minStockLevel || 0),
        isLowStock: currentStock <= Number(ing.minStockLevel || 0),
        unit: ing.unit || 'Unit',
        totalDiscrepancy: Math.abs(netDiscrepancy),
        isSurplus: netDiscrepancy > 0,
        totalLostValue,
        isHighValue: !!ing.isHighValue,
        auditFrequency: ing.auditFrequency || 'SHIFT',
        lastAuditAt,
      });
    }

    // 2. Process Store Menu Items (Merge or Add)
    for (const item of storeItems) {
      const nameKey = item.name.toLowerCase();

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

      const sumData = await this.menuItemRepository.manager
        .createQueryBuilder('shift_stock_reports', 'ssr')
        .select('SUM(ssr.lostValue)', 'totalLostValue')
        .where('ssr.menuItemId = :itemId', { itemId: item.id })
        .getRawOne();

      const latestData = await this.menuItemRepository.manager
        .createQueryBuilder('shift_stock_reports', 'ssr')
        .select('ssr.discrepancy', 'latestDiscrepancy')
        .addSelect('ssr.createdAt', 'lastAuditAt')
        .where('ssr.menuItemId = :itemId', { itemId: item.id })
        .orderBy('ssr.createdAt', 'DESC')
        .getRawOne();

      const netDiscrepancy = Number(latestData?.latestDiscrepancy || 0);
      const totalLostValue = Number(sumData?.totalLostValue || 0);
      const lastAuditAt = latestData?.lastAuditAt || null;

      const totalSold = Number(salesData.totalSold || 0);
      const totalRevenue = Number(salesData.totalRevenue || 0);

      if (reportMap.has(nameKey)) {
        // Merge with existing Ingredient entry
        const existing = reportMap.get(nameKey);
        existing.totalSold += totalSold;
        existing.totalRevenue += totalRevenue;
        existing.totalStock += totalSold;
        
        // Merge discrepancies: Use the most recent audit instead of adding them together
        if (lastAuditAt && (!existing.lastAuditAt || lastAuditAt > existing.lastAuditAt)) {
          existing.lastAuditAt = lastAuditAt;
          existing.totalDiscrepancy = Math.abs(netDiscrepancy);
          existing.isSurplus = netDiscrepancy > 0;
        }
        
        existing.totalLostValue += totalLostValue;
      } else {
        // Add new Menu Item entry
        const currentStock = Number(item.stockQuantity || 0);
        const totalStock = currentStock + totalSold;

        reportMap.set(nameKey, {
          id: `menu_${item.id}`,
          originalId: item.id,
          type: 'menu',
          name: item.name,
          sku: item.sku,
          category: item.category?.name || 'STORE',
          price: Number(item.price),
          totalStock,
          totalSold,
          currentStock,
          totalRevenue,
          minStockLevel: Number(item.minStockLevel || 0),
          isLowStock: currentStock <= Number(item.minStockLevel || 0),
          unit: 'Pcs',
          totalDiscrepancy: Math.abs(netDiscrepancy),
          isSurplus: netDiscrepancy > 0,
          totalLostValue,
          isHighValue: !!item.isHighValue,
          auditFrequency: item.auditFrequency || 'SHIFT',
          lastAuditAt,
        });
      }
    }

    return Array.from(reportMap.values());
  }

  async generateMissionReportPdf(businessDayId: number): Promise<Buffer> {
    this.logger.log(
      `Generating AI Mission Report PDF for BD: ${businessDayId}`,
    );

    const missionReport =
      await this.aiService.getDailyMissionReport(businessDayId);
    const coachingData =
      await this.aiService.getStaffCoachingTips(businessDayId);
    const settings = await this.settingsService.getSettings();

    const templatePath = path.join(
      __dirname,
      'templates',
      'ai-mission-report.hbs',
    );
    if (!fs.existsSync(templatePath)) {
      throw new Error(
        `AI Mission Report template not found at ${templatePath}`,
      );
    }

    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);

    const fmt = (n: number) =>
      `Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`;
    const fDate = (d: any) =>
      d
        ? new Date(d).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })
        : '—';

    const context = {
      ...missionReport,
      tips: coachingData.tips,
      businessDate: fDate(new Date()), // Use current date for report printing context
      printTime: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      reportId: `AI-${businessDayId}-${Date.now().toString(36).toUpperCase()}`,
      fmt,
    };

    const html = template(context);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
  async generateDailyReportPdf(
    startDate?: Date,
    endDate?: Date,
  ): Promise<Buffer> {
    const startStr = startDate
      ? startDate.toLocaleString('id-ID', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
    const endStr = endDate
      ? endDate.toLocaleString('id-ID', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
    const rangeLabel =
      startDate && endDate
        ? `${startStr} — ${endStr}`
        : 'Laporan Harian (Business Day)';

    this.logger.log(
      `Generating Premium Business Day PDF... Range: ${rangeLabel}`,
    );

    let reportData: any;
    try {
      const activeBd = await this.shiftService.getOrCreateActiveBusinessDay();
      reportData = await this.shiftService.getBusinessDayReport(activeBd.id);
    } catch (e) {
      this.logger.error(
        `Failed to retrieve detailed report data: ${e.message}`,
      );
      throw e;
    }

    const bd = reportData.businessDay || {};
    const summary = reportData.summary || {};
    const shifts = reportData.shifts || [];
    const txs = reportData.transactions || [];
    const settings = await this.settingsService.getSettings();

    const venue = settings.businessName || 'VOC BILLIARD';
    const printAt = new Date();

    const fmt = (n: number) =>
      `Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`;
    const fDate = (d: any) =>
      d
        ? new Date(d).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })
        : '—';
    const fTime = (d: any) =>
      d
        ? new Date(d).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—';

    // Calculation for waterfall
    const grossBilliard = summary.billiardRevenue || 0;
    const grossPlaystation = summary.playstationRevenue || 0;
    const grossCafe = summary.cafeRevenue || 0;
    const grossRevenue = grossBilliard + grossPlaystation + grossCafe;
    const netPenjualan =
      grossRevenue -
      (summary.totalDiscount || 0) +
      (summary.totalVat || 0) +
      (summary.totalService || 0) +
      (summary.totalRounding || 0);

    // Global Deep Dives
    const globalPackages: Record<string, { count: number; revenue: number }> =
      {};
    const globalItems: Record<string, { qty: number }> = {};

    const allShifts = reportData.allShifts || shifts;

    allShifts.forEach((s: any) => {
      (s.topPackages || []).forEach((p: any) => {
        if (!globalPackages[p.name])
          globalPackages[p.name] = { count: 0, revenue: 0 };
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
      grossPlaystation,
      grossCafe,
      totalDiscount: summary.totalDiscount,
      totalService: summary.totalService,
      totalVat: summary.totalVat,
      totalRounding: summary.totalRounding,
      totalExpenses: summary.totalExpenses || 0,
      netProfit: summary.netProfit || netPenjualan,
      netPenjualan,

      totalTopUp: summary.totalTopUp || 0,
      sortedPackages: sortedPackages.slice(0, 5),
      sortedItems: sortedItems
        .slice(0, 5)
        .map((it) => ({ name: it.name, qty: it.qty })),
      shifts: shifts.map((s: any) => ({
        userName: s.userName,
        startTime: fTime(s.startTime),
        endTime: s.endTime ? fTime(s.endTime) : null,
        revenue: fmt(s.totalRevenue || 0),
        discrepancy: s.discrepancy !== 0 ? fmt(s.discrepancy) : '0',
        isDiscrepancy: s.discrepancy !== 0,
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
            const durStr =
              mins % 60 === 0 ? `${mins / 60} Jam (${mins}m)` : `${mins}m`;
            const timeRange =
              seg.startTimeFormatted && seg.endTimeFormatted
                ? ` (${(seg.startTimeFormatted || '').replace(/:/g, '.')}-${(seg.endTimeFormatted || '').replace(/:/g, '.')})`
                : '';
            itemNames.push(
              `${seg.isExtension ? 'Extend: ' : ''}${seg.title || 'Table'} ${durStr}${timeRange}`,
            );
          });
        }

        return {
          invoiceNumber: t.invoiceNumber,
          time: fTime(t.createdAt),
          tableNumber: t.table?.tableName || t.cafeTable?.tableName || 'POS',
          customerName: t.customerName || 'Walk-in',
          items: itemNames.join(', '),
          paymentMethod: t.paymentMethod || 'CASH',
          amount: fmt(t.grandTotal),
        };
      }),
      fmt: (n: number) =>
        `Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`,
    };

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    try {
      const page = await browser.newPage();

      const html = template(context, {
        helpers: {
          fmt: (n: any) =>
            `Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`,
        },
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
        margin: { top: '25mm', bottom: '20mm', left: '15mm', right: '15mm' },
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

  async generateDashboardExecutivePdf(
    startDate: Date,
    endDate: Date,
  ): Promise<Buffer> {
    const startStr = startDate.toLocaleString('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const rangeLabel = startStr;

    this.logger.log(
      `Performing Extreme Premium PDF Redesign... Range: ${rangeLabel}`,
    );

    // 1. Data Aggregation
    const detailed = await this.getDetailedRevenueReport(startDate, endDate);
    const perf = await this.getItemsPerformance();
    const inventory = await this.getInventoryHealth();
    const financeSummary = await this.financeService.getExpenseSummary(
      startDate.toISOString(),
      endDate.toISOString(),
    );
    const settings = await this.settingsService.getSettings();

    const venue = settings.businessName || 'VOC BILLIARD';
    const fmt = (n: number) =>
      `Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`;
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
    const dailySum = detailed.summary;
    const grossTotal = Number(dailySum?.grossRevenue || 0);
    const totalTax = Number(dailySum?.totalVat || 0);
    const totalService = Number(dailySum?.totalServiceCharge || 0);
    const totalDiscount = Number(dailySum?.totalDiscount || 0);
    const totalRounding = Number(dailySum?.totalRounding || 0);
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
    const maxHourly = Math.max(...hourly.map((h) => h.total), 1);

    // 2. Prepare Template Data
    const templatePath = path.join(
      __dirname,
      'templates',
      'dashboard-executive.hbs',
    );
    if (!fs.existsSync(templatePath)) {
      this.logger.error(`Template not found at ${templatePath}`);
      throw new Error(`Template not found at ${templatePath}`);
    }
    const source = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(source);

    const hourlyData = (detailed.hourly || []).map((h) => ({
      hour: String(h.hour).padStart(2, '0'),
      value: fmt(h.total),
      width: h.total === 0 ? 0 : (h.total / maxHourly) * 100,
      isNight: h.hour > 17 || h.hour < 6,
    }));

    const topItems = (perf.topItems || []).slice(0, 10).map((it, idx) => ({
      rank: idx + 1,
      name: it.name,
      category: it.category,
      qty: it.totalQty,
      revenue: fmt(it.totalRevenue),
    }));

    const criticalStock = inventory.slice(0, 8).map((i) => ({
      name: i.name,
      stock: i.stockQuantity,
      unit: i.unit,
    }));
    const execSum = detailed.summary;

    const revenueStreams = [
      {
        label: 'Billiard / Session',
        value: fmt(execSum?.totalBilliard),
        percentage: pfmt(((execSum?.totalBilliard || 0) / grossTotal) * 100),
      },
      {
        label: 'PlayStation / Session',
        value: fmt(execSum?.totalPlaystation),
        percentage: pfmt(((execSum?.totalPlaystation || 0) / grossTotal) * 100),
      },
      {
        label: 'Cafe / F&B',
        value: fmt(execSum?.totalCafe),
        percentage: pfmt(((execSum?.totalCafe || 0) / grossTotal) * 100),
      },
      {
        label: 'Top-up Member',
        value: fmt(execSum?.totalTopUp),
        percentage: pfmt(((execSum?.totalTopUp || 0) / grossTotal) * 100),
      },
      {
        label: 'Service Charge (SC)',
        value: fmt(totalService),
        percentage: pfmt((totalService / grossTotal) * 100),
      },
      {
        label: 'PPN / VAT',
        value: fmt(totalTax),
        percentage: pfmt((totalTax / grossTotal) * 100),
      },
      {
        label: 'Pembulatan',
        value: fmt(totalRounding),
        percentage: pfmt((totalRounding / grossTotal) * 100),
      },
    ];

    const paymentMethodsArr = Object.entries(detailed.paymentMethods).map(
      ([method, amount]) => ({
        method,
        amount: fmt(amount),
        count: (execSum?.paymentCounts || {})[method] || 0,
      }),
    );

    const context = {
      rangeLabel,
      netProfit,
      grossTotal,
      transactionCount: execSum?.transactionCount || 0,
      totalOmzet: execSum?.totalOmzet,
      unpaidAmount: execSum?.unpaidAmount,
      inventoryCount: inventory.length,
      revenueStreams,
      totalMemberUsage: execSum?.totalMemberUsage || 0,
      paymentMethods: paymentMethodsArr,
      totalTax,
      totalService,
      totalTaxService: totalTax + totalService,
      totalRounding,
      totalDiscount,
      totalCommissions,
      totalPenalties,
      totalSalaryAccrual,
      totalAwardedPoints: execSum?.totalAwardedPoints || 0,
      totalExpenses,
      hourlyData,
      topItems,
      criticalStock,
      staffPerformance:
        (execSum as any).staffPerformance
          ?.map((s: any) => ({
            name: s.name,
            revenue: fmt(s.revenue),
            percentage: pfmt((s.revenue / grossTotal) * 100),
          }))
          .slice(0, 5) || [],
      tableOccupancy: Object.entries((execSum as any).tableUsage || {})
        .map(([name, data]: [string, any]) => ({
          name,
          minutes: Math.round(data.duration),
          sessions: data.count,
        }))
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 8),
      avgOccupancyMinutes: Math.round(
        (execSum as any).avgOccupancyMinutes || 0,
      ),
      reportId: `REP-${Date.now()}`,
      financeSummaryByCategory: Object.entries(
        financeSummary.byCategory || {},
      ).map(([c, a]) => ({ c, a })),
      netRevenueCash: grossTotal - totalDiscount,
      avgTransactionValue:
        grossTotal > 0 ? grossTotal / (execSum?.transactionCount || 1) : 0,
    };

    // 3. Render HTML to PDF via Puppeteer
    let browser;
    try {
      this.logger.log('Launching Puppeteer for high-fidelity PDF rendering...');
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });

      const page = await browser.newPage();

      const html = template(context, {
        helpers: {
          fmt: (n: any) =>
            `Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`,
        },
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
        margin: { top: '25mm', bottom: '20mm', left: '15mm', right: '15mm' },
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
    this.logger.log(
      `Request to send Executive Dashboard to WhatsApp: ${phone}`,
    );
    try {
      const pdfBuffer = await this.generateDashboardExecutivePdf(
        startDate,
        endDate,
      );

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

  async getStaffPerformanceLeaderboard(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const report = await this.getDetailedRevenueReport(startDate, new Date());
    const staffStats = report.summary.staffPerformance;

    const ranked = staffStats.sort((a, b) => b.revenue - a.revenue);

    return ranked.map((s, index) => {
      let badge = 'Standard';
      if (index === 0) badge = 'Revenue King';
      else if (s.upsellRatio > 0.4) badge = 'Upsell Master';
      else if (s.rph > 500000) badge = 'Efficiency Pro';

      return {
        ...s,
        rank: index + 1,
        badge,
        performanceLevel:
          s.rph > 300000 ? 'High' : s.rph > 150000 ? 'Steady' : 'Developing',
      };
    });
  }

  async sendReportToWhatsApp(phone: string, startDate?: Date, endDate?: Date) {
    this.logger.log(`Request to send report to WhatsApp: ${phone}`);
    try {
      const pdfBuffer = await this.generateDailyReportPdf(startDate, endDate);
      this.logger.log(
        `PDF Buffer ready (${pdfBuffer.length} bytes). Sending to WhatsApp...`,
      );

      const startStr = startDate
        ? startDate.toLocaleDateString('id-ID')
        : new Date().toLocaleDateString('id-ID');
      const endStr = endDate
        ? ` s/d ${endDate.toLocaleDateString('id-ID')}`
        : '';

      const result = await this.whatsappService.sendDocument(
        phone,
        pdfBuffer,
        `Laporan_VOC_${new Date().toISOString().split('T')[0]}.pdf`,
        `Halo Owner, berikut adalah Laporan Pendapatan VOC BILLIARD tanggal ${startStr}${endStr}.`,
      );

      if (!result) {
        this.logger.error(
          'WhatsApp Gateway returned null result (Disconnected?)',
        );
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
      this.logger.log(
        `Starting automated daily report delivery to ${settings.ownerPhone}`,
      );
      try {
        await this.sendReportToWhatsApp(settings.ownerPhone);
      } catch (e) {
        this.logger.error('Auto report delivery failed');
      }
    }
  }
}
