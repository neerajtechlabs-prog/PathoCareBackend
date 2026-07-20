import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/tenant/user.entity';
import { TestsService } from './services/tests.service';
import {
  CreateTestDto,
  UpdateTestDto,
  CreateTestParameterDto,
  UpdateTestParameterDto,
} from './dto';

@ApiTags('tests')
@Controller(['tests', 'api/tests'])
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Headers('x-tenant-slug') tenantSlug: string, @Query('q') query?: string): Promise<any> {
    return this.testsService.findAll(tenantSlug, query);
  }

  @Get('tenant')
  @UseGuards(JwtAuthGuard)
  async findTenantTests(@Headers('x-tenant-slug') tenantSlug: string, @Query('q') query?: string): Promise<any> {
    return this.testsService.findTenantTests(tenantSlug, query);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  async search(@Headers('x-tenant-slug') tenantSlug: string, @Query('q') query?: string) {
    return this.testsService.findAll(tenantSlug, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Headers('x-tenant-slug') tenantSlug: string, @Param('id') id: string) {
    return this.testsService.findById(tenantSlug, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async create(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Body() body: CreateTestDto,
    @Req() req: Request & { user?: { sub?: string } }
  ) {
    return this.testsService.create(tenantSlug, body, req.user?.sub || 'system');
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async update(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Param('id') id: string,
    @Body() body: UpdateTestDto,
    @Req() req: Request & { user?: { sub?: string } }
  ) {
    return this.testsService.update(tenantSlug, id, body, req.user?.sub || 'system');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async delete(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Param('id') id: string,
    @Req() req: Request & { user?: { sub?: string } }
  ) {
    return this.testsService.delete(tenantSlug, id, req.user?.sub || 'system');
  }

  @Get(':id/parameters')
  @UseGuards(JwtAuthGuard)
  async listParameters(@Headers('x-tenant-slug') tenantSlug: string, @Param('id') testId: string) {
    return this.testsService.listParameters(tenantSlug, testId);
  }

  @Post(':id/parameters')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async createParameter(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Param('id') testId: string,
    @Body() body: CreateTestParameterDto,
    @Req() req: Request & { user?: { sub?: string } }
  ) {
    return this.testsService.createParameter(tenantSlug, testId, body, req.user?.sub || 'system');
  }

  @Put('parameters/:parameterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async updateParameter(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Param('parameterId') parameterId: string,
    @Body() body: UpdateTestParameterDto,
    @Req() req: Request & { user?: { sub?: string } }
  ) {
    return this.testsService.updateParameter(
      tenantSlug,
      parameterId,
      body,
      req.user?.sub || 'system'
    );
  }

  @Delete('parameters/:parameterId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  async deleteParameter(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Param('parameterId') parameterId: string,
    @Req() req: Request & { user?: { sub?: string } }
  ) {
    return this.testsService.deleteParameter(tenantSlug, parameterId, req.user?.sub || 'system');
  }

  @Post('import/csv')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  async importFromCsv(
    @Headers('x-tenant-slug') tenantSlug: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('csv') csvText: string | undefined,
    @Req() req: Request & { user?: { sub?: string } }
  ) {
    const content = file?.buffer?.toString('utf8') ?? csvText;
    if (!content || typeof content !== 'string') {
      throw new BadRequestException('csv payload is required');
    }

    return this.testsService.importFromCsv(tenantSlug, content, req.user?.sub || 'system');
  }
}
