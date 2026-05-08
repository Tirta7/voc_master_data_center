"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "EmployeeShiftSchedule", {
    enumerable: true,
    get: function() {
        return EmployeeShiftSchedule;
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
let EmployeeShiftSchedule = class EmployeeShiftSchedule {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], EmployeeShiftSchedule.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], EmployeeShiftSchedule.prototype, "userId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        eager: true,
        onDelete: 'CASCADE'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'userId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], EmployeeShiftSchedule.prototype, "user", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'date'
    }),
    _ts_metadata("design:type", String)
], EmployeeShiftSchedule.prototype, "date", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar'
    }),
    _ts_metadata("design:type", String)
], EmployeeShiftSchedule.prototype, "shiftName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], EmployeeShiftSchedule.prototype, "isSwap", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], EmployeeShiftSchedule.prototype, "swappedWithUserId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        nullable: true,
        eager: false
    }),
    (0, _typeorm.JoinColumn)({
        name: 'swappedWithUserId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], EmployeeShiftSchedule.prototype, "swappedWith", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], EmployeeShiftSchedule.prototype, "swapNote", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], EmployeeShiftSchedule.prototype, "createdByAdminId", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], EmployeeShiftSchedule.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], EmployeeShiftSchedule.prototype, "updatedAt", void 0);
EmployeeShiftSchedule = _ts_decorate([
    (0, _typeorm.Entity)('employee_shift_schedules'),
    (0, _typeorm.Index)([
        'userId',
        'date'
    ], {
        unique: true
    })
], EmployeeShiftSchedule);

//# sourceMappingURL=employee-shift-schedule.entity.js.map