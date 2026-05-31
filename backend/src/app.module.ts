import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SocketModule } from './socket/socket.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BilliardModule } from './billiard/billiard.module';
import { InventoryModule } from './inventory/inventory.module';
import { CafeModule } from './cafe/cafe.module';
import { KdsModule } from './kds/kds.module';
import { TransactionModule } from './transaction/transaction.module';
import { MemberModule } from './member/member.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { HardwareModule } from './hardware/hardware.module';
import { ReportModule } from './report/report.module';
import { SettingsModule } from './settings/settings.module';
import { FinanceModule } from './finance/finance.module';
import { SeederModule } from './seeder/seeder.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { PromoModule } from './promo/promo.module';
import { CafeTableModule } from './cafe-table/cafe-table.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { WaitingListModule } from './waiting-list/waiting-list.module';
import { MqttModule } from './mqtt/mqtt.module';
import { LockerModule } from './locker/locker.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { RedisModule } from './redis/redis.module';
import { AIModule } from './ai/ai.module';
import { ChatModule } from './chat/chat.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ApprovalModule } from './common/approval/approval.module';
import { ExternalSyncModule } from './external-sync/external-sync.module';
import { LicenseModule } from './license/license.module';
import { LicenseGuard } from './license/license.guard';
import { VoucherModule } from './voucher/voucher.module';
import { CategoryModule } from './category/category.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    // Rate Limiting: 1000 requests per 60s globally. Prevents API flooding for real-time dashboards.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('DATABASE_URL');
        if (url) {
          return {
            type: 'postgres',
            url: url,
            autoLoadEntities: true,
            synchronize: true,
            ssl: { rejectUnauthorized: false },
            // DB Connection Pool for 100+ concurrent tables
            extra: {
              max: 80,                     // Increased from 20 for 100+ tables
              min: 10,                     // Keep minimum 10 warm connections
              idleTimeoutMillis: 60000,   // Release idle connections after 60s
              connectionTimeoutMillis: 10000, // Increased timeout for peak load
            },
          };
        }
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE'),
          autoLoadEntities: true,
          synchronize: true,
          // DB Connection Pool for 100+ concurrent tables
          extra: {
            max: 80,
            min: 10,
            idleTimeoutMillis: 60000,
            connectionTimeoutMillis: 10000,
          },
        };
      },
      inject: [ConfigService],
    }),
    RedisModule, // Added global RedisModule
    BilliardModule,
    InventoryModule,
    CafeModule,
    KdsModule,
    TransactionModule,
    MemberModule,
    WhatsAppModule,
    HardwareModule,
    ReportModule,
    SettingsModule,
    FinanceModule,
    SeederModule,
    SocketModule,
    MaintenanceModule,
    PromoModule,
    CafeTableModule,
    UserModule,
    AuthModule,
    WaitingListModule,
    MqttModule,
    LockerModule,
    LoyaltyModule,
    AIModule,
    ChatModule,
    AttendanceModule,
    ApprovalModule,
    ExternalSyncModule,
    LicenseModule,
    VoucherModule,
    CategoryModule,
  ],

  controllers: [AppController],
  providers: [
    AppService,
    // Apply rate limiting globally to all HTTP endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Apply license enforcement globally — blokir semua API saat EXPIRED/BLOCKED
    {
      provide: APP_GUARD,
      useClass: LicenseGuard,
    },
  ],
})
export class AppModule {}
