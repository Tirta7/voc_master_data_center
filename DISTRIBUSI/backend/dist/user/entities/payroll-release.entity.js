"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PayrollRelease", {
    enumerable: true,
    get: function() {
        return PayrollRelease;
    }
});
const _typeorm = require("typeorm");
const _userentity = require("./user.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let PayrollRelease = class PayrollRelease {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], PayrollRelease.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'userId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], PayrollRelease.prototype, "user", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], PayrollRelease.prototype, "userId", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], PayrollRelease.prototype, "month", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], PayrollRelease.prototype, "year", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], PayrollRelease.prototype, "basicSalary", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], PayrollRelease.prototype, "commissionService", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], PayrollRelease.prototype, "commissionSales", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], PayrollRelease.prototype, "commissionProduction", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], PayrollRelease.prototype, "penalties", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], PayrollRelease.prototype, "totalPayout", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], PayrollRelease.prototype, "details", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], PayrollRelease.prototype, "releasedAt", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)('User'),
    (0, _typeorm.JoinColumn)({
        name: 'releasedByUserId'
    }),
    _ts_metadata("design:type", Object)
], PayrollRelease.prototype, "releasedBy", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], PayrollRelease.prototype, "releasedByUserId", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], PayrollRelease.prototype, "createdAt", void 0);
PayrollRelease = _ts_decorate([
    (0, _typeorm.Entity)('payroll_releases'),
    (0, _typeorm.Index)([
        'userId',
        'month',
        'year'
    ])
], PayrollRelease);

//# sourceMappingURL=payroll-release.entity.js.map