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
import { InventoryModule } from '../inventory/inventory.module';

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
import { Ingredient } from '../inventory/entities/ingredient.entity';
import { Waste } from '../inventory/entities/waste.entity';
import { PublicHoliday, BusinessClosure } from '../settings/entities/holiday.entity';

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
      Promo,
      Ingredient,
      Waste,
      PublicHoliday,
      BusinessClosure,
    ]),
    forwardRef(() => SocketModule),
    forwardRef(() => ReportModule),
    forwardRef(() => ChatModule),
    forwardRef(() => FinanceModule),
    forwardRef(() => InventoryModule),
  ],
  controllers: [AIController],
  providers: [AIService, CoachingService],
  exports: [AIService, CoachingService],
})
export class AIModule {}
