import { DashboardService } from './dashboard.service';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { MisService } from '../mis/mis.service';

describe('DashboardService', () => {
  it('builds a summary payload from tenant and MIS data', async () => {
    const tenantDS = {
      query: jest.fn(),
    };

    const tenantDSService = {
      getForTenant: jest.fn().mockResolvedValue(tenantDS),
    } as unknown as TenantDataSourceService;

    const misService = {
      getDayCollection: jest.fn().mockResolvedValue({
        totalBookings: 12,
      }),
    } as unknown as MisService;

    const service = new DashboardService(tenantDSService, misService);

    tenantDS.query
      .mockResolvedValueOnce([{ total: 4 }])
      .mockResolvedValueOnce([{ total: 2 }])
      .mockResolvedValueOnce([{ outstandingTests: 7, pendingResults: 3 }])
      .mockResolvedValueOnce([{ outstandingTests: 5, pendingResults: 2 }])
      .mockResolvedValueOnce([{ total: 6 }])
      .mockResolvedValueOnce([{ total: 3 }])
      .mockResolvedValueOnce([
        { department: 'Hematology', completed: 2, total: 4 },
        { department: 'Biochemistry', completed: 1, total: 2 },
      ]);

    const result = await service.getSummary('demo');

    expect(result.stats.totalPatients).toEqual({ value: 4, trend: '+100.0%' });
    expect(result.stats.pendingResults).toEqual({ value: 3, trend: '+50.0%' });
    expect(result.stats.dueReceipts).toEqual({ value: 6, trend: '+100.0%' });
    expect(result.stats.outstandingTests).toEqual({ value: 7, trend: '+40.0%' });
    expect(result.workload).toEqual([
      { department: 'Hematology', progress: 50 },
      { department: 'Biochemistry', progress: 50 },
    ]);
    expect(result.today).toEqual({
      bookings: 12,
      reportsPending: 3,
      receiptsDue: 6,
    });
    expect(result.recentActivity).toEqual([]);
  });
});
