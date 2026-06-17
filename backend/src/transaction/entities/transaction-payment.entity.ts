import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Shift } from '../../finance/entities/shift.entity';
import { BusinessDay } from '../../finance/entities/business-day.entity';

@Entity('transaction_payments')
@Index('idx_transaction_payments_transaction', ['transactionId'])
export class TransactionPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne('Transaction')
  transaction: any; // Avoid circular import — Transaction imports TransactionPayment

  @Column()
  transactionId: number;

  @Column({ nullable: true })
  payerName: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  itemsSubtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  billiardPortion: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  serviceAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  roundingAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tenderedAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  changeAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalPaid: number;

  @Column()
  paymentMethod: string;

  @Column({ type: 'json', nullable: true })
  itemsSnapshot: any; // Store item names/prices at time of payment for receipt printing

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdByUserId' })
  createdBy: User;

  @Column({ nullable: true })
  createdByUserId: number;

  @ManyToOne(() => Shift)
  @JoinColumn({ name: 'shiftId' })
  shift: Shift;

  @Column({ nullable: true })
  shiftId: number;

  @ManyToOne(() => BusinessDay)
  @JoinColumn({ name: 'businessDayId' })
  businessDay: BusinessDay;

  @Column({ nullable: true })
  businessDayId: number;
}
