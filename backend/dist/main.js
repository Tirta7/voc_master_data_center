"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _core = require("@nestjs/core");
const _appmodule = require("./app.module");
const _path = require("path");
const _allexceptionsfilter = require("./common/filters/all-exceptions.filter");
const _redisioadapter = require("./redis/redis-io.adapter");
const _compression = /*#__PURE__*/ _interop_require_default(require("compression"));
const _helmet = /*#__PURE__*/ _interop_require_default(require("helmet"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
async function bootstrap() {
    const app = await _core.NestFactory.create(_appmodule.AppModule, {
        logger: [
            'error',
            'warn',
            'log'
        ]
    });
    // --- Security & Performance Middleware ---
    app.use((0, _helmet.default)({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: {
            policy: "cross-origin"
        }
    })); // Security headers
    app.use((0, _compression.default)()); // Gzip responses – reduces payload ~70%
    // --- Socket.IO Adapter (Redis-backed for scalability) ---
    const redisIoAdapter = new _redisioadapter.RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
    app.useGlobalFilters(new _allexceptionsfilter.AllExceptionsFilter());
    app.enableCors({
        origin: process.env.FRONTEND_URL || true,
        credentials: true
    });
    app.useStaticAssets((0, _path.join)(__dirname, '..', 'public'));
    const server = await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
    // --- Graceful Shutdown ---
    // Allows existing connections to finish before the server closes
    process.on('SIGTERM', async ()=>{
        console.log('[SIGTERM] Graceful shutdown initiated...');
        await app.close();
        console.log('[SIGTERM] Server closed cleanly.');
        process.exit(0);
    });
    process.on('SIGINT', async ()=>{
        console.log('[SIGINT] Shutting down...');
        await app.close();
        process.exit(0);
    });
    console.log(`🚀 Server running on port ${process.env.PORT ?? 4000}`);
}
bootstrap();

//# sourceMappingURL=main.js.map