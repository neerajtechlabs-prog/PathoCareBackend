import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDataSourceService } from '../../../database/datasources/tenant.datasource';
import { AuditService } from '../../audit/audit.service';
import { PatientRepository } from '../repositories/patient.repository';
import { Patient } from '../../../database/entities/tenant/patient.entity';
import { buildPatientUid } from '../utils/patient-uid.util';

@Injectable()
export class PatientsService {

  constructor(
    private readonly tenantDSService: TenantDataSourceService,
    private readonly auditService: AuditService,
    private readonly patientRepository: PatientRepository,
  ) {}

  async findAll(tenantSlug: string, query?: string): Promise<Patient[]> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    return this.patientRepository.findAll(tenantDS, query);
  }

  async findById(tenantSlug: string, patientId: string): Promise<Patient> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const patient = await this.patientRepository.findById(tenantDS, patientId);
    if (!patient) {
      throw new NotFoundException(`Patient ${patientId} not found`);
    }
    return patient;
  }

  async create(tenantSlug: string, data: Partial<Patient>, userId: string): Promise<Patient> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const counter = await this.patientRepository.count(tenantDS);
    const uid = buildPatientUid(new Date(), counter + 1);

    const created = await this.patientRepository.create(tenantDS, {
      ...data,
      uid,
      createdBy: userId,
      updatedBy: userId,
    });

    await this.auditService.logEvent({
      tenantSlug,
      action: 'patients.created',
      entityType: 'patient',
      entityId: created.id,
      userId,
      newValues: { uid, name: created.name },
    });

    return created;
  }

  async update(tenantSlug: string, patientId: string, data: Partial<Patient>, userId: string): Promise<Patient> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const existing = await this.patientRepository.findById(tenantDS, patientId);
    if (!existing) {
      throw new NotFoundException(`Patient ${patientId} not found`);
    }

    const updated = await this.patientRepository.update(tenantDS, patientId, {
      ...data,
      updatedBy: userId,
    });

    if (!updated) {
      throw new NotFoundException(`Patient ${patientId} not found`);
    }

    await this.auditService.logEvent({
      tenantSlug,
      action: 'patients.updated',
      entityType: 'patient',
      entityId: patientId,
      userId,
      oldValues: { uid: existing.uid, name: existing.name },
      newValues: { uid: updated.uid, name: updated.name },
    });

    return updated;
  }

  async delete(tenantSlug: string, patientId: string, userId: string): Promise<boolean> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const existing = await this.patientRepository.findById(tenantDS, patientId);
    if (!existing) {
      throw new NotFoundException(`Patient ${patientId} not found`);
    }

    const deleted = await this.patientRepository.delete(tenantDS, patientId);
    if (deleted) {
      await this.auditService.logEvent({
        tenantSlug,
        action: 'patients.deleted',
        entityType: 'patient',
        entityId: patientId,
        userId,
        oldValues: { uid: existing.uid, name: existing.name },
      });
    }

    return deleted;
  }

  async getHistory(tenantSlug: string, patientId: string): Promise<Patient[]> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const patient = await this.patientRepository.findById(tenantDS, patientId);
    if (!patient) {
      throw new NotFoundException(`Patient ${patientId} not found`);
    }

    return [patient];
  }
}
