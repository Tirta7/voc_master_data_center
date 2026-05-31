import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Table } from '../../billiard/entities/table.entity';
import { BilliardPackage } from '../../billiard/entities/billiard-package.entity';
import { Locker } from '../../locker/entities/locker.entity';

export enum AssetType {
  BILLIARD = 'BILLIARD',
  PLAYSTATION = 'PLAYSTATION',
  LOCKER = 'LOCKER',
}

@Entity('asset_categories')
export class AssetCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string; // e.g. "REGULAR", "VIP", "VVIP"

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: AssetType, default: AssetType.BILLIARD })
  assetType: AssetType;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Table, (table) => table.categoryRelation)
  tables: Relation<Table[]>;

  @OneToMany(() => BilliardPackage, (pkg) => pkg.categoryRelation)
  packages: Relation<BilliardPackage[]>;

  @OneToMany(() => Locker, (locker) => locker.categoryRelation)
  lockers: Relation<Locker[]>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
