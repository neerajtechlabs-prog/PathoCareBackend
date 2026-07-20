import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDataSourceService } from '../../../database/datasources/tenant.datasource';
import { AuditService } from '../../audit/audit.service';
import { DoctorRepository } from '../repositories/doctor.repository';
import { Doctor } from '../../../database/entities/tenant/doctor.entity';
import { CreateDoctorDto, UpdateDoctorDto } from '../dto';

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

  async create(tenantSlug: string, data: Partial<Doctor> | CreateDoctorDto | UpdateDoctorDto, userId: string): Promise<Doctor> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const normalizedData = this.normalizeDoctorInput(data);
    const created = await this.doctorRepository.create(tenantDS, {
      ...normalizedData,
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
    data: Partial<Doctor> | CreateDoctorDto | UpdateDoctorDto,
    userId: string
  ): Promise<Doctor> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const existing = await this.doctorRepository.findById(tenantDS, doctorId);
    if (!existing) {
      throw new NotFoundException(`Doctor ${doctorId} not found`);
    }

    const normalizedData = this.normalizeDoctorInput(data);
    const updated = await this.doctorRepository.update(tenantDS, doctorId, {
      ...normalizedData,
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

  private normalizeDoctorInput(data: Partial<Doctor> | CreateDoctorDto | UpdateDoctorDto): Partial<Doctor> {
    const normalized = { ...data } as Partial<Doctor>;

    if (normalized.birthDate && typeof normalized.birthDate === 'string') {
      normalized.birthDate = new Date(normalized.birthDate);
    }

    if (normalized.anniversary && typeof normalized.anniversary === 'string') {
      normalized.anniversary = new Date(normalized.anniversary);
    }

    return normalized;
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
