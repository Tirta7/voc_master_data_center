import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { AIService } from './ai.service';
import { ReportService } from '../report/report.service';
import type { Response } from 'express';

@Controller('ai')
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly reportService: ReportService,
  ) {}

  @Post('simulate-target')
  async simulateTarget(@Body('targetRevenue') revenue: number) {
    return this.aiService.calculateTargetMix(revenue);
  }

  @Get('suggest-target')
  async suggestTarget() {
    return this.aiService.suggestDailyTarget();
  }

  @Post('auto-suggest-publish')
  async autoSuggestAndPublish() {
    return this.aiService.autoSuggestAndPublish();
  }

  @Get('predict-traffic')
  async predictTraffic() {
    return this.aiService.predictDailyTraffic();
  }

  @Get('predict-intensity')
  async predictIntensity() {
    return this.aiService.getPeakIntensityPrediction();
  }

  @Post('strategy-brief')
  async triggerStrategyBrief() {
    return this.aiService.generateDailyStrategyBrief();
  }

  @Get('battle-plan/:businessDayId')
  async getBattlePlan(@Param('businessDayId') businessDayId: number) {
    return this.aiService.getCurrentBattlePlan(businessDayId);
  }

  @Get('battle-plan/active/:businessDayId')
  async getActiveBattlePlan(@Param('businessDayId') businessDayId: number) {
    return this.aiService.getCurrentBattlePlan(businessDayId);
  }

  @Post('battle-plan')
  async saveBattlePlan(@Body() data: any) {
    return this.aiService.createOrUpdateBattlePlan(data);
  }

  @Post('battle-plan/:id/publish')
  async publishBattlePlan(@Param('id') id: number) {
    return this.aiService.publishBattlePlan(id);
  }

  @Get('waiter-performance')
  async getWaiterPerformance() {
    return this.aiService.getWaiterPerformance();
  }

  @Post('battle-plan/:businessDayId/reoptimize')
  async reoptimize(@Param('businessDayId') businessDayId: number) {
    return this.aiService.reoptimizeBattlePlan(businessDayId);
  }

  @Get('battle-plan/:businessDayId/report')
  async getReport(@Param('businessDayId') businessDayId: number) {
    return this.aiService.generatePerformanceReport(businessDayId);
  }

  @Post('broadcast-item')
  async manualBroadcast(
    @Body() data: { itemId: number; type: 'CAFE' | 'BILLIARD' | 'PROMO' },
  ) {
    return this.aiService.manualBroadcastItem(data.itemId, data.type);
  }

  @Post('prompt/:id/acknowledge')
  async acknowledgePrompt(@Param('id') id: number) {
    return this.aiService.acknowledgePrompt(id);
  }

  @Get('campaign-stats/:businessDayId')
  async getCampaignStats(@Param('businessDayId') businessDayId: number) {
    return this.aiService.getActiveCampaignStats(businessDayId);
  }

  @Get('history')
  async getHistory(@Query('limit') limit: number) {
    return this.aiService.getBattlePlanHistory(limit);
  }

  @Get('coaching-tips/:businessDayId')
  async getCoachingTips(@Param('businessDayId') id: number) {
    return this.aiService.getStaffCoachingTips(id);
  }

  @Get('mission-report/:businessDayId')
  async getMissionReport(@Param('businessDayId') id: number) {
    return this.aiService.getDailyMissionReport(id);
  }

  @Get('mission-report/:businessDayId/pdf')
  async downloadMissionReport(
    @Param('businessDayId') id: number,
    @Res() res: Response,
  ) {
    const buffer = await this.reportService.generateMissionReportPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=AI-Mission-Report-${id}.pdf`,
      'Content-Length': buffer.length,
    });
    res.status(HttpStatus.OK).send(buffer);
  }

  @Get('combo-rules')
  async getComboRules() {
    return this.aiService.getResolvedComboRules();
  }

  @Get('suggested-bundles')
  async getSuggestedBundles() {
    return this.aiService.getSuggestedBundles();
  }

  @Get('predict-waste')
  async predictWaste() {
    return this.aiService.predictWaste();
  }

  @Get('menu-matrix')
  async getMenuMatrix() {
    return this.aiService.getMenuMatrix();
  }

  @Get('waste-anomalies')
  async getWasteAnomalies() {
    return this.aiService.getWasteAnomalies();
  }

  @Get('smart-suggestion')
  async getSmartSuggestion() {
    return this.aiService.getInventorySmartSuggestion();
  }
}
