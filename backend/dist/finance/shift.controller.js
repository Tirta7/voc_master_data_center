"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ShiftController", {
    enumerable: true,
    get: function() {
        return ShiftController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _shiftservice = require("./shift.service");
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
let ShiftController = class ShiftController {
    async getActiveShift(req) {
        const shift = await this.shiftService.getActiveShift(req.user.id);
        return shift || null;
    }
    async getOpenShifts() {
        return this.shiftService.getOpenShifts();
    }
    async updateAssignments(id, assignedTableIds) {
        return this.shiftService.updateAssignments(id, assignedTableIds);
    }
    async updateUserAssignments(userId, assignedTableIds) {
        return this.shiftService.updatePersistentAssignments(userId, assignedTableIds);
    }
    async startShift(req, body) {
        return this.shiftService.startShift(req.user.id, body.cashStart, body.shiftName, body.assignedTableIds);
    }
    async endShift(req, cashPhysical, note) {
        const forceUserId = req.headers['x-force-for-user'];
        const targetUserId = forceUserId ? parseInt(forceUserId) : req.user.id;
        // Security check: if targetUserId is different from requester, must be ADMIN or OWNER
        if (targetUserId !== req.user.id) {
            const userRole = req.user.role?.name?.toUpperCase() || req.user.role?.toUpperCase();
            if (![
                'ADMIN',
                'OWNER'
            ].includes(userRole)) {
                throw new _common.UnauthorizedException('Hanya Admin yang dapat mengakhiri shift staf lain.');
            }
        }
        return this.shiftService.endShift(targetUserId, cashPhysical, note);
    }
    async getReport(id) {
        return this.shiftService.getBusinessDayReport(id);
    }
    async closeBusinessDay(id) {
        return this.shiftService.closeBusinessDay(id);
    }
    async getActiveBusinessDay() {
        return this.shiftService.getOrCreateActiveBusinessDay();
    }
    async getBusinessDays() {
        return this.shiftService.getBusinessDays();
    }
    constructor(shiftService){
        this.shiftService = shiftService;
    }
};
_ts_decorate([
    (0, _common.Get)('active'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ShiftController.prototype, "getActiveShift", null);
_ts_decorate([
    (0, _common.Get)('open'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], ShiftController.prototype, "getOpenShifts", null);
_ts_decorate([
    (0, _common.Post)(':id/assignments'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('assignedTableIds')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Array
    ]),
    _ts_metadata("design:returntype", Promise)
], ShiftController.prototype, "updateAssignments", null);
_ts_decorate([
    (0, _common.Post)('user/:userId/assignments'),
    _ts_param(0, (0, _common.Param)('userId')),
    _ts_param(1, (0, _common.Body)('assignedTableIds')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Array
    ]),
    _ts_metadata("design:returntype", Promise)
], ShiftController.prototype, "updateUserAssignments", null);
_ts_decorate([
    (0, _common.Post)('start'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ShiftController.prototype, "startShift", null);
_ts_decorate([
    (0, _common.Post)('end'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)('cashPhysical')),
    _ts_param(2, (0, _common.Body)('note')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Number,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ShiftController.prototype, "endShift", null);
_ts_decorate([
    (0, _common.Get)('report/:businessDayId'),
    _ts_param(0, (0, _common.Param)('businessDayId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], ShiftController.prototype, "getReport", null);
_ts_decorate([
    (0, _common.Post)('business-day/:id/close'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], ShiftController.prototype, "closeBusinessDay", null);
_ts_decorate([
    (0, _common.Get)('business-day/active'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], ShiftController.prototype, "getActiveBusinessDay", null);
_ts_decorate([
    (0, _common.Get)('business-day/list'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], ShiftController.prototype, "getBusinessDays", null);
ShiftController = _ts_decorate([
    (0, _common.Controller)('finance/shifts'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _shiftservice.ShiftService === "undefined" ? Object : _shiftservice.ShiftService
    ])
], ShiftController);

//# sourceMappingURL=shift.controller.js.map