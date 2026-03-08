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
    get Shift () {
        return Shift;
    },
    get ShiftStatus () {
        return ShiftStatus;
    }
});
const _typeorm = require("typeorm");
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
var ShiftStatus = /*#__PURE__*/ function(ShiftStatus) {
    ShiftStatus["OPEN"] = "OPEN";
    ShiftStatus["CLOSED"] = "CLOSED";
    return ShiftStatus;
}({});
let Shift = class Shift {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Shift.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'userId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], Shift.prototype, "user", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], Shift.prototype, "userId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)('BusinessDay', (bd)=>bd.shifts),
    (0, _typeorm.JoinColumn)({
        name: 'businessDayId'
    }),
    _ts_metadata("design:type", typeof BusinessDay === "undefined" ? Object : BusinessDay)
], Shift.prototype, "businessDay", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], Shift.prototype, "businessDayId", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Shift.prototype, "startTime", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Shift.prototype, "shiftName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Shift.prototype, "endTime", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Shift.prototype, "cashStart", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Shift.prototype, "cashSystem", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Shift.prototype, "cashPhysical", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Shift.prototype, "discrepancy", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Shift.prototype, "totalTopUp", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Shift.prototype, "note", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: ShiftStatus,
        default: "OPEN"
    }),
    _ts_metadata("design:type", String)
], Shift.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Shift.prototype, "startedBy", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Shift.prototype, "endedBy", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: true
    }),
    _ts_metadata("design:type", Boolean)
], Shift.prototype, "isActive", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Shift.prototype, "latenessMinutes", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Shift.prototype, "overtimeMinutes", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'simple-json',
        nullable: true
    }),
    _ts_metadata("design:type", Array)
], Shift.prototype, "assignedTableIds", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Shift.prototype, "performanceSummary", void 0);
_ts_decorate([
    (0, _typeorm.OneToMany)('ShiftStockReport', (ssr)=>ssr.shift),
    _ts_metadata("design:type", Array)
], Shift.prototype, "stockReports", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Shift.prototype, "createdAt", void 0);
Shift = _ts_decorate([
    (0, _typeorm.Entity)('shifts')
], Shift);

//# sourceMappingURL=shift.entity.js.map