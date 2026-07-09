import { IsString, IsOptional, IsBoolean, IsUUID, IsObject } from 'class-validator';

export class CreateSampleTypeDto {
  @IsUUID()
  labId!: string;

  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  container?: string;

  @IsOptional()
  @IsString()
  preservative?: string;

  @IsOptional()
  @IsString()
  storageTemperature?: string;

  @IsOptional()
  @IsObject()
  instructions?: Record<string, any>;
}

export class UpdateSampleTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  container?: string;

  @IsOptional()
  @IsString()
  preservative?: string;

  @IsOptional()
  @IsString()
  storageTemperature?: string;

  @IsOptional()
  @IsObject()
  instructions?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SampleTypeResponseDto {
  id!: string;
  labId!: string;
  name!: string;
  code!: string;
  container?: string;
  preservative?: string;
  storageTemperature?: string;
  instructions?: Record<string, any>;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
