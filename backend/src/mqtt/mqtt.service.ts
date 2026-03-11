import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import * as mqtt from 'mqtt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const url =
      this.configService.get<string>('MQTT_URL') || 'mqtt://localhost:1883';
    this.client = mqtt.connect(url, {
      clientId: `nestjs_server_${Math.random().toString(36).substr(2, 9)}`,
      clean: true,
      reconnectPeriod: 3000,
      connectTimeout: 10000,
    });
    this.client.on('connect', () =>
      this.logger.log('MqttService connected to broker'),
    );
    this.client.on('error', (err) =>
      this.logger.error('MqttService error: ' + err.message),
    );
  }

  onModuleDestroy() {
    this.client?.end(true);
  }

  publish(topic: string, data: any) {
    try {
      // Publish as raw JSON — NO NestJS ClientProxy wrapping
      const payload = JSON.stringify(data);
      this.client.publish(topic, payload, { qos: 1, retain: false }, (err) => {
        if (err)
          this.logger.error(`Failed to publish to ${topic}: ${err.message}`);
        else this.logger.log(`Published to ${topic}`);
      });
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

  // Send a ping to a specific table's ESP32 device to check connectivity
  pingTable(macAddress: string, tableId: number) {
    const topic = `billiard/table/${macAddress}/ping`;
    this.publish(topic, {
      tableId,
      command: 'PING',
      timestamp: new Date().toISOString(),
    });
    return { topic, sentAt: new Date().toISOString() };
  }

  // Manual light override — sends ON/OFF with force:true so ESP32 bypasses race condition protection
  publishLightCommand(
    macAddress: string,
    tableId: number,
    isOn: boolean,
    relayPin: number | null,
  ) {
    const topic = `billiard/table/${macAddress}/light/set`;
    this.publish(topic, {
      status: isOn ? 'ON' : 'OFF',
      relayPin,
      tableId,
      manual: true,
      force: true, // ← Bypass ESP32 race condition protection (30s window after ON)
      timestamp: new Date().toISOString(),
    });
    return { topic, sentAt: new Date().toISOString() };
  }
}
