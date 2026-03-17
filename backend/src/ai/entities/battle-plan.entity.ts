import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, JoinColumn, ManyToOne } from 'typeorm';
import { BusinessDay } from '../../finance/entities/business-day.entity';
import type { BattlePlanItem } from './battle-plan-item.entity.js';

export enum BattlePlanStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

@Entity('battle_plans')
export class BattlePlan {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => BusinessDay)
  @JoinColumn({ name: 'businessDayId' })
  businessDay: BusinessDay;

  @Column({ type: 'int' })
  businessDayId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  targetRevenue: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  predictedRevenue: number;

  @Column({ type: 'enum', enum: BattlePlanStatus, default: BattlePlanStatus.DRAFT })
  status: BattlePlanStatus;

  @Column({ type: 'text', nullable: true })
  aiStrategyBrief: string;

  @OneToMany('BattlePlanItem', 'battlePlan', { cascade: true })
  items: BattlePlanItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
