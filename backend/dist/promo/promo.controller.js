"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PromoController", {
    enumerable: true,
    get: function() {
        return PromoController;
    }
});
const _common = require("@nestjs/common");
const _promoservice = require("./promo.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let PromoController = class PromoController {
    async findAll() {
        return this.promoService.getAllPromos();
    }
    async findActive() {
        return this.promoService.getActivePromos();
    }
    async findStartSession() {
        return this.promoService.getStartSessionPromos();
    }
    async findMenuBundles() {
        return this.promoService.getMenuBundles();
    }
    async create(data) {
        return this.promoService.createPromo(data);
    }
    async update(id, data) {
        return this.promoService.updatePromo(id, data);
    }
    async remove(id) {
        return this.promoService.deletePromo(id);
    }
    constructor(promoService){
        this.promoService = promoService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PromoController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)('active'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PromoController.prototype, "findActive", null);
_ts_decorate([
    (0, _common.Get)('start-session'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PromoController.prototype, "findStartSession", null);
_ts_decorate([
    (0, _common.Get)('menu-bundles'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PromoController.prototype, "findMenuBundles", null);
_ts_decorate([
    (0, _common.Post)(),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Partial === "undefined" ? Object : Partial
    ]),
    _ts_metadata("design:returntype", Promise)
], PromoController.prototype, "create", null);
_ts_decorate([
    (0, _common.Put)(':id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof Partial === "undefined" ? Object : Partial
    ]),
    _ts_metadata("design:returntype", Promise)
], PromoController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], PromoController.prototype, "remove", null);
PromoController = _ts_decorate([
    (0, _common.Controller)('admin/promos'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _promoservice.PromoService === "undefined" ? Object : _promoservice.PromoService
    ])
], PromoController);

//# sourceMappingURL=promo.controller.js.map