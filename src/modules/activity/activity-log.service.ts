import { Injectable, Logger } from '@nestjs/common';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';

export type ActivityLogType = 'BOOKING_CREATED' | 'RESULT_ENTERED' | 'RECEIPT_CREATED' | 'REPORT_GENERATED';

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private readonly tenantDataSourceService: TenantDataSourceService) {}

  async logActivity(
    tenantId: string,
    type: ActivityLogType,
    title: string,
    detail: string,
    referenceId?: string,
  ): Promise<void> {
    try {
      const tenantDS = await this.tenantDataSourceService.getForTenant(tenantId);
      const repo = tenantDS.getRepository('activity_logs');
      await repo.save({
        tenantId,
        type,
        title,
        detail,
        referenceId: referenceId ?? null,
      });
    } catch (error) {
      this.logger.warn(`Activity log insert failed for tenant ${tenantId}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
}
