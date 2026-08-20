import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BattlePlan } from './battle-plan.entity';
import { MenuItem } from '../../cafe/entities/menu-item.entity';
import { BilliardPackage } from '../../billiard/entities/billiard-package.entity';
import { Promo } from '../../promo/entities/promo.entity';

@Entity('battle_plan_items')
export class BattlePlanItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne('BattlePlan', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'battlePlanId' })
  battlePlan: BattlePlan;

  @Column({ type: 'int' })
  battlePlanId: number;

  @ManyToOne(() => MenuItem, { nullable: true })
  @JoinColumn({ name: 'menuItemId' })
  menuItem: MenuItem;

  @Column({ type: 'int', nullable: true })
  menuItemId: number;

  @ManyToOne(() => BilliardPackage, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'packageId' })
  billiardPackage: BilliardPackage;

  @Column({ type: 'int', nullable: true })
  packageId: number;

  @ManyToOne(() => Promo, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promoId' })
  promo: Promo;

  @Column({ type: 'int', nullable: true })
  promoId: number;

  @Column({ type: 'int' })
  targetQuantity: number;

  @Column({ type: 'int', default: 0 })
  soldQuantity: number;

  @Column({ type: 'varchar', nullable: true })
  aiLabel: string; // 🔥 Laris, ❄️ Kurang Laku, etc.

  @Column({ default: false })
  isAutoBroadcastEnabled: boolean;
}
