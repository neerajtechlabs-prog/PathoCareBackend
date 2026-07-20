import { TestsService } from './tests.service';

describe('TestsService', () => {
  let service: TestsService;
  let tenantDSService: any;
  let testRepository: any;
  let publicDataSourceService: any;

  beforeEach(() => {
    tenantDSService = {
      getForTenant: jest.fn(),
    };

    testRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    publicDataSourceService = {
      getDataSource: jest.fn(),
    };

    service = new TestsService(
      tenantDSService,
      { logEvent: jest.fn() } as any,
      testRepository,
      { findByTestId: jest.fn(), findById: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() } as any,
      publicDataSourceService,
    );
  });

  it('combines tenant and public tests for findAll', async () => {
    const tenantDS = {};
    tenantDSService.getForTenant.mockResolvedValue(tenantDS);
    testRepository.findAll.mockResolvedValue([{ id: 'tenant-1', name: 'CBC', rate: 120 }]);
    publicDataSourceService.getDataSource.mockReturnValue({
      query: jest.fn().mockResolvedValue([{ id: 'public-1', name: 'Lipid Panel', rate: 250 }]),
    });

    const result = await service.findAll('demo', 'panel');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(expect.objectContaining({ source: 'tenant', name: 'CBC' }));
    expect(result[1]).toEqual(expect.objectContaining({ source: 'public', name: 'Lipid Panel' }));
  });
});
