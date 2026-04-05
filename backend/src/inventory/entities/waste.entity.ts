import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Ingredient } from './ingredient.entity';
import { User } from '../../user/entities/user.entity';
import { BusinessDay } from '../../finance/entities/business-day.entity';

export enum WasteStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('inventory_waste')
export class Waste {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ingredientId: number;

  @ManyToOne(() => Ingredient)
  @JoinColumn({ name: 'ingredientId' })
  ingredient: Ingredient;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  valuation: number; // calculated loss (qty * costPrice)

  @Column({ type: 'text' })
  reason: string; // e.g., 'Expired', 'Broken', 'Holiday Closure'

  @Column({
    type: 'enum',
    enum: WasteStatus,
    default: WasteStatus.PENDING,
  })
  status: WasteStatus;

  @Column({ nullable: true })
  recordedByUserId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recordedByUserId' })
  recordedBy: User;

  @Column({ nullable: true })
  businessDayId: number;

  @ManyToOne(() => BusinessDay)
  @JoinColumn({ name: 'businessDayId' })
  businessDay: BusinessDay;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
