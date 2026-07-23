import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { isObservable, map, Observable } from 'rxjs';
import { JwtPayload } from '../strategies/jwt.strategy';

interface TenantAuthenticatedRequest {
  headers: { 'x-tenant-slug'?: string | string[] };
  tenantId?: string;
  user?: JwtPayload;
}

@Injectable()
export class TenantSecurityGuard extends PassportAuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Observable<boolean> | Promise<boolean> {
    const authenticationResult = super.canActivate(context);

    if (typeof authenticationResult === 'boolean') {
      return authenticationResult && this.assertTenantMatch(context);
    }

    if (isObservable(authenticationResult)) {
      return authenticationResult.pipe(
        map((authenticated) => authenticated && this.assertTenantMatch(context)),
      );
    }

    return authenticationResult.then(
      (authenticated) => authenticated && this.assertTenantMatch(context),
    );
  }

  assertTenantMatch(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantAuthenticatedRequest>();
    const headerValue = request.headers['x-tenant-slug'];
    const headerSlug = typeof headerValue === 'string' ? headerValue.trim() : '';
    const user = request.user;

    if (!headerSlug || !user?.tenantId || !user.tenantSlug) {
      throw new ForbiddenException('Tenant authentication context is incomplete');
    }

    if (headerSlug !== user.tenantSlug) {
      throw new ForbiddenException('Tenant header does not match the authenticated tenant');
    }

    if (request.tenantId && request.tenantId !== user.tenantId) {
      throw new ForbiddenException('Resolved tenant does not match the authenticated tenant');
    }

    return true;
  }
}
