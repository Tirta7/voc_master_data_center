import { MemberService } from './member.service';
import { AuthGuard } from '@nestjs/passport';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';

@Controller('members')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  // --- Tier Endpoints ---
  @Get('tiers')
  @UseGuards(AuthGuard('jwt'))
  async getAllTiers() {
    return this.memberService.getAllTiers();
  }

  @Post('tiers')
  @UseGuards(AuthGuard('jwt'))
  async createTier(@Body() data: any) {
    return this.memberService.createTier(data);
  }

  @Patch('tiers/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateTier(@Param('id') id: number, @Body() data: any) {
    return this.memberService.updateTier(id, data);
  }

  @Delete('tiers/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteTier(@Param('id') id: number) {
    return this.memberService.deleteTier(id);
  }

  // --- Member Endpoints ---
  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getAll() {
    return this.memberService.getAllMembers();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() data: any) {
    return this.memberService.createMember(data);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: number, @Body() data: any) {
    return this.memberService.updateMember(id, data);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async delete(@Param('id') id: number) {
    return this.memberService.deleteMember(id);
  }

  @Get('rfid/:uid')
  @UseGuards(AuthGuard('jwt'))
  async getByRfid(@Param('uid') uid: string) {
    return this.memberService.getMemberByRfid(uid);
  }

  @Get('scan/:code')
  async getByCode(@Param('code') code: string, @Query('v') v?: string) {
    return this.memberService.getMemberByCode(code, v ? Number(v) : undefined);
  }

  @Patch(':id/topup')
  @UseGuards(AuthGuard('jwt'))
  async topUp(
    @Param('id') id: number,
    @Body('amount') amount: number,
    @Body('paymentMethod') paymentMethod: string,
    @Request() req: any,
  ) {
    return this.memberService.topUp(id, amount, req.user?.id, paymentMethod);
  }

  @Get(':id/logs')
  @UseGuards(AuthGuard('jwt'))
  async getActivityLogs(@Param('id') id: number) {
    return this.memberService.getMemberActivityLogs(id);
  }

  @Get(':id/card-url')
  @UseGuards(AuthGuard('jwt'))
  async getCardUrl(@Param('id') id: number) {
    const cardUrl = await this.memberService.ensureCardGenerated(id);
    return { cardUrl };
  }

  @Post(':id/regenerate-qr')
  @UseGuards(AuthGuard('jwt'))
  async regenerateQr(@Param('id') id: number) {
    return this.memberService.regenerateQrCode(id);
  }

  @Post(':id/resend-wa')
  @UseGuards(AuthGuard('jwt'))
  async resendWa(@Param('id') id: number) {
    return this.memberService.sendWelcomeCard(id);
  }

  @Post('broadcast')
  @UseGuards(AuthGuard('jwt'))
  async broadcast(@Body('message') message: string) {
    return this.memberService.broadcastToAll(message);
  }
}
