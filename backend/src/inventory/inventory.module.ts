import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { Ingredient } from './entities/ingredient.entity';
import { Recipe } from './entities/recipe.entity';

import { InventoryGateway } from './inventory.gateway';

import { PromoModule } from '../promo/promo.module';
import { ReportModule } from '../report/report.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { SettingsModule } from '../settings/settings.module';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ingredient, Recipe]),
    PromoModule,
    ReportModule,
    WhatsAppModule,
    SettingsModule,
    MqttModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryGateway],
  exports: [InventoryService, InventoryGateway],
})
export class InventoryModule {}
