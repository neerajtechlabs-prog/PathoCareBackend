import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { LoginAttemptService } from '../services/login-attempt.service';

@Injectable()
export class LoginThrottleGuard implements CanActivate {
  private readonly logger = new Logger(LoginThrottleGuard.name);

  constructor(private readonly loginAttemptService: LoginAttemptService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip || 'unknown-ip';
    const email = String(request.body?.email || 'unknown-email').toLowerCase();
    const tenantSlug = String(request.headers['x-tenant-slug'] || 'unknown-tenant');

    const outcome = await this.loginAttemptService.getStatus(tenantSlug, ip, email);

    if (!outcome.allowed) {
      this.logger.warn(`Login throttled for ${email} from ${ip}`);
      throw new HttpException(
        {
          message: 'Too many login attempts. Please try again later.',
          retryAfterSeconds: outcome.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
