import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IOtpDeliveryChannel } from './otp-channel.interface';

/**
 * Email-based OTP delivery channel
 * Queues email delivery via BullMQ (decoupled from request lifecycle)
 */
@Injectable()
export class EmailOtpChannel implements IOtpDeliveryChannel {
  readonly channelName = 'email';
  private readonly logger = new Logger(EmailOtpChannel.name);

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  /**
   * Queue OTP email for delivery
   * This is async but non-blocking; actual email sent by worker
   */
  async sendOtp(
    recipient: string,
    otpCode: string,
    context?: { tenantName?: string; adminName?: string; tenantSlug?: string },
  ): Promise<void> {
    if (!recipient || !recipient.includes('@')) {
      throw new BadRequestException('Invalid email address');
    }

    if (!otpCode || otpCode.length < 4) {
      throw new BadRequestException('Invalid OTP code');
    }

    // Queue email job for async processing
    try {
      await this.emailQueue.add(
        'send-otp',
        {
          recipient,
          otpCode,
          tenantName: context?.tenantName,
          adminName: context?.adminName,
          tenantSlug: context?.tenantSlug,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      this.logger.log(`OTP email queued for ${recipient}`);
    } catch (error) {
      this.logger.error(`Failed to queue OTP email for ${recipient}:`, error);
      throw new BadRequestException('Failed to queue OTP delivery');
    }
  }

  /**
   * Queue labCode email for delivery (sent after OTP verification)
   */
  async sendLabCode(
    recipient: string,
    labCode: string,
    context?: { tenantName?: string; adminName?: string; tenantSlug?: string },
  ): Promise<void> {
    if (!recipient || !recipient.includes('@')) {
      throw new BadRequestException('Invalid email address');
    }

    if (!labCode || labCode.length < 3) {
      throw new BadRequestException('Invalid lab code');
    }

    // Queue email job for async processing
    try {
      await this.emailQueue.add(
        'send-labcode',
        {
          recipient,
          labCode,
          tenantName: context?.tenantName,
          adminName: context?.adminName,
          tenantSlug: context?.tenantSlug,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      this.logger.log(`LabCode email queued for ${recipient}`);
    } catch (error) {
      this.logger.error(`Failed to queue LabCode email for ${recipient}:`, error);
      throw new BadRequestException('Failed to queue labCode delivery');
    }
  }
}
