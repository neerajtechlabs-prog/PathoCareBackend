import { TenantProvisioningService } from './tenant-provisioning.service';

describe('TenantProvisioningService', () => {
  it('provisions a tenant and migrates the admin credentials into the tenant schema', async () => {
    const tenantRow = {
      id: 'tenant-1',
      slug: 'demo',
      schema_name: 'tenant_demo',
      status: 'approved',
      admin_email: 'admin@example.com',
      admin_name: 'Demo Admin',
      admin_password_hash: 'hash123',
      email: 'admin@example.com',
    };

    const publicDS = {
      query: jest.fn().mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, slug, schema_name')) {
          return [tenantRow];
        }
        return [];
      }),
    } as any;

    const publicDataSourceService = {
      getDataSource: jest.fn().mockReturnValue(publicDS),
    } as any;

    const tenantDS = {
      query: jest.fn().mockResolvedValue([]),
    } as any;

    const tenantDataSourceService = {
      getForTenant: jest.fn().mockResolvedValue(tenantDS),
    } as any;

    const lockService = {
      acquireLock: jest.fn().mockResolvedValue(undefined),
      releaseLock: jest.fn().mockResolvedValue(undefined),
    } as any;

    const service = new TenantProvisioningService(
      publicDataSourceService,
      lockService,
      tenantDataSourceService,
    );

    await service.provisionTenant('tenant-1');

    expect(lockService.acquireLock).toHaveBeenCalledWith('tenant-1');
    expect(tenantDataSourceService.getForTenant).toHaveBeenCalledWith('demo');
    expect(tenantDS.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      expect.any(Array),
    );
  });
});
