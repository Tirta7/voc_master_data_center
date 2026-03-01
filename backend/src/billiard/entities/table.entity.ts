import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { BilliardPackage } from './billiard-package.entity';

export enum TableStatus {
    AVAILABLE = 'available',
    IN_USE = 'in_use',
    WARNING = 'warning', // < 10 minutes
    WAITING_PAYMENT = 'waiting_payment',
    MAINTENANCE = 'maintenance',
}

@Entity('tables')
export class Table {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    tableName: string;

    @Column({ type: 'enum', enum: ['REGULAR', 'VIP'], default: 'REGULAR' })
    category: 'REGULAR' | 'VIP';

    @Column({ unique: true, nullable: true })
    macAddress: string;

    @Column({ type: 'enum', enum: TableStatus, default: TableStatus.AVAILABLE })
    status: TableStatus;

    @Column({ default: false })
    isLightOn: boolean;

    @Column({ nullable: true })
    relayPin: number;

    @Column({ type: 'enum', enum: ['prepaid', 'open'], nullable: true })
    sessionType: 'prepaid' | 'open' | null;

    @Column({ type: 'timestamp', nullable: true })
    startTime: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    endTime: Date | null;

    @Column({ type: 'int', nullable: true })
    remainingMinutes: number | null;

    @Column({ type: 'int', nullable: true })
    packageId: number | null;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    activePackagePrice: number | null;

    @Column({ type: 'json', nullable: true })
    lastSessionData: any; // Dynamic session info

    @Column({ default: false })
    isBooked: boolean;

    @Column({ type: 'int', nullable: true })
    bookedByWaitingId: number;

    @Column({ nullable: true })
    bookedByName: string;

    @Column({ type: 'int', nullable: true })
    memberId: number | null;

    member?: any; // Used during query relations

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    grandTotal?: number;
    activeTransaction?: any;
}
