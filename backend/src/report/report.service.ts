import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between } from 'typeorm';
import { Shift } from '../finance/entities/shift.entity';
import { Transaction, TransactionStatus } from '../transaction/entities/transaction.entity';
import { Ingredient } from '../inventory/entities/ingredient.entity';
import { MenuItem } from '../cafe/entities/menu-item.entity';
import { OrderItem, OrderItemStatus } from '../cafe/entities/order-item.entity';
import { Expense } from '../finance/entities/expense.entity';
import type { SettingsService } from '../settings/settings.service';
import { AuditLog } from './entities/audit-log.entity';
import { MqttService } from '../mqtt/mqtt.service';
import { BilliardGateway } from '../socket/billiard.gateway';

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
        @Inject(forwardRef(() => { const { SettingsService } = require('../settings/settings.service'); return SettingsService; }))
        private readonly settingsService: SettingsService,
        private readonly mqttService: MqttService,
        private readonly billiardGateway: BilliardGateway,
    ) { }


    async getDailySummary() {

        const settings = await this.settingsService.getSettings();
        const [hours, minutes] = (settings.businessDayOffset || '00:00').split(':').map(Number);

        // Get current moment in System Local Time
        const now = new Date();

        // Determine the "Business Day" date in Local Time
        // If it's 2 AM and offset is 4 AM, the effective business day is still the previous calendar day.
        const effectiveDay = new Date(now.getTime() - (hours * 3600000 + minutes * 60000));
        effectiveDay.setHours(0, 0, 0, 0);

        // The business day for 'effectiveDay' starts at 'hours:minutes' Local Time
        const businessDayStart = new Date(effectiveDay);
        businessDayStart.setHours(hours, minutes, 0, 0);

        const transactions = await this.transactionRepository.find({
            where: { createdAt: MoreThanOrEqual(businessDayStart) },
        });

        const summary = {
            totalOmzet: 0,
            billiardOmzet: 0,
            cafeOmzet: 0,
            topUpOmzet: 0,
            transactionCount: transactions.length,
            unpaidAmount: 0,
            paymentMethods: {} as Record<string, number>,
        };

        transactions.forEach((tx) => {
            summary.totalOmzet += Number(tx.grandTotal);
            if (tx.type === 'TOPUP') {
                summary.topUpOmzet += Number(tx.grandTotal);
            } else {
                summary.billiardOmzet += Number(tx.billiardTotal);
                summary.cafeOmzet += Number(tx.cafeTotal);
            }

            if (tx.status !== TransactionStatus.PAID) {
                summary.unpaidAmount += (Number(tx.grandTotal) - Number(tx.paidAmount));
            } else {
                // Parse payment details if available, otherwise fallback to simple method check
                if (Array.isArray(tx.paymentDetails) && tx.paymentDetails.length > 0) {
                    tx.paymentDetails.forEach((detail: any) => {
                        const method = detail.method?.toUpperCase() || 'UNKNOWN';
                        summary.paymentMethods[method] = (summary.paymentMethods[method] || 0) + Number(detail.amount);
                    });
                } else {
                    // Fallback for older transactions
                    // Note: This matches the previous logic, but ideally we should migrate data
                    const method = 'CASH';
                    const paid = Number(tx.paidAmount);
                    if (paid > 0) {
                        summary.paymentMethods[method] = (summary.paymentMethods[method] || 0) + paid;
                    }
                }
            }
        });

        return summary;
    }

    async getInventoryHealth() {
        const ingredients = await this.ingredientRepository.find();

        return ingredients.filter(ing => {
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

        return results.map(r => ({
            id: Number(r.menuItemId),
            name: r.name,
            totalSales: Number(r.totalQuantity)
        }));
    }

    async getItemsPerformance() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // All menu items with their sales in last 30 days
        const allItems = await this.menuItemRepository.find({ where: { isActive: true }, relations: ['category'] });

        const salesData = await this.orderItemRepository
            .createQueryBuilder('oi')
            .select('oi.menuItemId', 'menuItemId')
            .addSelect('SUM(oi.quantity)', 'totalQuantity')
            .addSelect('SUM(oi.quantity * oi.priceAtOrder)', 'totalRevenue')
            .where('oi.status = :status', { status: OrderItemStatus.DONE })
            .andWhere('oi.createdAt >= :date', { date: thirtyDaysAgo })
            .groupBy('oi.menuItemId')
            .getRawMany();

        const salesMap = new Map(salesData.map(r => [
            Number(r.menuItemId),
            { qty: Number(r.totalQuantity), revenue: Number(r.totalRevenue) }
        ]));

        const ranked = allItems.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category?.name || '—',
            price: Number(item.price),
            totalQty: salesMap.get(item.id)?.qty || 0,
            totalRevenue: salesMap.get(item.id)?.revenue || 0,
        })).sort((a, b) => b.totalQty - a.totalQty);

        const sold = ranked.filter(i => i.totalQty > 0);
        const unsold = ranked.filter(i => i.totalQty === 0);

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
        const existingActive = await this.shiftRepository.findOne({ where: { isActive: true } });
        if (existingActive) throw new Error('A shift is already active');

        const shift = this.shiftRepository.create({
            startedBy,
            cashStart: openingCash,
            isActive: true,
        });

        return this.shiftRepository.save(shift);
    }

    async closeShift(id: number, endedBy: string, closingCash: number, remarks?: string) {
        const shift = await this.shiftRepository.findOne({ where: { id, isActive: true } });
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
        const totalSales = transactions.reduce((sum, tx) => sum + Number(tx.paidAmount), 0);

        // 2. Calculate Expenses (OUT)
        const expenses = await this.expenseRepository.find({
            where: { date: MoreThanOrEqual(shift.startTime) },
        });
        const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

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

    async logAction(action: string, user: string, details?: string, tableId?: number, invoiceNumber?: string) {
        const log = this.auditRepository.create({
            action,
            user,
            details,
            tableId,
            invoiceNumber
        });
        const saved = await this.auditRepository.save(log);
        this.mqttService.broadcastAuditUpdate(saved);
        this.billiardGateway.broadcastAuditUpdate(saved);
        return saved;
    }

    async getAuditLogs(filters: {
        action?: string,
        user?: string,
        startDate?: string,
        endDate?: string,
        page?: number,
        limit?: number
    } = {}) {
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
                end: new Date(endDate)
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
            totalPages: Math.ceil(total / limit)
        };
    }

    async getAuditStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalToday = await this.auditRepository.count({
            where: { createdAt: MoreThanOrEqual(today) }
        });

        const criticalActions = [
            'CANCEL_ORDER',
            'CANCEL_REQUESTED',
            'CANCEL_CONFIRMED',
            'DELETE_ITEM',
            'VOID_TRANSACTION',
            'STOCK_ADJUSTMENT',
            'PRICE_CHANGE',
            'BILLIARD_PRICE_OVERRIDE'
        ];
        const criticalToday = await this.auditRepository.createQueryBuilder('log')
            .where('log.createdAt >= :today', { today })
            .andWhere('log.action IN (:...actions)', { actions: criticalActions })
            .getCount();

        const topUserRaw = await this.auditRepository.createQueryBuilder('log')
            .select('log.user', 'user')
            .addSelect('COUNT(log.id)', 'count')
            .where('log.createdAt >= :today', { today })
            .groupBy('log.user')
            .orderBy('count', 'DESC')
            .limit(1)
            .getRawOne();

        const actionDistribution = await this.auditRepository.createQueryBuilder('log')
            .select('log.action', 'action')
            .addSelect('COUNT(log.id)', 'count')
            .where('log.createdAt >= :today', { today })
            .groupBy('log.action')
            .getRawMany();

        return {
            totalToday,
            criticalToday,
            topUser: topUserRaw || { user: 'None', count: 0 },
            distribution: actionDistribution.map(d => ({
                action: d.action,
                count: Number(d.count)
            }))
        };
    }

    async getFullTransactions(limit: number = 300) {
        return this.transactionRepository.find({
            where: { status: TransactionStatus.PAID },
            relations: ['table', 'cafeTable', 'payments', 'orderItems', 'orderItems.menuItem', 'orderItems.menuItem.category'],
            order: { updatedAt: 'DESC' },
            take: limit
        });
    }

    async getSettings() {
        return this.settingsService.getSettings();
    }

    async getDetailedRevenueReport(start: Date, end: Date) {
        // 1. Fetch Transactions in range (based on createdAt for full coverage)
        const transactions = await this.transactionRepository.find({
            where: {
                createdAt: Between(start, end)
            },
            relations: ['table', 'cafeTable'],
        });

        // 2. Fetch Order Items in range (based on createdAt - order time)
        const orderItems = await this.orderItemRepository.find({
            where: {
                createdAt: Between(start, end),
                status: OrderItemStatus.DONE
            },
            relations: ['menuItem'],
        });

        // 3. Aggregate By Hour
        const hourlyData: Record<number, { billiard: number, cafe: number, topup: number, count: number }> = {};
        for (let i = 0; i < 24; i++) {
            hourlyData[i] = { billiard: 0, cafe: 0, topup: 0, count: 0 };
        }

        // Helper to get hour in Local Time
        const getLocalHour = (d: Date) => {
            return d.getHours();
        };

        // Billiard & Topup revenue grouped by startTime hour (Local)
        transactions.forEach(tx => {
            const hour = getLocalHour(new Date(tx.startTime || tx.createdAt));
            if (tx.type === 'TOPUP') {
                hourlyData[hour].topup += Number(tx.grandTotal || 0);
            } else {
                hourlyData[hour].billiard += Number(tx.billiardTotal || 0);
            }
            hourlyData[hour].count += 1;
        });

        // Cafe revenue grouped by OrderItem createdAt hour (Local)
        orderItems.forEach(item => {
            const hour = getLocalHour(new Date(item.createdAt));
            hourlyData[hour].cafe += Number(item.quantity) * Number(item.priceAtOrder);
        });

        // 4. Payment Method Totals
        const paymentMethods: Record<string, number> = {};
        transactions.forEach(tx => {
            if (tx.status === TransactionStatus.PAID) {
                if (Array.isArray(tx.paymentDetails)) {
                    tx.paymentDetails.forEach((p: any) => {
                        const m = p.method?.toUpperCase() || 'UNKNOWN';
                        paymentMethods[m] = (paymentMethods[m] || 0) + Number(p.amount);
                    });
                } else if (tx.paidAmount > 0) {
                    paymentMethods['CASH'] = (paymentMethods['CASH'] || 0) + Number(tx.paidAmount);
                }
            }
        });

        return {
            startTime: start,
            endTime: end,
            hourly: Object.entries(hourlyData).map(([hour, data]) => ({
                hour: Number(hour),
                ...data,
                total: data.billiard + data.cafe + data.topup
            })),
            paymentMethods,
            summary: {
                totalBilliard: transactions.filter(tx => tx.type !== 'TOPUP').reduce((s, t) => s + Number(t.billiardTotal || 0), 0),
                totalCafe: orderItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.priceAtOrder)), 0),
                totalTopUp: transactions.filter(tx => tx.type === 'TOPUP').reduce((s, t) => s + Number(t.grandTotal || 0), 0),
                totalOmzet: transactions.reduce((s, t) => s + Number(t.grandTotal || 0), 0),
                transactionCount: transactions.length
            }
        };
    }

    async getStoreStockReport(): Promise<any[]> {
        const storeItems = await this.menuItemRepository.find({
            where: { category: { name: 'STORE' } },
            relations: ['category']
        }) as any[];

        const reportData = await Promise.all(storeItems.map(async (item) => {
            const salesData = await this.orderItemRepository
                .createQueryBuilder('orderItem')
                .select('SUM(orderItem.quantity)', 'totalSold')
                .addSelect('SUM(orderItem.quantity * orderItem.priceAtOrder)', 'totalRevenue')
                .where('orderItem.menuItemId = :itemId', { itemId: item.id })
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
                isLowStock: currentStock <= Number(item.minStockLevel || 0)
            };
        }));

        return reportData;
    }
}
