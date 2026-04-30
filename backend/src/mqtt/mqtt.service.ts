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

  constructor(private configService: ConfigService) { }

  private normalizeMac(mac: string | null | undefined): string {
    if (!mac) return '';
    return mac.replace(/[:\-]/g, '').toUpperCase();
  }

  onModuleInit() {
    const url =
      this.configService.get<string>('MQTT_URL') || 'mqtt://localhost:1883';
    this.logger.log(`Connecting to MQTT Broker at ${url}...`);
    this.client = mqtt.connect(url, {
      clientId: `nestjs_server_${Math.random().toString(36).substr(2, 9)}`,
      clean: true,
      reconnectPeriod: 3000,
      connectTimeout: 10000,
    });
    this.client.on('connect', () => {
      this.logger.log('SUCCESS: MqttService connected to broker');
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

      // Subscribe to all gateway status & heartbeat topics (Optimized v10)
      this.client.subscribe('billiard/gateway/+/status', (err) => {
        if (err) this.logger.error('Failed to subscribe to gateway status topic');
        else this.logger.log('Subscribed to billiard/gateway/+/status');
      });

      // Subscribe to legacy status topics (v18.2)
      this.client.subscribe('billiard/status/#', (err) => {
        if (err) this.logger.error('Failed to subscribe to legacy status');
        else this.logger.log('Subscribed to billiard/status/#');
      });

      this.client.subscribe('billiard/gateway/+/heartbeat', (err) => {
        if (err) this.logger.error('Failed to subscribe to gateway heartbeat topic');
        else this.logger.log('Subscribed to billiard/gateway/+/heartbeat');
      });

      // ✅ NEW v7.0: Subscribe ke status gateway per lantai (Prajurit Registry)
      this.client.subscribe('billiard/floor/+/gateway/+/status', (err) => {
        if (err) this.logger.error('Failed to subscribe to floor gateway status');
        else this.logger.log('Subscribed to billiard/floor/+/gateway/+/status');
      });

      // ✅ NEW v7.1: Subscribe ke heartbeat individu dari Komandan
      this.client.subscribe('billiard/heartbeat/#', (err) => {
        if (err) this.logger.error('Failed to subscribe to heartbeat topic');
        else this.logger.log('Subscribed to billiard/heartbeat/#');
      });
    });

    this.client.on('message', (topic, payload, packet) => {
      this.logger.log(`[MQTT-RAW-IN] Topic: ${topic} | Handlers: ${this.messageHandlers.length}`);
      this.messageHandlers.forEach((handler, index) => {
        try {
          (handler as any)(topic, payload, packet);
        } catch (e) {
          this.logger.error(`Error in MQTT handler #${index}: ${e.message}`);
        }
      });
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

  onMessage(handler: (topic: string, payload: Buffer, packet?: any) => void) {
    this.messageHandlers.push(handler);
    this.logger.log(`[MQTT-HANDLER] New handler registered. Total: ${this.messageHandlers.length}`);
  }

  /**
   * Subscribe to a topic and register a specific callback for it.
   * Essential for hardware integrations like RFID scanners.
   */
  subscribe(topic: string, callback: (topic: string, payload: Buffer) => void) {
    if (this.client) {
      this.client.subscribe(topic, (err) => {
        if (err) this.logger.error(`Failed to subscribe to ${topic}: ${err.message}`);
        else this.logger.log(`Subscribed to ${topic}`);
      });
    }

    this.onMessage((t, p) => {
      if (t === topic) callback(t, p);
    });
  }

  publish(topic: string, data: any, retain = false) {
    try {
      const payload = JSON.stringify(data);
      this.logger.debug(`>>> MQTT SEND -> [${topic}]: ${payload}${retain ? ' (RETAIN)' : ''}`);
      this.client.publish(topic, payload, { qos: 1, retain }, (err) => {
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

  broadcastDisplaySync(url: string) {
    this.publish('billiard/attendance/feedback', {
      type: 'SYNC_DISPLAY',
      url,
      timestamp: new Date().toISOString()
    });
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
    duration = 0,
    extend = false,
    force = false,
    additionalData: any = {},
    hardwareType?: string,
    caller = 'UNKNOWN',
  ) {
    const macAddress = this.normalizeMac(mac);
    const token = additionalData.token || (Date.now() % 4294967295);

    this.logger.log(
      `[MQTT-JSON] [Caller: ${caller}] Sending command to table ${tableId}: ${isOn ? 'ON' : 'OFF'} (Token: ${token})`,
    );

    const topic = `billiard/table/${macAddress}/light/set`;

    this.publish(
      topic,
      {
        status: isOn ? 'ON' : 'OFF',
        relayPin,
        tableId,
        mac: additionalData.targetMac || macAddress,
        duration,
        extend,
        force,
        token,
        timestamp: new Date().toISOString(),
        ...additionalData,
      },
      false, // ✅ FIX v7.0: JANGAN RETAIN perintah ON/OFF!
      // Retain=true menyebabkan ghost command: saat Komandan restart,
      // perintah lama tersimpan di broker langsung dieksekusi lagi.
    );
    return { topic, token, sentAt: new Date().toISOString() };
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
    this.publish(
      topic,
      {
        mocPin,
        timestamp: new Date().toISOString(),
      },
      true, // Retain config so device gets it immediately on boot
    );
    this.logger.log(`[PIN CONFIG] Sent mocPin=${mocPin} to ${macAddress}`);
    return { topic, sentAt: new Date().toISOString() };
  }
}
