import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('point_rewards')
export class PointReward {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ['BILLIARD', 'CAFE', 'MERCHANDISE'] })
  category: string;

  @Column({ type: 'int' })
  pointCost: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  image: string;

  @Column({ type: 'int', nullable: true })
  menuItemId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
