"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FirmwareController", {
    enumerable: true,
    get: function() {
        return FirmwareController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _firmwareservice = require("./firmware.service");
const _billiardservice = require("./billiard.service");
const _fs = /*#__PURE__*/ _interop_require_wildcard(require("fs"));
const _path = /*#__PURE__*/ _interop_require_wildcard(require("path"));
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
let FirmwareController = class FirmwareController {
    get persistencePath() {
        const root = _path.join(process.cwd(), '..');
        return _path.join(root, 'firmware_builds', 'last_build.json');
    }
    setLastCompiledBin(binPath) {
        try {
            if (!_fs.existsSync(_path.dirname(this.persistencePath))) {
                _fs.mkdirSync(_path.dirname(this.persistencePath), {
                    recursive: true
                });
            }
            _fs.writeFileSync(this.persistencePath, JSON.stringify({
                binPath,
                timestamp: new Date().toISOString()
            }));
        } catch (e) {
            this.logger.error(`Failed to persist build path: ${e.message}`);
        }
    }
    getLastCompiledBin() {
        try {
            if (_fs.existsSync(this.persistencePath)) {
                const data = JSON.parse(_fs.readFileSync(this.persistencePath, 'utf8'));
                if (data.binPath && _fs.existsSync(data.binPath)) {
                    return data.binPath;
                }
            }
        } catch (e) {
            this.logger.error(`Failed to read persisted build path: ${e.message}`);
        }
        return null;
    }
    async compile(code) {
        if (!code) throw new _common.BadRequestException('Source code is required');
        const result = await this.firmwareService.compileIno(code);
        if (result.success && result.binPath) {
            this.setLastCompiledBin(result.binPath);
        }
        return result;
    }
    async deploy(tableId) {
        const binPath = this.getLastCompiledBin();
        if (!binPath) {
            throw new _common.BadRequestException('No compiled firmware found. Please compile first.');
        }
        const table = await this.billiardService.getTableById(tableId);
        if (!table) throw new _common.NotFoundException(`Table ${tableId} not found`);
        const targetIp = table.ipAddress;
        if (!targetIp) {
            throw new _common.BadRequestException(`Table ${table.tableName} IP address not found. Ensure it is online.`);
        }
        return this.firmwareService.flashTable(targetIp, binPath);
    }
    async saveSource(code) {
        if (!code) throw new _common.BadRequestException('Source code is required');
        try {
            const sourcePath = _path.join(_path.dirname(this.persistencePath), 'firmware.ino');
            _fs.writeFileSync(sourcePath, code);
            return {
                success: true
            };
        } catch (e) {
            this.logger.error(`Failed to save source: ${e.message}`);
            throw new _common.BadRequestException('Failed to save source code');
        }
    }
    async getSource() {
        try {
            const sourcePath = _path.join(_path.dirname(this.persistencePath), 'firmware.ino');
            if (_fs.existsSync(sourcePath)) {
                const code = _fs.readFileSync(sourcePath, 'utf8');
                return {
                    success: true,
                    code
                };
            }
            return {
                success: false,
                message: 'No saved source found'
            };
        } catch (e) {
            this.logger.error(`Failed to read source: ${e.message}`);
            return {
                success: false,
                message: 'Failed to read source code'
            };
        }
    }
    constructor(firmwareService, billiardService){
        this.firmwareService = firmwareService;
        this.billiardService = billiardService;
        this.logger = new _common.Logger(FirmwareController.name);
    }
};
_ts_decorate([
    (0, _common.Post)('compile'),
    _ts_param(0, (0, _common.Body)('code')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], FirmwareController.prototype, "compile", null);
_ts_decorate([
    (0, _common.Post)('deploy/:tableId'),
    _ts_param(0, (0, _common.Param)('tableId', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], FirmwareController.prototype, "deploy", null);
_ts_decorate([
    (0, _common.Post)('source'),
    _ts_param(0, (0, _common.Body)('code')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], FirmwareController.prototype, "saveSource", null);
_ts_decorate([
    (0, _common.Post)('source/get'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], FirmwareController.prototype, "getSource", null);
FirmwareController = _ts_decorate([
    (0, _common.Controller)('billiard/firmware'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _firmwareservice.FirmwareService === "undefined" ? Object : _firmwareservice.FirmwareService,
        typeof _billiardservice.BilliardService === "undefined" ? Object : _billiardservice.BilliardService
    ])
], FirmwareController);

//# sourceMappingURL=firmware.controller.js.map