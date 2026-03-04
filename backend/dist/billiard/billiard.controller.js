"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "BilliardController", {
    enumerable: true,
    get: function() {
        return BilliardController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _microservices = require("@nestjs/microservices");
const _billiardservice = require("./billiard.service");
const _tableentity = require("./entities/table.entity");
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
let BilliardController = class BilliardController {
    async handleTableStatus(data) {
        // Topic example: billiard/table/1/status
        // In a real scenario, you'd extract the ID from the topic if Nest doesn't do it automatically
        // For simulation, let's assume data has tableId
        if (data.tableId) {
            await this.billiardService.handleHeartbeat(data.tableId);
        }
    }
    async getAllTables() {
        return this.billiardService.getAllTables();
    }
    async getTable(id) {
        return this.billiardService.getTableById(id);
    }
    async getPackages() {
        return this.billiardService.getPackages();
    }
    async createPackage(data) {
        return this.billiardService.createPackage(data);
    }
    async deletePackage(id) {
        return this.billiardService.deletePackage(id);
    }
    async updatePackage(id, data) {
        return this.billiardService.updatePackage(id, data);
    }
    async createTable(tableData) {
        return this.billiardService.createTable(tableData);
    }
    async updateTable(id, data) {
        return this.billiardService.updateTable(id, data);
    }
    async deleteTable(id) {
        return this.billiardService.deleteTable(id);
    }
    async updateStatus(id, status) {
        return this.billiardService.updateTableStatus(id, status);
    }
    async toggleLight(id, body) {
        // Explicitly check body.isOn — @Body('isOn') drops false values
        const isOn = body?.isOn === true;
        return this.billiardService.toggleLight(+id, isOn);
    }
    // NOTE: ping-all must be BEFORE tables/:id/ping to avoid route collision
    async pingAllTables() {
        const tables = await this.billiardService.getAllTables();
        const results = await Promise.allSettled(tables.map((t)=>this.billiardService.pingTable(t.id)));
        return results.map((r, i)=>({
                tableId: tables[i].id,
                tableName: tables[i].tableName,
                status: r.status,
                result: r.status === 'fulfilled' ? r.value : {
                    error: r.reason?.message
                }
            }));
    }
    async pingTable(id) {
        return this.billiardService.pingTable(+id);
    }
    async startSession(id, body, req) {
        this.logger.log(`BilliardController.startSession: ${id}, user: ${req.user.id}, customer: ${body.customerName}, pkg: ${body.packageId}, member: ${body.memberId}`);
        return this.billiardService.startSession(id, body.type, body.duration, body.customerName, body.packageId, body.customPriceSettings, body.promoId, req.user.id, req.user.username, body.memberId);
    }
    async stopSession(id, req) {
        return this.billiardService.stopSession(id, req.user.id, req.user.username);
    }
    async switchSession(id, body) {
        return this.billiardService.switchSession(id, body.type, body.duration);
    }
    async extendSession(id, body, req) {
        this.logger.log(`BilliardController.extendSession: Requested for table ${id} by ${req.user.username}. Duration: ${body.duration}, Pkg: ${body.packageId}`);
        return this.billiardService.extendSession(id, body.duration, body.packageId, req.user.username, body.ignoreConflict);
    }
    async moveTable(data, req) {
        return this.billiardService.moveTable(data.fromTableId, data.toTableId, req.user.username);
    }
    async resetTable(id) {
        return this.billiardService.resetTable(+id);
    }
    async resetAllDbTables() {
        try {
            await this.billiardService['tableRepository'].query(`UPDATE tables SET status = 'AVAILABLE', active_transaction_id = NULL, start_time = NULL, end_time = NULL, duration = NULL, order_id = NULL`);
            await this.billiardService['tableRepository'].query(`UPDATE transactions SET status = 'COMPLETED', is_active = false WHERE status = 'ACTIVE' OR is_active = true`);
            return {
                message: 'Tables and transactions successfully reset.'
            };
        } catch (e) {
            this.logger.error(e);
            return {
                error: e.message
            };
        }
    }
    constructor(billiardService){
        this.billiardService = billiardService;
        this.logger = new _common.Logger(BilliardController.name);
    }
};
_ts_decorate([
    (0, _microservices.MessagePattern)('billiard/table/+/status'),
    _ts_param(0, (0, _microservices.Payload)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "handleTableStatus", null);
_ts_decorate([
    (0, _common.Get)('tables'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "getAllTables", null);
_ts_decorate([
    (0, _common.Get)('tables/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "getTable", null);
_ts_decorate([
    (0, _common.Get)('packages'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "getPackages", null);
_ts_decorate([
    (0, _common.Post)('packages'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "createPackage", null);
_ts_decorate([
    (0, _common.Delete)('packages/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "deletePackage", null);
_ts_decorate([
    (0, _common.Patch)('packages/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "updatePackage", null);
_ts_decorate([
    (0, _common.Post)('tables'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Partial === "undefined" ? Object : Partial
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "createTable", null);
_ts_decorate([
    (0, _common.Patch)('tables/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof Partial === "undefined" ? Object : Partial
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "updateTable", null);
_ts_decorate([
    (0, _common.Delete)('tables/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "deleteTable", null);
_ts_decorate([
    (0, _common.Patch)('tables/:id/status'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('status')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _tableentity.TableStatus === "undefined" ? Object : _tableentity.TableStatus
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "updateStatus", null);
_ts_decorate([
    (0, _common.Patch)('tables/:id/toggle-light'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "toggleLight", null);
_ts_decorate([
    (0, _common.Post)('tables/ping-all'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "pingAllTables", null);
_ts_decorate([
    (0, _common.Post)('tables/:id/ping'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "pingTable", null);
_ts_decorate([
    (0, _common.Post)('tables/:id/start'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "startSession", null);
_ts_decorate([
    (0, _common.Post)('tables/:id/stop'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "stopSession", null);
_ts_decorate([
    (0, _common.Patch)('tables/:id/switch-session'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "switchSession", null);
_ts_decorate([
    (0, _common.Post)('tables/:id/extend'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "extendSession", null);
_ts_decorate([
    (0, _common.Post)('move'),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "moveTable", null);
_ts_decorate([
    (0, _common.Post)('tables/:id/reset'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "resetTable", null);
_ts_decorate([
    (0, _common.Post)('reset-all'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "resetAllDbTables", null);
BilliardController = _ts_decorate([
    (0, _common.Controller)('billiard'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _billiardservice.BilliardService === "undefined" ? Object : _billiardservice.BilliardService
    ])
], BilliardController);

//# sourceMappingURL=billiard.controller.js.map