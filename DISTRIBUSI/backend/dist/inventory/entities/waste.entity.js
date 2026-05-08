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
    get Waste () {
        return Waste;
    },
    get WasteStatus () {
        return WasteStatus;
    }
});
const _typeorm = require("typeorm");
const _ingrediententity = require("./ingredient.entity");
const _userentity = require("../../user/entities/user.entity");
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
var WasteStatus = /*#__PURE__*/ function(WasteStatus) {
    WasteStatus["PENDING"] = "PENDING";
    WasteStatus["APPROVED"] = "APPROVED";
    WasteStatus["REJECTED"] = "REJECTED";
    return WasteStatus;
}({});
let Waste = class Waste {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Waste.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], Waste.prototype, "ingredientId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_ingrediententity.Ingredient),
    (0, _typeorm.JoinColumn)({
        name: 'ingredientId'
    }),
    _ts_metadata("design:type", typeof _ingrediententity.Ingredient === "undefined" ? Object : _ingrediententity.Ingredient)
], Waste.prototype, "ingredient", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 10,
        scale: 3
    }),
    _ts_metadata("design:type", Number)
], Waste.prototype, "quantity", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 15,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], Waste.prototype, "valuation", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text'
    }),
    _ts_metadata("design:type", String)
], Waste.prototype, "reason", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: WasteStatus,
        default: "PENDING"
    }),
    _ts_metadata("design:type", String)
], Waste.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], Waste.prototype, "recordedByUserId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User),
    (0, _typeorm.JoinColumn)({
        name: 'recordedByUserId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], Waste.prototype, "recordedBy", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], Waste.prototype, "businessDayId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_businessdayentity.BusinessDay),
    (0, _typeorm.JoinColumn)({
        name: 'businessDayId'
    }),
    _ts_metadata("design:type", typeof _businessdayentity.BusinessDay === "undefined" ? Object : _businessdayentity.BusinessDay)
], Waste.prototype, "businessDay", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Waste.prototype, "imageUrl", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Waste.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.DeleteDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Waste.prototype, "deletedAt", void 0);
Waste = _ts_decorate([
    (0, _typeorm.Entity)('inventory_waste')
], Waste);

//# sourceMappingURL=waste.entity.js.map