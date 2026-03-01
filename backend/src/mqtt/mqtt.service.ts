import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class MqttService {
    private readonly logger = new Logger(MqttService.name);

    constructor(@Inject('MQTT_CLIENT') private client: ClientProxy) { }

    publish(topic: string, data: any) {
        try {
            this.client.emit(topic, data);
            this.logger.log(`Published to ${topic}`);
        } catch (error) {
            this.logger.error(`Failed to publish to ${topic}: ${error.message}`);
        }
    }

    // Helper methods for common topics
    broadcastTableUpdate(data: any) {
        this.publish('billiard/tables/update', data);
    }

    broadcastMemberBalance(memberId: number, balance: number) {
        this.publish(`billiard/member/${memberId}/balance`, { memberId, balance });
    }

    broadcastUserStatus(userId: number, status: string) {
        this.publish(`billiard/user/${userId}/status`, { userId, status });
    }

    broadcastTransactionUpdate(data: any) {
        this.publish('billiard/finance/transaction', data);
    }

    broadcastWarning(data: any) {
        this.publish('billiard/notifications/warning', data);
    }

    broadcastOrderUpdate(data: any) {
        this.publish('billiard/order/update', data);
    }

    broadcastWaitingListUpdate(data: any) {
        this.publish('billiard/waiting-list/update', data);
    }

    broadcastShiftStarted(data: any) {
        this.publish('billiard/shift/started', data);
    }

    broadcastShiftEnded(data: any) {
        this.publish('billiard/shift/ended', data);
    }

    broadcastAssignmentsUpdated(data: any) {
        this.publish('billiard/assignments/updated', data);
    }

    broadcastInventoryUpdate(data: any) {
        this.publish('billiard/inventory/update', data);
    }

    broadcastMenuAvailability(data: any) {
        this.publish('billiard/menu/availability', data);
    }

    broadcastFinanceUpdate(data: any) {
        this.publish('billiard/finance/update', data);
    }

    broadcastMemberUpdate(data: any) {
        this.publish('billiard/member/update', data);
    }

    broadcastUserViolation(userId: number, data: any) {
        this.publish(`billiard/user/${userId}/violation`, data);
    }

    broadcastForceLogout(userId: number) {
        this.publish(`billiard/user/${userId}/force_logout`, { userId });
    }

    broadcastAuditUpdate(data: any) {
        this.publish('billiard/audit/update', data);
    }
}
