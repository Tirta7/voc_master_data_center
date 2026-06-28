"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AIController", {
    enumerable: true,
    get: function() {
        return AIController;
    }
});
const _common = require("@nestjs/common");
const _aiservice = require("./ai.service");
const _reportservice = require("../report/report.service");
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
let AIController = class AIController {
    async simulateTarget(revenue) {
        return this.aiService.calculateTargetMix(revenue);
    }
    async suggestTarget() {
        return this.aiService.suggestDailyTarget();
    }
    async autoSuggestAndPublish() {
        return this.aiService.autoSuggestAndPublish();
    }
    async predictTraffic() {
        return this.aiService.predictDailyTraffic();
    }
    async predictIntensity() {
        return this.aiService.getPeakIntensityPrediction();
    }
    async triggerStrategyBrief() {
        return this.aiService.generateDailyStrategyBrief();
    }
    async getBattlePlan(businessDayId) {
        return this.aiService.getCurrentBattlePlan(businessDayId);
    }
    async getActiveBattlePlan(businessDayId) {
        return this.aiService.getCurrentBattlePlan(businessDayId);
    }
    async saveBattlePlan(data) {
        return this.aiService.createOrUpdateBattlePlan(data);
    }
    async publishBattlePlan(id) {
        return this.aiService.publishBattlePlan(id);
    }
    async getWaiterPerformance() {
        return this.aiService.getWaiterPerformance();
    }
    async reoptimize(businessDayId) {
        return this.aiService.reoptimizeBattlePlan(businessDayId);
    }
    async getReport(businessDayId) {
        return this.aiService.generatePerformanceReport(businessDayId);
    }
    async manualBroadcast(data) {
        return this.aiService.manualBroadcastItem(data.itemId, data.type);
    }
    async acknowledgePrompt(id) {
        return this.aiService.acknowledgePrompt(id);
    }
    async getCampaignStats(businessDayId) {
        return this.aiService.getActiveCampaignStats(businessDayId);
    }
    async getHistory(limit) {
        return this.aiService.getBattlePlanHistory(limit);
    }
    async getCoachingTips(id) {
        return this.aiService.getStaffCoachingTips(id);
    }
    async getMissionReport(id) {
        return this.aiService.getDailyMissionReport(id);
    }
    async downloadMissionReport(id, res) {
        const buffer = await this.reportService.generateMissionReportPdf(id);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=AI-Mission-Report-${id}.pdf`,
            'Content-Length': buffer.length
        });
        res.status(_common.HttpStatus.OK).send(buffer);
    }
    async getComboRules() {
        return this.aiService.getResolvedComboRules();
    }
    async getSuggestedBundles() {
        return this.aiService.getSuggestedBundles();
    }
    async predictWaste() {
        return this.aiService.predictWaste();
    }
    async getMenuMatrix() {
        return this.aiService.getMenuMatrix();
    }
    async getWasteAnomalies() {
        return this.aiService.getWasteAnomalies();
    }
    async getSmartSuggestion() {
        return this.aiService.getInventorySmartSuggestion();
    }
    constructor(aiService, reportService){
        this.aiService = aiService;
        this.reportService = reportService;
    }
};
_ts_decorate([
    (0, _common.Post)('simulate-target'),
    _ts_param(0, (0, _common.Body)('targetRevenue')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "simulateTarget", null);
_ts_decorate([
    (0, _common.Get)('suggest-target'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "suggestTarget", null);
_ts_decorate([
    (0, _common.Post)('auto-suggest-publish'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "autoSuggestAndPublish", null);
_ts_decorate([
    (0, _common.Get)('predict-traffic'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "predictTraffic", null);
_ts_decorate([
    (0, _common.Get)('predict-intensity'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "predictIntensity", null);
_ts_decorate([
    (0, _common.Post)('strategy-brief'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "triggerStrategyBrief", null);
_ts_decorate([
    (0, _common.Get)('battle-plan/:businessDayId'),
    _ts_param(0, (0, _common.Param)('businessDayId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "getBattlePlan", null);
_ts_decorate([
    (0, _common.Get)('battle-plan/active/:businessDayId'),
    _ts_param(0, (0, _common.Param)('businessDayId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "getActiveBattlePlan", null);
_ts_decorate([
    (0, _common.Post)('battle-plan'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "saveBattlePlan", null);
_ts_decorate([
    (0, _common.Post)('battle-plan/:id/publish'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "publishBattlePlan", null);
_ts_decorate([
    (0, _common.Get)('waiter-performance'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "getWaiterPerformance", null);
_ts_decorate([
    (0, _common.Post)('battle-plan/:businessDayId/reoptimize'),
    _ts_param(0, (0, _common.Param)('businessDayId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "reoptimize", null);
_ts_decorate([
    (0, _common.Get)('battle-plan/:businessDayId/report'),
    _ts_param(0, (0, _common.Param)('businessDayId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "getReport", null);
_ts_decorate([
    (0, _common.Post)('broadcast-item'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "manualBroadcast", null);
_ts_decorate([
    (0, _common.Post)('prompt/:id/acknowledge'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "acknowledgePrompt", null);
_ts_decorate([
    (0, _common.Get)('campaign-stats/:businessDayId'),
    _ts_param(0, (0, _common.Param)('businessDayId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "getCampaignStats", null);
_ts_decorate([
    (0, _common.Get)('history'),
    _ts_param(0, (0, _common.Query)('limit')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "getHistory", null);
_ts_decorate([
    (0, _common.Get)('coaching-tips/:businessDayId'),
    _ts_param(0, (0, _common.Param)('businessDayId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "getCoachingTips", null);
_ts_decorate([
    (0, _common.Get)('mission-report/:businessDayId'),
    _ts_param(0, (0, _common.Param)('businessDayId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "getMissionReport", null);
_ts_decorate([
    (0, _common.Get)('mission-report/:businessDayId/pdf'),
    _ts_param(0, (0, _common.Param)('businessDayId')),
    _ts_param(1, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof Response === "undefined" ? Object : Response
    ]),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "downloadMissionReport", null);
_ts_decorate([
    (0, _common.Get)('combo-rules'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "getComboRules", null);
_ts_decorate([
    (0, _common.Get)('suggested-bundles'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "getSuggestedBundles", null);
_ts_decorate([
    (0, _common.Get)('predict-waste'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "predictWaste", null);
_ts_decorate([
    (0, _common.Get)('menu-matrix'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "getMenuMatrix", null);
_ts_decorate([
    (0, _common.Get)('waste-anomalies'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "getWasteAnomalies", null);
_ts_decorate([
    (0, _common.Get)('smart-suggestion'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AIController.prototype, "getSmartSuggestion", null);
AIController = _ts_decorate([
    (0, _common.Controller)('ai'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _aiservice.AIService === "undefined" ? Object : _aiservice.AIService,
        typeof _reportservice.ReportService === "undefined" ? Object : _reportservice.ReportService
    ])
], AIController);

//# sourceMappingURL=ai.controller.js.map