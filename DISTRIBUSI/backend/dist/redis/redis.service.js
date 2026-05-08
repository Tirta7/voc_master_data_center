"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "RedisService", {
    enumerable: true,
    get: function() {
        return RedisService;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _ioredis = /*#__PURE__*/ _interop_require_default(require("ioredis"));
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
let RedisService = class RedisService {
    onModuleInit() {
        const host = this.configService.get('REDIS_HOST') || 'localhost';
        const port = this.configService.get('REDIS_PORT') || 6379;
        this.client = new _ioredis.default({
            host,
            port,
            retryStrategy: (times)=>{
                return Math.min(times * 50, 2000);
            },
            enableOfflineQueue: false,
            connectTimeout: 3000
        });
        // Proactively fix MISCONF if it happens to allow system to continue
        this.client.on('ready', ()=>{
            this.client.config('SET', 'stop-writes-on-bgsave-error', 'no').catch((err)=>{
                this.logger.warn(`Failed to set stop-writes-on-bgsave-error: ${err.message}`);
            });
        });
        let hasLoggedError = false;
        this.client.on('connect', ()=>{
            this.logger.log(`Successfully connected to Redis at ${host}:${port}`);
            hasLoggedError = false;
        });
        this.client.on('error', (err)=>{
            if (!hasLoggedError) {
                this.logger.warn(`Redis is not available at ${host}:${port}. System will continue without caching (Safe Mode).`);
                hasLoggedError = true;
            }
        });
    }
    onModuleDestroy() {
        this.client.quit();
    }
    /**
   * Acquire a distributed lock to prevent double operations (Double-Click Prevention)
   * @param key Unique key for the lock
   * @param ttl Time to live in milliseconds (defaults to 5 seconds)
   * @returns boolean true if lock acquired, false otherwise
   */ async acquireLock(key, ttl = 5000) {
        try {
            const result = await this.client.set(`lock:${key}`, 'LOCKED', 'PX', ttl, 'NX');
            return result === 'OK';
        } catch (err) {
            this.logger.warn(`Redis acquireLock failed: ${err.message}`);
            return false; // Default to fail-open/fail-closed depending on logic, but don't hang
        }
    }
    async releaseLock(key) {
        try {
            await this.client.del(`lock:${key}`);
        } catch (err) {
            this.logger.warn(`Redis releaseLock failed: ${err.message}`);
        }
    }
    async del(key) {
        try {
            await this.client.del(key);
        } catch (err) {
            this.logger.warn(`Redis del failed: ${err.message}`);
        }
    }
    /**
   * Set an idempotency key to prevent repeating the same operation
   */ async setIdempotency(key, result, ttl = 3600000) {
        try {
            await this.client.set(`idempotency:${key}`, JSON.stringify(result), 'PX', ttl);
        } catch (err) {
            this.logger.warn(`Redis setIdempotency failed: ${err.message}`);
        }
    }
    /**
   * Get an existing idempotency result
   */ async getIdempotency(key) {
        try {
            const data = await this.client.get(`idempotency:${key}`);
            return data ? JSON.parse(data) : null;
        } catch (err) {
            this.logger.warn(`Redis getIdempotency failed: ${err.message}`);
            return null;
        }
    }
    /**
   * Simple setter for general caching (e.g., temporary bill previews)
   */ async set(key, value, ttlSeconds) {
        try {
            const val = typeof value === 'object' ? JSON.stringify(value) : value;
            if (ttlSeconds) {
                await this.client.set(key, val, 'EX', ttlSeconds);
            } else {
                await this.client.set(key, val);
            }
        } catch (err) {
            this.logger.warn(`Redis SET failed for key ${key}: ${err.message}`);
        }
    }
    /**
   * Simple getter
   */ async get(key) {
        let data;
        try {
            data = await this.client.get(key);
        } catch (err) {
            this.logger.warn(`Redis GET failed for key ${key}: ${err.message}`);
            return null;
        }
        if (!data) return null;
        try {
            // Return parsed object if JSON, otherwise return raw string
            return JSON.parse(data);
        } catch  {
            return data;
        }
    }
    constructor(configService){
        this.configService = configService;
        this.logger = new _common.Logger(RedisService.name);
    }
};
RedisService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], RedisService);

//# sourceMappingURL=redis.service.js.map