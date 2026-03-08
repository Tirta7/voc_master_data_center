import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import type { BusinessDay } from './business-day.entity';
import type { ShiftStockReport } from './shift-stock-report.entity';
import { OneToMany } from 'typeorm';

export enum ShiftStatus {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
}

@Entity('shifts')
export class Shift {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ nullable: true })
    userId: number;

    @ManyToOne('BusinessDay', (bd: any) => bd.shifts)
    @JoinColumn({ name: 'businessDayId' })
    businessDay: BusinessDay;

    @Column()
    businessDayId: number;

    @CreateDateColumn()
    startTime: Date;

    @Column({ nullable: true })
    shiftName: string;

    @Column({ type: 'timestamp', nullable: true })
    endTime: Date;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    cashStart: number; // Initial modal/drawer amount

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    cashSystem: number; // Expected cash from sales

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    cashPhysical: number; // Actual cash counted by user

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    discrepancy: number; // Diff between system and physical

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    totalTopUp: number;

    @Column({ type: 'text', nullable: true })
    note: string;

    @Column({ type: 'enum', enum: ShiftStatus, default: ShiftStatus.OPEN })
    status: ShiftStatus;

    @Column({ nullable: true })
    startedBy: string;

    @Column({ nullable: true })
    endedBy: string;

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'int', default: 0 })
    latenessMinutes: number;

    @Column({ type: 'int', default: 0 })
    overtimeMinutes: number;

    @Column({ type: 'simple-json', nullable: true })
    assignedTableIds: { type: 'CAFE' | 'BILLIARD', id: number }[];

    @Column({ type: 'json', nullable: true })
    performanceSummary: any; // Stats like popular items, top packages, etc.

    @OneToMany('ShiftStockReport', (ssr: any) => ssr.shift)
    stockReports: ShiftStockReport[];

    @CreateDateColumn()
    createdAt: Date;
}
