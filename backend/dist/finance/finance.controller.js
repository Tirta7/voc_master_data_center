"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FinanceController", {
    enumerable: true,
    get: function() {
        return FinanceController;
    }
});
const _common = require("@nestjs/common");
const _financeservice = require("./finance.service");
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
let FinanceController = class FinanceController {
    async recordExpense(data) {
        return this.financeService.recordExpense(data);
    }
    async getExpenseSummary(startDate, endDate) {
        return this.financeService.getExpenseSummary(startDate, endDate);
    }
    async getExpenseHistory(startDate, endDate, category) {
        return this.financeService.getExpenseHistory({
            startDate,
            endDate,
            category
        });
    }
    async updateExpense(id, data) {
        return this.financeService.updateExpense(Number(id), data);
    }
    async deleteExpense(id) {
        return this.financeService.deleteExpense(Number(id));
    }
    async getLedger(limit) {
        return this.financeService.getLedger(limit);
    }
    async getNetProfit(start, end) {
        return this.financeService.getNetProfit(new Date(start), new Date(end));
    }
    constructor(financeService){
        this.financeService = financeService;
    }
};
_ts_decorate([
    (0, _common.Post)('expenses'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], FinanceController.prototype, "recordExpense", null);
_ts_decorate([
    (0, _common.Get)('expenses/summary'),
    _ts_param(0, (0, _common.Query)('startDate')),
    _ts_param(1, (0, _common.Query)('endDate')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], FinanceController.prototype, "getExpenseSummary", null);
_ts_decorate([
    (0, _common.Get)('expenses'),
    _ts_param(0, (0, _common.Query)('startDate')),
    _ts_param(1, (0, _common.Query)('endDate')),
    _ts_param(2, (0, _common.Query)('category')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], FinanceController.prototype, "getExpenseHistory", null);
_ts_decorate([
    (0, _common.Patch)('expenses/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], FinanceController.prototype, "updateExpense", null);
_ts_decorate([
    (0, _common.Delete)('expenses/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], FinanceController.prototype, "deleteExpense", null);
_ts_decorate([
    (0, _common.Get)('ledger'),
    _ts_param(0, (0, _common.Query)('limit')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], FinanceController.prototype, "getLedger", null);
_ts_decorate([
    (0, _common.Get)('profit'),
    _ts_param(0, (0, _common.Query)('start')),
    _ts_param(1, (0, _common.Query)('end')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], FinanceController.prototype, "getNetProfit", null);
FinanceController = _ts_decorate([
    (0, _common.Controller)('finance'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _financeservice.FinanceService === "undefined" ? Object : _financeservice.FinanceService
    ])
], FinanceController);

//# sourceMappingURL=finance.controller.js.map