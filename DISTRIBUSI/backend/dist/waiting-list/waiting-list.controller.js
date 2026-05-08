"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "WaitingListController", {
    enumerable: true,
    get: function() {
        return WaitingListController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _waitinglistservice = require("./waiting-list.service");
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
let WaitingListController = class WaitingListController {
    findAll(type) {
        return this.waitingListService.findAll(type);
    }
    createPublic(data) {
        return this.waitingListService.create(data);
    }
    create(data) {
        return this.waitingListService.create(data);
    }
    assign(id, tableId, req) {
        return this.waitingListService.assignToTable(+id, tableId, req.user.id, req.user.username);
    }
    unassign(id, req) {
        return this.waitingListService.unassignTable(+id, req.user.id, req.user.username);
    }
    remove(id, req) {
        return this.waitingListService.cancel(+id, req.user.id, req.user.username);
    }
    handle(id, req) {
        return this.waitingListService.handle(+id, req.user.id, req.user.username);
    }
    unhandle(id, req) {
        return this.waitingListService.unhandle(+id, req.user.id, req.user.username);
    }
    constructor(waitingListService){
        this.waitingListService = waitingListService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    _ts_param(0, (0, _common.Query)('type')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], WaitingListController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Post)('public'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Partial === "undefined" ? Object : Partial
    ]),
    _ts_metadata("design:returntype", void 0)
], WaitingListController.prototype, "createPublic", null);
_ts_decorate([
    (0, _common.Post)(),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Partial === "undefined" ? Object : Partial
    ]),
    _ts_metadata("design:returntype", void 0)
], WaitingListController.prototype, "create", null);
_ts_decorate([
    (0, _common.Patch)(':id/assign'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('tableId')),
    _ts_param(2, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Number,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], WaitingListController.prototype, "assign", null);
_ts_decorate([
    (0, _common.Patch)(':id/unassign'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], WaitingListController.prototype, "unassign", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], WaitingListController.prototype, "remove", null);
_ts_decorate([
    (0, _common.Patch)(':id/handle'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], WaitingListController.prototype, "handle", null);
_ts_decorate([
    (0, _common.Patch)(':id/unhandle'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], WaitingListController.prototype, "unhandle", null);
WaitingListController = _ts_decorate([
    (0, _common.Controller)('waiting-list'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _waitinglistservice.WaitingListService === "undefined" ? Object : _waitinglistservice.WaitingListService
    ])
], WaitingListController);

//# sourceMappingURL=waiting-list.controller.js.map