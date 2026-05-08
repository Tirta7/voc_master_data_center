"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "LockerController", {
    enumerable: true,
    get: function() {
        return LockerController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _lockerservice = require("./locker.service");
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
let LockerController = class LockerController {
    findAll() {
        return this.lockerService.getAllLockers();
    }
    getStats() {
        return this.lockerService.getStats();
    }
    create(dto) {
        return this.lockerService.createLocker(dto);
    }
    bulkCreate(dto) {
        return this.lockerService.bulkCreateLockers(dto);
    }
    update(id, dto) {
        return this.lockerService.updateLocker(+id, dto);
    }
    remove(id) {
        return this.lockerService.deleteLocker(+id);
    }
    checkIn(id, dto, req) {
        return this.lockerService.checkIn(+id, {
            ...dto,
            handledById: req.user.id,
            handledByName: req.user.username
        });
    }
    verifyPin(id, pin) {
        return this.lockerService.verifyPin(+id, pin);
    }
    checkOut(id, pin, req) {
        return this.lockerService.checkOut(+id, pin, req.user.username);
    }
    forceCheckOut(id, req) {
        return this.lockerService.forceCheckOut(+id, req.user.username);
    }
    unlock(id) {
        return this.lockerService.unlockByStaff(+id);
    }
    getActiveSessions() {
        return this.lockerService.getActiveSessions();
    }
    getHistory(query) {
        return this.lockerService.getHistory(query);
    }
    getMemberBenefit(id) {
        return this.lockerService.getMemberLockerBenefit(+id);
    }
    constructor(lockerService){
        this.lockerService = lockerService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], LockerController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)('stats'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], LockerController.prototype, "getStats", null);
_ts_decorate([
    (0, _common.Post)(),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], LockerController.prototype, "create", null);
_ts_decorate([
    (0, _common.Post)('bulk'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], LockerController.prototype, "bulkCreate", null);
_ts_decorate([
    (0, _common.Patch)(':id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], LockerController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], LockerController.prototype, "remove", null);
_ts_decorate([
    (0, _common.Post)(':id/checkin'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], LockerController.prototype, "checkIn", null);
_ts_decorate([
    (0, _common.Post)(':id/verify-pin'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('pin')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], LockerController.prototype, "verifyPin", null);
_ts_decorate([
    (0, _common.Post)(':id/checkout'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('pin')),
    _ts_param(2, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], LockerController.prototype, "checkOut", null);
_ts_decorate([
    (0, _common.Post)(':id/force-checkout'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], LockerController.prototype, "forceCheckOut", null);
_ts_decorate([
    (0, _common.Post)(':id/unlock'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], LockerController.prototype, "unlock", null);
_ts_decorate([
    (0, _common.Get)('sessions/active'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], LockerController.prototype, "getActiveSessions", null);
_ts_decorate([
    (0, _common.Get)('sessions/history'),
    _ts_param(0, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], LockerController.prototype, "getHistory", null);
_ts_decorate([
    (0, _common.Get)('member-benefit/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], LockerController.prototype, "getMemberBenefit", null);
LockerController = _ts_decorate([
    (0, _common.Controller)('lockers'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _lockerservice.LockerService === "undefined" ? Object : _lockerservice.LockerService
    ])
], LockerController);

//# sourceMappingURL=locker.controller.js.map