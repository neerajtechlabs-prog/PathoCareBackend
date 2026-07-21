import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PublicDataSourceService } from '../../database/datasources/public.datasource';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly publicDataSourceService: PublicDataSourceService,
    private readonly tenantDataSourceService: TenantDataSourceService
  ) {}

  async getTenantInfo(
    slug: string
  ): Promise<{ slug: string; status: string; name: string; schemaName: string }> {
    const publicDataSource = this.publicDataSourceService.getDataSource();
    const rows = await publicDataSource.query(
      'SELECT slug, name, schema_name, status FROM public.tenants WHERE slug = $1 LIMIT 1',
      [slug]
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

  async deleteTenant(slug: string): Promise<{ message: string; slug: string; schemaName: string }> {
    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      throw new BadRequestException('Tenant slug is required');
    }

    const tenantInfo = await this.getTenantInfo(slug);
    const publicDataSource = this.publicDataSourceService.getDataSource();

    // Destroy any cached tenant datasource before schema removal.
    await this.tenantDataSourceService.removeForTenant(slug);

    const sanitizedSchemaName = tenantInfo.schemaName.replace(/"/g, '""');
    await publicDataSource.query(`DROP SCHEMA IF EXISTS "${sanitizedSchemaName}" CASCADE;`);
    await publicDataSource.query('DELETE FROM public.tenants WHERE slug = $1', [slug]);

    this.logger.log(`Tenant deleted: ${slug} (schema: ${tenantInfo.schemaName})`);
    return {
      message: 'Tenant deleted successfully',
      slug,
      schemaName: tenantInfo.schemaName,
    };
  }

  async initTenantDelete(
    slug: string,
    email: string
  ): Promise<{ message: string; referenceId: string; otpCode: string }> {
    if (!slug || !email || typeof slug !== 'string' || typeof email !== 'string') {
      throw new BadRequestException('Tenant slug and email are required');
    }

    if (email.toLowerCase() !== 'neeraj.techlabs@gmail.com') {
      throw new BadRequestException('Unauthorized email for tenant delete initialization');
    }

    await this.getTenantInfo(slug);
    const referenceId = uuidv4();
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const publicDataSource = this.publicDataSourceService.getDataSource();
    await publicDataSource.query(`
      CREATE TABLE IF NOT EXISTS public.tenant_delete_requests (
        id UUID PRIMARY KEY,
        tenant_slug VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        reference_id VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await publicDataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_delete_requests_reference_id
      ON public.tenant_delete_requests(reference_id);
    `);

    await publicDataSource.query(
      `INSERT INTO public.tenant_delete_requests (id, tenant_slug, email, otp_code, reference_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (reference_id) DO UPDATE SET otp_code = EXCLUDED.otp_code, expires_at = EXCLUDED.expires_at, created_at = CURRENT_TIMESTAMP`,
      [uuidv4(), slug, email, otpCode, referenceId, expiresAt]
    );

    this.logger.log(`Tenant delete init created for ${slug}, referenceId ${referenceId}`);
    return {
      message: 'Tenant deletion initialized. Use the returned OTP in the confirm request.',
      referenceId,
      otpCode,
    };
  }

  async confirmTenantDelete(
    slug: string,
    otpCode: string
  ): Promise<{ message: string; slug: string; schemaName: string }> {
    if (!slug || !otpCode || typeof slug !== 'string' || typeof otpCode !== 'string') {
      throw new BadRequestException('Tenant slug and OTP code are required');
    }

    const publicDataSource = this.publicDataSourceService.getDataSource();
    const rows = await publicDataSource.query(
      `SELECT tenant_slug, email, otp_code, expires_at FROM public.tenant_delete_requests WHERE tenant_slug = $1 ORDER BY created_at DESC LIMIT 1`,
      [slug]
    );

    if (!rows || rows.length === 0) {
      throw new BadRequestException('No delete request found for this tenant');
    }

    const request = rows[0] as {
      tenant_slug: string;
      email: string;
      otp_code: string;
      expires_at: string;
    };
    if (request.otp_code !== otpCode) {
      throw new BadRequestException('Invalid OTP code');
    }

    if (new Date(request.expires_at) < new Date()) {
      throw new BadRequestException('OTP code has expired');
    }

    const result = await this.deleteTenant(slug);
    await publicDataSource.query(
      'DELETE FROM public.tenant_delete_requests WHERE tenant_slug = $1',
      [slug]
    );
    return result;
  }

  /**
   * Isolation Proof: Query tenant-specific schema to prove data separation
   * Returns seed_proof data from the tenant's isolated schema only
   */
  async getIsolationProof(
    slug: string
  ): Promise<{ tenantSlug: string; schemaName: string; isolationProofRows: any[] }> {
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
      `SELECT * FROM seed_proof ORDER BY created_at DESC`
    );

    this.logger.debug(`Isolation proof for ${slug}: found ${isolationProofRows.length} rows`);

    return {
      tenantSlug: slug,
      schemaName: tenantInfo.schemaName,
      isolationProofRows,
    };
  }
}
