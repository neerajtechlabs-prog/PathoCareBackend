import { BadRequestException, Injectable, Logger, NestMiddleware, NotFoundException, Optional } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PublicDataSourceService } from '../../database/datasources/public.datasource';
import { AuditService } from '../audit/audit.service';
import { TenantCacheEntry, TenantCacheService } from './tenant-cache.service';

interface TenantRequest extends Request {
  tenantId?: string;
  tenantSlug?: string;
  tenantSchema?: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(
    private readonly publicDataSourceService: PublicDataSourceService,
    private readonly auditService: AuditService,
    @Optional() private readonly tenantCacheService?: TenantCacheService,
  ) {}

  private isExemptPath(req: TenantRequest): boolean {
    const originalUrl = (req.originalUrl || req.url || '').split('?')[0].replace(/\/+$/, '') || '/';
    const normalizedPath = (req.path || '').split('?')[0].replace(/\/+$/, '') || '/';
    const basePath = (req.baseUrl || '').split('?')[0].replace(/\/+$/, '') || '/';

    const candidates = [originalUrl, normalizedPath, basePath];

    return candidates.some((candidate) => {
      const normalizedCandidate = candidate || '/';

      return normalizedCandidate === '/health'
        || normalizedCandidate.startsWith('/health/')
        || normalizedCandidate.startsWith('/api-docs')
        || normalizedCandidate === '/auth/signup'
        || normalizedCandidate === '/api/auth/signup'
        || normalizedCandidate === '/auth/login'
        || normalizedCandidate === '/api/auth/login'
        || normalizedCandidate === '/auth/verify-otp'
        || normalizedCandidate === '/api/auth/verify-otp'
        || normalizedCandidate === '/auth/resend-otp'
        || normalizedCandidate === '/api/auth/resend-otp'
        || (normalizedCandidate === '/signup' && (basePath === '/auth' || basePath === '/api/auth'))
        || (normalizedCandidate === '/login' && (basePath === '/auth' || basePath === '/api/auth'))
        || (normalizedCandidate === '/verify-otp' && (basePath === '/auth' || basePath === '/api/auth'))
        || (normalizedCandidate === '/resend-otp' && (basePath === '/auth' || basePath === '/api/auth'));
    });
  }

  async use(req: TenantRequest, _res: Response, next: NextFunction): Promise<void> {
    if (this.isExemptPath(req)) {
      next();
      return;
    }

    const slug = req.headers['x-tenant-slug'];

    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      this.logger.warn(`Missing tenant header for ${req.path}`);
      await this.auditService.logEvent({
        tenantSlug: 'unknown',
        action: 'tenant.resolve.failed',
        entityType: 'tenant',
        entityId: req.path,
        newValues: { reason: 'missing_tenant_header' },
      });
      throw new BadRequestException('X-Tenant-Slug header is required');
    }

    const normalizedSlug = slug.trim();
    let tenant = await this.tenantCacheService?.get(normalizedSlug);

    if (!tenant) {
      const publicDataSource = this.publicDataSourceService.getDataSource();
      const result = await publicDataSource.query(
        'SELECT id, slug, schema_name FROM public.tenants WHERE slug = $1 LIMIT 1',
        [normalizedSlug],
      );

      if (!result || result.length === 0) {
        this.logger.warn(`Tenant not found: ${slug}`);
        await this.auditService.logEvent({
          tenantSlug: normalizedSlug,
          action: 'tenant.resolve.failed',
          entityType: 'tenant',
          entityId: normalizedSlug,
          newValues: { reason: 'tenant_not_found' },
        });
        throw new NotFoundException(`Tenant not found: ${slug}`);
      }

      const databaseTenant = result[0] as { id: string; slug: string; schema_name: string };
      tenant = {
        id: databaseTenant.id,
        slug: databaseTenant.slug,
        schemaName: databaseTenant.schema_name,
      } satisfies TenantCacheEntry;
      await this.tenantCacheService?.set(tenant);
    }

    req.tenantId = tenant.id;
    req.tenantSlug = tenant.slug;
    req.tenantSchema = tenant.schemaName;

    this.logger.debug(`Tenant resolved: ${tenant.slug} -> ${tenant.schemaName}`);
    next();
  }
}
