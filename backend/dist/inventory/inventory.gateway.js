"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "InventoryGateway", {
    enumerable: true,
    get: function() {
        return InventoryGateway;
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
let InventoryGateway = class InventoryGateway {
    afterInit(server) {
        this.logger.log('Inventory Gateway Initialized');
    }
    handleConnection(client) {
        this.logger.log(`Client connected to inventory: ${client.id}`);
        // Send a welcome event to verify connectivity
        client.emit('connectionConfirmed', {
            status: 'ok',
            timestamp: new Date()
        });
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected from inventory: ${client.id}`);
    }
    broadcastStockUpdate(data) {
        this.server.emit('inventoryUpdate', data);
    }
    broadcastMenuAvailability(data) {
        this.server.emit('menuAvailability', data);
    }
    constructor(){
        this.logger = new _common.Logger('InventoryGateway');
    }
};
_ts_decorate([
    (0, _websockets.WebSocketServer)(),
    _ts_metadata("design:type", typeof _socketio.Server === "undefined" ? Object : _socketio.Server)
], InventoryGateway.prototype, "server", void 0);
InventoryGateway = _ts_decorate([
    (0, _common.Injectable)(),
    (0, _websockets.WebSocketGateway)({
        cors: {
            origin: '*'
        },
        namespace: 'inventory'
    })
], InventoryGateway);

//# sourceMappingURL=inventory.gateway.js.map