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
  it('persists the provided email when creating a tenant and user', async () => {
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
        findOne: jest.fn().mockResolvedValue(null),
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

    await service.signup({
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

    const tenantInsertCall = publicDataSource.query.mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO public.tenants'),
    );
    expect(tenantInsertCall?.[0]).toContain('email');
    expect((tenantInsertCall?.[1] as unknown[] | undefined)?.[2]).toBe('new.user@example.com');
  });

  it('returns a bad request when a user with the same email already exists in the tenant schema', async () => {
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

    const existingUser = { id: 'user-1', email: 'existing@example.com', name: 'Existing User', role: UserRole.RECEPTIONIST };
    const tenantDS = {
      query: jest.fn().mockResolvedValue([]),
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(existingUser),
        create: jest.fn(),
        save: jest.fn(),
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

    await expect(service.signup({
      name: 'New User',
      email: 'existing@example.com',
      password: 'Password123!',
      labName: 'PathCare Labs',
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
    })).rejects.toThrow('User with this email already exists for this tenant');
  });

  it('generates a lab code from the tenant slug when no lab code is supplied', () => {
    const jwtService = { sign: jest.fn(), verify: jest.fn() } as unknown as JwtService;
    const configService = { get: jest.fn().mockReturnValue('15m') } as unknown as ConfigService;
    const refreshTokenRepository = { create: jest.fn(), validate: jest.fn(), revoke: jest.fn(), revokeAllForUser: jest.fn() } as unknown as RefreshTokenRepository;
    const loginAttemptService = new LoginAttemptService();
    const publicDataSourceService = { getDataSource: jest.fn() } as unknown as PublicDataSourceService;
    const tenantDataSourceService = { getForTenant: jest.fn() } as unknown as TenantDataSourceService;
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

    const code = (service as any).generateLabCode('PathCare Demo Lab');

    expect(code).toMatch(/^PATH[A-Z0-9]{4}$/);
  });

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
        findOne: jest.fn().mockResolvedValue(null),
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
