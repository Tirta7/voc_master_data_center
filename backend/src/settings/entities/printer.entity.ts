import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PrinterType {
  CASHIER = 'CASHIER',
  KITCHEN = 'KITCHEN',
  BARTENDER = 'BARTENDER',
}

export enum PrinterConnectionType {
  IP = 'IP',
  SERIAL_COM = 'SERIAL_COM',
}

@Entity('printers')
export class Printer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: PrinterConnectionType,
    default: PrinterConnectionType.IP,
  })
  connectionType: PrinterConnectionType;

  @Column()
  ipAddress: string; // Used for both IP (e.g. 192.168.1.100) and COM Port (e.g. COM3)

  @Column({ default: 9100 })
  port: number;

  @Column({
    type: 'enum',
    enum: PrinterType,
    default: PrinterType.KITCHEN,
  })
  type: PrinterType;

  @Column({ type: 'int', default: 1 })
  floor: number;

  /**
   * List of production zones covered by this printer.
   * Stored as a JSON array of strings, e.g. ["ZONE_A", "ZONE_B"]
   */
  @Column({ type: 'json', nullable: true })
  coverageZones: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ default: false })
  isBackup: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
