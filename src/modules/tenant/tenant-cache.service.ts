import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as redis from 'redis';

export interface TenantCacheEntry {
  id: string;
  slug: string;
  schemaName: string;
}

type RedisClient = ReturnType<typeof redis.createClient>;

@Injectable()
export class TenantCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TenantCacheService.name);
  private readonly cacheTtlSeconds: number;
  private client?: RedisClient;

  constructor(private readonly configService: ConfigService) {
    this.cacheTtlSeconds = this.configService.get<number>('TENANT_CACHE_TTL_SECONDS') || 300;
  }

  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;
    const client = redis.createClient({ url: `redis://${host}:${port}` });

    client.on('error', (error) => {
      this.logger.warn(`Tenant cache Redis error: ${error instanceof Error ? error.message : 'unknown error'}`);
    });

    try {
      await client.connect();
      this.client = client;
      this.logger.log('Tenant cache connected to Redis');
    } catch (error) {
      this.logger.warn(`Tenant cache Redis connection unavailable: ${error instanceof Error ? error.message : 'unknown error'}`);
      await client.quit().catch(() => undefined);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  async get(slug: string): Promise<TenantCacheEntry | null> {
    if (!this.client?.isReady) {
      return null;
    }

    try {
      const raw = await this.client.get(this.cacheKey(slug));
      if (!raw) {
        return null;
      }

      const entry = JSON.parse(raw) as Partial<TenantCacheEntry>;
      if (!entry.id || !entry.slug || !entry.schemaName) {
        return null;
      }

      return {
        id: entry.id,
        slug: entry.slug,
        schemaName: entry.schemaName,
      };
    } catch (error) {
      this.logger.warn(`Tenant cache read failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return null;
    }
  }

  async set(entry: TenantCacheEntry): Promise<void> {
    if (!this.client?.isReady) {
      return;
    }

    try {
      await this.client.setEx(this.cacheKey(entry.slug), this.cacheTtlSeconds, JSON.stringify(entry));
    } catch (error) {
      this.logger.warn(`Tenant cache write failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  async invalidate(slug: string): Promise<void> {
    if (!this.client?.isReady) {
      return;
    }

    try {
      await this.client.del(this.cacheKey(slug));
    } catch (error) {
      this.logger.warn(`Tenant cache invalidation failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  private cacheKey(slug: string): string {
    return `tenant:slug:${slug}`;
  }
}
