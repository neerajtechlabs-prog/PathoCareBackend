import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantMiddleware } from './tenant.middleware';
import { PublicDataSourceService } from '../../database/datasources/public.datasource';
import { AuditService } from '../audit/audit.service';

describe('TenantMiddleware', () => {
  it('attaches tenant info when the header matches an existing tenant', async () => {
    const publicDataSourceService = {
      getDataSource: jest.fn().mockReturnValue({
        query: jest.fn().mockResolvedValue([{ slug: 'demo', schema_name: 'tenant_demo' }]),
      }),
    } as unknown as PublicDataSourceService;

    const auditService = { logEvent: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const middleware = new TenantMiddleware(publicDataSourceService, auditService);
    const req: any = {
      headers: { 'x-tenant-slug': 'demo' },
      path: '/api/tenants/demo',
    };
    const next = jest.fn();

    await middleware.use(req, {} as any, next);

    expect(next).toHaveBeenCalled();
    expect(req.tenantSlug).toBe('demo');
    expect(req.tenantSchema).toBe('tenant_demo');
  });

  it('throws when the tenant header is missing', async () => {
    const publicDataSourceService = {
      getDataSource: jest.fn(),
    } as unknown as PublicDataSourceService;

    const auditService = { logEvent: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const middleware = new TenantMiddleware(publicDataSourceService, auditService);
    const req: any = { headers: {}, path: '/api/tenants/demo' };

    await expect(middleware.use(req, {} as any, jest.fn())).rejects.toThrow(BadRequestException);
  });

  it('throws when the tenant does not exist', async () => {
    const publicDataSourceService = {
      getDataSource: jest.fn().mockReturnValue({
        query: jest.fn().mockResolvedValue([]),
      }),
    } as unknown as PublicDataSourceService;

    const auditService = { logEvent: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const middleware = new TenantMiddleware(publicDataSourceService, auditService);
    const req: any = {
      headers: { 'x-tenant-slug': 'missing' },
      path: '/api/tenants/missing',
    };

    await expect(middleware.use(req, {} as any, jest.fn())).rejects.toThrow(NotFoundException);
  });
});
