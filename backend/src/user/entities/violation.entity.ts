import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum ViolationType {
    IDLE_TIMEOUT = 'IDLE_TIMEOUT',
    LATE_LOGIN = 'LATE_LOGIN',
    MANUAL_PENALTY = 'MANUAL_PENALTY',
}

@Entity('violations')
export class Violation {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: number;

    @Column({ type: 'enum', enum: ViolationType })
    type: ViolationType;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    penaltyAmount: number;

    @Column({ nullable: true })
    durationMinutes: number;

    @CreateDateColumn()
    createdAt: Date;
}
