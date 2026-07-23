/**
 * Interface for OTP delivery channels
 * Implementations: EmailOtpChannel, SmsOtpChannel (future)
 */
export interface IOtpDeliveryChannel {
  /**
   * Send OTP code to recipient
   * @param recipient Email or phone number
   * @param otpCode The OTP code to send
   * @param context Additional context (e.g., tenant name, admin name)
   */
  sendOtp(
    recipient: string,
    otpCode: string,
    context?: { tenantName?: string; adminName?: string; tenantSlug?: string },
  ): Promise<void>;

  /**
   * Send lab code to recipient (after successful OTP verification)
   * @param recipient Email or phone number
   * @param labCode The lab code to send
   * @param context Additional context (e.g., tenant name, admin name)
   */
  sendLabCode(
    recipient: string,
    labCode: string,
    context?: { tenantName?: string; adminName?: string; tenantSlug?: string },
  ): Promise<void>;

  /**
   * Channel name for logging/debugging
   */
  readonly channelName: string;
}
