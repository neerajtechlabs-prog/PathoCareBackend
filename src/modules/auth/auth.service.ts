import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuthResponseDto } from './dtos/auth-response.dto';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { LoginAttemptService } from './services/login-attempt.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private refreshTokenRepository: RefreshTokenRepository,
    private tenantDataSourceService: TenantDataSourceService,
    public readonly loginAttemptService: LoginAttemptService
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
