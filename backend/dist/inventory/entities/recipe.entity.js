"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Recipe", {
    enumerable: true,
    get: function() {
        return Recipe;
    }
});
const _typeorm = require("typeorm");
const _ingrediententity = require("./ingredient.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let Recipe = class Recipe {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Recipe.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)('MenuItem', (menuItem)=>menuItem.recipes),
    (0, _typeorm.JoinColumn)({
        name: 'menuItemId'
    }),
    _ts_metadata("design:type", Object)
], Recipe.prototype, "menuItem", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", Number)
], Recipe.prototype, "menuItemId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_ingrediententity.Ingredient, {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'ingredientId'
    }),
    _ts_metadata("design:type", typeof _ingrediententity.Ingredient === "undefined" ? Object : _ingrediententity.Ingredient)
], Recipe.prototype, "ingredient", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], Recipe.prototype, "ingredientId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)('MenuItem', {
        nullable: true
    }),
    (0, _typeorm.JoinColumn)({
        name: 'subMenuItemId'
    }),
    _ts_metadata("design:type", Object)
], Recipe.prototype, "subMenuItem", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", Number)
], Recipe.prototype, "subMenuItemId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'decimal',
        precision: 12,
        scale: 3
    }),
    _ts_metadata("design:type", Number)
], Recipe.prototype, "quantity", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], Recipe.prototype, "unit", void 0);
Recipe = _ts_decorate([
    (0, _typeorm.Entity)('recipes')
], Recipe);

//# sourceMappingURL=recipe.entity.js.map