import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from './user.entity';

@Entity('roles')
export class Role {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string; // e.g., 'ADMIN', 'WAITER', 'CASHIER'

    @Column({ type: 'json' })
    permissions: string[]; // ['DASHBOARD_TABLE', 'START_TABLE', ...]

    @Column({ type: 'text', nullable: true })
    description?: string;

    @OneToMany('User', (user: any) => user.role)
    users: User[];
}
