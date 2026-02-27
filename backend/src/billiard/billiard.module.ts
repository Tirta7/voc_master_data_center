import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { BilliardController } from './billiard.controller';
import { BilliardService } from './billiard.service';
import { Table } from './entities/table.entity';
import { Session } from './entities/session.entity';
import { BilliardPackage } from './entities/billiard-package.entity';
import { TransactionModule } from '../transaction/transaction.module';
import { SettingsModule } from '../settings/settings.module';

import { SocketModule } from '../socket/socket.module';
import { PromoModule } from '../promo/promo.module';
import { CafeModule } from '../cafe/cafe.module';
import { ReportModule } from '../report/report.module';
import { forwardRef } from '@nestjs/common';
import { WaitingListModule } from '../waiting-list/waiting-list.module';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Table, Session, BilliardPackage]),
    ScheduleModule.forRoot(),
    TransactionModule,
    SocketModule,
    SettingsModule,
    PromoModule,
    forwardRef(() => CafeModule),
    ReportModule,
    forwardRef(() => WaitingListModule),
    MemberModule,
    // ClientsModule.register([
    //   {
    //     name: 'MQTT_SERVICE',
    //     transport: Transport.MQTT,
    //     options: {
    //       url: process.env.MQTT_URL || 'mqtt://localhost:1883',
    //     },
    //   },
    // ]),
  ],
  controllers: [BilliardController],
  providers: [
    BilliardService,
    {
      provide: 'MQTT_SERVICE',
      useValue: {
        emit: () => { },
        connect: () => { },
        send: () => { },
      },
    }
  ],
  exports: [BilliardService],
})
export class BilliardModule { }
