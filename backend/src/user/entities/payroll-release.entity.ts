import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('payroll_releases')
@Index(['userId', 'month', 'year'])
export class PayrollRelease {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column()
  month: number;

  @Column()
  year: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  basicSalary: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  commissionService: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  commissionSales: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  commissionProduction: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  penalties: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalPayout: number;

  @Column({ type: 'json', nullable: true })
  details: any; // Full snapshot of the breakdown

  @Column({ type: 'timestamp', nullable: true })
  releasedAt: Date;

  @ManyToOne('User')
  @JoinColumn({ name: 'releasedByUserId' })
  releasedBy: any;

  @Column({ nullable: true })
  releasedByUserId: number;

  @CreateDateColumn()
  createdAt: Date;
}
