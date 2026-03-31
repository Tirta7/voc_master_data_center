import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions, Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis, { RedisOptions } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { INestApplicationContext } from '@nestjs/common';

/**
 * Custom Redis IO Adapter
 * Handles real-time sync across multiple NestJS instances with fallback logic.
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | undefined;
  private timeoutId: NodeJS.Timeout | undefined;

  constructor(private app: INestApplicationContext) {
    super(app);
  }

  /**
   * Safe connection to Redis with explicit timeout and error handling.
   * If Redis fails, the adapter remains undefined and Socket.IO
   * will use its default in-memory adapter.
   */
  async connectToRedis(): Promise<void> {
    const configService = this.app.get(ConfigService);
    const host = configService.get<string>('REDIS_HOST') || 'localhost';
    const port = configService.get<number>('REDIS_PORT') || 6379;

    const redisConfig: RedisOptions = {
      host,
      port,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: true,
    };

    const pubClient = new Redis(redisConfig);
    const subClient = pubClient.duplicate();

    try {
      // Implementation of a hard 6s timeout to prevent app boot hanging
      await Promise.race([
        Promise.all([pubClient.connect(), subClient.connect()]),
        new Promise((_, reject) => {
          this.timeoutId = setTimeout(
            () => reject(new Error('Redis connection timeout')),
            6000,
          );
        }),
      ]);

      if (this.timeoutId) clearTimeout(this.timeoutId);
      this.adapterConstructor = createAdapter(pubClient, subClient);
      console.log('✅ Redis Adapter initialized');
    } catch (err: any) {
      console.error(
        '⚠️ RedisIoAdapter connection failed:',
        err?.message || 'Unknown error',
      );
      console.warn('⚠️ Falling back to default Socket.io adapter.');
    }
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server: Server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
