import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Request,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Optional,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /** Check-in — current logged-in user */
  @Post('checkin')
  @UseGuards(AuthGuard('jwt'))
  async checkIn(@Request() req: any, @Body() body: { note?: string }) {
    return this.attendanceService.checkIn(req.user.id, body.note);
  }

  /** Check-out — current logged-in user */
  @Post('checkout')
  @UseGuards(AuthGuard('jwt'))
  async checkOut(@Request() req: any, @Body() body: { note?: string }) {
    return this.attendanceService.checkOut(req.user.id, body.note);
  }

  /** Today's record for current user */
  @Get('today')
  @UseGuards(AuthGuard('jwt'))
  async getToday(@Request() req: any) {
    return this.attendanceService.getTodayRecord(req.user.id);
  }

  /** History — admin can pass userId, date range filters */
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

  /** Monthly summary per user */
  @Get('summary')
  @UseGuards(AuthGuard('jwt'))
  async getSummary(
    @Query('userId', ParseIntPipe) userId: number,
    @Query('month', new DefaultValuePipe(new Date().getMonth() + 1), ParseIntPipe) month: number,
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe) year: number,
  ) {
    return this.attendanceService.getSummary(userId, month, year);
  }

  /** Public Check-in via PIN (for CFD) */
  @Post('public/checkin')
  async publicCheckIn(@Body() body: { pin: string; note?: string }) {
    return this.attendanceService.checkInByPin(body.pin, body.note);
  }

  /** Public Check-out via PIN (for CFD) */
  @Post('public/checkout')
  async publicCheckOut(@Body() body: { pin: string; note?: string }) {
    return this.attendanceService.checkOutByPin(body.pin, body.note);
  }

  /** GET all pending attendance for approval */
  @Get('pending')
  @UseGuards(AuthGuard('jwt'))
  async getPending() {
    return this.attendanceService.getPendingAttendance();
  }

  /** Approve attendance record */
  @Post('approve-all')
  @UseGuards(AuthGuard('jwt'))
  async approveAll(
    @Request() req: any,
  ) {
    const adminName = req.user.name;
    const pending = await this.attendanceService.getPendingAttendance();
    for (const record of pending) {
      await this.attendanceService.approveAttendance(record.id, adminName);
    }
    return { success: true, count: pending.length };
  }

  @Post(':id/approve')
  @UseGuards(AuthGuard('jwt'))
  async approve(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
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
}
