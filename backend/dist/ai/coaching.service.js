"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CoachingService", {
    enumerable: true,
    get: function() {
        return CoachingService;
    }
});
const _common = require("@nestjs/common");
const _schedule = require("@nestjs/schedule");
const _aiservice = require("./ai.service");
const _chatservice = require("../chat/chat.service");
const _shiftservice = require("../finance/shift.service");
const _eventsgateway = require("../socket/events.gateway");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _shiftentity = require("../finance/entities/shift.entity");
const _businessdayentity = require("../finance/entities/business-day.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let CoachingService = class CoachingService {
    shouldThrottle(userId, type) {
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
    async runAutomatedCoaching() {
        this.logger.log('CoachingService: Running automated tactical scan...');
        // 1. Get Active Business Day
        const activeBday = await this.businessDayRepo.findOne({
            where: {
                isClosed: false
            },
            order: {
                date: 'DESC'
            }
        });
        if (!activeBday) return;
        // 2. Get Open Shifts
        const openShifts = await this.shiftRepo.find({
            where: {
                status: _shiftentity.ShiftStatus.OPEN
            },
            relations: [
                'user',
                'user.role'
            ]
        });
        if (openShifts.length === 0) return;
        // 3. Scan for Opportunities
        await Promise.all([
            this.coachLowPerformanceWaiters(activeBday, openShifts),
            this.coachHighOccupancyUpsell(activeBday, openShifts),
            this.coachOverstockPush(activeBday, openShifts)
        ]);
    }
    async coachLowPerformanceWaiters(bday, shifts) {
        // Logic: Identify waiters with lower revenue than average
        const performancePulse = await this.aiService.calculatePerformanceAchievement(bday.id);
        if (!performancePulse) return;
        // For simplicity, let's get the performance summary of each shift
        const summaries = await Promise.all(shifts.map(async (s)=>{
            const perf = await this.shiftService.calculateShiftPerformance(s.id);
            return {
                shiftId: s.id,
                userId: s.userId,
                revenue: perf.cafeRevenue + perf.billiardRevenue,
                name: s.user?.name
            };
        }));
        const avgRevenue = summaries.reduce((s, x)=>s + x.revenue, 0) / summaries.length;
        for (const s of summaries){
            if (s.revenue < avgRevenue * 0.7 && s.revenue > 0) {
                if (this.shouldThrottle(s.userId, 'LOW_ROI')) continue;
                const message = `Halo ${s.name}, AI mendeteksi ROI-mu sedikit di bawah rata-rata hari ini. Coba tawarkan menu 'Best Seller' atau paket Billiard tambahan ke pelanggan di mejamu ya! Semangat! 💪`;
                await this.chatService.sendSystemMessage(s.userId, message, 'AI_COACH');
                this.eventsGateway.sendChatNotification(s.userId, {
                    message,
                    type: 'AI_COACH',
                    senderName: 'AI Coach'
                });
            }
        }
    }
    async coachHighOccupancyUpsell(bday, shifts) {
        // Logic: If occupancy > 70%, suggest fast-moving snacks/drinks
        const tablePulse = await this.aiService.calculatePerformanceAchievement(bday.id);
        const occupancy = tablePulse?.achievementPercent || 0; // Achievement as proxy
        if (occupancy > 70) {
            const message = "🔥 Restoran sedang ramai! Ini momen tepat untuk upselling minuman dingin atau cemilan cepat saji (Fast Bites). Ayo tingkatkan rata-rata struk!";
            for (const s of shifts){
                if (this.shouldThrottle(s.userId, 'UPSELL')) continue;
                await this.chatService.sendSystemMessage(s.userId, message, 'AI_COACH');
                this.eventsGateway.sendChatNotification(s.userId, {
                    message,
                    type: 'AI_COACH',
                    senderName: 'AI Coach'
                });
            }
        }
    }
    async coachOverstockPush(bday, shifts) {
        const plan = await this.aiService.getCurrentBattlePlan(bday.id);
        if (!plan) return;
        const overstockItems = plan.items.filter((it)=>it.aiLabel === '📦 OVERSTOCK' && it.soldQuantity < it.targetQuantity * 0.5);
        if (overstockItems.length > 0) {
            const topTarget = overstockItems[0];
            const itemName = topTarget.menuItem?.name || topTarget.billiardPackage?.name || 'Item';
            const message = `📢 Strategi Stok: Stok '${itemName}' sedang melimpah. Bantu AI habiskan target hari ini ya! Ada bonus performa untuk penjualan item ini. 📦`;
            for (const s of shifts){
                if (this.shouldThrottle(s.userId, 'OVERSTOCK')) continue;
                await this.chatService.sendSystemMessage(s.userId, message, 'AI_COACH');
                this.eventsGateway.sendChatNotification(s.userId, {
                    message,
                    type: 'AI_COACH',
                    senderName: 'AI Coach'
                });
            }
        }
    }
    constructor(aiService, chatService, shiftService, eventsGateway, shiftRepo, businessDayRepo){
        this.aiService = aiService;
        this.chatService = chatService;
        this.shiftService = shiftService;
        this.eventsGateway = eventsGateway;
        this.shiftRepo = shiftRepo;
        this.businessDayRepo = businessDayRepo;
        this.logger = new _common.Logger(CoachingService.name);
        this.lastSentMessages = new Map(); // key: userId_type, value: timestamp
    }
};
_ts_decorate([
    (0, _schedule.Cron)(_schedule.CronExpression.EVERY_30_MINUTES),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], CoachingService.prototype, "runAutomatedCoaching", null);
CoachingService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(4, (0, _typeorm.InjectRepository)(_shiftentity.Shift)),
    _ts_param(5, (0, _typeorm.InjectRepository)(_businessdayentity.BusinessDay)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _aiservice.AIService === "undefined" ? Object : _aiservice.AIService,
        typeof _chatservice.ChatService === "undefined" ? Object : _chatservice.ChatService,
        typeof _shiftservice.ShiftService === "undefined" ? Object : _shiftservice.ShiftService,
        typeof _eventsgateway.EventsGateway === "undefined" ? Object : _eventsgateway.EventsGateway,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository
    ])
], CoachingService);

//# sourceMappingURL=coaching.service.js.map