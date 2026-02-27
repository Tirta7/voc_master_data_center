"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "HardwareService", {
    enumerable: true,
    get: function() {
        return HardwareService;
    }
});
const _common = require("@nestjs/common");
const _net = /*#__PURE__*/ _interop_require_wildcard(require("net"));
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
let HardwareService = class HardwareService {
    /**
     * Send raw data to a network thermal printer (TCP)
     */ async printRaw(ip, port, data) {
        return new Promise((resolve, reject)=>{
            const client = new _net.Socket();
            client.connect(port, ip, ()=>{
                this.logger.log(`Connected to printer at ${ip}:${port}`);
                client.write(data, (err)=>{
                    if (err) {
                        this.logger.error('Print failed:', err);
                        reject(err);
                    } else {
                        this.logger.log('Print job sent successfully');
                        client.destroy();
                        resolve(true);
                    }
                });
            });
            client.on('error', (err)=>{
                this.logger.error('Printer connection error:', err);
                client.destroy();
                reject(err);
            });
            // Timeout after 5 seconds
            client.setTimeout(5000, ()=>{
                this.logger.warn('Printer connection timeout');
                client.destroy();
                reject(new Error('Printer timeout'));
            });
        });
    }
    /**
     * ESC/POS Formatting Helpers
     */ get ESC() {
        return '\x1B';
    }
    get GS() {
        return '\x1D';
    }
    formatBold(text) {
        return `${this.ESC}E\x01${text}${this.ESC}E\x00`;
    }
    formatDoubleSize(text) {
        return `${this.GS}!\x11${text}${this.GS}!\x00`;
    }
    get cut() {
        return `${this.GS}V\x42\x00`;
    }
    constructor(){
        this.logger = new _common.Logger(HardwareService.name);
    }
};
HardwareService = _ts_decorate([
    (0, _common.Injectable)()
], HardwareService);

//# sourceMappingURL=hardware.service.js.map