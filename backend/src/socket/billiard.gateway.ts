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
import { MqttService } from '../mqtt/mqtt.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class BilliardGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('BilliardGateway');
  private lastSeen: Map<number, number> = new Map();

  constructor(private mqttService: MqttService) {}

  afterInit(server: Server) {
    this.logger.log('Gateway Initialized');
    // Periodically check for offline devices
    setInterval(() => this.checkHeartbeats(), 10000); // Every 10s
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
    this.lastSeen.set(tableId, Date.now());
    const payload = {
      tableId,
      status: 'ONLINE',
      ...telemetry,
      timestamp: new Date().toISOString(),
    };
    this.server.emit('heartbeat', payload);
    this.mqttService.publish(`billiard/heartbeat/${tableId}`, payload);
  }

  private checkHeartbeats() {
    const now = Date.now();
    this.lastSeen.forEach((timestamp, tableId) => {
      if (now - timestamp > 60000) {
        // 60 seconds timeout
        this.logger.warn(`ESP32 for table ${tableId} is OFFLINE!`);
        this.server.emit('heartbeat', { tableId, status: 'OFFLINE' });
        this.mqttService.publish(`billiard/heartbeat/${tableId}`, {
          tableId,
          status: 'OFFLINE',
        });
      }
    });
  }

  // Method to broadcast table status changes
  broadcastTableUpdate(tableData: any) {
    this.server.emit('tableUpdate', tableData);
    this.mqttService.broadcastTableUpdate(tableData);
  }

  // Method to broadcast F&B item status changes
  broadcastOrderItemUpdate(data: any) {
    this.server.emit('orderItemUpdated', data);
    this.mqttService.publish('billiard/order/update', data);
  }

  // Method to broadcast financial/transaction changes
  broadcastTransactionUpdate(data: any) {
    this.server.emit('transactionUpdated', data);
    // Removed redundant MQTT broadcast to prevent double console logs in UI
    // this.mqttService.broadcastTransactionUpdate(data);
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

  @SubscribeMessage('requestAllTables')
  handleRequestAllTables(client: Socket, payload: any): void {
    // This will be handled by the service and returned via this gateway if needed
  }
}
