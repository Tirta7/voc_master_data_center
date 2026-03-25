import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  getStatus() {
    return this.whatsappService.getStatus();
  }

  @Post('reconnect')
  @UseGuards(AuthGuard('jwt'))
  async reconnect() {
    await this.whatsappService.connectToWhatsApp();
    return { message: 'Attempting to reconnect...' };
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout() {
    return this.whatsappService.logout();
  }

  @Post('send')
  @UseGuards(AuthGuard('jwt'))
  async sendMessage(@Body() data: { target: string; message: string }) {
    const result = await this.whatsappService.sendMessage(
      data.target,
      data.message,
    );
    if (!result) throw new Error('Failed to send message or not connected');
    return result;
  }
}
