import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Member } from './member.entity';

@Entity('member_tiers')
export class MemberTier {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string; // PLATINUM, GOLD, SILVER, etc.

    @Column({ type: 'json' })
    discountConfig: {
        billiardPackage: number; // Discount % for Billiard Packages
        billiardOpen: number;    // Discount % for Open Table
        food: number;            // Discount % for Category Food
        drink: number;           // Discount % for Category Drink
        other: number;           // Discount % for everything else
        isFreeLocker: boolean;   // Free Locker benefit
    };

    @Column({ default: '00:00' })
    activeStartTime: string;

    @Column({ default: '23:59' })
    activeEndTime: string;

    @Column({ type: 'int', default: 1 })
    pointMultiplier: number;

    @Column({ type: 'json', nullable: true })
    activeDates: { date: string, startTime: string, endTime: string }[];

    @Column({ type: 'json', nullable: true })
    activeDays: number[]; // 0=Sun, 1=Mon … 6=Sat

    @Column({ default: true })
    isActive: boolean;

    // ── Gamification & Loyalty Fields ────────────────────────────────────────

    /** Total cumulative spend (Rp) for auto tier-upgrade. null = no auto-upgrade. */
    @Column({ type: 'bigint', nullable: true })
    autoUpgradeSpend: number | null;

    /** Minimum top-up balance to maintain tier standing (Rp). null = no minimum. */
    @Column({ type: 'bigint', nullable: true })
    minimumTopUp: number | null;

    /** Birthday discount % (0-100). null = no birthday reward. */
    @Column({ type: 'int', nullable: true })
    birthdayDiscountPct: number | null;

    /** Days of the week with double points. 0=Sun…6=Sat. null = no double days. */
    @Column({ type: 'json', nullable: true })
    doublePointDays: number[] | null;

    /** Bonus top-up config. null = no bonus. */
    @Column({ type: 'json', nullable: true })
    bonusTopupConfig: {
        minAmount: number;
        bonusPercent: number;
        label: string;
    } | null;

    /** Human-readable free item trigger. e.g. "1 Americano gratis setiap main > 3 jam". */
    @Column({ type: 'text', nullable: true })
    freeItemTrigger: string | null;

    /** Points awarded to referrer per successful new member referral. */
    @Column({ type: 'int', nullable: true })
    referralBonusPoints: number | null;

    @OneToMany(() => Member, (member) => member.tier)
    members: Member[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
