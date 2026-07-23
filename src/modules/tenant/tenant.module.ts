import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { QueueModule } from '../queue/queue.module';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantMiddleware } from './tenant.middleware';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { AuditService } from '../audit/audit.service';
import { TenantCacheService } from './tenant-cache.service';
import { LabCodeService } from './services/lab-code.service';
import { TenantProvisioningLockService } from './services/tenant-provisioning-lock.service';
import { TenantProvisioningService } from './services/tenant-provisioning.service';

@Module({
  imports: [DatabaseModule, QueueModule],
  controllers: [TenantController],
  providers: [
    TenantService,
    TenantMiddleware,
    TenantDataSourceService,
    TenantCacheService,
    AuditService,
    LabCodeService,
    TenantProvisioningLockService,
    TenantProvisioningService,
  ],
  exports: [
    TenantService,
    TenantDataSourceService,
    TenantCacheService,
    AuditService,
    LabCodeService,
    TenantProvisioningLockService,
    TenantProvisioningService,
  ],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');
  }
}
