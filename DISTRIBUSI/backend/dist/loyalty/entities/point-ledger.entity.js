"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PointLedger", {
    enumerable: true,
    get: function() {
        return PointLedger;
    }
});
const _typeorm = require("typeorm");
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
let PointLedger = class PointLedger {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)('increment', {
        type: 'bigint'
    }),
    _ts_metadata("design:type", Number)
], PointLedger.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Index)(),
    (0, _typeorm.Column)({
        type: 'int'
    }),
    _ts_metadata("design:type", Number)
], PointLedger.prototype, "memberId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_memberentity.Member, {
        onDelete: 'CASCADE'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'memberId'
    }),
    _ts_metadata("design:type", typeof _memberentity.Member === "undefined" ? Object : _memberentity.Member)
], PointLedger.prototype, "member", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: [
            'EARN',
            'REDEEM',
            'GAME_PLAY',
            'GAME_WIN',
            'ADJUSTMENT',
            'EXPIRY',
            'MISSION_REWARD',
            'REFERRAL',
            'TOPUP_BONUS'
        ]
    }),
    _ts_metadata("design:type", String)
], PointLedger.prototype, "type", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int'
    }),
    _ts_metadata("design:type", Number)
], PointLedger.prototype, "amount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], PointLedger.prototype, "description", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], PointLedger.prototype, "referenceId", void 0);
_ts_decorate([
    (0, _typeorm.Index)(),
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], PointLedger.prototype, "createdAt", void 0);
PointLedger = _ts_decorate([
    (0, _typeorm.Entity)('point_ledgers')
], PointLedger);

//# sourceMappingURL=point-ledger.entity.js.map