import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { AssetCategory } from '../../category/entities/category.entity';

export enum PackageType {
  HOURLY = 'hourly',
  FIXED = 'fixed',
  DURATION = 'DURATION', // Legacy support
  PLAYTIME = 'PLAYTIME', // Legacy support
}

@Entity('billiard_packages')
export class BilliardPackage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  categoryId: number;

  @ManyToOne(() => AssetCategory, (cat) => cat.packages, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  categoryRelation: Relation<AssetCategory>;

  @Column({ type: 'enum', enum: PackageType, default: PackageType.HOURLY })
  type: PackageType;

  @Column({ type: 'int', nullable: true })
  durationMinutes: number; // For FIXED type

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  minutePrice: number;

  @Column({ type: 'json', nullable: true })
  timeSlots: { start: string; end: string; price: number; validDays?: string[] }[];

  @Column({ type: 'simple-array', nullable: true })
  validDays: string[] | null; // e.g. ['MON','TUE','WED','THU','FRI'] — null = every day

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
