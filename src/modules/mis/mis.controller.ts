import { Controller, Get, Headers, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/tenant/user.entity';
import { MisService } from './mis.service';

@ApiTags('mis')
@Controller(['mis', 'api/mis'])
export class MisController {
  constructor(private readonly misService: MisService) {}

  @Get('day-collection')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_TECHNICIAN, UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async getDayCollection(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Query('date') date: string,
  ) {
    return this.misService.getDayCollection(tenantSlug, date);
  }

  @Get('day-register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_TECHNICIAN, UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async getDayRegister(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Query('date') date: string,
  ) {
    return this.misService.getDayRegister(tenantSlug, date);
  }

  @Post('day-collection/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async exportDayCollection(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Query('date') date: string,
    @Req() req: any,
  ) {
    return this.misService.exportDayCollection(tenantSlug, date, req.user?.sub || 'system');
  }
}
