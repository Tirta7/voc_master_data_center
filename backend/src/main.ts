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

  // Gzip responses, but IGNORE Server-Sent Events (SSE) to prevent buffering
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['accept'] === 'text/event-stream') {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

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
