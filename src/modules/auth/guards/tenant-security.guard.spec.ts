import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantSecurityGuard } from './tenant-security.guard';

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('TenantSecurityGuard', () => {
  it('allows a request when header and JWT tenant match', () => {
    const guard = new TenantSecurityGuard();
    const context = createContext({
      headers: { 'x-tenant-slug': 'demo' },
      tenantId: 'tenant-1',
      user: { tenantId: 'tenant-1', tenantSlug: 'demo' },
    });

    expect(guard.assertTenantMatch(context)).toBe(true);
  });

  it('rejects a request when the header slug differs from the JWT claim', () => {
    const guard = new TenantSecurityGuard();
    const context = createContext({
      headers: { 'x-tenant-slug': 'other' },
      tenantId: 'tenant-1',
      user: { tenantId: 'tenant-1', tenantSlug: 'demo' },
    });

    expect(() => guard.assertTenantMatch(context)).toThrow(ForbiddenException);
  });

  it('rejects a request when resolved tenantId differs from the JWT claim', () => {
    const guard = new TenantSecurityGuard();
    const context = createContext({
      headers: { 'x-tenant-slug': 'demo' },
      tenantId: 'tenant-2',
      user: { tenantId: 'tenant-1', tenantSlug: 'demo' },
    });

    expect(() => guard.assertTenantMatch(context)).toThrow(ForbiddenException);
  });

  it('rejects an incomplete tenant authentication context', () => {
    const guard = new TenantSecurityGuard();
    const context = createContext({
      headers: {},
      user: { tenantId: 'tenant-1', tenantSlug: 'demo' },
    });

    expect(() => guard.assertTenantMatch(context)).toThrow(ForbiddenException);
  });
});
