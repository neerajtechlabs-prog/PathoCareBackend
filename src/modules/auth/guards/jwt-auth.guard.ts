import { Injectable, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantSecurityGuard } from './tenant-security.guard';

/**
 * JWT Auth Guard - protects routes requiring valid JWT token
 * Usage: @UseGuards(JwtAuthGuard)
 */
@Injectable()
export class JwtAuthGuard extends TenantSecurityGuard {
  canActivate(context: ExecutionContext): boolean | Observable<boolean> | Promise<boolean> {
    return super.canActivate(context);
  }
}
