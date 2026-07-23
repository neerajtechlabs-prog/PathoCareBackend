import { Injectable, Logger } from '@nestjs/common';
import { PublicDataSourceService } from '../../../database/datasources/public.datasource';

/**
 * Tenant Provisioning Lock Service
 * Manages Postgres advisory locks for tenant schema provisioning concurrency guard.
 * Uses integer representation of tenant UUID as lock ID.
 *
 * Advisory locks ensure only one provisioning process runs per tenant simultaneously.
 * Prevents race conditions during schema creation and initialization.
 */
@Injectable()
export class TenantProvisioningLockService {
  private readonly logger = new Logger(TenantProvisioningLockService.name);

  constructor(private readonly publicDataSourceService: PublicDataSourceService) {}

  /**
   * Acquire an advisory lock for a tenant
   * Blocks until lock is available
   * @param tenantId UUID of the tenant
   * @throws Error if lock acquisition fails
   */
  async acquireLock(tenantId: string): Promise<void> {
    const lockId = this.hashTenantIdToLockId(tenantId);
    const ds = this.publicDataSourceService.getDataSource();

    try {
      await ds.query('SELECT pg_advisory_lock($1)', [lockId]);
      this.logger.debug(`Acquired advisory lock for tenant ${tenantId} (lock_id: ${lockId})`);
    } catch (error) {
      this.logger.error(`Failed to acquire lock for tenant ${tenantId}:`, error);
      throw new Error(`Failed to acquire provisioning lock for tenant ${tenantId}`);
    }
  }

  /**
   * Release an advisory lock for a tenant
   * @param tenantId UUID of the tenant
   * @throws Error if lock release fails
   */
  async releaseLock(tenantId: string): Promise<void> {
    const lockId = this.hashTenantIdToLockId(tenantId);
    const ds = this.publicDataSourceService.getDataSource();

    try {
      await ds.query('SELECT pg_advisory_unlock($1)', [lockId]);
      this.logger.debug(`Released advisory lock for tenant ${tenantId} (lock_id: ${lockId})`);
    } catch (error) {
      this.logger.error(`Failed to release lock for tenant ${tenantId}:`, error);
      throw new Error(`Failed to release provisioning lock for tenant ${tenantId}`);
    }
  }

  /**
   * Try to acquire lock with timeout (non-blocking)
   * Returns true if acquired, false if not available
   * @param tenantId UUID of the tenant
   * @param _timeoutMs Timeout in milliseconds (not used by pg_try_advisory_lock, but for interface consistency)
   */
  async tryAcquireLock(tenantId: string, _timeoutMs?: number): Promise<boolean> {
    const lockId = this.hashTenantIdToLockId(tenantId);
    const ds = this.publicDataSourceService.getDataSource();

    try {
      const [{ pg_try_advisory_lock }] = await ds.query<{ pg_try_advisory_lock: boolean }[]>(
        'SELECT pg_try_advisory_lock($1) as pg_try_advisory_lock',
        [lockId],
      );
      if (pg_try_advisory_lock) {
        this.logger.debug(`Acquired advisory lock (non-blocking) for tenant ${tenantId}`);
      } else {
        this.logger.debug(`Failed to acquire advisory lock (non-blocking) for tenant ${tenantId}`);
      }
      return pg_try_advisory_lock;
    } catch (error) {
      this.logger.error(`Error trying to acquire lock for tenant ${tenantId}:`, error);
      return false;
    }
  }

  /**
   * Convert tenant UUID to a 32-bit integer for advisory lock
   * Uses CRC32-like hashing to get consistent integer from UUID
   * @param tenantId UUID string
   * @returns 32-bit integer for use as lock ID
   */
  private hashTenantIdToLockId(tenantId: string): number {
    // Remove hyphens from UUID
    const cleaned = tenantId.replace(/-/g, '');

    // Simple hash: sum of character codes modulo 2^31-1 (max valid Postgres advisory lock ID)
    let hash = 0;
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Ensure positive and within Postgres advisory lock range
    return Math.abs(hash) % (2147483647 - 1) + 1; // Range: 1 to 2147483646
  }
}
