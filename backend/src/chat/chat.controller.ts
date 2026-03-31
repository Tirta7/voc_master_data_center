import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Patch,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { ShiftService } from '../finance/shift.service';
import { AIService } from '../ai/ai.service';
import { EventsGateway } from '../socket/events.gateway';
import { Inject, forwardRef } from '@nestjs/common';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly shiftService: ShiftService,
    private readonly aiService: AIService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  @Get('active-admin')
  async getActiveAdmin() {
    return this.shiftService.getActiveAdmin();
  }

  @Get('suggestion/:waiterId')
  async getSuggestion(@Param('waiterId') waiterId: string) {
    const activeBday = await this.aiService.getActiveBusinessDay();
    if (!activeBday)
      return { suggestion: 'Terus semangat melayani pelanggan!' };

    const perf = await this.shiftService.getActiveShift(+waiterId);
    const pulse = await this.aiService.calculatePerformanceAchievement(
      activeBday.id,
    );

    // Simple logic for suggestion
    if (pulse && pulse.achievementPercent < 50) {
      return {
        suggestion:
          'Halo, AI mendeteksi goal hari ini masih jauh. Coba tawarkan paket Billiard promo atau snack ke pelanggan ya!',
      };
    }
    return { suggestion: 'Kerja bagus! Terus pertahankan ritme pelayananmu.' };
  }

  @Get('history/:otherUserId')
  async getHistory(
    @Request() req: any,
    @Param('otherUserId') otherUserId: string,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getConversation(req.user.id, +otherUserId, limit);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const count = await this.chatService.getUnreadCount(req.user.id);
    return { count };
  }

  @Patch('read/:senderId')
  async markRead(@Request() req: any, @Param('senderId') senderId: string) {
    const sid = senderId === 'all' ? undefined : +senderId;
    await this.chatService.markAsRead(req.user.id, sid);

    // Phase 47: Tell frontend to refresh unread badges
    this.eventsGateway.broadcastUnreadCount(req.user.id);

    return { success: true };
  }

  @Get('management-history')
  async getManagementHistory(@Request() req: any) {
    return this.chatService.getManagementHistory(req.user.id);
  }
}
