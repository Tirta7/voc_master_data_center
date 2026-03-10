import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Member } from '../../member/entities/member.entity';

@Entity('point_ledgers')
export class PointLedger {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Index()
  @Column({ type: 'int' })
  memberId: number;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'memberId' })
  member: Member;

  @Column({ type: 'enum', enum: ['EARN', 'REDEEM', 'GAME_PLAY', 'GAME_WIN', 'ADJUSTMENT', 'EXPIRY', 'MISSION_REWARD'] })
  type: string;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  referenceId: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
