import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './entities/chat.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { SocketModule } from '../socket/socket.module';
import { FinanceModule } from '../finance/finance.module';
import { AIModule } from '../ai/ai.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage]),
    forwardRef(() => SocketModule),
    forwardRef(() => FinanceModule),
    forwardRef(() => AIModule),
  ],
  providers: [ChatService],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
