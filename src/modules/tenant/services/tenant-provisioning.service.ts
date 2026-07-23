import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PublicDataSourceService } from '../../../database/datasources/public.datasource';
import { TenantDataSourceService } from '../../../database/datasources/tenant.datasource';
import { TenantProvisioningLockService } from './tenant-provisioning-lock.service';

/**
 * Tenant Provisioning Service
 * Orchestrates schema provisioning with concurrency guard (Postgres advisory lock)
 *
 * Flow:
 * 1. Acquire advisory lock on tenant.id
 * 2. Fetch tenant by ID, verify status='approved'
 * 3. Update tenant status to 'provisioning'
 * 4. Create tenant schema
 * 5. Create base tables (users, tenants, etc.)
 * 6. Update tenant status to 'active', set provisioned_at
 * 7. Release lock
 *
 * On error: Update status to 'provisioning_failed', release lock
 */
@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);

  constructor(
    private readonly publicDataSourceService: PublicDataSourceService,
    private readonly lockService: TenantProvisioningLockService,
    private readonly tenantDataSourceService: TenantDataSourceService,
  ) {}

  /**
   * Provision a tenant schema (idempotent; safe to retry)
   * @param tenantId UUID of the tenant to provision
   * @throws InternalServerErrorException on provisioning failure
   */
  async provisionTenant(tenantId: string): Promise<void> {
    let lockAcquired = false;

    try {
      // Step 1: Acquire advisory lock
      await this.lockService.acquireLock(tenantId);
      lockAcquired = true;
      this.logger.log(`Lock acquired for tenant ${tenantId}`);

      const publicDS = this.publicDataSourceService.getDataSource();

      // Step 2: Fetch tenant, verify status
      const [tenant] = await publicDS.query<
        Array<{
          id: string;
          slug: string;
          schema_name: string;
          status: string;
          admin_name?: string;
          admin_email?: string;
          admin_password_hash?: string;
          email?: string;
        }>
      >(
        'SELECT id, slug, schema_name, status, admin_name, admin_email, admin_password_hash, email FROM public.tenants WHERE id = $1',
        [tenantId],
      );

      if (!tenant) {
        throw new Error(`Tenant ${tenantId} not found`);
      }

      if (tenant.status !== 'approved') {
        throw new Error(
          `Cannot provision tenant in status '${tenant.status}'. Expected 'approved'.`,
        );
      }

      // Step 3: Update status to 'provisioning'
      await publicDS.query(
        'UPDATE public.tenants SET status = $1 WHERE id = $2',
        ['provisioning', tenant.id],
      );
      this.logger.log(`Tenant ${tenant.slug} transitioned to 'provisioning'`);

      // Step 4: Create tenant schema
      await this.createTenantSchema(publicDS, tenant.schema_name);

      // Step 5: Create base tables in tenant schema
      await this.createBaseTables(publicDS, tenant.schema_name);

      // Step 6: Migrate admin credentials into tenant schema
      await this.migrateAdminCredentials(tenant);

      // Step 7: Update status to 'active'
      await publicDS.query(
        'UPDATE public.tenants SET status = $1, provisioned_at = NOW() WHERE id = $2',
        ['active', tenant.id],
      );
      this.logger.log(`Tenant ${tenant.slug} provisioning completed. Status: active`);
    } catch (error) {
      this.logger.error(`Provisioning failed for tenant ${tenantId}:`, error);

      // Mark as provisioning_failed
      try {
        const publicDS = this.publicDataSourceService.getDataSource();
        await publicDS.query(
          'UPDATE public.tenants SET status = $1 WHERE id = $2',
          ['provisioning_failed', tenantId],
        );
      } catch (updateError) {
        this.logger.error(`Failed to update tenant status to 'provisioning_failed':`, updateError);
      }

      throw new InternalServerErrorException(
        `Tenant provisioning failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      // Release lock
      if (lockAcquired) {
        try {
          await this.lockService.releaseLock(tenantId);
          this.logger.debug(`Lock released for tenant ${tenantId}`);
        } catch (lockError) {
          this.logger.error(`Failed to release lock for tenant ${tenantId}:`, lockError);
        }
      }
    }
  }

  private async migrateAdminCredentials(tenant: {
    id: string;
    slug: string;
    schema_name: string;
    status: string;
    admin_name?: string;
    admin_email?: string;
    admin_password_hash?: string;
    email?: string;
  }): Promise<void> {
    const tenantDS = await this.tenantDataSourceService.getForTenant(tenant.slug);
    const adminEmail = tenant.admin_email || tenant.email;
    const adminName = tenant.admin_name || 'Lab Admin';
    const adminPasswordHash = tenant.admin_password_hash;

    if (!adminEmail || !adminPasswordHash) {
      this.logger.warn(`Skipping admin credential migration for tenant ${tenant.slug}: missing admin email or password hash`);
      return;
    }

    const existing = await tenantDS.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [adminEmail],
    );

    if (existing?.length) {
      await tenantDS.query(
        'UPDATE users SET name = $1, password_hash = $2, role = $3, is_active = true WHERE email = $4',
        [adminName, adminPasswordHash, 'LabAdmin', adminEmail],
      );
      return;
    }

    await tenantDS.query(
      `INSERT INTO users (email, name, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, true)`,
      [adminEmail, adminName, adminPasswordHash, 'LabAdmin'],
    );
  }

  /**
   * Create tenant-specific schema
   * Idempotent: uses CREATE SCHEMA IF NOT EXISTS
   */
  private async createTenantSchema(dataSource: any, schemaName: string): Promise<void> {
    try {
      await dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      this.logger.log(`Schema '${schemaName}' created or already exists`);
    } catch (error) {
      throw new Error(`Failed to create schema '${schemaName}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create base tables in tenant schema
   * Includes: users, user_roles (minimal base structure)
   * Additional tables can be migrated via TypeORM migrations
   */
  private async createBaseTables(dataSource: any, schemaName: string): Promise<void> {
    try {
      // Create users table
      await dataSource.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}".users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255),
          full_name VARCHAR(255),
          role VARCHAR(50) DEFAULT 'user',
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      this.logger.log(`Table '${schemaName}.users' created or already exists`);

      // Create user_roles table
      await dataSource.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}".user_roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES "${schemaName}".users(id) ON DELETE CASCADE,
          role VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      this.logger.log(`Table '${schemaName}.user_roles' created or already exists`);

      // Create indices
      await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON "${schemaName}".users(email)`);
      await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON "${schemaName}".user_roles(user_id)`);

      this.logger.log(`Base tables and indices created for schema '${schemaName}'`);
    } catch (error) {
      throw new Error(`Failed to create base tables in schema '${schemaName}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
