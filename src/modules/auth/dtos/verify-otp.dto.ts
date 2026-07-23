import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({
    example: 'pathcare-demo-lab',
    description: 'Tenant slug (from signup response)',
  })
  @IsString()
  tenantSlug!: string;

  @ApiProperty({
    example: 'admin@labname.local',
    description: 'Registration email address',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'OTP code received via email',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otpCode!: string;
}
