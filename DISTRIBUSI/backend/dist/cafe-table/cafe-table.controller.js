"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CafeTableController", {
    enumerable: true,
    get: function() {
        return CafeTableController;
    }
});
const _common = require("@nestjs/common");
const _cafetableservice = require("./cafe-table.service");
const _passport = require("@nestjs/passport");
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
let CafeTableController = class CafeTableController {
    // ── CRUD ──────────────────────────────────────────────────────────────────
    findAll() {
        return this.service.findAll();
    }
    create(body) {
        return this.service.create(body);
    }
    update(id, body) {
        return this.service.update(id, body);
    }
    async remove(id) {
        await this.service.remove(id);
        return {
            success: true
        };
    }
    // ── Session ───────────────────────────────────────────────────────────────
    openSession(id, body, req) {
        return this.service.openSession(id, body.customerName, req.user.id, body.memberId);
    }
    getActiveTransaction(id) {
        return this.service.getActiveTransaction(id);
    }
    transferToBilliard(id, body) {
        return this.service.transferToBilliard(id, body.billiardTableId);
    }
    checkout(id, body, req) {
        return this.service.checkout(id, body, req.user.id);
    }
    closeSession(id) {
        return this.service.closeSession(id);
    }
    constructor(service){
        this.service = service;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], CafeTableController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Post)(),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], CafeTableController.prototype, "create", null);
_ts_decorate([
    (0, _common.Patch)(':id'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], CafeTableController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], CafeTableController.prototype, "remove", null);
_ts_decorate([
    (0, _common.Post)(':id/open'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], CafeTableController.prototype, "openSession", null);
_ts_decorate([
    (0, _common.Get)(':id/active-transaction'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", void 0)
], CafeTableController.prototype, "getActiveTransaction", null);
_ts_decorate([
    (0, _common.Post)(':id/transfer-to-billiard'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], CafeTableController.prototype, "transferToBilliard", null);
_ts_decorate([
    (0, _common.Post)(':id/checkout'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], CafeTableController.prototype, "checkout", null);
_ts_decorate([
    (0, _common.Post)(':id/close'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", void 0)
], CafeTableController.prototype, "closeSession", null);
CafeTableController = _ts_decorate([
    (0, _common.Controller)('cafe-table'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _cafetableservice.CafeTableService === "undefined" ? Object : _cafetableservice.CafeTableService
    ])
], CafeTableController);

//# sourceMappingURL=cafe-table.controller.js.map