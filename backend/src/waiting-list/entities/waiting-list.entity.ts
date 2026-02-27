import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum WaitingListStatus {
    PENDING = 'PENDING',
    CHECKED_IN = 'CHECKED_IN',
    CANCELLED = 'CANCELLED',
}

export enum WaitingListType {
    BILLIARD = 'BILLIARD',
    CAFE = 'CAFE',
}

@Entity('waiting_lists')
export class WaitingList {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: 'enum',
        enum: WaitingListType,
        default: WaitingListType.BILLIARD,
    })
    type: WaitingListType;

    @Column()
    customerName: string;

    @Column({ nullable: true })
    phoneNumber: string;

    @Column({ default: 1 })
    pax: number;

    @Column({
        type: 'enum',
        enum: WaitingListStatus,
        default: WaitingListStatus.PENDING,
    })
    status: WaitingListStatus;

    @Column({ nullable: true })
    targetTableId: number; // The table they are waiting for

    @Column({ nullable: true })
    targetTableName: string;

    @Column({ nullable: true })
    handledById: number;

    @Column({ nullable: true })
    handledByName: string;

    @Column({ type: 'text', nullable: true })
    note: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
