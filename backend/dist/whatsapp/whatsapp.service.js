"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "WhatsAppService", {
    enumerable: true,
    get: function() {
        return WhatsAppService;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _axios = /*#__PURE__*/ _interop_require_default(require("axios"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let WhatsAppService = class WhatsAppService {
    async sendMessage(target, message) {
        try {
            const response = await _axios.default.post(this.fonnteUrl, {
                target,
                message
            }, {
                headers: {
                    Authorization: this.fonnteToken
                }
            });
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to send WA message to ${target}: ${error.message}`);
            return null;
        }
    }
    async sendImage(target, message, url) {
        try {
            const response = await _axios.default.post(this.fonnteUrl, {
                target,
                message,
                url
            }, {
                headers: {
                    Authorization: this.fonnteToken
                }
            });
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to send WA image to ${target}: ${error.message}`);
            return null;
        }
    }
    constructor(configService){
        this.configService = configService;
        this.logger = new _common.Logger(WhatsAppService.name);
        this.fonnteUrl = 'https://api.fonnte.com/send';
        this.fonnteToken = this.configService.get('FONNTE_TOKEN') || 'PLACEHOLDER_TOKEN';
    }
};
WhatsAppService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], WhatsAppService);

//# sourceMappingURL=whatsapp.service.js.map