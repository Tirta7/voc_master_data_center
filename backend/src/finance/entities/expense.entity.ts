import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

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
}
