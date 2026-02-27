"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "KdsGateway", {
    enumerable: true,
    get: function() {
        return KdsGateway;
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
let KdsGateway = class KdsGateway {
    afterInit(server) {
        this.logger.log('KDS Gateway Initialized');
    }
    handleDisconnect(client) {
        this.logger.log(`KDS Client disconnected: ${client.id}`);
    }
    handleConnection(client, ...args) {
        this.logger.log(`KDS Client connected: ${client.id}`);
    }
    /**
   * Send new order to KDS clients
   */ sendNewOrder(orderData) {
        this.server.emit('newOrder', {
            ...orderData,
            station: orderData.station || 'KDS',
            timestamp: new Date(),
            status: 'PENDING'
        });
    }
    handleUpdateStatus(client, payload) {
        this.logger.log(`Order ${payload.orderId} updated to ${payload.status} (Station: ${payload.station || 'Unknown'})`);
        this.server.emit('statusUpdated', payload);
    }
    /**
   * Broadcast that an item has been cancelled (and should be removed)
   */ sendItemCancelled(data) {
        this.server.emit('itemCancelled', data);
    }
    /**
   * Broadcast that a cancellation has been requested for a processing item
   */ sendCancellationRequest(data) {
        this.server.emit('cancellationRequested', data);
    }
    /**
   * Broadcast that a cancellation request has been rejected
   */ sendCancellationRejected(data) {
        this.server.emit('cancellationRejected', data);
    }
    constructor(){
        this.logger = new _common.Logger('KdsGateway');
    }
};
_ts_decorate([
    (0, _websockets.WebSocketServer)(),
    _ts_metadata("design:type", typeof _socketio.Server === "undefined" ? Object : _socketio.Server)
], KdsGateway.prototype, "server", void 0);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('updateOrderStatus'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], KdsGateway.prototype, "handleUpdateStatus", null);
KdsGateway = _ts_decorate([
    (0, _websockets.WebSocketGateway)({
        namespace: 'kds',
        cors: {
            origin: '*'
        }
    })
], KdsGateway);

//# sourceMappingURL=kds.gateway.js.map