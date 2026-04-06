"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FinanceService", {
    enumerable: true,
    get: function() {
        return FinanceService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _expenseentity = require("./entities/expense.entity");
const _cashflowentity = require("./entities/cashflow.entity");
const _auditlogentity = require("../report/entities/audit-log.entity");
const _settingentity = require("../settings/entities/setting.entity");
const _approvalservice = require("../common/approval/approval.service");
const _approvalentity = require("../common/entities/approval.entity");
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
let FinanceService = class FinanceService {
    parseDate(dateStr, defaultDate, endOfDay = false) {
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
    async recordExpense(data) {
        return this.expenseRepository.manager.transaction(async (manager)=>{
            // 1. Fetch Dynamic Approval Levels
            const settings = await this.settingRepo.findOne({
                where: {}
            });
            let requiredLevels = settings?.approvalConfig?.EXPENSE || [];
            // Safety Fallback (minimalism)
            if (requiredLevels.length === 0) {
                requiredLevels = [
                    2
                ];
            }
            requiredLevels = [
                ...requiredLevels
            ].sort((a, b)=>a - b);
            const expense = manager.create(_expenseentity.Expense, {
                ...data,
                status: _expenseentity.ExpenseStatus.PENDING
            });
            const savedExpense = await manager.save(_expenseentity.Expense, expense);
            await this.approvalService.createRequest({
                moduleType: _approvalentity.ApprovalModuleType.EXPENSE,
                referenceId: savedExpense.id,
                requestedByUserId: data.recordedByUserId || 1,
                requiredLevels,
                metadata: {
                    amount: data.amount,
                    category: data.category,
                    description: data.description,
                    recordedBy: data.recordedBy
                }
            });
            // Audit trail record (Requested)
            const audit = manager.create(_auditlogentity.AuditLog, {
                action: 'EXPENSE_REQUESTED',
                user: data.recordedBy,
                details: `Requested expense: ${data.description} (Rp ${Number(data.amount).toLocaleString()}) - Status: PENDING APPROVAL`
            });
            await manager.save(_auditlogentity.AuditLog, audit);
            return savedExpense;
        });
    }
    // ── Update Expense ──────────────────────────────────────────────────────
    async updateExpense(id, data) {
        const expense = await this.expenseRepository.findOne({
            where: {
                id
            }
        });
        if (!expense) throw new _common.NotFoundException(`Expense #${id} not found`);
        Object.assign(expense, data);
        const updated = await this.expenseRepository.save(expense);
        // Audit trail record
        const audit = this.auditLogRepository.create({
            action: 'EXPENSE_UPDATED',
            user: data.recordedBy || 'System',
            details: `Updated expense #${id}: ${updated.description} (Rp ${Number(updated.amount).toLocaleString()})`
        });
        await this.auditLogRepository.save(audit);
        return updated;
    }
    async deleteExpense(id) {
        return this.expenseRepository.manager.transaction(async (manager)=>{
            const expense = await manager.findOne(_expenseentity.Expense, {
                where: {
                    id
                }
            });
            if (!expense) throw new _common.NotFoundException(`Expense #${id} not found`);
            // Reverse the cashflow entry by adding the amount back in
            await this.logCashflow({
                amount: Number(expense.amount),
                type: _cashflowentity.CashflowType.IN,
                source: 'expense_reversal',
                referenceId: id.toString(),
                description: `Reversal: ${expense.description}`,
                businessDayId: expense.businessDayId,
                shiftId: expense.shiftId
            }, manager);
            // Audit trail record
            const audit = manager.create(_auditlogentity.AuditLog, {
                action: 'EXPENSE_DELETED',
                user: 'System/Manager',
                details: `Deleted expense #${id}: ${expense.description} (Rp ${Number(expense.amount).toLocaleString()})`
            });
            await manager.save(_auditlogentity.AuditLog, audit);
            await manager.remove(_expenseentity.Expense, expense);
            return {
                deleted: true
            };
        });
    }
    async logCashflow(data, manager) {
        const queryManager = manager || this.cashflowRepository.manager;
        return queryManager.transaction(async (transactionalManager)=>{
            return this.performLogCashflow(data, transactionalManager);
        });
    }
    async performLogCashflow(data, queryManager) {
        // We MUST find the last entry and lock it to prevent race conditions on balanceAfter
        const lastEntry = await queryManager.findOne(_cashflowentity.Cashflow, {
            where: {},
            order: {
                id: 'DESC'
            },
            lock: {
                mode: 'pessimistic_write'
            }
        });
        const currentBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;
        const numAmount = Number(data.amount);
        const balanceAfter = data.type === _cashflowentity.CashflowType.IN ? currentBalance + numAmount : currentBalance - numAmount;
        const cashflow = queryManager.create(_cashflowentity.Cashflow, {
            ...data,
            amount: numAmount,
            balanceAfter: Number(balanceAfter.toFixed(2)),
            paymentMethod: data.paymentMethod,
            timestamp: new Date()
        });
        const saved = await queryManager.save(_cashflowentity.Cashflow, cashflow);
        // Broadcast outside transaction or use afterCommit pattern
        // In NestJS/TypeORM, we manually broadcast after save here.
        this.billiardGateway.broadcastFinanceUpdate(saved);
        return saved;
    }
    async getLedger(limit = 150, startDate, endDate) {
        const where = {};
        const start = startDate ? this.parseDate(startDate, new Date()) : null;
        const end = endDate ? this.parseDate(endDate, new Date(), true) : null;
        if (start && end) {
            where.timestamp = (0, _typeorm1.Between)(start, end);
        } else if (start) {
            where.timestamp = (0, _typeorm1.MoreThanOrEqual)(start);
        } else if (end) {
            where.timestamp = (0, _typeorm1.LessThanOrEqual)(end);
        }
        const [entries, stats] = await Promise.all([
            // 1. Get limited entries for display
            this.cashflowRepository.find({
                where,
                relations: [
                    'businessDay',
                    'shift'
                ],
                order: {
                    timestamp: 'DESC'
                },
                take: limit > 0 ? limit : undefined
            }),
            // 2. Get full period summary for stats cards
            this.cashflowRepository.createQueryBuilder('c').leftJoin('c.shift', 's').select('c.type', 'type').addSelect('c.source', 'source').addSelect('SUM(c.amount)', 'total').addSelect('s.shiftName', 'shiftName').where('1=1').andWhere(start ? 'c.timestamp >= :start' : '1=1', {
                start
            }).andWhere(end ? 'c.timestamp <= :end' : '1=1', {
                end
            }).groupBy('c.type').addGroupBy('c.source').addGroupBy('s.shiftName').getRawMany()
        ]);
        // Process stats in JS to handle Member Usage exclusion clearly
        let totalIn = 0;
        let totalOut = 0;
        const shiftPerf = {};
        stats.forEach((s)=>{
            const amount = Number(s.total || 0);
            const isMemberUsage = (s.source || '').toLowerCase() === 'usage:member';
            if (s.type === _cashflowentity.CashflowType.IN) {
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
        const countStats = await this.cashflowRepository.createQueryBuilder('c').select('COUNT(DISTINCT c.referenceId)', 'count').addSelect('c.source', 'source').where('1=1').andWhere(start ? 'c.timestamp >= :start' : '1=1', {
            start
        }).andWhere(end ? 'c.timestamp <= :end' : '1=1', {
            end
        }).andWhere("(LOWER(c.source) LIKE '%split%' OR LOWER(c.source) LIKE '%multi%' OR LOWER(c.source) = 'usage:member')").groupBy('c.source').getRawMany();
        let splitCount = 0;
        let memberUsageCount = 0;
        countStats.forEach((cs)=>{
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
                shiftPerformance: Object.entries(shiftPerf).map(([name, total])=>({
                        name,
                        total
                    })).sort((a, b)=>b.total - a.total)
            }
        };
    }
    // ── Get Expense History (with optional filters) ─────────────────────────
    async getExpenseHistory(filters) {
        const where = {};
        if (filters?.startDate && filters?.endDate) {
            const start = this.parseDate(filters.startDate, new Date());
            const end = this.parseDate(filters.endDate, new Date(), true);
            where.date = (0, _typeorm1.Between)(start, end);
        } else if (filters?.startDate) {
            where.date = (0, _typeorm1.MoreThanOrEqual)(this.parseDate(filters.startDate, new Date()));
        } else if (filters?.endDate) {
            where.date = (0, _typeorm1.LessThanOrEqual)(this.parseDate(filters.endDate, new Date(), true));
        }
        if (filters?.category && filters.category !== 'all') {
            where.category = filters.category;
        }
        return this.expenseRepository.find({
            where,
            order: {
                date: 'DESC'
            }
        });
    }
    // ── Expense Summary with Net Profit ──────────────────────────────────────
    async getExpenseSummary(startDate, endDate) {
        // Build date range (default: current month)
        const now = new Date();
        const start = this.parseDate(startDate, new Date(now.getFullYear(), now.getMonth(), 1));
        const end = this.parseDate(endDate, new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59), true);
        // Get expenses in period
        const expenses = await this.expenseRepository.find({
            where: {
                date: (0, _typeorm1.Between)(start, end)
            }
        });
        const totalExpenses = expenses.reduce((s, e)=>s + Number(e.amount), 0);
        // Category breakdown
        const byCategory = {};
        for (const exp of expenses){
            byCategory[exp.category] = (byCategory[exp.category] || 0) + Number(exp.amount);
        }
        // Get revenue (cashflow IN) in same period
        const incomes = await this.cashflowRepository.find({
            where: {
                type: _cashflowentity.CashflowType.IN,
                timestamp: (0, _typeorm1.Between)(start, end)
            }
        });
        // Exclude expense_reversal from revenue count
        const totalRevenue = incomes.filter((i)=>i.source !== 'expense_reversal').reduce((s, i)=>s + Number(i.amount), 0);
        return {
            totalRevenue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses,
            byCategory,
            expenseCount: expenses.length,
            period: {
                start: start.toISOString(),
                end: end.toISOString()
            }
        };
    }
    async getNetProfit(startDate, endDate) {
        const incomes = await this.cashflowRepository.find({
            where: {
                type: _cashflowentity.CashflowType.IN,
                timestamp: (0, _typeorm1.Between)(startDate, endDate)
            }
        });
        const expenses = await this.cashflowRepository.find({
            where: {
                type: _cashflowentity.CashflowType.OUT,
                timestamp: (0, _typeorm1.Between)(startDate, endDate)
            }
        });
        const totalIn = incomes.reduce((sum, item)=>sum + Number(item.amount), 0);
        const totalOut = expenses.reduce((sum, item)=>sum + Number(item.amount), 0);
        return {
            totalIn,
            totalOut,
            netProfit: totalIn - totalOut
        };
    }
    // ── Finalize Expense (called by ApprovalListener after full approval) ──────
    async finalizeExpense(expenseId) {
        const expense = await this.expenseRepository.findOne({
            where: {
                id: expenseId
            }
        });
        if (!expense || expense.status !== _expenseentity.ExpenseStatus.PENDING) return;
        await this.expenseRepository.manager.transaction(async (manager)=>{
            // 1. Mark expense as APPROVED
            expense.status = _expenseentity.ExpenseStatus.APPROVED;
            await manager.save(_expenseentity.Expense, expense);
            // 2. Log the actual cashflow deduction
            await this.logCashflow({
                amount: Number(expense.amount),
                type: _cashflowentity.CashflowType.OUT,
                source: 'expense',
                referenceId: expense.id.toString(),
                description: expense.description,
                businessDayId: expense.businessDayId,
                shiftId: expense.shiftId,
                paymentMethod: 'CASH'
            }, manager);
            // 3. Audit trail
            const audit = manager.create(_auditlogentity.AuditLog, {
                action: 'EXPENSE_APPROVED',
                user: 'System/Approval',
                details: `Expense #${expenseId} approved & posted: ${expense.description} (Rp ${Number(expense.amount).toLocaleString()})`
            });
            await manager.save(_auditlogentity.AuditLog, audit);
        });
    }
    async getLoyaltyAnalytics(startDate, endDate) {
        const now = new Date();
        const start = this.parseDate(startDate, new Date(now.getFullYear(), now.getMonth(), 1));
        const end = this.parseDate(endDate, new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59), true);
        const pointLedgers = await this.dataSource.getRepository('point_ledgers').find({
            where: {
                createdAt: (0, _typeorm1.Between)(start, end)
            },
            relations: [
                'member'
            ]
        });
        // 1. Topup Revenue (from cashflows)
        const topupCashflows = await this.cashflowRepository.find({
            where: {
                source: 'topup',
                timestamp: (0, _typeorm1.Between)(start, end)
            }
        });
        const totalTopupRevenue = topupCashflows.reduce((s, c)=>s + Number(c.amount), 0);
        // 2. Point Redemption Analytics
        const redemptions = pointLedgers.filter((l)=>l.type === 'REDEEM');
        const totalPointsRedeemed = Math.abs(redemptions.reduce((s, r)=>s + Number(r.amount), 0));
        // Breakdown by item
        const itemBreakdown = {};
        for (const r of redemptions){
            // Description format "Tukar [Item Name]"
            const itemName = r.description?.replace('Tukar ', '') || 'Unknown Item';
            if (!itemBreakdown[itemName]) {
                itemBreakdown[itemName] = {
                    count: 0,
                    points: 0
                };
            }
            itemBreakdown[itemName].count += 1;
            itemBreakdown[itemName].points += Math.abs(Number(r.amount));
        }
        return {
            totalTopupRevenue,
            totalPointsRedeemed,
            redemptionCount: redemptions.length,
            items: Object.entries(itemBreakdown).map(([name, stats])=>({
                    name,
                    ...stats
                })),
            period: {
                start: start.toISOString(),
                end: end.toISOString()
            }
        };
    }
    constructor(expenseRepository, cashflowRepository, auditLogRepository, settingRepo, billiardGateway, approvalService, dataSource){
        this.expenseRepository = expenseRepository;
        this.cashflowRepository = cashflowRepository;
        this.auditLogRepository = auditLogRepository;
        this.settingRepo = settingRepo;
        this.billiardGateway = billiardGateway;
        this.approvalService = approvalService;
        this.dataSource = dataSource;
    }
};
FinanceService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_expenseentity.Expense)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_cashflowentity.Cashflow)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_auditlogentity.AuditLog)),
    _ts_param(3, (0, _typeorm.InjectRepository)(_settingentity.Setting)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _billiardgateway.BilliardGateway === "undefined" ? Object : _billiardgateway.BilliardGateway,
        typeof _approvalservice.ApprovalService === "undefined" ? Object : _approvalservice.ApprovalService,
        typeof _typeorm1.DataSource === "undefined" ? Object : _typeorm1.DataSource
    ])
], FinanceService);

//# sourceMappingURL=finance.service.js.map