"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Member", {
    enumerable: true,
    get: function() {
        return Member;
    }
});
const _typeorm = require("typeorm");
const _membertierentity = require("./member-tier.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let Member = class Member {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Member.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        unique: true,
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Member.prototype, "rfidUid", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], Member.prototype, "name", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        unique: true,
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Member.prototype, "memberCode", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Member.prototype, "phone", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Member.prototype, "balance", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Member.prototype, "discountPercentage", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_membertierentity.MemberTier, (tier)=>tier.members, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'tierId'
    }),
    _ts_metadata("design:type", Object)
], Member.prototype, "tier", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Member.prototype, "tierId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Member.prototype, "expiryDate", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: 1
    }),
    _ts_metadata("design:type", Number)
], Member.prototype, "securityVersion", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: true
    }),
    _ts_metadata("design:type", Boolean)
], Member.prototype, "isActive", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Member.prototype, "points", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Member.prototype, "targetWinRate", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Member.prototype, "totalSpend", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'date',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Member.prototype, "birthDate", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        unique: true,
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Member.prototype, "referralCode", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Member.prototype, "referredById", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Member.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Member.prototype, "updatedAt", void 0);
Member = _ts_decorate([
    (0, _typeorm.Entity)('members'),
    (0, _typeorm.Index)('idx_members_tier', [
        'tierId'
    ]),
    (0, _typeorm.Index)('idx_members_referred_by', [
        'referredById'
    ])
], Member);

//# sourceMappingURL=member.entity.js.map