import {
  Controller,
  Post,
  Body,
  Res,
  Logger,
  UnauthorizedException,
  BadRequestException,
  Headers,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { UsersRepository } from '../users/users.repository';
import { LoginDto } from './dtos/login.dto';
import { AuthResponseDto } from './dtos/auth-response.dto';

@ApiTags('auth')
@Controller(['auth', 'api/auth'])
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private tenantDSService: TenantDataSourceService,
    private usersRepository: UsersRepository,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'User login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid credentials' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async login(
    @Body() loginDto: LoginDto,
    @Headers('x-tenant-slug') tenantSlug: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    if (!tenantSlug || typeof tenantSlug !== 'string' || tenantSlug.trim() === '') {
      throw new BadRequestException('X-Tenant-Slug header is required');
    }

    try {
      // Get tenant-specific datasource
      const tenantDS = await this.tenantDSService.getForTenant(tenantSlug);

      // Find user by email
      const user = await this.usersRepository.findByEmail(tenantDS, loginDto.email);
      if (!user) {
        this.logger.warn(`Login failed: user not found - ${loginDto.email} (tenant: ${tenantSlug})`);
        throw new UnauthorizedException('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await this.authService.verifyPassword(
        loginDto.password,
        user.passwordHash,
      );
      if (!isPasswordValid) {
        this.logger.warn(`Login failed: invalid password - ${loginDto.email} (tenant: ${tenantSlug})`);
        throw new UnauthorizedException('Invalid email or password');
      }

      if (!user.isActive) {
        this.logger.warn(`Login failed: user inactive - ${loginDto.email} (tenant: ${tenantSlug})`);
        throw new UnauthorizedException('User account is inactive');
      }

      // Generate tokens
      const authResponse = this.authService.buildAuthResponse(
        user.id,
        user.email,
        tenantSlug,
        user.role,
      );

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', authResponse.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        domain: process.env.COOKIE_DOMAIN || '.pathcare.local',
      });

      this.logger.log(`User logged in: ${user.email} (tenant: ${tenantSlug})`);

      return authResponse;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Login error: ${message}`, stack);
      throw new UnauthorizedException('Login failed');
    }
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh JWT access token using refresh token from cookies' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found - login required');
    }

    try {
      // Validate and issue new tokens
      const authResponse = await this.authService.refreshAccessToken(refreshToken);

      // Update refresh token in httpOnly cookie
      res.cookie('refreshToken', authResponse.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        domain: process.env.COOKIE_DOMAIN || '.pathcare.local',
      });

      this.logger.log('Access token refreshed');

      return authResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Token refresh error: ${message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  @Post('logout')
  @ApiOperation({ summary: 'User logout - clears refresh token cookie' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Res({ passthrough: true }) res: Response): Promise<{ message: string }> {
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      domain: process.env.COOKIE_DOMAIN || '.pathcare.local',
    });

    this.logger.log('User logged out');

    return { message: 'Logout successful' };
  }
}

