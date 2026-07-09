import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AuditModule } from '../audit/audit.module';
import { QueueModule } from '../queue/queue.module';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TenantModule, AuditModule, QueueModule],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
