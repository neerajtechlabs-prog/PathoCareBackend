import { describe, expect, it, jest } from '@jest/globals';
import { NotificationsService } from './notifications.service';
import { NotificationLog } from '../../database/entities/tenant/notification-log.entity';

describe('NotificationsService', () => {
  it('persists a notification log for a pending delivery and returns it', async () => {
    const savedLog = { id: 'log-1', status: 'pending' } as NotificationLog;
    const repo = {
      create: jest.fn().mockReturnValue(savedLog),
      save: jest.fn().mockResolvedValue(savedLog),
      find: jest.fn().mockResolvedValue([savedLog]),
      findOne: jest.fn().mockResolvedValue(savedLog),
    };

    const tenantDS = {
      getRepository: jest.fn().mockReturnValue(repo),
      query: jest.fn().mockResolvedValue([]),
    };

    const tenantDSService = {
      getForTenant: jest.fn().mockResolvedValue(tenantDS),
    };

    const queueService = {
      enqueueEmail: jest.fn().mockResolvedValue('job-123'),
    };

    const service = new NotificationsService(tenantDSService as any, queueService as any);

    const result = await service.sendNotification('demo', {
      channel: 'email',
      recipient: 'patient@example.com',
      subject: 'Test notification',
      message: 'Hello there',
      template: 'welcome',
      referenceId: 'booking-1',
    });

    expect(tenantDSService.getForTenant).toHaveBeenCalledWith('demo');
    expect(repo.save).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ id: 'log-1', status: 'pending' }));
    expect(queueService.enqueueEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'patient@example.com' }));
  });
});
