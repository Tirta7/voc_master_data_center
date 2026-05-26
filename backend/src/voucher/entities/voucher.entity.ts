import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { MenuItem } from '../../cafe/entities/menu-item.entity';
import { Member } from '../../member/entities/member.entity';

export enum VoucherType {
  DISCOUNT_PERCENT = 'DISCOUNT_PERCENT',
  DISCOUNT_FIXED = 'DISCOUNT_FIXED',
  FREE_BILLIARD_MINUTES = 'FREE_BILLIARD_MINUTES',
  FREE_ITEM = 'FREE_ITEM',
  BUY_X_GET_Y_BILLIARD = 'BUY_X_GET_Y_BILLIARD',
  BUNDLE_DEAL = 'BUNDLE_DEAL',
  CASHBACK_BALANCE = 'CASHBACK_BALANCE',
}

@Entity('vouchers')
export class Voucher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: VoucherType,
  })
  type: VoucherType;

  // The main value of the voucher (percentage, fixed amount, minutes, cashback amount, etc.)
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountValue: number;

  // Used for FREE_ITEM
  @ManyToOne(() => MenuItem, { nullable: true })
  @JoinColumn({ name: 'freeMenuItemId' })
  freeMenuItem: MenuItem | null;

  @Column({ type: 'int', nullable: true })
  freeMenuItemId: number | null;

  // Used for DISCOUNT_PERCENT to cap the maximum discount
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxDiscountAmount: number | null;

  // Minimum transaction subtotal required to use this voucher
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  minTransactionAmount: number;

  // Total global usage limit
  @Column({ type: 'int', nullable: true })
  usageLimit: number | null;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  // Targeted to a specific employee (existing)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  // Tracking User/Employee Creation
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdByUserId' })
  createdBy: User;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null;

  // Bounce-Back Voucher System
  @Column({ type: 'boolean', default: false })
  isBounceBack: boolean;

  @Column({ type: 'int', nullable: true })
  sourceTransactionId: number | null;

  // Targeted to a specific member (Loyalty)
  @ManyToOne(() => Member, { nullable: true })
  @JoinColumn({ name: 'memberId' })
  member: Member | null;

  @Column({ type: 'int', nullable: true })
  memberId: number | null;

  // Happy Hour constraints
  @Column({ type: 'json', nullable: true })
  validDays: number[] | null; // e.g., [1,2,3,4] for Mon-Thu

  @Column({ type: 'time', nullable: true })
  validStartTime: string | null;

  @Column({ type: 'time', nullable: true })
  validEndTime: string | null;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date | null;

  @Column({ default: true })
  isActive: boolean;

  // For complex logic like BUNDLE_DEAL or BUY_X_GET_Y parameters
  @Column({ type: 'json', nullable: true })
  ruleJson: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
