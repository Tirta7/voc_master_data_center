"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AccessController", {
    enumerable: true,
    get: function() {
        return AccessController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _authservice = require("./auth.service");
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
let AccessController = class AccessController {
    async getPendingRequests(req) {
        // Only Admin or Cashier can see pending login requests
        const role = req.user.role?.name?.toUpperCase() || req.user.role?.toUpperCase();
        if (![
            'ADMIN',
            'OWNER',
            'CASHIER',
            'KASIR',
            'SUPERADMIN'
        ].includes(role)) {
            throw new _common.UnauthorizedException('Anda tidak memiliki akses untuk melihat permintaan login.');
        }
        return this.authService.getPendingAccessRequests();
    }
    async approveRequest(id, req, note) {
        const role = req.user.role?.name?.toUpperCase() || req.user.role?.toUpperCase();
        if (![
            'ADMIN',
            'OWNER',
            'CASHIER',
            'KASIR',
            'SUPERADMIN'
        ].includes(role)) {
            throw new _common.UnauthorizedException('Hanya Admin/Kasir yang dapat mengizinkan akses.');
        }
        return this.authService.approveAccessRequest(id, req.user.id, req.user.name, note);
    }
    async denyRequest(id, req, note) {
        const role = req.user.role?.name?.toUpperCase() || req.user.role?.toUpperCase();
        if (![
            'ADMIN',
            'OWNER',
            'CASHIER',
            'KASIR',
            'SUPERADMIN'
        ].includes(role)) {
            throw new _common.UnauthorizedException('Hanya Admin/Kasir yang dapat menolak akses.');
        }
        return this.authService.denyAccessRequest(id, req.user.id, req.user.name, note);
    }
    constructor(authService){
        this.authService = authService;
    }
};
_ts_decorate([
    (0, _common.Get)('pending'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], AccessController.prototype, "getPendingRequests", null);
_ts_decorate([
    (0, _common.Post)(':id/approve'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Request)()),
    _ts_param(2, (0, _common.Body)('note')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AccessController.prototype, "approveRequest", null);
_ts_decorate([
    (0, _common.Post)(':id/deny'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Request)()),
    _ts_param(2, (0, _common.Body)('note')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AccessController.prototype, "denyRequest", null);
AccessController = _ts_decorate([
    (0, _common.Controller)('auth/access-requests'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _authservice.AuthService === "undefined" ? Object : _authservice.AuthService
    ])
], AccessController);

//# sourceMappingURL=access.controller.js.map