import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TenantService } from './tenant.service';

@ApiTags('tenants')
@Controller('tenants')
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
