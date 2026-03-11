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
import { MqttService } from '../../mqtt/mqtt.service';

@WebSocketGateway({
  namespace: 'kds',
  cors: { origin: '*' },
})
export class KdsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('KdsGateway');

  constructor(private readonly mqttService: MqttService) {}

  afterInit(server: Server) {
    this.logger.log('KDS Gateway Initialized');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`KDS Client disconnected: ${client.id}`);
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`KDS Client connected: ${client.id}`);
  }

  /**
   * Publish event both via Socket.IO (legacy) and MQTT WebSocket (new)
   */
  private broadcast(event: string, data: any) {
    // Socket.IO fallback (for any remaining socket.io clients)
    this.server.emit(event, data);
    // MQTT publish – frontend subscribes via ws://host:8083
    this.mqttService.publish(`kds/events/${event}`, data);
  }

  /**
   * Send new order to KDS/BDS clients
   */
  sendNewOrder(orderData: any) {
    const payload = {
      ...orderData,
      station: orderData.station || 'KDS',
      timestamp: new Date(),
      status: 'PENDING',
    };
    this.broadcast('newOrder', payload);
  }

  @SubscribeMessage('updateOrderStatus')
  handleUpdateStatus(
    client: Socket,
    payload: { orderId: string; status: string; station?: string },
  ) {
    this.logger.log(
      `Order ${payload.orderId} updated to ${payload.status} (Station: ${payload.station || 'Unknown'})`,
    );
    this.broadcast('statusUpdated', payload);
  }

  /**
   * Broadcast from within the service (no Socket client involved)
   */
  broadcastStatusUpdated(payload: {
    orderId: string;
    status: string;
    station?: string;
  }) {
    this.broadcast('statusUpdated', payload);
  }

  /**
   * Broadcast that an item has been cancelled (and should be removed)
   */
  sendItemCancelled(data: {
    id: number;
    orderId: string;
    station: string;
    itemName?: string;
    tableName?: string;
  }) {
    this.broadcast('itemCancelled', data);
  }

  /**
   * Broadcast that a cancellation has been requested for a processing item
   */
  sendCancellationRequest(data: {
    id: number;
    orderId: string;
    station: string;
    itemName: string;
    tableName?: string;
    reason?: string;
    user?: string;
  }) {
    this.broadcast('cancellationRequested', data);
  }

  /**
   * Broadcast that a cancellation request has been rejected
   */
  sendCancellationRejected(data: {
    id: number;
    message: string;
    transactionId: number;
  }) {
    this.broadcast('cancellationRejected', data);
  }

  /**
   * Broadcast order item status update
   */
  broadcastOrderItemUpdated(data: {
    id: number;
    status: string;
    transactionId: number;
    station: string;
  }) {
    this.broadcast('orderItemUpdated', data);
  }
}
