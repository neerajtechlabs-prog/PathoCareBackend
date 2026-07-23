import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { DatabaseModule } from '../../database/database.module';
import { TenantModule } from '../tenant/tenant.module';
import { VerificationModule } from '../verification/otp.module';
import { UsersRepository } from '../users/users.repository';
import { User } from '../../database/entities/tenant/user.entity';
import { RefreshToken } from '../../database/entities/tenant/refresh-token.entity';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TenantSecurityGuard } from './guards/tenant-security.guard';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { LoginAttemptService } from './services/login-attempt.service';
import { LoginThrottleGuard } from './guards/login-throttle.guard';
import { AuditModule } from '../audit/audit.module';
import * as redis from 'redis';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, RefreshToken]),
    DatabaseModule,
    TenantModule,
    VerificationModule,
    AuditModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    UsersRepository,
    JwtAuthGuard,
    TenantSecurityGuard,
    RolesGuard,
    LoginThrottleGuard,
    {
      provide: LoginAttemptService,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST') || 'localhost';
        const port = configService.get<number>('REDIS_PORT') || 6379;
        const client = redis.createClient({ url: `redis://${host}:${port}` });
        return new LoginAttemptService(undefined, client);
      },
    },
    RefreshTokenRepository,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, UsersRepository, JwtAuthGuard, TenantSecurityGuard, RolesGuard, LoginAttemptService, RefreshTokenRepository],
})
export class AuthModule {}

