import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Locker } from './entities/locker.entity';
import { LockerSession } from './entities/locker-session.entity';
import { LockerService } from './locker.service';
import { LockerController } from './locker.controller';

import { MqttModule } from '../mqtt/mqtt.module';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Locker, LockerSession]),
    MqttModule,
    MemberModule,
  ],
  controllers: [LockerController],
  providers: [LockerService],
  exports: [LockerService],
})
export class LockerModule {}
