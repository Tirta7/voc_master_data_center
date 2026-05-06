import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { StockIn } from './stock-in.entity';

@Entity('stock_installment_plans')
export class StockInstallmentPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne('StockIn', (stock: any) => stock.installmentPlans)
  @JoinColumn({ name: 'stockInId' })
  stockIn: any;

  @Column()
  stockInId: number;

  @Column({ type: 'timestamp' })
  dueDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ default: false })
  isPaid: boolean;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
