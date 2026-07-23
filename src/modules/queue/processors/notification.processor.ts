import { Injectable } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { TenantDataSourceService } from '../../../database/datasources/tenant.datasource';
import { NotificationLog, NotificationStatus } from '../../../database/entities/tenant/notification-log.entity';
import { MailService } from '../../notifications/services/mail.service';
import { SendSmsJobData, SendEmailJobData, SendWhatsappJobData, QueueName } from '../queue.types';
import { BaseProcessor } from './base.processor';

/**
 * Notification Processor
 * Handles SMS, Email, and WhatsApp notifications asynchronously
 */
@Injectable()
export class NotificationProcessor extends BaseProcessor {
  constructor(
    private readonly tenantDSService?: TenantDataSourceService,
    private readonly mailService: MailService = new MailService(),
  ) {
    super(NotificationProcessor.name);
  }

  /**
   * Process notification job (SMS, Email, or WhatsApp)
   * Job name determines the notification type
   */
  async process(job: Job): Promise<any> {
    const startTime = Date.now();
    const jobName = job.name;

    try {
      const tenantSlug = job.data?.tenantSlug;
      if (tenantSlug && this.tenantDSService) {
        await this.persistStatus(tenantSlug, job.data, NotificationStatus.PROCESSING);
      }
      let result;
      switch (jobName) {
        case 'send-sms':
          result = await this.processSms(job as Job<SendSmsJobData>);
          break;
        case 'send-email':
        case 'send-otp':
        case 'send-labcode':
          result = await this.processEmail(job as Job<SendEmailJobData>);
          break;
        case 'send-whatsapp':
          result = await this.processWhatsapp(job as Job<SendWhatsappJobData>);
          break;
        default:
          throw new Error(`Unknown notification type: ${jobName}`);
      }

      result.duration = Date.now() - startTime;
      if (tenantSlug && this.tenantDSService) {
        await this.persistStatus(tenantSlug, job.data, NotificationStatus.SENT, result);
      }
      this.logCompletion(job, result);
      return result;
    } catch (error) {
      if (job.data?.tenantSlug && this.tenantDSService) {
        await this.persistStatus(job.data.tenantSlug, job.data, NotificationStatus.FAILED, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      this.logFailure(job, error as Error);
      throw error;
    }
  }

  /**
   * Process SMS notification
   * In production: use Twilio or MSG91 API
   */
  private async processSms(job: Job<SendSmsJobData>): Promise<any> {
    const { tenantSlug, phoneNumber, recipientType, referenceId } = job.data;

    this.logger.log(`[${tenantSlug}] Sending SMS to ${phoneNumber} (${recipientType})`);

    // Simulate SMS sending
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      type: 'sms',
      phoneNumber,
      status: 'sent',
      provider: 'twilio',
      referenceId,
      sentAt: new Date().toISOString(),
    };
  }

  /**
   * Process Email notification
   */
  private async processEmail(job: Job<SendEmailJobData>): Promise<any> {
    const { tenantSlug, to, subject, template, referenceId, recipient, otpCode, labCode } = job.data as SendEmailJobData & {
      recipient?: string;
      otpCode?: string;
      labCode?: string;
    };

    const emailRecipient = recipient || to;
    const emailSubject = subject || (otpCode ? 'PathCare verification code' : 'PathCare notification');
    const emailBody = otpCode
      ? `Hello ${emailRecipient},\n\nYour OTP code is ${otpCode}.\n\nPlease enter it to continue.`
      : labCode
        ? `Hello ${emailRecipient},\n\nYour lab code is ${labCode}.`
        : `Hello ${emailRecipient},\n\nThis is your requested notification.`;

    if (!emailRecipient) {
      throw new Error('Email recipient is required');
    }

    this.logger.log(`[${tenantSlug}] Sending email to ${emailRecipient} (template: ${template})`);

    await this.mailService.sendMail(emailRecipient, emailSubject, emailBody);

    return {
      type: 'email',
      to: emailRecipient,
      subject: emailSubject,
      template,
      status: 'sent',
      provider: 'smtp',
      referenceId,
      sentAt: new Date().toISOString(),
    };
  }

  /**
   * Process WhatsApp notification
   * In production: use Twilio WhatsApp or Meta API
   */
  private async processWhatsapp(job: Job<SendWhatsappJobData>): Promise<any> {
    const { tenantSlug, phoneNumber, templateId, referenceId } = job.data;

    this.logger.log(`[${tenantSlug}] Sending WhatsApp to ${phoneNumber} (template: ${templateId})`);

    // Simulate WhatsApp sending
    await new Promise(resolve => setTimeout(resolve, 250));

    return {
      type: 'whatsapp',
      phoneNumber,
      templateId,
      status: 'sent',
      provider: 'twilio',
      referenceId,
      sentAt: new Date().toISOString(),
    };
  }

  private async persistStatus(tenantSlug: string, data: any, status: NotificationStatus, providerResponse?: any): Promise<void> {
    if (!data?.referenceId) {
      return;
    }

    try {
      const tenantDS = await this.tenantDSService?.getForTenant(tenantSlug);
      const repo = tenantDS?.getRepository(NotificationLog);
      if (!repo) {
        return;
      }

      const existing = await repo.findOne({ where: { referenceId: data.referenceId } });
      if (existing) {
        existing.status = status;
        existing.providerResponse = providerResponse ?? existing.providerResponse;
        existing.attempts = (existing.attempts || 0) + 1;
        await repo.save(existing);
      }
    } catch (error) {
      this.logger.warn(`Failed to persist notification status for ${data.referenceId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create worker for this processor
   */
  static createWorker(redisConfig: any, tenantDSService?: TenantDataSourceService, queueName: QueueName = QueueName.NOTIFICATIONS): Worker {
    return new Worker(
      queueName,
      async job => {
        const processor = new NotificationProcessor(tenantDSService);
        return processor.process(job);
      },
      {
        connection: redisConfig,
        concurrency: 5,
      },
    );
  }
}
