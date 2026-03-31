import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { ClosingUploadController } from './closing-upload.controller';
import { Shift } from '../finance/entities/shift.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { Ingredient } from '../inventory/entities/ingredient.entity';
import { Expense } from '../finance/entities/expense.entity';
import { SettingsModule } from '../settings/settings.module';
import { MqttModule } from '../mqtt/mqtt.module';
import { SocketModule } from '../socket/socket.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { FinanceModule } from '../finance/finance.module';
import { UserModule } from '../user/user.module';
import { AIModule } from '../ai/ai.module';

import { AuditLog } from './entities/audit-log.entity';
import { OrderItem } from '../cafe/entities/order-item.entity';
import { MenuItem } from '../cafe/entities/menu-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Shift,
      Transaction,
      Ingredient,
      Expense,
      AuditLog,
      OrderItem,
      MenuItem,
    ]),

    forwardRef(() => SettingsModule),
    MqttModule,
    forwardRef(() => SocketModule),
    WhatsAppModule,
    FinanceModule,
    forwardRef(() => UserModule),
    forwardRef(() => AIModule),
  ],
  controllers: [ReportController, ClosingUploadController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
