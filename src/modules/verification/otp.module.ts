import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { OtpService } from './otp.service';
import { EmailOtpChannel } from './channels/email-otp.channel';
import { DatabaseModule } from '../../database/database.module';
import { TenantModule } from '../tenant/tenant.module';

const otpDeliveryChannelProvider = {
  provide: 'IOtpDeliveryChannel',
  useClass: EmailOtpChannel,
};

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    ConfigModule,
    DatabaseModule,
    TenantModule,
  ],
  providers: [OtpService, EmailOtpChannel, otpDeliveryChannelProvider],
  exports: [OtpService, EmailOtpChannel, otpDeliveryChannelProvider],
})
export class VerificationModule {}
