import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { MenuItem } from './menu-item.entity';

@Entity('product_finances')
export class ProductFinance {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne('MenuItem', 'productFinance', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menuItemId' })
  menuItem: Relation<MenuItem>;

  @Column()
  menuItemId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  baseHpp: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  targetMarginPercent: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  targetMarkupFixed: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  targetMarkupPercent: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 1 })
  targetMultiplier: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 35 })
  maxHppThreshold: number;

  @Column({ type: 'text', nullable: true })
  pricingAdvice: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
