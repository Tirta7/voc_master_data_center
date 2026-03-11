import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'inventory',
})
export class InventoryGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('InventoryGateway');

  afterInit(server: Server) {
    this.logger.log('Inventory Gateway Initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to inventory: ${client.id}`);
    // Send a welcome event to verify connectivity
    client.emit('connectionConfirmed', { status: 'ok', timestamp: new Date() });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from inventory: ${client.id}`);
  }

  broadcastStockUpdate(data: any) {
    this.server.emit('inventoryUpdate', data);
  }

  broadcastMenuAvailability(data: any) {
    this.server.emit('menuAvailability', data);
  }
}
