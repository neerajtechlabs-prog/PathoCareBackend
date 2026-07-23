import { NotificationProcessor } from '../src/modules/queue/processors/notification.processor';
import { MailService } from '../src/modules/notifications/services/mail.service';

describe('NotificationProcessor email handling', () => {
  it('uses MailService.sendMail for OTP email payloads', async () => {
    const mailService = {
      sendMail: jest.fn().mockResolvedValue({ accepted: ['test@example.com'] }),
    } as unknown as MailService;

    const processor = new NotificationProcessor(undefined, mailService);
    const job = {
      data: {
        tenantSlug: 'demo',
        recipient: 'test@example.com',
        otpCode: '123456',
        template: 'otp',
        referenceId: 'ref-1',
      },
    } as any;

    const result = await (processor as any).processEmail(job);

    expect(mailService.sendMail).toHaveBeenCalledWith(
      'test@example.com',
      'PathCare verification code',
      expect.stringContaining('123456'),
    );
    expect(result.status).toBe('sent');
  });

  it('processes send-otp jobs from the email queue', async () => {
    const mailService = {
      sendMail: jest.fn().mockResolvedValue({ accepted: ['test@example.com'] }),
    } as unknown as MailService;

    const processor = new NotificationProcessor(undefined, mailService);
    const job = {
      name: 'send-otp',
      data: {
        tenantSlug: 'demo',
        recipient: 'test@example.com',
        otpCode: '654321',
        referenceId: 'ref-2',
      },
    } as any;

    const result = await processor.process(job);

    expect(mailService.sendMail).toHaveBeenCalled();
    expect(result.status).toBe('sent');
  });
});
