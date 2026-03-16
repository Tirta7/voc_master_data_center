import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;

    this.client = new Redis({
      host,
      port,
      retryStrategy: (times) => {
        return Math.min(times * 50, 2000);
      },
      enableOfflineQueue: false, // Prevent hanging requests if Redis is down
      connectTimeout: 3000,
    });
    
    // Proactively fix MISCONF if it happens to allow system to continue
    this.client.on('connect', () => {
      this.client.config('SET', 'stop-writes-on-bgsave-error', 'no').catch(err => {
        this.logger.warn(`Failed to set stop-writes-on-bgsave-error: ${err.message}`);
      });
    });
    
    let hasLoggedError = false;

    this.client.on('connect', () => {
      this.logger.log(`Successfully connected to Redis at ${host}:${port}`);
      hasLoggedError = false;
    });

    this.client.on('error', (err) => {
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
   */
  async acquireLock(key: string, ttl: number = 5000): Promise<boolean> {
    try {
      const result = await this.client.set(
        `lock:${key}`,
        'LOCKED',
        'PX',
        ttl,
        'NX',
      );
      return result === 'OK';
    } catch (err) {
      this.logger.warn(`Redis acquireLock failed: ${err.message}`);
      return false; // Default to fail-open/fail-closed depending on logic, but don't hang
    }
  }

  async releaseLock(key: string): Promise<void> {
    try {
      await this.client.del(`lock:${key}`);
    } catch (err) {
      this.logger.warn(`Redis releaseLock failed: ${err.message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(`Redis del failed: ${err.message}`);
    }
  }

  /**
   * Set an idempotency key to prevent repeating the same operation
   */
  async setIdempotency(key: string, result: any, ttl: number = 3600000): Promise<void> {
    try {
      await this.client.set(
        `idempotency:${key}`,
        JSON.stringify(result),
        'PX',
        ttl,
      );
    } catch (err) {
      this.logger.warn(`Redis setIdempotency failed: ${err.message}`);
    }
  }

  /**
   * Get an existing idempotency result
   */
  async getIdempotency(key: string): Promise<any | null> {
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
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
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
   */
  async get(key: string): Promise<any> {
    let data: any;
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
    } catch {
      return data;
    }
  }
}
