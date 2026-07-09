import { Injectable } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { SendSmsJobData, SendEmailJobData, SendWhatsappJobData, QueueName } from '../queue.types';
import { BaseProcessor } from './base.processor';

/**
 * Notification Processor
 * Handles SMS, Email, and WhatsApp notifications asynchronously
 */
@Injectable()
export class NotificationProcessor extends BaseProcessor {
  constructor() {
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
      let result;
      switch (jobName) {
        case 'send-sms':
          result = await this.processSms(job as Job<SendSmsJobData>);
          break;
        case 'send-email':
          result = await this.processEmail(job as Job<SendEmailJobData>);
          break;
        case 'send-whatsapp':
          result = await this.processWhatsapp(job as Job<SendWhatsappJobData>);
          break;
        default:
          throw new Error(`Unknown notification type: ${jobName}`);
      }

      result.duration = Date.now() - startTime;
      this.logCompletion(job, result);
      return result;
    } catch (error) {
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
   * In production: use SendGrid, SES, or similar
   */
  private async processEmail(job: Job<SendEmailJobData>): Promise<any> {
    const { tenantSlug, to, subject, template, referenceId } = job.data;

    this.logger.log(`[${tenantSlug}] Sending email to ${to} (template: ${template})`);

    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      type: 'email',
      to,
      subject,
      template,
      status: 'sent',
      provider: 'sendgrid',
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

  /**
   * Create worker for this processor
   */
  static createWorker(redisConfig: any): Worker {
    return new Worker(
      QueueName.NOTIFICATIONS,
      async job => {
        const processor = new NotificationProcessor();
        return processor.process(job);
      },
      {
        connection: redisConfig,
        concurrency: 5, // Higher concurrency for notifications
      },
    );
  }
}
