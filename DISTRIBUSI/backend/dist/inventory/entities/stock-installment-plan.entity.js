"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "StockInstallmentPlan", {
    enumerable: true,
    get: function() {
        return StockInstallmentPlan;
    }
});
const _typeorm = require("typeorm");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let StockInstallmentPlan = class StockInstallmentPlan {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], StockInstallmentPlan.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)('StockIn', (stock)=>stock.installmentPlans),
    (0, _typeorm.JoinColumn)({
        name: 'stockInId'
    }),
    _ts_metadata("design:type", Object)
], StockInstallmentPlan.prototype, "stockIn", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], StockInstallmentPlan.prototype, "stockInId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp'
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], StockInstallmentPlan.prototype, "dueDate", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], StockInstallmentPlan.prototype, "amount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], StockInstallmentPlan.prototype, "isPaid", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], StockInstallmentPlan.prototype, "paidAt", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], StockInstallmentPlan.prototype, "createdAt", void 0);
StockInstallmentPlan = _ts_decorate([
    (0, _typeorm.Entity)('stock_installment_plans')
], StockInstallmentPlan);

//# sourceMappingURL=stock-installment-plan.entity.js.map