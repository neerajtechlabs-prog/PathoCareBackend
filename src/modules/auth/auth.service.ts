import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuthResponseDto } from './dtos/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
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
  async refreshAccessToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      }) as JwtPayload;

      if (!payload.sub || !payload.email || !payload.tenantSlug) {
        throw new UnauthorizedException('Invalid refresh token payload');
      }

      // TODO: Week 3 enhancement: Check if refresh token is in DB and not revoked
      // For now, just issue new tokens

      const newAccessToken = this.generateAccessToken({
        sub: payload.sub,
        email: payload.email,
        tenantSlug: payload.tenantSlug,
        role: payload.role,
      });

      const newRefreshToken = this.generateRefreshToken({
        sub: payload.sub,
        email: payload.email,
        tenantSlug: payload.tenantSlug,
        role: payload.role,
      });

      const expiresIn = 900; // 15 minutes in seconds

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        expiresIn,
      };
    } catch (error) {
      this.logger.error('Refresh token validation failed:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Build auth response with tokens
   */
  buildAuthResponse(
    userId: string,
    email: string,
    tenantSlug: string,
    role: string,
  ): AuthResponseDto {
    const accessToken = this.generateAccessToken({
      sub: userId,
      email,
      tenantSlug,
      role,
    });

    const refreshToken = this.generateRefreshToken({
      sub: userId,
      email,
      tenantSlug,
      role,
    });

    const expiresIn = 900; // 15 minutes in seconds

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn,
    };
  }

  /**
   * Validate access token
   */
  validateAccessToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify(token) as JwtPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}

