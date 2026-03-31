"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ClosingUploadController", {
    enumerable: true,
    get: function() {
        return ClosingUploadController;
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
let ClosingUploadController = class ClosingUploadController {
    async uploadClosingEvidence(file) {
        if (!file) {
            throw new _common.BadRequestException('No file uploaded');
        }
        // Process with sharp for optimization (Premium experience: fast loading)
        try {
            const filePath = file.path;
            const directory = (0, _path.join)(process.cwd(), 'public', 'uploads', 'closing');
            const finalFilename = `opt-${file.filename.split('.')[0]}.webp`;
            const finalPath = (0, _path.join)(directory, finalFilename);
            await (0, _sharp.default)(filePath).resize({
                width: 1280,
                height: 720,
                fit: 'inside',
                withoutEnlargement: true
            }).webp({
                quality: 80
            }).toFile(finalPath);
            // We can keep the original or delete it. For now, let's just return the optimized one.
            return {
                url: `/uploads/closing/${finalFilename}`
            };
        } catch (err) {
            console.error('Sharp processing error for closing evidence', err);
            // Fallback to original if sharp fails
            return {
                url: `/uploads/closing/${file.filename}`
            };
        }
    }
};
_ts_decorate([
    (0, _common.Post)(),
    (0, _common.UseInterceptors)((0, _platformexpress.FileInterceptor)('file', {
        storage: (0, _multer.diskStorage)({
            destination: (req, file, cb)=>{
                const uploadPath = (0, _path.join)(process.cwd(), 'public', 'uploads', 'closing');
                if (!(0, _fs.existsSync)(uploadPath)) {
                    (0, _fs.mkdirSync)(uploadPath, {
                        recursive: true
                    });
                }
                cb(null, uploadPath);
            },
            filename: (req, file, cb)=>{
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `closing-${uniqueSuffix}${(0, _path.extname)(file.originalname)}`);
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
], ClosingUploadController.prototype, "uploadClosingEvidence", null);
ClosingUploadController = _ts_decorate([
    (0, _common.Controller)('reports/closing-upload')
], ClosingUploadController);

//# sourceMappingURL=closing-upload.controller.js.map