import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { WebhookService, PaymentNotificationDto } from './webhook.service';

@SkipThrottle()
@Controller(['api/webhook', 'webhook'])
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Universal Payment Webhook Notification Endpoint
   * POST /api/webhook/payment-notification
   * POST /webhook/payment-notification
   *
   * Header:
   *   X-VOCML-Secret: <SECRET_KEY>
   *
   * Payload:
   * {
   *   "provider": "MANDIRI" | "BCA" | "BRI" | "SHOPEEPAY" | "EDC_QRIS",
   *   "source_name": "Bank BCA (EDC BCA)" / "Bank Mandiri (QRIS Mandiri)",
   *   "method": "EDC" | "QRIS" | "TRANSFER",
   *   "amount": 75000,
   *   "title": "...",
   *   "text": "..."
   * }
   */
  @Post('payment-notification')
  @HttpCode(HttpStatus.OK)
  async handlePaymentNotification(
    @Body() payload: PaymentNotificationDto,
    @Headers('x-vocml-secret') vocmlSecret?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const secret = vocmlSecret || authHeader;
    return this.webhookService.handlePaymentNotification(payload, secret);
  }
}
