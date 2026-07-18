import { Controller, Get, Put, Body, Headers, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../../database/entities/tenant/user.entity';
import { LabService } from '../services/lab.service';
import { CreateLabDto, UpdateLabDto, LabResponseDto } from '../dtos';

@ApiTags('lab-profile')
@Controller(['lab-profile', 'api/lab-profile'])
export class LabProfileController {
  constructor(private readonly labService: LabService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current tenant lab profile' })
  @ApiResponse({ status: 200, description: 'Lab profile retrieved' })
  async getProfile(@Headers('x-tenant-slug') tenantSlug: string): Promise<LabResponseDto | null> {
    const labs = await this.labService.findAll(tenantSlug);
    const lab = labs && labs.length ? labs[0] : null;
    if (!lab) return null;
    return {
      id: lab.id,
      name: lab.name,
      address: lab.address,
      phone: lab.phone,
      email: lab.email,
      config: lab.config,
      isActive: lab.isActive,
      departmentCount: lab.departments?.length || 0,
      sampleTypeCount: lab.sampleTypes?.length || 0,
      createdAt: lab.createdAt,
      updatedAt: lab.updatedAt,
    } as LabResponseDto;
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update tenant lab profile' })
  @ApiResponse({ status: 200, description: 'Lab profile saved' })
  async saveProfile(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Body() dto: UpdateLabDto,
    @Req() req: Request & { user?: { sub?: string } },
  ): Promise<LabResponseDto> {
    const labs = await this.labService.findAll(tenantSlug);
    const userId = req.user?.sub || 'system';

    if (labs && labs.length) {
      const updated = await this.labService.update(tenantSlug, labs[0].id, dto, userId);
      return {
        id: updated.id,
        name: updated.name,
        address: updated.address,
        phone: updated.phone,
        email: updated.email,
        config: updated.config,
        isActive: updated.isActive,
        departmentCount: updated.departments?.length || 0,
        sampleTypeCount: updated.sampleTypes?.length || 0,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      } as LabResponseDto;
    }

    const created = await this.labService.create(tenantSlug, dto as CreateLabDto, userId);
    return {
      id: created.id,
      name: created.name,
      address: created.address,
      phone: created.phone,
      email: created.email,
      config: created.config,
      isActive: created.isActive,
      departmentCount: created.departments?.length || 0,
      sampleTypeCount: created.sampleTypes?.length || 0,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    } as LabResponseDto;
  }
}
