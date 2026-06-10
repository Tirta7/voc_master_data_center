import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Ingredient } from './ingredient.entity';
import { StockIn } from './stock-in.entity';

export enum BatchStatus {
  AVAILABLE = 'AVAILABLE',
  DEPLETED = 'DEPLETED',
  SCRAP = 'SCRAP',
}

@Entity('ingredient_batches')
export class IngredientBatch {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Ingredient)
  @JoinColumn({ name: 'ingredientId' })
  ingredient: Ingredient;

  @Column()
  ingredientId: number;

  @ManyToOne(() => StockIn, { nullable: true })
  @JoinColumn({ name: 'stockInId' })
  stockIn: StockIn;

  @Column({ nullable: true })
  stockInId: number;

  @Column({ unique: true })
  batchNumber: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  initialQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  remainingQuantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  costPrice: number; // For exact FIFO COGS

  @Index()
  @Column({
    type: 'enum',
    enum: BatchStatus,
    default: BatchStatus.AVAILABLE,
  })
  status: BatchStatus;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
