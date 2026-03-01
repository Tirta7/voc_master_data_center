import { Module } from '@nestjs/common';
import { SocketModule } from './socket/socket.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BilliardModule } from './billiard/billiard.module';
import { SeederController } from './seeder/seeder.controller';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
