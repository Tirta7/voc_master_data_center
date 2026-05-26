import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, LessThan } from 'typeorm';
import { Voucher, VoucherType } from './entities/voucher.entity';

@Injectable()
export class VoucherService {
  private readonly logger = new Logger(VoucherService.name);

  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredBounceBackVouchers() {
    this.logger.log('Running nightly cleanup for expired Bounce-Back vouchers...');
    const now = new Date();
    // Cari semua voucher Bounce-Back yang sudah melewati masa tenggang dan belum dipakai
    const expiredVouchers = await this.voucherRepository.find({
      where: {
        isBounceBack: true,
        isActive: true,
        usageCount: 0,
        endDate: LessThan(now),
      },
    });

    if (expiredVouchers.length > 0) {
      for (const voucher of expiredVouchers) {
        voucher.isActive = false; // Soft Delete
      }
      await this.voucherRepository.save(expiredVouchers);
      this.logger.log(`Successfully soft-deleted ${expiredVouchers.length} expired Bounce-Back vouchers.`);
    } else {
      this.logger.log('No expired Bounce-Back vouchers found tonight.');
    }
  }

  async findAll(): Promise<Voucher[]> {
    return this.voucherRepository.find({
      relations: ['freeMenuItem', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Voucher> {
    const voucher = await this.voucherRepository.findOne({
      where: { id },
      relations: ['freeMenuItem', 'user'],
    });
    if (!voucher) throw new NotFoundException('Voucher not found');
    return voucher;
  }

  async findByCode(code: string): Promise<Voucher> {
    const voucher = await this.voucherRepository.findOne({
      where: { code: code.toUpperCase() },
      relations: ['freeMenuItem', 'user'],
    });
    if (!voucher) throw new NotFoundException('Voucher code not found');
    return voucher;
  }

  async create(data: Partial<Voucher>): Promise<Voucher> {
    // Basic validation
    if (data.type === VoucherType.DISCOUNT_PERCENT && (!data.maxDiscountAmount || data.maxDiscountAmount <= 0)) {
        throw new BadRequestException('Diskon persentase wajib menyertakan batas maksimal potongan (Max Discount Amount).');
    }
    if (data.type === VoucherType.FREE_ITEM && !data.freeMenuItemId) {
        throw new BadRequestException('Voucher Gratis Item wajib memilih item F&B spesifik yang akan digratiskan.');
    }

    if (data.code) {
      data.code = data.code.toUpperCase();
      const existing = await this.voucherRepository.findOne({ where: { code: data.code } });
      if (existing) throw new BadRequestException('Voucher code already exists');
    }
    
    const voucher = this.voucherRepository.create(data);
    return this.voucherRepository.save(voucher);
  }

  async update(id: number, data: Partial<Voucher>): Promise<Voucher> {
    const voucher = await this.findOne(id);

    // Basic validation
    const typeToCheck = data.type || voucher.type;
    const maxDiscountToCheck = data.maxDiscountAmount !== undefined ? data.maxDiscountAmount : voucher.maxDiscountAmount;

    if (typeToCheck === VoucherType.DISCOUNT_PERCENT && (!maxDiscountToCheck || maxDiscountToCheck <= 0)) {
        throw new BadRequestException('Diskon persentase wajib menyertakan batas maksimal potongan (Max Discount Amount).');
    }

    if (data.code) {
      data.code = data.code.toUpperCase();
      if (data.code !== voucher.code) {
        const existing = await this.voucherRepository.findOne({ where: { code: data.code } });
        if (existing) throw new BadRequestException('Voucher code already exists');
      }
    }

    Object.assign(voucher, data);
    return this.voucherRepository.save(voucher);
  }

  async delete(id: number): Promise<void> {
    const voucher = await this.findOne(id);
    await this.voucherRepository.remove(voucher);
  }

  /**
   * Validates a voucher code against business rules.
   * Throws an exception if invalid. Returns the voucher if valid.
   */
  async validateVoucher(
    code: string, 
    currentUserId?: number, 
    transactionSubtotal: number = 0,
    tableStartTime?: Date,
    transactionMemberId?: number
  ): Promise<Voucher> {
    const voucher = await this.findByCode(code);

    const now = new Date();
    
    if (voucher.endDate && new Date(voucher.endDate) < now) {
      const dateStr = new Date(voucher.endDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      throw new BadRequestException(`Mohon maaf, Voucher sudah kedaluwarsa pada ${dateStr}.`);
    }

    if (!voucher.isActive) {
      throw new BadRequestException('Voucher tidak aktif.');
    }

    if (voucher.startDate && new Date(voucher.startDate) > now) {
      throw new BadRequestException('Voucher belum mulai berlaku.');
    }

    // Happy Hour Validation (Valid Days)
    // Gunakan tableStartTime jika ada (waktu meja di-open), jika tidak gunakan waktu sekarang
    const referenceTime = tableStartTime ? new Date(tableStartTime) : now;
    
    if (voucher.validDays && Array.isArray(voucher.validDays) && voucher.validDays.length > 0) {
      // getDay() returns 0 for Sunday, 1 for Monday, etc.
      // Kita konversi ke: 1 (Senin), 2 (Selasa), ..., 7 (Minggu) agar sesuai UI
      let currentDay = referenceTime.getDay();
      if (currentDay === 0) currentDay = 7; 
      
      if (!voucher.validDays.includes(currentDay)) {
        throw new BadRequestException('Voucher tidak berlaku untuk hari ini.');
      }
    }

    // Happy Hour Validation (Valid Hours)
    if (voucher.validStartTime || voucher.validEndTime) {
      const currentHourStr = referenceTime.toTimeString().substring(0, 5); // "HH:MM"
      
      const startStr = voucher.validStartTime ? voucher.validStartTime.substring(0, 5) : "00:00";
      let endStr = voucher.validEndTime ? voucher.validEndTime.substring(0, 5) : "23:59";
      
      if (endStr === '00:00' && startStr !== '00:00') {
         endStr = '24:00';
      }

      const crossesMidnight = startStr > endStr;

      if (crossesMidnight) {
        if (currentHourStr < startStr && currentHourStr > endStr) {
          throw new BadRequestException(`Voucher hanya berlaku antara pukul ${startStr} - ${voucher.validEndTime?.substring(0, 5) || '00:00'}.`);
        }
      } else {
        if (currentHourStr < startStr || currentHourStr > endStr) {
          throw new BadRequestException(`Voucher hanya berlaku antara pukul ${startStr} - ${endStr === '24:00' ? '00:00' : endStr}.`);
        }
      }
    }

    // Targeted Member Validation
    if (voucher.memberId !== null && voucher.memberId !== undefined) {
      if (!transactionMemberId || voucher.memberId !== transactionMemberId) {
        throw new BadRequestException('Voucher ini eksklusif hanya untuk member tertentu.');
      }
    }

    if (voucher.usageLimit !== null && voucher.usageLimit !== undefined && voucher.usageCount >= voucher.usageLimit) {
      throw new BadRequestException('Kuota penggunaan voucher sudah habis.');
    }

    if (Number(voucher.minTransactionAmount) > 0 && transactionSubtotal < Number(voucher.minTransactionAmount)) {
      throw new BadRequestException(`Voucher ini membutuhkan minimal transaksi Rp ${Number(voucher.minTransactionAmount).toLocaleString('id-ID')}.`);
    }

    // Existing: Targeted to employee (userId)
    if (voucher.userId !== null && voucher.userId !== undefined) {
      if (!currentUserId || voucher.userId !== currentUserId) {
        throw new BadRequestException('Voucher ini tidak diperuntukkan bagi user/karyawan Anda.');
      }
    }

    return voucher;
  }

  async incrementUsage(id: number): Promise<void> {
    await this.voucherRepository.increment({ id }, 'usageCount', 1);
  }
}
