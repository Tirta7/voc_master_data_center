"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "WhatsAppController", {
    enumerable: true,
    get: function() {
        return WhatsAppController;
    }
});
const _common = require("@nestjs/common");
const _whatsappservice = require("./whatsapp.service");
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
let WhatsAppController = class WhatsAppController {
    getStatus() {
        return this.whatsappService.getStatus();
    }
    async reconnect() {
        await this.whatsappService.connectToWhatsApp();
        return {
            message: 'Attempting to reconnect...'
        };
    }
    async logout() {
        return this.whatsappService.logout();
    }
    constructor(whatsappService){
        this.whatsappService = whatsappService;
    }
};
_ts_decorate([
    (0, _common.Get)('status'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], WhatsAppController.prototype, "getStatus", null);
_ts_decorate([
    (0, _common.Post)('reconnect'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], WhatsAppController.prototype, "reconnect", null);
_ts_decorate([
    (0, _common.Post)('logout'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], WhatsAppController.prototype, "logout", null);
WhatsAppController = _ts_decorate([
    (0, _common.Controller)('whatsapp'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _whatsappservice.WhatsAppService === "undefined" ? Object : _whatsappservice.WhatsAppService
    ])
], WhatsAppController);

//# sourceMappingURL=whatsapp.controller.js.map