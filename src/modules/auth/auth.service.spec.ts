import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PublicDataSourceService } from '../../database/datasources/public.datasource';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { LoginAttemptService } from './services/login-attempt.service';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '../../database/entities/tenant/user.entity';

describe('AuthService signup', () => {
  it('creates a tenant and user and returns signup credentials', async () => {
    const jwtService = { sign: jest.fn(), verify: jest.fn() } as unknown as JwtService;
    const configService = { get: jest.fn().mockReturnValue('15m') } as unknown as ConfigService;
    const refreshTokenRepository = { create: jest.fn(), validate: jest.fn(), revoke: jest.fn(), revokeAllForUser: jest.fn() } as unknown as RefreshTokenRepository;
    const loginAttemptService = new LoginAttemptService();

    const publicDataSource = {
      query: jest.fn().mockResolvedValue([]),
    } as any;
    const publicDataSourceService = {
      getDataSource: jest.fn().mockReturnValue(publicDataSource),
    } as unknown as PublicDataSourceService;

    const savedUser = { id: 'user-1', email: 'new.user@example.com', name: 'New User', role: UserRole.RECEPTIONIST };
    const tenantDS = {
      query: jest.fn().mockResolvedValue([]),
      getRepository: jest.fn().mockReturnValue({
        create: jest.fn().mockReturnValue(savedUser),
        save: jest.fn().mockResolvedValue(savedUser),
      }),
    } as any;
    const tenantDataSourceService = {
      getForTenant: jest.fn().mockResolvedValue(tenantDS),
    } as unknown as TenantDataSourceService;
    const auditService = { logEvent: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;

    const service = new AuthService(
      jwtService,
      configService,
      refreshTokenRepository,
      tenantDataSourceService,
      loginAttemptService,
      publicDataSourceService,
      auditService,
    );

    const result = await service.signup({
      name: 'New User',
      email: 'new.user@example.com',
      password: 'Password123!',
      labName: 'PathCare Labs',
      labCode: 'PCL001',
      registrationNumber: 'NABL-1234',
      gstNumber: '27AABCU9603R1ZV',
      mobileNumber: '+919876543210',
      designation: 'Administrator',
      username: 'admin@pathcare.com',
      country: 'India',
      state: 'Uttar Pradesh',
      city: 'Meerut',
      pinCode: '250342',
      completeAddress: 'Rajpur Momin',
      plan: 'Starter',
      terms: true,
      privacy: true,
      role: UserRole.RECEPTIONIST,
    });

    expect(result.user.email).toBe('new.user@example.com');
    expect(result.password).toBe('Password123!');
    expect(publicDataSource.query).toHaveBeenCalled();
    expect(tenantDataSourceService.getForTenant).toHaveBeenCalled();
    expect(tenantDS.getRepository).toHaveBeenCalled();
  });
});
