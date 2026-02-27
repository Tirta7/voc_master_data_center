import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CafeService } from './cafe.service';
import { CafeController } from './cafe.controller';
import { MenuItem } from './entities/menu-item.entity';
import { Category } from './entities/category.entity';
import { OrderItem } from './entities/order-item.entity';
import { DailyOrderSummary } from './entities/daily-order-summary.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { KdsModule } from '../kds/kds.module';
import { TransactionModule } from '../transaction/transaction.module';
import { BilliardModule } from '../billiard/billiard.module';
import { PromoModule } from '../promo/promo.module';
import { ReportModule } from '../report/report.module';
import { SocketModule } from '../socket/socket.module';
import { FinanceModule } from '../finance/finance.module';

import { Recipe } from '../inventory/entities/recipe.entity';
import { Transaction } from '../transaction/entities/transaction.entity';

import { CafeTable } from '../cafe-table/entities/cafe-table.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, MenuItem, OrderItem, Recipe, DailyOrderSummary, Transaction, CafeTable]),
    InventoryModule,
    KdsModule,
    TransactionModule,
    SocketModule,
    PromoModule,
    ReportModule,
    FinanceModule,
    forwardRef(() => BilliardModule),
  ],

  controllers: [CafeController],
  providers: [CafeService],
  exports: [CafeService],
})
export class CafeModule { }
