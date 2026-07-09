import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/tenant/user.entity';
import { DoctorsService } from './services/doctors.service';
import { CreateDoctorDto, UpdateDoctorDto } from './dto';

@ApiTags('doctors')
@Controller(['doctors', 'api/doctors'])
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Headers('x-tenant-slug') tenantSlug: string, @Query('q') query?: string) {
    return this.doctorsService.findAll(tenantSlug, query);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  async search(@Headers('x-tenant-slug') tenantSlug: string, @Query('q') query?: string) {
    return this.doctorsService.findAll(tenantSlug, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Headers('x-tenant-slug') tenantSlug: string, @Param('id') doctorId: string) {
    return this.doctorsService.findById(tenantSlug, doctorId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async create(@Headers('x-tenant-slug') tenantSlug: string, @Body() body: CreateDoctorDto, @Req() req: Request & { user?: { sub?: string } }) {
    return this.doctorsService.create(tenantSlug, body, req.user?.sub || 'system');
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async update(@Headers('x-tenant-slug') tenantSlug: string, @Param('id') doctorId: string, @Body() body: UpdateDoctorDto, @Req() req: Request & { user?: { sub?: string } }) {
    return this.doctorsService.update(tenantSlug, doctorId, body, req.user?.sub || 'system');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async delete(@Headers('x-tenant-slug') tenantSlug: string, @Param('id') doctorId: string, @Req() req: Request & { user?: { sub?: string } }) {
    return this.doctorsService.delete(tenantSlug, doctorId, req.user?.sub || 'system');
  }
}
