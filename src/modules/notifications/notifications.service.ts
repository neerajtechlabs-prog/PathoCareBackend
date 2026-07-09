import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { NotificationChannel, NotificationLog, NotificationStatus } from '../../database/entities/tenant/notification-log.entity';
import { QueueService } from '../queue/services/queue.service';
import { SendNotificationDto } from './dto/send-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly tenantDataSourceService: TenantDataSourceService,
    private readonly queueService: QueueService,
  ) {}

  async sendNotification(tenantSlug: string, dto: SendNotificationDto & { userId?: string }): Promise<NotificationLog> {
    const tenantDS = await this.tenantDataSourceService.getForTenant(tenantSlug);
    const repo = tenantDS.getRepository(NotificationLog);

    const log = await this.runWithTableEnsure(tenantDS, async () => {
      const entity = repo.create({
        channel: dto.channel,
        notificationType: `${dto.channel}.queued`,
        recipientEmail: dto.channel === 'email' ? dto.recipient : null,
        recipientPhone: dto.channel === 'sms' || dto.channel === 'whatsapp' ? dto.recipient : null,
        subject: dto.subject,
        message: dto.message,
        template: dto.template,
        referenceId: dto.referenceId,
        status: NotificationStatus.PENDING,
      });

      return repo.save(entity);
    });

    try {
      switch (dto.channel) {
        case NotificationChannel.EMAIL:
          await this.queueService.enqueueEmail({
            tenantSlug,
            to: dto.recipient,
            subject: dto.subject || 'PathCare notification',
            template: dto.template || 'default',
            context: { message: dto.message, referenceId: dto.referenceId },
            referenceId: dto.referenceId,
          });
          break;
        case NotificationChannel.SMS:
          await this.queueService.enqueueSms({
            tenantSlug,
            phoneNumber: dto.recipient,
            message: dto.message || 'PathCare notification',
            recipientType: 'patient',
            referenceId: dto.referenceId,
          });
          break;
        case NotificationChannel.WHATSAPP:
          await this.queueService.enqueueWhatsapp({
            tenantSlug,
            phoneNumber: dto.recipient,
            templateId: dto.template || 'default_whatsapp',
            parameters: { message: dto.message || 'PathCare notification', referenceId: dto.referenceId || '' },
            referenceId: dto.referenceId,
          });
          break;
        default:
          throw new Error(`Unsupported notification channel: ${dto.channel}`);
      }

      return log;
    } catch (error) {
      await this.updateStatus(tenantDS, log.id, NotificationStatus.FAILED, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listLogs(tenantSlug: string): Promise<NotificationLog[]> {
    const tenantDS = await this.tenantDataSourceService.getForTenant(tenantSlug);
    const repo = tenantDS.getRepository(NotificationLog);

    return this.runWithTableEnsure(tenantDS, async () =>
      repo.find({ order: { createdAt: 'DESC' } }),
    );
  }

  async getLog(tenantSlug: string, id: string): Promise<NotificationLog> {
    const tenantDS = await this.tenantDataSourceService.getForTenant(tenantSlug);
    const repo = tenantDS.getRepository(NotificationLog);

    const log = await this.runWithTableEnsure(tenantDS, async () => repo.findOne({ where: { id } }));
    if (!log) {
      throw new NotFoundException(`Notification log ${id} not found`);
    }
    return log;
  }

  async updateStatus(
    tenantDS: any,
    id: string,
    status: NotificationStatus,
    providerResponse?: Record<string, any>,
  ): Promise<NotificationLog> {
    const repo = tenantDS.getRepository(NotificationLog);
    const existing = await repo.findOne({ where: { id } });

    if (!existing) {
      return repo.create({ id, status, providerResponse });
    }

    existing.status = status;
    existing.providerResponse = providerResponse ?? existing.providerResponse;
    existing.attempts = (existing.attempts || 0) + 1;
    return repo.save(existing);
  }

  private async runWithTableEnsure<T>(tenantDS: any, action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (!this.isMissingNotificationTableError(error)) {
        throw error;
      }

      await this.ensureNotificationTable(tenantDS);
      return action();
    }
  }

  private async ensureNotificationTable(tenantDS: any): Promise<void> {
    await tenantDS.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await tenantDS.query(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        channel VARCHAR(20) DEFAULT 'email',
        recipient_phone VARCHAR(20),
        recipient_email VARCHAR(255),
        notification_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        subject VARCHAR(255),
        message TEXT,
        template VARCHAR(255),
        reference_id VARCHAR(255),
        provider_response JSONB,
        attempts INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
      CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at DESC);
    `);
  }

  private isMissingNotificationTableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /relation\s+"?notification_logs"?\s+does not exist/i.test(message);
  }
}
