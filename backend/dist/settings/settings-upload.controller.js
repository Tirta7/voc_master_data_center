"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SettingsUploadController", {
    enumerable: true,
    get: function() {
        return SettingsUploadController;
    }
});
const _common = require("@nestjs/common");
const _platformexpress = require("@nestjs/platform-express");
const _multer = require("multer");
const _path = require("path");
const _fs = require("fs");
const _sharp = /*#__PURE__*/ _interop_require_default(require("sharp"));
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
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let SettingsUploadController = class SettingsUploadController {
    async uploadLogo(file) {
        if (!file) {
            throw new _common.BadRequestException('No file uploaded');
        }
        return {
            url: `/uploads/logos/${file.filename}`
        };
    }
    async uploadPromo(file) {
        if (!file) {
            throw new _common.BadRequestException('No file uploaded');
        }
        // Process with sharp for optimization
        try {
            const filePath = file.path;
            const directory = (0, _path.join)(process.cwd(), 'public', 'uploads', 'promos');
            const finalFilename = `opt-${file.filename.split('.')[0]}.webp`;
            const finalPath = (0, _path.join)(directory, finalFilename);
            await (0, _sharp.default)(filePath).resize({
                width: 1920,
                height: 1080,
                fit: 'inside',
                withoutEnlargement: true
            }).webp({
                quality: 80
            }).toFile(finalPath);
            return {
                url: `/uploads/promos/${finalFilename}`
            };
        } catch (err) {
            console.error('Sharp processing error', err);
            return {
                url: `/uploads/promos/${file.filename}`
            };
        }
    }
    async uploadReward(file) {
        if (!file) {
            throw new _common.BadRequestException('No file uploaded');
        }
        return {
            url: `/uploads/rewards/${file.filename}`
        };
    }
    async uploadTft(file) {
        if (!file) {
            throw new _common.BadRequestException('No file uploaded');
        }
        try {
            const filePath = file.path;
            const directory = (0, _path.join)(process.cwd(), 'public', 'uploads', 'tft');
            const finalFilename = `tft-display-${Date.now()}.jpg`;
            const finalPath = (0, _path.join)(directory, finalFilename);
            // ESP32 TFT 320x240 optimized
            await (0, _sharp.default)(filePath).resize(320, 240, {
                fit: 'cover'
            }).jpeg({
                quality: 85,
                progressive: true
            }).toFile(finalPath);
            return {
                url: `/uploads/tft/${finalFilename}`
            };
        } catch (err) {
            console.error('Sharp TFT processing error', err);
            return {
                url: `/uploads/tft/${file.filename}`
            };
        }
    }
    async uploadQrisTemplate(file) {
        if (!file) {
            throw new _common.BadRequestException('No file uploaded');
        }
        return {
            url: `/uploads/qris/${file.filename}`
        };
    }
};
_ts_decorate([
    (0, _common.Post)('logo'),
    (0, _common.UseInterceptors)((0, _platformexpress.FileInterceptor)('file', {
        storage: (0, _multer.diskStorage)({
            destination: (req, file, cb)=>{
                const uploadPath = (0, _path.join)(process.cwd(), 'public', 'uploads', 'logos');
                if (!(0, _fs.existsSync)(uploadPath)) {
                    (0, _fs.mkdirSync)(uploadPath, {
                        recursive: true
                    });
                }
                cb(null, uploadPath);
            },
            filename: (req, file, cb)=>{
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `logo-${uniqueSuffix}${(0, _path.extname)(file.originalname)}`);
            }
        }),
        fileFilter: (req, file, cb)=>{
            if (!file.originalname.match(/\.(jpg|jpeg|png|webp|svg)$/)) {
                return cb(new _common.BadRequestException('Only image files are allowed!'), false);
            }
            cb(null, true);
        }
    })),
    _ts_param(0, (0, _common.UploadedFile)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Express === "undefined" || typeof Express.Multer === "undefined" || typeof Express.Multer.File === "undefined" ? Object : Express.Multer.File
    ]),
    _ts_metadata("design:returntype", Promise)
], SettingsUploadController.prototype, "uploadLogo", null);
_ts_decorate([
    (0, _common.Post)('promo'),
    (0, _common.UseInterceptors)((0, _platformexpress.FileInterceptor)('file', {
        storage: (0, _multer.diskStorage)({
            destination: (req, file, cb)=>{
                const uploadPath = (0, _path.join)(process.cwd(), 'public', 'uploads', 'promos');
                if (!(0, _fs.existsSync)(uploadPath)) {
                    (0, _fs.mkdirSync)(uploadPath, {
                        recursive: true
                    });
                }
                cb(null, uploadPath);
            },
            filename: (req, file, cb)=>{
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `promo-${uniqueSuffix}${(0, _path.extname)(file.originalname)}`);
            }
        }),
        fileFilter: (req, file, cb)=>{
            if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
                return cb(new _common.BadRequestException('Only image files are allowed!'), false);
            }
            cb(null, true);
        }
    })),
    _ts_param(0, (0, _common.UploadedFile)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Express === "undefined" || typeof Express.Multer === "undefined" || typeof Express.Multer.File === "undefined" ? Object : Express.Multer.File
    ]),
    _ts_metadata("design:returntype", Promise)
], SettingsUploadController.prototype, "uploadPromo", null);
_ts_decorate([
    (0, _common.Post)('reward'),
    (0, _common.UseInterceptors)((0, _platformexpress.FileInterceptor)('file', {
        storage: (0, _multer.diskStorage)({
            destination: (req, file, cb)=>{
                const uploadPath = (0, _path.join)(process.cwd(), 'public', 'uploads', 'rewards');
                if (!(0, _fs.existsSync)(uploadPath)) {
                    (0, _fs.mkdirSync)(uploadPath, {
                        recursive: true
                    });
                }
                cb(null, uploadPath);
            },
            filename: (req, file, cb)=>{
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `reward-${uniqueSuffix}${(0, _path.extname)(file.originalname)}`);
            }
        }),
        fileFilter: (req, file, cb)=>{
            if (!file.originalname.match(/\.(jpg|jpeg|png|webp|svg)$/)) {
                return cb(new _common.BadRequestException('Only image files are allowed!'), false);
            }
            cb(null, true);
        }
    })),
    _ts_param(0, (0, _common.UploadedFile)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Express === "undefined" || typeof Express.Multer === "undefined" || typeof Express.Multer.File === "undefined" ? Object : Express.Multer.File
    ]),
    _ts_metadata("design:returntype", Promise)
], SettingsUploadController.prototype, "uploadReward", null);
_ts_decorate([
    (0, _common.Post)('tft'),
    (0, _common.UseInterceptors)((0, _platformexpress.FileInterceptor)('file', {
        storage: (0, _multer.diskStorage)({
            destination: (req, file, cb)=>{
                const uploadPath = (0, _path.join)(process.cwd(), 'public', 'uploads', 'tft');
                if (!(0, _fs.existsSync)(uploadPath)) {
                    (0, _fs.mkdirSync)(uploadPath, {
                        recursive: true
                    });
                }
                cb(null, uploadPath);
            },
            filename: (req, file, cb)=>{
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `tft-${uniqueSuffix}${(0, _path.extname)(file.originalname)}`);
            }
        }),
        fileFilter: (req, file, cb)=>{
            if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
                return cb(new _common.BadRequestException('Only JPG/PNG are allowed for TFT!'), false);
            }
            cb(null, true);
        }
    })),
    _ts_param(0, (0, _common.UploadedFile)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Express === "undefined" || typeof Express.Multer === "undefined" || typeof Express.Multer.File === "undefined" ? Object : Express.Multer.File
    ]),
    _ts_metadata("design:returntype", Promise)
], SettingsUploadController.prototype, "uploadTft", null);
_ts_decorate([
    (0, _common.Post)('qris-template'),
    (0, _common.UseInterceptors)((0, _platformexpress.FileInterceptor)('file', {
        storage: (0, _multer.diskStorage)({
            destination: (req, file, cb)=>{
                const uploadPath = (0, _path.join)(process.cwd(), 'public', 'uploads', 'qris');
                if (!(0, _fs.existsSync)(uploadPath)) {
                    (0, _fs.mkdirSync)(uploadPath, {
                        recursive: true
                    });
                }
                cb(null, uploadPath);
            },
            filename: (req, file, cb)=>{
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `qris-${uniqueSuffix}${(0, _path.extname)(file.originalname)}`);
            }
        }),
        fileFilter: (req, file, cb)=>{
            if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
                return cb(new _common.BadRequestException('Only image files are allowed!'), false);
            }
            cb(null, true);
        }
    })),
    _ts_param(0, (0, _common.UploadedFile)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Express === "undefined" || typeof Express.Multer === "undefined" || typeof Express.Multer.File === "undefined" ? Object : Express.Multer.File
    ]),
    _ts_metadata("design:returntype", Promise)
], SettingsUploadController.prototype, "uploadQrisTemplate", null);
SettingsUploadController = _ts_decorate([
    (0, _common.Controller)('settings/upload')
], SettingsUploadController);

//# sourceMappingURL=settings-upload.controller.js.map