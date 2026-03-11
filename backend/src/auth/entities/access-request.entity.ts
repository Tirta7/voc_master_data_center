import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum AccessRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
}

@Entity('access_requests')
export class AccessRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column()
  username: string;

  @Column()
  employeeName: string;

  @Column()
  roleName: string;

  @Column({
    type: 'enum',
    enum: AccessRequestStatus,
    default: AccessRequestStatus.PENDING,
  })
  status: AccessRequestStatus;

  @Column({ default: false })
  isOutOfShift: boolean;

  @Column({ nullable: true })
  shiftName?: string;

  @Column({ nullable: true })
  shiftTimeRange?: string; // e.g., "10:00 - 18:00"

  @Column({ nullable: true })
  approvedBy?: number; // userId of Admin/Cashier

  @Column({ nullable: true })
  approvedByName?: string;

  @Column({ nullable: true })
  socketId?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
