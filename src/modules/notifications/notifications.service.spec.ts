import { describe, expect, it, jest } from '@jest/globals';
import { NotificationsService } from './notifications.service';
import { NotificationLog } from '../../database/entities/tenant/notification-log.entity';

describe('NotificationsService', () => {
  it('persists a notification log for a pending delivery and returns it', async () => {
    const savedLog = { id: 'log-1', status: 'pending' } as NotificationLog;

    const createMock: any = jest.fn();
    createMock.mockReturnValue(savedLog);

    const saveMock: any = jest.fn();
    saveMock.mockResolvedValue(savedLog);

    const findMock: any = jest.fn();
    findMock.mockResolvedValue([savedLog]);

    const findOneMock: any = jest.fn();
    findOneMock.mockResolvedValue(savedLog);

    const repo: any = {
      create: createMock,
      save: saveMock,
      find: findMock,
      findOne: findOneMock,
    };

    const getRepositoryMock: any = jest.fn();
    getRepositoryMock.mockReturnValue(repo);

    const queryMock: any = jest.fn();
    queryMock.mockResolvedValue([]);

    const tenantDS: any = {
      getRepository: getRepositoryMock,
      query: queryMock,
    };

    const getForTenantMock: any = jest.fn();
    getForTenantMock.mockResolvedValue(tenantDS);

    const tenantDSService: any = {
      getForTenant: getForTenantMock,
    };

    const enqueueEmailMock: any = jest.fn();
    enqueueEmailMock.mockResolvedValue('job-123');

    const queueService: any = {
      enqueueEmail: enqueueEmailMock,
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
