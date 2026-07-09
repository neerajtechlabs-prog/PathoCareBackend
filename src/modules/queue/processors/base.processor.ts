import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * Base processor class for all queue processors
 */
export abstract class BaseProcessor {
  protected logger: Logger;

  constructor(name: string) {
    this.logger = new Logger(name);
  }

  /**
   * Process a job (override in subclasses)
   */
  abstract process(job: Job): Promise<any>;

  /**
   * Handle job completion
   */
  protected logCompletion(job: Job, result: any): void {
    this.logger.log(`Job ${job.id} completed:`, result);
  }

  /**
   * Handle job failure
   */
  protected logFailure(job: Job, error: Error): void {
    this.logger.error(`Job ${job.id} failed:`, error.message, error.stack);
  }

  /**
   * Format job data for logging
   */
  protected formatJobData(job: Job): string {
    return JSON.stringify({
      id: job.id,
      name: job.name,
      attempt: job.attemptsMade,
      data: job.data,
    });
  }
}
