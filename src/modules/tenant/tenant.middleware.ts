import { BadRequestException, Injectable, Logger, NestMiddleware, NotFoundException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PublicDataSourceService } from '../../database/datasources/public.datasource';
import { AuditService } from '../audit/audit.service';

interface TenantRequest extends Request {
  tenantSlug?: string;
  tenantSchema?: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(
    private readonly publicDataSourceService: PublicDataSourceService,
    private readonly auditService: AuditService,
  ) {}

  async use(req: TenantRequest, _res: Response, next: NextFunction): Promise<void> {
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

    const publicDataSource = this.publicDataSourceService.getDataSource();
    const result = await publicDataSource.query(
      'SELECT slug, schema_name FROM public.tenants WHERE slug = $1 LIMIT 1',
      [slug.trim()],
    );

    if (!result || result.length === 0) {
      this.logger.warn(`Tenant not found: ${slug}`);
      await this.auditService.logEvent({
        tenantSlug: slug.trim(),
        action: 'tenant.resolve.failed',
        entityType: 'tenant',
        entityId: slug.trim(),
        newValues: { reason: 'tenant_not_found' },
      });
      throw new NotFoundException(`Tenant not found: ${slug}`);
    }

    const tenant = result[0] as { slug: string; schema_name: string };
    req.tenantSlug = tenant.slug;
    req.tenantSchema = tenant.schema_name;

    this.logger.debug(`Tenant resolved: ${tenant.slug} -> ${tenant.schema_name}`);
    next();
  }
}
