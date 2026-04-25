import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

/**
 * Jadwal shift harian per karyawan.
 * Satu record = karyawan X dijadwalkan shiftName Y pada tanggal operasional Z.
 * Supports tukar shift antar karyawan.
 */
@Entity('employee_shift_schedules')
@Index(['userId', 'date'], { unique: true })
export class EmployeeShiftSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Tanggal operasional (logical date) YYYY-MM-DD */
  @Column({ type: 'date' })
  date: string;

  /** Nama shift sesuai settings.availableShifts (e.g. "SHIFT1", "SHIFT2", "OVERTIME") */
  @Column({ type: 'varchar' })
  shiftName: string;

  /** True jika ini adalah hasil tukar shift */
  @Column({ default: false })
  isSwap: boolean;

  /** ID karyawan yang bertukar shift (jika isSwap=true) */
  @Column({ type: 'int', nullable: true })
  swappedWithUserId: number | null;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'swappedWithUserId' })
  swappedWith: User;

  /** Catatan/alasan tukar shift */
  @Column({ type: 'text', nullable: true })
  swapNote: string | null;

  /** Admin/user yang mengatur jadwal ini */
  @Column({ type: 'int', nullable: true })
  createdByAdminId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
