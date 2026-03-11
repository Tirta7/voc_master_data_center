"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MemberController", {
    enumerable: true,
    get: function() {
        return MemberController;
    }
});
const _memberservice = require("./member.service");
const _passport = require("@nestjs/passport");
const _common = require("@nestjs/common");
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
let MemberController = class MemberController {
    // --- Tier Endpoints ---
    async getAllTiers() {
        return this.memberService.getAllTiers();
    }
    async createTier(data) {
        return this.memberService.createTier(data);
    }
    async updateTier(id, data) {
        return this.memberService.updateTier(id, data);
    }
    async deleteTier(id) {
        return this.memberService.deleteTier(id);
    }
    // --- Member Endpoints ---
    async getAll() {
        return this.memberService.getAllMembers();
    }
    async create(data) {
        return this.memberService.createMember(data);
    }
    async update(id, data) {
        return this.memberService.updateMember(id, data);
    }
    async delete(id) {
        return this.memberService.deleteMember(id);
    }
    async getByRfid(uid) {
        return this.memberService.getMemberByRfid(uid);
    }
    async getByCode(code, v) {
        return this.memberService.getMemberByCode(code, v ? Number(v) : undefined);
    }
    async topUp(id, amount, paymentMethod, req) {
        return this.memberService.topUp(id, amount, req.user?.id, paymentMethod);
    }
    async getActivityLogs(id) {
        return this.memberService.getMemberActivityLogs(id);
    }
    async getCardUrl(id) {
        const cardUrl = await this.memberService.ensureCardGenerated(id);
        return {
            cardUrl
        };
    }
    async regenerateQr(id) {
        return this.memberService.regenerateQrCode(id);
    }
    async resendWa(id) {
        return this.memberService.sendWelcomeCard(id);
    }
    constructor(memberService){
        this.memberService = memberService;
    }
};
_ts_decorate([
    (0, _common.Get)('tiers'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], MemberController.prototype, "getAllTiers", null);
_ts_decorate([
    (0, _common.Post)('tiers'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], MemberController.prototype, "createTier", null);
_ts_decorate([
    (0, _common.Patch)('tiers/:id'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], MemberController.prototype, "updateTier", null);
_ts_decorate([
    (0, _common.Delete)('tiers/:id'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], MemberController.prototype, "deleteTier", null);
_ts_decorate([
    (0, _common.Get)(),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], MemberController.prototype, "getAll", null);
_ts_decorate([
    (0, _common.Post)(),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], MemberController.prototype, "create", null);
_ts_decorate([
    (0, _common.Patch)(':id'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], MemberController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], MemberController.prototype, "delete", null);
_ts_decorate([
    (0, _common.Get)('rfid/:uid'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('uid')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MemberController.prototype, "getByRfid", null);
_ts_decorate([
    (0, _common.Get)('scan/:code'),
    _ts_param(0, (0, _common.Param)('code')),
    _ts_param(1, (0, _common.Query)('v')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MemberController.prototype, "getByCode", null);
_ts_decorate([
    (0, _common.Patch)(':id/topup'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('amount')),
    _ts_param(2, (0, _common.Body)('paymentMethod')),
    _ts_param(3, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Number,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], MemberController.prototype, "topUp", null);
_ts_decorate([
    (0, _common.Get)(':id/logs'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], MemberController.prototype, "getActivityLogs", null);
_ts_decorate([
    (0, _common.Get)(':id/card-url'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], MemberController.prototype, "getCardUrl", null);
_ts_decorate([
    (0, _common.Post)(':id/regenerate-qr'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], MemberController.prototype, "regenerateQr", null);
_ts_decorate([
    (0, _common.Post)(':id/resend-wa'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], MemberController.prototype, "resendWa", null);
MemberController = _ts_decorate([
    (0, _common.Controller)('members'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _memberservice.MemberService === "undefined" ? Object : _memberservice.MemberService
    ])
], MemberController);

//# sourceMappingURL=member.controller.js.map