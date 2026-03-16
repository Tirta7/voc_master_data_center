"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CafeController", {
    enumerable: true,
    get: function() {
        return CafeController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _cafeservice = require("./cafe.service");
const _orderitementity = require("./entities/order-item.entity");
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
let CafeController = class CafeController {
    async getMenu(includeInactive) {
        return this.cafeService.getAllMenuItems(includeInactive === 'true');
    }
    async getCategories() {
        return this.cafeService.findAllCategories();
    }
    async createCategory(data) {
        return this.cafeService.createCategory(data);
    }
    async updateCategory(id, data) {
        return this.cafeService.updateCategory(id, data);
    }
    async deleteCategory(id) {
        return this.cafeService.deleteCategory(id);
    }
    async getActiveOrders() {
        return this.cafeService.getActiveOrders();
    }
    async createMenuItem(data) {
        return this.cafeService.createMenuItem(data);
    }
    async getMenuItem(id) {
        return this.cafeService.getMenuItemById(id);
    }
    async updateMenuItem(id, data, req) {
        return this.cafeService.updateMenuItem(id, data, req.user.username);
    }
    async deleteMenuItem(id) {
        await this.cafeService.deleteMenuItem(id);
        return {
            success: true
        };
    }
    async updateMenuItemRecipes(id, recipes) {
        return this.cafeService.updateMenuItemRecipes(id, recipes);
    }
    async placeOrder(orderData, req) {
        await this.cafeService.processOrder(orderData.items, orderData.tableId, orderData.transactionId, req.user.id, req.user.username, orderData.idempotencyKey);
        return {
            success: true,
            message: 'Order processed and stock deducted'
        };
    }
    async updateOrderItemStatus(id, status, req) {
        return this.cafeService.updateOrderItemStatus(id, status, req.user.id, req.user.username);
    }
    async getOrderHistory() {
        return this.cafeService.getCompletedOrders();
    }
    async getSummary(station) {
        return this.cafeService.getDailyStationSummary(station);
    }
    async cancelOrderItem(id, reason, user) {
        return this.cafeService.cancelOrderItem(id, reason, user);
    }
    async confirmCancel(id, user) {
        return this.cafeService.confirmCancelOrderItem(id, user);
    }
    async rejectCancel(id, user) {
        return this.cafeService.rejectCancelOrderItem(id, user);
    }
    constructor(cafeService){
        this.cafeService = cafeService;
    }
};
_ts_decorate([
    (0, _common.Get)('menu'),
    _ts_param(0, (0, _common.Query)('includeInactive')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CafeController.prototype, "getMenu", null);
_ts_decorate([
    (0, _common.Get)('categories'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], CafeController.prototype, "getCategories", null);
_ts_decorate([
    (0, _common.Post)('categories'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], CafeController.prototype, "createCategory", null);
_ts_decorate([
    (0, _common.Patch)('categories/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], CafeController.prototype, "updateCategory", null);
_ts_decorate([
    (0, _common.Delete)('categories/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], CafeController.prototype, "deleteCategory", null);
_ts_decorate([
    (0, _common.Get)('orders/active'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], CafeController.prototype, "getActiveOrders", null);
_ts_decorate([
    (0, _common.Post)('menu'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], CafeController.prototype, "createMenuItem", null);
_ts_decorate([
    (0, _common.Get)('menu/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], CafeController.prototype, "getMenuItem", null);
_ts_decorate([
    (0, _common.Patch)('menu/:id'),
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
], CafeController.prototype, "updateMenuItem", null);
_ts_decorate([
    (0, _common.Delete)('menu/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], CafeController.prototype, "deleteMenuItem", null);
_ts_decorate([
    (0, _common.Put)('menu/:id/recipes'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('recipes')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Array
    ]),
    _ts_metadata("design:returntype", Promise)
], CafeController.prototype, "updateMenuItemRecipes", null);
_ts_decorate([
    (0, _common.Post)('order'),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], CafeController.prototype, "placeOrder", null);
_ts_decorate([
    (0, _common.Patch)('order/item/:id/status'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('status')),
    _ts_param(2, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _orderitementity.OrderItemStatus === "undefined" ? Object : _orderitementity.OrderItemStatus,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], CafeController.prototype, "updateOrderItemStatus", null);
_ts_decorate([
    (0, _common.Get)('orders/history'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], CafeController.prototype, "getOrderHistory", null);
_ts_decorate([
    (0, _common.Get)('summary/:station'),
    _ts_param(0, (0, _common.Param)('station')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CafeController.prototype, "getSummary", null);
_ts_decorate([
    (0, _common.Patch)('order/item/:id/cancel'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('reason')),
    _ts_param(2, (0, _common.Body)('user')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CafeController.prototype, "cancelOrderItem", null);
_ts_decorate([
    (0, _common.Patch)('order/item/:id/confirm-cancel'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('user')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CafeController.prototype, "confirmCancel", null);
_ts_decorate([
    (0, _common.Patch)('order/item/:id/reject-cancel'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('user')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], CafeController.prototype, "rejectCancel", null);
CafeController = _ts_decorate([
    (0, _common.Controller)('cafe'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _cafeservice.CafeService === "undefined" ? Object : _cafeservice.CafeService
    ])
], CafeController);

//# sourceMappingURL=cafe.controller.js.map