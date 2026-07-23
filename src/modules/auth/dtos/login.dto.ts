import { IsEmail, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin@demo.pathcare.local',
    description: 'User email address',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'User password (min 8 chars)',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password!: string;

  @ApiProperty({
    example: 'PCL001',
    description: 'Optional lab code used to resolve the tenant before login',
    required: false,
  })
  @IsOptional()
  @IsString()
  labCode?: string;
}
