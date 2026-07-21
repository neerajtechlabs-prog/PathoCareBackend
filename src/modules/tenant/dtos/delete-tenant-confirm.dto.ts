import { IsString, IsNotEmpty } from 'class-validator';

export class DeleteTenantConfirmDto {
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsString()
  @IsNotEmpty()
  otpCode!: string;
}
