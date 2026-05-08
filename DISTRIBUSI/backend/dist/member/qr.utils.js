"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "QRUtils", {
    enumerable: true,
    get: function() {
        return QRUtils;
    }
});
const _crypto = /*#__PURE__*/ _interop_require_wildcard(require("crypto"));
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
let QRUtils = class QRUtils {
    /**
   * Generate a secure, signed token string
   */ static generateToken(data) {
        const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
        const signature = _crypto.createHmac(this.ALGORITHM, this.SECRET).update(payload).digest('base64url');
        return `${payload}.${signature}`;
    }
    /**
   * Verify and decode a token string
   */ static verifyToken(token) {
        try {
            const [payload, signature] = token.split('.');
            if (!payload || !signature) return null;
            const expectedSignature = _crypto.createHmac(this.ALGORITHM, this.SECRET).update(payload).digest('base64url');
            if (signature !== expectedSignature) {
                return null;
            }
            const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
            return decoded;
        } catch (err) {
            return null;
        }
    }
};
QRUtils.ALGORITHM = 'sha256';
QRUtils.SECRET = process.env.QR_SECRET || 'billiard-secure-qr-2026-secret-key';

//# sourceMappingURL=qr.utils.js.map