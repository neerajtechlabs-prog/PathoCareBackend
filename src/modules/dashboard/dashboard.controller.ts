import { Controller, Get, Headers, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/tenant/user.entity';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller(['dashboard', 'api/dashboard'])
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get('workload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dashboard workload metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard workload statistics' })
  async workload(@Headers('x-tenant-slug') tenantSlug: string, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.svc.getWorkload(tenantSlug, { dateFrom, dateTo });
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RECEPTIONIST, UserRole.LAB_TECHNICIAN, UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get consolidated dashboard summary for the current tenant' })
  @ApiResponse({ status: 200, description: 'Dashboard summary payload' })
  async summary(@Headers('x-tenant-slug') tenantSlug: string) {
    return this.svc.getSummary(tenantSlug);
  }
}
