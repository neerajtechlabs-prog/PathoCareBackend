import { Injectable, UnauthorizedException, Logger, BadRequestException, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuthResponseDto } from './dtos/auth-response.dto';
import { SignupResponseDto } from './dtos/signup-response.dto';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { LoginAttemptService } from './services/login-attempt.service';
import { PublicDataSourceService } from '../../database/datasources/public.datasource';
import { SignupDto } from './dtos/signup.dto';
import { TenantCacheService } from '../tenant/tenant-cache.service';
import { TenantStatus } from '../tenant/enums/tenant-status.enum';
import { OtpService } from '../verification/otp.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private refreshTokenRepository: RefreshTokenRepository,
    private tenantDataSourceService: TenantDataSourceService,
    public readonly loginAttemptService: LoginAttemptService,
    private readonly publicDataSourceService: PublicDataSourceService,
    private readonly otpService: OtpService,
    @Optional() private readonly tenantCacheService?: TenantCacheService,
  ) {}

  /**
   * Hash a plain password using Argon2id
   */
  async hashPassword(password: string): Promise<string> {
    try {
      return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 19456, // 19 MiB
        timeCost: 2,
        parallelism: 1,
      });
    } catch (error) {
      this.logger.error('Password hashing failed:', error);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify plain password against hash
   */
  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch (error) {
      this.logger.error('Password verification failed:', error);
      return false;
    }
  }

  /**
   * Generate JWT access token (15 min default)
   */
  generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    const jwtPayload: JwtPayload = {
      ...payload,
    };

    return this.jwtService.sign(jwtPayload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
    });
  }

  /**
   * Generate JWT refresh token (7d default)
   * Note: This is NOT stored in DB yet (Week 3 enhancement)
   * In production, store refresh token hash + expiry in refresh_tokens table
   */
  generateRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    const jwtPayload: JwtPayload = {
      ...payload,
    };

    return this.jwtService.sign(jwtPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
    });
  }

  /**
   * Validate refresh token and issue new access + refresh pair
   */
  async refreshAccessToken(refreshToken: string, tenantSlug: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      if (!payload.sub || !payload.email || !payload.tenantId || !payload.tenantSlug) {
        throw new UnauthorizedException('Invalid refresh token payload');
      }

      // Validate refresh token against persisted DB
      const tenantDS = await this.tenantDataSourceService.getForTenant(tenantSlug);
      const storedToken = await this.refreshTokenRepository.validate(
        tenantDS,
        payload.sub,
        refreshToken
      );

      if (!storedToken) {
        throw new UnauthorizedException('Refresh token has been revoked or expired');
      }

      // Issue new token family for rotation
      const newFamily = uuidv4();

      const newAccessToken = this.generateAccessToken({
        sub: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        tenantSlug: payload.tenantSlug,
        role: payload.role,
      });

      const newRefreshTokenString = this.generateRefreshToken({
        sub: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        tenantSlug: payload.tenantSlug,
        role: payload.role,
      });

      // Persist new refresh token
      const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');
      const expiresAt = this.parseExpiry(expiresIn);
      await this.refreshTokenRepository.create(
        tenantDS,
        payload.sub,
        newFamily,
        expiresAt,
        newRefreshTokenString
      );

      // Revoke old token family
      await this.refreshTokenRepository.revoke(tenantDS, storedToken.id);

      const accessExpiresIn = 900; // 15 minutes in seconds

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshTokenString,
        tokenType: 'Bearer',
        expiresIn: accessExpiresIn,
      };
    } catch (error) {
      this.logger.error('Refresh token validation failed:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Build auth response with tokens and persist refresh token
   */
  async buildAuthResponse(
    userId: string,
    email: string,
    tenantId: string,
    tenantSlug: string,
    role: string
  ): Promise<AuthResponseDto> {
    const accessToken = this.generateAccessToken({
      sub: userId,
      email,
      tenantId,
      tenantSlug,
      role,
    });

    const refreshTokenString = this.generateRefreshToken({
      sub: userId,
      email,
      tenantId,
      tenantSlug,
      role,
    });

    // Persist refresh token
    const tenantDS = await this.tenantDataSourceService.getForTenant(tenantSlug);
    const family = uuidv4();
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');
    const expiresAt = this.parseExpiry(expiresIn);

    await this.refreshTokenRepository.create(
      tenantDS,
      userId,
      family,
      expiresAt,
      refreshTokenString
    );

    const accessExpiresIn = 900; // 15 minutes in seconds

    return {
      accessToken,
      refreshToken: refreshTokenString,
      tokenType: 'Bearer',
      expiresIn: accessExpiresIn,
    };
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   */
  async revokeRefreshTokens(userId: string, tenantSlug: string): Promise<void> {
    try {
      const tenantDS = await this.tenantDataSourceService.getForTenant(tenantSlug);
      await this.refreshTokenRepository.revokeAllForUser(tenantDS, userId);
    } catch (error) {
      this.logger.error(`Failed to revoke tokens for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Parse expiry string (e.g., "7d", "15m") to Date
   */
  private parseExpiry(expiryStr: string): Date {
    const now = new Date();
    const match = expiryStr.match(/^(\d+)([smhd])$/);

    if (!match) {
      this.logger.warn(`Invalid expiry format: ${expiryStr}, defaulting to 7 days`);
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const [, value, unit] = match;
    const numValue = parseInt(value, 10);

    switch (unit) {
      case 's':
        return new Date(now.getTime() + numValue * 1000);
      case 'm':
        return new Date(now.getTime() + numValue * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + numValue * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + numValue * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  async resolveTenantForLogin(
    tenantSlug?: string,
    labCode?: string,
  ): Promise<{ id: string; slug: string; schemaName: string; status: string }> {
    const publicDS = this.publicDataSourceService.getDataSource();
    const normalizedSlug = tenantSlug?.trim();
    const normalizedLabCode = labCode?.trim();

    let tenantRows: Array<{ id: string; slug: string; schema_name: string; status: string }> = [];

    if (normalizedSlug) {
      tenantRows = await publicDS.query<
        Array<{ id: string; slug: string; schema_name: string; status: string }>
      >(
        'SELECT id, slug, schema_name, status FROM public.tenants WHERE slug = $1 LIMIT 1',
        [normalizedSlug],
      );
    }

    if (!tenantRows.length && normalizedLabCode) {
      tenantRows = await publicDS.query<
        Array<{ id: string; slug: string; schema_name: string; status: string }>
      >(
        'SELECT id, slug, schema_name, status FROM public.tenants WHERE lab_code = $1 LIMIT 1',
        [normalizedLabCode],
      );
    }

    const tenant = tenantRows[0];
    if (!tenant) {
      throw new UnauthorizedException('Tenant not found for the provided lab code or tenant slug');
    }

    switch (tenant.status) {
      case TenantStatus.UNVERIFIED:
        throw new UnauthorizedException('Registration is incomplete. Please verify your OTP first.');
      case TenantStatus.PENDING_APPROVAL:
        throw new UnauthorizedException('Your lab is pending admin approval.');
      case TenantStatus.APPROVED:
        throw new UnauthorizedException('Your lab is awaiting provisioning. Please try again shortly.');
      case TenantStatus.PROVISIONING:
        throw new UnauthorizedException('Your lab is still being provisioned. Please try again shortly.');
      case TenantStatus.PROVISIONING_FAILED:
        throw new UnauthorizedException('Lab provisioning failed. Please contact support.');
      case TenantStatus.ACTIVE:
        return {
          id: tenant.id,
          slug: tenant.slug,
          schemaName: tenant.schema_name,
          status: tenant.status,
        };
      default:
        throw new UnauthorizedException('Your lab access is not active yet.');
    }
  }

  /**
   * Step 1 Signup: Create unverified public registration
   *
   * Flow:
   * 1. Validate input (name, email, password required)
   * 2. Normalize slug from lab/tenant name
   * 3. Check slug uniqueness
   * 4. Hash password
   * 5. Insert into public.tenants with status='unverified'
   * 6. Return registration details (NOT auth tokens)
   * 7. OTP sent by subsequent step (verify-otp)
   *
   * What this DOES NOT do:
   * - Does NOT create tenant schema
   * - Does NOT create users table
   * - Does NOT create a user record
   * - Does NOT send any emails
   * - Does NOT return auth tokens
   */
  async signup(payload: SignupDto): Promise<SignupResponseDto> {
    const adminEmail = payload.email || payload.username || '';
    const adminName = payload.name || '';
    const tenantSlug = this.normalizeTenantSlug(
      payload.tenantSlug || payload.labName || payload.tenantName || payload.name || adminEmail,
    );
    const tenantName = payload.labName || payload.tenantName || payload.name;

    // Validate required fields
    if (!adminEmail || !payload.password || !adminName) {
      throw new BadRequestException('Name, email, and password are required');
    }

    if (!adminEmail.includes('@')) {
      throw new BadRequestException('Invalid email address');
    }

    if (payload.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const publicDS = this.publicDataSourceService.getDataSource();

    // Check slug uniqueness
    const existingRows = await publicDS.query(
      'SELECT id FROM public.tenants WHERE slug = $1 LIMIT 1',
      [tenantSlug],
    );

    if (existingRows?.length) {
      throw new BadRequestException('This lab is already registered');
    }

    // Hash the password
    const passwordHash = await this.hashPassword(payload.password);

    // Generate schema name (for later provisioning)
    const schemaName = this.getSchemaName(tenantSlug);

    // Insert into public.tenants with status='unverified'
    let tenant: { id: string; slug: string; schema_name: string; status: string };
    try {
      const tenantRows = await publicDS.query(
        `
        INSERT INTO public.tenants (
          slug,
          name,
          email,
          schema_name,
          status,
          admin_name,
          admin_email,
          admin_password_hash,
          registration_number,
          gst_number,
          mobile_number,
          country,
          state,
          city,
          pin_code,
          complete_address,
          plan,
          terms_accepted,
          privacy_accepted,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19,
          NOW(), NOW()
        )
        RETURNING id, slug, schema_name, status
      `,
        [
          tenantSlug,
          tenantName,
          adminEmail,
          schemaName,
          TenantStatus.UNVERIFIED,
          adminName,
          adminEmail,
          passwordHash,
          payload.registrationNumber || null,
          payload.gstNumber || null,
          payload.mobileNumber || null,
          payload.country || null,
          payload.state || null,
          payload.city || null,
          payload.pinCode || null,
          payload.completeAddress || null,
          payload.plan || null,
          payload.terms === true,
          payload.privacy === true,
        ],
      );

      tenant = tenantRows[0];
      if (!tenant?.id || !tenant.slug || !tenant.schema_name) {
        throw new Error('Tenant creation returned no valid record');
      }
    } catch (error) {
      const errorCode = (error as { code?: string; driverError?: { code?: string } }).code
        || (error as { driverError?: { code?: string } }).driverError?.code;

      if (errorCode === '23505') {
        throw new BadRequestException('This lab is already registered');
      }

      this.logger.error('Signup insert failed:', error);
      throw error;
    }

    // Clear any cached tenant entry
    await this.tenantCacheService?.invalidate(tenant.slug);

    // Queue OTP delivery (async, non-blocking)
    try {
      await this.otpService.sendOtp(
        tenant.id,
        tenant.slug,
        adminEmail,
        tenantName,
        adminName,
      );
    } catch (error) {
      this.logger.error(`Failed to send OTP for tenant ${tenant.slug}:`, error);
      // OTP failure is logged but doesn't block signup success
      // User can request resend via /auth/resend-otp
    }

    return {
      message: 'Registration submitted successfully. OTP sent to admin email.',
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      status: tenant.status,
      otpSentTo: adminEmail,
      otpInfo: 'Check your email for OTP. Valid for 10 minutes.',
    };
  }

  private normalizeTenantSlug(value: string): string {
    const normalized = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return normalized || 'tenant';
  }

  private getSchemaName(tenantSlug: string): string {
    return `tenant_${this.normalizeTenantSlug(tenantSlug)}`;
  }

  /**
   * Validate access token
   */
  validateAccessToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
