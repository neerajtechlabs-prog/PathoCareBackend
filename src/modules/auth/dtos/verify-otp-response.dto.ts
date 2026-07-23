import { ApiProperty } from '@nestjs/swagger';

/**
 * Response after successful OTP verification
 * Indicates transition to pending_approval state
 */
export class VerifyOtpResponseDto {
  @ApiProperty({
    example: 'OTP verified successfully. Awaiting admin approval.',
    description: 'User-facing message',
  })
  message!: string;

  @ApiProperty({
    example: 'pending_approval',
    description: 'Tenant status after OTP verification',
  })
  status!: string;

  @ApiProperty({
    example: 'PCLABCD123',
    description: 'Generated lab code (unique identifier for login)',
  })
  labCode!: string;

  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    description: 'Tenant ID',
  })
  tenantId!: string;

  @ApiProperty({
    example: 'pathcare-demo-lab',
    description: 'Tenant slug',
  })
  tenantSlug!: string;
}
