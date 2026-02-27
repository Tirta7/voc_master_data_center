import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

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
}
