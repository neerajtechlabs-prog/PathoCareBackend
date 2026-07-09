import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

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
    // TODO: In Week 2, validate tenant exists in public.tenants table
    const schemaName = `tenant_${slug}`;

    const ds = new DataSource({
      type: 'postgres',
      host: this.configService.get<string>('DB_HOST'),
      port: this.configService.get<number>('DB_PORT'),
      username: this.configService.get<string>('DB_USER'),
      password: this.configService.get<string>('DB_PASS'),
      database: this.configService.get<string>('DB_NAME'),
      schema: schemaName,
      entities: ['dist/database/entities/tenant/**/*.entity.js'],
      migrations: ['dist/database/migrations/tenant/**/*.js'],
      migrationsTableName: 'typeorm_migrations_tenant',
      synchronize: false,
      logging: this.configService.get<string>('NODE_ENV') === 'development',
      poolSize: 5,
      connectTimeoutMS: 5000,
    });

    if (!ds.isInitialized) {
      await ds.initialize();
    }

    this.logger.debug(`✅ Tenant DataSource initialized for schema: ${schemaName}`);
    return ds;
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
