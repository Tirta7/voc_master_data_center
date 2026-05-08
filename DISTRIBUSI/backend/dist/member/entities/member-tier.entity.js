"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MemberTier", {
    enumerable: true,
    get: function() {
        return MemberTier;
    }
});
const _typeorm = require("typeorm");
const _memberentity = require("./member.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let MemberTier = class MemberTier {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], MemberTier.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        unique: true
    }),
    _ts_metadata("design:type", String)
], MemberTier.prototype, "name", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json'
    }),
    _ts_metadata("design:type", Object)
], MemberTier.prototype, "discountConfig", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: '00:00'
    }),
    _ts_metadata("design:type", String)
], MemberTier.prototype, "activeStartTime", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: '23:59'
    }),
    _ts_metadata("design:type", String)
], MemberTier.prototype, "activeEndTime", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 1
    }),
    _ts_metadata("design:type", Number)
], MemberTier.prototype, "pointMultiplier", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Array)
], MemberTier.prototype, "activeDates", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Array)
], MemberTier.prototype, "activeDays", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: true
    }),
    _ts_metadata("design:type", Boolean)
], MemberTier.prototype, "isActive", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 15,
        scale: 2,
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], MemberTier.prototype, "autoUpgradeSpend", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 15,
        scale: 2,
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], MemberTier.prototype, "minimumTopUp", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], MemberTier.prototype, "birthdayDiscountPct", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], MemberTier.prototype, "doublePointDays", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], MemberTier.prototype, "bonusTopupConfig", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], MemberTier.prototype, "freeItemTrigger", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], MemberTier.prototype, "referralBonusPoints", void 0);
_ts_decorate([
    (0, _typeorm.OneToMany)(()=>_memberentity.Member, (member)=>member.tier),
    _ts_metadata("design:type", Array)
], MemberTier.prototype, "members", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], MemberTier.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], MemberTier.prototype, "updatedAt", void 0);
MemberTier = _ts_decorate([
    (0, _typeorm.Entity)('member_tiers')
], MemberTier);

//# sourceMappingURL=member-tier.entity.js.map