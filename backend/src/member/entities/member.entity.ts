import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
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

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
