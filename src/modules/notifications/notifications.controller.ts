import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../database/entities/tenant/user.entity';
import { SendNotificationDto } from './dto/send-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller(['notifications', 'api/notifications'])
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LAB_TECHNICIAN, UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN, UserRole.RECEPTIONIST)
  @ApiBearerAuth()
  async sendNotification(
    @Headers('x-tenant-slug') tenantSlug: string,
    @Body() body: SendNotificationDto,
    @Req() req: any,
  ) {
    return this.notificationsService.sendNotification(tenantSlug, { ...body, userId: req.user?.sub });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async listLogs(@Headers('x-tenant-slug') tenantSlug: string) {
    return this.notificationsService.listLogs(tenantSlug);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getLog(@Headers('x-tenant-slug') tenantSlug: string, @Param('id') id: string) {
    return this.notificationsService.getLog(tenantSlug, id);
  }
}
