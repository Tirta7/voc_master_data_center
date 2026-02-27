import { Controller, Get, Post, Body, Param, Patch, Delete, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WaitingListService } from './waiting-list.service';
import { WaitingList } from './entities/waiting-list.entity';

@Controller('waiting-list')
@UseGuards(AuthGuard('jwt'))
export class WaitingListController {
    constructor(private readonly waitingListService: WaitingListService) { }

    @Get()
    findAll(@Query('type') type?: string) {
        return this.waitingListService.findAll(type);
    }

    @Post()
    create(@Body() data: Partial<WaitingList>) {
        return this.waitingListService.create(data);
    }

    @Patch(':id/assign')
    assign(@Param('id') id: string, @Body('tableId') tableId: number, @Request() req: any) {
        return this.waitingListService.assignToTable(+id, tableId, req.user.id, req.user.username);
    }

    @Patch(':id/unassign')
    unassign(@Param('id') id: string, @Request() req: any) {
        return this.waitingListService.unassignTable(+id, req.user.id, req.user.username);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req: any) {
        return this.waitingListService.cancel(+id, req.user.id, req.user.username);
    }

    @Patch(':id/handle')
    handle(@Param('id') id: string, @Request() req: any) {
        return this.waitingListService.handle(+id, req.user.id, req.user.username);
    }

    @Patch(':id/unhandle')
    unhandle(@Param('id') id: string, @Request() req: any) {
        return this.waitingListService.unhandle(+id, req.user.id, req.user.username);
    }
}
