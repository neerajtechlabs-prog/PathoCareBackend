import { TenantService } from './tenant.service';

describe('TenantService', () => {
  it('approves a pending tenant and triggers provisioning', async () => {
    const publicDS = {
      query: jest.fn().mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, slug, schema_name, status')) {
          return [{ id: 'tenant-1', slug: 'demo', schema_name: 'tenant_demo', status: 'pending_approval' }];
        }
        return [];
      }),
    } as any;

    const publicDataSourceService = {
      getDataSource: jest.fn().mockReturnValue(publicDS),
    } as any;

    const tenantDataSourceService = {
      removeForTenant: jest.fn().mockResolvedValue(undefined),
    } as any;

    const tenantProvisioningService = {
      provisionTenant: jest.fn().mockResolvedValue(undefined),
    } as any;

    const service = new TenantService(
      publicDataSourceService,
      tenantDataSourceService,
      tenantProvisioningService,
    );

    const result = await service.approveTenant('demo');

    expect(result.status).toBe('active');
    expect(tenantProvisioningService.provisionTenant).toHaveBeenCalledWith('tenant-1');
  });
});
