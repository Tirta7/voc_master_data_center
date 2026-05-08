"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ShiftStockReport", {
    enumerable: true,
    get: function() {
        return ShiftStockReport;
    }
});
const _typeorm = require("typeorm");
const _ingrediententity = require("../../inventory/entities/ingredient.entity");
const _menuitementity = require("../../cafe/entities/menu-item.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let ShiftStockReport = class ShiftStockReport {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], ShiftStockReport.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)('Shift', (shift)=>shift.stockReports),
    (0, _typeorm.JoinColumn)({
        name: 'shiftId'
    }),
    _ts_metadata("design:type", typeof Shift === "undefined" ? Object : Shift)
], ShiftStockReport.prototype, "shift", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], ShiftStockReport.prototype, "shiftId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_ingrediententity.Ingredient, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'ingredientId'
    }),
    _ts_metadata("design:type", typeof _ingrediententity.Ingredient === "undefined" ? Object : _ingrediententity.Ingredient)
], ShiftStockReport.prototype, "ingredient", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], ShiftStockReport.prototype, "ingredientId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_menuitementity.MenuItem, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'menuItemId'
    }),
    _ts_metadata("design:type", typeof _menuitementity.MenuItem === "undefined" ? Object : _menuitementity.MenuItem)
], ShiftStockReport.prototype, "menuItem", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], ShiftStockReport.prototype, "menuItemId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], ShiftStockReport.prototype, "itemName", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 3,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], ShiftStockReport.prototype, "systemStock", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 3,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], ShiftStockReport.prototype, "physicalStock", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 3,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], ShiftStockReport.prototype, "discrepancy", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], ShiftStockReport.prototype, "lostValue", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], ShiftStockReport.prototype, "unit", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], ShiftStockReport.prototype, "note", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        length: 50,
        nullable: true
    }),
    _ts_metadata("design:type", String)
], ShiftStockReport.prototype, "department", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], ShiftStockReport.prototype, "createdAt", void 0);
ShiftStockReport = _ts_decorate([
    (0, _typeorm.Entity)('shift_stock_reports')
], ShiftStockReport);

//# sourceMappingURL=shift-stock-report.entity.js.map