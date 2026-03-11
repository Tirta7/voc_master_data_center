import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MemberTier } from './member-tier.entity';

@Entity('members')
export class Member {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  rfidUid: string;

  @Column()
  name: string;

  @Column({ unique: true, nullable: true })
  memberCode: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number;

  @Column({ default: 0 })
  discountPercentage: number;

  @ManyToOne(() => MemberTier, (tier) => tier.members, { nullable: true })
  @JoinColumn({ name: 'tierId' })
  tier: MemberTier | null;

  @Column({ type: 'int', nullable: true })
  tierId: number | null;

  @Column({ type: 'timestamp', nullable: true })
  expiryDate: Date | null;

  @Column({ default: 1 })
  securityVersion: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'int', nullable: true })
  targetWinRate: number | null;

  // ── Loyalty & Gamification Fields ──────────────────────────────────────

  /** Cumulative total spend (Rp). Used for auto tier-upgrade threshold check. */
  @Column({ type: 'bigint', default: 0 })
  totalSpend: number;

  /** Date of birth for birthday reward feature. */
  @Column({ type: 'date', nullable: true })
  birthDate: Date | null;

  /** Unique referral code this member can share. */
  @Column({ type: 'varchar', unique: true, nullable: true })
  referralCode: string | null;

  /** ID of the member who referred this member. */
  @Column({ type: 'int', nullable: true })
  referredById: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
