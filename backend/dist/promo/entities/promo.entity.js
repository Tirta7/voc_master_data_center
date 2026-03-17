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
    get Promo () {
        return Promo;
    },
    get PromoType () {
        return PromoType;
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
var PromoType = /*#__PURE__*/ function(PromoType) {
    PromoType["BUNDLE"] = "BUNDLE";
    PromoType["PACKAGE"] = "PACKAGE";
    PromoType["QUANTITY_DISCOUNT"] = "QUANTITY_DISCOUNT";
    PromoType["TIME_BASED"] = "TIME_BASED";
    return PromoType;
}({});
let Promo = class Promo {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Promo.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], Promo.prototype, "name", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: PromoType
    }),
    _ts_metadata("design:type", String)
], Promo.prototype, "type", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Promo.prototype, "description", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: true
    }),
    _ts_metadata("design:type", Boolean)
], Promo.prototype, "isActive", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Promo.prototype, "startDate", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Promo.prototype, "endDate", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json'
    }),
    _ts_metadata("design:type", Object)
], Promo.prototype, "ruleJson", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Promo.prototype, "usageCount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Promo.prototype, "totalRevenueContribution", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Promo.prototype, "totalProfitContribution", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Promo.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Promo.prototype, "updatedAt", void 0);
Promo = _ts_decorate([
    (0, _typeorm.Entity)('promos')
], Promo);

//# sourceMappingURL=promo.entity.js.map