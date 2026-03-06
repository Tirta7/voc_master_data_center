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
    get Category () {
        return Category;
    },
    get ProductionTarget () {
        return ProductionTarget;
    }
});
const _typeorm = require("typeorm");
const _menuitementity = require("./menu-item.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
var ProductionTarget = /*#__PURE__*/ function(ProductionTarget) {
    ProductionTarget["KITCHEN"] = "KDS";
    ProductionTarget["BARTENDER"] = "BDS";
    ProductionTarget["NONE"] = "NONE";
    return ProductionTarget;
}({});
let Category = class Category {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Category.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        unique: true
    }),
    _ts_metadata("design:type", String)
], Category.prototype, "name", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        length: 50,
        default: 'KDS'
    }),
    _ts_metadata("design:type", String)
], Category.prototype, "productionTarget", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: true
    }),
    _ts_metadata("design:type", Boolean)
], Category.prototype, "isActive", void 0);
_ts_decorate([
    (0, _typeorm.OneToMany)(()=>_menuitementity.MenuItem, (menuItem)=>menuItem.category),
    _ts_metadata("design:type", Array)
], Category.prototype, "menuItems", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Category.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Category.prototype, "updatedAt", void 0);
Category = _ts_decorate([
    (0, _typeorm.Entity)('categories')
], Category);

//# sourceMappingURL=category.entity.js.map