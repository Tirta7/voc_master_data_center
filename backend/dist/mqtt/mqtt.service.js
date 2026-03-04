"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MqttService", {
    enumerable: true,
    get: function() {
        return MqttService;
    }
});
const _common = require("@nestjs/common");
const _microservices = require("@nestjs/microservices");
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
let MqttService = class MqttService {
    publish(topic, data) {
        try {
            this.client.emit(topic, data);
            this.logger.log(`Published to ${topic}`);
        } catch (error) {
            this.logger.error(`Failed to publish to ${topic}: ${error.message}`);
        }
    }
    // Helper methods for common topics
    broadcastTableUpdate(data) {
        this.publish('billiard/tables/update', data);
    }
    broadcastMemberBalance(memberId, balance) {
        this.publish(`billiard/member/${memberId}/balance`, {
            memberId,
            balance
        });
    }
    broadcastUserStatus(userId, status) {
        this.publish(`billiard/user/${userId}/status`, {
            userId,
            status
        });
    }
    broadcastTransactionUpdate(data) {
        this.publish('billiard/finance/transaction', data);
    }
    broadcastWarning(data) {
        this.publish('billiard/notifications/warning', data);
    }
    broadcastOrderUpdate(data) {
        this.publish('billiard/order/update', data);
    }
    broadcastWaitingListUpdate(data) {
        this.publish('billiard/waiting-list/update', data);
    }
    broadcastShiftStarted(data) {
        this.publish('billiard/shift/started', data);
    }
    broadcastShiftEnded(data) {
        this.publish('billiard/shift/ended', data);
    }
    broadcastAssignmentsUpdated(data) {
        this.publish('billiard/assignments/updated', data);
    }
    broadcastInventoryUpdate(data) {
        this.publish('billiard/inventory/update', data);
    }
    broadcastMenuAvailability(data) {
        this.publish('billiard/menu/availability', data);
    }
    broadcastFinanceUpdate(data) {
        this.publish('billiard/finance/update', data);
    }
    broadcastMemberUpdate(data) {
        this.publish('billiard/member/update', data);
    }
    broadcastUserViolation(userId, data) {
        this.publish(`billiard/user/${userId}/violation`, data);
    }
    broadcastForceLogout(userId) {
        this.publish(`billiard/user/${userId}/force_logout`, {
            userId
        });
    }
    broadcastAuditUpdate(data) {
        this.publish('billiard/audit/update', data);
    }
    // Send a ping to a specific table's ESP32 device to check connectivity
    pingTable(macAddress, tableId) {
        const topic = `billiard/table/${macAddress}/ping`;
        this.publish(topic, {
            tableId,
            command: 'PING',
            timestamp: new Date().toISOString()
        });
        return {
            topic,
            sentAt: new Date().toISOString()
        };
    }
    // Manual light override — sends ON/OFF with force:true so ESP32 bypasses race condition protection
    publishLightCommand(macAddress, tableId, isOn, relayPin) {
        const topic = `billiard/table/${macAddress}/light/set`;
        this.publish(topic, {
            status: isOn ? 'ON' : 'OFF',
            relayPin,
            tableId,
            manual: true,
            force: true,
            timestamp: new Date().toISOString()
        });
        return {
            topic,
            sentAt: new Date().toISOString()
        };
    }
    constructor(client){
        this.client = client;
        this.logger = new _common.Logger(MqttService.name);
    }
};
MqttService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _common.Inject)('MQTT_CLIENT')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _microservices.ClientProxy === "undefined" ? Object : _microservices.ClientProxy
    ])
], MqttService);

//# sourceMappingURL=mqtt.service.js.map