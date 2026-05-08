"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "LockerSession", {
    enumerable: true,
    get: function() {
        return LockerSession;
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
let LockerSession = class LockerSession {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], LockerSession.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)('Locker', (locker)=>locker.sessions, {
        onDelete: 'CASCADE'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'lockerId'
    }),
    _ts_metadata("design:type", typeof Relation === "undefined" ? Object : Relation)
], LockerSession.prototype, "locker", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], LockerSession.prototype, "lockerId", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], LockerSession.prototype, "customerName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        type: 'varchar'
    }),
    _ts_metadata("design:type", String)
], LockerSession.prototype, "phone", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        type: 'varchar'
    }),
    _ts_metadata("design:type", String)
], LockerSession.prototype, "identityNumber", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], LockerSession.prototype, "pinHash", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        type: 'int'
    }),
    _ts_metadata("design:type", Object)
], LockerSession.prototype, "memberId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        type: 'varchar'
    }),
    _ts_metadata("design:type", Object)
], LockerSession.prototype, "memberName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], LockerSession.prototype, "isMemberFree", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], LockerSession.prototype, "price", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp'
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], LockerSession.prototype, "startTime", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], LockerSession.prototype, "endTime", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        default: 'ACTIVE'
    }),
    _ts_metadata("design:type", typeof SessionStatus === "undefined" ? Object : SessionStatus)
], LockerSession.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        type: 'varchar'
    }),
    _ts_metadata("design:type", String)
], LockerSession.prototype, "handledByName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        type: 'int'
    }),
    _ts_metadata("design:type", Object)
], LockerSession.prototype, "handledById", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: 0
    }),
    _ts_metadata("design:type", Number)
], LockerSession.prototype, "failedPinAttempts", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], LockerSession.prototype, "isLocked", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], LockerSession.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], LockerSession.prototype, "updatedAt", void 0);
LockerSession = _ts_decorate([
    (0, _typeorm.Entity)('locker_sessions')
], LockerSession);

//# sourceMappingURL=locker-session.entity.js.map