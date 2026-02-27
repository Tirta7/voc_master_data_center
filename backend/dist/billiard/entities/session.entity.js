"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Session", {
    enumerable: true,
    get: function() {
        return Session;
    }
});
const _typeorm = require("typeorm");
const _tableentity = require("./table.entity");
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
let Session = class Session {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Session.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_tableentity.Table),
    _ts_metadata("design:type", typeof _tableentity.Table === "undefined" ? Object : _tableentity.Table)
], Session.prototype, "table", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_memberentity.Member, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'memberId'
    }),
    _ts_metadata("design:type", typeof _memberentity.Member === "undefined" ? Object : _memberentity.Member)
], Session.prototype, "member", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Session.prototype, "memberId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: [
            'prepaid',
            'open'
        ]
    }),
    _ts_metadata("design:type", String)
], Session.prototype, "sessionType", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp'
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Session.prototype, "startTime", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Session.prototype, "endTime", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], Session.prototype, "durationMinutes", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Session.prototype, "totalPrice", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], Session.prototype, "isPaid", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Session.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Session.prototype, "updatedAt", void 0);
Session = _ts_decorate([
    (0, _typeorm.Entity)('sessions')
], Session);

//# sourceMappingURL=session.entity.js.map