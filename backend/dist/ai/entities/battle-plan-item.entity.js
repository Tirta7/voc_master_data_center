"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "BattlePlanItem", {
    enumerable: true,
    get: function() {
        return BattlePlanItem;
    }
});
const _typeorm = require("typeorm");
const _battleplanentity = require("./battle-plan.entity.js");
const _menuitementity = require("../../cafe/entities/menu-item.entity.js");
const _billiardpackageentity = require("../../billiard/entities/billiard-package.entity.js");
const _promoentity = require("../../promo/entities/promo.entity.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let BattlePlanItem = class BattlePlanItem {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], BattlePlanItem.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)('BattlePlan', 'items', {
        onDelete: 'CASCADE'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'battlePlanId'
    }),
    _ts_metadata("design:type", typeof _battleplanentity.BattlePlan === "undefined" ? Object : _battleplanentity.BattlePlan)
], BattlePlanItem.prototype, "battlePlan", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int'
    }),
    _ts_metadata("design:type", Number)
], BattlePlanItem.prototype, "battlePlanId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_menuitementity.MenuItem, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'menuItemId'
    }),
    _ts_metadata("design:type", typeof _menuitementity.MenuItem === "undefined" ? Object : _menuitementity.MenuItem)
], BattlePlanItem.prototype, "menuItem", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], BattlePlanItem.prototype, "menuItemId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_billiardpackageentity.BilliardPackage, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'packageId'
    }),
    _ts_metadata("design:type", typeof _billiardpackageentity.BilliardPackage === "undefined" ? Object : _billiardpackageentity.BilliardPackage)
], BattlePlanItem.prototype, "billiardPackage", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], BattlePlanItem.prototype, "packageId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_promoentity.Promo, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'promoId'
    }),
    _ts_metadata("design:type", typeof _promoentity.Promo === "undefined" ? Object : _promoentity.Promo)
], BattlePlanItem.prototype, "promo", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], BattlePlanItem.prototype, "promoId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int'
    }),
    _ts_metadata("design:type", Number)
], BattlePlanItem.prototype, "targetQuantity", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 0
    }),
    _ts_metadata("design:type", Number)
], BattlePlanItem.prototype, "soldQuantity", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], BattlePlanItem.prototype, "aiLabel", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], BattlePlanItem.prototype, "isAutoBroadcastEnabled", void 0);
BattlePlanItem = _ts_decorate([
    (0, _typeorm.Entity)('battle_plan_items')
], BattlePlanItem);

//# sourceMappingURL=battle-plan-item.entity.js.map