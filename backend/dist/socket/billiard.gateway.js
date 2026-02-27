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
        // Periodically check for offline devices
        setInterval(()=>this.checkHeartbeats(), 10000); // Every 10s
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    handleConnection(client, ...args) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    /**
     * Received heartbeat from ESP32 via MQTT (bridged by service)
     */ handleHeartbeat(tableId) {
        this.lastSeen.set(tableId, Date.now());
        this.server.emit('heartbeat', {
            tableId,
            status: 'ONLINE'
        });
    }
    checkHeartbeats() {
        const now = Date.now();
        this.lastSeen.forEach((timestamp, tableId)=>{
            if (now - timestamp > 60000) {
                this.logger.warn(`ESP32 for table ${tableId} is OFFLINE!`);
                this.server.emit('heartbeat', {
                    tableId,
                    status: 'OFFLINE'
                });
            }
        });
    }
    // Method to broadcast table status changes
    broadcastTableUpdate(tableData) {
        this.server.emit('tableUpdate', tableData);
    }
    // Method to broadcast F&B item status changes
    broadcastOrderItemUpdate(data) {
        this.server.emit('orderItemUpdated', data);
    }
    // Method to broadcast financial/transaction changes
    broadcastTransactionUpdate(data) {
        this.server.emit('transactionUpdated', data);
    }
    broadcastMemberBalance(memberId, balance) {
        this.server.emit('memberBalanceUpdated', {
            memberId,
            balance
        });
    }
    broadcastWarning(title, message, tableId) {
        this.server.emit('warningNotification', {
            title,
            message,
            tableId
        });
    }
    handleRequestAllTables(client, payload) {
    // This will be handled by the service and returned via this gateway if needed
    }
    constructor(){
        this.logger = new _common.Logger('BilliardGateway');
        this.lastSeen = new Map();
    }
};
_ts_decorate([
    (0, _websockets.WebSocketServer)(),
    _ts_metadata("design:type", typeof _socketio.Server === "undefined" ? Object : _socketio.Server)
], BilliardGateway.prototype, "server", void 0);
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
    })
], BilliardGateway);

//# sourceMappingURL=billiard.gateway.js.map