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
    get BilliardPackage () {
        return BilliardPackage;
    },
    get PackageType () {
        return PackageType;
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
var PackageType = /*#__PURE__*/ function(PackageType) {
    PackageType["HOURLY"] = "hourly";
    PackageType["FIXED"] = "fixed";
    PackageType["DURATION"] = "DURATION";
    PackageType["PLAYTIME"] = "PLAYTIME";
    return PackageType;
}({});
let BilliardPackage = class BilliardPackage {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], BilliardPackage.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], BilliardPackage.prototype, "name", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: [
            'REGULAR',
            'VIP',
            'PS_REGULAR',
            'PS_VIP'
        ],
        default: 'REGULAR'
    }),
    _ts_metadata("design:type", String)
], BilliardPackage.prototype, "tableCategory", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: PackageType,
        default: "hourly"
    }),
    _ts_metadata("design:type", String)
], BilliardPackage.prototype, "type", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], BilliardPackage.prototype, "durationMinutes", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], BilliardPackage.prototype, "price", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], BilliardPackage.prototype, "minutePrice", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Array)
], BilliardPackage.prototype, "timeSlots", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: true
    }),
    _ts_metadata("design:type", Boolean)
], BilliardPackage.prototype, "isActive", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], BilliardPackage.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], BilliardPackage.prototype, "updatedAt", void 0);
BilliardPackage = _ts_decorate([
    (0, _typeorm.Entity)('billiard_packages')
], BilliardPackage);

//# sourceMappingURL=billiard-package.entity.js.map