"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ReportController", {
    enumerable: true,
    get: function() {
        return ReportController;
    }
});
const _common = require("@nestjs/common");
const _reportservice = require("./report.service");
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
let ReportController = class ReportController {
    async getDailySummary() {
        return this.reportService.getDailySummary();
    }
    async getDetailedReport(start, end) {
        return this.reportService.getDetailedRevenueReport(start, end);
    }
    async getInventoryHealth() {
        return this.reportService.getInventoryHealth();
    }
    async getActiveShift() {
        return this.reportService.getActiveShift();
    }
    async getShiftHistory() {
        return this.reportService.getShiftHistory();
    }
    async getShiftAuditReport(start, end, shiftId) {
        return this.reportService.getShiftAuditReport(start, end, shiftId ? Number(shiftId) : undefined);
    }
    async getAuditAIInsights(start, end) {
        return this.reportService.getAuditAIInsights(start, end);
    }
    async startShift(data) {
        return this.reportService.startShift(data.startedBy, data.openingCash);
    }
    async closeShift(id, data) {
        return this.reportService.closeShift(id, data.endedBy, data.closingCash, data.remarks, data.stockReports, data.attachmentUrl);
    }
    async getAuditLogs(action, user, start, end, page, limit) {
        return this.reportService.getAuditLogs({
            action,
            user,
            startDate: start,
            endDate: end,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined
        });
    }
    async getAuditStats() {
        return this.reportService.getAuditStats();
    }
    async getBestSellers() {
        return this.reportService.getBestSellers();
    }
    async getItemTrends(days) {
        return this.reportService.getGlobalItemTrends(days ? Number(days) : 7);
    }
    async getItemsPerformance(start, end) {
        return this.reportService.getItemsPerformance(start, end);
    }
    async getFullTransactions() {
        return this.reportService.getFullTransactions();
    }
    async getSettings() {
        return this.reportService.getSettings();
    }
    async getStoreStockReport() {
        return this.reportService.getStoreStockReport();
    }
    async sendReportManual(data) {
        const startDate = data.start ? new Date(data.start) : undefined;
        const endDate = data.end ? new Date(data.end) : undefined;
        return this.reportService.sendReportToWhatsApp(data.phone, startDate, endDate);
    }
    async sendDashboardWA(data) {
        return this.reportService.sendExecutiveDashboardToWhatsApp(data.phone, new Date(data.start), new Date(data.end));
    }
    async getStaffLeaderboard(days) {
        return this.reportService.getStaffPerformanceLeaderboard(days ? Number(days) : 30);
    }
    async getMissionReportPdf(id) {
        return this.reportService.generateMissionReportPdf(id);
    }
    constructor(reportService){
        this.reportService = reportService;
    }
};
_ts_decorate([
    (0, _common.Get)('summary/daily'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "getDailySummary", null);
_ts_decorate([
    (0, _common.Get)('detailed'),
    _ts_param(0, (0, _common.Query)('start')),
    _ts_param(1, (0, _common.Query)('end')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "getDetailedReport", null);
_ts_decorate([
    (0, _common.Get)('inventory/health'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "getInventoryHealth", null);
_ts_decorate([
    (0, _common.Get)('shifts/active'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "getActiveShift", null);
_ts_decorate([
    (0, _common.Get)('shifts/history'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "getShiftHistory", null);
_ts_decorate([
    (0, _common.Get)('shifts/audit'),
    _ts_param(0, (0, _common.Query)('start')),
    _ts_param(1, (0, _common.Query)('end')),
    _ts_param(2, (0, _common.Query)('shiftId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "getShiftAuditReport", null);
_ts_decorate([
    (0, _common.Get)('shifts/audit/insights'),
    _ts_param(0, (0, _common.Query)('start')),
    _ts_param(1, (0, _common.Query)('end')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "getAuditAIInsights", null);
_ts_decorate([
    (0, _common.Post)('shifts/start'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "startShift", null);
_ts_decorate([
    (0, _common.Patch)('shifts/:id/close'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "closeShift", null);
_ts_decorate([
    (0, _common.Get)('audit-logs'),
    _ts_param(0, (0, _common.Query)('action')),
    _ts_param(1, (0, _common.Query)('user')),
    _ts_param(2, (0, _common.Query)('start')),
    _ts_param(3, (0, _common.Query)('end')),
    _ts_param(4, (0, _common.Query)('page')),
    _ts_param(5, (0, _common.Query)('limit')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        String,
        String,
        Number,
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "getAuditLogs", null);
_ts_decorate([
    (0, _common.Get)('audit-stats'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "getAuditStats", null);
_ts_decorate([
    (0, _common.Get)('best-sellers'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "getBestSellers", null);
_ts_decorate([
    (0, _common.Get)('item-trends'),
    _ts_param(0, (0, _common.Query)('days')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "getItemTrends", null);
_ts_decorate([
    (0, _common.Get)('items-performance'),
    _ts_param(0, (0, _common.Query)('start')),
    _ts_param(1, (0, _common.Query)('end')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "getItemsPerformance", null);
_ts_decorate([
    (0, _common.Get)('transactions-full'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "getFullTransactions", null);
_ts_decorate([
    (0, _common.Get)('settings'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "getSettings", null);
_ts_decorate([
    (0, _common.Get)('store-stock'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "getStoreStockReport", null);
_ts_decorate([
    (0, _common.Post)('whatsapp-manual'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "sendReportManual", null);
_ts_decorate([
    (0, _common.Post)('whatsapp-dashboard'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "sendDashboardWA", null);
_ts_decorate([
    (0, _common.Get)('staff-leaderboard'),
    _ts_param(0, (0, _common.Query)('days')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "getStaffLeaderboard", null);
_ts_decorate([
    (0, _common.Get)('mission-report/pdf/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], ReportController.prototype, "getMissionReportPdf", null);
ReportController = _ts_decorate([
    (0, _common.Controller)('reports'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _reportservice.ReportService === "undefined" ? Object : _reportservice.ReportService
    ])
], ReportController);

//# sourceMappingURL=report.controller.js.map