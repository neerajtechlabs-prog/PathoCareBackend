import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import * as redis from 'redis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private redisClient: redis.RedisClientType | null = null;

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  /**
   * Check database health
   */
  async getDbHealth(): Promise<any> {
    try {
      const result = await this.dataSource.query('SELECT NOW()');
      return {
        status: 'healthy',
        database: 'pathcare_db',
        timestamp: result[0]?.now || new Date(),
        connection: 'ok',
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Check Redis health
   */
  async getRedisHealth(): Promise<any> {
    try {
      const client = redis.createClient({
        host: this.configService.get<string>('REDIS_HOST') || 'localhost',
        port: this.configService.get<number>('REDIS_PORT') || 6379,
      });

      await client.connect();
      const pong = await client.ping();
      await client.quit();

      return {
        status: 'healthy',
        redis: 'ok',
        response: pong,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return {
        status: 'unhealthy',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Legacy method for backwards compatibility
   */
  getQueuesHealth(): { queues: string; status: string } {
    return {
      queues: 'reports, notifications, exports',
      status: 'ready',
    };
  }
}
