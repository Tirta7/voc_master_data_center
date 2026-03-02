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
    async logCashflow(data) {
        // Calculate current balance
        const lastEntry = await this.cashflowRepository.findOne({
            where: {},
            order: {
                id: 'DESC'
            }
        });
        const currentBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;
        const balanceAfter = data.type === _cashflowentity.CashflowType.IN ? currentBalance + Number(data.amount) : currentBalance - Number(data.amount);
        const cashflow = this.cashflowRepository.create({
            ...data,
            balanceAfter
        });
        const saved = await this.cashflowRepository.save(cashflow);
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
    async getExpenseHistory() {
        return this.expenseRepository.find({
            order: {
                date: 'DESC'
            }
        });
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