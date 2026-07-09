import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Booking } from '../../../database/entities/tenant/booking.entity';
import { BookingTest } from '../../../database/entities/tenant/booking-test.entity';

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

  async createBookingTest(tenantDS: DataSource, data: Partial<BookingTest>): Promise<BookingTest> {
    return tenantDS.getRepository(BookingTest).save(tenantDS.getRepository(BookingTest).create(data));
  }

  async count(tenantDS: DataSource): Promise<number> {
    return tenantDS.getRepository(Booking).count();
  }
}
