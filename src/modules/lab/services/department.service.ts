import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { AuditService } from '../../audit/audit.service';
import { DepartmentRepository } from '../repositories/department.repository';
import { CreateDepartmentDto, UpdateDepartmentDto } from '../dtos';
import { Department } from '../../../database/entities/tenant/department.entity';

@Injectable()
export class DepartmentService {
  private readonly logger = new Logger(DepartmentService.name);

  constructor(
    private tenantDSService: TenantDataSourceService,
    private auditService: AuditService,
    private departmentRepository: DepartmentRepository,
  ) {}

  async findAll(tenantSlug: string): Promise<Department[]> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    return this.departmentRepository.findAll(tenantDS);
  }

  async findByLabId(tenantSlug: string, labId: string): Promise<Department[]> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    return this.departmentRepository.findByLabId(tenantDS, labId);
  }

  async findById(tenantSlug: string, deptId: string): Promise<Department> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const dept = await this.departmentRepository.findById(tenantDS, deptId);

    if (!dept) {
      throw new NotFoundException(`Department ${deptId} not found`);
    }

    return dept;
  }

  async create(tenantSlug: string, createDeptDto: CreateDepartmentDto, userId: string): Promise<Department> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);

    const dept = await this.departmentRepository.create(tenantDS, {
      ...createDeptDto,
      createdBy: userId,
      updatedBy: userId,
    });

    await this.auditService.logEvent({
      tenantSlug,
      action: 'department.created',
      entityType: 'department',
      entityId: dept.id,
      userId,
      newValues: { name: dept.name, labId: dept.labId },
    });

    this.logger.log(`[${tenantSlug}] Department created: ${dept.id}`);
    return dept;
  }

  async update(tenantSlug: string, deptId: string, updateDeptDto: UpdateDepartmentDto, userId: string): Promise<Department> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);

    const existing = await this.departmentRepository.findById(tenantDS, deptId);
    if (!existing) {
      throw new NotFoundException(`Department ${deptId} not found`);
    }

    const updated = await this.departmentRepository.update(tenantDS, deptId, {
      ...updateDeptDto,
      updatedBy: userId,
    });

    await this.auditService.logEvent({
      tenantSlug,
      action: 'department.updated',
      entityType: 'department',
      entityId: deptId,
      userId,
      oldValues: { name: existing.name },
      newValues: { name: updated.name },
    });

    this.logger.log(`[${tenantSlug}] Department updated: ${deptId}`);
    return updated;
  }

  async delete(tenantSlug: string, deptId: string, userId: string): Promise<boolean> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);

    const existing = await this.departmentRepository.findById(tenantDS, deptId);
    if (!existing) {
      throw new NotFoundException(`Department ${deptId} not found`);
    }

    const deleted = await this.departmentRepository.delete(tenantDS, deptId);

    if (deleted) {
      await this.auditService.logEvent({
        tenantSlug,
        action: 'department.deleted',
        entityType: 'department',
        entityId: deptId,
        userId,
        oldValues: { name: existing.name },
      });

      this.logger.log(`[${tenantSlug}] Department deleted: ${deptId}`);
    }

    return deleted;
  }
}
