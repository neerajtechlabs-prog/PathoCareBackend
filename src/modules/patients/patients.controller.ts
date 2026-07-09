import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/tenant/user.entity';
import { PatientsService } from './services/patients.service';
import { CreatePatientDto, UpdatePatientDto } from './dto';

@ApiTags('patients')
@Controller(['patients', 'api/patients'])
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Headers('x-tenant-slug') tenantSlug: string, @Query('q') query?: string) {
    return this.patientsService.findAll(tenantSlug, query);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  async search(@Headers('x-tenant-slug') tenantSlug: string, @Query('q') query?: string) {
    return this.patientsService.findAll(tenantSlug, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Headers('x-tenant-slug') tenantSlug: string, @Param('id') patientId: string) {
    return this.patientsService.findById(tenantSlug, patientId);
  }

  @Get(':id/history')
  @UseGuards(JwtAuthGuard)
  async getHistory(@Headers('x-tenant-slug') tenantSlug: string, @Param('id') patientId: string) {
    return this.patientsService.getHistory(tenantSlug, patientId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RECEPTIONIST, UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async create(@Headers('x-tenant-slug') tenantSlug: string, @Body() body: CreatePatientDto, @Req() req: Request & { user?: { sub?: string } }) {
    const payload: Partial<any> = { ...body, dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined };
    return this.patientsService.create(tenantSlug, payload, req.user?.sub || 'system');
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RECEPTIONIST, UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async update(@Headers('x-tenant-slug') tenantSlug: string, @Param('id') patientId: string, @Body() body: UpdatePatientDto, @Req() req: Request & { user?: { sub?: string } }) {
    const payload: Partial<any> = { ...body, dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined };
    return this.patientsService.update(tenantSlug, patientId, payload, req.user?.sub || 'system');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async delete(@Headers('x-tenant-slug') tenantSlug: string, @Param('id') patientId: string, @Req() req: Request & { user?: { sub?: string } }) {
    return this.patientsService.delete(tenantSlug, patientId, req.user?.sub || 'system');
  }
}
