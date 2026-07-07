import { Controller, Get, UseGuards, Req, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../../database/entities/tenant/user.entity';
import { AuditService } from '../audit/audit.service';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { UsersRepository } from './users.repository';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly auditService: AuditService,
    private readonly tenantDataSourceService: TenantDataSourceService,
    private readonly usersRepository: UsersRepository,
  ) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.LAB_ADMIN)
  @ApiOperation({ summary: 'List users for admin-level roles' })
  @ApiResponse({ status: 200, description: 'User list returned' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(@Req() req: any) {
    await this.auditService.logEvent({
      tenantSlug: req.headers['x-tenant-slug'] ? String(req.headers['x-tenant-slug']) : 'unknown',
      action: 'users.list.accessed',
      entityType: 'users',
      entityId: 'users-list',
      userId: req.user?.sub,
      userEmail: req.user?.email,
      role: req.user?.role,
      newValues: { source: 'users_controller' },
    });

    return { message: 'Users endpoint is protected by RBAC' };
  }

  @Patch(':id/role')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LAB_ADMIN)
  async changeRole(@Param('id') id: string, @Body() body: { role: UserRole }, @Req() req: any) {
    const tenantSlug = req.headers['x-tenant-slug'] ? String(req.headers['x-tenant-slug']) : 'unknown';
    const tenantDS = await this.tenantDataSourceService.getForTenant(tenantSlug);
    const user = await this.usersRepository.findById(tenantDS, id);

    if (!user) {
      await this.auditService.logEvent({
        tenantSlug,
        action: 'users.role.change.failed',
        entityType: 'users',
        entityId: id,
        userId: req.user?.sub,
        userEmail: req.user?.email,
        role: req.user?.role,
        newValues: { reason: 'user_not_found', requestedRole: body.role },
      });
      return { message: 'User not found' };
    }

    const previousRole = user.role;
    user.role = body.role;
    await tenantDS.getRepository(User).save(user);

    await this.auditService.logEvent({
      tenantSlug,
      action: 'users.role.changed',
      entityType: 'users',
      entityId: user.id,
      userId: req.user?.sub,
      userEmail: req.user?.email,
      role: req.user?.role,
      newValues: { previousRole, newRole: body.role },
    });

    return { message: 'Role updated' };
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LAB_ADMIN)
  async updateUser(@Param('id') id: string, @Body() body: { name?: string; isActive?: boolean }, @Req() req: any) {
    const tenantSlug = req.headers['x-tenant-slug'] ? String(req.headers['x-tenant-slug']) : 'unknown';
    const tenantDS = await this.tenantDataSourceService.getForTenant(tenantSlug);
    const user = await this.usersRepository.findById(tenantDS, id);

    if (!user) {
      await this.auditService.logEvent({
        tenantSlug,
        action: 'users.update.failed',
        entityType: 'users',
        entityId: id,
        userId: req.user?.sub,
        userEmail: req.user?.email,
        role: req.user?.role,
        newValues: { reason: 'user_not_found' },
      });
      return { message: 'User not found' };
    }

    if (body.name) {
      user.name = body.name;
    }
    if (typeof body.isActive === 'boolean') {
      user.isActive = body.isActive;
    }
    await tenantDS.getRepository(User).save(user);

    await this.auditService.logEvent({
      tenantSlug,
      action: 'users.updated',
      entityType: 'users',
      entityId: user.id,
      userId: req.user?.sub,
      userEmail: req.user?.email,
      role: req.user?.role,
      newValues: { name: body.name, isActive: body.isActive },
    });

    return { message: 'User updated' };
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LAB_ADMIN)
  async deleteUser(@Param('id') id: string, @Req() req: any) {
    const tenantSlug = req.headers['x-tenant-slug'] ? String(req.headers['x-tenant-slug']) : 'unknown';
    const tenantDS = await this.tenantDataSourceService.getForTenant(tenantSlug);
    const user = await this.usersRepository.findById(tenantDS, id);

    if (!user) {
      await this.auditService.logEvent({
        tenantSlug,
        action: 'users.delete.failed',
        entityType: 'users',
        entityId: id,
        userId: req.user?.sub,
        userEmail: req.user?.email,
        role: req.user?.role,
        newValues: { reason: 'user_not_found' },
      });
      return { message: 'User not found' };
    }

    await tenantDS.getRepository(User).remove(user);

    await this.auditService.logEvent({
      tenantSlug,
      action: 'users.deleted',
      entityType: 'users',
      entityId: user.id,
      userId: req.user?.sub,
      userEmail: req.user?.email,
      role: req.user?.role,
      newValues: { deletedUserEmail: user.email },
    });

    return { message: 'User deleted' };
  }
}
