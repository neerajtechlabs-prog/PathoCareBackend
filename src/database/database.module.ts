import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicDataSourceService } from './datasources/public.datasource';
import { TenantDataSourceService } from './datasources/tenant.datasource';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres' as const,
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASS'),
          database: configService.get<string>('DB_NAME'),
          schema: 'public',
          entities: ['dist/database/entities/public/**/*.entity.js'],
          migrations: ['dist/database/migrations/public/**/*.js'],
          migrationsTableName: 'typeorm_migrations_public',
          synchronize: false,
          logging: configService.get<string>('NODE_ENV') === 'development',
          poolSize: 10,
          connectTimeoutMS: 5000,
        };
      },
    }),
  ],
  providers: [PublicDataSourceService, TenantDataSourceService],
  exports: [PublicDataSourceService, TenantDataSourceService],
})
export class DatabaseModule {}
