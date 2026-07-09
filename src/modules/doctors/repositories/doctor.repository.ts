import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Doctor } from '../../../database/entities/tenant/doctor.entity';

@Injectable()
export class DoctorRepository {
  async findById(tenantDS: DataSource, id: string): Promise<Doctor | null> {
    return tenantDS.getRepository(Doctor).findOne({ where: { id } });
  }

  async findAll(tenantDS: DataSource, query?: string): Promise<Doctor[]> {
    const qb = tenantDS.getRepository(Doctor).createQueryBuilder('doctor');

    if (query) {
      qb.where('(doctor.name ILIKE :q OR doctor.specialization ILIKE :q OR doctor.phone ILIKE :q)', { q: `%${query}%` });
    }

    return qb.orderBy('doctor.createdAt', 'DESC').getMany();
  }

  async create(tenantDS: DataSource, data: Partial<Doctor>): Promise<Doctor> {
    return tenantDS.getRepository(Doctor).save(tenantDS.getRepository(Doctor).create(data));
  }

  async update(tenantDS: DataSource, id: string, data: Partial<Doctor>): Promise<Doctor | null> {
    await tenantDS.getRepository(Doctor).update(id, data);
    return this.findById(tenantDS, id);
  }

  async delete(tenantDS: DataSource, id: string): Promise<boolean> {
    const result = await tenantDS.getRepository(Doctor).delete(id);
    return (result.affected ?? 0) > 0;
  }
}
