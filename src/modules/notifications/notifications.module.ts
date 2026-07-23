import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { QueueModule } from '../queue/queue.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';
import { MailService } from './services/mail.service';

@Module({
  imports: [QueueModule, TenantModule, AuthModule],
  providers: [NotificationsService, MailService],
  controllers: [NotificationsController],
  exports: [NotificationsService, MailService],
})
export class NotificationsModule {}
