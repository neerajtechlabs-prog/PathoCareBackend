import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { MisService } from '../mis/mis.service';

@Injectable()
export class DashboardService {
  private readonly tenantDataSourceService: TenantDataSourceService;

  constructor(
    @Optional() tenantDataSourceService?: TenantDataSourceService,
    @Optional() private readonly misService?: MisService
  ) {
    this.tenantDataSourceService =
      tenantDataSourceService ??
      new TenantDataSourceService({
        get: (key: string) => process.env[key],
      } as unknown as ConfigService);
  }

  async getWorkload(tenantSlug: string, _opts: { dateFrom?: string; dateTo?: string } = {}) {
    const tenantDS = await this.tenantDataSourceService.getForTenant(tenantSlug);

    // Pending bookings
    const pendingRes: any[] = await tenantDS.query(`SELECT COUNT(*)::int AS pending FROM bookings WHERE status = $1`, ['Pending']);
    const pending = pendingRes?.[0]?.pending ?? 0;

    // Processed today (test_results created today)
    const processedRes: any[] = await tenantDS.query(`SELECT COUNT(*)::int AS processed FROM test_results WHERE created_at::date = CURRENT_DATE`);
    const processed = processedRes?.[0]?.processed ?? 0;

    // Average turnaround time in hours (test_results.created_at - bookings.created_at)
    const tatRes: any[] = await tenantDS.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (tr.created_at - b.created_at))/3600)::numeric(10,2) AS avg_tat_hours
      FROM test_results tr
      JOIN bookings b ON b.id = tr.booking_id
      WHERE tr.created_at IS NOT NULL AND b.created_at IS NOT NULL
    `);
    const avgTAT = tatRes?.[0]?.avg_tat_hours ? Number(tatRes[0].avg_tat_hours) : 0;

    // Tests per verifier (using verified_by)
    const perTech: any[] = await tenantDS.query(`
      SELECT tr.verified_by AS tech_id, COUNT(*)::int AS count
      FROM test_results tr
      WHERE tr.verified_by IS NOT NULL
      GROUP BY tr.verified_by
      ORDER BY count DESC
      LIMIT 20
    `);

    return {
      pending,
      processed,
      avgTAT,
      testsPerTech: perTech,
    };
  }

  async getSummary(tenantSlug: string) {
    // Confirmed workflow-stage definitions:
    // - outstandingTests = tests ordered but no result entered yet (pre-entry stage)
    // - pendingResults = results entered but not yet verified (post-entry, pre-verification stage)
    // - dueReceipts = bookings with outstanding balance (amount - collected > 0), counted by booking, not rupee value
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const tenantDS = await this.tenantDataSourceService.getForTenant(tenantSlug);

    const [
      dayCollection,
      totalPatientsToday,
      totalPatientsYesterday,
      statusToday,
      statusYesterday,
      dueReceiptsToday,
      dueReceiptsYesterday,
      workloadRows,
    ] = await Promise.all([
      this.misService?.getDayCollection(tenantSlug, today) ?? Promise.resolve({ totalBookings: 0 }),
      this.safeTenantQuery(tenantDS, `SELECT COUNT(*)::int AS total FROM patients WHERE "createdAt"::date = $1`, [today]),
      this.safeTenantQuery(tenantDS, `SELECT COUNT(*)::int AS total FROM patients WHERE "createdAt"::date = $1`, [yesterday]),
      this.safeTenantQuery(
        tenantDS,
        `
          SELECT
            COUNT(*) FILTER (WHERE tr.id IS NULL)::int AS "outstandingTests",
            COUNT(*) FILTER (WHERE tr.id IS NOT NULL AND tr.verified_by IS NULL)::int AS "pendingResults"
          FROM booking_tests bt
          LEFT JOIN test_results tr ON tr.booking_id = bt."bookingId" AND tr.test_id = bt."testId"
          WHERE bt."createdAt"::date = $1
        `,
        [today],
      ),
      this.safeTenantQuery(
        tenantDS,
        `
          SELECT
            COUNT(*) FILTER (WHERE tr.id IS NULL)::int AS "outstandingTests",
            COUNT(*) FILTER (WHERE tr.id IS NOT NULL AND tr.verified_by IS NULL)::int AS "pendingResults"
          FROM booking_tests bt
          LEFT JOIN test_results tr ON tr.booking_id = bt."bookingId" AND tr.test_id = bt."testId"
          WHERE bt."createdAt"::date = $1
        `,
        [yesterday],
      ),
      this.safeTenantQuery(
        tenantDS,
        `
          SELECT COUNT(DISTINCT b.id)::int AS total
          FROM bookings b
          WHERE (b.amount - COALESCE(
            (SELECT SUM(r.amount) FROM booking_receipts r WHERE r."bookingId" = b.id), 0
          )) > 0
        `,
      ),
      this.safeTenantQuery(
        tenantDS,
        `
          SELECT COUNT(DISTINCT b.id)::int AS total
          FROM bookings b
          WHERE (b.amount - COALESCE(
            (SELECT SUM(r.amount) FROM booking_receipts r WHERE r."bookingId" = b.id), 0
          )) > 0
        `,
      ),
      this.safeTenantQuery(
        tenantDS,
        `
          SELECT
            t.department,
            COUNT(*) FILTER (WHERE tr.id IS NOT NULL)::int AS completed,
            COUNT(*)::int AS total
          FROM booking_tests bt
          JOIN tests t ON t.id = bt."testId"
          LEFT JOIN test_results tr ON tr.booking_id = bt."bookingId" AND tr.test_id = bt."testId"
          WHERE bt."createdAt"::date = CURRENT_DATE
          GROUP BY t.department
        `,
      ),
    ]);

    const todayStatus = statusToday?.[0] ?? {};
    const yesterdayStatus = statusYesterday?.[0] ?? {};
    const totalPatients = Number(totalPatientsToday?.[0]?.total ?? 0);
    const totalPatientsYesterdayValue = Number(totalPatientsYesterday?.[0]?.total ?? 0);
    const outstandingTests = Number(todayStatus.outstandingTests ?? 0);
    const outstandingTestsYesterdayValue = Number(yesterdayStatus.outstandingTests ?? 0);
    const pendingResults = Number(todayStatus.pendingResults ?? 0);
    const pendingResultsYesterdayValue = Number(yesterdayStatus.pendingResults ?? 0);
    const dueReceipts = Number(dueReceiptsToday?.[0]?.total ?? 0);
    const dueReceiptsYesterdayValue = Number(dueReceiptsYesterday?.[0]?.total ?? 0);

    const workload = (workloadRows ?? [])
      .filter((row: any) => row?.department)
      .map((row: any) => {
        const total = Number(row.total ?? 0);
        const completed = Number(row.completed ?? 0);
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          department: row.department,
          progress,
        };
      });

    return {
      stats: {
        totalPatients: {
          value: totalPatients,
          trend: this.getTrend(totalPatients, totalPatientsYesterdayValue),
        },
        pendingResults: {
          value: pendingResults,
          trend: this.getTrend(pendingResults, pendingResultsYesterdayValue),
        },
        dueReceipts: {
          value: dueReceipts,
          trend: this.getTrend(dueReceipts, dueReceiptsYesterdayValue),
        },
        outstandingTests: {
          value: outstandingTests,
          trend: this.getTrend(outstandingTests, outstandingTestsYesterdayValue),
        },
      },
      workload,
      today: {
        bookings: Number((dayCollection as any)?.totalBookings ?? 0),
        reportsPending: pendingResults,
        receiptsDue: dueReceipts,
      },
      // TODO: populate once activity_log table exists (see separate task)
      recentActivity: [],
    };
  }

  private async safeTenantQuery(tenantDS: any, sql: string, params: unknown[] = []): Promise<any[]> {
    try {
      return await tenantDS.query(sql, params);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('does not exist') || message.includes('relation') || message.includes('column')) {
        return [];
      }
      throw error;
    }
  }

  private getTrend(todayValue: number, yesterdayValue: number): string {
    if (yesterdayValue === 0) {
      return 'N/A';
    }

    const delta = ((todayValue - yesterdayValue) / yesterdayValue) * 100;
    const formatted = delta.toFixed(1);
    return `${delta >= 0 ? '+' : ''}${formatted}%`;
  }
}
