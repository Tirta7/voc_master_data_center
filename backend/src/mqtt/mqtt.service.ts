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
  private messageHandlers: ((topic: string, payload: Buffer) => void)[] = [];

  constructor(private configService: ConfigService) {}

  private normalizeMac(mac: string | null | undefined): string {
    if (!mac) return '';
    return mac.replace(/[:\-]/g, '').toUpperCase();
  }

  onModuleInit() {
    const url =
      this.configService.get<string>('MQTT_URL') || 'mqtt://localhost:1883';
    this.client = mqtt.connect(url, {
      clientId: `nestjs_server_${Math.random().toString(36).substr(2, 9)}`,
      clean: true,
      reconnectPeriod: 3000,
      connectTimeout: 10000,
    });
    this.client.on('connect', () => {
      this.logger.log('MqttService connected to broker');
      // Subscribe to sync requests from hardware
      this.client.subscribe('billiard/table/sync', (err) => {
        if (err) this.logger.error('Failed to subscribe to sync topic');
        else this.logger.log('Subscribed to billiard/table/sync');
      });

      // Subscribe to all table status/telemetry topics
      this.client.subscribe('billiard/table/+/status', (err) => {
        if (err) this.logger.error('Failed to subscribe to status topic');
        else this.logger.log('Subscribed to billiard/table/+/status');
      });
    });

    this.client.on('message', (topic, payload) => {
      this.logger.debug(`<<< MQTT RECEIVED [${topic}]: ${payload.toString()}`);
      this.messageHandlers.forEach((handler) => handler(topic, payload));
    });

    this.client.on('error', (err) =>
      this.logger.log(
        'MqttService error (Broker may be offline): ' + err.message,
      ),
    );
  }

  onModuleDestroy() {
    this.client?.end(true);
  }

  onMessage(handler: (topic: string, payload: Buffer) => void) {
    this.messageHandlers.push(handler);
  }

  publish(topic: string, data: any) {
    try {
      const payload = JSON.stringify(data);
      this.logger.debug(`>>> MQTT SEND -> [${topic}]: ${payload}`);
      this.client.publish(topic, payload, { qos: 1, retain: false }, (err) => {
        if (err) this.logger.error(`!!! MQTT FAIL to ${topic}: ${err.message}`);
        else this.logger.debug(`<<< MQTT SENT to ${topic}`);
      });
    } catch (error) {
      this.logger.error(`Failed to publish to ${topic}: ${error.message}`);
    }
  }

  // Helper methods for common topics
  broadcastTableUpdate(data: any) {
    this.publish('billiard/tables/update', data);
  }

  broadcastLockerUpdate(data: any) {
    this.publish('billiard/lockers/update', data);
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

  broadcastBattlePlanUpdate(data: any) {
    this.publish('billiard/ai/battle-plan/update', data);
  }

  // Send a ping to a specific table's ESP32 device to check connectivity
  pingTable(mac: string, tableId: number) {
    const macAddress = this.normalizeMac(mac);
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
    mac: string,
    tableId: number,
    isOn: boolean,
    relayPin: number | null,
    extend = false,
    force = false,
    additionalData: any = {},
  ) {
    const macAddress = this.normalizeMac(mac);
    const topic = `billiard/table/${macAddress}/light/set`;
    this.publish(topic, {
      status: isOn ? 'ON' : 'OFF',
      relayPin,
      tableId,
      extend,
      force,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });
    return { topic, sentAt: new Date().toISOString() };
  }

  // Raw GPIO pin control for diagnostics
  publishGpioCommand(mac: string, pin: number, isOn: boolean) {
    const macAddress = this.normalizeMac(mac);
    const topic = `billiard/table/${macAddress}/gpio/set`;
    this.publish(topic, {
      pin,
      status: isOn ? 'ON' : 'OFF',
      timestamp: new Date().toISOString(),
    });
    return { topic, sentAt: new Date().toISOString() };
  }

  publishLockerCommand(
    mac: string,
    lockerId: number,
    isOpen: boolean,
    relayPin: number | null,
  ) {
    const macAddress = this.normalizeMac(mac);
    const topic = `billiard/locker/${macAddress}/lock/set`;
    this.publish(topic, {
      status: isOpen ? 'OPEN' : 'CLOSE',
      relayPin,
      lockerId,
      timestamp: new Date().toISOString(),
    });
    return { topic, sentAt: new Date().toISOString() };
  }

  // System management commands (e.g. Reboot, OTA, Configuration)
  publishSystemCommand(mac: string, command: string) {
    const macAddress = this.normalizeMac(mac);
    const topic = `billiard/table/${macAddress}/system/set`;
    this.publish(topic, {
      command,
      timestamp: new Date().toISOString(),
    });
    return { topic, sentAt: new Date().toISOString() };
  }

  // Kirim konfigurasi pin baru ke ESP32 saat relayPin berubah di Admin
  // ESP32 akan update SPIFFS-nya via /config/set handler
  publishPinConfig(mac: string, mocPin: number) {
    const macAddress = this.normalizeMac(mac);
    if (!macAddress) return;
    const topic = `billiard/table/${macAddress}/config/set`;
    this.publish(topic, {
      mocPin,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`[PIN CONFIG] Sent mocPin=${mocPin} to ${macAddress}`);
    return { topic, sentAt: new Date().toISOString() };
  }
}
