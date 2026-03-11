import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import type { Shift } from './shift.entity';
import { Ingredient } from '../../inventory/entities/ingredient.entity';
import { MenuItem } from '../../cafe/entities/menu-item.entity';

@Entity('shift_stock_reports')
export class ShiftStockReport {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne('Shift', (shift: any) => shift.stockReports)
  @JoinColumn({ name: 'shiftId' })
  shift: Shift;

  @Column()
  shiftId: number;

  @ManyToOne(() => Ingredient, { nullable: true })
  @JoinColumn({ name: 'ingredientId' })
  ingredient: Ingredient;

  @Column({ nullable: true })
  ingredientId: number;

  @ManyToOne(() => MenuItem, { nullable: true })
  @JoinColumn({ name: 'menuItemId' })
  menuItem: MenuItem;

  @Column({ nullable: true })
  menuItemId: number;

  @Column({ nullable: true })
  itemName: string;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  systemStock: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  physicalStock: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  discrepancy: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  lostValue: number;

  @Column({ nullable: true })
  unit: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;
}
