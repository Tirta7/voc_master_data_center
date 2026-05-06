import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Ingredient } from './ingredient.entity';
import { Supplier } from './supplier.entity';
import { User } from '../../user/entities/user.entity';
import { StockPayment } from './stock-payment.entity';
import { OneToMany } from 'typeorm';
import { StockInstallmentPlan } from './stock-installment-plan.entity';

export enum StockPaymentStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
}

@Entity('stock_ins')
export class StockIn {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Ingredient)
  @JoinColumn({ name: 'ingredientId' })
  ingredient: Ingredient;

  @Column()
  ingredientId: number;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @Column({ nullable: true })
  supplierId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  @Column()
  unit: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  purchasePrice: number; // Price per unit at time of purchase

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalCost: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'receivedByUserId' })
  receivedBy: User;

  @Column({ nullable: true })
  receivedByUserId: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: StockPaymentStatus,
    default: StockPaymentStatus.PAID,
  })
  paymentStatus: StockPaymentStatus;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ nullable: true })
  invoiceNumber: string;

  @OneToMany('StockPayment', (payment: any) => payment.stockIn)
  payments: any[];

  @OneToMany('StockInstallmentPlan', (plan: any) => plan.stockIn)
  installmentPlans: any[];

  @CreateDateColumn()
  createdAt: Date;
}
