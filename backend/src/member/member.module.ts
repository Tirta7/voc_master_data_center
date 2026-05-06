import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { Member } from './entities/member.entity';
import { MemberTier } from './entities/member-tier.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { Shift } from '../finance/entities/shift.entity';
import { FinanceModule } from '../finance/finance.module';
import { SocketModule } from '../socket/socket.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member, MemberTier, Transaction, Shift]),
    FinanceModule,
    forwardRef(() => SocketModule),
    SettingsModule,
  ],
  controllers: [MemberController],
  providers: [MemberService],
  exports: [MemberService],
})
export class MemberModule {}
