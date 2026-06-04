import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PushNotificationService } from './push-notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 
import { ConfigService } from '@nestjs/config';

@Controller('push')
export class PushNotificationController {
  constructor(
    private readonly pushService: PushNotificationService,
    private readonly configService: ConfigService
  ) {}

  @Get('vapid-public-key')
  getPublicKey() {
    const key = this.configService.get<string>('VAPID_PUBLIC_KEY') || process.env.VAPID_PUBLIC_KEY;
    console.log('Fetching VAPID PUBLIC KEY:', key ? 'Found' : 'Missing');
    return { publicKey: key };
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  async subscribe(@Request() req: any, @Body() subscriptionDto: any) {
    await this.pushService.saveSubscription(req.user.id, subscriptionDto);
    return { success: true, message: 'Push subscription saved' };
  }

  @Get('debug-keys')
  debugKeys() {
    return {
      public: this.configService.get<string>('VAPID_PUBLIC_KEY') || process.env.VAPID_PUBLIC_KEY,
      private: this.configService.get<string>('VAPID_PRIVATE_KEY') || process.env.VAPID_PRIVATE_KEY,
    };
  }
}
