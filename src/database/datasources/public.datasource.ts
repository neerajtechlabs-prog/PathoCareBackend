import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class PublicDataSourceService implements OnModuleInit {
  private dataSource!: DataSource;
  private readonly logger = new Logger(PublicDataSourceService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      this.dataSource = new DataSource({
        type: 'postgres',
        host: this.configService.get<string>('DB_HOST'),
        port: this.configService.get<number>('DB_PORT'),
        username: this.configService.get<string>('DB_USER'),
        password: this.configService.get<string>('DB_PASS'),
        database: this.configService.get<string>('DB_NAME'),
        schema: 'public',
        entities: [
          'dist/database/entities/public/**/*.entity.js',
        ],
        migrations: ['dist/database/migrations/public/**/*.js'],
        migrationsTableName: 'typeorm_migrations_public',
        synchronize: false,
        logging: this.configService.get<string>('NODE_ENV') === 'development',
        poolSize: 10,
        connectTimeoutMS: 5000,
      });

      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      this.logger.log('✅ Public DataSource initialized');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Public DataSource:', error);
      throw error;
    }
  }

  getDataSource(): DataSource {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      throw new Error('Public DataSource not initialized');
    }
    return this.dataSource;
  }

  async destroy(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
      this.logger.log('📌 Public DataSource destroyed');
    }
  }
}
