import { Module, forwardRef } from '@nestjs/common';
import { BilliardGateway } from './billiard.gateway';
import { EventsGateway } from './events.gateway';
import { UserModule } from '../user/user.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [forwardRef(() => UserModule), forwardRef(() => ChatModule)],
  providers: [BilliardGateway, EventsGateway],
  exports: [BilliardGateway, EventsGateway],
})
export class SocketModule {}
