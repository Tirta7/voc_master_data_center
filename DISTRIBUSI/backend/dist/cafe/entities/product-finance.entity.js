"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ProductFinance", {
    enumerable: true,
    get: function() {
        return ProductFinance;
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
let ProductFinance = class ProductFinance {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], ProductFinance.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.OneToOne)('MenuItem', 'productFinance', {
        onDelete: 'CASCADE'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'menuItemId'
    }),
    _ts_metadata("design:type", typeof Relation === "undefined" ? Object : Relation)
], ProductFinance.prototype, "menuItem", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], ProductFinance.prototype, "menuItemId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], ProductFinance.prototype, "baseHpp", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], ProductFinance.prototype, "targetMarginPercent", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], ProductFinance.prototype, "targetMarkupFixed", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], ProductFinance.prototype, "targetMarkupPercent", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 1
    }),
    _ts_metadata("design:type", Number)
], ProductFinance.prototype, "targetMultiplier", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 35
    }),
    _ts_metadata("design:type", Number)
], ProductFinance.prototype, "maxHppThreshold", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], ProductFinance.prototype, "pricingAdvice", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], ProductFinance.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], ProductFinance.prototype, "updatedAt", void 0);
ProductFinance = _ts_decorate([
    (0, _typeorm.Entity)('product_finances')
], ProductFinance);

//# sourceMappingURL=product-finance.entity.js.map