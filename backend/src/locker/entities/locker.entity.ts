import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, type Relation } from 'typeorm';
import { LockerSession } from './locker-session.entity';

export type LockerStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
export type LockerCategory = 'REGULAR' | 'VIP';

@Entity('lockers')
export class Locker {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    number: string; // e.g. "A01", "B02"

    @Column({ nullable: true, type: 'varchar' })
    label: string; // Optional custom label

    @Column({ type: 'varchar', default: 'REGULAR' })
    category: LockerCategory;

    @Column({ type: 'varchar', default: 'AVAILABLE' })
    status: LockerStatus;

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    pricePerHour: number; // 0 = free for everyone

    @Column({ nullable: true, type: 'text' })
    notes: string;

    @OneToMany('LockerSession', (session: any) => session.locker)
    sessions: Relation<LockerSession[]>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
