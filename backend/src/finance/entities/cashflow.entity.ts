import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BusinessDay } from './business-day.entity';
import { Shift } from './shift.entity';

export enum CashflowType {
    IN = 'in',
    OUT = 'out',
}

@Entity('cashflow')
@Index('idx_cashflow_timestamp', ['timestamp'])
@Index('idx_cashflow_type_timestamp', ['type', 'timestamp'])
export class Cashflow {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    @Column({ type: 'enum', enum: CashflowType })
    type: CashflowType;

    @Column()
    source: string; // 'sale', 'expense', 'stock_purchase', 'manual'

    @Column({ nullable: true })
    referenceId: string; // invoiceNumber, expenseId, etc.

    @Column({ type: 'text', nullable: true })
    description: string;

    @CreateDateColumn()
    timestamp: Date;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    balanceAfter: number;

    @Column({ nullable: true })
    @Index('idx_cashflow_business_day')
    businessDayId: number;

    @Column({ nullable: true })
    @Index('idx_cashflow_shift')
    shiftId: number;

    @ManyToOne('BusinessDay')
    @JoinColumn({ name: 'businessDayId' })
    businessDay: BusinessDay;

    @ManyToOne('Shift')
    @JoinColumn({ name: 'shiftId' })
    shift: Shift;
}
