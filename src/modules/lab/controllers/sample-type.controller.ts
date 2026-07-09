import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
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
import { SampleTypeService } from '../services/sample-type.service';
import { CreateSampleTypeDto, UpdateSampleTypeDto, SampleTypeResponseDto } from '../dtos';

@ApiTags('sample-types')
@Controller(['sample-types', 'api/sample-types'])
export class SampleTypeController {
  private readonly logger = new Logger(SampleTypeController.name);

  constructor(private readonly sampleTypeService: SampleTypeService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all sample types' })
  @ApiResponse({ status: 200, description: 'Sample types listed successfully' })
  async findAll(@Headers('x-tenant-slug') tenantSlug: string): Promise<SampleTypeResponseDto[]> {
    return this.sampleTypeService.findAll(tenantSlug);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Search sample types by name or code' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Query('q') query: string,
    @Query('labId') labId?: string,
  ): Promise<SampleTypeResponseDto[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }
    return this.sampleTypeService.search(tenantSlug, query, labId);
  }

  @Get('lab/:labId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get sample types by lab ID' })
  @ApiResponse({ status: 200, description: 'Sample types retrieved successfully' })
  async findByLabId(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Param('labId') labId: string,
  ): Promise<SampleTypeResponseDto[]> {
    return this.sampleTypeService.findByLabId(tenantSlug, labId);
  }

  @Get('code/:code')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get sample type by code' })
  @ApiResponse({ status: 200, description: 'Sample type retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Sample type not found' })
  async findByCode(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Param('code') code: string,
  ): Promise<SampleTypeResponseDto> {
    return this.sampleTypeService.findByCode(tenantSlug, code);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get sample type by ID' })
  @ApiResponse({ status: 200, description: 'Sample type retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Sample type not found' })
  async findById(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Param('id') sampleTypeId: string,
  ): Promise<SampleTypeResponseDto> {
    return this.sampleTypeService.findById(tenantSlug, sampleTypeId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new sample type (LAB_ADMIN or SUPER_ADMIN)' })
  @ApiResponse({ status: 201, description: 'Sample type created successfully' })
  async create(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Body() createSampleTypeDto: CreateSampleTypeDto,
    @Req() req: Request & { user?: { sub?: string } },
  ): Promise<SampleTypeResponseDto> {
    return this.sampleTypeService.create(tenantSlug, createSampleTypeDto, req.user?.sub || 'system');
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update sample type (LAB_ADMIN or SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Sample type updated successfully' })
  @ApiResponse({ status: 404, description: 'Sample type not found' })
  async update(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Param('id') sampleTypeId: string,
    @Body() updateSampleTypeDto: UpdateSampleTypeDto,
    @Req() req: Request & { user?: { sub?: string } },
  ): Promise<SampleTypeResponseDto> {
    return this.sampleTypeService.update(tenantSlug, sampleTypeId, updateSampleTypeDto, req.user?.sub || 'system');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete sample type (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Sample type deleted successfully' })
  async delete(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Param('id') sampleTypeId: string,
    @Req() req: Request & { user?: { sub?: string } },
  ): Promise<{ success: boolean }> {
    await this.sampleTypeService.delete(tenantSlug, sampleTypeId, req.user?.sub || 'system');
    return { success: true };
  }
}
