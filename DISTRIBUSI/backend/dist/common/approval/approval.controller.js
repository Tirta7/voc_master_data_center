"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ApprovalController", {
    enumerable: true,
    get: function() {
        return ApprovalController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _throttler = require("@nestjs/throttler");
const _approvalservice = require("./approval.service");
const _userservice = require("../../user/user.service");
const _approvalentity = require("../entities/approval.entity");
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
let ApprovalController = class ApprovalController {
    async getByStatus(status, req, moduleType, startDate, endDate) {
        const userLevel = req.user.approvalLevel || 0;
        return this.approvalService.getRequestsByStatus(status, userLevel, {
            moduleType,
            startDate,
            endDate
        });
    }
    async countPending(req) {
        const userLevel = req.user.approvalLevel || 0;
        const count = await this.approvalService.countPending(userLevel);
        return {
            count
        };
    }
    async getStats(req) {
        const userLevel = req.user.approvalLevel || 0;
        return this.approvalService.getStats(req.user.id, userLevel);
    }
    async getOne(id) {
        return this.approvalService.getRequestById(+id);
    }
    async approve(id, body, req) {
        return this.approvalService.processApproval(+id, req.user.id, 'APPROVE', body.note);
    }
    async reject(id, body, req) {
        return this.approvalService.processApproval(+id, req.user.id, 'REJECT', body.note);
    }
    async bypass(id, body, req) {
        const userLevel = req.user.approvalLevel || 0;
        const userPermissions = req.user.permissions || [];
        const maxLevel = await this.userService.getMaxApprovalLevel();
        const isSuper = userLevel === maxLevel && maxLevel > 0 || userPermissions.includes('APPROVAL_OVERRIDE') || req.user.role?.toUpperCase() === 'PENGAWAS';
        // Only the highest level OR someone with explicit OVERRIDE permission or role can bypass
        if (!isSuper) {
            throw new _common.ForbiddenException(`Hanya Otoritas Tertinggi, Pengawas, atau Staf dengan izin OVERRIDE yang dapat melakukan bypass`);
        }
        return this.approvalService.processApproval(+id, req.user.id, 'APPROVE', body.note, true);
    }
    async requestTableAccess(body, req) {
        return this.approvalService.createRequest({
            moduleType: _approvalentity.ApprovalModuleType.TABLE_ACCESS,
            referenceId: body.tableId,
            requestedByUserId: req.user.id,
            requiredLevels: [
                1
            ],
            metadata: {
                tableId: body.tableId,
                tableType: body.tableType,
                tableName: body.tableName,
                employeeName: req.user.name
            }
        });
    }
    constructor(approvalService, userService){
        this.approvalService = approvalService;
        this.userService = userService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    _ts_param(0, (0, _common.Query)('status')),
    _ts_param(1, (0, _common.Request)()),
    _ts_param(2, (0, _common.Query)('moduleType')),
    _ts_param(3, (0, _common.Query)('startDate')),
    _ts_param(4, (0, _common.Query)('endDate')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object,
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ApprovalController.prototype, "getByStatus", null);
_ts_decorate([
    (0, _common.Get)('count/pending'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ApprovalController.prototype, "countPending", null);
_ts_decorate([
    (0, _common.Get)('stats'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ApprovalController.prototype, "getStats", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ApprovalController.prototype, "getOne", null);
_ts_decorate([
    (0, _common.Post)(':id/approve'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ApprovalController.prototype, "approve", null);
_ts_decorate([
    (0, _common.Post)(':id/reject'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ApprovalController.prototype, "reject", null);
_ts_decorate([
    (0, _common.Post)(':id/bypass'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ApprovalController.prototype, "bypass", null);
_ts_decorate([
    (0, _common.Post)('request/table-access'),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ApprovalController.prototype, "requestTableAccess", null);
ApprovalController = _ts_decorate([
    (0, _throttler.SkipThrottle)(),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    (0, _common.Controller)('approval'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _approvalservice.ApprovalService === "undefined" ? Object : _approvalservice.ApprovalService,
        typeof _userservice.UserService === "undefined" ? Object : _userservice.UserService
    ])
], ApprovalController);

//# sourceMappingURL=approval.controller.js.map