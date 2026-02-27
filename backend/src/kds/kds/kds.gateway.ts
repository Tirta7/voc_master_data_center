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

@WebSocketGateway({
  namespace: 'kds',
  cors: { origin: '*' },
})
export class KdsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('KdsGateway');

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
   * Send new order to KDS clients
   */
  sendNewOrder(orderData: any) {
    this.server.emit('newOrder', {
      ...orderData,
      station: orderData.station || 'KDS',
      timestamp: new Date(),
      status: 'PENDING',
    });
  }

  @SubscribeMessage('updateOrderStatus')
  handleUpdateStatus(client: Socket, payload: { orderId: string; status: string; station?: string }) {
    this.logger.log(`Order ${payload.orderId} updated to ${payload.status} (Station: ${payload.station || 'Unknown'})`);
    this.server.emit('statusUpdated', payload);
  }

  /**
   * Broadcast that an item has been cancelled (and should be removed)
   */
  sendItemCancelled(data: { id: number; orderId: string; station: string; itemName?: string; tableName?: string }) {
    this.server.emit('itemCancelled', data);
  }

  /**
   * Broadcast that a cancellation has been requested for a processing item
   */
  sendCancellationRequest(data: { id: number; orderId: string; station: string; itemName: string; tableName?: string; reason?: string; user?: string }) {
    this.server.emit('cancellationRequested', data);
  }

  /**
   * Broadcast that a cancellation request has been rejected
   */
  sendCancellationRejected(data: { id: number; message: string; transactionId: number }) {
    this.server.emit('cancellationRejected', data);
  }
}
