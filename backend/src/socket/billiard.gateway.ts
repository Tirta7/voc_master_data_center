import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MqttService } from '../mqtt/mqtt.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class BilliardGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('BilliardGateway');
  public lastSeen: Map<number, number> = new Map();
  public tableIdentities: Map<number, string> = new Map();
  public liveTelemetry: Map<number, any> = new Map(); // Store latest telemetry for hydration

  constructor(
    private mqttService: MqttService,
    private eventEmitter: EventEmitter2,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Gateway Initialized');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Received heartbeat from ESP32 via MQTT (bridged by service)
   */
  handleHeartbeat(tableId: number, telemetry?: any) {
    if (telemetry?.tableIdentity) {
      this.tableIdentities.set(tableId, telemetry.tableIdentity);
    }

    // Capture explicit offline status (e.g. from MQTT LWT or Gateway)
    const isOnline = telemetry?.online !== false && telemetry?.status !== 'offline';

    if (!isOnline) {
      // Explicitly marked offline (LWT) - clear timer and report immediately
      this.lastSeen.delete(tableId);
      this.liveTelemetry.delete(tableId); // Clear telemetry cache on disconnect (v17.4)
      
      const identity = this.tableIdentities.get(tableId) || `Table ${tableId}`;
      this.logger.warn(`ESP32 for ${identity} reported OFFLINE from Gateway (LWT)!`);
      
      this.server.emit('heartbeat', { tableId, status: 'OFFLINE' });
      this.mqttService.publish(`billiard/heartbeat/${tableId}`, {
        tableId,
        status: 'OFFLINE',
      });

      // 🛡️ TRIGGER REFRESH (v17.4)
      this.eventEmitter.emit('table.offline', tableId);
      return;
    }

    const isRetained = telemetry?.isRetained === true;
    const isAlreadyKnown = this.lastSeen.has(tableId);

    // 🛡️ LENIENT STARTUP (v18.7): 
    // If the table is currently 'Unknown' (e.g. after server restart),
    // we accept a retained heartbeat as a temporary 'Online' status.
    if (!isRetained || !isAlreadyKnown) {
      this.lastSeen.set(tableId, Date.now());
    } else {
      this.logger.debug(`[GHOST-BLOCK] 🛡️ Ignored retained heartbeat for ${tableId} (Keeping current timer)`);
    }

    this.liveTelemetry.set(tableId, telemetry); // Cache for hydration (v13)

    const payload = {
      ...telemetry,
      tableId, 
      connectivity: 'ONLINE',
      timestamp: new Date().toISOString(),
    };
    this.server.emit('heartbeat', payload);
    this.mqttService.publish(`billiard/heartbeat/${tableId}`, payload);
  }

  isTableOnline(tableId: number): boolean {
    const lastSeen = this.lastSeen.get(tableId);
    if (!lastSeen) return false;
    // 🛡️ Safe threshold (60s) to accommodate 30s hardware heartbeat (v18)
    return Date.now() - lastSeen < 60000;
  }

  /**
   * 🛡️ INSTANT EVICTION (v17.5)
   * Forcefully marks a table as offline in memory.
   */
  forceOffline(tableId: number) {
    this.lastSeen.delete(tableId);
    this.liveTelemetry.delete(tableId);
    
    // 🛡️ INSTANT UI EVICTION (v17.5)
    // Emit heartbeat-OFFLINE so the frontend updates immediately
    this.server.emit('heartbeat', { tableId, connectivity: 'OFFLINE' });
    this.eventEmitter.emit('table.offline', tableId);
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  checkHeartbeats() {
    const now = Date.now();
    this.lastSeen.forEach((time, tableId) => {
      // 60s timeout
      if (now - time > 60000) {
        this.logger.warn(`ESP32 for table ${tableId} is OFFLINE! (Inactivity Timeout)`);
        this.forceOffline(tableId);
        this.mqttService.publish(`billiard/heartbeat/${tableId}`, {
          tableId,
          status: 'OFFLINE',
        });

        // 🛡️ TRIGGER REFRESH (v17.4)
        this.eventEmitter.emit('table.offline', tableId);
      }
    });
  }

  // Method to broadcast table status changes
  broadcastTableUpdate(tableData: any) {
    this.server.emit('tableUpdate', tableData);
    this.mqttService.broadcastTableUpdate(tableData);
    this.eventEmitter.emit('table.update', tableData);
  }

  // Method to broadcast all table statuses at once (Global Sync v12)
  broadcastAllTables(tables: any[]) {
    this.server.emit('full_sync', tables);
  }

  // Method to broadcast F&B item status changes
  broadcastOrderItemUpdate(data: any) {
    this.server.emit('orderItemUpdated', data);
    this.mqttService.publish('billiard/order/update', data);
    this.eventEmitter.emit('order.updated', data);
  }

  // Method to broadcast financial/transaction changes
  broadcastTransactionUpdate(data: any) {
    this.server.emit('transactionUpdated', data);
    // Removed redundant MQTT broadcast to prevent double console logs in UI
    // this.mqttService.broadcastTransactionUpdate(data);
    this.eventEmitter.emit('table.update', data);
  }

  broadcastMemberBalance(memberId: number, balance: number) {
    this.server.emit('memberBalanceUpdated', { memberId, balance });
    // this.mqttService.broadcastMemberBalance(memberId, balance);
  }

  broadcastMemberUpdate(member: any) {
    this.server.emit('member_update', member);
    // this.mqttService.broadcastMemberUpdate(member);
  }

  broadcastFinanceUpdate(data: any) {
    this.server.emit('financeUpdate', data);
    // this.mqttService.broadcastFinanceUpdate(data);
  }

  broadcastAuditUpdate(data: any) {
    this.server.emit('auditUpdate', data);
    // this.mqttService.broadcastAuditUpdate(data);
  }

  broadcastWarning(title: string, message: string, tableId?: number) {
    this.server.emit('warningNotification', { title, message, tableId });
    this.mqttService.broadcastWarning({ title, message, tableId });
  }

  broadcastWaitingListUpdate(data: any) {
    this.server.emit('waitingListUpdate', data);
    // this.mqttService.publish('billiard/waiting-list/update', data);
  }

  broadcastDebtUpdate() {
    this.server.emit('debt_updated');
  }

  @SubscribeMessage('requestAllTables')
  handleRequestAllTables(client: Socket, payload: any): void {
    // This will be handled by the service and returned via this gateway if needed
  }
}
