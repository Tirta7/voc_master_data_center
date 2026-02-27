import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { CafeTableService } from './cafe-table.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('cafe-table')
@UseGuards(AuthGuard('jwt'))
export class CafeTableController {
    constructor(private readonly service: CafeTableService) { }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    @Get()
    findAll() { return this.service.findAll(); }

    @Post()
    create(@Body() body: { tableName: string; capacity?: number }) {
        return this.service.create(body);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
        return this.service.update(id, body);
    }

    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
        await this.service.remove(id);
        return { success: true };
    }

    // ── Session ───────────────────────────────────────────────────────────────

    @Post(':id/open')
    openSession(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { customerName?: string; memberId?: number },
        @Request() req: any
    ) { return this.service.openSession(id, body.customerName, req.user.id, body.memberId); }

    @Get(':id/active-transaction')
    getActiveTransaction(@Param('id', ParseIntPipe) id: number) {
        return this.service.getActiveTransaction(id);
    }

    @Post(':id/transfer-to-billiard')
    transferToBilliard(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { billiardTableId: number },
    ) { return this.service.transferToBilliard(id, body.billiardTableId); }

    @Post(':id/checkout')
    checkout(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { method: string; amount: number },
        @Request() req: any
    ) { return this.service.checkout(id, body, req.user.id); }

    @Post(':id/close')
    closeSession(@Param('id', ParseIntPipe) id: number) {
        return this.service.closeSession(id);
    }
}
