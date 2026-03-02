import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BusinessDay } from './business-day.entity';
import { Shift } from './shift.entity';

export enum ExpenseCategory {
    MAINTENANCE = 'maintenance',
    STAFF = 'staff',
    UTILITY = 'utility',
    INVENTORY = 'inventory_stock',
    MARKETING = 'marketing',
    OTHER = 'other',
}

@Entity('expenses')
export class Expense {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    @Column({ type: 'enum', enum: ExpenseCategory, default: ExpenseCategory.OTHER })
    category: ExpenseCategory;

    @Column({ type: 'text' })
    description: string;

    @CreateDateColumn()
    date: Date;

    @Column()
    recordedBy: string;

    @Column({ nullable: true })
    shiftId: number;

    @Column({ nullable: true })
    @Index('idx_expenses_business_day')
    businessDayId: number;

    @ManyToOne('BusinessDay')
    @JoinColumn({ name: 'businessDayId' })
    businessDay: BusinessDay;

    @ManyToOne('Shift')
    @JoinColumn({ name: 'shiftId' })
    shift: Shift;
}
