import { Module } from '@nestjs/common';
import { MisService } from './mis.service';
import { MisController } from './mis.controller';
import { TenantModule } from '../tenant/tenant.module';
import { QueueModule } from '../queue/queue.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TenantModule, QueueModule, AuditModule],
  providers: [MisService],
  controllers: [MisController],
  exports: [MisService],
})
export class MisModule {}
