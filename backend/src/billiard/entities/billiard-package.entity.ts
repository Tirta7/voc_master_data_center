import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PackageType {
    HOURLY = 'hourly',
    FIXED = 'fixed',
    DURATION = 'DURATION', // Legacy support
    PLAYTIME = 'PLAYTIME', // Legacy support
}

@Entity('billiard_packages')
export class BilliardPackage {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ type: 'enum', enum: ['REGULAR', 'VIP'], default: 'REGULAR' })
    tableCategory: 'REGULAR' | 'VIP';

    @Column({ type: 'enum', enum: PackageType, default: PackageType.HOURLY })
    type: PackageType;

    @Column({ type: 'int', nullable: true })
    durationMinutes: number; // For FIXED type

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    price: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    minutePrice: number;

    @Column({ type: 'json', nullable: true })
    timeSlots: { start: string; end: string; price: number }[];

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
