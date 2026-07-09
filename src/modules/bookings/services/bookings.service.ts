import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { AuditService } from '../../audit/audit.service';
import { BookingRepository } from '../repositories/booking.repository';
import { Booking, BookingStatus } from '../../../database/entities/tenant/booking.entity';
import { buildBookingNumber } from '../utils/booking-number.util';
import { generateBookingBarcode, generateBookingQrCode } from '../utils/barcode.util';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly tenantDSService: TenantDataSourceService,
    private readonly auditService: AuditService,
    private readonly bookingRepository: BookingRepository,
  ) {}

  async create(tenantSlug: string, data: Partial<Booking>, userId: string): Promise<Booking> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);

    if (!data.patientId) {
      throw new BadRequestException('patientId is required');
    }

    const existingCount = await this.bookingRepository.count(tenantDS);
    const bookingNumber = buildBookingNumber(tenantSlug, new Date().toISOString().slice(0, 10), existingCount + 1);

    const booking = await this.bookingRepository.create(tenantDS, {
      ...data,
      bookingNumber,
      status: BookingStatus.PENDING,
      paymentVerified: false,
      createdBy: userId,
      updatedBy: userId,
    });

    const barcode = await generateBookingBarcode(bookingNumber);
    const qrCode = await generateBookingQrCode(bookingNumber);

    await this.auditService.logEvent({
      tenantSlug,
      action: 'bookings.created',
      entityType: 'booking',
      entityId: booking.id,
      userId,
      newValues: { bookingNumber, patientId: booking.patientId, amount: booking.amount, barcode, qrCodeGenerated: Boolean(qrCode) },
    });

    return { ...booking, barcode, qrCode } as Booking & { barcode: string; qrCode: string };
  }

  async findById(tenantSlug: string, bookingId: string): Promise<Booking> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const booking = await this.bookingRepository.findById(tenantDS, bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }
    return booking;
  }

  async validatePayment(tenantSlug: string, bookingId: string): Promise<Booking> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const booking = await this.bookingRepository.findById(tenantDS, bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (!booking.amount || booking.amount <= 0) {
      throw new BadRequestException('booking amount must be greater than zero');
    }

    const updated = await tenantDS.getRepository(Booking).update(bookingId, { paymentVerified: true, status: BookingStatus.CONFIRMED });
    if (updated.affected === 0) {
      throw new BadRequestException('Unable to validate payment');
    }

    await this.auditService.logEvent({
      tenantSlug,
      action: 'bookings.payment_validated',
      entityType: 'booking',
      entityId: bookingId,
      userId: 'system',
      newValues: { bookingNumber: booking.bookingNumber, paymentVerified: true, status: BookingStatus.CONFIRMED },
    });

    return this.bookingRepository.findById(tenantDS, bookingId);
  }
}
