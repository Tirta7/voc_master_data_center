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
    get BusinessClosure () {
        return BusinessClosure;
    },
    get PublicHoliday () {
        return PublicHoliday;
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
let PublicHoliday = class PublicHoliday {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], PublicHoliday.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], PublicHoliday.prototype, "name", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'date'
    }),
    _ts_metadata("design:type", String)
], PublicHoliday.prototype, "date", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: true
    }),
    _ts_metadata("design:type", Boolean)
], PublicHoliday.prototype, "isClosure", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], PublicHoliday.prototype, "createdAt", void 0);
PublicHoliday = _ts_decorate([
    (0, _typeorm.Entity)('public_holidays')
], PublicHoliday);
let BusinessClosure = class BusinessClosure {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], BusinessClosure.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'date'
    }),
    _ts_metadata("design:type", String)
], BusinessClosure.prototype, "startDate", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'date'
    }),
    _ts_metadata("design:type", String)
], BusinessClosure.prototype, "endDate", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], BusinessClosure.prototype, "reason", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], BusinessClosure.prototype, "createdAt", void 0);
BusinessClosure = _ts_decorate([
    (0, _typeorm.Entity)('business_closures')
], BusinessClosure);

//# sourceMappingURL=holiday.entity.js.map