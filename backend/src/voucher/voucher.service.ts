import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, LessThan, DataSource } from 'typeorm';
import { Voucher, VoucherType } from './entities/voucher.entity';

@Injectable()
export class VoucherService implements OnModuleInit {
  private readonly logger = new Logger(VoucherService.name);

  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    // Run cleanup on startup to clear out backlog immediately
    await this.handleExpiredBounceBackVouchers();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredBounceBackVouchers() {
    this.logger.log('Running nightly cleanup for expired Bounce-Back vouchers...');
    const now = new Date();
    // HARD DELETE unused, expired Bounce-Back vouchers to save storage and UI performance
    const expiredVouchers = await this.voucherRepository.find({
      where: {
        isBounceBack: true,
        usageCount: 0,
        endDate: LessThan(now),
      },
    });

    if (expiredVouchers.length > 0) {
      // Physical delete from DB
      await this.voucherRepository.remove(expiredVouchers);
      this.logger.log(`Successfully HARD-DELETED ${expiredVouchers.length} expired & unused Bounce-Back vouchers.`);
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
    if (!voucher) throw new NotFoundException('Mohon maaf, Kode Voucher tidak ditemukan atau sudah hangus (dihapus oleh sistem).');
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
    if (data.type === VoucherType.DISCOUNT_FIXED && (!data.discountValue || Number(data.discountValue) <= 0)) {
        throw new BadRequestException('Diskon nominal wajib menyertakan nilai potongan (Discount Amount).');
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
    transactionMemberId?: number,
    usageContext?: 'SESSION_START' | 'PAYMENT'
  ): Promise<Voucher> {
    const voucher = await this.findByCode(code);

    if (usageContext) {
      const sessionStartTypes = [
        VoucherType.FREE_BILLIARD_MINUTES,
        VoucherType.FREE_ITEM,
        VoucherType.BUNDLE_DEAL,
        VoucherType.BUY_X_GET_Y_BILLIARD
      ];
      
      const paymentTypes = [
        VoucherType.DISCOUNT_PERCENT,
        VoucherType.DISCOUNT_FIXED,
        VoucherType.SPECIAL_PRICE,
        VoucherType.CASHBACK_BALANCE
      ];

      if (usageContext === 'SESSION_START' && !sessionStartTypes.includes(voucher.type)) {
        throw new BadRequestException('Voucher ini hanya dapat digunakan saat melakukan pembayaran di Terminal Kasir.');
      }

      if (usageContext === 'PAYMENT' && !paymentTypes.includes(voucher.type)) {
        throw new BadRequestException('Voucher ini harus diklaim sebelum permainan (pada menu Sesi Baru) dimulai.');
      }
    }

    const now = new Date();
    
    if (voucher.endDate) {
      // Normalize endDate to END of day (23:59:59.999) so a voucher set to expire
      // on "29 Mei" is still valid throughout that entire day, not just until midnight.
      const endOfDay = new Date(voucher.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (endOfDay < now) {
        const dateStr = new Date(voucher.endDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        throw new BadRequestException(`Mohon maaf, Voucher sudah kedaluwarsa pada ${dateStr}.`);
      }
    }

    if (!voucher.isActive) {
      throw new BadRequestException('Voucher tidak aktif.');
    }

    if (voucher.startDate && new Date(voucher.startDate) > now) {
      const dateStr = new Date(voucher.startDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      throw new BadRequestException(`Voucher baru akan berlaku mulai ${dateStr}.`);
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
        const dayNames = ['-', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
        const allowed = voucher.validDays.map(d => dayNames[d]).join(', ');
        throw new BadRequestException(`Voucher tidak berlaku hari ini. Hanya dapat digunakan pada hari: ${allowed}.`);
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
      if (usageContext !== 'SESSION_START') {
        throw new BadRequestException(`Voucher ini membutuhkan minimal transaksi Rp ${Number(voucher.minTransactionAmount).toLocaleString('id-ID')}.`);
      }
    }

    // Existing: Targeted to employee (userId)
    if (voucher.userId !== null && voucher.userId !== undefined) {
      if (!currentUserId || voucher.userId !== currentUserId) {
        throw new BadRequestException('Voucher ini tidak diperuntukkan bagi user/karyawan Anda.');
      }
    }

    return voucher;
  }

  /**
   * Menghitung efek voucher terhadap tagihan.
   * Dipanggil oleh billing engine (TransactionService / BilliardService) saat kalkulasi final.
   *
   * @returns objek efek voucher:
   *   - discountAmount: jumlah Rp yang dipotong dari subtotal
   *   - overrideGrandTotal: jika tidak null, gunakan nilai ini sebagai grandTotal (SPECIAL_PRICE)
   *   - freeBilliardMinutes: menit gratis yang sudah diberikan (untuk info invoice)
   *   - freeItemId / freeItemName: item yang sudah di-add (untuk info invoice)
   *   - cashbackAmount: saldo cashback yang akan dikreditkan ke member
   */
  calculateVoucherEffect(
    voucher: Voucher,
    subtotal: number,
  ): {
    discountAmount: number;
    overrideGrandTotal: number | null;
    freeBilliardMinutes: number;
    freeItemId: number | null;
    freeItemName: string | null;
    cashbackAmount: number;
  } {
    const result = {
      discountAmount: 0,
      overrideGrandTotal: null as number | null,
      freeBilliardMinutes: 0,
      freeItemId: null as number | null,
      freeItemName: null as string | null,
      cashbackAmount: 0,
    };

    const value = Number(voucher.discountValue) || 0;

    switch (voucher.type) {
      case VoucherType.DISCOUNT_PERCENT: {
        const maxDisc = Number(voucher.maxDiscountAmount) || Infinity;
        result.discountAmount = Math.min((subtotal * value) / 100, maxDisc);
        break;
      }

      case VoucherType.DISCOUNT_FIXED: {
        result.discountAmount = Math.min(value, subtotal);
        break;
      }

      case VoucherType.SPECIAL_PRICE: {
        // Override grandTotal ke harga flat; discountAmount = selisihnya untuk laporan
        const flatPrice = Math.max(value, 0);
        result.overrideGrandTotal = flatPrice;
        result.discountAmount = Math.max(subtotal - flatPrice, 0);
        break;
      }

      case VoucherType.FREE_BILLIARD_MINUTES: {
        // Menit gratis sudah diterapkan saat session START (durasi tambahan)
        // Di sini hanya catat untuk tampilan invoice
        const unit: string = voucher.ruleJson?.unit || 'minutes';
        result.freeBilliardMinutes = unit === 'hours' ? value * 60 : value;
        break;
      }

      case VoucherType.FREE_ITEM: {
        // Item sudah di-add saat session START dengan harga Rp 0
        result.freeItemId = voucher.freeMenuItemId;
        result.freeItemName = (voucher as any).freeMenuItem?.name || null;
        break;
      }

      case VoucherType.CASHBACK_BALANCE: {
        // Cashback tidak mengurangi tagihan, dikreditkan ke saldo member setelah bayar
        result.cashbackAmount = value;
        break;
      }

      default:
        break;
    }

    return result;
  }

  async incrementUsage(id: number): Promise<void> {
    await this.voucherRepository.increment({ id }, 'usageCount', 1);
  }

  /**
   * Atomic check-and-increment: ensures voucher quota cannot be exceeded
   * even under concurrent load (race condition protection).
   * Returns false if quota already exceeded (should not be used).
   */
  async atomicIncrementUsage(id: number): Promise<boolean> {
    // Use a raw UPDATE with WHERE clause to atomically check & increment in a single DB round-trip.
    // This prevents two simultaneous transactions from both passing the usageCount check.
    const result = await this.dataSource.query(
      `UPDATE vouchers
       SET "usageCount" = "usageCount" + 1
       WHERE id = $1
         AND ("usageLimit" IS NULL OR "usageCount" < "usageLimit")`,
      [id],
    );
    // PostgreSQL returns affected row count in result[1]
    const affectedRows = result[1];
    return affectedRows > 0;
  }

  /**
   * Rollback usage count securely, ensuring it doesn't drop below 0.
   */
  async atomicDecrementUsage(id: number): Promise<boolean> {
    const result = await this.dataSource.query(
      `UPDATE vouchers
       SET "usageCount" = GREATEST("usageCount" - 1, 0)
       WHERE id = $1`,
      [id],
    );
    const affectedRows = result[1];
    return affectedRows > 0;
  }
}
