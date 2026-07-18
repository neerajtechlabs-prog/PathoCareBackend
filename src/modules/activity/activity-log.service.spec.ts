import { ActivityLogService } from './activity-log.service';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';

describe('ActivityLogService', () => {
  it('inserts an activity row for a tenant event', async () => {
    const tenantDS = {
      query: jest.fn().mockResolvedValue([]),
      getRepository: jest.fn().mockReturnValue({
        save: jest.fn().mockResolvedValue({ id: 'activity-1' }),
      }),
    };

    const tenantDSService = {
      getForTenant: jest.fn().mockResolvedValue(tenantDS),
    } as unknown as TenantDataSourceService;

    const service = new ActivityLogService(tenantDSService);

    await service.logActivity('demo', 'BOOKING_CREATED', 'New booking created', 'Patient Jane Doe', 'booking-1');

    expect(tenantDS.getRepository).toHaveBeenCalled();
  });
});
