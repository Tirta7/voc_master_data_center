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
    get Cashflow () {
        return Cashflow;
    },
    get CashflowType () {
        return CashflowType;
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
var CashflowType = /*#__PURE__*/ function(CashflowType) {
    CashflowType["IN"] = "in";
    CashflowType["OUT"] = "out";
    return CashflowType;
}({});
let Cashflow = class Cashflow {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Cashflow.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], Cashflow.prototype, "amount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: CashflowType
    }),
    _ts_metadata("design:type", String)
], Cashflow.prototype, "type", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], Cashflow.prototype, "source", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Cashflow.prototype, "referenceId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Cashflow.prototype, "description", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Cashflow.prototype, "timestamp", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], Cashflow.prototype, "balanceAfter", void 0);
Cashflow = _ts_decorate([
    (0, _typeorm.Entity)('cashflow'),
    (0, _typeorm.Index)('idx_cashflow_timestamp', [
        'timestamp'
    ]),
    (0, _typeorm.Index)('idx_cashflow_type_timestamp', [
        'type',
        'timestamp'
    ])
], Cashflow);

//# sourceMappingURL=cashflow.entity.js.map