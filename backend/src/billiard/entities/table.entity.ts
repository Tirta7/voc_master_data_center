import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BilliardPackage } from './billiard-package.entity';

export enum TableStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  WARNING = 'warning', // < 10 minutes
  WAITING_PAYMENT = 'waiting_payment',
  MAINTENANCE = 'maintenance',
}

export enum HardwareType {
  PCF8575 = 'PCF8575', // Panel konvensional: 1 ESP32 + PCF8575 I2C expander (kontrol banyak relay)
  MOC3062 = 'MOC3062', // Modul baru: 1 ESP32 per meja, kontrol langsung via GPIO ke MOC3062 + TRIAC BTA16
}

@Entity('tables')
export class Table {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  tableName: string;

  @Column({ type: 'enum', enum: ['REGULAR', 'VIP'], default: 'REGULAR' })
  category: 'REGULAR' | 'VIP';

  @Column({ nullable: true })
  macAddress: string;

  @Column({ nullable: true })
  ipAddress: string;

  /**
   * Jenis hardware controller yang digunakan:
   * - PCF8575: Panel konvensional (1 ESP32 + modul PCF8575, relayPin = channel PCF, 0-15)
   * - MOC3062: Modul per-meja (1 ESP32 per meja, relayPin = nomor GPIO ESP32, e.g. 4)
   */
  @Column({
    type: 'enum',
    enum: HardwareType,
    default: HardwareType.PCF8575,
    nullable: true,
  })
  hardwareType: HardwareType;

  @Column({ type: 'enum', enum: TableStatus, default: TableStatus.AVAILABLE })
  status: TableStatus;

  @Column({ nullable: true })
  rssi: number;

  @Column({ type: 'bigint', nullable: true })
  uptime: number;

  @Column({ type: 'timestamp', nullable: true })
  lastHeartbeat: Date;

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

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  grandTotal?: number;
  activeTransaction?: any;
}
