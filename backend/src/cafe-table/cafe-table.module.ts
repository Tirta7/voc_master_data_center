import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CafeTable } from './entities/cafe-table.entity';
import { CafeTableService } from './cafe-table.service';
import { CafeTableController } from './cafe-table.controller';
import { Transaction } from '../transaction/entities/transaction.entity';
import { OrderItem } from '../cafe/entities/order-item.entity';

import { FinanceModule } from '../finance/finance.module';
import { SocketModule } from '../socket/socket.module';
import { TransactionModule } from '../transaction/transaction.module';
import { BilliardModule } from '../billiard/billiard.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CafeTable, Transaction, OrderItem]),
    forwardRef(() => FinanceModule),
    forwardRef(() => SocketModule),
    forwardRef(() => TransactionModule),
    forwardRef(() => BilliardModule),
    forwardRef(() => AIModule),
  ],
  providers: [CafeTableService],
  controllers: [CafeTableController],
  exports: [CafeTableService],
})
export class CafeTableModule {}
