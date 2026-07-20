import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TenantDataSourceService } from '../../../database/datasources/tenant.datasource';
import { PublicDataSourceService } from '../../../database/datasources/public.datasource';
import { AuditService } from '../../audit/audit.service';
import { TestRepository, TestParameterRepository } from '../repositories';
import { TestCatalog } from '../../../database/entities/tenant/test-catalog.entity';
import { TestParameter } from '../../../database/entities/tenant/test-parameter.entity';
import { parseCsvImportRows } from '../utils/csv-import.util';

@Injectable()
export class TestsService {
  private readonly logger = new Logger(TestsService.name);

  constructor(
    private readonly tenantDSService: TenantDataSourceService,
    private readonly auditService: AuditService,
    private readonly testRepository: TestRepository,
    private readonly testParameterRepository: TestParameterRepository,
    private readonly publicDataSourceService: PublicDataSourceService,
  ) {}

  private normalizeTestCatalog<T extends Partial<TestCatalog>>(test: T): T {
    return {
      ...test,
      rate: Number(test?.rate ?? 0),
    } as T;
  }

  private normalizePublicTestRow(row: any): any {
    return {
      ...row,
      id: row?.id?.toString() ?? '',
      rate: Number(row?.rate ?? 0),
      source: 'public',
    };
  }

  private normalizeTenantTestRow(test: TestCatalog): any {
    return {
      ...this.normalizeTestCatalog(test),
      source: 'tenant',
    };
  }

  async getPublicTests(): Promise<any[]> {
    const publicDataSource = this.publicDataSourceService.getDataSource();
    const rows = await publicDataSource.query(`
      SELECT
        "TestID" AS id,
        "TestName" AS name,
        "TestCode" AS code,
        "GroupName" AS department,
        "TestInitial" AS description,
        NULL AS "specimenType",
        NULL AS unit,
        "IsActive" AS "isActive",
        "Rate" AS rate
      FROM public.tests_master
      WHERE "IsActive" IS NOT FALSE
      ORDER BY "TestName" ASC
    `);

    return rows.map((row: any) => ({
      ...row,
      id: row?.id?.toString() ?? '',
      name: row?.name ?? row?.['TestName'] ?? 'Unnamed Test',
      code: row?.code ?? row?.['TestCode'] ?? '',
      department: row?.department ?? row?.['GroupName'] ?? null,
      description: row?.description ?? row?.['TestInitial'] ?? null,
      rate: Number(row?.rate ?? 0),
      source: 'public',
    }));
  }

  async findAll(tenantSlug: string, query?: string): Promise<any[]> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const [tenantTests, publicTests] = await Promise.all([
      this.testRepository.findAll(tenantDS, query),
      this.getPublicTests(),
    ]);

    const tenantResults = tenantTests.map((test) => this.normalizeTenantTestRow(test));
    const publicResults = publicTests.map((test) => this.normalizePublicTestRow(test));

