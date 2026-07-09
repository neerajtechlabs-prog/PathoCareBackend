import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from '../../database/entities/tenant';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './services/doctors.service';
import { DoctorRepository } from './repositories/doctor.repository';
import { TenantModule } from '../tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor]), TenantModule, AuditModule],
  controllers: [DoctorsController],
  providers: [DoctorsService, DoctorRepository],
  exports: [DoctorsService],
})
export class DoctorsModule {}
