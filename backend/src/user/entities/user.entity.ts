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

  @Column({ type: 'varchar', nullable: true })
  placeOfBirth: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: string;

  @Column({ type: 'varchar', nullable: true })
  gender: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', nullable: true })
  religion: string;

  @Column({ type: 'varchar', nullable: true })
  maritalStatus: string;

  @Column({ type: 'varchar', nullable: true })
  jobTitle: string;

  @Column({ type: 'varchar', nullable: true })
  nationality: string;

  @Column({ type: 'date', nullable: true })
  joinedAt: string;

  // --- Kontak ---
  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string;

  // --- Akses ---
  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @ManyToOne(() => Role, (role) => role.users, { eager: true })
  role: Role;

  @Column({ type: 'varchar', nullable: true })
  pin: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  rfid: string;

  @Column({ type: 'text', nullable: true })
  fingerprintData: string | null;

  @Column({
    type: 'enum',
    enum: ['RFID_ONLY', 'FINGERPRINT_ONLY', 'HYBRID', 'DUAL'],
    default: 'HYBRID',
  })
  securityMode: 'RFID_ONLY' | 'FINGERPRINT_ONLY' | 'HYBRID' | 'DUAL';

  // --- Monitoring & Security ---
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.OFFLINE })
  status: UserStatus;

  @Column({ type: 'boolean', default: true })
  isVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
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
