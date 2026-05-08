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
    get Attendance () {
        return Attendance;
    },
    get AttendanceStatus () {
        return AttendanceStatus;
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
var AttendanceStatus = /*#__PURE__*/ function(AttendanceStatus) {
    AttendanceStatus["PRESENT"] = "PRESENT";
    AttendanceStatus["LATE"] = "LATE";
    AttendanceStatus["OVERTIME"] = "OVERTIME";
    AttendanceStatus["ABSENT"] = "ABSENT";
    AttendanceStatus["PENDING"] = "PENDING";
    AttendanceStatus["SAKIT"] = "SAKIT";
    AttendanceStatus["IZIN"] = "IZIN";
    AttendanceStatus["ALPHA"] = "ALPHA";
    return AttendanceStatus;
}({});
let Attendance = class Attendance {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Attendance.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], Attendance.prototype, "userId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        eager: true,
        onDelete: 'CASCADE'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'userId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], Attendance.prototype, "user", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'date'
    }),
    _ts_metadata("design:type", String)
], Attendance.prototype, "date", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Attendance.prototype, "checkInTime", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Attendance.prototype, "checkOutTime", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Attendance.prototype, "workDurationMinutes", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: AttendanceStatus,
        default: "PRESENT"
    }),
    _ts_metadata("design:type", String)
], Attendance.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], Attendance.prototype, "isApproved", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Attendance.prototype, "approvedBy", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Attendance.prototype, "approvedAt", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Attendance.prototype, "overtimeMinutes", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], Attendance.prototype, "isManual", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Attendance.prototype, "shiftName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Attendance.prototype, "note", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Attendance.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Attendance.prototype, "updatedAt", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Attendance.prototype, "payrollReleaseId", void 0);
Attendance = _ts_decorate([
    (0, _typeorm.Entity)('attendances'),
    (0, _typeorm.Index)([
        'userId',
        'date'
    ], {
        unique: true
    })
], Attendance);

//# sourceMappingURL=attendance.entity.js.map