import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
@Index('idx_audit_logs_created', ['createdAt'])
@Index('idx_audit_logs_action', ['action'])
export class AuditLog {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    action: string; // e.g., 'CANCEL_ORDER', 'DISCOUNT_APPLIED', 'START_SESSION'

    @Column()
    user: string; // e.g., 'Admin', 'Waiter A'

    @Column({ type: 'text', nullable: true })
    details: string;

    @Column({ nullable: true })
    tableId: number;

    @Column({ nullable: true })
    invoiceNumber: string;

    @CreateDateColumn()
    createdAt: Date;
}
