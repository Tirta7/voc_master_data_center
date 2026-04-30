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
const _mqtt = /*#__PURE__*/ _interop_require_wildcard(require("mqtt"));
const _config = require("@nestjs/config");
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let MqttService = class MqttService {
    normalizeMac(mac) {
        if (!mac) return '';
        return mac.replace(/[:\-]/g, '').toUpperCase();
    }
    onModuleInit() {
        const url = this.configService.get('MQTT_URL') || 'mqtt://localhost:1883';
        this.logger.log(`Connecting to MQTT Broker at ${url}...`);
        this.client = _mqtt.connect(url, {
            clientId: `nestjs_server_${Math.random().toString(36).substr(2, 9)}`,
            clean: true,
            reconnectPeriod: 3000,
            connectTimeout: 10000
        });
        this.client.on('connect', ()=>{
            this.logger.log('SUCCESS: MqttService connected to broker');
            // Subscribe to sync requests from hardware
            this.client.subscribe('billiard/table/sync', (err)=>{
                if (err) this.logger.error('Failed to subscribe to sync topic');
                else this.logger.log('Subscribed to billiard/table/sync');
            });
            // Subscribe to all table status/telemetry topics
            this.client.subscribe('billiard/table/+/status', (err)=>{
                if (err) this.logger.error('Failed to subscribe to status topic');
                else this.logger.log('Subscribed to billiard/table/+/status');
            });
            // Subscribe to all gateway status & heartbeat topics (Optimized v10)
            this.client.subscribe('billiard/gateway/+/status', (err)=>{
                if (err) this.logger.error('Failed to subscribe to gateway status topic');
                else this.logger.log('Subscribed to billiard/gateway/+/status');
            });
            // Subscribe to legacy status topics (v18.2)
            this.client.subscribe('billiard/status/#', (err)=>{
                if (err) this.logger.error('Failed to subscribe to legacy status');
                else this.logger.log('Subscribed to billiard/status/#');
            });
            this.client.subscribe('billiard/gateway/+/heartbeat', (err)=>{
                if (err) this.logger.error('Failed to subscribe to gateway heartbeat topic');
                else this.logger.log('Subscribed to billiard/gateway/+/heartbeat');
            });
            // ✅ NEW v7.0: Subscribe ke status gateway per lantai (Prajurit Registry)
            this.client.subscribe('billiard/floor/+/gateway/+/status', (err)=>{
                if (err) this.logger.error('Failed to subscribe to floor gateway status');
                else this.logger.log('Subscribed to billiard/floor/+/gateway/+/status');
            });
            // ✅ NEW v7.1: Subscribe ke heartbeat individu dari Komandan
            this.client.subscribe('billiard/heartbeat/#', (err)=>{
                if (err) this.logger.error('Failed to subscribe to heartbeat topic');
                else this.logger.log('Subscribed to billiard/heartbeat/#');
            });
        });
        this.client.on('message', (topic, payload, packet)=>{
            this.logger.log(`[MQTT-RAW-IN] Topic: ${topic} | Handlers: ${this.messageHandlers.length}`);
            this.messageHandlers.forEach((handler, index)=>{
                try {
                    handler(topic, payload, packet);
                } catch (e) {
                    this.logger.error(`Error in MQTT handler #${index}: ${e.message}`);
                }
            });
        });
        this.client.on('error', (err)=>this.logger.log('MqttService error (Broker may be offline): ' + err.message));
    }
    onModuleDestroy() {
        this.client?.end(true);
    }
    onMessage(handler) {
        this.messageHandlers.push(handler);
        this.logger.log(`[MQTT-HANDLER] New handler registered. Total: ${this.messageHandlers.length}`);
    }
    /**
   * Subscribe to a topic and register a specific callback for it.
   * Essential for hardware integrations like RFID scanners.
   */ subscribe(topic, callback) {
        if (this.client) {
            this.client.subscribe(topic, (err)=>{
                if (err) this.logger.error(`Failed to subscribe to ${topic}: ${err.message}`);
                else this.logger.log(`Subscribed to ${topic}`);
            });
        }
        this.onMessage((t, p)=>{
            if (t === topic) callback(t, p);
        });
    }
    publish(topic, data, retain = false) {
        try {
            const payload = JSON.stringify(data);
            this.logger.debug(`>>> MQTT SEND -> [${topic}]: ${payload}${retain ? ' (RETAIN)' : ''}`);
            this.client.publish(topic, payload, {
                qos: 1,
                retain
            }, (err)=>{
                if (err) this.logger.error(`!!! MQTT FAIL to ${topic}: ${err.message}`);
                else this.logger.debug(`<<< MQTT SENT to ${topic}`);
            });
        } catch (error) {
            this.logger.error(`Failed to publish to ${topic}: ${error.message}`);
        }
    }
    // Helper methods for common topics
    broadcastTableUpdate(data) {
        this.publish('billiard/tables/update', data);
    }
    broadcastLockerUpdate(data) {
        this.publish('billiard/lockers/update', data);
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
    broadcastDisplaySync(url) {
        this.publish('billiard/attendance/feedback', {
            type: 'SYNC_DISPLAY',
            url,
            timestamp: new Date().toISOString()
        });
    }
    broadcastBattlePlanUpdate(data) {
        this.publish('billiard/ai/battle-plan/update', data);
    }
    // Send a ping to a specific table's ESP32 device to check connectivity
    pingTable(mac, tableId) {
        const macAddress = this.normalizeMac(mac);
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
    publishLightCommand(mac, tableId, isOn, relayPin, duration = 0, extend = false, force = false, additionalData = {}, hardwareType, caller = 'UNKNOWN') {
        const macAddress = this.normalizeMac(mac);
        const token = additionalData.token || Date.now() % 4294967295;
        this.logger.log(`[MQTT-JSON] [Caller: ${caller}] Sending command to table ${tableId}: ${isOn ? 'ON' : 'OFF'} (Token: ${token})`);
        const topic = `billiard/table/${macAddress}/light/set`;
        this.publish(topic, {
            status: isOn ? 'ON' : 'OFF',
            relayPin,
            tableId,
            mac: additionalData.targetMac || macAddress,
            duration,
            extend,
            force,
            token,
            timestamp: new Date().toISOString(),
            ...additionalData
        }, false);
        return {
            topic,
            token,
            sentAt: new Date().toISOString()
        };
    }
    // Raw GPIO pin control for diagnostics
    publishGpioCommand(mac, pin, isOn) {
        const macAddress = this.normalizeMac(mac);
        const topic = `billiard/table/${macAddress}/gpio/set`;
        this.publish(topic, {
            pin,
            status: isOn ? 'ON' : 'OFF',
            timestamp: new Date().toISOString()
        });
        return {
            topic,
            sentAt: new Date().toISOString()
        };
    }
    publishLockerCommand(mac, lockerId, isOpen, relayPin) {
        const macAddress = this.normalizeMac(mac);
        const topic = `billiard/locker/${macAddress}/lock/set`;
        this.publish(topic, {
            status: isOpen ? 'OPEN' : 'CLOSE',
            relayPin,
            lockerId,
            timestamp: new Date().toISOString()
        });
        return {
            topic,
            sentAt: new Date().toISOString()
        };
    }
    // System management commands (e.g. Reboot, OTA, Configuration)
    publishSystemCommand(mac, command) {
        const macAddress = this.normalizeMac(mac);
        const topic = `billiard/table/${macAddress}/system/set`;
        this.publish(topic, {
            command,
            timestamp: new Date().toISOString()
        });
        return {
            topic,
            sentAt: new Date().toISOString()
        };
    }
    // Kirim konfigurasi pin baru ke ESP32 saat relayPin berubah di Admin
    // ESP32 akan update SPIFFS-nya via /config/set handler
    publishPinConfig(mac, mocPin) {
        const macAddress = this.normalizeMac(mac);
        if (!macAddress) return;
        const topic = `billiard/table/${macAddress}/config/set`;
        this.publish(topic, {
            mocPin,
            timestamp: new Date().toISOString()
        }, true);
        this.logger.log(`[PIN CONFIG] Sent mocPin=${mocPin} to ${macAddress}`);
        return {
            topic,
            sentAt: new Date().toISOString()
        };
    }
    constructor(configService){
        this.configService = configService;
        this.logger = new _common.Logger(MqttService.name);
        this.messageHandlers = [];
    }
};
MqttService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], MqttService);

//# sourceMappingURL=mqtt.service.js.map