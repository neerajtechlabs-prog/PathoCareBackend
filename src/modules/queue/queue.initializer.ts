import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import { ReportProcessor, NotificationProcessor, ExportProcessor, ResultsEvaluateProcessor } from './processors';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { QueueService } from './services/queue.service';

/**
 * Queue Initializer
 * Creates and manages worker processes for async job processing
 */
@Injectable()
export class QueueInitializer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueInitializer.name);
  private workers: Worker[] = [];

  constructor(private configService: ConfigService, private tenantDSService: TenantDataSourceService, private queueService: QueueService) {}

  /**
   * Initialize workers on module startup
   */
  async onModuleInit(): Promise<void> {
    try {
      const redisConfig = {
        host: this.configService.get<string>('REDIS_HOST') || 'localhost',
        port: this.configService.get<number>('REDIS_PORT') || 6379,
      };

      // Create workers for each processor
      const reportWorker = ReportProcessor.createWorker(redisConfig);
      const notificationWorker = NotificationProcessor.createWorker(redisConfig);
      const exportWorker = ExportProcessor.createWorker(redisConfig);
      const resultsWorker = ResultsEvaluateProcessor.createWorker(redisConfig, this.tenantDSService, this.queueService);

      this.workers = [reportWorker, notificationWorker, exportWorker, resultsWorker];

      // Setup event listeners for workers
      this.setupWorkerListeners();

      this.logger.log(`✅ Queue workers initialized (${this.workers.length} workers ready)`);
    } catch (error) {
      this.logger.error('Failed to initialize queue workers:', error);
      throw error;
    }
  }

  /**
   * Cleanup workers on module shutdown
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await Promise.all(this.workers.map(worker => worker.close()));
      this.logger.log(`✅ Queue workers gracefully shut down`);
    } catch (error) {
      this.logger.error('Error during queue worker shutdown:', error);
    }
  }

  /**
   * Setup event listeners for all workers
   */
  private setupWorkerListeners(): void {
    this.workers.forEach((worker, index) => {
      const workerName = ['Reports', 'Notifications', 'Exports', 'ResultsEvaluate'][index];

      worker.on('completed', job => {
        this.logger.debug(`[${workerName}] Job ${job?.id ?? 'unknown'} completed`);
      });

      worker.on('failed', (job, error) => {
        this.logger.warn(`[${workerName}] Job ${job?.id ?? 'unknown'} failed: ${error?.message ?? String(error)}`);
      });

      worker.on('error', error => {
        this.logger.error(`[${workerName}] Worker error:`, error);
      });

      worker.on('stalled', (job: any) => {
        const jobId = typeof job === 'string' ? job : (job?.id ?? 'unknown');
        this.logger.warn(`[${workerName}] Job ${jobId} stalled`);
      });
    });
  }

  /**
   * Get list of active workers
   */
  getActiveWorkers(): Array<{ name: string; status: string }> {
    return this.workers.map((worker, index) => ({
      name: ['reports-processor', 'notifications-processor', 'exports-processor'][index],
      status: worker ? 'active' : 'inactive',
    }));
  }
}
