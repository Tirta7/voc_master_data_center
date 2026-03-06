"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CardUtils", {
    enumerable: true,
    get: function() {
        return CardUtils;
    }
});
const _sharp = /*#__PURE__*/ _interop_require_default(require("sharp"));
const _qrcode = /*#__PURE__*/ _interop_require_wildcard(require("qrcode"));
const _path = /*#__PURE__*/ _interop_require_wildcard(require("path"));
const _fs = /*#__PURE__*/ _interop_require_wildcard(require("fs"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
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
let CardUtils = class CardUtils {
    static async generateMemberCard(data) {
        if (!_fs.existsSync(this.TEMPLATE_PATH)) {
            throw new Error(`Template not found at ${this.TEMPLATE_PATH}. Please upload card_template.png.`);
        }
        if (!_fs.existsSync(this.OUTPUT_DIR)) {
            _fs.mkdirSync(this.OUTPUT_DIR, {
                recursive: true
            });
        }
        const width = 2352;
        const height = 3748;
        // 1. Generate QR Code - Scaled for high res
        const qrBuffer = await _qrcode.toBuffer(data.qrToken, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 1600,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });
        // 2. Create SVG Overlay for Text - Scaled for 2352x3748
        const svgText = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <style>
                .name { fill: #2E3192; font-size: 210px; font-family: sans-serif; font-weight: 900; font-style: italic; text-anchor: middle; }
                .tier { fill: #FBB03B; font-size: 100px; font-family: sans-serif; font-weight: 900; text-anchor: middle; text-transform: uppercase; letter-spacing: 2px;}
                .id { fill: #448AFF; font-size: 75px; font-family: sans-serif; font-weight: 800; text-anchor: middle; letter-spacing: 1px; }
                .date-label { fill: #1A237E; font-size: 65px; font-family: sans-serif; font-weight: 900; text-transform: uppercase; }
                .date-val { fill: #3949AB; font-size: 65px; font-family: sans-serif; font-weight: 600; }
            </style>
            
            <!-- Member ID - Positioned below QR -->
            <text x="1176" y="2250" class="id">ID:${data.memberCode}</text>

            <!-- Name - Large, Blue, Italic -->
            <text x="1176" y="2500" class="name">${data.name.toUpperCase()}</text>
            
            <!-- Tier - Golden Color -->
            <text x="1176" y="2650" class="tier">Membership ${data.tierName}</text>
            
            <!-- Join Date - Left Side near footer -->
            <text x="180" y="2800" class="date-label">Join:</text>
            <text x="360" y="2800" class="date-val">${data.joinDate}</text>
            
            <!-- Expiry Date - Right Side near footer -->
            <text x="1450" y="2800" class="date-label">Expire:</text>
            <text x="1750" y="2800" class="date-val">${data.expiryDate}</text>
        </svg>
        `;
        const filename = `card_${data.memberCode.replace(/[^a-zA-Z0-0]/g, '_')}.png`;
        const outputPath = _path.join(this.OUTPUT_DIR, filename);
        // 3. Composite everything using sharp (NO RESIZE - original dimensions)
        await (0, _sharp.default)(this.TEMPLATE_PATH).composite([
            {
                input: qrBuffer,
                top: 550,
                left: 376
            },
            {
                input: Buffer.from(svgText),
                top: 0,
                left: 0
            }
        ]).png().toFile(outputPath);
        return filename;
    }
};
CardUtils.TEMPLATE_PATH = _path.join(process.cwd(), 'assets/templates/membership/card_template.png');
CardUtils.OUTPUT_DIR = _path.join(process.cwd(), 'public/member-cards');

//# sourceMappingURL=card.utils.js.map