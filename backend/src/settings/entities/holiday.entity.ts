import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('public_holidays')
export class PublicHoliday {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ default: true })
  isClosure: boolean; // if true, business is closed

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('business_closures')
export class BusinessClosure {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column()
  reason: string;

  @CreateDateColumn()
  createdAt: Date;
}
