import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TestCatalog } from '../../../database/entities/tenant/test-catalog.entity';

@Injectable()
export class TestRepository {
  async findById(tenantDS: DataSource, id: string): Promise<TestCatalog | null> {
    return tenantDS.getRepository(TestCatalog).findOne({
      where: { id },
      relations: ['parameters'],
    });
  }

  async findAll(tenantDS: DataSource, query?: string): Promise<TestCatalog[]> {
    const qb = tenantDS.getRepository(TestCatalog).createQueryBuilder('test').leftJoinAndSelect('test.parameters', 'parameters');

    if (query) {
      qb.where('(test.name ILIKE :q OR test.code ILIKE :q OR test.department ILIKE :q)', { q: `%${query}%` });
    }

    return qb.orderBy('test.name', 'ASC').getMany();
  }

  async create(tenantDS: DataSource, data: Partial<TestCatalog>): Promise<TestCatalog> {
    return tenantDS.getRepository(TestCatalog).save(tenantDS.getRepository(TestCatalog).create(data));
  }

  async update(tenantDS: DataSource, id: string, data: Partial<TestCatalog>): Promise<TestCatalog | null> {
    await tenantDS.getRepository(TestCatalog).update(id, data);
    return this.findById(tenantDS, id);
  }

  async delete(tenantDS: DataSource, id: string): Promise<boolean> {
    const result = await tenantDS.getRepository(TestCatalog).delete(id);
    return (result.affected ?? 0) > 0;
  }
}
