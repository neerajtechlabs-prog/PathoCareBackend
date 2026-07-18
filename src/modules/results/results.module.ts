import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { ResultsRepository } from './repositories/results.repository';
import { AuditModule } from '../audit/audit.module';
import { QueueModule } from '../queue/queue.module';
import { TenantModule } from '../tenant/tenant.module';
import { ActivityLogModule } from '../activity/activity-log.module';

@Module({
  imports: [TenantModule, AuditModule, QueueModule, ActivityLogModule],
  providers: [ResultsService, ResultsRepository],
  controllers: [ResultsController],
  exports: [ResultsService],
})
export class ResultsModule {}
