import { Body, Controller, Post, Headers, UseGuards, Req, Put, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/tenant/user.entity';
import { ResultsService } from './results.service';
import { CreateTestResultDto } from './dto/create-result.dto';

@ApiTags('results')
@Controller(['results', 'api/results'])
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_TECHNICIAN, UserRole.LAB_ADMIN)
  @ApiBearerAuth()
  async create(@Headers('x-tenant-slug') tenantSlug: string, @Body() body: CreateTestResultDto, @Req() req: any) {
    return this.resultsService.create(tenantSlug, body, req.user?.sub || 'system');
  }

  @Put(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_ADMIN)
  @ApiBearerAuth()
  async verify(@Headers('x-tenant-slug') tenantSlug: string, @Param('id') id: string, @Req() req: any) {
    return this.resultsService.verify(tenantSlug, id, req.user?.sub || 'system');
  }
}
