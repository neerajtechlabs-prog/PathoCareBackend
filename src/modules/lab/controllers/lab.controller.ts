import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  Logger,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/tenant/user.entity';
import { LabService } from '../services/lab.service';
import { CreateLabDto, UpdateLabDto, LabResponseDto } from '../dtos';

@ApiTags('lab-profile')
@Controller(['labs', 'api/labs'])
export class LabController {
  private readonly logger = new Logger(LabController.name);

  constructor(private readonly labService: LabService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all labs' })
  @ApiResponse({ status: 200, description: 'Labs listed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Req() req: Request & { user?: { sub?: string } },
  ): Promise<LabResponseDto[]> {
    const labs = await this.labService.findAll(tenantSlug);
    return labs.map(lab => ({
      ...lab,
      departmentCount: lab.departments?.length || 0,
      sampleTypeCount: lab.sampleTypes?.length || 0,
    }));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get lab by ID' })
  @ApiResponse({ status: 200, description: 'Lab retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lab not found' })
  async findById(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Param('id') labId: string,
  ): Promise<LabResponseDto> {
    const lab = await this.labService.findById(tenantSlug, labId);
    return {
      ...lab,
      departmentCount: lab.departments?.length || 0,
      sampleTypeCount: lab.sampleTypes?.length || 0,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new lab (LAB_ADMIN or SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Lab created successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async create(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Body() createLabDto: CreateLabDto,
    @Req() req: Request & { user?: { sub?: string } },
  ): Promise<LabResponseDto> {
    const lab = await this.labService.create(tenantSlug, createLabDto, req.user?.sub || 'system');
    return {
      ...lab,
      departmentCount: lab.departments?.length || 0,
      sampleTypeCount: lab.sampleTypes?.length || 0,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update lab (LAB_ADMIN or SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Lab updated successfully' })
  @ApiResponse({ status: 404, description: 'Lab not found' })
  async update(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Param('id') labId: string,
    @Body() updateLabDto: UpdateLabDto,
    @Req() req: Request & { user?: { sub?: string } },
  ): Promise<LabResponseDto> {
    const lab = await this.labService.update(tenantSlug, labId, updateLabDto, req.user?.sub || 'system');
    return {
      ...lab,
      departmentCount: lab.departments?.length || 0,
      sampleTypeCount: lab.sampleTypes?.length || 0,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete lab (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Lab deleted successfully' })
  @ApiResponse({ status: 404, description: 'Lab not found' })
  async delete(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Param('id') labId: string,
    @Req() req: Request & { user?: { sub?: string } },
  ): Promise<{ success: boolean }> {
    await this.labService.delete(tenantSlug, labId, req.user?.sub || 'system');
    return { success: true };
  }
}
