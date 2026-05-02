import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseFloatPipe,
  ParseIntPipe,
  ParseBoolPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShiftService } from './shift.service';

@Controller('finance/shifts')
@UseGuards(AuthGuard('jwt'))
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Get('active')
  async getActiveShift(@Request() req: any) {
    const shift = await this.shiftService.getActiveShift(req.user.id);
    return shift || null;
  }

  @Get('open')
  async getOpenShifts() {
    return this.shiftService.getOpenShifts();
  }

  @Post(':id/assignments')
  async updateAssignments(
    @Param('id') id: number,
    @Body('assignedTableIds') assignedTableIds: any[],
  ) {
    return this.shiftService.updateAssignments(id, assignedTableIds);
  }

  @Post('user/:userId/assignments')
  async updateUserAssignments(
    @Param('userId') userId: number,
    @Body('assignedTableIds') assignedTableIds: any[],
  ) {
    return this.shiftService.updatePersistentAssignments(
      userId,
      assignedTableIds,
    );
  }

  @Post('start')
  async startShift(
    @Request() req: any,
    @Body()
    body: { cashStart: number; shiftName?: string; assignedTableIds?: any[] },
  ) {
    return this.shiftService.startShift(
      req.user.id,
      body.cashStart,
      body.shiftName,
      body.assignedTableIds,
    );
  }

  @Post('active/update')
  async updateActiveShift(
    @Request() req: any,
    @Body() body: { cashStart?: number; shiftName?: string },
  ) {
    return this.shiftService.updateActiveShift(req.user.id, body);
  }

  @Post('end')
  async endShift(
    @Request() req: any,
    @Body('cashPhysical') cashPhysical: number,
    @Body('note') note?: string,
    @Body('stockReports') stockReports?: any[],
    @Body('attachmentUrl') attachmentUrl?: string,
  ) {
    const forceUserId = req.headers['x-force-for-user'];
    const targetUserId = forceUserId
      ? parseInt(forceUserId as string)
      : req.user.id;

    // Security check: if targetUserId is different from requester, must be ADMIN or OWNER
    if (targetUserId !== req.user.id) {
      const userRole =
        req.user.role?.name?.toUpperCase() || req.user.role?.toUpperCase();
      if (!['ADMIN', 'OWNER', 'SUPERADMIN', 'SUPER ADMIN', 'MANAGER'].includes(userRole)) {
        throw new UnauthorizedException(
          'Hanya Admin yang dapat mengakhiri shift staf lain.',
        );
      }
    }

    return this.shiftService.endShift(
      targetUserId,
      cashPhysical,
      note,
      stockReports,
      attachmentUrl,
    );
  }

  @Get(':id/pending-stock/:department')
  async getPendingStock(
    @Param('id') id: number,
    @Param('department') department: string,
  ) {
    return this.shiftService.getPendingStockItems(id, department);
  }

  @Post(':id/stock-report/:department')
  async submitDepartmentStockReport(
    @Param('id') id: number,
    @Param('department') department: string,
    @Body('reports') reports: any[],
  ) {
    return this.shiftService.submitDepartmentStockReport(id, department, reports);
  }

  @Get('report/:businessDayId')
  async getReport(@Param('businessDayId') id: number) {
    return this.shiftService.getBusinessDayReport(id);
  }

  @Post('business-day/:id/close')
  async closeBusinessDay(@Param('id') id: number) {
    return this.shiftService.closeBusinessDay(id);
  }

  @Get('business-day/active')
  async getActiveBusinessDay() {
    return this.shiftService.getOrCreateActiveBusinessDay();
  }

  @Get('business-day/list')
  async getBusinessDays() {
    return this.shiftService.getBusinessDays();
  }

  @Get(':id/stock-reports')
  async getStockReports(@Param('id') id: number) {
    return this.shiftService.getShiftStockReports(id);
  }

  @Post('business-day/:id/audit')
  async toggleAudit(
    @Param('id', ParseIntPipe) id: number,
    @Body('isAudited', ParseBoolPipe) isAudited: boolean,
  ) {
    return this.shiftService.toggleAuditStatus(id, isAudited);
  }

  @Get('business-day/settlement-status')
  async getSettlementStatus() {
    return this.shiftService.getSettlementStatus();
  }
}
