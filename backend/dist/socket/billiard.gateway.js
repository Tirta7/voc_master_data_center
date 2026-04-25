"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "BilliardGateway", {
    enumerable: true,
    get: function() {
        return BilliardGateway;
    }
});
const _websockets = require("@nestjs/websockets");
const _socketio = require("socket.io");
const _common = require("@nestjs/common");
const _eventemitter = require("@nestjs/event-emitter");
const _mqttservice = require("../mqtt/mqtt.service");
const _schedule = require("@nestjs/schedule");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let BilliardGateway = class BilliardGateway {
    afterInit(server) {
        this.logger.log('Gateway Initialized');
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    handleConnection(client, ...args) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    /**
   * Received heartbeat from ESP32 via MQTT (bridged by service)
   */ handleHeartbeat(tableId, telemetry) {
        if (telemetry?.tableIdentity) {
            this.tableIdentities.set(tableId, telemetry.tableIdentity);
        }
        // Capture explicit offline status (e.g. from MQTT LWT or Gateway)
        const isOnline = telemetry?.online !== false && telemetry?.status !== 'offline';
        if (!isOnline) {
            // Explicitly marked offline (LWT) - clear timer and report immediately
            this.lastSeen.delete(tableId);
            this.liveTelemetry.delete(tableId); // Clear telemetry cache on disconnect (v17.4)
            const identity = this.tableIdentities.get(tableId) || `Table ${tableId}`;
            this.logger.warn(`ESP32 for ${identity} reported OFFLINE from Gateway (LWT)!`);
            this.server.emit('heartbeat', {
                tableId,
                status: 'OFFLINE'
            });
            this.mqttService.publish(`billiard/heartbeat/${tableId}`, {
                tableId,
                status: 'OFFLINE'
            });
            // 🛡️ TRIGGER REFRESH (v17.4)
            this.eventEmitter.emit('table.offline', tableId);
            return;
        }
        const isRetained = telemetry?.isRetained === true;
        const isAlreadyKnown = this.lastSeen.has(tableId);
        // 🛡️ LENIENT STARTUP (v18.7): 
        // If the table is currently 'Unknown' (e.g. after server restart),
        // we accept a retained heartbeat as a temporary 'Online' status.
        if (!isRetained || !isAlreadyKnown) {
            this.lastSeen.set(tableId, Date.now());
        } else {
            this.logger.debug(`[GHOST-BLOCK] 🛡️ Ignored retained heartbeat for ${tableId} (Keeping current timer)`);
        }
        this.liveTelemetry.set(tableId, telemetry); // Cache for hydration (v13)
        const payload = {
            ...telemetry,
            tableId,
            connectivity: 'ONLINE',
            timestamp: new Date().toISOString()
        };
        this.server.emit('heartbeat', payload);
        this.mqttService.publish(`billiard/heartbeat/${tableId}`, payload);
    }
    isTableOnline(tableId) {
        const lastSeen = this.lastSeen.get(tableId);
        if (!lastSeen) return false;
        // 🛡️ Safe threshold (60s) to accommodate 30s hardware heartbeat (v18)
        return Date.now() - lastSeen < 60000;
    }
    /**
   * 🛡️ INSTANT EVICTION (v17.5)
   * Forcefully marks a table as offline in memory.
   */ forceOffline(tableId) {
        this.lastSeen.delete(tableId);
        this.liveTelemetry.delete(tableId);
        // 🛡️ INSTANT UI EVICTION (v17.5)
        // Emit heartbeat-OFFLINE so the frontend updates immediately
        this.server.emit('heartbeat', {
            tableId,
            connectivity: 'OFFLINE'
        });
        this.eventEmitter.emit('table.offline', tableId);
    }
    checkHeartbeats() {
        const now = Date.now();
        this.lastSeen.forEach((time, tableId)=>{
            // 60s timeout
            if (now - time > 60000) {
                this.logger.warn(`ESP32 for table ${tableId} is OFFLINE! (Inactivity Timeout)`);
                this.forceOffline(tableId);
                this.mqttService.publish(`billiard/heartbeat/${tableId}`, {
                    tableId,
                    status: 'OFFLINE'
                });
                // 🛡️ TRIGGER REFRESH (v17.4)
                this.eventEmitter.emit('table.offline', tableId);
            }
        });
    }
    // Method to broadcast table status changes
    broadcastTableUpdate(tableData) {
        this.server.emit('tableUpdate', tableData);
        this.mqttService.broadcastTableUpdate(tableData);
    }
    // Method to broadcast all table statuses at once (Global Sync v12)
    broadcastAllTables(tables) {
        this.server.emit('full_sync', tables);
    }
    // Method to broadcast F&B item status changes
    broadcastOrderItemUpdate(data) {
        this.server.emit('orderItemUpdated', data);
        this.mqttService.publish('billiard/order/update', data);
    }
    // Method to broadcast financial/transaction changes
    broadcastTransactionUpdate(data) {
        this.server.emit('transactionUpdated', data);
    // Removed redundant MQTT broadcast to prevent double console logs in UI
    // this.mqttService.broadcastTransactionUpdate(data);
    }
    broadcastMemberBalance(memberId, balance) {
        this.server.emit('memberBalanceUpdated', {
            memberId,
            balance
        });
    // this.mqttService.broadcastMemberBalance(memberId, balance);
    }
    broadcastMemberUpdate(member) {
        this.server.emit('member_update', member);
    // this.mqttService.broadcastMemberUpdate(member);
    }
    broadcastFinanceUpdate(data) {
        this.server.emit('financeUpdate', data);
    // this.mqttService.broadcastFinanceUpdate(data);
    }
    broadcastAuditUpdate(data) {
        this.server.emit('auditUpdate', data);
    // this.mqttService.broadcastAuditUpdate(data);
    }
    broadcastWarning(title, message, tableId) {
        this.server.emit('warningNotification', {
            title,
            message,
            tableId
        });
        this.mqttService.broadcastWarning({
            title,
            message,
            tableId
        });
    }
    broadcastWaitingListUpdate(data) {
        this.server.emit('waitingListUpdate', data);
    // this.mqttService.publish('billiard/waiting-list/update', data);
    }
    broadcastDebtUpdate() {
        this.server.emit('debt_updated');
    }
    handleRequestAllTables(client, payload) {
    // This will be handled by the service and returned via this gateway if needed
    }
    constructor(mqttService, eventEmitter){
        this.mqttService = mqttService;
        this.eventEmitter = eventEmitter;
        this.logger = new _common.Logger('BilliardGateway');
        this.lastSeen = new Map();
        this.tableIdentities = new Map();
        this.liveTelemetry = new Map(); // Store latest telemetry for hydration
    }
};
_ts_decorate([
    (0, _websockets.WebSocketServer)(),
    _ts_metadata("design:type", typeof _socketio.Server === "undefined" ? Object : _socketio.Server)
], BilliardGateway.prototype, "server", void 0);
_ts_decorate([
    (0, _schedule.Cron)(_schedule.CronExpression.EVERY_10_SECONDS),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], BilliardGateway.prototype, "checkHeartbeats", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('requestAllTables'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], BilliardGateway.prototype, "handleRequestAllTables", null);
BilliardGateway = _ts_decorate([
    (0, _websockets.WebSocketGateway)({
        cors: {
            origin: '*'
        }
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _mqttservice.MqttService === "undefined" ? Object : _mqttservice.MqttService,
        typeof _eventemitter.EventEmitter2 === "undefined" ? Object : _eventemitter.EventEmitter2
    ])
], BilliardGateway);

//# sourceMappingURL=billiard.gateway.js.map