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
  ],
  providers: [AuthService, JwtStrategy, UsersRepository, JwtAuthGuard, RolesGuard, RefreshTokenRepository],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, UsersRepository, JwtAuthGuard, RolesGuard, RefreshTokenRepository],
})
export class AuthModule {}

