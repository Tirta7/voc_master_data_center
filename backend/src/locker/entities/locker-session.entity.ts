import {
    Entity, Column, PrimaryGeneratedColumn,
    CreateDateColumn, UpdateDateColumn,
    ManyToOne, JoinColumn, type Relation
} from 'typeorm';
import type { Locker } from './locker.entity';

export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED';

@Entity('locker_sessions')
export class LockerSession {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne('Locker', (locker: any) => locker.sessions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'lockerId' })
    locker: Relation<Locker>;

    @Column()
    lockerId: number;

    // Customer info
    @Column()
    customerName: string;

    @Column({ nullable: true, type: 'varchar' })
    phone: string;

    @Column({ nullable: true, type: 'varchar' })
    identityNumber: string; // KTP / ID number

    // Security: PIN hashed with bcrypt
    @Column()
    pinHash: string;

    // Member link (optional)
    @Column({ nullable: true, type: 'int' })
    memberId: number | null;

    @Column({ nullable: true, type: 'varchar' })
    memberName: string | null;

    @Column({ default: false })
    isMemberFree: boolean; // If true, this session is a free member benefit

    // Pricing
    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    price: number; // 0 for free (member benefit)

    // Timing
    @Column({ type: 'timestamp' })
    startTime: Date;

    @Column({ type: 'timestamp', nullable: true })
    endTime: Date | null;

    @Column({ type: 'varchar', default: 'ACTIVE' })
    status: SessionStatus;

    // Staff who handled this
    @Column({ nullable: true, type: 'varchar' })
    handledByName: string;

    @Column({ nullable: true, type: 'int' })
    handledById: number | null;

    // PIN verification attempts (security)
    @Column({ default: 0 })
    failedPinAttempts: number;

    @Column({ default: false })
    isLocked: boolean; // Locked after too many wrong PINs

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
