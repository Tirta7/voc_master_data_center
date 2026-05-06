import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { StockIn } from './stock-in.entity';
import { User } from '../../user/entities/user.entity';

@Entity('stock_payments')
export class StockPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne('StockIn', (stock: any) => stock.payments)
  @JoinColumn({ name: 'stockInId' })
  stockIn: any;

  @Column()
  stockInId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column()
  paymentMethod: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  paidAt: Date;
}
