import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserService } from '../user/user.service';
import { UserStatus } from '../user/entities/user.entity';
import { ViolationType } from '../user/entities/violation.entity';
import { MqttService } from '../mqtt/mqtt.service';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { auditTime } from 'rxjs/operators';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private logger: Logger = new Logger('EventsGateway');
    private idleTracking = new Map<number, number>(); // userId -> startTime (ms)
    private userConnections = new Map<number, Set<string>>(); // userId -> Set of socketIds
    private settingsUpdateSubject = new Subject<any>();

    constructor(
        @Inject(forwardRef(() => UserService))
        private userService: UserService,
        private mqttService: MqttService,
    ) { }

    afterInit(server: Server) {
        this.logger.log('EventsGateway initialized');
        // Throttle SETTINGS_UPDATE broadcasts to avoid spamming clients during high load
        this.settingsUpdateSubject.pipe(
            auditTime(1000) // Max 1 broadcast per second
        ).subscribe(data => {
            this.server.emit('loyalty_updated', data);
        });
    }

    async handleConnection(client: Socket) {
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

            await this.userService.updateStatus(uId, UserStatus.ACTIVE, client.id);
            this.server.emit('user_status_change', { userId: uId, status: UserStatus.ACTIVE });
            this.mqttService.broadcastUserStatus(uId, UserStatus.ACTIVE);
        }
    }

    async handleDisconnect(client: Socket) {
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
                    const status = hasShift ? UserStatus.AWAY : UserStatus.OFFLINE;

                    await this.userService.updateStatus(uId, status);
                    this.server.emit('user_status_change', { userId: uId, status });
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
                await this.userService.updateStatus(uId, UserStatus.OFFLINE);
                this.server.emit('user_status_change', { userId: uId, status: UserStatus.OFFLINE });
                this.idleTracking.delete(uId);
            }
        }
    }

    private async processIdlePenalty(userId: number) {
        const idleStart = this.idleTracking.get(userId);
        if (!idleStart) return;

        const idleDurationMs = Date.now() - idleStart;
        const idleMinutes = Math.floor(idleDurationMs / 60000);

        const user = await this.userService.findById(userId);
        const threshold = user?.payrollConfig?.idleThreshold || 5;
        const penaltyBase = user?.payrollConfig?.penaltyIdle || 5000;

        // If more than threshold minutes idle, log a violation
        if (idleMinutes >= threshold) {
            await this.userService.logViolation(
                userId,
                ViolationType.IDLE_TIMEOUT,
                `Meninggalkan sistem selama ${idleMinutes} menit (termasuk waktu offline pada shift aktif).`,
                penaltyBase * Math.ceil(idleMinutes / threshold)
            );
            // Broadcast that a violation has been logged so payroll can refresh real-time
            this.server.emit('violationUpdated', { userId });
            this.mqttService.publish(`billiard/user/${userId}/violation`, { userId });
        }
        this.idleTracking.delete(userId);
    }

    @SubscribeMessage('update_status')
    async handleStatusUpdate(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: number, status: string }) {
        // Convert string status to Enum if possible
        const status = data.status === 'IDLE' ? UserStatus.AWAY : data.status as UserStatus;

        // If user returns to ACTIVE, process accumulated idle time
        if (status === UserStatus.ACTIVE) {
            await this.processIdlePenalty(data.userId);
        }

        await this.userService.updateStatus(data.userId, status, client.id);

        // If user goes to AWAY, start/continue tracking (if not already started)
        if (status === UserStatus.AWAY) {
            if (!this.idleTracking.has(data.userId)) {
                this.idleTracking.set(data.userId, Date.now());
            }
        }

        this.server.emit('user_status_change', { userId: data.userId, status });
        this.mqttService.broadcastUserStatus(data.userId, status);
    }

    @SubscribeMessage('page_change')
    async handlePageChange(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: number, page: string }) {
        const uId = +data.userId;
        if (!uId) return;

        // Force status to ACTIVE when they are navigating, and update page
        await this.userService.updateStatus(uId, UserStatus.ACTIVE, client.id, data.page);

        // Notify others about the page change
        this.server.emit('user_page_change', { userId: uId, page: data.page });
        this.mqttService.publish(`billiard/user/${uId}/page`, { page: data.page });
    }

    forceLogout(userId: number, message?: string) {
        this.server.emit('force_logout', { userId, message });
        this.mqttService.publish(`billiard/user/${userId}/force_logout`, { userId, message });
    }

    assignmentsUpdated(userId: number, assignedTableIds: any[]) {
        this.server.emit('assignments_updated', { userId, assignedTableIds });
        this.mqttService.broadcastAssignmentsUpdated({ userId, assignedTableIds });
    }

    shiftStarted(shift: any) {
        this.server.emit('shift_started', shift);
        this.mqttService.broadcastShiftStarted(shift);
    }

    async shiftEnded(userId: number) {
        // Before ending shift, process any last idle penalty and clear tracking
        await this.processIdlePenalty(userId);
        this.idleTracking.delete(userId);
        this.server.emit('shift_ended', { userId });
        this.mqttService.broadcastShiftEnded({ userId });
    }

    employeeUpdated(data: any) {
        this.server.emit('employee_updated', data);
        this.mqttService.publish('billiard/employee/update', data);
    }

    roleUpdated(data: any) {
        this.server.emit('role_updated', data);
        this.mqttService.publish('billiard/role/update', data);
    }

    commissionUpdated(userId: number) {
        this.server.emit('commission_updated', { userId });
        this.mqttService.publish(`billiard/user/${userId}/commission`, { userId });
    }

    loyaltyUpdated(data: any) {
        if (data && data.type === 'SETTINGS_UPDATE') {
            this.settingsUpdateSubject.next(data);
        } else {
            this.server.emit('loyalty_updated', data);
        }
    }
}
