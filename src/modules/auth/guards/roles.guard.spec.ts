import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../../database/entities/tenant/user.entity';
import { AuditService } from '../../audit/audit.service';

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    const auditService = { logEvent: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    guard = new RolesGuard(reflector, auditService);
  });

  it('allows access when the user has one of the required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.LAB_ADMIN]);

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {}, user: { role: UserRole.LAB_ADMIN } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows a Doctor when the endpoint explicitly includes the Doctor role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.DOCTOR]);

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {}, user: { role: UserRole.DOCTOR } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws when the user does not have any required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.SUPER_ADMIN]);

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {}, user: { role: UserRole.RECEPTIONIST } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
