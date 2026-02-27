import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, Index, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { TransactionPayment } from '../../transaction/entities/transaction-payment.entity';
import { MenuItem } from './menu-item.entity';

export enum OrderItemStatus {
    QUEUED = 'QUEUED',
    PROCESSING = 'PROCESSING',
    DONE = 'DONE',
    CANCELLED = 'CANCELLED',
    CANCEL_REQUESTED = 'CANCEL_REQUESTED',
    CANCEL_REJECTED = 'CANCEL_REJECTED',
}

@Entity('order_items')
@Index('idx_order_items_status', ['status'])
@Index('idx_order_items_transactionId', ['transactionId'])
export class OrderItem {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'enum', enum: OrderItemStatus, default: OrderItemStatus.QUEUED })
    status: OrderItemStatus;

    @ManyToOne('Transaction', (transaction: any) => transaction.orderItems)
    transaction: any; // Avoid circular import — Transaction imports OrderItem

    @Column()
    transactionId: number;

    @ManyToOne(() => MenuItem)
    menuItem: MenuItem;

    @Column()
    menuItemId: number;

    @Column({ type: 'int' })
    quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    priceAtOrder: number;

    @Column({ default: false })
    isPaid: boolean; // For split bill / Pay per Item

    @ManyToOne(() => TransactionPayment, { nullable: true })
    payment: TransactionPayment;

    @Column({ nullable: true })
    paymentId: number;

    @Column({ nullable: true })
    note: string;

    @Column({ nullable: true })
    customName: string;

    @Column({ nullable: true })
    station: string;

    @Column({ nullable: true })
    bundleGroupId: string;

    @Column({ nullable: true })
    cancelledAt: Date;

    @Column({ nullable: true })
    cancelledBy: string;

    @Column({ nullable: true })
    cancelReason: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'completedByUserId' })
    completedBy: User;

    @Column({ nullable: true })
    completedByUserId: number;

    @Column({ nullable: true })
    completedAt: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'createdByUserId' })
    createdBy: User;

    @Column({ nullable: true })
    createdByUserId: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'commissionUserId' })
    commissionUser: User;

    @Column({ nullable: true })
    commissionUserId: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
