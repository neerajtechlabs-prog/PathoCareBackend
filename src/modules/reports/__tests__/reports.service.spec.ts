import { ReportsService } from '../reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let tenantDSService: any;
  let auditService: any;
  let queueService: any;

  beforeEach(() => {
    tenantDSService = {
      getForTenant: jest.fn(),
    };

    auditService = {
      logEvent: jest.fn().mockResolvedValue(undefined),
    };

    queueService = {
      enqueuePdfReport: jest.fn().mockResolvedValue('job-1'),
    };

    service = new ReportsService(tenantDSService, auditService, queueService as any);
  });

  it('queues a report for generation and stores a public token', async () => {
    const repo = {
      create: jest.fn().mockReturnValue({ id: 'report-1' }),
      save: jest.fn().mockResolvedValue({
        id: 'report-1',
        bookingId: 'booking-1',
        status: 'PENDING',
        publicToken: 'token-123',
      }),
    };

    const ds = {
      getRepository: jest.fn().mockReturnValue(repo),
    };

    tenantDSService.getForTenant.mockResolvedValue(ds);

    const result = await service.requestReport('demo', { bookingId: 'booking-1', reportType: 'RESULTS' }, 'user-1');

    expect(queueService.enqueuePdfReport).toHaveBeenCalled();
    expect(result.status).toBe('PENDING');
    expect(result.publicToken).toBeDefined();
  });
});
