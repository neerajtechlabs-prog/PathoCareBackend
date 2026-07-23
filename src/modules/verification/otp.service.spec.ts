import { Test } from '@nestjs/testing';
import { OtpService } from './otp.service';
import { PublicDataSourceService } from '../../database/datasources/public.datasource';
import { LabCodeService } from '../tenant/services/lab-code.service';

describe('OtpService dependency injection', () => {
  it('resolves the delivery channel provider', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: PublicDataSourceService,
          useValue: { getDataSource: () => ({ query: jest.fn() }) },
        },
        {
          provide: 'IOtpDeliveryChannel',
          useValue: {
            sendOtp: jest.fn(),
            sendLabCode: jest.fn(),
            channelName: 'email',
          },
        },
        {
          provide: LabCodeService,
          useValue: { generateUniqueLabCode: jest.fn() },
        },
      ],
    }).compile();

    const service = moduleRef.get(OtpService);
    expect(service).toBeDefined();
  });
});
