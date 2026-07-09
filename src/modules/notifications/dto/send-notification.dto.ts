import { IsIn, IsOptional, IsString } from 'class-validator';

export class SendNotificationDto {
  @IsIn(['email', 'sms', 'whatsapp'])
  channel!: 'email' | 'sms' | 'whatsapp';

  @IsString()
  recipient!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;
}
