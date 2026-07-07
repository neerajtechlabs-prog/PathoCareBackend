import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/tenant/user.entity';
import { AuditService } from '../audit/audit.service';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.LAB_ADMIN)
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly auditService: AuditService,
  ) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get tenant information' })
  @ApiResponse({ status: 200, description: 'Tenant metadata' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getTenant(
    @Param('slug') slug: string,
    @Req() req: any,
  ): Promise<{ slug: string; status: string; name: string; schemaName: string }> {
    await this.auditService.logEvent({
      tenantSlug: req.headers['x-tenant-slug'] ? String(req.headers['x-tenant-slug']) : slug,
      action: 'tenants.info.accessed',
      entityType: 'tenant',
      entityId: slug,
      userId: req.user?.sub,
      userEmail: req.user?.email,
      role: req.user?.role,
      newValues: { source: 'tenant_controller' },
    });

    return this.tenantService.getTenantInfo(slug);
  }

  @Get(':slug/isolation-proof')
  @ApiOperation({
    summary: 'Isolation Proof: Query tenant-specific schema',
    description: 'Returns data from the tenant\'s isolated schema only. Proves cross-tenant data separation.',
  })
  @ApiResponse({ status: 200, description: 'Tenant isolation verified — only tenant\'s own data returned' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getIsolationProof(
    @Param('slug') slug: string,
    @Req() req: any,
  ): Promise<{ tenantSlug: string; schemaName: string; isolationProofRows: any[] }> {
    await this.auditService.logEvent({
      tenantSlug: req.headers['x-tenant-slug'] ? String(req.headers['x-tenant-slug']) : slug,
      action: 'tenants.isolation.accessed',
      entityType: 'tenant',
      entityId: slug,
      userId: req.user?.sub,
      userEmail: req.user?.email,
      role: req.user?.role,
      newValues: { source: 'tenant_isolation_endpoint' },
    });

    return this.tenantService.getIsolationProof(slug);
  }
}
