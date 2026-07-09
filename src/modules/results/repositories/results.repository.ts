import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TestResult } from '../../../database/entities/tenant/test-result.entity';
import { TestParameterResult } from '../../../database/entities/tenant/test-parameter-result.entity';

@Injectable()
export class ResultsRepository {
  async createTestResult(ds: DataSource, data: Partial<TestResult>): Promise<TestResult> {
    const repo = ds.getRepository(TestResult);
    const entity = repo.create(data as any);
    const saved = await repo.save(entity as any);
    return Array.isArray(saved) ? (saved[0] as TestResult) : (saved as TestResult);
  }

  async createParameterResult(ds: DataSource, data: Partial<TestParameterResult>): Promise<TestParameterResult> {
    const repo = ds.getRepository(TestParameterResult);
    const entity = repo.create(data as any);
    const saved = await repo.save(entity as any);
    return Array.isArray(saved) ? (saved[0] as TestParameterResult) : (saved as TestParameterResult);
  }
}
