import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { LockerSession } from './locker-session.entity';
import { AssetCategory } from '../../category/entities/category.entity';

export enum LockerStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity('lockers')
export class Locker {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  number: string; // e.g. "A01", "B02"

  @Column({ nullable: true, type: 'varchar' })
  label: string; // Optional custom label
  @Column({ nullable: true })
  categoryId: number;

  @ManyToOne(() => AssetCategory, (cat) => cat.lockers, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  categoryRelation: Relation<AssetCategory>;

  @Column({ type: 'varchar', default: 'AVAILABLE' })
  status: LockerStatus;

  @Column({ nullable: true })
  macAddress: string;

  @Column({ nullable: true })
  relayPin: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  pricePerHour: number; // 0 = free for everyone

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @OneToMany('LockerSession', (session: any) => session.locker)
  sessions: Relation<LockerSession[]>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
