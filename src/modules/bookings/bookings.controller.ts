import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/tenant/user.entity';
import { BookingsService } from './services/bookings.service';
import { CreateBookingDto } from './dto';

@ApiTags('bookings')
@Controller(['bookings', 'api/bookings'])
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

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

  @Post(':id/payment/validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RECEPTIONIST, UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async validatePayment(@Headers('x-tenant-slug') tenantSlug: string, @Param('id') bookingId: string) {
    return this.bookingsService.validatePayment(tenantSlug, bookingId);
  }
}
