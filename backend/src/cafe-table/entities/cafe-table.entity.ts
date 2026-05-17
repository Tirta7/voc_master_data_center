import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CafeTableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
}

@Entity('cafe_tables')
export class CafeTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  tableName: string;

  @Column({ type: 'int', default: 4 })
  capacity: number;

  @Column({
    type: 'enum',
    enum: CafeTableStatus,
    default: CafeTableStatus.AVAILABLE,
  })
  status: CafeTableStatus;

  @Column({ type: 'int', nullable: true })
  currentTransactionId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  currentCustomer: string | null;

  @Column({ default: false })
  isBooked: boolean;

  @Column({ type: 'int', nullable: true })
  bookedByWaitingId: number;

  @Column({ nullable: true })
  bookedByName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  // Transient properties for real-time data (not stored in DB)
  activeTransaction?: any;
  grandTotal?: number;
}
