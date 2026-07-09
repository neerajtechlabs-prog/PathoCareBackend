import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';

export interface AuditEventInput {
  tenantSlug: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  userEmail?: string;
  role?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AuditLogQueryOptions {
  limit?: number;
  action?: string;
  userId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  private static readonly CRITICAL_ACTIONS = new Set([
    'auth.login.success',
    'auth.login.failed',
    'auth.refresh.success',
    'auth.logout.success',
    'auth.profile.viewed',
    'auth.role_denied',
    'tenant.resolve.failed',
    'tenants.info.accessed',
    'tenants.isolation.accessed',
    'users.created',
    'users.role.changed',
    'users.role.change.failed',
    'users.updated',
    'users.delete.failed',
    'users.deleted',
    'users.list.accessed',
    'doctors.created',
    'doctors.updated',
    'doctors.deleted',
    'patients.created',
    'patients.updated',
    'patients.deleted',
  ]);

  constructor(private readonly tenantDataSourceService: TenantDataSourceService) {}

  async logEvent(input: AuditEventInput): Promise<void> {
    if (!AuditService.CRITICAL_ACTIONS.has(input.action)) {
      return;
    }

    try {
      const tenantDS = await this.tenantDataSourceService.getForTenant(input.tenantSlug);
      const payload = [
        input.userId ?? null,
        input.action,
        input.entityType,
        input.entityId ?? null,
        JSON.stringify(input.oldValues ?? {}),
        JSON.stringify({
          tenantSlug: input.tenantSlug,
          userEmail: input.userEmail,
          role: input.role,
          metadata: input.metadata ?? {},
          ...input.newValues,
        }),
      ];

      await this.queryWithTableEnsure(
        tenantDS,
        `
          INSERT INTO audit_logs (
            user_id,
            action,
            entity_type,
            entity_id,
            old_values,
            new_values
          ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
        `,
        payload,
      );
    } catch (error) {
      this.logger.error(`Audit logging failed for ${input.tenantSlug}: ${input.action}`, error);
    }
  }

  async getLogs(tenantSlug: string, options: AuditLogQueryOptions = {}): Promise<any[]> {
    try {
      const tenantDS = await this.tenantDataSourceService.getForTenant(tenantSlug);
      const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
      const params: unknown[] = [limit];
      let whereClause = '';

      if (options.action) {
        whereClause += ' AND action = $2';
        params.push(options.action);
      }

      if (options.userId) {
        whereClause += ' AND user_id = $' + (params.length + 1);
        params.push(options.userId);
      }

      return await this.queryWithTableEnsure(
        tenantDS,
        `
          SELECT id, user_id, action, entity_type, entity_id, old_values, new_values, created_at
          FROM audit_logs
          WHERE 1=1 ${whereClause}
          ORDER BY created_at DESC
          LIMIT $1
        `,
        params,
      );
    } catch (error) {
      this.logger.error(`Failed to fetch audit logs for ${tenantSlug}`, error);
      return [];
    }
  }

  private async queryWithTableEnsure(tenantDS: DataSource, query: string, params?: unknown[]): Promise<any[]> {
    try {
      return await tenantDS.query(query, params);
    } catch (error) {
      if (!this.isMissingAuditTableError(error)) {
        throw error;
      }

      await this.ensureAuditTable(tenantDS);
      return await tenantDS.query(query, params);
    }
  }

  private async ensureAuditTable(tenantDS: DataSource): Promise<void> {
    await tenantDS.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await tenantDS.query(
      `
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100) NOT NULL,
          entity_id VARCHAR(100),
          old_values JSONB,
          new_values JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
      `,
      undefined,
    );
  }

  private isMissingAuditTableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /relation\s+"?audit_logs"?\s+does not exist/i.test(message);
  }
}
