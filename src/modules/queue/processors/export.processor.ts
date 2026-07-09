import { Injectable, Logger } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { ExportResultsCsvJobData, ExportMisExcelJobData, QueueName } from '../queue.types';
import { BaseProcessor } from './base.processor';

/**
 * Export Processor
 * Handles CSV and Excel export generation for reports and MIS
 */
@Injectable()
export class ExportProcessor extends BaseProcessor {
  constructor() {
    super(ExportProcessor.name);
  }

  /**
   * Process export job (CSV or Excel)
   * Job name determines the export type
   */
  async process(job: Job): Promise<any> {
    const startTime = Date.now();
    const jobName = job.name;

    try {
      let result;
      switch (jobName) {
        case 'export-results-csv':
          result = await this.processResultsCsv(job as Job<ExportResultsCsvJobData>);
          break;
        case 'export-mis-excel':
          result = await this.processMisExcel(job as Job<ExportMisExcelJobData>);
          break;
        default:
          throw new Error(`Unknown export type: ${jobName}`);
      }

      result.duration = Date.now() - startTime;
      this.logCompletion(job, result);
      return result;
    } catch (error) {
      this.logFailure(job, error as Error);
      throw error;
    }
  }

  /**
   * Process results CSV export
   * In production: fetch results from DB and generate CSV
   */
  private async processResultsCsv(job: Job<ExportResultsCsvJobData>): Promise<any> {
    const { tenantSlug, userId, filters, exportType, startDate, endDate } = job.data;

    this.logger.log(`[${tenantSlug}] Exporting results CSV for user ${userId} (type: ${exportType})`);

    // Simulate CSV generation
    await new Promise(resolve => setTimeout(resolve, 1000));

    const filename = `results_${exportType}_${Date.now()}.csv`;
    const s3Path = `s3://pathcare-exports/${tenantSlug}/${userId}/${filename}`;

    return {
      type: 'csv',
      exportType,
      filters,
      status: 'generated',
      s3Path,
      filename,
      recordCount: Math.floor(Math.random() * 1000) + 100,
      generatedAt: new Date().toISOString(),
      downloadUrl: `${s3Path}?expires=3600`, // Presigned URL with 1-hour expiry
    };
  }

  /**
   * Process MIS Excel export
   * In production: fetch aggregated data and generate Excel report
   */
  private async processMisExcel(job: Job<ExportMisExcelJobData>): Promise<any> {
    const { tenantSlug, userId, reportType, period } = job.data;

    this.logger.log(`[${tenantSlug}] Exporting MIS Excel for user ${userId} (period: ${period})`);

    // Simulate Excel generation with multiple sheets
    await new Promise(resolve => setTimeout(resolve, 1500));

    const filename = `mis_${reportType}_${period}.xlsx`;
    const s3Path = `s3://pathcare-exports/${tenantSlug}/${userId}/${filename}`;

    return {
      type: 'excel',
      reportType,
      period,
      status: 'generated',
      s3Path,
      filename,
      sheets: ['summary', 'daily_stats', 'collection', 'tests_performed'],
      generatedAt: new Date().toISOString(),
      downloadUrl: `${s3Path}?expires=7200`, // Presigned URL with 2-hour expiry
    };
  }

  /**
   * Create worker for this processor
   */
  static createWorker(redisConfig: any): Worker {
    return new Worker(
      QueueName.EXPORTS,
      async job => {
        const processor = new ExportProcessor();
        return processor.process(job);
      },
      {
        connection: redisConfig,
        concurrency: 3,
      },
    );
  }
}
