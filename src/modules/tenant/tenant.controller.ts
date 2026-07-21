import { Controller, Get, Param, Req, HttpCode, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { AuditService } from '../audit/audit.service';
import { DeleteTenantInitDto } from './dtos/delete-tenant-init.dto';
import { DeleteTenantConfirmDto } from './dtos/delete-tenant-confirm.dto';

@ApiTags('tenants')
@Controller('tenants')
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

  @Post('delete/init')
  @HttpCode(200)
  @ApiOperation({ summary: 'Initialize tenant deletion with OTP email' })
  @ApiResponse({ status: 200, description: 'Deletion OTP sent to email' })
  async initTenantDelete(
    @Body() dto: DeleteTenantInitDto,
    @Req() req: any,
  ): Promise<{ message: string; referenceId: string }> {
    await this.auditService.logEvent({
      tenantSlug: req.headers['x-tenant-slug'] ? String(req.headers['x-tenant-slug']) : dto.slug,
      action: 'tenants.delete.init',
      entityType: 'tenant',
      entityId: dto.slug,
      userId: req.user?.sub,
      userEmail: req.user?.email,
      role: req.user?.role,
      newValues: { source: 'tenant_delete_init_endpoint', email: dto.email },
    });

    return this.tenantService.initTenantDelete(dto.slug, dto.email);
  }

  @Post('delete/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm tenant deletion with OTP' })
  @ApiResponse({ status: 200, description: 'Tenant deleted successfully' })
  async confirmTenantDelete(
    @Body() dto: DeleteTenantConfirmDto,
    @Req() req: any,
  ): Promise<{ message: string; slug: string; schemaName: string }> {
    await this.auditService.logEvent({
      tenantSlug: req.headers['x-tenant-slug'] ? String(req.headers['x-tenant-slug']) : dto.slug,
      action: 'tenants.delete.confirm',
      entityType: 'tenant',
      entityId: dto.slug,
      userId: req.user?.sub,
      userEmail: req.user?.email,
      role: req.user?.role,
      newValues: { source: 'tenant_delete_confirm_endpoint', referenceId: dto.otpCode },
    });

    return this.tenantService.confirmTenantDelete(dto.slug, dto.otpCode);
  }
}
