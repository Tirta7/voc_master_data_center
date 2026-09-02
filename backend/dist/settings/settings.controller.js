"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SettingsController", {
    enumerable: true,
    get: function() {
        return SettingsController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _os = /*#__PURE__*/ _interop_require_wildcard(require("os"));
const _systeminformation = /*#__PURE__*/ _interop_require_wildcard(require("systeminformation"));
const _settingsservice = require("./settings.service");
const _qrisutil = require("../license/qris.util");
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
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
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let SettingsController = class SettingsController {
    async getSettings(res) {
        // ⚡ Cache settings di browser & Cloudflare selama 30 detik
        // stale-while-revalidate: boleh sajikan data lama sambil fetch baru di background
        res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
        return this.settingsService.getSettings();
    }
    async updateSettings(data, req) {
        return this.settingsService.updateSettings(data, req.user.username);
    }
    getPing(res) {
        // ⚡ Ping endpoint tidak perlu di-cache, tapi beri header no-cache yang eksplisit
        res.setHeader('Cache-Control', 'no-store');
        return {
            ok: true,
            ts: Date.now()
        };
    }
    async getDynamicQris(amount) {
        const settings = await this.settingsService.getSettings();
        if (!settings.clientQrisString) {
            throw new Error('Client QRIS string not configured');
        }
        const amt = parseInt(amount, 10);
        if (isNaN(amt) || amt <= 0) {
            throw new Error('Invalid amount');
        }
        const dynamicQris = _qrisutil.QrisUtil.generateDynamicQris(settings.clientQrisString, amt);
        return {
            qrisString: dynamicQris,
            amount: amt
        };
    }
    async getNetworkInfo() {
        const interfaces = _os.networkInterfaces();
        const addresses = [];
        for(const k in interfaces){
            const networkInterface = interfaces[k];
            if (!networkInterface) continue;
            for (const address of networkInterface){
                if (address.family === 'IPv4' && !address.internal) {
                    addresses.push(address.address);
                }
            }
        }
        return {
            ipAddresses: addresses,
            primaryIp: addresses.find((ip)=>ip.startsWith('192.168')) || addresses[0] || '127.0.0.1'
        };
    }
    async getServerStats() {
        const [cpu, mem, networkStats] = await Promise.all([
            _systeminformation.currentLoad(),
            _systeminformation.mem(),
            _systeminformation.networkStats()
        ]);
        const netIface = networkStats[0] || {
            rx_sec: 0,
            tx_sec: 0
        };
        return {
            cpu: Math.round(cpu.currentLoad),
            memUsed: Math.round(mem.used / mem.total * 100),
            memUsedMB: Math.round(mem.used / 1024 / 1024),
            memTotalMB: Math.round(mem.total / 1024 / 1024),
            download: Math.round((netIface.rx_sec || 0) / 1024),
            upload: Math.round((netIface.tx_sec || 0) / 1024),
            timestamp: Date.now()
        };
    }
    constructor(settingsService){
        this.settingsService = settingsService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    _ts_param(0, (0, _common.Res)({
        passthrough: true
    })),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Response === "undefined" ? Object : Response
    ]),
    _ts_metadata("design:returntype", Promise)
], SettingsController.prototype, "getSettings", null);
_ts_decorate([
    (0, _common.Patch)(),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Partial === "undefined" ? Object : Partial,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], SettingsController.prototype, "updateSettings", null);
_ts_decorate([
    (0, _common.Get)('ping'),
    _ts_param(0, (0, _common.Res)({
        passthrough: true
    })),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Response === "undefined" ? Object : Response
    ]),
    _ts_metadata("design:returntype", void 0)
], SettingsController.prototype, "getPing", null);
_ts_decorate([
    (0, _common.Get)('qris/dynamic'),
    _ts_param(0, (0, _common.Query)('amount')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SettingsController.prototype, "getDynamicQris", null);
_ts_decorate([
    (0, _common.Get)('network'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], SettingsController.prototype, "getNetworkInfo", null);
_ts_decorate([
    (0, _common.Get)('stats'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], SettingsController.prototype, "getServerStats", null);
SettingsController = _ts_decorate([
    (0, _common.Controller)('settings'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _settingsservice.SettingsService === "undefined" ? Object : _settingsservice.SettingsService
    ])
], SettingsController);

//# sourceMappingURL=settings.controller.js.map