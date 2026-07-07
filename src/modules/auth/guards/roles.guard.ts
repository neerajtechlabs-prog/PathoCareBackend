import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../../database/entities/tenant/user.entity';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.role) {
      void this.auditService.logEvent({
        tenantSlug: request.headers['x-tenant-slug'] ? String(request.headers['x-tenant-slug']) : 'unknown',
        action: 'auth.role_denied',
        entityType: 'auth',
        entityId: request.route?.path || request.path,
        newValues: { reason: 'missing_role', requiredRoles },
      });
      throw new ForbiddenException('User role is missing');
    }

    const hasRole = requiredRoles.includes(user.role as UserRole);
    if (!hasRole) {
      void this.auditService.logEvent({
        tenantSlug: request.headers['x-tenant-slug'] ? String(request.headers['x-tenant-slug']) : 'unknown',
        action: 'auth.role_denied',
        entityType: 'auth',
        entityId: request.route?.path || request.path,
        userId: user.sub,
        userEmail: user.email,
        role: user.role,
        newValues: { reason: 'insufficient_role', requiredRoles, currentRole: user.role },
      });
      throw new ForbiddenException('Insufficient role permissions');
    }

    return true;
  }
}
