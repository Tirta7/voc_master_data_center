import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ExternalSyncService } from './external-sync.service';
import { ExternalSyncController } from './external-sync.controller';
import { ReportModule } from '../report/report.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ApprovalModule } from '../common/approval/approval.module';
import { AIModule } from '../ai/ai.module';
import { FinanceModule } from '../finance/finance.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    HttpModule,
    ReportModule,
    InventoryModule,
    ApprovalModule,
    AIModule,
    FinanceModule,
    UserModule,
  ],
  controllers: [ExternalSyncController],
  providers: [ExternalSyncService],
  exports: [ExternalSyncService],
})
export class ExternalSyncModule {}
