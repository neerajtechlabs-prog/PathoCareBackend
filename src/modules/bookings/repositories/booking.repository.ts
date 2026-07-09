import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Booking } from '../../../database/entities/tenant/booking.entity';

@Injectable()
export class BookingRepository {
  async findById(tenantDS: DataSource, id: string): Promise<Booking | null> {
    return tenantDS.getRepository(Booking).findOne({ where: { id } });
  }

  async findByBookingNumber(tenantDS: DataSource, bookingNumber: string): Promise<Booking | null> {
    return tenantDS.getRepository(Booking).findOne({ where: { bookingNumber } });
  }

  async create(tenantDS: DataSource, data: Partial<Booking>): Promise<Booking> {
    return tenantDS.getRepository(Booking).save(tenantDS.getRepository(Booking).create(data));
  }

  async update(tenantDS: DataSource, id: string, data: Partial<Booking>): Promise<Booking | null> {
    await tenantDS.getRepository(Booking).update(id, data);
    return this.findById(tenantDS, id);
  }

  async search(
    tenantDS: DataSource,
    query?: string,
    status?: string,
    fromDate?: string,
    toDate?: string,
    page = 1,
    perPage = 20,
  ): Promise<{ items: Booking[]; total: number; page: number; perPage: number }> {
    const repo = tenantDS.getRepository(Booking);
    const qb = repo.createQueryBuilder('booking');

    if (query) {
      qb.andWhere(
        '(booking.bookingNumber ILIKE :query OR booking.phone ILIKE :query OR booking.email ILIKE :query OR booking.patientId::text ILIKE :query)',
        { query: `%${query}%` },
      );
    }

    if (status) {
      qb.andWhere('booking.status = :status', { status });
    }

    if (fromDate) {
      qb.andWhere('booking.preferredDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      qb.andWhere('booking.preferredDate <= :toDate', { toDate });
    }

    const [items, total] = await qb.orderBy('booking.createdAt', 'DESC').skip((page - 1) * perPage).take(perPage).getManyAndCount();

    return { items, total, page, perPage };
  }

  async count(tenantDS: DataSource): Promise<number> {
    return tenantDS.getRepository(Booking).count();
  }
}
