import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PromoType {
  BUNDLE = 'BUNDLE', // Existing, but we will use this for Menu BUNDLES
  PACKAGE = 'PACKAGE', // New: Time + Menu Items
  QUANTITY_DISCOUNT = 'QUANTITY_DISCOUNT',
  TIME_BASED = 'TIME_BASED',
}

@Entity('promos')
export class Promo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: PromoType })
  type: PromoType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ type: 'json' })
  ruleJson: any;
  /**
   * Example BUNDLE:
   * {
   *   requireBilliardMinutes: 120,
   *   requireMenuItemIds: [10, 10, 15, 15], // 2 of ID 10, 2 of ID 15
   *   discountAmount: 5000,
   * }
   */

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalRevenueContribution: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalProfitContribution: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  estimatedHpp: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
