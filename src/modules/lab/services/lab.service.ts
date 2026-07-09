import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { AuditService } from '../../audit/audit.service';
import { LabRepository } from '../repositories/lab.repository';
import { CreateLabDto, UpdateLabDto } from '../dtos';
import { Lab } from '../../../database/entities/tenant/lab.entity';

@Injectable()
export class LabService {
  private readonly logger = new Logger(LabService.name);

  constructor(
    private tenantDSService: TenantDataSourceService,
    private auditService: AuditService,
    private labRepository: LabRepository,
  ) {}

  async findAll(tenantSlug: string): Promise<Lab[]> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    return this.labRepository.findAll(tenantDS);
  }

  async findById(tenantSlug: string, labId: string): Promise<Lab> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const lab = await this.labRepository.findById(tenantDS, labId);

    if (!lab) {
      throw new NotFoundException(`Lab ${labId} not found`);
    }

    return lab;
  }

  async create(tenantSlug: string, createLabDto: CreateLabDto, userId: string): Promise<Lab> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);

    const lab = await this.labRepository.create(tenantDS, {
      ...createLabDto,
      createdBy: userId,
      updatedBy: userId,
    });

    await this.auditService.logEvent({
      tenantSlug,
      action: 'lab.created',
      entityType: 'lab',
      entityId: lab.id,
      userId,
      newValues: { name: lab.name, email: lab.email, phone: lab.phone },
    });

    this.logger.log(`[${tenantSlug}] Lab created: ${lab.id}`);
    return lab;
  }

  async update(tenantSlug: string, labId: string, updateLabDto: UpdateLabDto, userId: string): Promise<Lab> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);

    const existing = await this.labRepository.findById(tenantDS, labId);
    if (!existing) {
      throw new NotFoundException(`Lab ${labId} not found`);
    }

    const updated = await this.labRepository.update(tenantDS, labId, {
      ...updateLabDto,
      updatedBy: userId,
    });

    await this.auditService.logEvent({
      tenantSlug,
      action: 'lab.updated',
      entityType: 'lab',
      entityId: labId,
      userId,
      oldValues: { name: existing.name, email: existing.email },
      newValues: { name: updated.name, email: updated.email },
    });

    this.logger.log(`[${tenantSlug}] Lab updated: ${labId}`);
    return updated;
  }

  async delete(tenantSlug: string, labId: string, userId: string): Promise<boolean> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);

    const existing = await this.labRepository.findById(tenantDS, labId);
    if (!existing) {
      throw new NotFoundException(`Lab ${labId} not found`);
    }

    const deleted = await this.labRepository.delete(tenantDS, labId);

    if (deleted) {
      await this.auditService.logEvent({
        tenantSlug,
        action: 'lab.deleted',
        entityType: 'lab',
        entityId: labId,
        userId,
        oldValues: { name: existing.name },
      });

      this.logger.log(`[${tenantSlug}] Lab deleted: ${labId}`);
    }

    return deleted;
  }
}
