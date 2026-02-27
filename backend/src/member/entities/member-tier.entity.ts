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

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
    pointMultiplier: number;

    @Column({ type: 'json', nullable: true })
    activeDates: { date: string, startTime: string, endTime: string }[]; // Specific allowed ISO dates with hours

    @Column({ type: 'json', nullable: true })
    activeDays: number[]; // Allowed days 0-6 (0=Sun)

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => Member, (member) => member.tier)
    members: Member[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
