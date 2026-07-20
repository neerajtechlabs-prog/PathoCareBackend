import { TestsService } from '../services/tests.service';

describe('TestsService.getPublicTests', () => {
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
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM public.tests'));
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
