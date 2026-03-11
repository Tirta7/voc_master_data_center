import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { PointReward } from './entities/point-reward.entity';
import { PointLedger } from './entities/point-ledger.entity';
import { MemberModule } from '../member/member.module';
import { Member } from '../member/entities/member.entity';
import { SettingsModule } from '../settings/settings.module';

import { CafeModule } from '../cafe/cafe.module';
import { SocketModule } from '../socket/socket.module';

import { Mission, MemberMission } from './entities/mission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PointReward,
      PointLedger,
      Member,
      Mission,
      MemberMission,
    ]),
    MemberModule,
    SettingsModule,
    CafeModule,
    SocketModule,
  ],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
