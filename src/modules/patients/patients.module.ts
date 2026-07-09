import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from '../../database/entities/tenant';
import { PatientsController } from './patients.controller';
import { PatientsService } from './services/patients.service';
import { PatientRepository } from './repositories/patient.repository';
import { TenantModule } from '../tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Patient]), TenantModule, AuditModule],
  controllers: [PatientsController],
  providers: [PatientsService, PatientRepository],
  exports: [PatientsService],
})
export class PatientsModule {}
