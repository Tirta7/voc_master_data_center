"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "EventsGateway", {
    enumerable: true,
    get: function() {
        return EventsGateway;
    }
});
const _websockets = require("@nestjs/websockets");
const _socketio = require("socket.io");
const _userservice = require("../user/user.service");
const _userentity = require("../user/entities/user.entity");
const _violationentity = require("../user/entities/violation.entity");
const _mqttservice = require("../mqtt/mqtt.service");
const _common = require("@nestjs/common");
const _rxjs = require("rxjs");
const _operators = require("rxjs/operators");
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
let EventsGateway = class EventsGateway {
    afterInit(server) {
        this.logger.log('EventsGateway initialized');
        // Throttle SETTINGS_UPDATE broadcasts to avoid spamming clients during high load
        this.settingsUpdateSubject.pipe((0, _operators.auditTime)(1000)).subscribe((data)=>{
            this.server.emit('loyalty_updated', data);
        });
    }
    async handleConnection(client) {
        const userId = client.handshake.query.userId;
        if (userId) {
            const uId = +userId;
            // Track connection
            let connections = this.userConnections.get(uId);
            if (!connections) {
                connections = new Set();
                this.userConnections.set(uId, connections);
            }
            connections.add(client.id);
            // Process any accumulated idle time (including offline time)
            await this.processIdlePenalty(uId);
            await this.userService.updateStatus(uId, _userentity.UserStatus.ACTIVE, client.id);
            this.server.emit('user_status_change', {
                userId: uId,
                status: _userentity.UserStatus.ACTIVE
            });
            this.mqttService.broadcastUserStatus(uId, _userentity.UserStatus.ACTIVE);
        }
    }
    async handleDisconnect(client) {
        const userId = client.handshake.query.userId;
        if (userId) {
            const uId = +userId;
            // Remove connection
            const connections = this.userConnections.get(uId);
            if (connections) {
                connections.delete(client.id);
                // Only mark OFFLINE/AWAY if no more active connections
                if (connections.size === 0) {
                    this.userConnections.delete(uId);
                    // If the user has an active shift, treat disconnect as AWAY (Mobile backgrounding)
                    const hasShift = await this.userService.hasActiveShift(uId);
                    const status = hasShift ? _userentity.UserStatus.AWAY : _userentity.UserStatus.OFFLINE;
                    await this.userService.updateStatus(uId, status);
                    this.server.emit('user_status_change', {
                        userId: uId,
                        status
                    });
                    this.mqttService.broadcastUserStatus(uId, status);
                    if (hasShift) {
                        if (!this.idleTracking.has(uId)) {
                            this.idleTracking.set(uId, Date.now());
                        }
                    } else {
                        // If no shift, stop tracking idle
                        this.idleTracking.delete(uId);
                    }
                }
            } else {
                // Fallback for safety
                await this.userService.updateStatus(uId, _userentity.UserStatus.OFFLINE);
                this.server.emit('user_status_change', {
                    userId: uId,
                    status: _userentity.UserStatus.OFFLINE
                });
                this.idleTracking.delete(uId);
            }
        }
    }
    async processIdlePenalty(userId) {
        const idleStart = this.idleTracking.get(userId);
        if (!idleStart) return;
        const idleDurationMs = Date.now() - idleStart;
        const idleMinutes = Math.floor(idleDurationMs / 60000);
        const user = await this.userService.findById(userId);
        const threshold = user?.payrollConfig?.idleThreshold || 5;
        const penaltyBase = user?.payrollConfig?.penaltyIdle || 5000;
        // If more than threshold minutes idle, log a violation
        if (idleMinutes >= threshold) {
            await this.userService.logViolation(userId, _violationentity.ViolationType.IDLE_TIMEOUT, `Meninggalkan sistem selama ${idleMinutes} menit (termasuk waktu offline pada shift aktif).`, penaltyBase * Math.ceil(idleMinutes / threshold));
            // Broadcast that a violation has been logged so payroll can refresh real-time
            this.server.emit('violationUpdated', {
                userId
            });
            this.mqttService.publish(`billiard/user/${userId}/violation`, {
                userId
            });
        }
        this.idleTracking.delete(userId);
    }
    async handleStatusUpdate(client, data) {
        // Convert string status to Enum if possible
        const status = data.status === 'IDLE' ? _userentity.UserStatus.AWAY : data.status;
        // If user returns to ACTIVE, process accumulated idle time
        if (status === _userentity.UserStatus.ACTIVE) {
            await this.processIdlePenalty(data.userId);
        }
        await this.userService.updateStatus(data.userId, status, client.id);
        // If user goes to AWAY, start/continue tracking (if not already started)
        if (status === _userentity.UserStatus.AWAY) {
            if (!this.idleTracking.has(data.userId)) {
                this.idleTracking.set(data.userId, Date.now());
            }
        }
        this.server.emit('user_status_change', {
            userId: data.userId,
            status
        });
        this.mqttService.broadcastUserStatus(data.userId, status);
    }
    async handlePageChange(client, data) {
        const uId = +data.userId;
        if (!uId) return;
        // Force status to ACTIVE when they are navigating, and update page
        await this.userService.updateStatus(uId, _userentity.UserStatus.ACTIVE, client.id, data.page);
        // Notify others about the page change
        this.server.emit('user_page_change', {
            userId: uId,
            page: data.page
        });
        this.mqttService.publish(`billiard/user/${uId}/page`, {
            page: data.page
        });
    }
    handleJoinTerminalRoom(client, terminalId) {
        if (terminalId) {
            client.join(`terminal_${terminalId}`);
            this.logger.log(`Socket ${client.id} joined room terminal_${terminalId}`);
            // Send existing focus for this terminal if any
            const focus = this.terminalFocus.get(terminalId);
            if (focus) {
                client.emit('display_focus_change', focus);
            }
        }
    }
    handleBillingFocus(data) {
        if (data?.terminalId) {
            this.terminalFocus.set(data.terminalId, {
                tableId: data.tableId,
                type: data.type,
                transactionId: data.transactionId
            });
            this.server.to(`terminal_${data.terminalId}`).emit('display_focus_change', {
                tableId: data.tableId,
                type: data.type,
                transactionId: data.transactionId
            });
        } else {
            this.currentDisplayFocus = data;
            this.server.emit('display_focus_change', data);
        }
    }
    handleRequestFocus(client, data) {
        if (data?.terminalId) {
            const focus = this.terminalFocus.get(data.terminalId);
            if (focus) client.emit('display_focus_change', focus);
        } else if (this.currentDisplayFocus) {
            client.emit('display_focus_change', this.currentDisplayFocus);
        }
    }
    handlePaymentState(data) {
        // Broadcast the payment state to all connected displays or a specific terminal room
        if (data?.terminalId) {
            this.server.to(`terminal_${data.terminalId}`).emit('billing_payment_state', data);
        } else {
            this.server.emit('billing_payment_state', data);
        }
    }
    handleSplitState(data) {
        // Broadcast the split bill state to all connected displays or a specific terminal room
        if (data?.terminalId) {
            this.server.to(`terminal_${data.terminalId}`).emit('billing_split_state', data);
        } else {
            this.server.emit('billing_split_state', data);
        }
    }
    handleWaiterCall(data) {
        this.logger.log(`Waiter call from ${data.tableName} (ID: ${data.tableId})`);
        this.server.emit('waiter_call_received', data);
        this.mqttService.publish('billiard/waiter/call', data);
    }
    handleRequestDisplayScan(data) {
        if (data?.terminalId) {
            this.server.to(`terminal_${data.terminalId}`).emit('request_display_scan', data);
        } else {
            this.server.emit('request_display_scan', data);
        }
    }
    handleDisplayScanResult(data) {
        // Broadcast to everyone so Admin (Cashier) can receive it regardless of room
        this.server.emit('display_scan_result', data);
    }
    handleCancelDisplayScan(data) {
        this.server.emit('cancel_display_scan', data);
    }
    handleDisplayTopupSuccess(data) {
        this.server.emit('display_topup_success', data);
    }
    handleRedeemRequest(data) {
        if (data.terminalId) {
            this.server.to(`terminal_${data.terminalId}`).emit('redeem_request', data);
        } else {
            this.server.emit('redeem_request', data);
        }
    }
    handleRedeemReset(data) {
        // Notify display/terminal to reset its state
        this.server.emit('redeem_reset', data);
    }
    forceLogout(userId, message) {
        this.server.emit('force_logout', {
            userId,
            message
        });
        this.mqttService.publish(`billiard/user/${userId}/force_logout`, {
            userId,
            message
        });
    }
    assignmentsUpdated(userId, assignedTableIds) {
        this.server.emit('assignments_updated', {
            userId,
            assignedTableIds
        });
        this.mqttService.broadcastAssignmentsUpdated({
            userId,
            assignedTableIds
        });
    }
    shiftStarted(shift) {
        this.server.emit('shift_started', shift);
        this.mqttService.broadcastShiftStarted(shift);
    }
    async shiftEnded(userId) {
        // Before ending shift, process any last idle penalty and clear tracking
        await this.processIdlePenalty(userId);
        this.idleTracking.delete(userId);
        this.server.emit('shift_ended', {
            userId
        });
        this.mqttService.broadcastShiftEnded({
            userId
        });
    }
    employeeUpdated(data) {
        this.server.emit('employee_updated', data);
        this.mqttService.publish('billiard/employee/update', data);
    }
    roleUpdated(data) {
        this.server.emit('role_updated', data);
        this.mqttService.publish('billiard/role/update', data);
    }
    commissionUpdated(userId) {
        this.server.emit('commission_updated', {
            userId
        });
        this.mqttService.publish(`billiard/user/${userId}/commission`, {
            userId
        });
    }
    loyaltyUpdated(data) {
        if (data && data.type === 'SETTINGS_UPDATE') {
            this.settingsUpdateSubject.next(data);
        } else {
            this.server.emit('loyalty_updated', data);
        }
    }
    constructor(userService, mqttService){
        this.userService = userService;
        this.mqttService = mqttService;
        this.logger = new _common.Logger('EventsGateway');
        this.idleTracking = new Map(); // userId -> startTime (ms)
        this.userConnections = new Map(); // userId -> Set of socketIds
        this.settingsUpdateSubject = new _rxjs.Subject();
        this.currentDisplayFocus = null;
        this.terminalFocus = new Map();
    }
};
_ts_decorate([
    (0, _websockets.WebSocketServer)(),
    _ts_metadata("design:type", typeof _socketio.Server === "undefined" ? Object : _socketio.Server)
], EventsGateway.prototype, "server", void 0);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('update_status'),
    _ts_param(0, (0, _websockets.ConnectedSocket)()),
    _ts_param(1, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], EventsGateway.prototype, "handleStatusUpdate", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('page_change'),
    _ts_param(0, (0, _websockets.ConnectedSocket)()),
    _ts_param(1, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], EventsGateway.prototype, "handlePageChange", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('join_terminal_room'),
    _ts_param(0, (0, _websockets.ConnectedSocket)()),
    _ts_param(1, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleJoinTerminalRoom", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('billing_view_focus'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleBillingFocus", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('request_display_focus'),
    _ts_param(0, (0, _websockets.ConnectedSocket)()),
    _ts_param(1, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleRequestFocus", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('billing_payment_state'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], EventsGateway.prototype, "handlePaymentState", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('billing_split_state'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleSplitState", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('waiter_call'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleWaiterCall", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('request_display_scan'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleRequestDisplayScan", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('display_scan_result'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleDisplayScanResult", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('cancel_display_scan'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleCancelDisplayScan", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('display_topup_success'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleDisplayTopupSuccess", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('redeem_request'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleRedeemRequest", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('redeem_reset'),
    _ts_param(0, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleRedeemReset", null);
EventsGateway = _ts_decorate([
    (0, _websockets.WebSocketGateway)({
        cors: {
            origin: '*'
        }
    }),
    _ts_param(0, (0, _common.Inject)((0, _common.forwardRef)(()=>_userservice.UserService))),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _userservice.UserService === "undefined" ? Object : _userservice.UserService,
        typeof _mqttservice.MqttService === "undefined" ? Object : _mqttservice.MqttService
    ])
], EventsGateway);

//# sourceMappingURL=events.gateway.js.map