/**
 * OTP-related types
 */

export interface OtpRecord {
  id?: string;
  tenantId: string;
  tenantSlug: string;
  email: string;
  otpHash: string; // Argon2 hashed OTP
  otpExpiresAt: Date;
  otpAttempts: number;
  otpVerifiedAt?: Date | null;
  createdAt?: Date;
}

export interface OtpVerifyRequest {
  tenantSlug: string;
  email: string;
  otpCode: string;
}

export interface OtpVerifyResponse {
  message: string;
  status: string; // pending_approval after OTP verified
  labCode: string;
  tenantId: string;
  tenantSlug: string;
}

export interface OtpResendRequest {
  tenantSlug: string;
  email: string;
}

export interface OtpResendResponse {
  message: string;
  nextResendAfter: number; // seconds until next resend allowed
  attemptsRemaining: number;
}
