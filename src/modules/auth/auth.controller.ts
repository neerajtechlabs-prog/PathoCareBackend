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
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';
import { UsersRepository } from '../users/users.repository';
import { LoginDto } from './dtos/login.dto';
import { SignupDto } from './dtos/signup.dto';
import { SignupResponseDto } from './dtos/signup-response.dto';
import { VerifyOtpDto } from './dtos/verify-otp.dto';
import { VerifyOtpResponseDto } from './dtos/verify-otp-response.dto';
import { ResendOtpDto } from './dtos/resend-otp.dto';
import { AuthResponseDto } from './dtos/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';
import { LoginThrottleGuard } from './guards/login-throttle.guard';
import { clearRefreshCookieOptions, getRefreshCookieOptions } from './utils/cookie-options';
import { OtpService } from '../verification/otp.service';

@ApiTags('auth')
@Controller(['auth', 'api/auth'])
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private tenantDSService: TenantDataSourceService,
    private usersRepository: UsersRepository,
    private auditService: AuditService,
    private otpService: OtpService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Authenticated user returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Req() req: Request & { user?: { sub?: string; email?: string; tenantId?: string; tenantSlug?: string; role?: string } }) {
    await this.auditService.logEvent({
      tenantSlug: req.headers['x-tenant-slug'] ? String(req.headers['x-tenant-slug']) : 'unknown',
      action: 'auth.profile.viewed',
      entityType: 'auth',
      entityId: req.user?.sub || 'me',
      userId: req.user?.sub,
      userEmail: req.user?.email,
      role: req.user?.role,
      newValues: { source: 'profile_endpoint' },
    });

    return {
      id: req.user?.sub,
      email: req.user?.email,
      tenantId: req.user?.tenantId,
      tenantSlug: req.user?.tenantSlug,
      role: req.user?.role,
    };
  }

  @Post('login')
  @UseGuards(LoginThrottleGuard)
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
    @Req() req: Request & { tenantId?: string; tenantSlug?: string },
    @Res({ passthrough: true }) res: Response,
    @Headers('x-tenant-slug') tenantSlug?: string,
  ): Promise<AuthResponseDto> {
    if ((!tenantSlug || typeof tenantSlug !== 'string' || tenantSlug.trim() === '') && !loginDto.labCode) {
      await this.auditService.logEvent({
        tenantSlug: 'unknown',
        action: 'auth.login.failed',
        entityType: 'auth',
        entityId: 'login',
        newValues: { reason: 'missing_tenant_header', email: loginDto.email },
      });
      throw new BadRequestException('X-Tenant-Slug header is required when no lab code is provided');
    }

    try {
      const resolvedTenant = await this.authService.resolveTenantForLogin(tenantSlug, loginDto.labCode);
      req.tenantId = resolvedTenant.id;
      req.tenantSlug = resolvedTenant.slug;

      // Get tenant-specific datasource
      const tenantDS = await this.tenantDSService.getForTenant(resolvedTenant.slug);

      // Find user by email
      const user = await this.usersRepository.findByEmail(tenantDS, loginDto.email);
      if (!user) {
        this.logger.warn(`Login failed: user not found - ${loginDto.email} (tenant: ${resolvedTenant.slug})`);
        await this.authService.loginAttemptService.recordFailure(resolvedTenant.slug, req.ip || 'unknown-ip', loginDto.email);
        await this.auditService.logEvent({
          tenantSlug: resolvedTenant.slug,
          action: 'auth.login.failed',
          entityType: 'auth',
          entityId: loginDto.email,
          userEmail: loginDto.email,
          newValues: { reason: 'user_not_found' },
        });
        throw new UnauthorizedException('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await this.authService.verifyPassword(
        loginDto.password,
        user.passwordHash,
      );
      if (!isPasswordValid) {
        this.logger.warn(`Login failed: invalid password - ${loginDto.email} (tenant: ${resolvedTenant.slug})`);
        await this.authService.loginAttemptService.recordFailure(resolvedTenant.slug, req.ip || 'unknown-ip', loginDto.email);
        await this.auditService.logEvent({
          tenantSlug: resolvedTenant.slug,
          action: 'auth.login.failed',
          entityType: 'auth',
          entityId: user.id,
          userId: user.id,
          userEmail: user.email,
          role: user.role,
          newValues: { reason: 'invalid_password' },
        });
        throw new UnauthorizedException('Invalid email or password');
      }

      if (!user.isActive) {
        this.logger.warn(`Login failed: user inactive - ${loginDto.email} (tenant: ${resolvedTenant.slug})`);
        await this.authService.loginAttemptService.recordFailure(resolvedTenant.slug, req.ip || 'unknown-ip', loginDto.email);
        await this.auditService.logEvent({
          tenantSlug: resolvedTenant.slug,
          action: 'auth.login.failed',
          entityType: 'auth',
          entityId: user.id,
          userId: user.id,
          userEmail: user.email,
          role: user.role,
          newValues: { reason: 'inactive_user' },
        });
        throw new UnauthorizedException('User account is inactive');
      }

      // Generate tokens
      const authResponse = await this.authService.buildAuthResponse(
        user.id,
        user.email,
        req.tenantId,
        resolvedTenant.slug,
        user.role,
      );

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', authResponse.refreshToken, getRefreshCookieOptions(process.env));

      this.logger.log(`User logged in: ${user.email} (tenant: ${resolvedTenant.slug})`);
      await this.authService.loginAttemptService.recordSuccess(resolvedTenant.slug, req.ip || 'unknown-ip', loginDto.email);
      await this.auditService.logEvent({
        tenantSlug: resolvedTenant.slug,
        action: 'auth.login.success',
        entityType: 'auth',
        entityId: user.id,
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        newValues: { loginMethod: 'email_password' },
      });

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

  @Post('signup')
  @ApiOperation({ summary: 'Submit lab registration and request OTP verification' })
  @ApiBody({ type: SignupDto })
  @ApiResponse({ status: 201, description: 'Registration submitted, OTP sent', type: SignupResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate registration' })
  async signup(@Body() signupDto: SignupDto): Promise<SignupResponseDto> {
    return this.authService.signup(signupDto);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and transition to pending_approval state' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: 200, description: 'OTP verified, lab code generated', type: VerifyOtpResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid OTP or tenant not found' })
  @ApiResponse({ status: 409, description: 'OTP expired or max attempts exceeded' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    return this.otpService.verifyOtp(
      verifyOtpDto.tenantSlug,
      verifyOtpDto.email,
      verifyOtpDto.otpCode,
    );
  }

  @Post('resend-otp')
  @ApiOperation({ summary: 'Request OTP resend with cooldown enforcement' })
  @ApiBody({ type: ResendOtpDto })
  @ApiResponse({ status: 200, description: 'OTP resent successfully' })
  @ApiResponse({ status: 400, description: 'Tenant or email not found' })
  @ApiResponse({ status: 409, description: 'Resend cooldown not met or max resends exceeded' })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.otpService.resendOtp(resendOtpDto.tenantSlug, resendOtpDto.email);
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
    @Req() req: Request & { headers: { 'x-tenant-slug'?: string } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found - login required');
    }

    const tenantSlug = req.headers['x-tenant-slug'] ? String(req.headers['x-tenant-slug']) : 'unknown';

    try {
      // Validate refresh token and issue new tokens
      const authResponse = await this.authService.refreshAccessToken(refreshToken, tenantSlug);

      // Update refresh token in httpOnly cookie
      res.cookie('refreshToken', authResponse.refreshToken, getRefreshCookieOptions(process.env));

      this.logger.log('Access token refreshed');
      await this.auditService.logEvent({
        tenantSlug,
        action: 'auth.refresh.success',
        entityType: 'auth',
        entityId: 'refresh-token',
        newValues: { source: 'cookie', tokenRotated: true },
      });

      return authResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Token refresh error: ${message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout - revokes all refresh tokens' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const tenantSlug = req.headers['x-tenant-slug'] ? String(req.headers['x-tenant-slug']) : 'unknown';
    const userId = req.user?.sub;

    // Clear refresh token cookie
    res.clearCookie('refreshToken', clearRefreshCookieOptions(process.env));

    // Revoke all refresh tokens (logout from all devices)
    if (userId) {
      try {
        await this.authService.revokeRefreshTokens(userId, tenantSlug);
      } catch (error) {
        this.logger.warn(`Failed to revoke tokens during logout for user ${userId}:`, error);
      }
    }

    this.logger.log(`User ${userId} logged out`);
    await this.auditService.logEvent({
      tenantSlug,
      action: 'auth.logout.success',
      entityType: 'auth',
      entityId: userId || 'logout',
      userId,
      userEmail: req.user?.email,
      role: req.user?.role,
      newValues: { source: 'explicit_logout' },
    });

    return { message: 'Logout successful' };
  }
}

