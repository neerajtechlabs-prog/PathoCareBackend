import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { UserRole } from '../../../database/entities/tenant/user.entity';

export class SignupDto {
  /**
   * Admin/Registration Contact Details
   */
  @ApiProperty({ example: 'Dr. John Doe', description: 'Full name of the lab admin/primary contact' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'admin@labname.local', description: 'Email address for OTP verification and login (lab admin email)' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123!', description: 'Password for the lab admin account (hashed and stored until first approved login)' })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password!: string;

  /**
   * Lab/Tenant Details
   */
  @ApiProperty({ example: 'PathCare Demo Lab', description: 'Display name of the lab/tenant', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tenantName?: string;

  @ApiProperty({ example: 'PathCare Labs', description: 'Lab display name (alternative to tenantName)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  labName?: string;

  @ApiProperty({ example: 'PCL001', description: 'Lab code (requested or pre-assigned)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  labCode?: string;

  @ApiProperty({ example: 'NABL-1234', description: 'Lab registration number', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string;

  @ApiProperty({ example: '27AABCU9603R1ZV', description: 'GST registration number', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gstNumber?: string;

  @ApiProperty({ example: '+919876543210', description: 'Lab contact mobile number', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobileNumber?: string;

  @ApiProperty({ example: 'India', description: 'Lab country', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiProperty({ example: 'Uttar Pradesh', description: 'Lab state', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiProperty({ example: 'Meerut', description: 'Lab city', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiProperty({ example: '250342', description: 'Lab PIN code', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  pinCode?: string;

  @ApiProperty({ example: 'Rajpur Momin', description: 'Lab complete address', required: false })
  @IsOptional()
  @IsString()
  completeAddress?: string;

  /**
   * Optional metadata
   */
  @ApiProperty({ example: 'Starter', description: 'Requested subscription plan', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  plan?: string;

  @ApiProperty({ example: 'Administrator', description: 'Admin designation/title', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @ApiProperty({ example: 'admin@pathcare.com', description: 'Alternative username/identifier (legacy)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  username?: string;

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
