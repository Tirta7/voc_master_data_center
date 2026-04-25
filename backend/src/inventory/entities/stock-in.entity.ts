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

  @CreateDateColumn()
  createdAt: Date;
}
