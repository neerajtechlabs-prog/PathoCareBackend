import { Injectable } from '@nestjs/common';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';

@Injectable()
export class DashboardService {
  constructor(private tenantDSService: TenantDataSourceService) {}

  async getWorkload(tenantSlug: string, _opts: { dateFrom?: string; dateTo?: string } = {}) {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);

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
}
