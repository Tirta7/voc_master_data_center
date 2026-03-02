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
    get OrderItem () {
        return OrderItem;
    },
    get OrderItemStatus () {
        return OrderItemStatus;
    }
});
const _typeorm = require("typeorm");
const _userentity = require("../../user/entities/user.entity");
const _transactionpaymententity = require("../../transaction/entities/transaction-payment.entity");
const _menuitementity = require("./menu-item.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
var OrderItemStatus = /*#__PURE__*/ function(OrderItemStatus) {
    OrderItemStatus["QUEUED"] = "QUEUED";
    OrderItemStatus["PROCESSING"] = "PROCESSING";
    OrderItemStatus["DONE"] = "DONE";
    OrderItemStatus["CANCELLED"] = "CANCELLED";
    OrderItemStatus["CANCEL_REQUESTED"] = "CANCEL_REQUESTED";
    OrderItemStatus["CANCEL_REJECTED"] = "CANCEL_REJECTED";
    return OrderItemStatus;
}({});
let OrderItem = class OrderItem {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], OrderItem.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: OrderItemStatus,
        default: "QUEUED"
    }),
    _ts_metadata("design:type", String)
], OrderItem.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)('Transaction', (transaction)=>transaction.orderItems),
    _ts_metadata("design:type", Object)
], OrderItem.prototype, "transaction", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], OrderItem.prototype, "transactionId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_menuitementity.MenuItem),
    _ts_metadata("design:type", typeof _menuitementity.MenuItem === "undefined" ? Object : _menuitementity.MenuItem)
], OrderItem.prototype, "menuItem", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], OrderItem.prototype, "menuItemId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int'
    }),
    _ts_metadata("design:type", Number)
], OrderItem.prototype, "quantity", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 10,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], OrderItem.prototype, "priceAtOrder", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], OrderItem.prototype, "discountPercentage", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], OrderItem.prototype, "discountAmount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], OrderItem.prototype, "isPaid", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_transactionpaymententity.TransactionPayment, {
        nullable: true
    }),
    _ts_metadata("design:type", typeof _transactionpaymententity.TransactionPayment === "undefined" ? Object : _transactionpaymententity.TransactionPayment)
], OrderItem.prototype, "payment", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], OrderItem.prototype, "paymentId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], OrderItem.prototype, "note", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], OrderItem.prototype, "customName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], OrderItem.prototype, "station", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], OrderItem.prototype, "bundleGroupId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], OrderItem.prototype, "cancelledAt", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], OrderItem.prototype, "cancelledBy", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], OrderItem.prototype, "cancelReason", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User),
    (0, _typeorm.JoinColumn)({
        name: 'completedByUserId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], OrderItem.prototype, "completedBy", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], OrderItem.prototype, "completedByUserId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], OrderItem.prototype, "completedAt", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User),
    (0, _typeorm.JoinColumn)({
        name: 'createdByUserId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], OrderItem.prototype, "createdBy", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], OrderItem.prototype, "createdByUserId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'commissionUserId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], OrderItem.prototype, "commissionUser", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], OrderItem.prototype, "commissionUserId", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], OrderItem.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], OrderItem.prototype, "updatedAt", void 0);
OrderItem = _ts_decorate([
    (0, _typeorm.Entity)('order_items'),
    (0, _typeorm.Index)('idx_order_items_status', [
        'status'
    ]),
    (0, _typeorm.Index)('idx_order_items_transactionId', [
        'transactionId'
    ])
], OrderItem);

//# sourceMappingURL=order-item.entity.js.map