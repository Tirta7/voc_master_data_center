import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum ApprovalModuleType {
  WASTE = 'WASTE',
  EXPENSE = 'EXPENSE',
  CLOSING = 'CLOSING',
  STOCK_UPDATE = 'STOCK_UPDATE',
  STOCK_IN = 'STOCK_IN',
  DATA_EDIT = 'DATA_EDIT',
  TABLE_ACCESS = 'TABLE_ACCESS',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED', // Final ACC
  REJECTED = 'REJECTED',
}

@Entity('approval_requests')
export class ApprovalRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ApprovalModuleType,
  })
  moduleType: ApprovalModuleType;

  @Column()
  referenceId: number; // ID in the source table (Waste/Expense/Shift)

  @Column({ type: 'json' })
  requiredLevels: number[]; // e.g., [1, 2, 4] for sequential approval

  @Column({ default: 0 })
  currentLevelIndex: number; // pointer to requiredLevels array

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status: ApprovalStatus;

  @Column({ type: 'text', nullable: true })
  metadata?: string; // JSON with source details for display

  @Column()
  requestedByUserId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requestedByUserId' })
  requestedBy: User;

  @OneToMany(() => ApprovalHistory, (history) => history.approvalRequest)
  history: ApprovalHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('approval_history')
export class ApprovalHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  approvalRequestId: number;

  @ManyToOne(() => ApprovalRequest, (req) => req.history)
  @JoinColumn({ name: 'approvalRequestId' })
  approvalRequest: ApprovalRequest;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  level: number;

  @Column()
  action: 'VERIFY' | 'APPROVE' | 'REJECT' | 'BYPASS';

  @Column({ type: 'text', nullable: true })
  note?: string;

  @CreateDateColumn()
  createdAt: Date;
}
