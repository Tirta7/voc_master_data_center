import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { PromoService } from './promo.service';
import { Promo } from './entities/promo.entity';

@Controller('admin/promos')
export class PromoController {
  constructor(private readonly promoService: PromoService) {}

  @Get()
  async findAll(): Promise<Promo[]> {
    return this.promoService.getAllPromos();
  }

  @Get('active')
  async findActive(): Promise<Promo[]> {
    return this.promoService.getActivePromos();
  }

  @Get('start-session')
  async findStartSession(): Promise<Promo[]> {
    return this.promoService.getStartSessionPromos();
  }

  @Get('menu-bundles')
  async findMenuBundles(): Promise<Promo[]> {
    return this.promoService.getMenuBundles();
  }

  @Post()
  async create(@Body() data: Partial<Promo>): Promise<Promo> {
    return this.promoService.createPromo(data);
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() data: Partial<Promo>,
  ): Promise<Promo> {
    return this.promoService.updatePromo(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: number): Promise<void> {
    return this.promoService.deletePromo(id);
  }
}
