import { ApiProperty } from '@nestjs/swagger';

/**
 * Response returned after successful unverified signup.
 * User must verify OTP before progressing to pending_approval state.
 */
export class SignupResponseDto {
  @ApiProperty({
    example: 'Registration submitted successfully. OTP sent to admin email.',
    description: 'User-facing message',
  })
  message!: string;

  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    description: 'Tenant ID (registration record ID)',
  })
  tenantId!: string;

  @ApiProperty({
    example: 'pathcare-demo-lab',
    description: 'Tenant slug (unique identifier for the lab)',
  })
  tenantSlug!: string;

  @ApiProperty({
    example: 'unverified',
    description: 'Current tenant status (always "unverified" after signup)',
  })
  status!: string;

  @ApiProperty({
    example: 'admin@labname.local',
    description: 'Email address OTP was sent to',
  })
  otpSentTo!: string;

  @ApiProperty({
    example: 'Check your email for OTP. Valid for 10 minutes.',
    description: 'OTP delivery and validity info',
  })
  otpInfo!: string;
}
