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
        const expense = this.expenseRepository.create(data);
        const savedExpense = await this.expenseRepository.save(expense);
        await this.logCashflow({
            amount: data.amount,
            type: _cashflowentity.CashflowType.OUT,
            source: 'expense',
            referenceId: savedExpense.id.toString(),
            description: data.description,
            businessDayId: data.businessDayId,
            shiftId: data.shiftId
        });
        return savedExpense;
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
        return this.expenseRepository.save(expense);
    }
    // ── Delete Expense ──────────────────────────────────────────────────────
    async deleteExpense(id) {
        const expense = await this.expenseRepository.findOne({
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
        });
        await this.expenseRepository.remove(expense);
        return {
            deleted: true
        };
    }
    async logCashflow(data, manager) {
        const queryManager = manager || this.cashflowRepository.manager;
        // Use a sub-transaction or the provided manager
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
            timestamp: new Date()
        });
        const saved = await queryManager.save(_cashflowentity.Cashflow, cashflow);
        // Broadcast outside transaction or use afterCommit pattern
        // In NestJS/TypeORM, we manually broadcast after save here.
        this.billiardGateway.broadcastFinanceUpdate(saved);
        return saved;
    }
    async getLedger(limit = 50) {
        return this.cashflowRepository.find({
            order: {
                timestamp: 'DESC'
            },
            take: limit
        });
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
    constructor(expenseRepository, cashflowRepository, billiardGateway){
        this.expenseRepository = expenseRepository;
        this.cashflowRepository = cashflowRepository;
        this.billiardGateway = billiardGateway;
    }
};
FinanceService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_expenseentity.Expense)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_cashflowentity.Cashflow)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _billiardgateway.BilliardGateway === "undefined" ? Object : _billiardgateway.BilliardGateway
    ])
], FinanceService);

//# sourceMappingURL=finance.service.js.map