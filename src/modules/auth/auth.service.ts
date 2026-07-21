import { Injectable, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuthResponseDto } from './dtos/auth-response.dto';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { LoginAttemptService } from './services/login-attempt.service';
import { PublicDataSourceService } from '../../database/datasources/public.datasource';
import { AuditService } from '../audit/audit.service';
import { User, UserRole } from '../../database/entities/tenant/user.entity';
import { SignupDto } from './dtos/signup.dto';

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
    private readonly auditService: AuditService,
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
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      if (!payload.sub || !payload.email || !payload.tenantSlug) {
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
        tenantSlug: payload.tenantSlug,
        role: payload.role,
      });

      const newRefreshTokenString = this.generateRefreshToken({
        sub: payload.sub,
        email: payload.email,
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
    tenantSlug: string,
    role: string
  ): Promise<AuthResponseDto> {
    const accessToken = this.generateAccessToken({
      sub: userId,
      email,
      tenantSlug,
      role,
    });

    const refreshTokenString = this.generateRefreshToken({
      sub: userId,
      email,
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

  async signup(payload: SignupDto): Promise<{ message: string; user: Partial<User>; password: string }> {
    const resolvedEmail = payload.email || payload.username || '';
    const tenantSlug = this.normalizeTenantSlug(payload.tenantSlug || payload.labName || payload.tenantName || payload.name || resolvedEmail);
    const tenantName = payload.labName || payload.tenantName || payload.name;
    const chosenRole = payload.role || UserRole.RECEPTIONIST;
    const generatedLabCode = (payload.labCode || '').trim() || this.generateLabCode(tenantSlug);

    if (!resolvedEmail || !payload.password || !payload.name) {
      throw new BadRequestException('Name, email, and password are required');
    }

    const publicDS = this.publicDataSourceService.getDataSource();
    const existingTenantRows = await publicDS.query(
      'SELECT slug, schema_name FROM public.tenants WHERE slug = $1 LIMIT 1',
      [tenantSlug],
    );

    if (existingTenantRows?.length) {
      const existingTenant = existingTenantRows[0] as { slug: string; schema_name: string };
      const tenantDS = await this.tenantDataSourceService.getForTenant(existingTenant.slug);
      const existingUser = await tenantDS.getRepository(User).findOne({ where: { email: resolvedEmail } });
      if (existingUser) {
        throw new BadRequestException('User with this email already exists for this tenant');
      }
    }

    const schemaName = this.getSchemaName(tenantSlug);
    await publicDS.query(
      `
        INSERT INTO public.tenants (
          slug,
          name,
          email,
          schema_name,
          status,
          lab_code,
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
          privacy_accepted
        )
        VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          schema_name = EXCLUDED.schema_name,
          status = 'active',
          lab_code = EXCLUDED.lab_code,
          registration_number = EXCLUDED.registration_number,
          gst_number = EXCLUDED.gst_number,
          mobile_number = EXCLUDED.mobile_number,
          country = EXCLUDED.country,
          state = EXCLUDED.state,
          city = EXCLUDED.city,
          pin_code = EXCLUDED.pin_code,
          complete_address = EXCLUDED.complete_address,
          plan = EXCLUDED.plan,
          terms_accepted = EXCLUDED.terms_accepted,
          privacy_accepted = EXCLUDED.privacy_accepted,
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        tenantSlug,
        tenantName,
        resolvedEmail,
        schemaName,
        generatedLabCode,
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

    const tenantDS = await this.tenantDataSourceService.getForTenant(tenantSlug);
    await tenantDS.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    await tenantDS.query(`CREATE TABLE IF NOT EXISTS ${schemaName}.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'Receptionist',
      is_active BOOLEAN DEFAULT true,
      phone VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);

    const passwordHash = await this.hashPassword(payload.password);
    const userRepository = tenantDS.getRepository(User);
    const existingUserInSchema = await userRepository.findOne({ where: { email: resolvedEmail } });
    if (existingUserInSchema) {
      throw new BadRequestException('User with this email already exists for this tenant');
    }

    let user: User;
    try {
      user = await userRepository.save(
        userRepository.create({
          email: resolvedEmail,
          name: payload.name,
          passwordHash,
          role: chosenRole,
          isActive: true,
        }),
      );
    } catch (error) {
      const errorCode = (error as { code?: string; driverError?: { code?: string } }).code
        || (error as { driverError?: { code?: string } }).driverError?.code;

      if (errorCode === '23505') {
        throw new BadRequestException('User with this email already exists for this tenant');
      }

      throw error;
    }

    await this.auditService.logEvent({
      tenantSlug,
      action: 'users.created',
      entityType: 'users',
      entityId: user.id,
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      newValues: {
        source: 'signup',
        tenantName,
        role: chosenRole,
        labCode: generatedLabCode,
        registrationNumber: payload.registrationNumber,
        designation: payload.designation,
        username: payload.username,
      },
    });

    await this.sendSignupCredentialsEmail(resolvedEmail, payload.name, payload.password, tenantSlug);

    return {
      message: 'User created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      password: payload.password,
    };
  }

  private generateLabCode(tenantSlug: string): string {
    const slugPart = tenantSlug.replace(/[^a-z0-9]+/gi, '').slice(0, 4).toUpperCase();
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${slugPart || 'PCL'}${randomPart}`;
  }

  private normalizeTenantSlug(value: string): string {
    const normalized = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return normalized || 'tenant';
  }

  private getSchemaName(tenantSlug: string): string {
    return `tenant_${this.normalizeTenantSlug(tenantSlug)}`;
  }

  private async sendSignupCredentialsEmail(email: string, name: string, password: string, tenantSlug: string): Promise<void> {
    this.logger.log(`Signup credentials email prepared for ${email} (${name}) in tenant ${tenantSlug}`);
    this.logger.log(`Temporary password for ${email}: ${password}`);
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
