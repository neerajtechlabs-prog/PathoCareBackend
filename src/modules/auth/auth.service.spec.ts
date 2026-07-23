import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PublicDataSourceService } from '../../database/datasources/public.datasource';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { LoginAttemptService } from './services/login-attempt.service';

describe('AuthService signup', () => {
  it('includes tenantId and tenantSlug in generated JWT claims', () => {
    const jwtService = { sign: jest.fn().mockReturnValue('token'), verify: jest.fn() } as unknown as JwtService;
    const configService = { get: jest.fn().mockReturnValue('15m') } as unknown as ConfigService;
    const refreshTokenRepository = { create: jest.fn(), validate: jest.fn(), revoke: jest.fn(), revokeAllForUser: jest.fn() } as unknown as RefreshTokenRepository;
    const loginAttemptService = new LoginAttemptService();
    const publicDataSourceService = { getDataSource: jest.fn() } as unknown as PublicDataSourceService;
    const tenantDataSourceService = { getForTenant: jest.fn() } as unknown as TenantDataSourceService;
    const otpService = { sendOtp: jest.fn().mockResolvedValue(undefined) } as unknown as any;

    const service = new AuthService(
      jwtService,
      configService,
      refreshTokenRepository,
      tenantDataSourceService,
      loginAttemptService,
      publicDataSourceService,
      otpService,
    );

    service.generateAccessToken({
      sub: 'user-1',
      email: 'user@example.com',
      tenantId: 'tenant-1',
      tenantSlug: 'demo',
      role: 'admin',
    });

    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', tenantSlug: 'demo' }),
      expect.any(Object),
    );
  });

  it('persists the provided email when creating an unverified registration', async () => {
    const jwtService = { sign: jest.fn(), verify: jest.fn() } as unknown as JwtService;
    const configService = { get: jest.fn().mockReturnValue('15m') } as unknown as ConfigService;
    const refreshTokenRepository = { create: jest.fn(), validate: jest.fn(), revoke: jest.fn(), revokeAllForUser: jest.fn() } as unknown as RefreshTokenRepository;
    const loginAttemptService = new LoginAttemptService();

    const publicDataSource = {
      query: jest.fn().mockImplementation((query: string) => query.includes('INSERT INTO public.tenants')
        ? [{ id: 'tenant-1', slug: 'pathcare_labs', schema_name: 'tenant_pathcare_labs', status: 'unverified' }]
        : []),
    } as any;
    const publicDataSourceService = {
      getDataSource: jest.fn().mockReturnValue(publicDataSource),
    } as unknown as PublicDataSourceService;

    const tenantDataSourceService = {
      getForTenant: jest.fn().mockResolvedValue(null),
    } as unknown as TenantDataSourceService;

    const otpService = { sendOtp: jest.fn().mockResolvedValue(undefined) } as unknown as any;

    const service = new AuthService(
      jwtService,
      configService,
      refreshTokenRepository,
      tenantDataSourceService,
      loginAttemptService,
      publicDataSourceService,
      otpService,
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
    });

    const tenantInsertCall = publicDataSource.query.mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO public.tenants'),
    );
    expect(tenantInsertCall?.[0]).toContain('admin_email');
    expect((tenantInsertCall?.[1] as unknown[] | undefined)?.[6]).toBe('new.user@example.com');
  });

  it('returns a bad request when the tenant slug is already registered', async () => {
    const jwtService = { sign: jest.fn(), verify: jest.fn() } as unknown as JwtService;
    const configService = { get: jest.fn().mockReturnValue('15m') } as unknown as ConfigService;
    const refreshTokenRepository = { create: jest.fn(), validate: jest.fn(), revoke: jest.fn(), revokeAllForUser: jest.fn() } as unknown as RefreshTokenRepository;
    const loginAttemptService = new LoginAttemptService();

    const publicDataSource = {
      query: jest.fn().mockResolvedValue([{ id: 'tenant-1', slug: 'pathcare_labs', schema_name: 'tenant_pathcare_labs' }]),
    } as any;
    const publicDataSourceService = {
      getDataSource: jest.fn().mockReturnValue(publicDataSource),
    } as unknown as PublicDataSourceService;

    const tenantDataSourceService = {
      getForTenant: jest.fn().mockResolvedValue(null),
    } as unknown as TenantDataSourceService;

    const otpService = { sendOtp: jest.fn().mockResolvedValue(undefined) } as unknown as any;

    const service = new AuthService(
      jwtService,
      configService,
      refreshTokenRepository,
      tenantDataSourceService,
      loginAttemptService,
      publicDataSourceService,
      otpService,
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
    })).rejects.toThrow('This lab is already registered');
  });

  it('returns SignupResponseDto with unverified status', async () => {
    const jwtService = { sign: jest.fn(), verify: jest.fn() } as unknown as JwtService;
    const configService = { get: jest.fn().mockReturnValue('15m') } as unknown as ConfigService;
    const refreshTokenRepository = { create: jest.fn(), validate: jest.fn(), revoke: jest.fn(), revokeAllForUser: jest.fn() } as unknown as RefreshTokenRepository;
    const loginAttemptService = new LoginAttemptService();

    const publicDataSource = {
      query: jest.fn().mockImplementation((query: string) => query.includes('INSERT INTO public.tenants')
        ? [{ id: 'tenant-1', slug: 'pathcare_labs', schema_name: 'tenant_pathcare_labs', status: 'unverified' }]
        : []),
    } as any;
    const publicDataSourceService = {
      getDataSource: jest.fn().mockReturnValue(publicDataSource),
    } as unknown as PublicDataSourceService;

    const tenantDataSourceService = {
      getForTenant: jest.fn().mockResolvedValue(null),
    } as unknown as TenantDataSourceService;

    const otpService = { sendOtp: jest.fn().mockResolvedValue(undefined) } as unknown as any;

    const service = new AuthService(
      jwtService,
      configService,
      refreshTokenRepository,
      tenantDataSourceService,
      loginAttemptService,
      publicDataSourceService,
      otpService,
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
    });

    expect(result.message).toBe('Registration submitted successfully. OTP sent to admin email.');
    expect(result.tenantId).toBe('tenant-1');
    expect(result.tenantSlug).toBe('pathcare_labs');
    expect(result.status).toBe('unverified');
    expect(result.otpSentTo).toBe('new.user@example.com');
    expect(result.otpInfo).toContain('10 minutes');
    expect(publicDataSource.query).toHaveBeenCalled();
  });

  it('blocks login for a tenant that is still pending approval', async () => {
    const jwtService = { sign: jest.fn(), verify: jest.fn() } as unknown as JwtService;
    const configService = { get: jest.fn().mockReturnValue('15m') } as unknown as ConfigService;
    const refreshTokenRepository = { create: jest.fn(), validate: jest.fn(), revoke: jest.fn(), revokeAllForUser: jest.fn() } as unknown as RefreshTokenRepository;
    const loginAttemptService = new LoginAttemptService();

    const publicDataSource = {
      query: jest.fn().mockResolvedValue([{ id: 'tenant-1', slug: 'pathcare_labs', status: 'pending_approval', lab_code: 'PCL001' }]),
    } as any;
    const publicDataSourceService = {
      getDataSource: jest.fn().mockReturnValue(publicDataSource),
    } as unknown as PublicDataSourceService;

    const tenantDataSourceService = {
      getForTenant: jest.fn().mockResolvedValue(null),
    } as unknown as TenantDataSourceService;

    const otpService = { sendOtp: jest.fn().mockResolvedValue(undefined) } as unknown as any;

    const service = new AuthService(
      jwtService,
      configService,
      refreshTokenRepository,
      tenantDataSourceService,
      loginAttemptService,
      publicDataSourceService,
      otpService,
    );

    await expect(service.resolveTenantForLogin('PCL001')).rejects.toThrow('pending admin approval');
  });
});

