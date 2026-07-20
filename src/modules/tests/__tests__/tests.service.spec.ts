import { TestsService } from '../services/tests.service';

describe('TestsService', () => {
  it('normalizes null rates to zero for tenant-backed test listings', async () => {
    const repository = {
      findAll: jest.fn().mockResolvedValue([
        {
          id: 'test-1',
          name: 'CBC',
          code: 'CBC',
          rate: null,
        },
      ]),
    };

    const tenantDSService = {
      getForTenant: jest.fn().mockResolvedValue({}),
    };

    const service = new TestsService(
      tenantDSService as any,
      {} as any,
      repository as any,
      {} as any,
      {} as any,
    );

    const result = await service.findAll('demo');

    expect(result).toEqual([
      {
        id: 'test-1',
        name: 'CBC',
        code: 'CBC',
        rate: 0,
      },
    ]);
  });

  it('queries the public datasource and returns public test catalog rows', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        id: 'test-1',
        name: 'CBC',
        code: 'CBC',
        department: 'PATHOLOGY',
        description: 'Complete Blood Count',
        specimenType: 'Blood',
        unit: 'mL',
        isActive: true,
      },
    ]);

    const publicDataSourceService = {
      getDataSource: jest.fn().mockReturnValue({ query }),
    };

    const service = new TestsService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      publicDataSourceService as any,
    );

    const result = await service.getPublicTests();

    expect(publicDataSourceService.getDataSource).toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM public.tests_master'));
    expect(result).toEqual([
      {
        id: 'test-1',
        name: 'CBC',
        code: 'CBC',
        department: 'PATHOLOGY',
        description: 'Complete Blood Count',
        specimenType: 'Blood',
        unit: 'mL',
        isActive: true,
      },
    ]);
  });
});
