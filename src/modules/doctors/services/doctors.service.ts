import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDataSourceService } from '../../../database/datasources/tenant.datasource';
import { AuditService } from '../../audit/audit.service';
import { DoctorRepository } from '../repositories/doctor.repository';
import { Doctor } from '../../../database/entities/tenant/doctor.entity';

@Injectable()
export class DoctorsService {
  constructor(
    private readonly tenantDSService: TenantDataSourceService,
    private readonly auditService: AuditService,
    private readonly doctorRepository: DoctorRepository
  ) {}

  async findAll(tenantSlug: string, query?: string): Promise<Doctor[]> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    return this.doctorRepository.findAll(tenantDS, query);
  }

  async findById(tenantSlug: string, doctorId: string): Promise<Doctor> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const doctor = await this.doctorRepository.findById(tenantDS, doctorId);
    if (!doctor) {
      throw new NotFoundException(`Doctor ${doctorId} not found`);
    }
    return doctor;
  }

  async create(tenantSlug: string, data: Partial<Doctor>, userId: string): Promise<Doctor> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const created = await this.doctorRepository.create(tenantDS, {
      ...data,
      createdBy: userId,
      updatedBy: userId,
    });

    await this.auditService.logEvent({
      tenantSlug,
      action: 'doctors.created',
      entityType: 'doctor',
      entityId: created.id,
      userId,
      newValues: { name: created.name, specialization: created.specialization },
    });

    return created;
  }

  async update(
    tenantSlug: string,
    doctorId: string,
    data: Partial<Doctor>,
    userId: string
  ): Promise<Doctor> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const existing = await this.doctorRepository.findById(tenantDS, doctorId);
    if (!existing) {
      throw new NotFoundException(`Doctor ${doctorId} not found`);
    }

    const updated = await this.doctorRepository.update(tenantDS, doctorId, {
      ...data,
      updatedBy: userId,
    });

    if (!updated) {
      throw new NotFoundException(`Doctor ${doctorId} not found`);
    }

    await this.auditService.logEvent({
      tenantSlug,
      action: 'doctors.updated',
      entityType: 'doctor',
      entityId: doctorId,
      userId,
      oldValues: { name: existing.name, specialization: existing.specialization },
      newValues: { name: updated.name, specialization: updated.specialization },
    });

    return updated;
  }

  async delete(tenantSlug: string, doctorId: string, userId: string): Promise<boolean> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const existing = await this.doctorRepository.findById(tenantDS, doctorId);
    if (!existing) {
      throw new NotFoundException(`Doctor ${doctorId} not found`);
    }

    const deleted = await this.doctorRepository.delete(tenantDS, doctorId);
    if (deleted) {
      await this.auditService.logEvent({
        tenantSlug,
        action: 'doctors.deleted',
        entityType: 'doctor',
        entityId: doctorId,
        userId,
        oldValues: { name: existing.name },
      });
    }

    return deleted;
  }
}
