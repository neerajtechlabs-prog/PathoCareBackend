import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lab, Department, SampleType } from '../../database/entities/tenant';
import { LabRepository, DepartmentRepository, SampleTypeRepository } from './repositories';
import { LabService, DepartmentService, SampleTypeService } from './services';
import { LabController, DepartmentController, SampleTypeController } from './controllers';
import { TenantModule } from '../tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lab, Department, SampleType]), TenantModule, AuditModule],
  providers: [
    LabRepository,
    DepartmentRepository,
    SampleTypeRepository,
    LabService,
    DepartmentService,
    SampleTypeService,
  ],
  controllers: [LabController, DepartmentController, SampleTypeController],
  exports: [LabService, DepartmentService, SampleTypeService],
})
export class LabModule {}
