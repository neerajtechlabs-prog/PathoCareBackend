import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/tenant/user.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller(['reports', 'api/reports'])
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_TECHNICIAN, UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async requestReport(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Body() body: CreateReportDto,
    @Req() req: any,
  ) {
    return this.reportsService.requestReport(tenantSlug, body, req.user?.sub || 'system');
  }

  @Get('public/:token')
  async getPublicStatus(@Headers('x-tenant-slug') tenantSlug: string, @Param('token') token: string) {
    return this.reportsService.getPublicReportStatus(tenantSlug, token);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getStatus(@Headers('x-tenant-slug') tenantSlug: string, @Param('id') reportId: string) {
    return this.reportsService.getReportStatus(tenantSlug, reportId);
  }
}
