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
    get Expense () {
        return Expense;
    },
    get ExpenseCategory () {
        return ExpenseCategory;
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
var ExpenseCategory = /*#__PURE__*/ function(ExpenseCategory) {
    ExpenseCategory["MAINTENANCE"] = "maintenance";
    ExpenseCategory["STAFF"] = "staff";
    ExpenseCategory["UTILITY"] = "utility";
    ExpenseCategory["INVENTORY"] = "inventory_stock";
    ExpenseCategory["MARKETING"] = "marketing";
    ExpenseCategory["OTHER"] = "other";
    return ExpenseCategory;
}({});
let Expense = class Expense {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Expense.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], Expense.prototype, "amount", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: ExpenseCategory,
        default: "other"
    }),
    _ts_metadata("design:type", String)
], Expense.prototype, "category", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text'
    }),
    _ts_metadata("design:type", String)
], Expense.prototype, "description", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Expense.prototype, "date", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], Expense.prototype, "recordedBy", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], Expense.prototype, "shiftId", void 0);
Expense = _ts_decorate([
    (0, _typeorm.Entity)('expenses')
], Expense);

//# sourceMappingURL=expense.entity.js.map