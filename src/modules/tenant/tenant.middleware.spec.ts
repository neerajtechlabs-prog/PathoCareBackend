import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantMiddleware } from './tenant.middleware';
import { PublicDataSourceService } from '../../database/datasources/public.datasource';
import { AuditService } from '../audit/audit.service';
import { TenantCacheService } from './tenant-cache.service';

describe('TenantMiddleware', () => {
  it('attaches tenant info when the header matches an existing tenant', async () => {
    const publicDataSourceService = {
      getDataSource: jest.fn().mockReturnValue({
        query: jest.fn().mockResolvedValue([{ id: 'tenant-1', slug: 'demo', schema_name: 'tenant_demo' }]),
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
    expect(req.tenantId).toBe('tenant-1');
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

  it('skips tenant resolution for signup and health paths', async () => {
    const publicDataSourceService = {
      getDataSource: jest.fn(),
    } as unknown as PublicDataSourceService;
    const auditService = { logEvent: jest.fn() } as unknown as AuditService;
    const middleware = new TenantMiddleware(publicDataSourceService, auditService);
    const next = jest.fn();

    await middleware.use({ path: '/signup', baseUrl: '/auth', originalUrl: '/auth/signup', headers: {} } as any, {} as any, next);
    await middleware.use({ path: '/health', headers: {} } as any, {} as any, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(publicDataSourceService.getDataSource).not.toHaveBeenCalled();
  });

  it('uses the cached tenant without querying the public database', async () => {
    const publicDataSourceService = {
      getDataSource: jest.fn(),
    } as unknown as PublicDataSourceService;
    const tenantCacheService = {
      get: jest.fn().mockResolvedValue({ id: 'tenant-1', slug: 'demo', schemaName: 'tenant_demo' }),
      set: jest.fn(),
    } as unknown as TenantCacheService;
    const auditService = { logEvent: jest.fn() } as unknown as AuditService;
    const middleware = new TenantMiddleware(publicDataSourceService, auditService, tenantCacheService);
    const req: any = { headers: { 'x-tenant-slug': 'demo' }, path: '/api/patients' };
    const next = jest.fn();

    await middleware.use(req, {} as any, next);

    expect(req.tenantId).toBe('tenant-1');
    expect(req.tenantSchema).toBe('tenant_demo');
    expect(publicDataSourceService.getDataSource).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
