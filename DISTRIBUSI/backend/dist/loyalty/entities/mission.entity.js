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
    get MemberMission () {
        return MemberMission;
    },
    get Mission () {
        return Mission;
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
let Mission = class Mission {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Mission.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], Mission.prototype, "title", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text'
    }),
    _ts_metadata("design:type", String)
], Mission.prototype, "description", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], Mission.prototype, "code", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int'
    }),
    _ts_metadata("design:type", Number)
], Mission.prototype, "rewardPoints", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 1
    }),
    _ts_metadata("design:type", Number)
], Mission.prototype, "targetValue", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'boolean',
        default: true
    }),
    _ts_metadata("design:type", Boolean)
], Mission.prototype, "isActive", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Mission.prototype, "icon", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Mission.prototype, "createdAt", void 0);
Mission = _ts_decorate([
    (0, _typeorm.Entity)('missions')
], Mission);
let MemberMission = class MemberMission {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], MemberMission.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], MemberMission.prototype, "memberId", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], MemberMission.prototype, "missionId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 0
    }),
    _ts_metadata("design:type", Number)
], MemberMission.prototype, "currentValue", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'boolean',
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], MemberMission.prototype, "isCompleted", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'boolean',
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], MemberMission.prototype, "isClaimed", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], MemberMission.prototype, "updatedAt", void 0);
MemberMission = _ts_decorate([
    (0, _typeorm.Entity)('member_missions')
], MemberMission);

//# sourceMappingURL=mission.entity.js.map