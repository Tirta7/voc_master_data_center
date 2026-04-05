import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('summary/daily')
  async getDailySummary() {
    return this.reportService.getDailySummary();
  }

  @Get('detailed')
  async getDetailedReport(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.reportService.getDetailedRevenueReport(start, end);
  }

  @Get('inventory/health')
  async getInventoryHealth() {
    return this.reportService.getInventoryHealth();
  }

  @Get('shifts/active')
  async getActiveShift() {
    return this.reportService.getActiveShift();
  }

  @Get('shifts/history')
  async getShiftHistory() {
    return this.reportService.getShiftHistory();
  }

  @Post('shifts/start')
  async startShift(@Body() data: { startedBy: string; openingCash: number }) {
    return this.reportService.startShift(data.startedBy, data.openingCash);
  }

  @Patch('shifts/:id/close')
  async closeShift(
    @Param('id') id: number,
    @Body()
    data: {
      endedBy: string;
      closingCash: number;
      remarks?: string;
      stockReports?: any[];
      attachmentUrl?: string;
    },
  ) {
    return this.reportService.closeShift(
      id,
      data.endedBy,
      data.closingCash,
      data.remarks,
      data.stockReports,
      data.attachmentUrl,
    );
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Query('action') action?: string,
    @Query('user') user?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reportService.getAuditLogs({
      action,
      user,
      startDate: start,
      endDate: end,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('audit-stats')
  async getAuditStats() {
    return this.reportService.getAuditStats();
  }

  @Get('best-sellers')
  async getBestSellers() {
    return this.reportService.getBestSellers();
  }

  @Get('item-trends')
  async getItemTrends(@Query('days') days?: number) {
    return this.reportService.getGlobalItemTrends(days ? Number(days) : 7);
  }

  @Get('items-performance')
  async getItemsPerformance(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.reportService.getItemsPerformance(start, end);
  }

  @Get('transactions-full')
  async getFullTransactions() {
    return this.reportService.getFullTransactions();
  }

  @Get('settings')
  async getSettings() {
    return this.reportService.getSettings();
  }

  @Get('store-stock')
  async getStoreStockReport() {
    return this.reportService.getStoreStockReport();
  }

  @Post('whatsapp-manual')
  async sendReportManual(
    @Body() data: { phone: string; start?: string; end?: string },
  ) {
    const startDate = data.start ? new Date(data.start) : undefined;
    const endDate = data.end ? new Date(data.end) : undefined;
    return this.reportService.sendReportToWhatsApp(
      data.phone,
      startDate,
      endDate,
    );
  }

  @Post('whatsapp-dashboard')
  async sendDashboardWA(
    @Body() data: { phone: string; start: string; end: string },
  ) {
    return this.reportService.sendExecutiveDashboardToWhatsApp(
      data.phone,
      new Date(data.start),
      new Date(data.end),
    );
  }

  @Get('staff-leaderboard')
  async getStaffLeaderboard(@Query('days') days?: number) {
    return this.reportService.getStaffPerformanceLeaderboard(
      days ? Number(days) : 30,
    );
  }

  @Get('mission-report/pdf/:id')
  async getMissionReportPdf(@Param('id') id: number) {
    return this.reportService.generateMissionReportPdf(id);
  }
}
