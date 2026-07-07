import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/tenant/user.entity';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.LAB_ADMIN)
  @ApiOperation({ summary: 'Get recent tenant audit logs' })
  @ApiResponse({ status: 200, description: 'Audit logs returned' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getLogs(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
  ) {
    const tenantSlug = req.headers['x-tenant-slug'] ? String(req.headers['x-tenant-slug']) : 'unknown';
    const parsedLimit = limit ? Number(limit) : 50;

    return this.auditService.getLogs(tenantSlug, {
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 50,
      action,
      userId,
    });
  }
}
