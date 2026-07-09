import { Injectable } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { GeneratePdfReportJobData, QueueName } from '../queue.types';
import { BaseProcessor } from './base.processor';
import { Report } from '../../../database/entities/tenant/report.entity';
import { TenantDataSourceService } from '../../../database/datasources/tenant.datasource';

/**
 * PDF Report Generation Processor
 * Handles asynchronous PDF report generation for bookings
 */
@Injectable()
export class ReportProcessor extends BaseProcessor {
  constructor(private readonly tenantDSService: TenantDataSourceService) {
    super(ReportProcessor.name);
  }

  /**
   * Process PDF report generation job
   * In production, this would:
   * 1. Fetch booking and test data
   * 2. Render HTML template with results
   * 3. Convert to PDF using Puppeteer
   * 4. Upload to S3
   * 5. Update booking status
   */
  async process(job: Job<GeneratePdfReportJobData>): Promise<any> {
    const startTime = Date.now();
    const { tenantSlug, bookingId, patientEmail, patientPhone, reportId, publicToken } = job.data;

    try {
      this.logger.log(`[${tenantSlug}] Generating PDF report for booking ${bookingId}`);

      await this.simulateReportGeneration(bookingId);

      const result = {
        bookingId,
        tenantSlug,
        status: 'generated',
        s3Path: `s3://pathcare-reports/${tenantSlug}/${bookingId}.pdf`,
        generatedAt: new Date().toISOString(),
        notified: {
          email: patientEmail ? 'sent' : 'skipped',
          sms: patientPhone ? 'sent' : 'skipped',
        },
        duration: Date.now() - startTime,
      };

      if (reportId) {
        const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
        const reportRepo = tenantDS.getRepository(Report);
        const report = await reportRepo.findOne({ where: { id: reportId } });
        if (report) {
          report.status = 'COMPLETED';
          report.filePath = result.s3Path;
          report.downloadUrl = `/reports/public/${publicToken}`;
          report.generatedAt = new Date(result.generatedAt);
          await reportRepo.save(report);
        }
      }

      this.logCompletion(job, result);
      return result;
    } catch (error) {
      if (reportId) {
        const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
        const reportRepo = tenantDS.getRepository(Report);
        const report = await reportRepo.findOne({ where: { id: reportId } });
        if (report) {
          report.status = 'FAILED';
          report.errorMessage = error instanceof Error ? error.message : 'PDF generation failed';
          await reportRepo.save(report);
        }
      }

      this.logFailure(job, error as Error);
      throw error;
    }
  }

  /**
   * Simulate report generation (placeholder for PDF generation logic)
   */
  private async simulateReportGeneration(_bookingId: string): Promise<void> {
    // In production: use Puppeteer to generate PDF
    // await this.pdfService.generate(html, options)
    return new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Create worker for this processor
   */
  static createWorker(redisConfig: any, tenantDSService: TenantDataSourceService): Worker<GeneratePdfReportJobData> {
    return new Worker<GeneratePdfReportJobData>(
      QueueName.REPORTS,
      async job => {
        const processor = new ReportProcessor(tenantDSService);
        return processor.process(job);
      },
      {
        connection: redisConfig,
        concurrency: 2,
      },
    );
  }
}
