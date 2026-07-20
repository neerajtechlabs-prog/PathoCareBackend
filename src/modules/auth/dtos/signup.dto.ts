import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { UserRole } from '../../../database/entities/tenant/user.entity';

export class SignupDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the new user' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'john.doe@pathcare.local', description: 'Email address to use for login' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123!', description: 'Temporary password for the new account' })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password!: string;

  @ApiProperty({ example: 'PathCare Demo Lab', description: 'Display name of the tenant', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tenantName?: string;

  @ApiProperty({ example: 'PathCare Labs', description: 'Lab / tenant display name sent from frontend', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  labName?: string;

  @ApiProperty({ example: 'PCL001', description: 'Lab code', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  labCode?: string;

  @ApiProperty({ example: 'NABL-1234', description: 'Registration number', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string;

  @ApiProperty({ example: '27AABCU9603R1ZV', description: 'GST number', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gstNumber?: string;

  @ApiProperty({ example: '+919876543210', description: 'Mobile number', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobileNumber?: string;

  @ApiProperty({ example: 'Administrator', description: 'Designation of the user', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @ApiProperty({ example: 'admin@pathcare.com', description: 'Username/login identifier sent by frontend', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  username?: string;

  @ApiProperty({ example: 'India', description: 'Country', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiProperty({ example: 'Uttar Pradesh', description: 'State', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiProperty({ example: 'Meerut', description: 'City', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiProperty({ example: '250342', description: 'PIN code', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  pinCode?: string;

  @ApiProperty({ example: 'Rajpur Momin', description: 'Complete address', required: false })
  @IsOptional()
  @IsString()
  completeAddress?: string;

  @ApiProperty({ example: 'Starter', description: 'Subscription plan', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  plan?: string;

  @ApiProperty({ example: true, description: 'Terms accepted', required: false })
  @IsOptional()
  @IsBoolean()
  terms?: boolean;

  @ApiProperty({ example: true, description: 'Privacy accepted', required: false })
  @IsOptional()
  @IsBoolean()
  privacy?: boolean;

  @ApiProperty({ example: 'demo-lab', description: 'Tenant slug to associate with the user', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tenantSlug?: string;

  @ApiProperty({ example: UserRole.RECEPTIONIST, enum: UserRole, description: 'Initial role for the user', required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
