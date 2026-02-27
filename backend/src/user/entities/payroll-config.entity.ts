import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';

@Entity('payroll_configs')
export class PayrollConfig {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne('User', (user: any) => user.payrollConfig)
    @JoinColumn()
    user: any; // Avoid circular import — type resolved at runtime by TypeORM

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    basicSalary: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    overtimeRate: number; // per hour

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    commissionService: number; // per table start

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    commissionSalesPercent: number; // percentage of F&B sales (Legacy/Default)

    @Column({ type: 'json', nullable: true })
    categoryCommissions: Record<string, number>; // { "FOOD": 10, "DRINK": 5 }

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    penaltyLate: number; // per instance or based on time

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    penaltyIdle: number; // per violation

    @Column({ type: 'int', default: 5 })
    idleThreshold: number; // minutes before penalty
}
