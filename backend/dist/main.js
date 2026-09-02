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
    // ⚡ OPTIMASI KOMPRESI: Level 6 = sweet spot kecepatan vs ukuran
    // Threshold 512 bytes = jangan kompresi payload kecil (overhead tidak worth it)
    app.use((0, _compression.default)({
        level: 6,
        threshold: 512,
        filter: (req, res)=>{
            // JANGAN kompresi SSE/Event streams (mencegah buffering)
            if (req.headers['accept'] === 'text/event-stream') {
                return false;
            }
            return _compression.default.filter(req, res);
        }
    }));
    // ⚡ OPTIMASI HEADER: Keep-Alive agar koneksi TCP tidak selalu dibuat baru
    // Ini sangat penting untuk Cloudflare Tunnel agar koneksi di-reuse
    app.use((req, res, next)=>{
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Keep-Alive', 'timeout=60, max=1000');
        next();
    });
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
    // ⚡ OPTIMASI TCP: Aktifkan keep-alive di level TCP untuk Node.js HTTP server
    server.keepAliveTimeout = 65000; // Lebih dari Cloudflare Tunnel (60s)
    server.headersTimeout = 70000; // Harus lebih besar dari keepAliveTimeout
    // Disable default 120s Node.js timeout for long-lived connections like SSE
    server.setTimeout(0);
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