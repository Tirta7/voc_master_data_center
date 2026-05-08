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
    get StockIn () {
        return StockIn;
    },
    get StockPaymentStatus () {
        return StockPaymentStatus;
    }
});
const _typeorm = require("typeorm");
const _ingrediententity = require("./ingredient.entity");
const _supplierentity = require("./supplier.entity");
const _userentity = require("../../user/entities/user.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
var StockPaymentStatus = /*#__PURE__*/ function(StockPaymentStatus) {
    StockPaymentStatus["PAID"] = "PAID";
    StockPaymentStatus["UNPAID"] = "UNPAID";
    StockPaymentStatus["PARTIAL"] = "PARTIAL";
    return StockPaymentStatus;
}({});
let StockIn = class StockIn {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], StockIn.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_ingrediententity.Ingredient),
    (0, _typeorm.JoinColumn)({
        name: 'ingredientId'
    }),
    _ts_metadata("design:type", typeof _ingrediententity.Ingredient === "undefined" ? Object : _ingrediententity.Ingredient)
], StockIn.prototype, "ingredient", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], StockIn.prototype, "ingredientId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_supplierentity.Supplier, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'supplierId'
    }),
    _ts_metadata("design:type", typeof _supplierentity.Supplier === "undefined" ? Object : _supplierentity.Supplier)
], StockIn.prototype, "supplier", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], StockIn.prototype, "supplierId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], StockIn.prototype, "quantity", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], StockIn.prototype, "unit", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], StockIn.prototype, "purchasePrice", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], StockIn.prototype, "totalCost", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'receivedByUserId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], StockIn.prototype, "receivedBy", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], StockIn.prototype, "receivedByUserId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], StockIn.prototype, "notes", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: StockPaymentStatus,
        default: "PAID"
    }),
    _ts_metadata("design:type", String)
], StockIn.prototype, "paymentStatus", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], StockIn.prototype, "dueDate", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], StockIn.prototype, "paidAmount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], StockIn.prototype, "invoiceNumber", void 0);
_ts_decorate([
    (0, _typeorm.OneToMany)('StockPayment', (payment)=>payment.stockIn),
    _ts_metadata("design:type", Array)
], StockIn.prototype, "payments", void 0);
_ts_decorate([
    (0, _typeorm.OneToMany)('StockInstallmentPlan', (plan)=>plan.stockIn),
    _ts_metadata("design:type", Array)
], StockIn.prototype, "installmentPlans", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], StockIn.prototype, "createdAt", void 0);
StockIn = _ts_decorate([
    (0, _typeorm.Entity)('stock_ins')
], StockIn);

//# sourceMappingURL=stock-in.entity.js.map