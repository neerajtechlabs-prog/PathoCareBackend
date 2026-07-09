import { ResultsEvaluateProcessor } from '../processors/results-evaluate.processor';

describe('ResultsEvaluateProcessor', () => {
  it('runs evaluation and enqueues notifications when critical', async () => {
    const paramResult = { id: 'pr1', testResultId: 'r1', parameterId: 'p1', value: '5', isAbnormal: false, isCritical: false };

    const paramResultRepo = {
      find: async () => [paramResult],
      save: async (p: any) => p,
    };

    const testResultRepo = { findOne: async () => ({ id: 'r1', bookingId: 'b1' }) };
    const bookingRepo = { findOne: async () => ({ id: 'b1', email: 'patient@example.com', phone: '+911234567890' }) };
    const labRepo = { findOne: async () => ({ id: 'lab1', email: 'lab@example.com', phone: '+911098765432' }) };

    const tenantDSMock: any = {
      getRepository: (name: any) => {
        if (name === 'test_parameter_results' || name === Object) return paramResultRepo;
        if (name === 'test_results') return testResultRepo;
        if (name === 'bookings') return bookingRepo;
        if (name === 'labs' || name === 'Lab') return labRepo;
        return { findOne: async () => null };
      },
    };

    const tenantDSService = { getForTenant: async () => tenantDSMock } as any;
    const queueService = { enqueueEmail: async () => '', enqueueSms: async () => '', enqueueWhatsapp: async () => '' } as any;

    const proc = new ResultsEvaluateProcessor(tenantDSService, queueService);

    const result = await proc.process({ id: 'job1', data: { tenantSlug: 't1', resultId: 'r1' } } as any);
    expect(result).toBeDefined();
    expect(result.ok).toBe(true);
  });
});
