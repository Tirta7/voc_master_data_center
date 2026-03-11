import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('missions')
export class Mission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  code: string; // e.g., 'SCRATCH_10_PLAYS'

  @Column({ type: 'int' })
  rewardPoints: number;

  @Column({ type: 'int', default: 1 })
  targetValue: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ nullable: true })
  icon: string; // Lucide icon name

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('member_missions')
export class MemberMission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  memberId: number;

  @Column()
  missionId: number;

  @Column({ type: 'int', default: 0 })
  currentValue: number;

  @Column({ type: 'boolean', default: false })
  isCompleted: boolean;

  @Column({ type: 'boolean', default: false })
  isClaimed: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
