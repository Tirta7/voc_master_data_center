"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "TransactionPayment", {
    enumerable: true,
    get: function() {
        return TransactionPayment;
    }
});
const _typeorm = require("typeorm");
const _userentity = require("../../user/entities/user.entity");
const _shiftentity = require("../../finance/entities/shift.entity");
const _businessdayentity = require("../../finance/entities/business-day.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let TransactionPayment = class TransactionPayment {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], TransactionPayment.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)('Transaction'),
    _ts_metadata("design:type", Object)
], TransactionPayment.prototype, "transaction", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], TransactionPayment.prototype, "transactionId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], TransactionPayment.prototype, "payerName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], TransactionPayment.prototype, "itemsSubtotal", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], TransactionPayment.prototype, "billiardPortion", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], TransactionPayment.prototype, "discountAmount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], TransactionPayment.prototype, "taxAmount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], TransactionPayment.prototype, "serviceAmount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], TransactionPayment.prototype, "roundingAmount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], TransactionPayment.prototype, "tenderedAmount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], TransactionPayment.prototype, "changeAmount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], TransactionPayment.prototype, "totalPaid", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], TransactionPayment.prototype, "paymentMethod", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], TransactionPayment.prototype, "itemsSnapshot", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], TransactionPayment.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User),
    (0, _typeorm.JoinColumn)({
        name: 'createdByUserId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], TransactionPayment.prototype, "createdBy", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], TransactionPayment.prototype, "createdByUserId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_shiftentity.Shift),
    (0, _typeorm.JoinColumn)({
        name: 'shiftId'
    }),
    _ts_metadata("design:type", typeof _shiftentity.Shift === "undefined" ? Object : _shiftentity.Shift)
], TransactionPayment.prototype, "shift", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], TransactionPayment.prototype, "shiftId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_businessdayentity.BusinessDay),
    (0, _typeorm.JoinColumn)({
        name: 'businessDayId'
    }),
    _ts_metadata("design:type", typeof _businessdayentity.BusinessDay === "undefined" ? Object : _businessdayentity.BusinessDay)
], TransactionPayment.prototype, "businessDay", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], TransactionPayment.prototype, "businessDayId", void 0);
TransactionPayment = _ts_decorate([
    (0, _typeorm.Entity)('transaction_payments'),
    (0, _typeorm.Index)('idx_transaction_payments_transaction', [
        'transactionId'
    ])
], TransactionPayment);

//# sourceMappingURL=transaction-payment.entity.js.map