import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('writes an audit event to the tenant schema for critical actions', async () => {
    const tenantDS = {
      query: jest.fn().mockResolvedValue([]),
    };

    const tenantDSService = {
      getForTenant: jest.fn().mockResolvedValue(tenantDS),
    };

    const service = new AuditService(tenantDSService as any);

    await service.logEvent({
      tenantSlug: 'demo',
      action: 'auth.login.success',
      entityType: 'auth',
      entityId: 'user-1',
      userId: 'user-1',
      userEmail: 'admin@demo.pathcare.local',
      role: 'LabAdmin',
      newValues: { result: 'success' },
    });

    expect(tenantDSService.getForTenant).toHaveBeenCalledWith('demo');
    expect(tenantDS.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_logs'),
      expect.any(Array),
    );
  });

  it('skips logging for non-critical actions', async () => {
    const tenantDS = {
      query: jest.fn().mockResolvedValue([]),
    };

    const tenantDSService = {
      getForTenant: jest.fn().mockResolvedValue(tenantDS),
    };

    const service = new AuditService(tenantDSService as any);

    await service.logEvent({
      tenantSlug: 'demo',
      action: 'health.check',
      entityType: 'system',
      entityId: 'health',
    });

    expect(tenantDS.query).not.toHaveBeenCalled();
  });

  it('creates the audit table before logging when it is missing', async () => {
    const tenantDS = {
      query: jest
        .fn()
        .mockRejectedValueOnce(new Error('relation "audit_logs" does not exist'))
        .mockResolvedValueOnce([]),
    };

    const tenantDSService = {
      getForTenant: jest.fn().mockResolvedValue(tenantDS),
    };

    const service = new AuditService(tenantDSService as any);

    await service.logEvent({
      tenantSlug: 'demo',
      action: 'auth.login.success',
      entityType: 'auth',
      userId: 'user-1',
      userEmail: 'admin@demo.pathcare.local',
      role: 'LabAdmin',
    });

    expect(tenantDS.query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS audit_logs'),
      undefined,
    );
    expect(tenantDS.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_logs'),
      expect.any(Array),
    );
  });

  it('fetches recent audit logs for a tenant', async () => {
    const tenantDS = {
      query: jest.fn().mockResolvedValue([{ action: 'auth.login.success' }]),
    };

    const tenantDSService = {
      getForTenant: jest.fn().mockResolvedValue(tenantDS),
    };

    const service = new AuditService(tenantDSService as any);

    const logs = await service.getLogs('demo', { limit: 10 });

    expect(tenantDSService.getForTenant).toHaveBeenCalledWith('demo');
    expect(tenantDS.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM audit_logs'),
      expect.any(Array),
    );
    expect(logs).toHaveLength(1);
  });
});
