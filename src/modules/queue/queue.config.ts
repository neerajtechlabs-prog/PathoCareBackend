import { BullModuleOptions, BullModuleAsyncOptions } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { QueueName } from './queue.types';

/**
 * Queue configuration factory
 */
export const getQueueConfig = (configService: ConfigService): BullModuleOptions => ({
  connection: {
    host: configService.get<string>('REDIS_HOST') || 'localhost',
    port: configService.get<number>('REDIS_PORT') || 6379,
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
  },
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
});

/**
 * Async configuration for BullModule
 */
export const getQueueAsyncConfig = (): BullModuleAsyncOptions => ({
  useFactory: (configService: ConfigService) => getQueueConfig(configService),
  inject: [ConfigService],
});

export { QueueName };
