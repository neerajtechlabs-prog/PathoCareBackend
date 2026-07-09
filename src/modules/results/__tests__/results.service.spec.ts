import { ResultsService } from '../results.service';

describe('ResultsService', () => {
  it('creates result and enqueues evaluation', async () => {
    const tenantDSMock: any = {
      manager: {
        transaction: async (cb: any) => cb({}),
      },
      getRepository: () => ({ create: (d: any) => d, save: async (d: any) => ({ ...d, id: 'rid' }) }),
    };

    const tenantDSService = { getForTenant: async () => tenantDSMock } as any;
    const auditService = { logEvent: async () => {} } as any;
    const resultsRepository = { createTestResult: async (_: any, data: any) => ({ ...data, id: 'r1' }), createParameterResult: async () => ({}) } as any;
    const queueService = { enqueue: async () => 'job1' , enqueueEmail: async ()=>'', enqueueSms: async ()=>'', enqueueWhatsapp: async ()=>''} as any;

    const svc = new ResultsService(tenantDSService, auditService, resultsRepository, queueService);

    const dto = { bookingId: 'b1', testId: 't1', parameters: [{ parameterId: 'p1', value: '10' }] } as any;
    const res = await svc.create('tenant1', dto, 'user1');
    expect(res).toBeDefined();
    expect(res.id).toBeDefined();
  });
});
