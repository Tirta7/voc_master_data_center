import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  senderId: number;

  @Index()
  @Column({ nullable: true })
  receiverId: number | null;

  @Column({ type: 'text' })
  message: string;

  @Index()
  @CreateDateColumn()
  timestamp: Date;

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: 'USER' })
  type: 'USER' | 'SYSTEM' | 'AI_COACH';

  @Column({ type: 'simple-json', nullable: true })
  readByUserId: number[];

  @ManyToOne(() => User, { nullable: true })
  sender?: User;

  @ManyToOne(() => User, { nullable: true })
  receiver?: User;
}
