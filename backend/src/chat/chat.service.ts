import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ChatMessage } from './entities/chat.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatRepository: Repository<ChatMessage>,
  ) {}

  async sendMessage(senderId: number, receiverId: number, message: string, type: 'USER' | 'SYSTEM' | 'AI_COACH' = 'USER'): Promise<ChatMessage> {
    try {
      // Phase 45 Fix: If receiverId is 0, it means Global Group. 
      // Use null in DB to avoid Foreign Key constraint issues.
      const dbReceiverId = receiverId === 0 ? null : receiverId;

      const newMessage = this.chatRepository.create({
        senderId,
        receiverId: dbReceiverId,
        message,
        type,
        readByUserId: [senderId], // Sender marks their own message as read
      });
      const messageId = (await this.chatRepository.save(newMessage)).id;
      
      // Reload with relations for the gateway broadcast
      return (await this.chatRepository.findOne({
        where: { id: messageId },
        relations: ['sender', 'sender.role']
      }))!;
    } catch (err) {
      console.error('CRITICAL: Failed to save chat message:', err);
      throw err;
    }
  }

  async sendSystemMessage(receiverId: number, message: string, type: 'SYSTEM' | 'AI_COACH' = 'SYSTEM'): Promise<ChatMessage> {
    return this.sendMessage(0, receiverId, message, type);
  }

  async getConversation(userA: number, userB: number, limit = 50): Promise<ChatMessage[]> {
    return this.chatRepository.find({
      where: [
        { senderId: userA, receiverId: userB },
        { senderId: userB, receiverId: userA },
        ...(userA === 0 || userB === 0 ? [] : [
          { senderId: 0, receiverId: userA },
          { senderId: 0, receiverId: userB }
        ])
      ],
      order: { timestamp: 'ASC' },
      take: limit,
      relations: ['sender', 'receiver'],
    });
  }

  async markAsRead(userId: number, senderId?: number): Promise<void> {
    const query = this.chatRepository.createQueryBuilder('chat')
      .andWhere('chat.senderId != :userId', { userId }); // Never mark own messages

    if (senderId === 0) {
      // Mark only Global Group messages as read
      query.andWhere('chat.receiverId IS NULL');
    } else if (senderId !== undefined) {
      // Mark only specific private messages as read
      query.andWhere('chat.receiverId = :userId', { userId })
           .andWhere('chat.senderId = :senderId', { senderId });
    } else {
      // Mark ALL (Private + Group) as read for this user
      query.andWhere('(chat.receiverId = :userId OR chat.receiverId IS NULL)', { userId });
    }

    const unreadMessages = await query.getMany();
    
    for (const msg of unreadMessages) {
      const readList = msg.readByUserId || [];
      if (!readList.includes(userId)) {
        readList.push(userId);
        msg.readByUserId = readList;
        msg.isRead = true; // Backward compatibility
        await this.chatRepository.save(msg);
      }
    }
  }

  async getUnreadCount(userId: number): Promise<number> {
    const messages = await this.chatRepository.createQueryBuilder('chat')
      .where('(chat.receiverId = :userId OR chat.receiverId IS NULL)', { userId })
      .andWhere('chat.senderId != :userId', { userId })
      .getMany();

    return messages.filter(m => !(m.readByUserId || []).includes(userId)).length;
  }

  async getManagementHistory(userId: number, limit = 50): Promise<ChatMessage[]> {
    // Group Chat logic: Fetch all messages where receiverId is NULL (Global)
    // Plus messages specifically to/from this user.
    return this.chatRepository.find({
      where: [
        { receiverId: IsNull() },
        { receiverId: userId },
        { senderId: userId }
      ],
      order: { timestamp: 'ASC' },
      take: limit,
      relations: ['sender', 'sender.role', 'receiver'],
    });
  }
}
