import { Controller, Get, Headers, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller(['dashboard', 'api/dashboard'])
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get('workload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async workload(@Headers('x-tenant-slug') tenantSlug: string, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.svc.getWorkload(tenantSlug, { dateFrom, dateTo });
  }
}
