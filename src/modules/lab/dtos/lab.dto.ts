import { IsString, IsOptional, IsEmail, IsObject, IsBoolean } from 'class-validator';

export class CreateLabDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class UpdateLabDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class LabResponseDto {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  config?: Record<string, any>;
  isActive: boolean;
  departmentCount?: number;
  sampleTypeCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
