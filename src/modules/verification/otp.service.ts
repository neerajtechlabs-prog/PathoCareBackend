import { Injectable, Logger, BadRequestException, ConflictException, Inject } from '@nestjs/common';
import * as argon2 from 'argon2';
import { IOtpDeliveryChannel } from './channels/otp-channel.interface';
import { PublicDataSourceService } from '../../database/datasources/public.datasource';
import { Tenant } from '../../database/entities/public/tenant.entity';
import { OtpVerifyResponse, OtpResendResponse } from './otp.types';
import { LabCodeService } from '../tenant/services/lab-code.service';

/**
 * OTP Service
 *
 * Responsibilities:
 * 1. Generate secure 6-digit OTP codes
 * 2. Hash OTP for storage (Argon2)
 * 3. Send OTP via delivery channel (email, SMS, etc.)
 * 4. Verify OTP against stored hash
 * 5. Track OTP attempts and expiry
 * 6. Generate lab code after OTP verification
 *
 * Design:
 * - OTP stored in public.tenants (admin_otp_hash, otp_attempts, otp_expires_at, otp_verified_at)
 * - Channel-based delivery (IOtpDeliveryChannel interface)
 * - Async delivery via BullMQ (non-blocking)
 * - Retry logic in queue handler, not in service
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_OTP_ATTEMPTS = 5;
  private readonly OTP_RESEND_COOLDOWN_SECONDS = 60;
  private readonly MAX_RESENDS_PER_HOUR = 5;

  constructor(
    private publicDataSourceService: PublicDataSourceService,
    @Inject('IOtpDeliveryChannel') private deliveryChannel: IOtpDeliveryChannel,
    private labCodeService: LabCodeService,
  ) {}

  /**
   * Generate a random 6-digit OTP code
   */
  private generateOtpCode(): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return code;
  }

  /**
   * Hash OTP using Argon2
   */
  private async hashOtp(otpCode: string): Promise<string> {
    try {
      return await argon2.hash(otpCode, {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
    } catch (error) {
      this.logger.error('OTP hashing failed:', error);
      throw new Error('OTP hashing failed');
    }
  }

  /**
   * Verify OTP against hash
   */
  private async verifyOtpHash(plain: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch (error) {
      this.logger.error('OTP verification failed:', error);
      return false;
    }
  }

  /**
   * Send OTP to registration email
   * Updates tenant otp_hash, otp_attempts, otp_expires_at
   * Queues email delivery async
   */
  async sendOtp(
    tenantId: string,
    tenantSlug: string,
    email: string,
    tenantName?: string,
    adminName?: string,
  ): Promise<void> {
    const publicDS = this.publicDataSourceService.getDataSource();

    // Fetch current tenant to check resend cooldown
    const [tenant] = await publicDS.query<Tenant[]>(
      'SELECT id, otp_attempts, lab_code_sent_at, created_at FROM public.tenants WHERE id = $1',
      [tenantId],
    );

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    // Check resend rate limit (max 5 resends per hour)
    if (tenant.labCodeSentAt) {
      const lastSentTime = new Date(tenant.labCodeSentAt).getTime();
      const now = Date.now();
      const hourAgo = now - 3600000;

      if (lastSentTime > hourAgo) {
        // Count resends in last hour
        const [{ count }] = await publicDS.query<{ count: number }[]>(
          `SELECT COUNT(*) as count FROM public.tenants 
           WHERE id = $1 AND lab_code_sent_at > to_timestamp($2 / 1000)`,
          [tenantId, hourAgo],
        );

        if (count >= this.MAX_RESENDS_PER_HOUR) {
          throw new ConflictException(
            `Maximum OTP resends reached. Please try again in ${Math.ceil(
              (lastSentTime + 3600000 - now) / 60000,
            )} minutes.`,
          );
        }
      }
    }

    // Generate and hash OTP
    const otpCode = this.generateOtpCode();
    const otpHash = await this.hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Update tenant with new OTP
    await publicDS.query(
      `UPDATE public.tenants 
       SET otp_hash = $1, 
           otp_attempts = 0, 
           otp_expires_at = $2,
           lab_code_sent_at = NOW()
       WHERE id = $3`,
      [otpHash, expiresAt, tenantId],
    );

    // Queue OTP email delivery (async, non-blocking)
    try {
      await this.deliveryChannel.sendOtp(email, otpCode, {
        tenantName,
        adminName,
        tenantSlug,
      });
    } catch (error) {
      this.logger.error(`OTP delivery failed for ${email}:`, error);
      throw new BadRequestException('Failed to send OTP. Please try again.');
    }

    this.logger.log(`OTP sent to ${email} for tenant ${tenantSlug}`);
  }

  /**
   * Verify OTP code and mark registration as pending_approval
   * Generates lab code if verification succeeds
   */
  async verifyOtp(tenantSlug: string, email: string, otpCode: string): Promise<OtpVerifyResponse> {
    const publicDS = this.publicDataSourceService.getDataSource();

    // Fetch tenant
    const [tenant] = await publicDS.query<Tenant[]>(
      `SELECT id, status, otp_hash, otp_attempts, otp_expires_at, email 
       FROM public.tenants WHERE slug = $1`,
      [tenantSlug],
    );

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    if (tenant.email !== email) {
      throw new BadRequestException('Email does not match registration');
    }

    // Check if OTP is expired
    if (!tenant.otpExpiresAt || new Date() > new Date(tenant.otpExpiresAt)) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // Check attempt limit
    if ((tenant.otpAttempts ?? 0) >= this.MAX_OTP_ATTEMPTS) {
      throw new ConflictException(
        'Maximum OTP verification attempts exceeded. Please request a new OTP.',
      );
    }

    // Verify OTP
    const isValid = await this.verifyOtpHash(otpCode, tenant.otpHash || '');

    if (!isValid) {
      // Increment attempts
      const newAttempts = (tenant.otpAttempts || 0) + 1;
      await publicDS.query(
        'UPDATE public.tenants SET otp_attempts = $1 WHERE id = $2',
        [newAttempts, tenant.id],
      );

      const remaining = this.MAX_OTP_ATTEMPTS - newAttempts;
      throw new BadRequestException(
        `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      );
    }

    // OTP verified: generate lab code and transition to pending_approval
    const labCode = await this.labCodeService.generateUniqueLabCode();

    const [updated] = await publicDS.query<Tenant[]>(
      `UPDATE public.tenants 
       SET status = $1, 
           lab_code = $2, 
           otp_verified_at = NOW(),
           otp_attempts = 0
       WHERE id = $3
       RETURNING id, slug, status, lab_code`,
      ['pending_approval', labCode, tenant.id],
    );

    if (!updated) {
      throw new Error('Failed to update tenant after OTP verification');
    }

    // Queue labCode email delivery (async, non-blocking)
    try {
      const [tenantData] = await publicDS.query<Tenant[]>(
        `SELECT name, admin_name FROM public.tenants WHERE id = $1`,
        [tenant.id],
      );
      
      await this.deliveryChannel.sendLabCode(email, labCode, {
        tenantName: tenantData?.name ?? undefined,
        adminName: tenantData?.adminName ?? undefined,
        tenantSlug,
      });
    } catch (error) {
      this.logger.error(`Failed to queue labCode email for ${email}:`, error);
      // Don't throw - labCode email is non-critical; OTP verification already succeeded
    }

    this.logger.log(`OTP verified for tenant ${tenantSlug}, transitioned to pending_approval`);

    return {
      message: 'OTP verified successfully. Awaiting admin approval.',
      status: updated.status,
      labCode: labCode,
      tenantId: updated.id,
      tenantSlug: updated.slug,
    };
  }

  /**
   * Request OTP resend with cooldown enforcement
   */
  async resendOtp(tenantSlug: string, email: string): Promise<OtpResendResponse> {
    const publicDS = this.publicDataSourceService.getDataSource();

    const [tenant] = await publicDS.query<Tenant[]>(
      `SELECT id, lab_code_sent_at FROM public.tenants WHERE slug = $1`,
      [tenantSlug],
    );

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    // Check cooldown
    if (tenant.labCodeSentAt) {
      const lastSentTime = new Date(tenant.labCodeSentAt).getTime();
      const now = Date.now();
      const timeSinceLastSend = (now - lastSentTime) / 1000;

      if (timeSinceLastSend < this.OTP_RESEND_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(this.OTP_RESEND_COOLDOWN_SECONDS - timeSinceLastSend);
        throw new ConflictException(
          `Please wait ${waitSeconds} second${waitSeconds !== 1 ? 's' : ''} before requesting another OTP.`,
        );
      }
    }

    // Send new OTP
    await this.sendOtp(tenant.id, tenantSlug, email);

    return {
      message: 'OTP sent successfully',
      nextResendAfter: this.OTP_RESEND_COOLDOWN_SECONDS,
      attemptsRemaining: this.MAX_OTP_ATTEMPTS,
    };
  }
}
