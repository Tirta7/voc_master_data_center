import { Controller, Get, Post, Patch, Put, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CafeService } from './cafe.service';
import { OrderItemStatus } from './entities/order-item.entity';

@Controller('cafe')
@UseGuards(AuthGuard('jwt'))
export class CafeController {
    constructor(private readonly cafeService: CafeService) { }

    @Get('menu')
    async getMenu() {
        return this.cafeService.getAllMenuItems();
    }

    @Get('categories')
    async getCategories() {
        return this.cafeService.findAllCategories();
    }

    @Post('categories')
    async createCategory(@Body() data: any) {
        return this.cafeService.createCategory(data);
    }

    @Patch('categories/:id')
    async updateCategory(@Param('id') id: number, @Body() data: any) {
        return this.cafeService.updateCategory(id, data);
    }

    @Delete('categories/:id')
    async deleteCategory(@Param('id') id: number) {
        return this.cafeService.deleteCategory(id);
    }

    @Get('orders/active')
    async getActiveOrders() {
        return this.cafeService.getActiveOrders();
    }

    @Post('menu')
    async createMenuItem(@Body() data: any) {
        return this.cafeService.createMenuItem(data);
    }

    @Get('menu/:id')
    async getMenuItem(@Param('id') id: number) {
        return this.cafeService.getMenuItemById(id);
    }

    @Patch('menu/:id')
    async updateMenuItem(@Param('id') id: number, @Body() data: any, @Request() req: any) {
        return this.cafeService.updateMenuItem(id, data, req.user.username);
    }

    @Delete('menu/:id')
    async deleteMenuItem(@Param('id') id: number) {
        await this.cafeService.deleteMenuItem(id);
        return { success: true };
    }

    @Put('menu/:id/recipes')
    async updateMenuItemRecipes(@Param('id') id: number, @Body('recipes') recipes: any[]) {
        return this.cafeService.updateMenuItemRecipes(id, recipes);
    }

    @Post('order')
    async placeOrder(
        @Body() orderData: { items: { id?: number; promoId?: number; quantity: number }[], tableId?: number, transactionId?: number },
        @Request() req: any
    ) {
        await this.cafeService.processOrder(orderData.items, orderData.tableId, orderData.transactionId, req.user.id, req.user.username);
        return { success: true, message: 'Order processed and stock deducted' };
    }

    @Patch('order/item/:id/status')
    async updateOrderItemStatus(@Param('id') id: number, @Body('status') status: OrderItemStatus, @Request() req: any) {
        return this.cafeService.updateOrderItemStatus(id, status, req.user.id, req.user.username);
    }

    @Get('orders/history')
    async getOrderHistory() {
        return this.cafeService.getCompletedOrders();
    }

    @Get('summary/:station')
    async getSummary(@Param('station') station: string) {
        return this.cafeService.getDailyStationSummary(station);
    }

    @Patch('order/item/:id/cancel')
    async cancelOrderItem(
        @Param('id') id: number,
        @Body('reason') reason: string,
        @Body('user') user: string
    ) {
        return this.cafeService.cancelOrderItem(id, reason, user);
    }

    @Patch('order/item/:id/confirm-cancel')
    async confirmCancel(@Param('id') id: number, @Body('user') user: string) {
        return this.cafeService.confirmCancelOrderItem(id, user);
    }

    @Patch('order/item/:id/reject-cancel')
    async rejectCancel(@Param('id') id: number, @Body('user') user: string) {
        return this.cafeService.rejectCancelOrderItem(id, user);
    }
}
