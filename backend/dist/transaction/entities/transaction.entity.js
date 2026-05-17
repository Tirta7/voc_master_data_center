"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get Transaction () {
        return Transaction;
    },
    get TransactionStatus () {
        return TransactionStatus;
    },
    get TransactionType () {
        return TransactionType;
    }
});
const _typeorm = require("typeorm");
const _userentity = require("../../user/entities/user.entity");
const _tableentity = require("../../billiard/entities/table.entity");
const _transactionpaymententity = require("./transaction-payment.entity");
const _orderitementity = require("../../cafe/entities/order-item.entity");
const _cafetableentity = require("../../cafe-table/entities/cafe-table.entity");
const _shiftentity = require("../../finance/entities/shift.entity");
const _businessdayentity = require("../../finance/entities/business-day.entity");
const _memberentity = require("../../member/entities/member.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
var TransactionStatus = /*#__PURE__*/ function(TransactionStatus) {
    TransactionStatus["UNPAID"] = "UNPAID";
    TransactionStatus["PAID"] = "PAID";
    TransactionStatus["PARTIAL"] = "PARTIAL";
    TransactionStatus["DEBT"] = "DEBT";
    TransactionStatus["CANCELLED"] = "CANCELLED";
    return TransactionStatus;
}({});
var TransactionType = /*#__PURE__*/ function(TransactionType) {
    TransactionType["BILLIARD"] = "BILLIARD";
    TransactionType["CAFE"] = "CAFE";
    TransactionType["TOPUP"] = "TOPUP";
    return TransactionType;
}({});
let Transaction = class Transaction {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Transaction.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        unique: true
    }),
    _ts_metadata("design:type", String)
], Transaction.prototype, "invoiceNumber", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Transaction.prototype, "customerName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Transaction.prototype, "customerPhone", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_tableentity.Table, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'tableId'
    }),
    _ts_metadata("design:type", Object)
], Transaction.prototype, "table", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Transaction.prototype, "tableId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_cafetableentity.CafeTable, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'cafeTableId'
    }),
    _ts_metadata("design:type", Object)
], Transaction.prototype, "cafeTable", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Transaction.prototype, "cafeTableId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_memberentity.Member, {
        nullable: true,
        onDelete: 'SET NULL'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'memberId'
    }),
    _ts_metadata("design:type", Object)
], Transaction.prototype, "member", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Transaction.prototype, "memberId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: TransactionStatus,
        default: "UNPAID"
    }),
    _ts_metadata("design:type", String)
], Transaction.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: TransactionType,
        default: "BILLIARD"
    }),
    _ts_metadata("design:type", String)
], Transaction.prototype, "type", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Transaction.prototype, "sessionType", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Transaction.prototype, "fareName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Transaction.prototype, "startTime", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Transaction.prototype, "endTime", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Transaction.prototype, "sessionDuration", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Transaction.prototype, "billiardTotal", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Transaction.prototype, "cafeTotal", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Transaction.prototype, "grandTotal", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Transaction.prototype, "discountAmount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Transaction.prototype, "vatAmount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Transaction.prototype, "serviceChargeAmount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Transaction.prototype, "roundingAmount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Transaction.prototype, "paidAmount", void 0);
_ts_decorate([
    (0, _typeorm.OneToMany)(()=>_orderitementity.OrderItem, (orderItem)=>orderItem.transaction),
    _ts_metadata("design:type", Array)
], Transaction.prototype, "orderItems", void 0);
_ts_decorate([
    (0, _typeorm.OneToMany)(()=>_transactionpaymententity.TransactionPayment, (payment)=>payment.transaction),
    _ts_metadata("design:type", Array)
], Transaction.prototype, "payments", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Transaction.prototype, "paymentDetails", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Transaction.prototype, "billingDetails", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Transaction.prototype, "remarks", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Transaction.prototype, "appliedPromos", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User),
    (0, _typeorm.JoinColumn)({
        name: 'createdByUserId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], Transaction.prototype, "createdBy", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Transaction.prototype, "createdByUserId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User),
    (0, _typeorm.JoinColumn)({
        name: 'openedByUserId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], Transaction.prototype, "openedBy", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Transaction.prototype, "openedByUserId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'commissionUserId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], Transaction.prototype, "commissionUser", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Transaction.prototype, "commissionUserId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'paidByUserId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], Transaction.prototype, "paidBy", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Transaction.prototype, "paidByUserId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_shiftentity.Shift),
    (0, _typeorm.JoinColumn)({
        name: 'shiftId'
    }),
    _ts_metadata("design:type", typeof _shiftentity.Shift === "undefined" ? Object : _shiftentity.Shift)
], Transaction.prototype, "shift", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Transaction.prototype, "shiftId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_businessdayentity.BusinessDay),
    (0, _typeorm.JoinColumn)({
        name: 'businessDayId'
    }),
    _ts_metadata("design:type", typeof _businessdayentity.BusinessDay === "undefined" ? Object : _businessdayentity.BusinessDay)
], Transaction.prototype, "businessDay", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Transaction.prototype, "businessDayId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Transaction.prototype, "packageId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Transaction.prototype, "awardedPoints", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Transaction.prototype, "awardedSpend", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Transaction.prototype, "payrollReleaseId", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Transaction.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Transaction.prototype, "updatedAt", void 0);
Transaction = _ts_decorate([
    (0, _typeorm.Entity)('transactions'),
    (0, _typeorm.Index)('idx_transactions_status_created', [
        'status',
        'createdAt'
    ]),
    (0, _typeorm.Index)('idx_transactions_table_created', [
        'tableId',
        'createdAt'
    ]),
    (0, _typeorm.Index)('idx_transactions_invoice', [
        'invoiceNumber'
    ]),
    (0, _typeorm.Index)('idx_transactions_member', [
        'memberId'
    ]),
    (0, _typeorm.Index)('idx_transactions_created_by', [
        'createdByUserId'
    ]),
    (0, _typeorm.Index)('idx_transactions_opened_by', [
        'openedByUserId'
    ]),
    (0, _typeorm.Index)('idx_transactions_shift', [
        'shiftId'
    ]),
    (0, _typeorm.Index)('idx_transactions_business_day', [
        'businessDayId'
    ]),
    (0, _typeorm.Index)('idx_transactions_cafe_table', [
        'cafeTableId'
    ])
], Transaction);

//# sourceMappingURL=transaction.entity.js.map