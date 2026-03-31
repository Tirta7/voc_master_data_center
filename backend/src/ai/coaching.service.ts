import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AIService } from './ai.service';
import { ChatService } from '../chat/chat.service';
import { ShiftService } from '../finance/shift.service';
import { EventsGateway } from '../socket/events.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Shift, ShiftStatus } from '../finance/entities/shift.entity';
import { BusinessDay } from '../finance/entities/business-day.entity';

@Injectable()
export class CoachingService {
  private readonly logger = new Logger(CoachingService.name);
  private lastSentMessages = new Map<string, number>(); // key: userId_type, value: timestamp

  constructor(
    private readonly aiService: AIService,
    private readonly chatService: ChatService,
    private readonly shiftService: ShiftService,
    private readonly eventsGateway: EventsGateway,
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
    @InjectRepository(BusinessDay)
    private readonly businessDayRepo: Repository<BusinessDay>,
  ) {}

  private shouldThrottle(userId: number, type: string): boolean {
    const key = `${userId}_${type}`;
    const lastSent = this.lastSentMessages.get(key) || 0;
    const now = Date.now();
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

    if (now - lastSent < TWO_HOURS_MS) {
      return true;
    }

    this.lastSentMessages.set(key, now);
    return false;
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async runAutomatedCoaching() {
    this.logger.log('CoachingService: Running automated tactical scan...');

    // 1. Get Active Business Day
    const activeBday = await this.businessDayRepo.findOne({
      where: { isClosed: false },
      order: { date: 'DESC' },
    });
    if (!activeBday) return;

    // 2. Get Open Shifts
    const openShifts = await this.shiftRepo.find({
      where: { status: ShiftStatus.OPEN },
      relations: ['user', 'user.role'],
    });

    if (openShifts.length === 0) return;

    // 3. Scan for Opportunities
    await Promise.all([
      this.coachLowPerformanceWaiters(activeBday, openShifts),
      this.coachHighOccupancyUpsell(activeBday, openShifts),
      this.coachOverstockPush(activeBday, openShifts),
    ]);
  }

  private async coachLowPerformanceWaiters(bday: BusinessDay, shifts: Shift[]) {
    // Logic: Identify waiters with lower revenue than average
    const performancePulse =
      await this.aiService.calculatePerformanceAchievement(bday.id);
    if (!performancePulse) return;

    // For simplicity, let's get the performance summary of each shift
    const summaries = await Promise.all(
      shifts.map(async (s) => {
        const perf = await this.shiftService.calculateShiftPerformance(s.id);
        return {
          shiftId: s.id,
          userId: s.userId,
          revenue: perf.cafeRevenue + perf.billiardRevenue,
          name: s.user?.name,
        };
      }),
    );

    const avgRevenue =
      summaries.reduce((s, x) => s + x.revenue, 0) / summaries.length;

    for (const s of summaries) {
      if (s.revenue < avgRevenue * 0.7 && s.revenue > 0) {
        if (this.shouldThrottle(s.userId, 'LOW_ROI')) continue;

        const message = `Halo ${s.name}, AI mendeteksi ROI-mu sedikit di bawah rata-rata hari ini. Coba tawarkan menu 'Best Seller' atau paket Billiard tambahan ke pelanggan di mejamu ya! Semangat! 💪`;
        await this.chatService.sendSystemMessage(s.userId, message, 'AI_COACH');
        this.eventsGateway.sendChatNotification(s.userId, {
          message,
          type: 'AI_COACH',
          senderName: 'AI Coach',
        });
      }
    }
  }

  private async coachHighOccupancyUpsell(bday: BusinessDay, shifts: Shift[]) {
    // Logic: If occupancy > 70%, suggest fast-moving snacks/drinks
    const tablePulse = await this.aiService.calculatePerformanceAchievement(
      bday.id,
    );
    const occupancy = tablePulse?.achievementPercent || 0; // Achievement as proxy

    if (occupancy > 70) {
      const message =
        '🔥 Restoran sedang ramai! Ini momen tepat untuk upselling minuman dingin atau cemilan cepat saji (Fast Bites). Ayo tingkatkan rata-rata struk!';
      for (const s of shifts) {
        if (this.shouldThrottle(s.userId, 'UPSELL')) continue;
        await this.chatService.sendSystemMessage(s.userId, message, 'AI_COACH');
        this.eventsGateway.sendChatNotification(s.userId, {
          message,
          type: 'AI_COACH',
          senderName: 'AI Coach',
        });
      }
    }
  }

  private async coachOverstockPush(bday: BusinessDay, shifts: Shift[]) {
    const plan = await this.aiService.getCurrentBattlePlan(bday.id);
    if (!plan) return;

    const overstockItems = plan.items.filter(
      (it) =>
        it.aiLabel === '📦 OVERSTOCK' &&
        it.soldQuantity < it.targetQuantity * 0.5,
    );

    if (overstockItems.length > 0) {
      const topTarget = overstockItems[0];
      const itemName =
        topTarget.menuItem?.name || topTarget.billiardPackage?.name || 'Item';
      const message = `📢 Strategi Stok: Stok '${itemName}' sedang melimpah. Bantu AI habiskan target hari ini ya! Ada bonus performa untuk penjualan item ini. 📦`;

      for (const s of shifts) {
        if (this.shouldThrottle(s.userId, 'OVERSTOCK')) continue;
        await this.chatService.sendSystemMessage(s.userId, message, 'AI_COACH');
        this.eventsGateway.sendChatNotification(s.userId, {
          message,
          type: 'AI_COACH',
          senderName: 'AI Coach',
        });
      }
    }
  }
}
