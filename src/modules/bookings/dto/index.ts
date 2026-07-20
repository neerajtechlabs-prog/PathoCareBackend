import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  testIds?: string[];

  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  paymentMode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  centre?: string;

  @IsOptional()
  @IsString()
  regNo?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  recordNo?: string;

  @IsOptional()
  @IsString()
  uid?: string;

  @IsOptional()
  @IsString()
  patientName?: string;

  @IsOptional()
  @IsString()
  patientTitle?: string;

  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsString()
  ageUnit?: string;

  @IsOptional()
  @IsString()
  sex?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  doctor?: string;

  @IsOptional()
  @IsString()
  doctorEmail?: string;

  @IsOptional()
  @IsString()
  doctorType?: string;

  @IsOptional()
  @IsString()
  bookingType?: string;

  @IsOptional()
  @IsString()
  sample?: string;

  @IsOptional()
  @IsString()
  takenBy?: string;

  @IsOptional()
  @IsString()
  panel?: string;

  @IsOptional()
  @IsString()
  fileNo?: string;

  @IsOptional()
  @IsString()
  userRate?: string;

  @IsOptional()
  @IsString()
  resultType?: string;

  @IsOptional()
  @IsArray()
  tests?: Array<{
    id?: string;
    backendId?: string;
    code?: string;
    test?: string;
    reportDays?: number;
    rate?: number;
  }>;

  @IsOptional()
  @IsBoolean()
  moveAllColumns?: boolean;

  @IsOptional()
  @IsBoolean()
  bookingPlusResult?: boolean;

  @IsOptional()
  @IsBoolean()
  bookingPlusReceipt?: boolean;

  @IsOptional()
  @IsBoolean()
  printWorkingSlip?: boolean;

  @IsOptional()
  @IsString()
  extraBy?: string;

  @IsOptional()
  @IsString()
  discountBy?: string;

  @IsOptional()
  @IsString()
  payType?: string;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  discountPercent?: number;

  @IsOptional()
  @IsNumber()
  total?: number;

  @IsOptional()
  @IsNumber()
  net?: number;

  @IsOptional()
  @IsNumber()
  paid?: number;

  @IsOptional()
  @IsString()
  cancelRemark?: string;
}

export class UpdateBookingDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelBookingDto {
  @IsNotEmpty()
  @IsString()
  remark!: string;
}

export class CreateReceiptDto {
  @IsPositive()
  amount!: number;

  @IsNotEmpty()
  @IsString()
  paymentMode!: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
