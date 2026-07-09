import { Body, Controller, Get, Headers, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/tenant/user.entity';
import { BookingsService } from './services/bookings.service';
import { CreateBookingDto, CancelBookingDto, CreateReceiptDto } from './dto';

@ApiTags('bookings')
@Controller(['bookings', 'api/bookings'])
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List bookings with optional filters and pagination' })
  @ApiResponse({ status: 200, description: 'Booking list returned' })
  async list(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Query('q') query?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page = '1',
    @Query('perPage') perPage = '20',
  ) {
    return this.bookingsService.list(
      tenantSlug,
      query,
      status,
      fromDate,
      toDate,
      parseInt(page, 10),
      parseInt(perPage, 10),
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Headers('x-tenant-slug') tenantSlug: string, @Param('id') bookingId: string) {
    return this.bookingsService.findById(tenantSlug, bookingId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RECEPTIONIST, UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async create(@Headers('x-tenant-slug') tenantSlug: string, @Body() body: CreateBookingDto, @Req() req: Request & { user?: { sub?: string } }) {
    return this.bookingsService.create(tenantSlug, body, req.user?.sub || 'system');
  }

  @Put(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async cancel(@Headers('x-tenant-slug') tenantSlug: string, @Param('id') bookingId: string, @Body() body: CancelBookingDto, @Req() req: Request & { user?: { sub?: string } }) {
    return this.bookingsService.cancel(tenantSlug, bookingId, body.remark, req.user?.sub || 'system');
  }

  @Post(':id/receipts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RECEPTIONIST, UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async createReceipt(@Headers('x-tenant-slug') tenantSlug: string, @Param('id') bookingId: string, @Body() body: CreateReceiptDto, @Req() req: Request & { user?: { sub?: string } }) {
    return this.bookingsService.createReceipt(tenantSlug, bookingId, body, req.user?.sub || 'system');
  }

  @Post(':id/payment/validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RECEPTIONIST, UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async validatePayment(@Headers('x-tenant-slug') tenantSlug: string, @Param('id') bookingId: string) {
    return this.bookingsService.validatePayment(tenantSlug, bookingId);
  }
}
