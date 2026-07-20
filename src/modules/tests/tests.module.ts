import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestCatalog, TestParameter } from '../../database/entities/tenant';
import { TestsController } from './tests.controller';
import { PublicTestsController } from './public-tests.controller';
import { TestsService } from './services';
import { TestRepository, TestParameterRepository } from './repositories';
import { TenantModule } from '../tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TestCatalog, TestParameter]),
    TenantModule,
    AuditModule,
    DatabaseModule,
  ],
  controllers: [TestsController, PublicTestsController],
  providers: [TestsService, TestRepository, TestParameterRepository],
  exports: [TestsService],
})
export class TestsModule {}
