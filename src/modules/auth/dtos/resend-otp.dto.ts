import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class ResendOtpDto {
  @ApiProperty({
    example: 'pathcare-demo-lab',
    description: 'Tenant slug',
  })
  @IsString()
  tenantSlug!: string;

  @ApiProperty({
    example: 'admin@labname.local',
    description: 'Registration email address',
  })
  @IsEmail()
  email!: string;
}
