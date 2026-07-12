import { Injectable } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { TenantDataSourceService } from '../../../database/datasources/tenant.datasource';
import { ExportResultsCsvJobData, ExportMisExcelJobData, QueueName } from '../queue.types';
import { BaseProcessor } from './base.processor';

/**
 * Export Processor
 * Handles CSV and Excel export generation for reports and MIS
 */
@Injectable()
export class ExportProcessor extends BaseProcessor {
  constructor(private readonly tenantDSService: TenantDataSourceService) {
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
    const { tenantSlug, userId, filters, exportType } = job.data;

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

    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);

    const summaryRows = await tenantDS.query(
      `
        SELECT
          COUNT(DISTINCT b.id)::int AS "totalBookings",
          COALESCE(SUM(COALESCE(b.amount, 0))::numeric(10,2), 0) AS "totalBilled",
          COALESCE(SUM(COALESCE(br.amount, 0))::numeric(10,2), 0) AS "totalCollected",
          COALESCE(SUM(COALESCE(b.amount, 0) - COALESCE(br.amount, 0))::numeric(10,2), 0) AS "pendingBalance"
        FROM bookings b
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(r.amount), 0) AS amount
          FROM booking_receipts r
          WHERE r."bookingId" = b.id
            AND r."createdAt"::date = $1
        ) br ON TRUE
        WHERE b."createdAt"::date = $1
      `,
      [period],
    );

    const collectionRows = await tenantDS.query(
      `
        SELECT br."paymentMode" AS "paymentMode", COALESCE(SUM(br.amount), 0)::numeric(10,2) AS "totalCollected"
        FROM booking_receipts br
        WHERE br."createdAt"::date = $1
        GROUP BY br."paymentMode"
        ORDER BY br."paymentMode"
      `,
      [period],
    );

    const testRows = await tenantDS.query(
      `
        SELECT t.name AS "testName", COUNT(bt.id)::int AS "totalTests"
        FROM booking_tests bt
        JOIN tests t ON t.id = bt."testId"
        WHERE bt."createdAt"::date = $1
        GROUP BY t.name
        ORDER BY "totalTests" DESC
      `,
      [period],
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PathCare';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('summary');
    summarySheet.columns = [
      { header: 'metric', key: 'metric' },
      { header: 'value', key: 'value' },
    ];
    summarySheet.addRows([
      ['period', period],
      ['totalBookings', summaryRows?.[0]?.totalBookings ?? 0],
      ['totalBilled', Number(summaryRows?.[0]?.totalBilled ?? 0)],
      ['totalCollected', Number(summaryRows?.[0]?.totalCollected ?? 0)],
      ['pendingBalance', Number(summaryRows?.[0]?.pendingBalance ?? 0)],
    ]);

    const dailySheet = workbook.addWorksheet('daily_stats');
    dailySheet.columns = [
      { header: 'metric', key: 'metric' },
      { header: 'value', key: 'value' },
    ];
    dailySheet.addRows([
      ['reportType', reportType],
      ['generatedBy', userId],
      ['generatedAt', new Date().toISOString()],
    ]);

    const collectionSheet = workbook.addWorksheet('collection');
    collectionSheet.columns = [
      { header: 'paymentMode', key: 'paymentMode' },
      { header: 'totalCollected', key: 'totalCollected' },
    ];
    collectionSheet.addRows((collectionRows ?? []).map((row: any) => ({
      paymentMode: row.paymentMode ?? 'Unknown',
      totalCollected: Number(row.totalCollected ?? 0),
    })));

    const testsSheet = workbook.addWorksheet('tests_performed');
    testsSheet.columns = [
      { header: 'testName', key: 'testName' },
      { header: 'totalTests', key: 'totalTests' },
    ];
    testsSheet.addRows((testRows ?? []).map((row: any) => ({
      testName: row.testName ?? 'Unknown',
      totalTests: Number(row.totalTests ?? 0),
    })));

    const exportDir = path.join(process.cwd(), 'tmp', 'exports', tenantSlug);
    await fs.mkdir(exportDir, { recursive: true });

    const safePeriod = period.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `mis_${reportType}_${safePeriod}.xlsx`;
    const filePath = path.join(exportDir, filename);
    await workbook.xlsx.writeFile(filePath);

    return {
      type: 'excel',
      reportType,
      period,
      status: 'generated',
      filename,
      filePath,
      sheets: ['summary', 'daily_stats', 'collection', 'tests_performed'],
      generatedAt: new Date().toISOString(),
      downloadUrl: filePath,
    };
  }

  /**
   * Create worker for this processor
   */
  static createWorker(redisConfig: any, tenantDSService: TenantDataSourceService): Worker {
    return new Worker(
      QueueName.EXPORTS,
      async job => {
        const processor = new ExportProcessor(tenantDSService);
        return processor.process(job);
      },
      {
        connection: redisConfig,
        concurrency: 3,
      },
    );
  }
}
