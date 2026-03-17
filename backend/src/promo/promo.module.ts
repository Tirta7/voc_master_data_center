import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promo } from './entities/promo.entity';
import { PromoService } from './promo.service';
import { PromoController } from './promo.controller';
import { Transaction } from '../transaction/entities/transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Promo, Transaction])],
  providers: [PromoService],
  controllers: [PromoController],
  exports: [PromoService],
})
export class PromoModule {}
