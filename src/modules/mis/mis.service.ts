import { Injectable, Logger } from '@nestjs/common';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { QueueService } from '../queue/services/queue.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class MisService {
  private readonly logger = new Logger(MisService.name);

  constructor(
    private readonly tenantDSService: TenantDataSourceService,
    private readonly queueService?: QueueService,
    private readonly auditService?: AuditService,
  ) {}

  async getDayCollection(tenantSlug: string, date: string) {
    this.logger.debug(`[MIS] Fetching day collection for tenant=${tenantSlug} date=${date}`);
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
      [date],
    );

    const modeRows = await tenantDS.query(
      `
        SELECT br."paymentMode" AS "paymentMode", COALESCE(SUM(br.amount), 0)::numeric(10,2) AS "totalCollected"
        FROM booking_receipts br
        WHERE br."createdAt"::date = $1
        GROUP BY br."paymentMode"
        ORDER BY br."paymentMode"
      `,
      [date],
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
      [date],
    );

    const summary = summaryRows?.[0] ?? {};

    return {
      date,
      totalBookings: Number(summary.totalBookings ?? 0),
      totalBilled: Number(summary.totalBilled ?? 0),
      totalCollected: Number(summary.totalCollected ?? 0),
      pendingBalance: Number(summary.pendingBalance ?? 0),
      modeWiseCollection: (modeRows ?? []).map((row: any) => ({
        paymentMode: row.paymentMode ?? 'Unknown',
        totalCollected: Number(row.totalCollected ?? 0),
      })),
      testWiseCounts: (testRows ?? []).map((row: any) => ({
        testName: row.testName ?? 'Unknown',
        totalTests: Number(row.totalTests ?? 0),
      })),
    };
  }

  async getDayRegister(tenantSlug: string, date: string) {
    this.logger.debug(`[MIS] Fetching day register for tenant=${tenantSlug} date=${date}`);
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);

    return tenantDS.query(
      `
        SELECT
          b."bookingNumber" AS "bookingNumber",
          p.name AS "patientName",
          COALESCE(b.amount, 0)::numeric(10,2) AS "totalAmount",
          COALESCE(b."paidAmount", 0)::numeric(10,2) AS "paidAmount",
          (COALESCE(b.amount, 0) - COALESCE(b."paidAmount", 0))::numeric(10,2) AS "balance",
          b.status AS "status"
        FROM bookings b
        JOIN patients p ON p.id = b."patientId"
        WHERE b."createdAt"::date = $1
        ORDER BY b."createdAt" DESC
      `,
      [date],
    );
  }

  async exportDayCollection(tenantSlug: string, date: string, userId: string) {
    this.logger.debug(`[MIS] Queueing export for tenant=${tenantSlug} date=${date} user=${userId}`);
    if (!this.queueService) {
      throw new Error('Queue service not available');
    }

    const jobId = await this.queueService.enqueueMisExcelExport({
      tenantSlug,
      userId,
      reportType: 'daily',
      period: date,
    });

    if (this.auditService) {
      await this.auditService.logEvent({
        tenantSlug,
        action: 'mis.export_requested',
        entityType: 'mis_export',
        userId,
        newValues: { date, reportType: 'daily', jobId },
      });
    }

    return {
      status: 'queued',
      jobId,
      date,
      message: 'MIS Excel export queued successfully',
    };
  }
}