    return [...tenantResults, ...publicResults];
  }

  async findTenantTests(tenantSlug: string, query?: string): Promise<any[]> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const tests = await this.testRepository.findAll(tenantDS, query);
    return tests.map((test) => this.normalizeTenantTestRow(test));
  }

  async findPublicTests(query?: string): Promise<any[]> {
    const publicTests = await this.getPublicTests();
    const filtered = query
      ? publicTests.filter((test: any) =>
          `${test?.name ?? ''} ${test?.code ?? ''} ${test?.description ?? ''}`.toLowerCase().includes(query.toLowerCase())
        )
      : publicTests;

    return filtered.map((test) => this.normalizePublicTestRow(test));
  }

  async findById(tenantSlug: string, id: string): Promise<TestCatalog> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const testCatalog = await this.testRepository.findById(tenantDS, id);
    if (!testCatalog) throw new NotFoundException(`Test ${id} not found`);
    return this.normalizeTestCatalog(testCatalog);
  }

  async create(tenantSlug: string, data: Partial<TestCatalog>, userId: string): Promise<TestCatalog> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const created = await this.testRepository.create(tenantDS, { ...data, createdBy: userId, updatedBy: userId });
    await this.auditService.logEvent({ tenantSlug, action: 'tests.created', entityType: 'test', entityId: created.id, userId, newValues: { name: created.name } });
    return this.normalizeTestCatalog(created);
  }

  async update(tenantSlug: string, id: string, data: Partial<TestCatalog>, userId: string): Promise<TestCatalog> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const existing = await this.testRepository.findById(tenantDS, id);
    if (!existing) throw new NotFoundException(`Test ${id} not found`);
    const updated = await this.testRepository.update(tenantDS, id, { ...data, updatedBy: userId });
    if (!updated) throw new NotFoundException(`Test ${id} not found`);
    await this.auditService.logEvent({ tenantSlug, action: 'tests.updated', entityType: 'test', entityId: id, userId, oldValues: { name: existing.name }, newValues: { name: updated.name } });
    return this.normalizeTestCatalog(updated);
  }

  async delete(tenantSlug: string, id: string, userId: string): Promise<boolean> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const existing = await this.testRepository.findById(tenantDS, id);
    if (!existing) throw new NotFoundException(`Test ${id} not found`);
    const deleted = await this.testRepository.delete(tenantDS, id);
    if (deleted) await this.auditService.logEvent({ tenantSlug, action: 'tests.deleted', entityType: 'test', entityId: id, userId, oldValues: { name: existing.name } });
    return deleted;
  }

  async listParameters(tenantSlug: string, testId: string): Promise<TestParameter[]> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    return this.testParameterRepository.findByTestId(tenantDS, testId);
  }

  async createParameter(tenantSlug: string, testId: string, data: Partial<TestParameter>, userId: string): Promise<TestParameter> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const created = await this.testParameterRepository.create(tenantDS, { ...data, testId, createdBy: userId, updatedBy: userId });
    await this.auditService.logEvent({ tenantSlug, action: 'test_parameters.created', entityType: 'test_parameter', entityId: created.id, userId, newValues: { name: created.name } });
    return created;
  }

  async updateParameter(tenantSlug: string, parameterId: string, data: Partial<TestParameter>, userId: string): Promise<TestParameter> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const existing = await this.testParameterRepository.findById(tenantDS, parameterId);
    if (!existing) throw new NotFoundException(`Test parameter ${parameterId} not found`);
    const updated = await this.testParameterRepository.update(tenantDS, parameterId, { ...data, updatedBy: userId });
    if (!updated) throw new NotFoundException(`Test parameter ${parameterId} not found`);
    await this.auditService.logEvent({ tenantSlug, action: 'test_parameters.updated', entityType: 'test_parameter', entityId: parameterId, userId, oldValues: { name: existing.name }, newValues: { name: updated.name } });
    return updated;
  }

  async deleteParameter(tenantSlug: string, parameterId: string, userId: string): Promise<boolean> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const existing = await this.testParameterRepository.findById(tenantDS, parameterId);
    if (!existing) throw new NotFoundException(`Test parameter ${parameterId} not found`);
    const deleted = await this.testParameterRepository.delete(tenantDS, parameterId);
    if (deleted) await this.auditService.logEvent({ tenantSlug, action: 'test_parameters.deleted', entityType: 'test_parameter', entityId: parameterId, userId, oldValues: { name: existing.name } });
    return deleted;
  }

  async importFromCsv(tenantSlug: string, csvText: string, userId: string): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const rows = await parseCsvImportRows(csvText);
    const validRows = rows.filter(row => row.name?.trim());

    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const repository = tenantDS.getRepository(TestCatalog);

    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    for (const row of validRows) {
      try {
        const existing = await repository.findOne({ where: { code: row.code || row.name } });
        if (existing) {
          skipped += 1;
          continue;
        }

        await repository.save(
          repository.create({
            name: row.name,
            code: row.code,
            department: row.department,
            description: row.description,
            specimenType: row.specimenType,
            unit: row.unit,
            createdBy: userId,
            updatedBy: userId,
          }),
        );
        imported += 1;
      } catch (error) {
        this.logger.warn(`Failed to import test row ${row.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errors.push(`Failed to import ${row.name || 'row'}`);
      }
    }

    await this.auditService.logEvent({
      tenantSlug,
      action: 'tests.imported_csv',
      entityType: 'test',
      userId,
      newValues: { imported, skipped, errors: errors.length },
    });

    return { imported, skipped, errors };
  }
}
