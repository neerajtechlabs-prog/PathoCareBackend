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
import { UsersRepository } from '../users/users.repository';
import { User } from '../../database/entities/tenant/user.entity';
import { RefreshToken } from '../../database/entities/tenant/refresh-token.entity';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { LoginAttemptService } from './services/login-attempt.service';
import { LoginThrottleGuard } from './guards/login-throttle.guard';
import { AuditModule } from '../audit/audit.module';

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
    AuditModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    UsersRepository,
    JwtAuthGuard,
    RolesGuard,
    LoginThrottleGuard,
    {
      provide: LoginAttemptService,
      useFactory: () => new LoginAttemptService(),
    },
    RefreshTokenRepository,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, UsersRepository, JwtAuthGuard, RolesGuard, LoginAttemptService, RefreshTokenRepository],
})
export class AuthModule {}

