import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  Request,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ─── Check-in / Check-out ────────────────────────────────────────────────

  @Post('checkin')
  @UseGuards(AuthGuard('jwt'))
  async checkIn(@Request() req: any, @Body() body: { note?: string }) {
    return this.attendanceService.checkIn(req.user.id, body.note);
  }

  @Post('checkout')
  @UseGuards(AuthGuard('jwt'))
  async checkOut(@Request() req: any, @Body() body: { note?: string }) {
    return this.attendanceService.checkOut(req.user.id, body.note);
  }

  @Get('today')
  @UseGuards(AuthGuard('jwt'))
  async getToday(@Request() req: any) {
    return this.attendanceService.getTodayRecord(req.user.id);
  }

  // ─── Public PIN endpoints (kiosk/CFD) ───────────────────────────────────

  @Post('public/checkin')
  async publicCheckIn(@Body() body: { pin: string; note?: string }) {
    return this.attendanceService.checkInByPin(body.pin, body.note);
  }

  @Post('public/checkout')
  async publicCheckOut(@Body() body: { pin: string; note?: string }) {
    return this.attendanceService.checkOutByPin(body.pin, body.note);
  }

  @Post('public/prompt')
  async lcdPrompt(@Body() body: { mode: 'CHECKIN' | 'CHECKOUT' }) {
    return this.attendanceService.sendLcdPrompt(body.mode);
  }

  // ─── History & Summary ───────────────────────────────────────────────────

  @Get('history')
  @UseGuards(AuthGuard('jwt'))
  async getHistory(
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendanceService.getHistory(
      userId ? Number(userId) : undefined,
      from,
      to,
    );
  }

  @Get('summary')
  @UseGuards(AuthGuard('jwt'))
  async getSummary(
    @Query('userId', ParseIntPipe) userId: number,
    @Query('month', new DefaultValuePipe(new Date().getMonth() + 1), ParseIntPipe) month: number,
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe) year: number,
  ) {
    return this.attendanceService.getSummary(userId, month, year);
  }

  // ─── Approval ────────────────────────────────────────────────────────────

  @Get('pending')
  @UseGuards(AuthGuard('jwt'))
  async getPending() {
    return this.attendanceService.getPendingAttendance();
  }

  @Post('approve-all')
  @UseGuards(AuthGuard('jwt'))
  async approveAll(@Request() req: any) {
    const adminName = req.user.name;
    const pending = await this.attendanceService.getPendingAttendance();
    for (const record of pending) {
      await this.attendanceService.approveAttendance(record.id, adminName);
    }
    return { success: true, count: pending.length };
  }

  @Post(':id/approve')
  @UseGuards(AuthGuard('jwt'))
  async approve(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.attendanceService.approveAttendance(id, req.user.name);
  }

  @Post('manual')
  @UseGuards(AuthGuard('jwt'))
  async createManual(
    @Request() req: any,
    @Body() body: { userId: number; date: string; status: any; note: string },
  ) {
    return this.attendanceService.createManual(req.user.id, req.user.name, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async deleteAttendance(@Param('id', ParseIntPipe) id: number) {
    await this.attendanceService.deleteAttendance(id);
    return { success: true };
  }

  // ─── Shift Schedule Management ───────────────────────────────────────────

  /**
   * GET /attendance/schedules?from=2026-04-01&to=2026-04-30
   * Returns all shift schedule assignments in the date range.
   */
  @Get('schedules')
  @UseGuards(AuthGuard('jwt'))
  async getSchedules(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendanceService.getSchedules(from, to);
  }

  /**
   * POST /attendance/schedules
   * Assign a shift to an employee on a specific date.
   * Body: { userId, date, shiftName, note? }
   */
  @Post('schedules')
  @UseGuards(AuthGuard('jwt'))
  async assignShift(
    @Request() req: any,
    @Body() body: { userId: number; date: string; shiftName: string; note?: string },
  ) {
    return this.attendanceService.assignShift(
      req.user.id,
      body.userId,
      body.date,
      body.shiftName,
      body.note,
    );
  }

  /**
   * POST /attendance/schedules/swap
   * Swap shifts between two employees on a specific date.
   * Body: { userAId, userBId, date, reason? }
   */
  @Post('schedules/swap')
  @UseGuards(AuthGuard('jwt'))
  async swapShifts(
    @Request() req: any,
    @Body() body: { userAId: number; userBId: number; date: string; reason?: string },
  ) {
    return this.attendanceService.swapShifts(
      req.user.id,
      body.userAId,
      body.userBId,
      body.date,
      body.reason,
    );
  }

  /**
   * DELETE /attendance/schedules/:id
   * Remove a shift schedule assignment (revert to employee's baseShift).
   */
  @Delete('schedules/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteSchedule(@Param('id', ParseIntPipe) id: number) {
    await this.attendanceService.deleteSchedule(id);
    return { success: true };
  }

  // ─── Business Closures ───────────────────────────────────────────────────

  /**
   * GET /attendance/closures
   * List all business closure periods.
   */
  @Get('closures')
  @UseGuards(AuthGuard('jwt'))
  async getClosures() {
    return this.attendanceService.getClosures();
  }

  /**
   * POST /attendance/closures
   * Mark a date range as business closure (prevents ALPHA generation).
   * Body: { startDate, endDate, reason }
   */
  @Post('closures')
  @UseGuards(AuthGuard('jwt'))
  async addClosure(
    @Body() body: { startDate: string; endDate: string; reason: string },
  ) {
    return this.attendanceService.addClosure(body.startDate, body.endDate, body.reason);
  }

  /**
   * DELETE /attendance/closures/:id
   */
  @Delete('closures/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteClosure(@Param('id', ParseIntPipe) id: number) {
    await this.attendanceService.deleteClosure(id);
    return { success: true };
  }

  @Post('command')
  @UseGuards(AuthGuard('jwt'))
  async processCommand(
    @Body() body: { userId: string; type: string; data?: any },
  ) {
    return this.attendanceService.processCommand(body.userId, body.type, body.data);
  }
}
