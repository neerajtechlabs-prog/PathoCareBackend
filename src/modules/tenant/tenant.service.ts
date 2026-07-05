import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PublicDataSourceService } from '../../database/datasources/public.datasource';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly publicDataSourceService: PublicDataSourceService,
    private readonly tenantDataSourceService: TenantDataSourceService,
  ) {}

  async getTenantInfo(slug: string): Promise<{ slug: string; status: string; name: string; schemaName: string }> {
    const publicDataSource = this.publicDataSourceService.getDataSource();
    const rows = await publicDataSource.query(
      'SELECT slug, name, schema_name, status FROM public.tenants WHERE slug = $1 LIMIT 1',
      [slug],
    );

    if (!rows || rows.length === 0) {
      throw new NotFoundException(`Tenant not found: ${slug}`);
    }

    const tenant = rows[0] as { slug: string; name: string; schema_name: string; status: string };
    return {
      slug: tenant.slug,
      name: tenant.name,
      schemaName: tenant.schema_name,
      status: tenant.status,
    };
  }

  /**
   * Isolation Proof: Query tenant-specific schema to prove data separation
   * Returns seed_proof data from the tenant's isolated schema only
   */
  async getIsolationProof(slug: string): Promise<{ tenantSlug: string; schemaName: string; isolationProofRows: any[] }> {
    if (!slug) {
      throw new BadRequestException('Tenant slug is required');
    }

    // First, verify tenant exists in public schema
    const tenantInfo = await this.getTenantInfo(slug);

    // Get tenant-specific datasource
    const tenantDS = await this.tenantDataSourceService.getForTenant(slug);

    // Query the tenant-specific seed_proof table
    // This proves the data is isolated to this tenant's schema
    const isolationProofRows = await tenantDS.query(
      `SELECT * FROM seed_proof ORDER BY created_at DESC`,
    );

    this.logger.debug(`Isolation proof for ${slug}: found ${isolationProofRows.length} rows`);

    return {
      tenantSlug: slug,
      schemaName: tenantInfo.schemaName,
      isolationProofRows,
    };
  }
}
