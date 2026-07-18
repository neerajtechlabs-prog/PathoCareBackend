/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantDataSourceService } from '../../../database/datasources/tenant.datasource';
import { AuditService } from '../../audit/audit.service';
import { BookingRepository } from '../repositories/booking.repository';
import { Booking, BookingStatus } from '../../../database/entities/tenant/booking.entity';
import { BookingReceipt } from '../../../database/entities/tenant/booking-receipt.entity';
import { CreateBookingDto } from '../dto';
import { buildBookingNumber } from '../utils/booking-number.util';
// import { buildReceiptNumber } from '../utils/receipt-number.util';
import { buildReceiptNumber } from '../utils/receipt-number.util';

import { generateBookingBarcode, generateBookingQrCode } from '../utils/barcode.util';
import { ActivityLogService } from '../../activity/activity-log.service';

@Injectable()
export class BookingsService {
  constructor(
    private readonly tenantDSService: TenantDataSourceService,
    private readonly auditService: AuditService,
    private readonly bookingRepository: BookingRepository,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async list(
    tenantSlug: string,
    query?: string,
    status?: string,
    fromDate?: string,
    toDate?: string,
    page = 1,
    perPage = 20
  ) {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    return this.bookingRepository.search(tenantDS, query, status, fromDate, toDate, page, perPage);
  }

  async create(tenantSlug: string, data: CreateBookingDto, userId: string): Promise<Booking> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);

    if (!data.patientId) {
      throw new BadRequestException('patientId is required');
    }

    const existingCount = await this.bookingRepository.count(tenantDS);
    const bookingNumber = buildBookingNumber(
      tenantSlug,
      new Date().toISOString().slice(0, 10),
      existingCount + 1
    );

    const bookingData = {
      ...data,
      preferredDate: data.preferredDate ? new Date(data.preferredDate) : undefined,
      bookingNumber,
      status: BookingStatus.PENDING,
      paymentVerified: false,
      paidAmount: 0,
      createdBy: userId,
      updatedBy: userId,
    };

    const booking = await this.bookingRepository.create(tenantDS, bookingData);

    const barcode = await generateBookingBarcode(bookingNumber);
    const qrCode = await generateBookingQrCode(bookingNumber);

    await this.auditService.logEvent({
      tenantSlug,
      action: 'bookings.created',
      entityType: 'booking',
      entityId: booking.id,
      userId,
      newValues: {
        bookingNumber,
        patientId: booking.patientId,
        amount: booking.amount,
        barcode,
        qrCodeGenerated: Boolean(qrCode),
      },
    });

    await this.activityLogService.logActivity(
      tenantSlug,
      'BOOKING_CREATED',
      'New booking created',
      `Booking ${bookingNumber} created for patient ${booking.patientId}`,
      booking.id,
    );

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

  async cancel(
    tenantSlug: string,
    bookingId: string,
    remark: string,
    userId: string
  ): Promise<Booking> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const booking = await this.bookingRepository.findById(tenantDS, bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (!remark?.trim()) {
      throw new BadRequestException('Cancellation remark is required');
    }

    await this.bookingRepository.update(tenantDS, bookingId, {
      status: BookingStatus.CANCELLED,
      cancellationRemark: remark,
      updatedBy: userId,
    });

    await this.auditService.logEvent({
      tenantSlug,
      action: 'bookings.cancelled',
      entityType: 'booking',
      entityId: bookingId,
      userId,
      oldValues: { status: booking.status },
      newValues: { status: BookingStatus.CANCELLED, remark },
    });

    const updatedBooking = await this.bookingRepository.findById(tenantDS, bookingId);
    if (!updatedBooking) throw new NotFoundException(`Booking ${bookingId} not found`);
    return updatedBooking;
  }

  async createReceipt(
    tenantSlug: string,
    bookingId: string,
    data: { amount: number; paymentMode: string; remark?: string },
    userId: string
  ) {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const booking = await this.bookingRepository.findById(tenantDS, bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot create receipt for cancelled booking');
    }

    const amount = Number(data.amount ?? 0);
    if (amount <= 0) {
      throw new BadRequestException('Receipt amount must be greater than zero');
    }

    const currentPaid = Number(booking.paidAmount || 0);
    const totalAmount = Number(booking.amount || 0);
    const remaining = totalAmount - currentPaid;
    if (amount > remaining) {
      throw new BadRequestException('Receipt amount exceeds remaining booking balance');
    }

    const receiptRepository = tenantDS.getRepository(BookingReceipt);
    const receiptCount = await receiptRepository.count();
    const receiptNumber = buildReceiptNumber(
      tenantSlug,
      new Date().toISOString().slice(0, 10),
      receiptCount + 1
    );

    const receipt = await tenantDS.manager.transaction(async (manager) => {
      const savedReceipt = await manager.save(BookingReceipt, {
        receiptNumber,
        bookingId,
        amount,
        paymentMode: data.paymentMode,
        remark: data.remark,
        createdBy: userId,
      });

      const updatedPaidAmount = currentPaid + amount;
      const updatedBooking = await manager.save(Booking, {
        ...booking,
        paidAmount: updatedPaidAmount,
        paymentVerified: updatedPaidAmount >= totalAmount,
        status: updatedPaidAmount >= totalAmount ? BookingStatus.CONFIRMED : booking.status,
        updatedBy: userId,
      });

      return { savedReceipt, updatedBooking };
    });

    await this.auditService.logEvent({
      tenantSlug,
      action: 'bookings.receipt.created',
      entityType: 'booking',
      entityId: bookingId,
      userId,
      newValues: {
        receiptNumber,
        amount,
        paymentMode: data.paymentMode,
        updatedPaidAmount: Number(booking.paidAmount || 0) + amount,
      },
    });

    await this.activityLogService.logActivity(
      tenantSlug,
      'RECEIPT_CREATED',
      'Receipt created',
      `Receipt ${receiptNumber} created for amount ${amount} and reg no. ${booking.bookingNumber}`,
      bookingId,
    );

    return { receipt: receipt.savedReceipt, booking: receipt.updatedBooking };
  }

  async validatePayment(tenantSlug: string, bookingId: string): Promise<Booking> {
    const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);
    const booking = await this.bookingRepository.findById(tenantDS, bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (!booking.amount || Number(booking.amount) <= 0) {
      throw new BadRequestException('booking amount must be greater than zero');
    }

    const updated = await tenantDS
      .getRepository(Booking)
      .update(bookingId, { paymentVerified: true, status: BookingStatus.CONFIRMED });
    if (updated.affected === 0) {
      throw new BadRequestException('Unable to validate payment');
    }

    await this.auditService.logEvent({
      tenantSlug,
      action: 'bookings.payment_validated',
      entityType: 'booking',
      entityId: bookingId,
      userId: 'system',
      newValues: {
        bookingNumber: booking.bookingNumber,
        paymentVerified: true,
        status: BookingStatus.CONFIRMED,
      },
    });

    const updatedBooking = await this.bookingRepository.findById(tenantDS, bookingId);
    if (!updatedBooking) throw new NotFoundException(`Booking ${bookingId} not found`);
    return updatedBooking;
  }
}
