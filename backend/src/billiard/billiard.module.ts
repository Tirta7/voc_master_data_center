import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { BilliardController } from './billiard.controller';
import { FirmwareController } from './firmware.controller';
import { BilliardService } from './billiard.service';
import { FirmwareService } from './firmware.service';
import { Table } from './entities/table.entity';
import { Session } from './entities/session.entity';
import { BilliardPackage } from './entities/billiard-package.entity';
import { TransactionModule } from '../transaction/transaction.module';
import { SettingsModule } from '../settings/settings.module';

import { SocketModule } from '../socket/socket.module';
import { PromoModule } from '../promo/promo.module';
import { CafeModule } from '../cafe/cafe.module';
import { ReportModule } from '../report/report.module';
import { WaitingListModule } from '../waiting-list/waiting-list.module';
import { MemberModule } from '../member/member.module';
import { MqttModule } from '../mqtt/mqtt.module';
import { AIModule } from '../ai/ai.module';
import { Member } from '../member/entities/member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Table, Session, BilliardPackage, Member]),
    forwardRef(() => TransactionModule),
    forwardRef(() => SocketModule),
    forwardRef(() => SettingsModule),
    forwardRef(() => PromoModule),
    forwardRef(() => CafeModule),
    forwardRef(() => ReportModule),
    forwardRef(() => WaitingListModule),
    forwardRef(() => MemberModule),
    forwardRef(() => MqttModule),
    forwardRef(() => AIModule),
  ],
  controllers: [BilliardController, FirmwareController],
  providers: [BilliardService, FirmwareService],
  exports: [BilliardService, FirmwareService],
})
export class BilliardModule {}
