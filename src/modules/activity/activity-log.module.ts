import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module';
import { ActivityLogService } from './activity-log.service';

@Module({
  imports: [TenantModule],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
