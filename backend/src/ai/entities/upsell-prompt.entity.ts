import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { MenuItem } from '../../cafe/entities/menu-item.entity';
import { BusinessDay } from '../../finance/entities/business-day.entity';
import { Promo } from '../../promo/entities/promo.entity';

@Entity('ai_upsell_prompts')
@Index(['businessDayId', 'isConverted'])
export class UpsellPrompt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  businessDayId: number;

  @ManyToOne(() => BusinessDay)
  businessDay: BusinessDay;

  @Column({ type: 'int', nullable: true })
  menuItemId: number | null;

  @ManyToOne(() => MenuItem)
  menuItem: MenuItem;

  @Column({ type: 'int', nullable: true })
  packageId: number | null;

  @Column({ type: 'int', nullable: true })
  promoId: number | null;

  @ManyToOne(() => Promo)
  promo: Promo;

  @Column({ type: 'int', nullable: true })
  tableId: number;

  @Column({ type: 'varchar', nullable: true })
  tableName: string;

  @Column({ default: false })
  isConverted: boolean;

  @Column({ default: false })
  isAcknowledged: boolean;

  @Column({ type: 'timestamp', nullable: true })
  convertedAt: Date;

  @Column({ type: 'int', nullable: true })
  transactionId: number | null;

  @Column({ type: 'int', nullable: true })
  convertedByUserId: number | null;

  @Column({ type: 'varchar', nullable: true })
  convertedByUserName: string | null;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ default: false })
  isManual: boolean;

  @Column({ default: 0 })
  ackCount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  conversionValue: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
