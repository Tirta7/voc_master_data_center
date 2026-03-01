"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ReportService", {
    enumerable: true,
    get: function() {
        return ReportService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _shiftentity = require("../finance/entities/shift.entity");
const _transactionentity = require("../transaction/entities/transaction.entity");
const _ingrediententity = require("../inventory/entities/ingredient.entity");
const _menuitementity = require("../cafe/entities/menu-item.entity");
const _orderitementity = require("../cafe/entities/order-item.entity");
const _expenseentity = require("../finance/entities/expense.entity");
const _auditlogentity = require("./entities/audit-log.entity");
const _mqttservice = require("../mqtt/mqtt.service");
const _billiardgateway = require("../socket/billiard.gateway");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let ReportService = class ReportService {
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
            where: {
                createdAt: (0, _typeorm1.MoreThanOrEqual)(businessDayStart)
            }
        });
        const summary = {
            totalOmzet: 0,
            billiardOmzet: 0,
            cafeOmzet: 0,
            topUpOmzet: 0,
            transactionCount: transactions.length,
            unpaidAmount: 0,
            paymentMethods: {}
        };
        transactions.forEach((tx)=>{
            summary.totalOmzet += Number(tx.grandTotal);
            if (tx.type === 'TOPUP') {
                summary.topUpOmzet += Number(tx.grandTotal);
            } else {
                summary.billiardOmzet += Number(tx.billiardTotal);
                summary.cafeOmzet += Number(tx.cafeTotal);
            }
            if (tx.status !== _transactionentity.TransactionStatus.PAID) {
                summary.unpaidAmount += Number(tx.grandTotal) - Number(tx.paidAmount);
            } else {
                // Parse payment details if available, otherwise fallback to simple method check
                if (Array.isArray(tx.paymentDetails) && tx.paymentDetails.length > 0) {
                    tx.paymentDetails.forEach((detail)=>{
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
        return ingredients.filter((ing)=>{
            return Number(ing.stockQuantity) <= Number(ing.minStockLevel);
        });
    }
    async getBestSellers(limit = 3) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const results = await this.orderItemRepository.createQueryBuilder('oi').select('oi.menuItemId', 'menuItemId').addSelect('SUM(oi.quantity)', 'totalQuantity').innerJoin('oi.menuItem', 'menuItem').addSelect('menuItem.name', 'name').where('oi.status = :status', {
            status: _orderitementity.OrderItemStatus.DONE
        }).andWhere('oi.createdAt >= :date', {
            date: thirtyDaysAgo
        }).groupBy('oi.menuItemId').addGroupBy('menuItem.name').orderBy('SUM(oi.quantity)', 'DESC').limit(limit).getRawMany();
        return results.map((r)=>({
                id: Number(r.menuItemId),
                name: r.name,
                totalSales: Number(r.totalQuantity)
            }));
    }
    async getItemsPerformance() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // All menu items with their sales in last 30 days
        const allItems = await this.menuItemRepository.find({
            where: {
                isActive: true
            },
            relations: [
                'category'
            ]
        });
        const salesData = await this.orderItemRepository.createQueryBuilder('oi').select('oi.menuItemId', 'menuItemId').addSelect('SUM(oi.quantity)', 'totalQuantity').addSelect('SUM(oi.quantity * oi.priceAtOrder)', 'totalRevenue').where('oi.status = :status', {
            status: _orderitementity.OrderItemStatus.DONE
        }).andWhere('oi.createdAt >= :date', {
            date: thirtyDaysAgo
        }).groupBy('oi.menuItemId').getRawMany();
        const salesMap = new Map(salesData.map((r)=>[
                Number(r.menuItemId),
                {
                    qty: Number(r.totalQuantity),
                    revenue: Number(r.totalRevenue)
                }
            ]));
        const ranked = allItems.map((item)=>({
                id: item.id,
                name: item.name,
                category: item.category?.name || '—',
                price: Number(item.price),
                totalQty: salesMap.get(item.id)?.qty || 0,
                totalRevenue: salesMap.get(item.id)?.revenue || 0
            })).sort((a, b)=>b.totalQty - a.totalQty);
        const sold = ranked.filter((i)=>i.totalQty > 0);
        const unsold = ranked.filter((i)=>i.totalQty === 0);
        return {
            all: ranked,
            topItems: sold.slice(0, 8),
            slowItems: [
                ...sold.slice(-5).reverse(),
                ...unsold.slice(0, 3)
            ],
            totalMenuItems: allItems.length,
            activeItems: sold.length,
            unsoldItems: unsold.length
        };
    }
    async startShift(startedBy, openingCash) {
        const existingActive = await this.shiftRepository.findOne({
            where: {
                isActive: true
            }
        });
        if (existingActive) throw new Error('A shift is already active');
        const shift = this.shiftRepository.create({
            startedBy,
            cashStart: openingCash,
            isActive: true
        });
        return this.shiftRepository.save(shift);
    }
    async closeShift(id, endedBy, closingCash, remarks) {
        const shift = await this.shiftRepository.findOne({
            where: {
                id,
                isActive: true
            }
        });
        if (!shift) throw new _common.NotFoundException('Active shift not found');
        shift.endTime = new Date();
        shift.endedBy = endedBy;
        shift.cashPhysical = closingCash;
        if (remarks) shift.note = remarks;
        shift.isActive = false;
        // 1. Calculate Sales (IN)
        const transactions = await this.transactionRepository.find({
            where: {
                createdAt: (0, _typeorm1.MoreThanOrEqual)(shift.startTime)
            }
        });
        const totalSales = transactions.reduce((sum, tx)=>sum + Number(tx.paidAmount), 0);
        // 2. Calculate Expenses (OUT)
        const expenses = await this.expenseRepository.find({
            where: {
                date: (0, _typeorm1.MoreThanOrEqual)(shift.startTime)
            }
        });
        const totalExpenses = expenses.reduce((sum, exp)=>sum + Number(exp.amount), 0);
        // 3. Final Reconciliation
        shift.cashSystem = Number(shift.cashStart) + totalSales - totalExpenses;
        return this.shiftRepository.save(shift);
    }
    async getActiveShift() {
        return this.shiftRepository.findOne({
            where: {
                isActive: true
            }
        });
    }
    async getShiftHistory() {
        return this.shiftRepository.find({
            order: {
                startTime: 'DESC'
            }
        });
    }
    async logAction(action, user, details, tableId, invoiceNumber) {
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
    async getAuditLogs(filters = {}) {
        const { action, user, startDate, endDate, page = 1, limit = 100 } = filters;
        const query = this.auditRepository.createQueryBuilder('log');
        if (action) {
            query.andWhere('log.action = :action', {
                action
            });
        }
        if (user) {
            query.andWhere('log.user LIKE :user', {
                user: `%${user}%`
            });
        }
        if (startDate && endDate) {
            query.andWhere('log.createdAt BETWEEN :start AND :end', {
                start: new Date(startDate),
                end: new Date(endDate)
            });
        } else if (startDate) {
            query.andWhere('log.createdAt >= :start', {
                start: new Date(startDate)
            });
        } else if (endDate) {
            query.andWhere('log.createdAt <= :end', {
                end: new Date(endDate)
            });
        }
        const [items, total] = await query.orderBy('log.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
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
            where: {
                createdAt: (0, _typeorm1.MoreThanOrEqual)(today)
            }
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
        const criticalToday = await this.auditRepository.createQueryBuilder('log').where('log.createdAt >= :today', {
            today
        }).andWhere('log.action IN (:...actions)', {
            actions: criticalActions
        }).getCount();
        const topUserRaw = await this.auditRepository.createQueryBuilder('log').select('log.user', 'user').addSelect('COUNT(log.id)', 'count').where('log.createdAt >= :today', {
            today
        }).groupBy('log.user').orderBy('count', 'DESC').limit(1).getRawOne();
        const actionDistribution = await this.auditRepository.createQueryBuilder('log').select('log.action', 'action').addSelect('COUNT(log.id)', 'count').where('log.createdAt >= :today', {
            today
        }).groupBy('log.action').getRawMany();
        return {
            totalToday,
            criticalToday,
            topUser: topUserRaw || {
                user: 'None',
                count: 0
            },
            distribution: actionDistribution.map((d)=>({
                    action: d.action,
                    count: Number(d.count)
                }))
        };
    }
    async getFullTransactions(limit = 300) {
        return this.transactionRepository.find({
            where: {
                status: _transactionentity.TransactionStatus.PAID
            },
            relations: [
                'table',
                'cafeTable',
                'payments',
                'orderItems',
                'orderItems.menuItem',
                'orderItems.menuItem.category'
            ],
            order: {
                updatedAt: 'DESC'
            },
            take: limit
        });
    }
    async getSettings() {
        return this.settingsService.getSettings();
    }
    async getDetailedRevenueReport(start, end) {
        // 1. Fetch Transactions in range (based on createdAt for full coverage)
        const transactions = await this.transactionRepository.find({
            where: {
                createdAt: (0, _typeorm1.Between)(start, end)
            },
            relations: [
                'table',
                'cafeTable'
            ]
        });
        // 2. Fetch Order Items in range (based on createdAt - order time)
        const orderItems = await this.orderItemRepository.find({
            where: {
                createdAt: (0, _typeorm1.Between)(start, end),
                status: _orderitementity.OrderItemStatus.DONE
            },
            relations: [
                'menuItem'
            ]
        });
        // 3. Aggregate By Hour
        const hourlyData = {};
        for(let i = 0; i < 24; i++){
            hourlyData[i] = {
                billiard: 0,
                cafe: 0,
                topup: 0,
                count: 0
            };
        }
        // Helper to get hour in Local Time
        const getLocalHour = (d)=>{
            return d.getHours();
        };
        // Billiard & Topup revenue grouped by startTime hour (Local)
        transactions.forEach((tx)=>{
            const hour = getLocalHour(new Date(tx.startTime || tx.createdAt));
            if (tx.type === 'TOPUP') {
                hourlyData[hour].topup += Number(tx.grandTotal || 0);
            } else {
                hourlyData[hour].billiard += Number(tx.billiardTotal || 0);
            }
            hourlyData[hour].count += 1;
        });
        // Cafe revenue grouped by OrderItem createdAt hour (Local)
        orderItems.forEach((item)=>{
            const hour = getLocalHour(new Date(item.createdAt));
            hourlyData[hour].cafe += Number(item.quantity) * Number(item.priceAtOrder);
        });
        // 4. Payment Method Totals
        const paymentMethods = {};
        transactions.forEach((tx)=>{
            if (tx.status === _transactionentity.TransactionStatus.PAID) {
                if (Array.isArray(tx.paymentDetails)) {
                    tx.paymentDetails.forEach((p)=>{
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
            hourly: Object.entries(hourlyData).map(([hour, data])=>({
                    hour: Number(hour),
                    ...data,
                    total: data.billiard + data.cafe + data.topup
                })),
            paymentMethods,
            summary: {
                totalBilliard: transactions.filter((tx)=>tx.type !== 'TOPUP').reduce((s, t)=>s + Number(t.billiardTotal || 0), 0),
                totalCafe: orderItems.reduce((s, i)=>s + Number(i.quantity) * Number(i.priceAtOrder), 0),
                totalTopUp: transactions.filter((tx)=>tx.type === 'TOPUP').reduce((s, t)=>s + Number(t.grandTotal || 0), 0),
                totalOmzet: transactions.reduce((s, t)=>s + Number(t.grandTotal || 0), 0),
                transactionCount: transactions.length
            }
        };
    }
    async getStoreStockReport() {
        const storeItems = await this.menuItemRepository.find({
            where: {
                category: {
                    name: 'STORE'
                }
            },
            relations: [
                'category'
            ]
        });
        const reportData = await Promise.all(storeItems.map(async (item)=>{
            const salesData = await this.orderItemRepository.createQueryBuilder('orderItem').select('SUM(orderItem.quantity)', 'totalSold').addSelect('SUM(orderItem.quantity * orderItem.priceAtOrder)', 'totalRevenue').where('orderItem.menuItemId = :itemId', {
                itemId: item.id
            }).getRawOne();
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
    constructor(shiftRepository, transactionRepository, ingredientRepository, orderItemRepository, menuItemRepository, expenseRepository, auditRepository, settingsService, mqttService, billiardGateway){
        this.shiftRepository = shiftRepository;
        this.transactionRepository = transactionRepository;
        this.ingredientRepository = ingredientRepository;
        this.orderItemRepository = orderItemRepository;
        this.menuItemRepository = menuItemRepository;
        this.expenseRepository = expenseRepository;
        this.auditRepository = auditRepository;
        this.settingsService = settingsService;
        this.mqttService = mqttService;
        this.billiardGateway = billiardGateway;
    }
};
ReportService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_shiftentity.Shift)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_transactionentity.Transaction)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_ingrediententity.Ingredient)),
    _ts_param(3, (0, _typeorm.InjectRepository)(_orderitementity.OrderItem)),
    _ts_param(4, (0, _typeorm.InjectRepository)(_menuitementity.MenuItem)),
    _ts_param(5, (0, _typeorm.InjectRepository)(_expenseentity.Expense)),
    _ts_param(6, (0, _typeorm.InjectRepository)(_auditlogentity.AuditLog)),
    _ts_param(7, (0, _common.Inject)((0, _common.forwardRef)(()=>{
        const { SettingsService: SettingsService1 } = require('../settings/settings.service');
        return SettingsService1;
    }))),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof SettingsService === "undefined" ? Object : SettingsService,
        typeof _mqttservice.MqttService === "undefined" ? Object : _mqttservice.MqttService,
        typeof _billiardgateway.BilliardGateway === "undefined" ? Object : _billiardgateway.BilliardGateway
    ])
], ReportService);

//# sourceMappingURL=report.service.js.map