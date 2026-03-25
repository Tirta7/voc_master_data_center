import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { BattlePlan } from './entities/battle-plan.entity';
import { BattlePlanItem } from './entities/battle-plan-item.entity';
import { MenuItem } from '../cafe/entities/menu-item.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { UpsellPrompt } from './entities/upsell-prompt.entity';
import { Promo } from '../promo/entities/promo.entity';

import { BusinessDay } from '../finance/entities/business-day.entity';
import { User } from '../user/entities/user.entity';
import { OrderItem } from '../cafe/entities/order-item.entity';
import { BilliardPackage } from '../billiard/entities/billiard-package.entity';
import { Table } from '../billiard/entities/table.entity';
import { CafeTable } from '../cafe-table/entities/cafe-table.entity';
import { Shift } from '../finance/entities/shift.entity';
import { Setting } from '../settings/entities/setting.entity';
import { SocketModule } from '../socket/socket.module';
import { ReportModule } from '../report/report.module';
import { ChatModule } from '../chat/chat.module';
import { FinanceModule } from '../finance/finance.module';
import { CoachingService } from './coaching.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BattlePlan, 
      BattlePlanItem, 
      MenuItem, 
      BilliardPackage,
      Table,
      CafeTable,
      Transaction, 
      BusinessDay,
      User,
      Shift,
      Setting,
      OrderItem,
      UpsellPrompt,
      Promo
    ]),
    forwardRef(() => SocketModule),
    forwardRef(() => ReportModule),
    forwardRef(() => ChatModule),
    forwardRef(() => FinanceModule),
  ],
  controllers: [AIController],
  providers: [AIService, CoachingService],
  exports: [AIService, CoachingService],
})
export class AIModule {}
