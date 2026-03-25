"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FirmwareService", {
    enumerable: true,
    get: function() {
        return FirmwareService;
    }
});
const _common = require("@nestjs/common");
const _child_process = require("child_process");
const _util = require("util");
const _fs = /*#__PURE__*/ _interop_require_wildcard(require("fs"));
const _path = /*#__PURE__*/ _interop_require_wildcard(require("path"));
const _billiardgateway = require("../socket/billiard.gateway");
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
const execPromise = (0, _util.promisify)(_child_process.exec);
let FirmwareService = class FirmwareService {
    get cliPath() {
        // Check both ./bin (if started from root) and ../bin (if started from backend)
        const rootBin = _path.join(process.cwd(), 'bin', 'arduino-cli.exe');
        const parentBin = _path.join(process.cwd(), '..', 'bin', 'arduino-cli.exe');
        if (_fs.existsSync(rootBin)) return rootBin;
        if (_fs.existsSync(parentBin)) return parentBin;
        // Fallback/Legacy
        return rootBin;
    }
    async compileIno(code) {
        const projectRoot = _path.join(this.cliPath, '..', '..');
        const buildRoot = _path.join(projectRoot, 'firmware_builds');
        if (!_fs.existsSync(buildRoot)) _fs.mkdirSync(buildRoot, {
            recursive: true
        });
        const sketchName = 'SpotOn_Firmware';
        const sketchDir = _path.join(buildRoot, sketchName);
        if (!_fs.existsSync(sketchDir)) _fs.mkdirSync(sketchDir, {
            recursive: true
        });
        const inoPath = _path.join(sketchDir, `${sketchName}.ino`);
        _fs.writeFileSync(inoPath, code);
        const buildDir = _path.join(sketchDir, 'build');
        if (!_fs.existsSync(buildDir)) _fs.mkdirSync(buildDir, {
            recursive: true
        });
        try {
            this.logger.log(`Compiling FIRMWARE for ${this.fqbn}...`);
            this.billiardGateway.server.emit('firmwareLog', {
                message: 'Inisialisasi kompilasi...'
            });
            const command = `"${this.cliPath}" compile --fqbn ${this.fqbn} --output-dir "${buildDir}" "${sketchDir}"`;
            const { stdout, stderr } = await execPromise(command);
            const fullLog = stdout + stderr;
            this.billiardGateway.server.emit('firmwareLog', {
                message: 'Kompilasi sukses!',
                success: true
            });
            // Find the .bin file
            const binFile = _path.join(buildDir, `${sketchName}.ino.bin`);
            if (_fs.existsSync(binFile)) {
                // Move to a more stable location if needed, but for now return temp path
                return {
                    success: true,
                    log: fullLog,
                    binPath: binFile
                };
            } else {
                throw new Error('Binary file not found after compilation.');
            }
        } catch (error) {
            const errorLog = error.stdout + error.stderr + (error.message || '');
            this.logger.error(`Compilation failed: ${errorLog}`);
            this.billiardGateway.server.emit('firmwareLog', {
                message: 'Kompilasi GAGAL!',
                error: errorLog
            });
            return {
                success: false,
                log: errorLog
            };
        }
    }
    async flashTable(ip, binPath) {
        if (!_fs.existsSync(binPath)) {
            throw new _common.InternalServerErrorException('Firmware binary file missing.');
        }
        try {
            this.logger.log(`Flashing to ${ip} via OTA...`);
            this.billiardGateway.server.emit('firmwareLog', {
                message: `Menghubungi ${ip} untuk injeksi firmware...`
            });
            // arduino-cli upload -p IP --fqbn FQBN --protocol network
            const command = `"${this.cliPath}" upload -p ${ip} --fqbn ${this.fqbn} --protocol network --input-file "${binPath}"`;
            const { stdout, stderr } = await execPromise(command);
            const fullLog = stdout + stderr;
            this.billiardGateway.server.emit('firmwareLog', {
                message: `Injeksi ke ${ip} BERHASIL!`,
                success: true
            });
            return {
                success: true,
                log: fullLog
            };
        } catch (error) {
            const errorLog = error.stdout + error.stderr + (error.message || '');
            this.logger.error(`Flashing failed for ${ip}: ${errorLog}`);
            this.billiardGateway.server.emit('firmwareLog', {
                message: `Injeksi ke ${ip} GAGAL!`,
                error: errorLog
            });
            return {
                success: false,
                log: errorLog
            };
        }
    }
    constructor(billiardGateway){
        this.billiardGateway = billiardGateway;
        this.logger = new _common.Logger(FirmwareService.name);
        this.fqbn = 'esp32:esp32:esp32';
    }
};
FirmwareService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _billiardgateway.BilliardGateway === "undefined" ? Object : _billiardgateway.BilliardGateway
    ])
], FirmwareService);

//# sourceMappingURL=firmware.service.js.map