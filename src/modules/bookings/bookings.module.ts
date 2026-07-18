import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking, BookingTest, BookingReceipt } from '../../database/entities/tenant';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './services/bookings.service';
import { BookingRepository } from './repositories/booking.repository';
import { TenantModule } from '../tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';
import { ActivityLogModule } from '../activity/activity-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, BookingTest, BookingReceipt]), TenantModule, AuditModule, ActivityLogModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingRepository],
  exports: [BookingsService],
})
export class BookingsModule {}
