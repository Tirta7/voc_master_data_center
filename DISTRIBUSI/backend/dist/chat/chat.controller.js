"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ChatController", {
    enumerable: true,
    get: function() {
        return ChatController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _chatservice = require("./chat.service");
const _shiftservice = require("../finance/shift.service");
const _aiservice = require("../ai/ai.service");
const _eventsgateway = require("../socket/events.gateway");
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
let ChatController = class ChatController {
    async getActiveAdmin() {
        return this.shiftService.getActiveAdmin();
    }
    async getSuggestion(waiterId) {
        const activeBday = await this.aiService.getActiveBusinessDay();
        if (!activeBday) return {
            suggestion: 'Terus semangat melayani pelanggan!'
        };
        const perf = await this.shiftService.getActiveShift(+waiterId);
        const pulse = await this.aiService.calculatePerformanceAchievement(activeBday.id);
        // Simple logic for suggestion
        if (pulse && pulse.achievementPercent < 50) {
            return {
                suggestion: 'Halo, AI mendeteksi goal hari ini masih jauh. Coba tawarkan paket Billiard promo atau snack ke pelanggan ya!'
            };
        }
        return {
            suggestion: 'Kerja bagus! Terus pertahankan ritme pelayananmu.'
        };
    }
    async getHistory(req, otherUserId, limit) {
        return this.chatService.getConversation(req.user.id, +otherUserId, limit);
    }
    async getUnreadCount(req) {
        const count = await this.chatService.getUnreadCount(req.user.id);
        return {
            count
        };
    }
    async markRead(req, senderId) {
        const sid = senderId === 'all' ? undefined : +senderId;
        await this.chatService.markAsRead(req.user.id, sid);
        // Phase 47: Tell frontend to refresh unread badges
        this.eventsGateway.broadcastUnreadCount(req.user.id);
        return {
            success: true
        };
    }
    async getManagementHistory(req) {
        return this.chatService.getManagementHistory(req.user.id);
    }
    constructor(chatService, shiftService, aiService, eventsGateway){
        this.chatService = chatService;
        this.shiftService = shiftService;
        this.aiService = aiService;
        this.eventsGateway = eventsGateway;
    }
};
_ts_decorate([
    (0, _common.Get)('active-admin'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], ChatController.prototype, "getActiveAdmin", null);
_ts_decorate([
    (0, _common.Get)('suggestion/:waiterId'),
    _ts_param(0, (0, _common.Param)('waiterId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ChatController.prototype, "getSuggestion", null);
_ts_decorate([
    (0, _common.Get)('history/:otherUserId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('otherUserId')),
    _ts_param(2, (0, _common.Query)('limit')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], ChatController.prototype, "getHistory", null);
_ts_decorate([
    (0, _common.Get)('unread-count'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ChatController.prototype, "getUnreadCount", null);
_ts_decorate([
    (0, _common.Patch)('read/:senderId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('senderId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ChatController.prototype, "markRead", null);
_ts_decorate([
    (0, _common.Get)('management-history'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ChatController.prototype, "getManagementHistory", null);
ChatController = _ts_decorate([
    (0, _common.Controller)('chat'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(3, (0, _common.Inject)((0, _common.forwardRef)(()=>_eventsgateway.EventsGateway))),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _chatservice.ChatService === "undefined" ? Object : _chatservice.ChatService,
        typeof _shiftservice.ShiftService === "undefined" ? Object : _shiftservice.ShiftService,
        typeof _aiservice.AIService === "undefined" ? Object : _aiservice.AIService,
        typeof _eventsgateway.EventsGateway === "undefined" ? Object : _eventsgateway.EventsGateway
    ])
], ChatController);

//# sourceMappingURL=chat.controller.js.map