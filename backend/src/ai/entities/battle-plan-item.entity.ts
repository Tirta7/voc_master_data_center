import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BattlePlan } from './battle-plan.entity.js';
import { MenuItem } from '../../cafe/entities/menu-item.entity.js';
import { BilliardPackage } from '../../billiard/entities/billiard-package.entity.js';

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

  @ManyToOne(() => BilliardPackage, { nullable: true })
  @JoinColumn({ name: 'packageId' })
  billiardPackage: BilliardPackage;

  @Column({ type: 'int', nullable: true })
  packageId: number;

  @Column({ type: 'int' })
  targetQuantity: number;

  @Column({ type: 'int', default: 0 })
  soldQuantity: number;

  @Column({ type: 'varchar', nullable: true })
  aiLabel: string; // 🔥 Laris, ❄️ Kurang Laku, etc.

  @Column({ default: false })
  isAutoBroadcastEnabled: boolean;
}
