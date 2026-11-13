import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { Transaction } from '../transaction/entities/transaction.entity';
import { Table } from '../billiard/entities/table.entity';
import { CafeTable } from '../cafe-table/entities/cafe-table.entity';
import { TransactionModule } from '../transaction/transaction.module';
import { SettingsModule } from '../settings/settings.module';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Table, CafeTable]),
    forwardRef(() => TransactionModule),
    forwardRef(() => SettingsModule),
    forwardRef(() => SocketModule),
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}

