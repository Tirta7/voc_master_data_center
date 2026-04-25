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

@Entity('printers')
export class Printer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  ipAddress: string;

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
