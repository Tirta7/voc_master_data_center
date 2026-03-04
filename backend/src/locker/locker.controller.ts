import { Controller, Get, Post, Body, Param, Patch, Delete, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LockerService } from './locker.service';

@Controller('lockers')
@UseGuards(AuthGuard('jwt'))
export class LockerController {
    constructor(private readonly lockerService: LockerService) { }

    @Get()
    findAll() {
        return this.lockerService.getAllLockers();
    }

    @Get('stats')
    getStats() {
        return this.lockerService.getStats();
    }

    @Post()
    create(@Body() dto: any) {
        return this.lockerService.createLocker(dto);
    }

    @Post('bulk')
    bulkCreate(@Body() dto: any) {
        return this.lockerService.bulkCreateLockers(dto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: any) {
        return this.lockerService.updateLocker(+id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.lockerService.deleteLocker(+id);
    }

    @Post(':id/checkin')
    checkIn(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
        return this.lockerService.checkIn(+id, {
            ...dto,
            handledById: req.user.id,
            handledByName: req.user.username,
        });
    }

    @Post(':id/verify-pin')
    verifyPin(@Param('id') id: string, @Body('pin') pin: string) {
        return this.lockerService.verifyPin(+id, pin);
    }

    @Post(':id/checkout')
    checkOut(@Param('id') id: string, @Body('pin') pin: string, @Request() req: any) {
        return this.lockerService.checkOut(+id, pin, req.user.username);
    }

    @Post(':id/force-checkout')
    forceCheckOut(@Param('id') id: string, @Request() req: any) {
        return this.lockerService.forceCheckOut(+id, req.user.username);
    }

    @Post(':id/unlock')
    unlock(@Param('id') id: string) {
        return this.lockerService.unlockByStaff(+id);
    }

    @Get('sessions/active')
    getActiveSessions() {
        return this.lockerService.getActiveSessions();
    }

    @Get('sessions/history')
    getHistory(@Query() query: any) {
        return this.lockerService.getHistory(query);
    }

    @Get('member-benefit/:id')
    getMemberBenefit(@Param('id') id: string) {
        return this.lockerService.getMemberLockerBenefit(+id);
    }
}
