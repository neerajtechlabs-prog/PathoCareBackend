import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/tenant/user.entity';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.LAB_ADMIN)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get tenant information' })
  @ApiResponse({ status: 200, description: 'Tenant metadata' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getTenant(@Param('slug') slug: string): Promise<{ slug: string; status: string; name: string; schemaName: string }> {
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
  ): Promise<{ tenantSlug: string; schemaName: string; isolationProofRows: any[] }> {
    return this.tenantService.getIsolationProof(slug);
  }
}
