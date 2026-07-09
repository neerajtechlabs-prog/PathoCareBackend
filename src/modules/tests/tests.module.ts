import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestCatalog, TestParameter } from '../../database/entities/tenant';
import { TestsController } from './tests.controller';
import { TestsService } from './services';
import { TestRepository, TestParameterRepository } from './repositories';
import { TenantModule } from '../tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([TestCatalog, TestParameter]), TenantModule, AuditModule],
  controllers: [TestsController],
  providers: [TestsService, TestRepository, TestParameterRepository],
  exports: [TestsService],
})
export class TestsModule {}
