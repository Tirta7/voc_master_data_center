import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { Expense } from './entities/expense.entity';
import { Cashflow } from './entities/cashflow.entity';
import { BusinessDay } from './entities/business-day.entity';
import { Shift } from './entities/shift.entity';
import { ShiftService } from './shift.service';
import { ShiftController } from './shift.controller';
import { Transaction } from '../transaction/entities/transaction.entity';
import { User } from '../user/entities/user.entity';
import { Setting } from '../settings/entities/setting.entity';

import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense, Cashflow, BusinessDay, Shift, Transaction, User, Setting]),
    SocketModule
  ],
  controllers: [FinanceController, ShiftController],
  providers: [FinanceService, ShiftService],
  exports: [FinanceService, ShiftService],
})
export class FinanceModule { }
