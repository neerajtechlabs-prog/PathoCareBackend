import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/tenant/user.entity';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.LAB_ADMIN)
  @ApiOperation({ summary: 'List users for admin-level roles' })
  @ApiResponse({ status: 200, description: 'User list returned' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll() {
    return { message: 'Users endpoint is protected by RBAC' };
  }
}
