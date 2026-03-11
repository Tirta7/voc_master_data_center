import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Role } from './role.entity';
import { PayrollConfig } from './payroll-config.entity';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  AWAY = 'AWAY',
  BANNED = 'BANNED',
  OFFLINE = 'OFFLINE',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  // --- Identitas Pribadi ---
  @Column()
  name: string;

  @Column({ nullable: true })
  placeOfBirth: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  religion: string;

  @Column({ nullable: true })
  maritalStatus: string;

  @Column({ nullable: true })
  jobTitle: string;

  @Column({ nullable: true })
  nationality: string;

  @Column({ type: 'date', nullable: true })
  joinedAt: string;

  // --- Kontak ---
  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  // --- Akses ---
  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @ManyToOne(() => Role, (role) => role.users, { eager: true })
  role: Role;

  @Column({ nullable: true })
  pin: string;

  // --- Monitoring & Security ---
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.OFFLINE })
  status: UserStatus;

  @Column({ nullable: true })
  baseShift: string;

  @Column({ nullable: true })
  socketId: string;

  @Column({ type: 'timestamp', nullable: true })
  lastSeen: Date;

  @Column({ type: 'simple-json', nullable: true })
  assignedTableIds: { type: 'CAFE' | 'BILLIARD'; id: number }[];

  @Column({ nullable: true })
  currentActivePage: string;

  // --- Payroll ---
  @OneToOne('PayrollConfig', (config: any) => config.user, {
    cascade: true,
    eager: true,
  })
  payrollConfig: PayrollConfig;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
