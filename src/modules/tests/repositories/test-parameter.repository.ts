import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TestParameter } from '../../../database/entities/tenant/test-parameter.entity';

@Injectable()
export class TestParameterRepository {
  async findById(tenantDS: DataSource, id: string): Promise<TestParameter | null> {
    return tenantDS.getRepository(TestParameter).findOne({ where: { id } });
  }

  async findByTestId(tenantDS: DataSource, testId: string): Promise<TestParameter[]> {
    return tenantDS.getRepository(TestParameter).find({ where: { testId }, order: { name: 'ASC' } });
  }

  async create(tenantDS: DataSource, data: Partial<TestParameter>): Promise<TestParameter> {
    return tenantDS.getRepository(TestParameter).save(tenantDS.getRepository(TestParameter).create(data));
  }

  async update(tenantDS: DataSource, id: string, data: Partial<TestParameter>): Promise<TestParameter> {
    await tenantDS.getRepository(TestParameter).update(id, data);
    return this.findById(tenantDS, id);
  }

  async delete(tenantDS: DataSource, id: string): Promise<boolean> {
    const result = await tenantDS.getRepository(TestParameter).delete(id);
    return result.affected > 0;
  }
}
