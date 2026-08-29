"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UpsellPrompt", {
    enumerable: true,
    get: function() {
        return UpsellPrompt;
    }
});
const _typeorm = require("typeorm");
const _menuitementity = require("../../cafe/entities/menu-item.entity");
const _businessdayentity = require("../../finance/entities/business-day.entity");
const _promoentity = require("../../promo/entities/promo.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let UpsellPrompt = class UpsellPrompt {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], UpsellPrompt.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int'
    }),
    _ts_metadata("design:type", Number)
], UpsellPrompt.prototype, "businessDayId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_businessdayentity.BusinessDay),
    _ts_metadata("design:type", typeof _businessdayentity.BusinessDay === "undefined" ? Object : _businessdayentity.BusinessDay)
], UpsellPrompt.prototype, "businessDay", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], UpsellPrompt.prototype, "menuItemId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_menuitementity.MenuItem),
    _ts_metadata("design:type", typeof _menuitementity.MenuItem === "undefined" ? Object : _menuitementity.MenuItem)
], UpsellPrompt.prototype, "menuItem", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], UpsellPrompt.prototype, "packageId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], UpsellPrompt.prototype, "promoId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_promoentity.Promo),
    _ts_metadata("design:type", typeof _promoentity.Promo === "undefined" ? Object : _promoentity.Promo)
], UpsellPrompt.prototype, "promo", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], UpsellPrompt.prototype, "tableId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], UpsellPrompt.prototype, "tableName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], UpsellPrompt.prototype, "isConverted", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], UpsellPrompt.prototype, "isAcknowledged", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'timestamp',
        nullable: true
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], UpsellPrompt.prototype, "convertedAt", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], UpsellPrompt.prototype, "transactionId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], UpsellPrompt.prototype, "convertedByUserId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], UpsellPrompt.prototype, "convertedByUserName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], UpsellPrompt.prototype, "message", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], UpsellPrompt.prototype, "isManual", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: 0
    }),
    _ts_metadata("design:type", Number)
], UpsellPrompt.prototype, "ackCount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], UpsellPrompt.prototype, "conversionValue", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], UpsellPrompt.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], UpsellPrompt.prototype, "updatedAt", void 0);
UpsellPrompt = _ts_decorate([
    (0, _typeorm.Entity)('ai_upsell_prompts'),
    (0, _typeorm.Index)([
        'businessDayId',
        'isConverted'
    ])
], UpsellPrompt);

//# sourceMappingURL=upsell-prompt.entity.js.map