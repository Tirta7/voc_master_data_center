import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import type { Shift } from './shift.entity';

@Entity('business_days')
export class BusinessDay {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    date: string; // Operational date (e.g., '2026-02-23')

    @CreateDateColumn()
    startTime: Date;

    @Column({ type: 'timestamp', nullable: true })
    endTime: Date;

    @Column({ default: false })
    isClosed: boolean;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    totalRevenue: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    totalExpenses: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    totalTopUp: number;

    @OneToMany('Shift', (shift: any) => shift.businessDay)
    shifts: Shift[];

    @CreateDateColumn()
    createdAt: Date;
}
