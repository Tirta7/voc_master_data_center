import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { AccessController } from './access.controller';

import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessRequest } from './entities/access-request.entity';
import { SettingsModule } from '../settings/settings.module';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [
    forwardRef(() => UserModule),
    PassportModule,
    forwardRef(() => SettingsModule),
    forwardRef(() => SocketModule),
    TypeOrmModule.forFeature([AccessRequest]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') || 'voc-secret-key-2026',
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController, AccessController],
  exports: [AuthService],
})
export class AuthModule {}
