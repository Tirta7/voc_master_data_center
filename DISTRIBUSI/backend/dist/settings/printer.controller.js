"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PrinterController", {
    enumerable: true,
    get: function() {
        return PrinterController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _printerservice = require("./printer.service");
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
let PrinterController = class PrinterController {
    async findAll() {
        return this.printerService.findAll();
    }
    async create(data) {
        return this.printerService.create(data);
    }
    async update(id, data) {
        return this.printerService.update(id, data);
    }
    async remove(id) {
        return this.printerService.remove(id);
    }
    async testPrint(id) {
        const success = await this.printerService.testPrint(id);
        return {
            success
        };
    }
    constructor(printerService){
        this.printerService = printerService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PrinterController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Post)(),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Partial === "undefined" ? Object : Partial
    ]),
    _ts_metadata("design:returntype", Promise)
], PrinterController.prototype, "create", null);
_ts_decorate([
    (0, _common.Patch)(':id'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof Partial === "undefined" ? Object : Partial
    ]),
    _ts_metadata("design:returntype", Promise)
], PrinterController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], PrinterController.prototype, "remove", null);
_ts_decorate([
    (0, _common.Post)(':id/test'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], PrinterController.prototype, "testPrint", null);
PrinterController = _ts_decorate([
    (0, _common.Controller)('settings/printers'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _printerservice.PrinterService === "undefined" ? Object : _printerservice.PrinterService
    ])
], PrinterController);

//# sourceMappingURL=printer.controller.js.map