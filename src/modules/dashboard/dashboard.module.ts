import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { MisModule } from '../mis/mis.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, MisModule, AuditModule],
  providers: [DashboardService],
  controllers: [DashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}
