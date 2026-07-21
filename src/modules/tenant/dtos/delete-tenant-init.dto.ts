import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class DeleteTenantInitDto {
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsEmail()
  email!: string;
}
