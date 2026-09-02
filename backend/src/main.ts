import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RedisIoAdapter } from './redis/redis-io.adapter';
import compression from 'compression';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // --- Security & Performance Middleware ---
  app.use(helmet({ 
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })); // Security headers

  // ⚡ OPTIMASI KOMPRESI: Level 6 = sweet spot kecepatan vs ukuran
  // Threshold 512 bytes = jangan kompresi payload kecil (overhead tidak worth it)
  app.use(compression({
    level: 6,           // Gzip level (0-9), 6 = default sweet spot
    threshold: 512,     // Hanya kompresi jika payload > 512 bytes
    filter: (req, res) => {
      // JANGAN kompresi SSE/Event streams (mencegah buffering)
      if (req.headers['accept'] === 'text/event-stream') {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // ⚡ OPTIMASI HEADER: Keep-Alive agar koneksi TCP tidak selalu dibuat baru
  // Ini sangat penting untuk Cloudflare Tunnel agar koneksi di-reuse
  app.use((req: any, res: any, next: any) => {
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=60, max=1000');
    next();
  });

  // --- Socket.IO Adapter (Redis-backed for scalability) ---
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({
    origin: process.env.FRONTEND_URL || true, // Use env var in production
    credentials: true,
  });
  app.useStaticAssets(join(__dirname, '..', 'public'));

  const server = await app.listen(process.env.PORT ?? 4000, '0.0.0.0');

  // ⚡ OPTIMASI TCP: Aktifkan keep-alive di level TCP untuk Node.js HTTP server
  server.keepAliveTimeout = 65000;   // Lebih dari Cloudflare Tunnel (60s)
  server.headersTimeout = 70000;     // Harus lebih besar dari keepAliveTimeout

  // Disable default 120s Node.js timeout for long-lived connections like SSE
  server.setTimeout(0);

  // --- Graceful Shutdown ---
  // Allows existing connections to finish before the server closes
  process.on('SIGTERM', async () => {
    console.log('[SIGTERM] Graceful shutdown initiated...');
    await app.close();
    console.log('[SIGTERM] Server closed cleanly.');
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[SIGINT] Shutting down...');
    await app.close();
    process.exit(0);
  });

  console.log(`🚀 Server running on port ${process.env.PORT ?? 4000}`);
}
bootstrap();

