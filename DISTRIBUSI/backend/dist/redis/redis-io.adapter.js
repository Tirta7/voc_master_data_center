"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "RedisIoAdapter", {
    enumerable: true,
    get: function() {
        return RedisIoAdapter;
    }
});
const _platformsocketio = require("@nestjs/platform-socket.io");
const _redisadapter = require("@socket.io/redis-adapter");
const _ioredis = /*#__PURE__*/ _interop_require_default(require("ioredis"));
const _config = require("@nestjs/config");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let RedisIoAdapter = class RedisIoAdapter extends _platformsocketio.IoAdapter {
    /**
   * Safe connection to Redis with explicit timeout and error handling.
   * If Redis fails, the adapter remains undefined and Socket.IO
   * will use its default in-memory adapter.
   */ async connectToRedis() {
        const configService = this.app.get(_config.ConfigService);
        const host = configService.get('REDIS_HOST') || 'localhost';
        const port = configService.get('REDIS_PORT') || 6379;
        const redisConfig = {
            host,
            port,
            retryStrategy: (times)=>Math.min(times * 100, 3000),
            maxRetriesPerRequest: 3,
            connectTimeout: 5000,
            lazyConnect: true
        };
        const pubClient = new _ioredis.default(redisConfig);
        const subClient = pubClient.duplicate();
        try {
            // Implementation of a hard 6s timeout to prevent app boot hanging
            await Promise.race([
                Promise.all([
                    pubClient.connect(),
                    subClient.connect()
                ]),
                new Promise((_, reject)=>{
                    this.timeoutId = setTimeout(()=>reject(new Error('Redis connection timeout')), 6000);
                })
            ]);
            if (this.timeoutId) clearTimeout(this.timeoutId);
            this.adapterConstructor = (0, _redisadapter.createAdapter)(pubClient, subClient);
            console.log('✅ Redis Adapter initialized');
        } catch (err) {
            console.error('⚠️ RedisIoAdapter connection failed:', err?.message || 'Unknown error');
            console.warn('⚠️ Falling back to default Socket.io adapter.');
        }
    }
    createIOServer(port, options) {
        const server = super.createIOServer(port, options);
        if (this.adapterConstructor) {
            server.adapter(this.adapterConstructor);
        }
        return server;
    }
    constructor(app){
        super(app), this.app = app;
    }
};

//# sourceMappingURL=redis-io.adapter.js.map