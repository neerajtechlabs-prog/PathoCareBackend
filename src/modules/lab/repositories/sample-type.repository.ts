import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SampleType } from '../../../database/entities/tenant/sample-type.entity';

@Injectable()
export class SampleTypeRepository {
  

  async findById(tenantDS: DataSource, id: string): Promise<SampleType | null> {
    return tenantDS.getRepository(SampleType).findOne({
      where: { id },
      relations: ['lab'],
    });
  }

  async findByCode(tenantDS: DataSource, code: string): Promise<SampleType | null> {
    return tenantDS.getRepository(SampleType).findOne({
      where: { code },
      relations: ['lab'],
    });
  }

  async findByLabId(tenantDS: DataSource, labId: string, isActive?: boolean): Promise<SampleType[]> {
    const query = tenantDS
      .getRepository(SampleType)
      .createQueryBuilder('sample')
      .where('sample.labId = :labId', { labId });

    if (isActive !== undefined) {
      query.andWhere('sample.isActive = :isActive', { isActive });
    }

    return query.orderBy('sample.createdAt', 'DESC').getMany();
  }

  async findAll(tenantDS: DataSource, isActive?: boolean): Promise<SampleType[]> {
    const query = tenantDS.getRepository(SampleType).createQueryBuilder('sample');

    if (isActive !== undefined) {
      query.where('sample.isActive = :isActive', { isActive });
    }

    return query.orderBy('sample.createdAt', 'DESC').getMany();
  }

  async search(tenantDS: DataSource, query: string, labId?: string): Promise<SampleType[]> {
    const qb = tenantDS.getRepository(SampleType).createQueryBuilder('sample');

    if (labId) {
      qb.where('sample.labId = :labId', { labId });
    }

    return qb
      .andWhere('(sample.name ILIKE :query OR sample.code ILIKE :query)', { query: `%${query}%` })
      .orderBy('sample.name', 'ASC')
      .getMany();
  }

  async create(tenantDS: DataSource, sampleData: Partial<SampleType>): Promise<SampleType> {
    const sample = tenantDS.getRepository(SampleType).create(sampleData);
    return tenantDS.getRepository(SampleType).save(sample);
  }

  async update(tenantDS: DataSource, id: string, sampleData: Partial<SampleType>): Promise<SampleType | null> {
    await tenantDS.getRepository(SampleType).update(id, sampleData);
    return this.findById(tenantDS, id);
  }

  async delete(tenantDS: DataSource, id: string): Promise<boolean> {
    const result = await tenantDS.getRepository(SampleType).delete(id);
    return (result.affected ?? 0) > 0;
  }

  async countByLabId(tenantDS: DataSource, labId: string): Promise<number> {
    return tenantDS.getRepository(SampleType).countBy({ labId });
  }
}
