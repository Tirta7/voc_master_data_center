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
    async handleTableStatus(data, context) {
        const topic = context.getTopic();
        // Topic: billiard/table/:idOrMac/status
        const parts = topic.split('/');
        const idOrMac = parts[2];
        this.logger.debug(`Received status message for ${idOrMac}: ${JSON.stringify(data)}`);
        // 1. Jika payload sudah punya tableId (standard baru)
        if (data.tableId) {
            await this.billiardService.handleHeartbeat(data.tableId, data);
            return;
        }
        // 2. Jika topic berupa angka (Table ID)
        if (!isNaN(Number(idOrMac))) {
            await this.billiardService.handleHeartbeat(Number(idOrMac), data);
            return;
        }
        // 3. Jika topic berupa MAC Address (Resolve ke satu atau banyak tableId)
        await this.billiardService.handleHeartbeatByMac(idOrMac, data);
    }
    async getAllTables() {
        return this.billiardService.getAllTables();
    }
    async getSuggestedId() {
        const nextId = await this.billiardService.getSuggestedMesaId();
        return {
            nextId
        };
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
        // ✅ v7.0: Cooldown Redis dihapus dari sini.
        // Debounce (80ms) kini dilakukan di Frontend (cancel-and-replace pattern).
        // Backend hanya perlu memproses setiap request valid yang masuk.
        // Anti-spam sesungguhnya sudah ada di BilliardService.lastCommandAt (v17.2).
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
    async testGpio(id, pin, isOn) {
        return this.billiardService.testGpioPin(+id, +pin, isOn);
    }
    async startSession(id, body, req) {
        this.logger.log(`BilliardController.startSession: ${id}, user: ${req.user.id}, customer: ${body.customerName}, pkg: ${body.packageId}, member: ${body.memberId}`);
        return this.billiardService.startSession(id, body.type, body.duration, body.customerName, body.packageId, body.customPriceSettings, body.promoId, req.user.id, req.user.username, body.memberId, body.idempotencyKey);
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
    async resetTable(id, req) {
        return this.billiardService.resetTable(+id, req.user.username);
    }
    async rebootTable(id) {
        return this.billiardService.rebootTable(+id);
    }
    async resetAllDbTables(req) {
        try {
            const tables = await this.billiardService.getAllTables();
            for (const table of tables){
                await this.billiardService.resetTable(table.id, req.user.username);
            }
            // Also mark all UNPAID transactions as CANCELLED (or COMPLETED if that is the business rule)
            // reset-tables.js used COMPLETED, but for a global reset, CANCELLED might be safer unless they are already "done".
            // We will stick to the service's transaction cleanup if we add it there.
            return {
                message: `${tables.length} tables successfully reset.`
            };
        } catch (e) {
            this.logger.error(e);
            return {
                error: e.message
            };
        }
    }
    async emergencyStop(req) {
        return this.billiardService.emergencyStop(req.user.username);
    }
    // ✅ v7.0: Endpoint monitoring per-Prajurit (untuk Hardware Health page)
    async getPrajuritNodes() {
        const nodes = Array.from(this.billiardService.prajuritNodeMap.values());
        const summary = {
            total: nodes.length,
            online: nodes.filter((n)=>n.online).length,
            offline: nodes.filter((n)=>!n.online).length,
            ackPending: nodes.filter((n)=>n.ackPending).length
        };
        return {
            summary,
            nodes
        };
    }
    constructor(billiardService){
        this.billiardService = billiardService;
        this.logger = new _common.Logger(BilliardController.name);
    }
};
_ts_decorate([
    (0, _microservices.MessagePattern)('billiard/table/+/status'),
    _ts_param(0, (0, _microservices.Payload)()),
    _ts_param(1, (0, _microservices.Ctx)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _microservices.MqttContext === "undefined" ? Object : _microservices.MqttContext
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
    (0, _common.Get)('suggested-id'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "getSuggestedId", null);
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
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "getPackages", null);
_ts_decorate([
    (0, _common.Post)('packages'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "createPackage", null);
_ts_decorate([
    (0, _common.Delete)('packages/:id'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "deletePackage", null);
_ts_decorate([
    (0, _common.Patch)('packages/:id'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
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
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Partial === "undefined" ? Object : Partial
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "createTable", null);
_ts_decorate([
    (0, _common.Patch)('tables/:id'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
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
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "deleteTable", null);
_ts_decorate([
    (0, _common.Patch)('tables/:id/status'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
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
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
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
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "pingAllTables", null);
_ts_decorate([
    (0, _common.Post)('tables/:id/ping'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "pingTable", null);
_ts_decorate([
    (0, _common.Patch)('tables/:id/gpio/:pin'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Param)('pin')),
    _ts_param(2, (0, _common.Body)('isOn')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String,
        Boolean
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "testGpio", null);
_ts_decorate([
    (0, _common.Post)('tables/:id/start'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
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
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
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
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
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
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
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
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
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
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "resetTable", null);
_ts_decorate([
    (0, _common.Post)('tables/:id/reboot'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "rebootTable", null);
_ts_decorate([
    (0, _common.Post)('reset-all'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "resetAllDbTables", null);
_ts_decorate([
    (0, _common.Post)('emergency-stop'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "emergencyStop", null);
_ts_decorate([
    (0, _common.Get)('prajurit/nodes'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], BilliardController.prototype, "getPrajuritNodes", null);
BilliardController = _ts_decorate([
    (0, _common.Controller)('billiard'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _billiardservice.BilliardService === "undefined" ? Object : _billiardservice.BilliardService
    ])
], BilliardController);

//# sourceMappingURL=billiard.controller.js.map