import { MisService } from '../mis.service';

describe('MisService', () => {
  let service: MisService;
  let tenantDSService: any;

  beforeEach(() => {
    tenantDSService = {
      getForTenant: jest.fn(),
    };

    service = new MisService(tenantDSService as any, undefined as any, undefined as any);
  });

  it('builds day collection summary from bookings and receipts', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ totalBookings: 2, totalBilled: '300.00', totalCollected: '250.00', pendingBalance: '50.00' }])
      .mockResolvedValueOnce([
        { paymentMode: 'Cash', totalCollected: '100.00' },
        { paymentMode: 'Card', totalCollected: '150.00' },
      ])
      .mockResolvedValueOnce([
        { testName: 'CBC', totalTests: 2 },
        { testName: 'Lipid Profile', totalTests: 1 },
      ]);

    tenantDSService.getForTenant.mockResolvedValue({ query });

    const result = await service.getDayCollection('demo', '2026-07-11');

    expect(result.totalBookings).toBe(2);
    expect(result.totalBilled).toBe(300);
    expect(result.totalCollected).toBe(250);
    expect(result.pendingBalance).toBe(50);
    expect(result.modeWiseCollection).toHaveLength(2);
    expect(result.testWiseCounts).toHaveLength(2);
  });

  it('returns day register rows for a date', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        bookingNumber: 'BK-001',
        patientName: 'John Doe',
        totalAmount: '200.00',
        paidAmount: '200.00',
        balance: '0.00',
        status: 'Completed',
      },
    ]);

    tenantDSService.getForTenant.mockResolvedValue({ query });

    const result = await service.getDayRegister('demo', '2026-07-11');

    expect(result).toHaveLength(1);
    expect(result[0].bookingNumber).toBe('BK-001');
  });
});
