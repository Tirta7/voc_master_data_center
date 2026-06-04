import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('push_subscriptions')
export class PushSubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  endpoint: string;

  @Column('json')
  keys: {
    p256dh: string;
    auth: string;
  };

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: number;

  @CreateDateColumn()
  createdAt: Date;
}
