import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { AuditService } from '../../audit/audit.service';
import { SampleTypeRepository } from '../repositories/sample-type.repository';
import { CreateSampleTypeDto, UpdateSampleTypeDto } from '../dtos';
import { SampleType } from '../../../database/entities/tenant/sample-type.entity';

@Injectable()
export class SampleTypeService {
  private readonly logger = new Logger(SampleTypeService.name);

  constructor(
    private tenantDSService: TenantDataSourceService,
    private auditService: AuditService,
    private sampleTypeRepository: SampleTypeRepository,
  ) {}

  async findAll(tenantSlug: string): Promise<SampleType[]> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    return this.sampleTypeRepository.findAll(tenantDS);
  }

  async findByLabId(tenantSlug: string, labId: string): Promise<SampleType[]> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    return this.sampleTypeRepository.findByLabId(tenantDS, labId);
  }

  async findById(tenantSlug: string, sampleTypeId: string): Promise<SampleType> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const sampleType = await this.sampleTypeRepository.findById(tenantDS, sampleTypeId);

    if (!sampleType) {
      throw new NotFoundException(`Sample type ${sampleTypeId} not found`);
    }

    return sampleType;
  }

  async findByCode(tenantSlug: string, code: string): Promise<SampleType> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const sampleType = await this.sampleTypeRepository.findByCode(tenantDS, code);

    if (!sampleType) {
      throw new NotFoundException(`Sample type with code ${code} not found`);
    }

    return sampleType;
  }

  async search(tenantSlug: string, query: string, labId?: string): Promise<SampleType[]> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    return this.sampleTypeRepository.search(tenantDS, query, labId);
  }

  async create(tenantSlug: string, createSampleTypeDto: CreateSampleTypeDto, userId: string): Promise<SampleType> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);

    const sampleType = await this.sampleTypeRepository.create(tenantDS, {
      ...createSampleTypeDto,
      createdBy: userId,
      updatedBy: userId,
    });

    await this.auditService.logEvent({
      tenantSlug,
      action: 'sample_type.created',
      entityType: 'sample_type',
      entityId: sampleType.id,
      userId,
      newValues: { name: sampleType.name, code: sampleType.code },
    });

    this.logger.log(`[${tenantSlug}] Sample type created: ${sampleType.id}`);
    return sampleType;
  }

  async update(
    tenantSlug: string,
    sampleTypeId: string,
    updateSampleTypeDto: UpdateSampleTypeDto,
    userId: string,
  ): Promise<SampleType> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);

    const existing = await this.sampleTypeRepository.findById(tenantDS, sampleTypeId);
    if (!existing) {
      throw new NotFoundException(`Sample type ${sampleTypeId} not found`);
    }

    const updated = await this.sampleTypeRepository.update(tenantDS, sampleTypeId, {
      ...updateSampleTypeDto,
      updatedBy: userId,
    });

    await this.auditService.logEvent({
      tenantSlug,
      action: 'sample_type.updated',
      entityType: 'sample_type',
      entityId: sampleTypeId,
      userId,
      oldValues: { name: existing.name },
      newValues: { name: updated.name },
    });

    this.logger.log(`[${tenantSlug}] Sample type updated: ${sampleTypeId}`);
    return updated;
  }

  async delete(tenantSlug: string, sampleTypeId: string, userId: string): Promise<boolean> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);

    const existing = await this.sampleTypeRepository.findById(tenantDS, sampleTypeId);
    if (!existing) {
      throw new NotFoundException(`Sample type ${sampleTypeId} not found`);
    }

    const deleted = await this.sampleTypeRepository.delete(tenantDS, sampleTypeId);

    if (deleted) {
      await this.auditService.logEvent({
        tenantSlug,
        action: 'sample_type.deleted',
        entityType: 'sample_type',
        entityId: sampleTypeId,
        userId,
        oldValues: { name: existing.name, code: existing.code },
      });

      this.logger.log(`[${tenantSlug}] Sample type deleted: ${sampleTypeId}`);
    }

    return deleted;
  }
}
