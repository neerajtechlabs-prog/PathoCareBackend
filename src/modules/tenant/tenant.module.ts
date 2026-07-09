import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantMiddleware } from './tenant.middleware';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { AuditService } from '../audit/audit.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TenantController],
  providers: [TenantService, TenantMiddleware, TenantDataSourceService, AuditService],
  exports: [TenantService, TenantDataSourceService, AuditService],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TenantMiddleware)
      .forRoutes(
        { path: 'tenants', method: RequestMethod.ALL },
        { path: 'auth', method: RequestMethod.ALL }
      );
  }
}
