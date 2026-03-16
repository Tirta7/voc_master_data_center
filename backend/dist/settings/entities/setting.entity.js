"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Setting", {
    enumerable: true,
    get: function() {
        return Setting;
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
let Setting = class Setting {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Setting.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: 'My Billiard & Cafe'
    }),
    _ts_metadata("design:type", String)
], Setting.prototype, "businessName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Setting.prototype, "address", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Setting.prototype, "contact", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Setting.prototype, "socialMediaLink", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Setting.prototype, "logoPath", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Setting.prototype, "ppnPercentage", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Setting.prototype, "serviceChargePercentage", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 100
    }),
    _ts_metadata("design:type", Number)
], Setting.prototype, "roundingKelipatan", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: '00:00'
    }),
    _ts_metadata("design:type", String)
], Setting.prototype, "businessDayOffset", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: '03:00'
    }),
    _ts_metadata("design:type", String)
], Setting.prototype, "autoMaintenanceTime", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Setting.prototype, "printerMapping", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Array)
], Setting.prototype, "availablePaymentMethods", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: '127.0.0.1'
    }),
    _ts_metadata("design:type", String)
], Setting.prototype, "mqttBrokerAddress", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Setting.prototype, "invoiceBusinessName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Setting.prototype, "invoiceAddress", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Setting.prototype, "invoiceContact", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Setting.prototype, "invoiceSocialMedia", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Setting.prototype, "invoiceFooterNote", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Setting.prototype, "customDurationPricingRegular", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Setting.prototype, "customDurationPricingVip", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Array)
], Setting.prototype, "availableShifts", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 5
    }),
    _ts_metadata("design:type", Number)
], Setting.prototype, "endingSoonThreshold", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 2000
    }),
    _ts_metadata("design:type", Number)
], Setting.prototype, "balanceBuffer", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 15
    }),
    _ts_metadata("design:type", Number)
], Setting.prototype, "balanceWarningMinutes", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 1000
    }),
    _ts_metadata("design:type", Number)
], Setting.prototype, "royaltyPointsPerAmount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 200
    }),
    _ts_metadata("design:type", Number)
], Setting.prototype, "royaltyPointRedeemValue", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 5
    }),
    _ts_metadata("design:type", Number)
], Setting.prototype, "scratchBombWinRate", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        default: '1,2,5,10,20,50,100'
    }),
    _ts_metadata("design:type", String)
], Setting.prototype, "scratchBombRewards", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 25
    }),
    _ts_metadata("design:type", Number)
], Setting.prototype, "scratchBombAvgWinPts", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'boolean',
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], Setting.prototype, "gamificationAutoPilot", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 5000000
    }),
    _ts_metadata("design:type", Number)
], Setting.prototype, "gamificationTargetSurplus", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 2
    }),
    _ts_metadata("design:type", Number)
], Setting.prototype, "scratchBombPlayCost", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 90
    }),
    _ts_metadata("design:type", Number)
], Setting.prototype, "pointExpiryDays", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Setting.prototype, "scratchBombPool", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 15
    }),
    _ts_metadata("design:type", Number)
], Setting.prototype, "mahjongSlotWinRate", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Setting.prototype, "mahjongSlotPool", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'boolean',
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], Setting.prototype, "isEmergencyMode", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        default: 80
    }),
    _ts_metadata("design:type", Number)
], Setting.prototype, "printerWidth", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'json',
        nullable: true
    }),
    _ts_metadata("design:type", Array)
], Setting.prototype, "displayPromotions", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Setting.prototype, "ownerPhone", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], Setting.prototype, "autoReportEnabled", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: '23:55'
    }),
    _ts_metadata("design:type", String)
], Setting.prototype, "reportSchedule", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Setting.prototype, "waTemplateWelcome", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Setting.prototype, "waTemplateSessionEnd", void 0);
Setting = _ts_decorate([
    (0, _typeorm.Entity)('settings')
], Setting);

//# sourceMappingURL=setting.entity.js.map