import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { Transaction } from './entities/transaction.entity';
import { TransactionPayment } from './entities/transaction-payment.entity';
import { OrderItem } from '../cafe/entities/order-item.entity';
import { InvoiceService } from './invoice.service';
import { SettingsModule } from '../settings/settings.module';
import { HardwareModule } from '../hardware/hardware.module';
import { FinanceModule } from '../finance/finance.module';
import { SocketModule } from '../socket/socket.module';
import { BilliardPackage } from '../billiard/entities/billiard-package.entity';
import { Table } from '../billiard/entities/table.entity';
import { CafeTable } from '../cafe-table/entities/cafe-table.entity';
import { PromoModule } from '../promo/promo.module';
import { ReportModule } from '../report/report.module';
import { Member } from '../member/entities/member.entity';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      OrderItem,
      Table,
      CafeTable,
      BilliardPackage,
      TransactionPayment,
      Member,
    ]),
    SettingsModule,
    HardwareModule,
    FinanceModule,
    SocketModule,
    PromoModule,
    ReportModule,
    MemberModule,
  ],

  controllers: [TransactionController],
  providers: [TransactionService, InvoiceService],
  exports: [TransactionService, InvoiceService],
})
export class TransactionModule {}
