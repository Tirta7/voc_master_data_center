import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { Expense } from './entities/expense.entity';
import { Cashflow } from './entities/cashflow.entity';
import { BusinessDay } from './entities/business-day.entity';
import { Shift } from './entities/shift.entity';
import { ShiftService } from './shift.service';
import { ShiftController } from './shift.controller';
import { ShiftStockReport } from './entities/shift-stock-report.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { User } from '../user/entities/user.entity';
import { Setting } from '../settings/entities/setting.entity';
import { Ingredient } from '../inventory/entities/ingredient.entity';
import { MenuItem } from '../cafe/entities/menu-item.entity';
import { OrderItem } from '../cafe/entities/order-item.entity';
import { PointLedger } from '../loyalty/entities/point-ledger.entity';

import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Expense,
      Cashflow,
      BusinessDay,
      Shift,
      ShiftStockReport,
      Transaction,
      User,
      Setting,
      Ingredient,
      MenuItem,
      OrderItem,
      PointLedger,
    ]),
    forwardRef(() => SocketModule),
  ],
  controllers: [FinanceController, ShiftController],
  providers: [FinanceService, ShiftService],
  exports: [FinanceService, ShiftService],
})
export class FinanceModule {}
