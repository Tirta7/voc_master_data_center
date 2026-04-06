import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('inventory')
@UseGuards(AuthGuard('jwt'))
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('ingredients')
  async getIngredients() {
    return this.inventoryService.getAllIngredients();
  }

  @Get('low-stock')
  async getLowStockItems() {
    return this.inventoryService.getLowStockItems();
  }

  @Get('mandatory-reporting')
  async getMandatoryReportingItems() {
    return this.inventoryService.getMandatoryReportingItems();
  }

  @Post('ingredients')
  async createIngredient(@Body() data: any) {
    return this.inventoryService.createIngredient(data);
  }

  @UseGuards(JwtAuthGuard)
  @Post('waste')
  async declareWaste(@Body() data: any, @Request() req: any) {
    return this.inventoryService.declareWaste({
      ...data,
      recordedByUserId: req.user.id,
    });
  }

  @Get('waste/history')
  async getWasteHistory() {
    // Basic history, could be expanded
    return []; 
  }

  @Patch('ingredients/:id')
  async updateIngredient(@Param('id') id: number, @Body() data: any, @Request() req: any) {
    return this.inventoryService.updateIngredient(id, data, req.user.id);
  }

  @Delete('ingredients/:id')
  async deleteIngredient(@Param('id') id: number) {
    await this.inventoryService.deleteIngredient(id);
    return { success: true };
  }

  @Patch('ingredients/:id/stock')
  async updateStock(
    @Param('id') id: number,
    @Body('quantity') quantity: number,
    @Body('type') type: 'add' | 'subtract',
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.inventoryService.updateStock(
      id,
      quantity,
      type,
      req.user.username,
      reason,
      undefined,
      req.user.id,
    );
  }

  @Post('menu-item/:id/recipe')
  async setRecipe(
    @Param('id') menuItemId: number,
    @Body('recipes') recipes: any[],
  ) {
    await this.inventoryService.setRecipe(menuItemId, recipes);
    return { success: true };
  }

  @Get('menu-availability')
  async getMenuAvailability() {
    return this.inventoryService.getMenuAvailability();
  }
}
