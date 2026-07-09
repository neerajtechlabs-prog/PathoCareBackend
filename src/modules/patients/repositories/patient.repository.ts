import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Patient } from '../../../database/entities/tenant/patient.entity';

@Injectable()
export class PatientRepository {
  async findById(tenantDS: DataSource, id: string): Promise<Patient | null> {
    return tenantDS.getRepository(Patient).findOne({ where: { id } });
  }

  async findAll(tenantDS: DataSource, query?: string): Promise<Patient[]> {
    const qb = tenantDS.getRepository(Patient).createQueryBuilder('patient');

    if (query) {
      qb.where('(patient.name ILIKE :q OR patient.uid ILIKE :q OR patient.phone ILIKE :q)', { q: `%${query}%` });
    }

    return qb.orderBy('patient.createdAt', 'DESC').getMany();
  }

  async create(tenantDS: DataSource, data: Partial<Patient>): Promise<Patient> {
    return tenantDS.getRepository(Patient).save(tenantDS.getRepository(Patient).create(data));
  }

  async update(tenantDS: DataSource, id: string, data: Partial<Patient>): Promise<Patient | null> {
    await tenantDS.getRepository(Patient).update(id, data);
    return this.findById(tenantDS, id);
  }

  async delete(tenantDS: DataSource, id: string): Promise<boolean> {
    const result = await tenantDS.getRepository(Patient).delete(id);
    return (result.affected ?? 0) > 0;
  }

  async count(tenantDS: DataSource): Promise<number> {
    return tenantDS.getRepository(Patient).count();
  }
}
