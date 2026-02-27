import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Table } from './table.entity';
import { Member } from '../../member/entities/member.entity';

@Entity('sessions')
export class Session {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Table)
    table: Table;

    @ManyToOne(() => Member, { nullable: true })
    @JoinColumn({ name: 'memberId' })
    member: Member;

    @Column({ nullable: true })
    memberId: number | null;

    @Column({ type: 'enum', enum: ['prepaid', 'open'] })
    sessionType: 'prepaid' | 'open';

    @Column({ type: 'timestamp' })
    startTime: Date;

    @Column({ type: 'timestamp', nullable: true })
    endTime: Date;

    @Column({ type: 'int', nullable: true })
    durationMinutes: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    totalPrice: number;

    @Column({ default: false })
    isPaid: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
