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
    get BattlePlan () {
        return BattlePlan;
    },
    get BattlePlanStatus () {
        return BattlePlanStatus;
    }
});
const _typeorm = require("typeorm");
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
var BattlePlanStatus = /*#__PURE__*/ function(BattlePlanStatus) {
    BattlePlanStatus["DRAFT"] = "DRAFT";
    BattlePlanStatus["PUBLISHED"] = "PUBLISHED";
    return BattlePlanStatus;
}({});
let BattlePlan = class BattlePlan {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], BattlePlan.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_businessdayentity.BusinessDay),
    (0, _typeorm.JoinColumn)({
        name: 'businessDayId'
    }),
    _ts_metadata("design:type", typeof _businessdayentity.BusinessDay === "undefined" ? Object : _businessdayentity.BusinessDay)
], BattlePlan.prototype, "businessDay", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int'
    }),
    _ts_metadata("design:type", Number)
], BattlePlan.prototype, "businessDayId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], BattlePlan.prototype, "targetRevenue", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], BattlePlan.prototype, "predictedRevenue", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: BattlePlanStatus,
        default: "DRAFT"
    }),
    _ts_metadata("design:type", String)
], BattlePlan.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], BattlePlan.prototype, "aiStrategyBrief", void 0);
_ts_decorate([
    (0, _typeorm.OneToMany)('BattlePlanItem', 'battlePlan', {
        cascade: true
    }),
    _ts_metadata("design:type", Array)
], BattlePlan.prototype, "items", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], BattlePlan.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], BattlePlan.prototype, "updatedAt", void 0);
BattlePlan = _ts_decorate([
    (0, _typeorm.Entity)('battle_plans')
], BattlePlan);

//# sourceMappingURL=battle-plan.entity.js.map