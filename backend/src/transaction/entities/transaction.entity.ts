import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Table } from '../../billiard/entities/table.entity';
import { TransactionPayment } from './transaction-payment.entity';
import { OrderItem } from '../../cafe/entities/order-item.entity';
import { CafeTable } from '../../cafe-table/entities/cafe-table.entity';
import { Shift } from '../../finance/entities/shift.entity';
import { BusinessDay } from '../../finance/entities/business-day.entity';
import { Member } from '../../member/entities/member.entity';

export enum TransactionStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  DEBT = 'DEBT',
  CANCELLED = 'CANCELLED',
}

export enum TransactionType {
  BILLIARD = 'BILLIARD',
  CAFE = 'CAFE',
  TOPUP = 'TOPUP',
}

@Entity('transactions')
@Index('idx_transactions_status_created', ['status', 'createdAt'])
@Index('idx_transactions_table_created', ['tableId', 'createdAt'])
@Index('idx_transactions_invoice', ['invoiceNumber'])
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  invoiceNumber: string;

  @Column({ nullable: true })
  customerName: string;

  @ManyToOne(() => Table, { nullable: true })
  @JoinColumn({ name: 'tableId' })
  table: Table | null;

  @Column({ type: 'int', nullable: true })
  tableId: number | null;

  @ManyToOne(() => CafeTable, { nullable: true })
  @JoinColumn({ name: 'cafeTableId' })
  cafeTable: CafeTable | null;

  @Column({ type: 'int', nullable: true })
  cafeTableId: number | null;

  @ManyToOne(() => Member, { nullable: true })
  @JoinColumn({ name: 'memberId' })
  member: Member | null;

  @Column({ type: 'int', nullable: true })
  memberId: number | null;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.UNPAID,
  })
  status: TransactionStatus;

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.BILLIARD,
  })
  type: TransactionType;

  @Column({ nullable: true })
  sessionType: string;

  @Column({ type: 'varchar', nullable: true })
  fareName: string | null;

  @Column({ type: 'timestamp', nullable: true })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ nullable: true })
  sessionDuration: string; // "13 Hour : 34 Minute : 05 Second"

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  billiardTotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cafeTotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  grandTotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  vatAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  serviceChargeAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  roundingAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.transaction)
  orderItems: OrderItem[];

  @OneToMany(() => TransactionPayment, (payment) => payment.transaction)
  payments: TransactionPayment[];

  @Column({ type: 'json', nullable: true })
  paymentDetails: any; // { method: 'cash', amount: 50000 }, etc.

  @Column({ type: 'json', nullable: true })
  billingDetails: any; // Breakdown of time-based billing

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ type: 'json', nullable: true })
  appliedPromos: any; // [{ id: 1, name: 'Bundle A', discount: 5000 }]

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdByUserId' })
  createdBy: User;

  @Column({ nullable: true })
  createdByUserId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'openedByUserId' })
  openedBy: User;

  @Column({ nullable: true })
  openedByUserId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'commissionUserId' })
  commissionUser: User;

  @Column({ nullable: true })
  commissionUserId: number;

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

  @Column({ nullable: true })
  packageId: number;

  @Column({ default: false })
  isPointsAwarded: boolean;

  @Column({ type: 'int', default: 0 })
  awardedPoints: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Transient properties for real-time calculations and receipt previews
  sessionTotals?: {
    billiardTotal: number;
    cafeTotal: number;
    discountAmount: number;
    serviceChargeAmount: number;
    vatAmount: number;
    roundingAmount: number;
    grandTotal: number;
    tierDiscountAmount: number;
  };

  billiardPackage?: any;
}
