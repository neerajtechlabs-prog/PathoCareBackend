import { Test } from '@nestjs/testing';
import { TestsModule } from '../tests.module';

describe('TestsModule', () => {
  it('should compile module metadata', async () => {
    const moduleBuilder = await Test.createTestingModule({
      imports: [TestsModule],
    }).compile();

    expect(moduleBuilder).toBeDefined();
  });
});
