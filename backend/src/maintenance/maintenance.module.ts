import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';
import { SocketModule } from '../socket/socket.module';

import { Transaction } from '../transaction/entities/transaction.entity';
import { TransactionPayment } from '../transaction/entities/transaction-payment.entity';
import { OrderItem } from '../cafe/entities/order-item.entity';
import { Cashflow } from '../finance/entities/cashflow.entity';
import { AuditLog } from '../report/entities/audit-log.entity';
import { Session } from '../billiard/entities/session.entity';
import { ChatMessage } from '../chat/entities/chat.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      OrderItem,
      Cashflow,
      Session,
      AuditLog,
      ChatMessage,
      TransactionPayment,
    ]),
    forwardRef(() => SocketModule),
    forwardRef(() => {
      const { SettingsModule } = require('../settings/settings.module');
      return SettingsModule;
    }),
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
