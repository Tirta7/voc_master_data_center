import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { Ingredient } from './entities/ingredient.entity';
import { Recipe } from './entities/recipe.entity';
import { Waste } from './entities/waste.entity';
import { Supplier } from './entities/supplier.entity';
import { StockIn } from './entities/stock-in.entity';
import { StockPayment } from './entities/stock-payment.entity';
import { StockInstallmentPlan } from './entities/stock-installment-plan.entity';
import { IngredientBatch } from './entities/ingredient-batch.entity';
import { InventoryGateway } from './inventory.gateway';
import { PromoModule } from '../promo/promo.module';
import { FinanceModule } from '../finance/finance.module';
import { ReportModule } from '../report/report.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { SettingsModule } from '../settings/settings.module';
import { MqttModule } from '../mqtt/mqtt.module';
import { CafeModule } from '../cafe/cafe.module';
import { SocketModule } from '../socket/socket.module';

import { ApprovalModule } from '../common/approval/approval.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ingredient, Recipe, Waste, Supplier, StockIn, StockPayment, StockInstallmentPlan, IngredientBatch]),
    PromoModule,
    forwardRef(() => FinanceModule),
    forwardRef(() => ReportModule),
    WhatsAppModule,
    SettingsModule,
    MqttModule,
    ApprovalModule,
    forwardRef(() => CafeModule),
    forwardRef(() => SocketModule),
  ],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryGateway],
  exports: [InventoryService, InventoryGateway],
})
export class InventoryModule {}
