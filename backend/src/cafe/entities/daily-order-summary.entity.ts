import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('daily_order_summaries')
export class DailyOrderSummary {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    date: string; // YYYY-MM-DD

    @Column()
    station: string; // 'BDS' or 'KDS'

    @Column({ default: 0 })
    totalItems: number;

    @Column({ type: 'text', nullable: true })
    itemsJson: string; // JSON string of { itemName: count }

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
