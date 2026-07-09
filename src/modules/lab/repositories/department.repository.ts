import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Department } from '../../../database/entities/tenant/department.entity';

@Injectable()
export class DepartmentRepository {
  private readonly logger = new Logger(DepartmentRepository.name);

  async findById(tenantDS: DataSource, id: string): Promise<Department | null> {
    return tenantDS.getRepository(Department).findOne({
      where: { id },
      relations: ['lab'],
    });
  }

  async findByLabId(tenantDS: DataSource, labId: string, isActive?: boolean): Promise<Department[]> {
    const query = tenantDS.getRepository(Department).createQueryBuilder('dept').where('dept.labId = :labId', { labId });

    if (isActive !== undefined) {
      query.andWhere('dept.isActive = :isActive', { isActive });
    }

    return query.orderBy('dept.createdAt', 'DESC').getMany();
  }

  async findAll(tenantDS: DataSource, isActive?: boolean): Promise<Department[]> {
    const query = tenantDS.getRepository(Department).createQueryBuilder('dept');

    if (isActive !== undefined) {
      query.where('dept.isActive = :isActive', { isActive });
    }

    return query.orderBy('dept.createdAt', 'DESC').getMany();
  }

  async create(tenantDS: DataSource, deptData: Partial<Department>): Promise<Department> {
    const dept = tenantDS.getRepository(Department).create(deptData);
    return tenantDS.getRepository(Department).save(dept);
  }

  async update(tenantDS: DataSource, id: string, deptData: Partial<Department>): Promise<Department> {
    await tenantDS.getRepository(Department).update(id, deptData);
    return this.findById(tenantDS, id);
  }

  async delete(tenantDS: DataSource, id: string): Promise<boolean> {
    const result = await tenantDS.getRepository(Department).delete(id);
    return result.affected > 0;
  }

  async countByLabId(tenantDS: DataSource, labId: string): Promise<number> {
    return tenantDS.getRepository(Department).countBy({ labId });
  }
}
