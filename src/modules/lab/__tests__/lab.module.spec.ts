import { Test } from '@nestjs/testing';
import { LabModule } from '../lab.module';

describe('LabModule', () => {
  it('should compile module metadata', async () => {
    const moduleBuilder = await Test.createTestingModule({
      imports: [LabModule],
    }).compile();

    expect(moduleBuilder).toBeDefined();
  });
});
