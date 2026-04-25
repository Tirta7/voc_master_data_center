"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AttendanceController", {
    enumerable: true,
    get: function() {
        return AttendanceController;
    }
});
const _common = require("@nestjs/common");
const _attendanceservice = require("./attendance.service");
const _passport = require("@nestjs/passport");
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
let AttendanceController = class AttendanceController {
    // ─── Check-in / Check-out ────────────────────────────────────────────────
    async checkIn(req, body) {
        return this.attendanceService.checkIn(req.user.id, body.note);
    }
    async checkOut(req, body) {
        return this.attendanceService.checkOut(req.user.id, body.note);
    }
    async getToday(req) {
        return this.attendanceService.getTodayRecord(req.user.id);
    }
    // ─── Public PIN endpoints (kiosk/CFD) ───────────────────────────────────
    async publicCheckIn(body) {
        return this.attendanceService.checkInByPin(body.pin, body.note);
    }
    async publicCheckOut(body) {
        return this.attendanceService.checkOutByPin(body.pin, body.note);
    }
    async lcdPrompt(body) {
        return this.attendanceService.sendLcdPrompt(body.mode);
    }
    // ─── History & Summary ───────────────────────────────────────────────────
    async getHistory(userId, from, to) {
        return this.attendanceService.getHistory(userId ? Number(userId) : undefined, from, to);
    }
    async getSummary(userId, month, year) {
        return this.attendanceService.getSummary(userId, month, year);
    }
    // ─── Approval ────────────────────────────────────────────────────────────
    async getPending() {
        return this.attendanceService.getPendingAttendance();
    }
    async approveAll(req) {
        const adminName = req.user.name;
        const pending = await this.attendanceService.getPendingAttendance();
        for (const record of pending){
            await this.attendanceService.approveAttendance(record.id, adminName);
        }
        return {
            success: true,
            count: pending.length
        };
    }
    async approve(req, id) {
        return this.attendanceService.approveAttendance(id, req.user.name);
    }
    async createManual(req, body) {
        return this.attendanceService.createManual(req.user.id, req.user.name, body);
    }
    async deleteAttendance(id) {
        await this.attendanceService.deleteAttendance(id);
        return {
            success: true
        };
    }
    // ─── Shift Schedule Management ───────────────────────────────────────────
    /**
   * GET /attendance/schedules?from=2026-04-01&to=2026-04-30
   * Returns all shift schedule assignments in the date range.
   */ async getSchedules(from, to) {
        return this.attendanceService.getSchedules(from, to);
    }
    /**
   * POST /attendance/schedules
   * Assign a shift to an employee on a specific date.
   * Body: { userId, date, shiftName, note? }
   */ async assignShift(req, body) {
        return this.attendanceService.assignShift(req.user.id, body.userId, body.date, body.shiftName, body.note);
    }
    /**
   * POST /attendance/schedules/swap
   * Swap shifts between two employees on a specific date.
   * Body: { userAId, userBId, date, reason? }
   */ async swapShifts(req, body) {
        return this.attendanceService.swapShifts(req.user.id, body.userAId, body.userBId, body.date, body.reason);
    }
    /**
   * DELETE /attendance/schedules/:id
   * Remove a shift schedule assignment (revert to employee's baseShift).
   */ async deleteSchedule(id) {
        await this.attendanceService.deleteSchedule(id);
        return {
            success: true
        };
    }
    // ─── Business Closures ───────────────────────────────────────────────────
    /**
   * GET /attendance/closures
   * List all business closure periods.
   */ async getClosures() {
        return this.attendanceService.getClosures();
    }
    /**
   * POST /attendance/closures
   * Mark a date range as business closure (prevents ALPHA generation).
   * Body: { startDate, endDate, reason }
   */ async addClosure(body) {
        return this.attendanceService.addClosure(body.startDate, body.endDate, body.reason);
    }
    /**
   * DELETE /attendance/closures/:id
   */ async deleteClosure(id) {
        await this.attendanceService.deleteClosure(id);
        return {
            success: true
        };
    }
    async processCommand(body) {
        return this.attendanceService.processCommand(body.userId, body.type, body.data);
    }
    constructor(attendanceService){
        this.attendanceService = attendanceService;
    }
};
_ts_decorate([
    (0, _common.Post)('checkin'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "checkIn", null);
_ts_decorate([
    (0, _common.Post)('checkout'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "checkOut", null);
_ts_decorate([
    (0, _common.Get)('today'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "getToday", null);
_ts_decorate([
    (0, _common.Post)('public/checkin'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "publicCheckIn", null);
_ts_decorate([
    (0, _common.Post)('public/checkout'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "publicCheckOut", null);
_ts_decorate([
    (0, _common.Post)('public/prompt'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "lcdPrompt", null);
_ts_decorate([
    (0, _common.Get)('history'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Query)('userId')),
    _ts_param(1, (0, _common.Query)('from')),
    _ts_param(2, (0, _common.Query)('to')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "getHistory", null);
_ts_decorate([
    (0, _common.Get)('summary'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Query)('userId', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Query)('month', new _common.DefaultValuePipe(new Date().getMonth() + 1), _common.ParseIntPipe)),
    _ts_param(2, (0, _common.Query)('year', new _common.DefaultValuePipe(new Date().getFullYear()), _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Number,
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "getSummary", null);
_ts_decorate([
    (0, _common.Get)('pending'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "getPending", null);
_ts_decorate([
    (0, _common.Post)('approve-all'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "approveAll", null);
_ts_decorate([
    (0, _common.Post)(':id/approve'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "approve", null);
_ts_decorate([
    (0, _common.Post)('manual'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "createManual", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "deleteAttendance", null);
_ts_decorate([
    (0, _common.Get)('schedules'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Query)('from')),
    _ts_param(1, (0, _common.Query)('to')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "getSchedules", null);
_ts_decorate([
    (0, _common.Post)('schedules'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "assignShift", null);
_ts_decorate([
    (0, _common.Post)('schedules/swap'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "swapShifts", null);
_ts_decorate([
    (0, _common.Delete)('schedules/:id'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "deleteSchedule", null);
_ts_decorate([
    (0, _common.Get)('closures'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "getClosures", null);
_ts_decorate([
    (0, _common.Post)('closures'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "addClosure", null);
_ts_decorate([
    (0, _common.Delete)('closures/:id'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "deleteClosure", null);
_ts_decorate([
    (0, _common.Post)('command'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], AttendanceController.prototype, "processCommand", null);
AttendanceController = _ts_decorate([
    (0, _common.Controller)('attendance'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _attendanceservice.AttendanceService === "undefined" ? Object : _attendanceservice.AttendanceService
    ])
], AttendanceController);

//# sourceMappingURL=attendance.controller.js.map