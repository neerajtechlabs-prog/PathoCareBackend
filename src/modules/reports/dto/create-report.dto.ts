import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  bookingId!: string;

  @IsOptional()
  @IsIn(['RESULTS', 'BOOKING', 'FULL'])
  reportType?: string = 'RESULTS';

  @IsOptional()
  @IsEmail()
  patientEmail?: string;

  @IsOptional()
  @IsString()
  patientPhone?: string;
}
