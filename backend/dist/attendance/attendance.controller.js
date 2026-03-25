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
    /** Check-in — current logged-in user */ async checkIn(req, body) {
        return this.attendanceService.checkIn(req.user.id, body.note);
    }
    /** Check-out — current logged-in user */ async checkOut(req, body) {
        return this.attendanceService.checkOut(req.user.id, body.note);
    }
    /** Today's record for current user */ async getToday(req) {
        return this.attendanceService.getTodayRecord(req.user.id);
    }
    /** History — admin can pass userId, date range filters */ async getHistory(userId, from, to) {
        return this.attendanceService.getHistory(userId ? Number(userId) : undefined, from, to);
    }
    /** Monthly summary per user */ async getSummary(userId, month, year) {
        return this.attendanceService.getSummary(userId, month, year);
    }
    /** Public Check-in via PIN (for CFD) */ async publicCheckIn(body) {
        return this.attendanceService.checkInByPin(body.pin, body.note);
    }
    /** Public Check-out via PIN (for CFD) */ async publicCheckOut(body) {
        return this.attendanceService.checkOutByPin(body.pin, body.note);
    }
    /** GET all pending attendance for approval */ async getPending() {
        return this.attendanceService.getPendingAttendance();
    }
    /** Approve attendance record */ async approveAll(req) {
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
AttendanceController = _ts_decorate([
    (0, _common.Controller)('attendance'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _attendanceservice.AttendanceService === "undefined" ? Object : _attendanceservice.AttendanceService
    ])
], AttendanceController);

//# sourceMappingURL=attendance.controller.js.map