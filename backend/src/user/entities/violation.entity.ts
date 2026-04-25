import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Shift } from '../../finance/entities/shift.entity';
import { BusinessDay } from '../../finance/entities/business-day.entity';

export enum ViolationType {
  IDLE_TIMEOUT = 'IDLE_TIMEOUT',
  LATE_LOGIN = 'LATE_LOGIN',
  MANUAL_PENALTY = 'MANUAL_PENALTY',
}

@Entity('violations')
export class Violation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: number;

  @Column({ type: 'enum', enum: ViolationType })
  type: ViolationType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  penaltyAmount: number;

  @Column({ nullable: true })
  durationMinutes: number;

  @ManyToOne(() => Shift, { nullable: true })
  @JoinColumn({ name: 'shiftId' })
  shift: Shift;

  @Column({ nullable: true })
  shiftId: number;

  @ManyToOne(() => BusinessDay, { nullable: true })
  @JoinColumn({ name: 'businessDayId' })
  businessDay: BusinessDay;

  @Column({ nullable: true })
  businessDayId: number;

  @Column({ nullable: true })
  payrollReleaseId: number;

  @CreateDateColumn()
  createdAt: Date;
}
