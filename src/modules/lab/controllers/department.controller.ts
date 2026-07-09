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
import { DepartmentService } from '../services/department.service';
import { CreateDepartmentDto, UpdateDepartmentDto, DepartmentResponseDto } from '../dtos';

@ApiTags('departments')
@Controller(['departments', 'api/departments'])
export class DepartmentController {
  private readonly logger = new Logger(DepartmentController.name);

  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all departments' })
  @ApiResponse({ status: 200, description: 'Departments listed successfully' })
  async findAll(@Headers('x-tenant-slug') tenantSlug: string): Promise<DepartmentResponseDto[]> {
    return this.departmentService.findAll(tenantSlug);
  }

  @Get('lab/:labId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get departments by lab ID' })
  @ApiResponse({ status: 200, description: 'Departments retrieved successfully' })
  async findByLabId(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Param('labId') labId: string,
  ): Promise<DepartmentResponseDto[]> {
    return this.departmentService.findByLabId(tenantSlug, labId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get department by ID' })
  @ApiResponse({ status: 200, description: 'Department retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async findById(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Param('id') deptId: string,
  ): Promise<DepartmentResponseDto> {
    return this.departmentService.findById(tenantSlug, deptId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new department (LAB_ADMIN or SUPER_ADMIN)' })
  @ApiResponse({ status: 201, description: 'Department created successfully' })
  async create(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Body() createDeptDto: CreateDepartmentDto,
    @Req() req: Request & { user?: { sub?: string } },
  ): Promise<DepartmentResponseDto> {
    return this.departmentService.create(tenantSlug, createDeptDto, req.user?.sub || 'system');
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update department (LAB_ADMIN or SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Department updated successfully' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async update(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Param('id') deptId: string,
    @Body() updateDeptDto: UpdateDepartmentDto,
    @Req() req: Request & { user?: { sub?: string } },
  ): Promise<DepartmentResponseDto> {
    return this.departmentService.update(tenantSlug, deptId, updateDeptDto, req.user?.sub || 'system');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete department (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Department deleted successfully' })
  async delete(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Param('id') deptId: string,
    @Req() req: Request & { user?: { sub?: string } },
  ): Promise<{ success: boolean }> {
    await this.departmentService.delete(tenantSlug, deptId, req.user?.sub || 'system');
    return { success: true };
  }
}
