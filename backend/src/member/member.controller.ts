import { MemberService } from './member.service';
import { AuthGuard } from '@nestjs/passport';
import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards, Request } from '@nestjs/common';

@Controller('members')
@UseGuards(AuthGuard('jwt'))
export class MemberController {
    constructor(private readonly memberService: MemberService) { }

    // --- Tier Endpoints ---
    @Get('tiers')
    async getAllTiers() {
        return this.memberService.getAllTiers();
    }

    @Post('tiers')
    async createTier(@Body() data: any) {
        return this.memberService.createTier(data);
    }

    @Patch('tiers/:id')
    async updateTier(@Param('id') id: number, @Body() data: any) {
        return this.memberService.updateTier(id, data);
    }

    @Delete('tiers/:id')
    async deleteTier(@Param('id') id: number) {
        return this.memberService.deleteTier(id);
    }

    // --- Member Endpoints ---
    @Get()
    async getAll() {
        return this.memberService.getAllMembers();
    }

    @Post()
    async create(@Body() data: any) {
        return this.memberService.createMember(data);
    }

    @Patch(':id')
    async update(@Param('id') id: number, @Body() data: any) {
        return this.memberService.updateMember(id, data);
    }

    @Delete(':id')
    async delete(@Param('id') id: number) {
        return this.memberService.deleteMember(id);
    }

    @Get('rfid/:uid')
    async getByRfid(@Param('uid') uid: string) {
        return this.memberService.getMemberByRfid(uid);
    }

    @Get('scan/:code')
    async getByCode(@Param('code') code: string, @Query('v') v?: string) {
        return this.memberService.getMemberByCode(code, v ? Number(v) : undefined);
    }

    @Patch(':id/topup')
    async topUp(@Param('id') id: number, @Body('amount') amount: number, @Body('paymentMethod') paymentMethod: string, @Request() req: any) {
        return this.memberService.topUp(id, amount, req.user?.id, paymentMethod);
    }

    @Get(':id/logs')
    async getActivityLogs(@Param('id') id: number) {
        return this.memberService.getMemberActivityLogs(id);
    }

    @Get(':id/card-url')
    async getCardUrl(@Param('id') id: number) {
        const cardUrl = await this.memberService.ensureCardGenerated(id);
        return { cardUrl };
    }

    @Post(':id/regenerate-qr')
    async regenerateQr(@Param('id') id: number) {
        return this.memberService.regenerateQrCode(id);
    }

    @Post(':id/resend-wa')
    async resendWa(@Param('id') id: number) {
        return this.memberService.sendWelcomeCard(id);
    }
}
