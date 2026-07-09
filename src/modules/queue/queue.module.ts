import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './services/queue.service';
import { DatabaseModule } from '../../database/database.module';
import { QueueInitializer } from './queue.initializer';
import { QueueName } from './queue.config';

@Module({
  imports: [
    // Configure BullModule with Redis connection from environment
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
          retryStrategy: (times: number) => Math.min(times * 50, 2000),
        },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
    }),
    // Register individual queues
    BullModule.registerQueue(
      { name: QueueName.REPORTS },
      { name: QueueName.NOTIFICATIONS },
      { name: QueueName.EXPORTS },
    ),
    DatabaseModule,
  ],
  providers: [QueueService, QueueInitializer],
  exports: [QueueService],
})
export class QueueModule {}
