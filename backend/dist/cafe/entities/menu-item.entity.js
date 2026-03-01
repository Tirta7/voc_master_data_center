"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MenuItem", {
    enumerable: true,
    get: function() {
        return MenuItem;
    }
});
const _typeorm = require("typeorm");
const _recipeentity = require("../../inventory/entities/recipe.entity");
const _categoryentity = require("./category.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let MenuItem = class MenuItem {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], MenuItem.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        unique: true
    }),
    _ts_metadata("design:type", String)
], MenuItem.prototype, "name", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_categoryentity.Category, (category)=>category.menuItems, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'categoryId'
    }),
    _ts_metadata("design:type", typeof _categoryentity.Category === "undefined" ? Object : _categoryentity.Category)
], MenuItem.prototype, "category", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], MenuItem.prototype, "categoryId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: _categoryentity.ProductionTarget,
        nullable: true,
        comment: 'Override category production target if needed'
    }),
    _ts_metadata("design:type", typeof _categoryentity.ProductionTarget === "undefined" ? Object : _categoryentity.ProductionTarget)
], MenuItem.prototype, "productionTarget", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'date',
        nullable: true
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], MenuItem.prototype, "expiryDate", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        unique: true,
        nullable: true
    }),
    _ts_metadata("design:type", String)
], MenuItem.prototype, "sku", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], MenuItem.prototype, "description", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], MenuItem.prototype, "imageUrl", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 10,
        scale: 2
    }),
    _ts_metadata("design:type", Number)
], MenuItem.prototype, "price", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: true
    }),
    _ts_metadata("design:type", Boolean)
], MenuItem.prototype, "isActive", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], MenuItem.prototype, "taxPercentage", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 10,
        scale: 3,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], MenuItem.prototype, "stockQuantity", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 10,
        scale: 3,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], MenuItem.prototype, "minStockLevel", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], MenuItem.prototype, "isSubRecipe", void 0);
_ts_decorate([
    (0, _typeorm.OneToMany)(()=>_recipeentity.Recipe, (recipe)=>recipe.menuItem),
    _ts_metadata("design:type", Array)
], MenuItem.prototype, "recipes", void 0);
_ts_decorate([
    (0, _typeorm.OneToOne)('ProductFinance', 'menuItem', {
        cascade: true
    }),
    _ts_metadata("design:type", typeof Relation === "undefined" ? Object : Relation)
], MenuItem.prototype, "productFinance", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 100
    }),
    _ts_metadata("design:type", Number)
], MenuItem.prototype, "yieldPercentage", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], MenuItem.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], MenuItem.prototype, "updatedAt", void 0);
MenuItem = _ts_decorate([
    (0, _typeorm.Entity)('menu_items')
], MenuItem);

//# sourceMappingURL=menu-item.entity.js.map