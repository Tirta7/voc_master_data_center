"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "InventoryController", {
    enumerable: true,
    get: function() {
        return InventoryController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _inventoryservice = require("./inventory.service");
const _jwtauthguard = require("../auth/jwt-auth.guard");
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
let InventoryController = class InventoryController {
    async getIngredients() {
        return this.inventoryService.getAllIngredients();
    }
    async getLowStockItems() {
        return this.inventoryService.getLowStockItems();
    }
    async getMandatoryReportingItems() {
        return this.inventoryService.getMandatoryReportingItems();
    }
    async createIngredient(data) {
        return this.inventoryService.createIngredient(data);
    }
    async declareWaste(data, req) {
        return this.inventoryService.declareWaste({
            ...data,
            recordedByUserId: req.user.id
        });
    }
    async getWasteHistory() {
        // Basic history, could be expanded
        return [];
    }
    async updateIngredient(id, data, req) {
        return this.inventoryService.updateIngredient(id, data, req.user.id);
    }
    async deleteIngredient(id) {
        await this.inventoryService.deleteIngredient(id);
        return {
            success: true
        };
    }
    async updateStock(id, quantity, type, reason, req) {
        return this.inventoryService.updateStock(id, quantity, type, req.user.username, reason, undefined, req.user.id);
    }
    async setRecipe(menuItemId, recipes) {
        await this.inventoryService.setRecipe(menuItemId, recipes);
        return {
            success: true
        };
    }
    async getMenuAvailability() {
        return this.inventoryService.getMenuAvailability();
    }
    constructor(inventoryService){
        this.inventoryService = inventoryService;
    }
};
_ts_decorate([
    (0, _common.Get)('ingredients'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "getIngredients", null);
_ts_decorate([
    (0, _common.Get)('low-stock'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "getLowStockItems", null);
_ts_decorate([
    (0, _common.Get)('mandatory-reporting'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "getMandatoryReportingItems", null);
_ts_decorate([
    (0, _common.Post)('ingredients'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "createIngredient", null);
_ts_decorate([
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Post)('waste'),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "declareWaste", null);
_ts_decorate([
    (0, _common.Get)('waste/history'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "getWasteHistory", null);
_ts_decorate([
    (0, _common.Patch)('ingredients/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "updateIngredient", null);
_ts_decorate([
    (0, _common.Delete)('ingredients/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "deleteIngredient", null);
_ts_decorate([
    (0, _common.Patch)('ingredients/:id/stock'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('quantity')),
    _ts_param(2, (0, _common.Body)('type')),
    _ts_param(3, (0, _common.Body)('reason')),
    _ts_param(4, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Number,
        String,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "updateStock", null);
_ts_decorate([
    (0, _common.Post)('menu-item/:id/recipe'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('recipes')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Array
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "setRecipe", null);
_ts_decorate([
    (0, _common.Get)('menu-availability'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "getMenuAvailability", null);
InventoryController = _ts_decorate([
    (0, _common.Controller)('inventory'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _inventoryservice.InventoryService === "undefined" ? Object : _inventoryservice.InventoryService
    ])
], InventoryController);

//# sourceMappingURL=inventory.controller.js.map