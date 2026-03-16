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
    get Violation () {
        return Violation;
    },
    get ViolationType () {
        return ViolationType;
    }
});
const _typeorm = require("typeorm");
const _userentity = require("./user.entity");
const _shiftentity = require("../../finance/entities/shift.entity");
const _businessdayentity = require("../../finance/entities/business-day.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
var ViolationType = /*#__PURE__*/ function(ViolationType) {
    ViolationType["IDLE_TIMEOUT"] = "IDLE_TIMEOUT";
    ViolationType["LATE_LOGIN"] = "LATE_LOGIN";
    ViolationType["MANUAL_PENALTY"] = "MANUAL_PENALTY";
    return ViolationType;
}({});
let Violation = class Violation {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Violation.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User),
    (0, _typeorm.JoinColumn)({
        name: 'userId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], Violation.prototype, "user", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], Violation.prototype, "userId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: ViolationType
    }),
    _ts_metadata("design:type", String)
], Violation.prototype, "type", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Violation.prototype, "description", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Violation.prototype, "penaltyAmount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], Violation.prototype, "durationMinutes", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_shiftentity.Shift, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'shiftId'
    }),
    _ts_metadata("design:type", typeof _shiftentity.Shift === "undefined" ? Object : _shiftentity.Shift)
], Violation.prototype, "shift", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], Violation.prototype, "shiftId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_businessdayentity.BusinessDay, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'businessDayId'
    }),
    _ts_metadata("design:type", typeof _businessdayentity.BusinessDay === "undefined" ? Object : _businessdayentity.BusinessDay)
], Violation.prototype, "businessDay", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], Violation.prototype, "businessDayId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], Violation.prototype, "payrollReleaseId", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Violation.prototype, "createdAt", void 0);
Violation = _ts_decorate([
    (0, _typeorm.Entity)('violations')
], Violation);

//# sourceMappingURL=violation.entity.js.map