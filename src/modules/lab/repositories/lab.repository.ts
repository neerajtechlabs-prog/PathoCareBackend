import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Lab } from '../../../database/entities/tenant/lab.entity';

@Injectable()
export class LabRepository {
  private readonly logger = new Logger(LabRepository.name);

  async findById(tenantDS: DataSource, id: string): Promise<Lab | null> {
    return tenantDS.getRepository(Lab).findOne({
      where: { id },
      relations: ['departments', 'sampleTypes'],
    });
  }

  async findAll(tenantDS: DataSource, isActive?: boolean): Promise<Lab[]> {
    const query = tenantDS.getRepository(Lab).createQueryBuilder('lab');

    if (isActive !== undefined) {
      query.where('lab.isActive = :isActive', { isActive });
    }

    return query
      .leftJoinAndSelect('lab.departments', 'departments')
      .leftJoinAndSelect('lab.sampleTypes', 'sampleTypes')
      .orderBy('lab.createdAt', 'DESC')
      .getMany();
  }

  async findByName(tenantDS: DataSource, name: string): Promise<Lab | null> {
    return tenantDS.getRepository(Lab).findOne({
      where: { name },
      relations: ['departments', 'sampleTypes'],
    });
  }

  async create(tenantDS: DataSource, labData: Partial<Lab>): Promise<Lab> {
    const lab = tenantDS.getRepository(Lab).create(labData);
    return tenantDS.getRepository(Lab).save(lab);
  }

  async update(tenantDS: DataSource, id: string, labData: Partial<Lab>): Promise<Lab> {
    await tenantDS.getRepository(Lab).update(id, labData);
    return this.findById(tenantDS, id);
  }

  async delete(tenantDS: DataSource, id: string): Promise<boolean> {
    const result = await tenantDS.getRepository(Lab).delete(id);
    return result.affected > 0;
  }

  async count(tenantDS: DataSource): Promise<number> {
    return tenantDS.getRepository(Lab).count();
  }
}
