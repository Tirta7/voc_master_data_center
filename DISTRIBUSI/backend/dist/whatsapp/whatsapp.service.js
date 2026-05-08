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
const _path = /*#__PURE__*/ _interop_require_wildcard(require("path"));
const _fs = /*#__PURE__*/ _interop_require_wildcard(require("fs"));
const _pino = /*#__PURE__*/ _interop_require_default(require("pino"));
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
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
const baileys = require('@whiskeysockets/baileys');
const makeWASocket = baileys.default ?? baileys;
const { useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } = baileys;
let WhatsAppService = class WhatsAppService {
    async onModuleInit() {
        // Non-blocking initialization
        this.connectToWhatsApp().catch((err)=>{
            this.logger.error('Initial WhatsApp connection failed:', err);
        });
    }
    getAppUrl() {
        return this.configService.get('APP_URL') || 'http://localhost:4000';
    }
    async connectToWhatsApp() {
        if (this.sock) {
            this.logger.log('Closing existing WhatsApp connection before reconnecting...');
            try {
                this.sock.ev.removeAllListeners('connection.update');
                this.sock.ev.removeAllListeners('creds.update');
                this.sock.end(undefined);
                this.sock = null;
            } catch (e) {
                this.logger.error('Error closing old socket:', e.message);
            }
        }
        this.logger.log('Initializing WhatsApp Baileys connection...');
        this.connectionStatus = 'CONNECTING';
        this.qr = null;
        const authPath = _path.join(process.cwd(), 'auth_info_baileys');
        if (!_fs.existsSync(authPath)) {
            _fs.mkdirSync(authPath, {
                recursive: true
            });
        }
        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        const { version, isLatest } = await fetchLatestBaileysVersion();
        this.logger.log(`Using Baileys version ${version.join('.')} (latest: ${isLatest})`);
        this.sock = makeWASocket({
            auth: state,
            version,
            printQRInTerminal: false,
            shouldSyncHistoryMessage: ()=>false,
            browser: Browsers.ubuntu('Chrome'),
            logger: (0, _pino.default)({
                level: 'silent'
            }),
            connectTimeoutMs: 60000
        });
        this.sock.ev.on('connection.update', (update)=>{
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                this.qr = qr;
                this.logger.log('New QR Code generated and ready for scan.');
            }
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                this.logger.warn(`Connection closed. Status: ${statusCode}. Reconnecting: ${shouldReconnect}`);
                this.connectionStatus = 'DISCONNECTED';
                if (shouldReconnect) {
                    // Prevent rapid reconnect loops
                    setTimeout(()=>{
                        if (this.connectionStatus === 'DISCONNECTED') {
                            this.connectToWhatsApp();
                        }
                    }, 10000);
                } else {
                    this.qr = null;
                }
            } else if (connection === 'open') {
                this.logger.log('WhatsApp connection successfully opened!');
                this.connectionStatus = 'CONNECTED';
                this.qr = null;
            }
        });
        this.sock.ev.on('creds.update', saveCreds);
    }
    getStatus() {
        return {
            status: this.connectionStatus,
            qr: this.qr
        };
    }
    async sendMessage(target, message) {
        if (this.connectionStatus !== 'CONNECTED' || !this.sock) {
            this.logger.warn(`WhatsApp not connected. Message to ${target} aborted.`);
            return null;
        }
        try {
            // Ensure target format is correct for Baileys
            const formattedTarget = target.includes('@s.whatsapp.net') ? target : `${target.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
            // 🛡️ TIMEOUT GUARD (v1.2): Prevent hanging indefinitely
            const timeoutPromise = new Promise((_, reject)=>setTimeout(()=>reject(new Error('WhatsApp sendMessage timeout')), 10000));
            await Promise.race([
                this.sock.sendMessage(formattedTarget, {
                    text: message
                }),
                timeoutPromise
            ]);
            return {
                status: 'success'
            };
        } catch (error) {
            this.logger.error(`Failed to send message to ${target}: ${error.message}`);
            return null;
        }
    }
    async sendImage(target, caption, url) {
        if (this.connectionStatus !== 'CONNECTED' || !this.sock) {
            this.logger.warn(`WhatsApp not connected. Image to ${target} aborted.`);
            return null;
        }
        try {
            const formattedTarget = target.includes('@s.whatsapp.net') ? target : `${target.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
            await this.sock.sendMessage(formattedTarget, {
                image: {
                    url
                },
                caption
            });
            return {
                status: 'success'
            };
        } catch (error) {
            this.logger.error(`Failed to send image to ${target}: ${error.message}`);
            return null;
        }
    }
    async sendDocument(target, document, fileName, caption) {
        if (this.connectionStatus !== 'CONNECTED' || !this.sock) {
            this.logger.warn(`WhatsApp not connected. Document to ${target} aborted.`);
            return null;
        }
        try {
            const formattedTarget = target.includes('@s.whatsapp.net') ? target : `${target.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
            await this.sock.sendMessage(formattedTarget, {
                document,
                mimetype: 'application/pdf',
                fileName,
                caption
            });
            return {
                status: 'success'
            };
        } catch (error) {
            this.logger.error(`Failed to send document to ${target}: ${error.message}`);
            return null;
        }
    }
    async logout() {
        try {
            if (this.sock) {
                await this.sock.logout('User initiated logout');
                this.sock = null;
            }
            this.connectionStatus = 'DISCONNECTED';
            this.qr = null;
            const authPath = _path.join(process.cwd(), 'auth_info_baileys');
            if (_fs.existsSync(authPath)) {
                // Use recursive rm with delay to ensure file locks are released
                setTimeout(()=>{
                    try {
                        _fs.rmSync(authPath, {
                            recursive: true,
                            force: true
                        });
                        this.logger.log('WhatsApp session folder cleared.');
                    } catch (e) {
                        this.logger.error(`Failed to clear auth folder: ${e.message}`);
                    }
                }, 1000);
            }
            return {
                message: 'Logged out'
            };
        } catch (error) {
            this.logger.error(`Logout failed: ${error.message}`);
            return {
                error: error.message
            };
        }
    }
    async broadcastMessage(targets, message) {
        if (this.connectionStatus !== 'CONNECTED') {
            throw new Error('WhatsApp is not connected');
        }
        if (this.isBroadcasting) {
            throw new Error('A broadcast is already in progress');
        }
        this.isBroadcasting = true;
        const total = targets.length;
        // Background execution
        (async ()=>{
            this.logger.log(`Starting broadcast to ${total} numbers...`);
            let successCount = 0;
            for (const target of targets){
                if (this.connectionStatus !== 'CONNECTED') break;
                try {
                    const res = await this.sendMessage(target, message);
                    if (res) successCount++;
                } catch (e) {
                    this.logger.error(`Failed to send broadcast to ${target}: ${e.message}`);
                }
                // Wait 2-4 seconds per message to mimic human behavior
                const delay = 2000 + Math.random() * 2000;
                await new Promise((resolve)=>setTimeout(resolve, delay));
            }
            this.isBroadcasting = false;
            this.logger.log(`Broadcast finished. Success: ${successCount}/${total}`);
        })().catch((err)=>{
            this.isBroadcasting = false;
            this.logger.error(`Broadcast process error: ${err.message}`);
        });
        return {
            status: 'started',
            total
        };
    }
    constructor(configService){
        this.configService = configService;
        this.logger = new _common.Logger(WhatsAppService.name);
        this.sock = null;
        this.qr = null;
        this.connectionStatus = 'DISCONNECTED';
        this.isBroadcasting = false;
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