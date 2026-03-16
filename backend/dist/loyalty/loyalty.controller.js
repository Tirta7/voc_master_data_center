"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "LoyaltyController", {
    enumerable: true,
    get: function() {
        return LoyaltyController;
    }
});
const _common = require("@nestjs/common");
const _loyaltyservice = require("./loyalty.service");
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
let LoyaltyController = class LoyaltyController {
    async getCatalog() {
        return this.loyaltyService.getCatalog();
    }
    async getPortalMember(id) {
        return this.loyaltyService.getPortalMember(id);
    }
    async getPointLedger(memberId) {
        return this.loyaltyService.getPointLedger(memberId);
    }
    async redeem(memberId, rewardId, idempotencyKey) {
        return this.loyaltyService.redeem(memberId, rewardId, idempotencyKey);
    }
    async confirmRedeem(redeemToken) {
        return this.loyaltyService.confirmRedeem(redeemToken);
    }
    async playScratchBomb(memberId, betAmount) {
        return this.loyaltyService.playScratchBomb(memberId, betAmount);
    }
    async claimScratchWin(memberId, referenceId, securityHash) {
        return this.loyaltyService.claimScratchWin(memberId, referenceId, securityHash);
    }
    async buyScatter(memberId, tier, betAmount) {
        return this.loyaltyService.buyScatter(memberId, tier, betAmount);
    }
    async playMahjong(memberId) {
        return this.loyaltyService.playMahjongSlot(memberId);
    }
    async getMissions(memberId) {
        return this.loyaltyService.getMemberMissions(memberId);
    }
    async claimMission(memberId, missionId) {
        return this.loyaltyService.claimMissionReward(memberId, missionId);
    }
    // --- Admin API ---
    async getAllRewardsAdmin() {
        return this.loyaltyService.getAllRewardsAdmin();
    }
    async getRewardAnalysis(id) {
        return this.loyaltyService.getRewardMarginAnalysis(id);
    }
    async analyzePotential(menuItemId, pointCost) {
        return this.loyaltyService.analyzePotential(menuItemId, pointCost);
    }
    async createReward(data) {
        return this.loyaltyService.createReward(data);
    }
    async updateReward(id, data) {
        return this.loyaltyService.updateReward(id, data);
    }
    async deleteReward(id) {
        return this.loyaltyService.deleteReward(id);
    }
    async adjustPoint(memberId, amount, description) {
        return this.loyaltyService.adjustPoint(memberId, amount, description);
    }
    async getGameAnalytics() {
        return this.loyaltyService.getGameAnalytics();
    }
    async runARME() {
        return this.loyaltyService.autonomousRevenueManagementEngine();
    }
    async activateEmergencyBrake() {
        return this.loyaltyService.activateEmergencyBrake();
    }
    async getMemberWinStats() {
        return this.loyaltyService.getMemberWinStats();
    }
    async setTargetWinRate(memberId, targetWinRate) {
        return this.loyaltyService.setTargetWinRate(memberId, targetWinRate);
    }
    async getPublicStats() {
        return this.loyaltyService.getGameAnalytics();
    }
    constructor(loyaltyService){
        this.loyaltyService = loyaltyService;
    }
};
_ts_decorate([
    (0, _common.Get)('catalog'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "getCatalog", null);
_ts_decorate([
    (0, _common.Get)('portal/member/:id'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "getPortalMember", null);
_ts_decorate([
    (0, _common.Get)('ledger/:memberId'),
    _ts_param(0, (0, _common.Param)('memberId', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "getPointLedger", null);
_ts_decorate([
    (0, _common.Post)('redeem'),
    _ts_param(0, (0, _common.Body)('memberId', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)('rewardId', _common.ParseIntPipe)),
    _ts_param(2, (0, _common.Body)('idempotencyKey')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Number,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "redeem", null);
_ts_decorate([
    (0, _common.Post)('redeem/confirm'),
    _ts_param(0, (0, _common.Body)('redeemToken')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "confirmRedeem", null);
_ts_decorate([
    (0, _common.Post)('game/scratch'),
    _ts_param(0, (0, _common.Body)('memberId', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)('betAmount')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "playScratchBomb", null);
_ts_decorate([
    (0, _common.Post)('game/scratch/claim'),
    _ts_param(0, (0, _common.Body)('memberId', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)('referenceId')),
    _ts_param(2, (0, _common.Body)('security_hash')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "claimScratchWin", null);
_ts_decorate([
    (0, _common.Post)('game/scratch/scatter'),
    _ts_param(0, (0, _common.Body)('memberId', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)('tier', _common.ParseIntPipe)),
    _ts_param(2, (0, _common.Body)('betAmount')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Number,
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "buyScatter", null);
_ts_decorate([
    (0, _common.Post)('game/mahjong'),
    _ts_param(0, (0, _common.Body)('memberId', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "playMahjong", null);
_ts_decorate([
    (0, _common.Get)('missions/:memberId'),
    _ts_param(0, (0, _common.Param)('memberId', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "getMissions", null);
_ts_decorate([
    (0, _common.Post)('missions/claim'),
    _ts_param(0, (0, _common.Body)('memberId', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)('missionId', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "claimMission", null);
_ts_decorate([
    (0, _common.Get)('admin/rewards'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "getAllRewardsAdmin", null);
_ts_decorate([
    (0, _common.Get)('admin/rewards/:id/analysis'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "getRewardAnalysis", null);
_ts_decorate([
    (0, _common.Post)('admin/rewards/analyze-potential'),
    _ts_param(0, (0, _common.Body)('menuItemId', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)('pointCost', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "analyzePotential", null);
_ts_decorate([
    (0, _common.Post)('admin/rewards'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Partial === "undefined" ? Object : Partial
    ]),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "createReward", null);
_ts_decorate([
    (0, _common.Put)('admin/rewards/:id'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof Partial === "undefined" ? Object : Partial
    ]),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "updateReward", null);
_ts_decorate([
    (0, _common.Delete)('admin/rewards/:id'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "deleteReward", null);
_ts_decorate([
    (0, _common.Post)('admin/adjust'),
    _ts_param(0, (0, _common.Body)('memberId', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)('amount', _common.ParseIntPipe)),
    _ts_param(2, (0, _common.Body)('description')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Number,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "adjustPoint", null);
_ts_decorate([
    (0, _common.Get)('admin/analytics'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "getGameAnalytics", null);
_ts_decorate([
    (0, _common.Post)('admin/arme/run'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "runARME", null);
_ts_decorate([
    (0, _common.Post)('admin/emergency-brake'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "activateEmergencyBrake", null);
_ts_decorate([
    (0, _common.Get)('admin/members/win-stats'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "getMemberWinStats", null);
_ts_decorate([
    (0, _common.Post)('admin/members/target-winrate'),
    _ts_param(0, (0, _common.Body)('memberId', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)('targetWinRate')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "setTargetWinRate", null);
_ts_decorate([
    (0, _common.Get)('portal/game/stats'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], LoyaltyController.prototype, "getPublicStats", null);
LoyaltyController = _ts_decorate([
    (0, _common.Controller)('loyalty'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _loyaltyservice.LoyaltyService === "undefined" ? Object : _loyaltyservice.LoyaltyService
    ])
], LoyaltyController);

//# sourceMappingURL=loyalty.controller.js.map