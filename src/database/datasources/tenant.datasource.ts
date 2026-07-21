import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { basename, join } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { tenantEntities } from '../entities/tenant';
import { ensureLabCrudTables } from '../seeds/lab-crud-bootstrap';

interface QueryRunnerLike {
  query(query: string, params?: unknown[]): Promise<any>;
}

@Injectable()
export class TenantDataSourceService {
  private dataSources = new Map<string, DataSource>();
  private readonly logger = new Logger(TenantDataSourceService.name);

  constructor(private configService: ConfigService) {}

  async getForTenant(slug: string): Promise<DataSource> {
    // Return cached datasource if exists
    if (this.dataSources.has(slug)) {
      const ds = this.dataSources.get(slug);
      if (ds && ds.isInitialized) {
        return ds;
      }
    }

    // Create new datasource for tenant
    try {
      const ds = await this.createForTenant(slug);
      this.dataSources.set(slug, ds);
      return ds;
    } catch (error) {
      this.logger.error(`Failed to create datasource for tenant ${slug}:`, error);
      throw error;
    }
  }
  private async createForTenant(slug: string): Promise<DataSource> {
    const schemaName = `tenant_${slug}`;
    const escapedSchemaName = schemaName.replace(/"/g, '""');

    const ds = new DataSource({
      type: 'postgres',
      host: this.configService.get<string>('DB_HOST'),
      port: this.configService.get<number>('DB_PORT'),
      username: this.configService.get<string>('DB_USER'),
      password: this.configService.get<string>('DB_PASS'),
      database: this.configService.get<string>('DB_NAME'),
      schema: schemaName,
      entities: tenantEntities,
      synchronize: false,
      logging: this.configService.get<string>('NODE_ENV') === 'development',
      poolSize: 5,
      connectTimeoutMS: 5000,
      extra: {
        options: `-c search_path="${escapedSchemaName}",public`,
      },
    });

    if (!ds.isInitialized) {
      await ds.initialize();
    }

    try {
      await ds.query(`CREATE SCHEMA IF NOT EXISTS "${escapedSchemaName}"`);
      await this.ensureTenantSchema(ds, schemaName);
      await this.applyTenantSqlMigrations(ds, schemaName);
      this.logger.debug(`✅ Tenant schema bootstrapped for: ${schemaName}`);
    } catch (error) {
      this.logger.error(`Failed to bootstrap tenant schema ${schemaName}:`, error);
      throw error;
    }

    this.logger.debug(`✅ Tenant DataSource initialized for schema: ${schemaName}`);
    return ds;
  }

  private async ensureTenantSchema(ds: DataSource, schemaName: string): Promise<void> {
    await ds.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'Receptionist',
        is_active BOOLEAN DEFAULT true,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_${schemaName}_users_email ON ${schemaName}.users(email);
      CREATE INDEX IF NOT EXISTS idx_${schemaName}_users_role ON ${schemaName}.users(role);
      CREATE INDEX IF NOT EXISTS idx_${schemaName}_users_is_active ON ${schemaName}.users(is_active);
    `);

    await ds.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        family VARCHAR(50) NOT NULL,
        revoked BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        revoked_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_${schemaName}_refresh_tokens_user_id ON ${schemaName}.refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_${schemaName}_refresh_tokens_family ON ${schemaName}.refresh_tokens(family);
      CREATE INDEX IF NOT EXISTS idx_${schemaName}_refresh_tokens_revoked ON ${schemaName}.refresh_tokens(revoked);
      CREATE INDEX IF NOT EXISTS idx_${schemaName}_refresh_tokens_expires_at ON ${schemaName}.refresh_tokens(expires_at);
    `);

    await ds.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id VARCHAR(100),
        old_values JSONB,
        new_values JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_${schemaName}_audit_logs_user_id ON ${schemaName}.audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_${schemaName}_audit_logs_entity_type ON ${schemaName}.audit_logs(entity_type);
      CREATE INDEX IF NOT EXISTS idx_${schemaName}_audit_logs_created_at ON ${schemaName}.audit_logs(created_at DESC);
    `);

    await ds.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.notification_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_phone VARCHAR(20),
        recipient_email VARCHAR(255),
        notification_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        message TEXT,
        provider_response JSONB,
        attempts INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_${schemaName}_notification_logs_status ON ${schemaName}.notification_logs(status);
      CREATE INDEX IF NOT EXISTS idx_${schemaName}_notification_logs_created_at ON ${schemaName}.notification_logs(created_at DESC);
    `);

    await ensureLabCrudTables({ query: ds.query.bind(ds) } as QueryRunnerLike, schemaName);
  }

  private getTenantMigrationFiles(): string[] {
    const candidateDirs = [
      join(process.cwd(), 'dist/database/migrations/tenant'),
      join(process.cwd(), 'src/database/migrations/tenant'),
    ];

    const files: string[] = [];
    for (const dir of candidateDirs) {
      if (!existsSync(dir)) {
        continue;
      }

      for (const entry of readdirSync(dir).sort()) {
        if (entry.toLowerCase().endsWith('.sql')) {
          files.push(join(dir, entry));
        }
      }
    }

    return files;
  }

  private async applyTenantSqlMigrations(ds: DataSource, schemaName: string): Promise<void> {
    const migrationTable = 'typeorm_migrations_tenant';

    await ds.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.${migrationTable} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        run_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const appliedRows: Array<{ name: string }> = await ds.query(`
      SELECT name
      FROM ${schemaName}.${migrationTable}
    `);
    const appliedNames = new Set(appliedRows.map((row) => row.name));

    const migrationFiles = this.getTenantMigrationFiles();
    for (const filePath of migrationFiles) {
      const fileName = basename(filePath);
      if (appliedNames.has(fileName)) {
        continue;
      }

      const sql = readFileSync(filePath, 'utf8').trim();
      if (!sql) {
        continue;
      }

      const statements = sql
        .split(/;\s*(?:\r?\n|$)/g)
        .map((statement) => statement.trim())
        .filter(Boolean);

      for (const statement of statements) {
        await ds.query(statement);
      }

      await ds.query(`INSERT INTO ${schemaName}.${migrationTable} (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [fileName]);

      this.logger.log(`✅ Applied tenant migration file ${fileName} for schema ${schemaName}`);
    }
  }

  async removeForTenant(slug: string): Promise<void> {
    const ds = this.dataSources.get(slug);
    if (ds?.isInitialized) {
      await ds.destroy();
      this.logger.debug(`📌 Tenant DataSource destroyed for: ${slug}`);
    }
    this.dataSources.delete(slug);
  }

  async destroyAll(): Promise<void> {
    for (const [slug, ds] of this.dataSources.entries()) {
      if (ds?.isInitialized) {
        await ds.destroy();
        this.logger.debug(`📌 Tenant DataSource destroyed for: ${slug}`);
      }
    }
    this.dataSources.clear();
  }
}
