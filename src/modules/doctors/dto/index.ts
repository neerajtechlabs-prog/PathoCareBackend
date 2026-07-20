import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEmail, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDoctorDto {
  @IsOptional()
  @IsString()
  doctorCode?: string;

  @IsOptional()
  @IsString()
  center?: string;

  @IsOptional()
  @IsString()
  initial?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  printName?: string;

  @IsOptional()
  @IsBoolean()
  isPrint?: boolean;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  organisation?: string;

  @IsOptional()
  @IsBoolean()
  isOrg?: boolean;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  docLocation?: string;

  @IsOptional()
  @IsString()
  address1?: string;

  @IsOptional()
  @IsString()
  address2?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone1?: string;

  @IsOptional()
  @IsString()
  phone2?: string;

  @IsOptional()
  @IsString()
  mobile1?: string;

  @IsOptional()
  @IsString()
  mobile2?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  bookingSMS?: string;

  @IsOptional()
  @IsBoolean()
  isBooking?: boolean;

  @IsOptional()
  @IsString()
  resultSMS?: string;

  @IsOptional()
  @IsBoolean()
  isResult?: boolean;

  @IsOptional()
  @IsString()
  dayReminder?: string;

  @IsOptional()
  @IsBoolean()
  isReminder?: boolean;

  @IsOptional()
  @IsBoolean()
  isBdaySMS?: boolean;

  @IsOptional()
  @IsBoolean()
  isAnniversarySMS?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  anniversary?: Date;

  @IsOptional()
  @IsNumber()
  commission?: number;

  @IsOptional()
  @IsString()
  pro?: string;

  @IsOptional()
  @IsString()
  doctorType?: string;

  @IsOptional()
  @IsBoolean()
  webRpt?: boolean;

  @IsOptional()
  @IsBoolean()
  internetRpt?: boolean;

  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @IsOptional()
  @IsBoolean()
  whatsapp?: boolean;

  @IsOptional()
  @IsString()
  licenseNumber?: string;
}

export class UpdateDoctorDto {
  @IsOptional()
  @IsString()
  doctorCode?: string;

  @IsOptional()
  @IsString()
  center?: string;

  @IsOptional()
  @IsString()
  initial?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  printName?: string;

  @IsOptional()
  @IsBoolean()
  isPrint?: boolean;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  organisation?: string;

  @IsOptional()
  @IsBoolean()
  isOrg?: boolean;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  docLocation?: string;

  @IsOptional()
  @IsString()
  address1?: string;

  @IsOptional()
  @IsString()
  address2?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone1?: string;

  @IsOptional()
  @IsString()
  phone2?: string;

  @IsOptional()
  @IsString()
  mobile1?: string;

  @IsOptional()
  @IsString()
  mobile2?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  bookingSMS?: string;

  @IsOptional()
  @IsBoolean()
  isBooking?: boolean;

  @IsOptional()
  @IsString()
  resultSMS?: string;

  @IsOptional()
  @IsBoolean()
  isResult?: boolean;

  @IsOptional()
  @IsString()
  dayReminder?: string;

  @IsOptional()
  @IsBoolean()
  isReminder?: boolean;

  @IsOptional()
  @IsBoolean()
  isBdaySMS?: boolean;

  @IsOptional()
  @IsBoolean()
  isAnniversarySMS?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  anniversary?: Date;

  @IsOptional()
  @IsNumber()
  commission?: number;

  @IsOptional()
  @IsString()
  pro?: string;

  @IsOptional()
  @IsString()
  doctorType?: string;

  @IsOptional()
  @IsBoolean()
  webRpt?: boolean;

  @IsOptional()
  @IsBoolean()
  internetRpt?: boolean;

  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @IsOptional()
  @IsBoolean()
  whatsapp?: boolean;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
