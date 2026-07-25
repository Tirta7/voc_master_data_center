"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UserController", {
    enumerable: true,
    get: function() {
        return UserController;
    }
});
const _common = require("@nestjs/common");
const _platformexpress = require("@nestjs/platform-express");
const _passport = require("@nestjs/passport");
const _userservice = require("./user.service");
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
let UserController = class UserController {
    async getProfile(req) {
        return this.userService.findById(req.user.id);
    }
    async findAll() {
        return this.userService.findAllEmployees();
    }
    async findAllRoles() {
        return this.userService.findAllRoles();
    }
    async getMaxLevel() {
        return this.userService.getMaxApprovalLevel();
    }
    async getBulkPayroll(month, year, start, end, includeReleased) {
        return this.userService.calculateBulkPayroll(month || new Date().getMonth() + 1, year || new Date().getFullYear(), start, end, includeReleased === 'true');
    }
    async findAllViolations() {
        return this.userService.findAllViolations();
    }
    async getMonitoringSummary() {
        return this.userService.getMonitoringSummary();
    }
    async create(userData) {
        return this.userService.createEmployee(userData);
    }
    async update(id, userData) {
        return this.userService.updateEmployee(+id, userData);
    }
    async remove(id) {
        return this.userService.deleteEmployee(+id);
    }
    async importFromExcel(file) {
        if (!file) {
            throw new Error('No file uploaded');
        }
        return this.userService.importFromExcel(file.buffer);
    }
    async createRole(data) {
        return this.userService.createRole(data.name, data.permissions, data.description, data.approvalLevel);
    }
    async updateRole(id, data) {
        return this.userService.updateRole(+id, data.name, data.permissions, data.description, data.approvalLevel);
    }
    async deleteRole(id) {
        return this.userService.deleteRole(+id);
    }
    async forceLogout(id, message) {
        return this.userService.forceLogout(+id, message);
    }
    async getPayroll(id, month, year, start, end) {
        return this.userService.calculateMonthlyPayroll(+id, month || new Date().getMonth() + 1, year || new Date().getFullYear(), start ? new Date(start) : undefined, end ? new Date(end) : undefined);
    }
    async getDetailedPayroll(id, month, year) {
        return this.userService.getDetailedPayrollReport(+id, month || new Date().getMonth() + 1, year || new Date().getFullYear());
    }
    async findUserViolations(id) {
        return this.userService.findUserViolations(+id);
    }
    async createViolation(req, data) {
        return this.userService.logViolation(data.userId, data.type, data.description, data.penaltyAmount, data.durationMinutes);
    }
    async releaseSalary(id, req, month, year) {
        return this.userService.releaseSalary(+id, month, year, req.user.id);
    }
    async getPayrollHistory() {
        return this.userService.getPayrollHistory();
    }
    async getRelease(id) {
        return this.userService.getReleaseById(+id);
    }
    constructor(userService){
        this.userService = userService;
    }
};
_ts_decorate([
    (0, _common.Get)('me'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "getProfile", null);
_ts_decorate([
    (0, _common.Get)('employees'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)('roles'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "findAllRoles", null);
_ts_decorate([
    (0, _common.Get)('roles/max-level'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "getMaxLevel", null);
_ts_decorate([
    (0, _common.Get)('employees/payroll/bulk'),
    _ts_param(0, (0, _common.Query)('month')),
    _ts_param(1, (0, _common.Query)('year')),
    _ts_param(2, (0, _common.Query)('start')),
    _ts_param(3, (0, _common.Query)('end')),
    _ts_param(4, (0, _common.Query)('includeReleased')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Number,
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "getBulkPayroll", null);
_ts_decorate([
    (0, _common.Get)('violations'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "findAllViolations", null);
_ts_decorate([
    (0, _common.Get)('monitoring-summary'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "getMonitoringSummary", null);
_ts_decorate([
    (0, _common.Post)('employees'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "create", null);
_ts_decorate([
    (0, _common.Patch)('employees/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)('employees/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "remove", null);
_ts_decorate([
    (0, _common.Post)('import'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    (0, _common.UseInterceptors)((0, _platformexpress.FileInterceptor)('file')),
    _ts_param(0, (0, _common.UploadedFile)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "importFromExcel", null);
_ts_decorate([
    (0, _common.Post)('roles'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "createRole", null);
_ts_decorate([
    (0, _common.Patch)('roles/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "updateRole", null);
_ts_decorate([
    (0, _common.Delete)('roles/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "deleteRole", null);
_ts_decorate([
    (0, _common.Post)(':id/force-logout'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('message')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "forceLogout", null);
_ts_decorate([
    (0, _common.Get)(':id/payroll'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Query)('month')),
    _ts_param(2, (0, _common.Query)('year')),
    _ts_param(3, (0, _common.Query)('start')),
    _ts_param(4, (0, _common.Query)('end')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Number,
        Number,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "getPayroll", null);
_ts_decorate([
    (0, _common.Get)(':id/payroll/detailed'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Query)('month')),
    _ts_param(2, (0, _common.Query)('year')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Number,
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "getDetailedPayroll", null);
_ts_decorate([
    (0, _common.Get)(':id/violations'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "findUserViolations", null);
_ts_decorate([
    (0, _common.Post)('violations'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "createViolation", null);
_ts_decorate([
    (0, _common.Post)(':id/payroll/release'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Request)()),
    _ts_param(2, (0, _common.Body)('month')),
    _ts_param(3, (0, _common.Body)('year')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object,
        Number,
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "releaseSalary", null);
_ts_decorate([
    (0, _common.Get)('payroll/history'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "getPayrollHistory", null);
_ts_decorate([
    (0, _common.Get)('payroll/release/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "getRelease", null);
UserController = _ts_decorate([
    (0, _common.Controller)('users'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _userservice.UserService === "undefined" ? Object : _userservice.UserService
    ])
], UserController);

//# sourceMappingURL=user.controller.js.map