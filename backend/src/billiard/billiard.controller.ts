import { Controller, Get, Post, Body, Param, Put, Patch, Delete, Logger, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BilliardService } from './billiard.service';
import { Table, TableStatus } from './entities/table.entity';

@Controller('billiard')
@UseGuards(AuthGuard('jwt'))
export class BilliardController {
    private readonly logger = new Logger(BilliardController.name);

    constructor(private readonly billiardService: BilliardService) { }

    @MessagePattern('billiard/table/+/status')
    async handleTableStatus(@Payload() data: any) {
        // Topic example: billiard/table/1/status
        // In a real scenario, you'd extract the ID from the topic if Nest doesn't do it automatically
        // For simulation, let's assume data has tableId
        if (data.tableId) {
            await this.billiardService.handleHeartbeat(data.tableId);
        }
    }

    @Get('tables')
    async getAllTables() {
        return this.billiardService.getAllTables();
    }

    @Get('tables/:id')
    async getTable(@Param('id') id: number) {
        return this.billiardService.getTableById(id);
    }

    @Get('packages')
    async getPackages() {
        return this.billiardService.getPackages();
    }

    @Post('packages')
    async createPackage(@Body() data: any) {
        return this.billiardService.createPackage(data);
    }

    @Delete('packages/:id')
    async deletePackage(@Param('id') id: number) {
        return this.billiardService.deletePackage(id);
    }

    @Patch('packages/:id')
    async updatePackage(@Param('id') id: number, @Body() data: any) {
        return this.billiardService.updatePackage(id, data);
    }

    @Post('tables')
    async createTable(@Body() tableData: Partial<Table>) {
        return this.billiardService.createTable(tableData);
    }

    @Patch('tables/:id')
    async updateTable(@Param('id') id: number, @Body() data: Partial<Table>) {
        return this.billiardService.updateTable(id, data);
    }

    @Delete('tables/:id')
    async deleteTable(@Param('id') id: number) {
        return this.billiardService.deleteTable(id);
    }

    @Patch('tables/:id/status')
    async updateStatus(@Param('id') id: number, @Body('status') status: TableStatus) {
        return this.billiardService.updateTableStatus(id, status);
    }

    @Patch('tables/:id/toggle-light')
    async toggleLight(@Param('id') id: string, @Body() body: { isOn: boolean }) {
        // Explicitly check body.isOn — @Body('isOn') drops false values
        const isOn = body?.isOn === true;
        return this.billiardService.toggleLight(+id, isOn);
    }

    // NOTE: ping-all must be BEFORE tables/:id/ping to avoid route collision
    @Post('tables/ping-all')
    async pingAllTables() {
        const tables = await this.billiardService.getAllTables();
        const results = await Promise.allSettled(
            tables.map(t => this.billiardService.pingTable(t.id))
        );
        return results.map((r, i) => ({
            tableId: tables[i].id,
            tableName: tables[i].tableName,
            status: r.status,
            result: r.status === 'fulfilled' ? r.value : { error: (r as any).reason?.message }
        }));
    }

    @Post('tables/:id/ping')
    async pingTable(@Param('id') id: string) {
        return this.billiardService.pingTable(+id);
    }

    @Post('tables/:id/start')
    async startSession(
        @Param('id') id: number,
        @Body() body: { type: 'prepaid' | 'open', duration?: number, customerName?: string, packageId?: number, customPriceSettings?: any, promoId?: number, memberId?: number },
        @Request() req: any
    ) {
        this.logger.log(`BilliardController.startSession: ${id}, user: ${req.user.id}, customer: ${body.customerName}, pkg: ${body.packageId}, member: ${body.memberId}`);
        return this.billiardService.startSession(id, body.type, body.duration, body.customerName, body.packageId, body.customPriceSettings, body.promoId, req.user.id, req.user.username, body.memberId);
    }

    @Post('tables/:id/stop')
    async stopSession(@Param('id') id: number, @Request() req: any) {
        return this.billiardService.stopSession(id, req.user.id, req.user.username);
    }

    @Patch('tables/:id/switch-session')
    async switchSession(
        @Param('id') id: number,
        @Body() body: { type: 'prepaid' | 'open', duration?: number }
    ) {
        return this.billiardService.switchSession(id, body.type, body.duration);
    }

    @Post('tables/:id/extend')
    async extendSession(
        @Param('id') id: number,
        @Body() body: { duration?: number; packageId?: number; ignoreConflict?: boolean },
        @Request() req: any
    ) {
        this.logger.log(`BilliardController.extendSession: Requested for table ${id} by ${req.user.username}. Duration: ${body.duration}, Pkg: ${body.packageId}`);
        return this.billiardService.extendSession(id, body.duration, body.packageId, req.user.username, body.ignoreConflict);
    }
    @Post('move')
    async moveTable(@Body() data: { fromTableId: number, toTableId: number }, @Request() req: any) {
        return this.billiardService.moveTable(data.fromTableId, data.toTableId, req.user.username);
    }

    @Post('tables/:id/reset')
    async resetTable(@Param('id') id: string) {
        return this.billiardService.resetTable(+id);
    }

    @Post('reset-all')
    async resetAllDbTables() {
        try {
            await this.billiardService['tableRepository'].query(`UPDATE tables SET status = 'AVAILABLE', active_transaction_id = NULL, start_time = NULL, end_time = NULL, duration = NULL, order_id = NULL`);
            await this.billiardService['tableRepository'].query(`UPDATE transactions SET status = 'COMPLETED', is_active = false WHERE status = 'ACTIVE' OR is_active = true`);
            return { message: 'Tables and transactions successfully reset.' };
        } catch (e) {
            this.logger.error(e);
            return { error: e.message };
        }
    }
}
