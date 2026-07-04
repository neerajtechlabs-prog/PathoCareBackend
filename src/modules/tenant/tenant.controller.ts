import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantService } from './tenant.service';

@ApiTags('tenants')
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get tenant information' })
  getTenant(@Param('slug') slug: string): { slug: string; status: string } {
    return this.tenantService.getTenantInfo(slug);
  }
}
