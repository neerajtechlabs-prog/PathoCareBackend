import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  QueueName,
  GeneratePdfReportJobData,
  SendSmsJobData,
  SendEmailJobData,
  SendWhatsappJobData,
  ExportResultsCsvJobData,
  ExportMisExcelJobData,
} from '../queue.types';

/**
 * Queue Service
 * Central service for enqueuing async jobs
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QueueName.REPORTS) private reportsQueue: Queue<GeneratePdfReportJobData>,
    @InjectQueue(QueueName.NOTIFICATIONS) private notificationsQueue: Queue,
    @InjectQueue(QueueName.EXPORTS) private exportsQueue: Queue,
  ) {}

  // ============ REPORT JOBS ============

  /**
   * Enqueue a PDF report generation job
   */
  async enqueuePdfReport(data: GeneratePdfReportJobData): Promise<string> {
    try {
      const job = await this.reportsQueue.add('generate-pdf-report', data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.log(`[${data.tenantSlug}] Enqueued PDF report job ${job.id} for booking ${data.bookingId}`);
      return job.id;
    } catch (error) {
      this.logger.error(`Failed to enqueue PDF report job:`, error);
      throw error;
    }
  }

  // ============ NOTIFICATION JOBS ============

  /**
   * Enqueue an SMS notification
   */
  async enqueueSms(data: SendSmsJobData): Promise<string> {
    try {
      const job = await this.notificationsQueue.add('send-sms', data, {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.log(`[${data.tenantSlug}] Enqueued SMS job ${job.id} to ${data.phoneNumber}`);
      return job.id;
    } catch (error) {
      this.logger.error(`Failed to enqueue SMS job:`, error);
      throw error;
    }
  }

  /**
   * Enqueue an email notification
   */
  async enqueueEmail(data: SendEmailJobData): Promise<string> {
    try {
      const job = await this.notificationsQueue.add('send-email', data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.log(`[${data.tenantSlug}] Enqueued email job ${job.id} to ${data.to}`);
      return job.id;
    } catch (error) {
      this.logger.error(`Failed to enqueue email job:`, error);
      throw error;
    }
  }

  /**
   * Enqueue a WhatsApp notification
   */
  async enqueueWhatsapp(data: SendWhatsappJobData): Promise<string> {
    try {
      const job = await this.notificationsQueue.add('send-whatsapp', data, {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.log(`[${data.tenantSlug}] Enqueued WhatsApp job ${job.id} to ${data.phoneNumber}`);
      return job.id;
    } catch (error) {
      this.logger.error(`Failed to enqueue WhatsApp job:`, error);
      throw error;
    }
  }

  // ============ EXPORT JOBS ============

  /**
   * Enqueue a results CSV export
   */
  async enqueueResultsCsvExport(data: ExportResultsCsvJobData): Promise<string> {
    try {
      const job = await this.exportsQueue.add('export-results-csv', data, {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.log(`[${data.tenantSlug}] Enqueued CSV export job ${job.id} for user ${data.userId}`);
      return job.id;
    } catch (error) {
      this.logger.error(`Failed to enqueue CSV export job:`, error);
      throw error;
    }
  }

  /**
   * Enqueue an MIS Excel export
   */
  async enqueueMisExcelExport(data: ExportMisExcelJobData): Promise<string> {
    try {
      const job = await this.exportsQueue.add('export-mis-excel', data, {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.log(`[${data.tenantSlug}] Enqueued Excel export job ${job.id} for user ${data.userId}`);
      return job.id;
    } catch (error) {
      this.logger.error(`Failed to enqueue Excel export job:`, error);
      throw error;
    }
  }

  // ============ QUEUE HEALTH & STATS ============

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<any> {
    try {
      const [reportStats, notificationStats, exportStats] = await Promise.all([
        this.getQueueHealth(this.reportsQueue, QueueName.REPORTS),
        this.getQueueHealth(this.notificationsQueue, QueueName.NOTIFICATIONS),
        this.getQueueHealth(this.exportsQueue, QueueName.EXPORTS),
      ]);

      return {
        queues: {
          [QueueName.REPORTS]: reportStats,
          [QueueName.NOTIFICATIONS]: notificationStats,
          [QueueName.EXPORTS]: exportStats,
        },
        summary: {
          totalQueues: 3,
          totalActive: reportStats.active + notificationStats.active + exportStats.active,
          totalPending: reportStats.waiting + notificationStats.waiting + exportStats.waiting,
          totalFailed: reportStats.failed + notificationStats.failed + exportStats.failed,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get queue stats:', error);
      throw error;
    }
  }

  /**
   * Get health status of a specific queue
   */
  private async getQueueHealth(queue: Queue, name: string): Promise<any> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.count(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      name,
      waiting,
      active,
      completed,
      failed,
      delayed,
      status: active > 0 ? 'processing' : failed > 0 ? 'error' : 'idle',
    };
  }
}
