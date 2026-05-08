"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PayrollConfig", {
    enumerable: true,
    get: function() {
        return PayrollConfig;
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
let PayrollConfig = class PayrollConfig {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], PayrollConfig.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.OneToOne)('User', (user)=>user.payrollConfig),
    (0, _typeorm.JoinColumn)(),
    _ts_metadata("design:type", Object)
], PayrollConfig.prototype, "user", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], PayrollConfig.prototype, "basicSalary", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], PayrollConfig.prototype, "overtimeRate", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], PayrollConfig.prototype, "commissionService", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], PayrollConfig.prototype, "commissionSalesPercent", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", typeof Record === "undefined" ? Object : Record)
], PayrollConfig.prototype, "categoryCommissions", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], PayrollConfig.prototype, "penaltyLate", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], PayrollConfig.prototype, "penaltyIdle", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 5
    }),
    _ts_metadata("design:type", Number)
], PayrollConfig.prototype, "idleThreshold", void 0);
PayrollConfig = _ts_decorate([
    (0, _typeorm.Entity)('payroll_configs')
], PayrollConfig);

//# sourceMappingURL=payroll-config.entity.js.map