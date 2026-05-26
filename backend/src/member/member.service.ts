import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Member } from './entities/member.entity';
import { MemberTier } from './entities/member-tier.entity';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../transaction/entities/transaction.entity';
import { Shift } from '../finance/entities/shift.entity';
import { ShiftService } from '../finance/shift.service';
import { FinanceService } from '../finance/finance.service';
import { CashflowType } from '../finance/entities/cashflow.entity';
import { BilliardGateway } from '../socket/billiard.gateway';
import { QRUtils } from './qr.utils';
import { CardUtils } from './card.utils';
import { SettingsService } from '../settings/settings.service';
import { PointLedger } from '../loyalty/entities/point-ledger.entity';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(MemberTier)
    private readonly tierRepository: Repository<MemberTier>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    private readonly whatsappService: WhatsAppService,
    private readonly shiftService: ShiftService,
    private readonly financeService: FinanceService,
    private readonly billiardGateway: BilliardGateway,
    private readonly dataSource: DataSource,
    private readonly settingsService: SettingsService,
  ) {}

  private toppingUp = new Set<number>(); // mutex memberId

  /**
   * Centralized logic to match a category name against a member tier's discount config.
   * Logic: Exact Match > Bidirectional Prefix Match (Longest Key first) > Keyword Fallback.
   */
  getTierDiscountPercentage(tier: MemberTier, categoryName: string): number {
    if (!tier || !tier.discountConfig) return 0;
    const cfg = tier.discountConfig as any;
    const catUpper = String(categoryName || 'LAINNYA')
      .trim()
      .toUpperCase();

    let percent = 0;
    let found = false;

    // 1. Priority: Exact or Bidirectional Prefix Match
    // We look for the "best" match (prioritizing longer keys for more specificity)
    const entries = Object.entries(cfg).sort(
      (a, b) => b[0].length - a[0].length,
    );

    for (const [k, v] of entries) {
      const keyUpper = k.trim().toUpperCase();
      if (
        keyUpper === catUpper ||
        catUpper.startsWith(keyUpper) ||
        keyUpper.startsWith(catUpper)
      ) {
        percent = Number(v);
        if (!isNaN(percent)) {
          found = true;
          break;
        }
      }
    }

    // 2. Fallback: Common Keywords
    if (!found || percent === 0) {
      // If keyword matches but value is 0 or missing, try falling back to 'other'
      if (catUpper.includes('MAKAN') || catUpper.includes('FOOD')) {
        percent = Number(cfg.food ?? cfg.other ?? 0);
      } else if (
        catUpper.includes('MINUM') ||
        catUpper.includes('DRINK') ||
        catUpper.includes('BEVERAGE')
      ) {
        percent = Number(cfg.drink ?? cfg.other ?? 0);
      } else {
        percent = Number(cfg.other || 0);
      }
    }

    return isNaN(percent) ? 0 : percent;
  }

  // --- Member Tier Methods ---
  async getAllTiers(): Promise<MemberTier[]> {
    return this.tierRepository.find({ order: { name: 'ASC' } });
  }

  async createTier(data: any): Promise<MemberTier> {
    const tier = this.tierRepository.create(data as Partial<MemberTier>);
    return this.tierRepository.save(tier);
  }

  async updateTier(id: number, data: any): Promise<MemberTier> {
    await this.tierRepository.update(id, data);
    const tier = await this.tierRepository.findOne({ where: { id } });
    if (!tier) throw new NotFoundException('Tier not found');
    return tier;
  }

  async deleteTier(id: number): Promise<void> {
    await this.tierRepository.delete(id);
  }

  // --- Member Methods ---
  async getAllMembers(): Promise<Member[]> {
    const members = await this.memberRepository.find({
      relations: ['tier'],
      order: { createdAt: 'DESC' },
    });

    return members.map((m) => ({
      ...m,
      cardUrl: `${this.getApiBaseUrl()}/member-cards/card_${m.memberCode.replace(/[^a-zA-Z0-0]/g, '_')}.png`,
    })) as any;
  }

  async getMemberById(id: number): Promise<Member> {
    const member = await this.memberRepository.findOne({
      where: { id },
      relations: ['tier'],
    });
    if (!member) throw new NotFoundException('Member not found');

    const cardUrl = `${this.getApiBaseUrl()}/member-cards/card_${member.memberCode.replace(/[^a-zA-Z0-0]/g, '_')}.png`;
    return { ...member, cardUrl } as any;
  }

  async ensureCardGenerated(id: number): Promise<string> {
    const member = await this.getMemberById(id);

    // Use current security version to generate token
    const qrToken = QRUtils.generateToken({
      code: member.memberCode,
      v: Number(member.securityVersion || 0),
      t: Date.now(),
    });

    const cardFilename = await this.getOrGenerateCard(member, qrToken);
    return `${this.getApiBaseUrl()}/member-cards/${cardFilename}`;
  }

  async getMemberByRfid(rfidUid: string): Promise<Member> {
    const member = await this.memberRepository.findOne({
      where: { rfidUid, isActive: true },
      relations: ['tier'],
    });
    if (!member)
      throw new NotFoundException('Member card not registered or inactive');

    this.validateMemberAccess(member);

    return member;
  }

  async getMemberByCode(
    tokenOrCode: string,
    securityVersion?: number,
  ): Promise<Member> {
    let memberCode = tokenOrCode;
    let providedVersion =
      securityVersion !== undefined ? Number(securityVersion) : -1;
    let isSignedToken = false;

    // Secure Token Verification (Detect if it's a signed token)
    if (tokenOrCode.includes('.')) {
      isSignedToken = true;
      const decoded = QRUtils.verifyToken(tokenOrCode);
      if (!decoded) {
        throw new ForbiddenException(
          'QR Code tidak valid atau telah dimanipulasi.',
        );
      }
      memberCode = decoded.code;
      providedVersion = decoded.v;

      // Optional: Expiry check based on token timestamp (e.g., tokens valid for 30 days maximum, or just rely on DB version)
      // if (Date.now() - decoded.t > 30 * 24 * 60 * 60 * 1000) { ... }
    }

    const member = await this.memberRepository.findOne({
      where: { memberCode, isActive: true },
      relations: ['tier'],
    });
    if (!member)
      throw new NotFoundException('Member tidak ditemukan atau tidak aktif');

    // Security Version Check (Mandatory match for signed tokens, or if securityVersion is explicitly provided)
    const currentVersion = Number(member.securityVersion || 0);

    console.log(
      `[QR SCAN] Member: ${member.memberCode}, DB Version: ${currentVersion}, Scan Version: ${providedVersion}, Is Signed: ${isSignedToken}`,
    );

    if ((isSignedToken || securityVersion !== undefined) && currentVersion !== providedVersion) {
      throw new ForbiddenException(
        'QR Code sudah tidak berlaku. Silakan gunakan QR Code terbaru dari WhatsApp.',
      );
    }

    // Expiry Check
    if (member.expiryDate) {
      const now = new Date();
      const expiry = new Date(member.expiryDate);
      if (now > expiry) {
        throw new ForbiddenException(
          `Membership ${member.name} sudah kadaluarsa pada ${expiry.toLocaleDateString('id-ID')}. Silakan perpanjang.`,
        );
      }
    }

    this.validateMemberAccess(member);

    return member;
  }

  private validateMemberAccess(member: Member): void {
    const tier = member.tier;
    if (!tier) return;

    // Use local time (automatically follows OS timezone: WIB/WITA/WIT)
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const currentDateStr = `${year}-${month}-${day}`;

    // 1. Specific Date Check (HIGHEST PRIORITY)
    if (tier.activeDates && tier.activeDates.length > 0) {
      const specialDate = tier.activeDates.find(
        (d) => d.date === currentDateStr,
      );
      if (specialDate) {
        const [sH, sM] = (specialDate.startTime || '00:00')
          .split(':')
          .map(Number);
        const [eH, eM] = (specialDate.endTime || '23:59')
          .split(':')
          .map(Number);
        const startMin = sH * 60 + sM;
        const endMin = eH * 60 + eM;
        const isInsideHours =
          startMin <= endMin
            ? currentMinutes >= startMin && currentMinutes <= endMin
            : currentMinutes >= startMin || currentMinutes <= endMin;

        if (!isInsideHours) {
          throw new ForbiddenException(
            `Khusus hari ini (${currentDateStr}), kategori ${tier.name} hanya aktif pada jam ${specialDate.startTime} - ${specialDate.endTime}.`,
          );
        }
        return; // Access granted by special date
      } else if (
        tier.activeDates.some((d) => d.date !== currentDateStr) &&
        tier.activeDays?.length === 0 &&
        !tier.activeStartTime
      ) {
        // Optimization: if ONLY special dates are defined and today isn't one of them, block access
        // But typically global hours exist as fallback.
      }
    }

    // 2. Global Schedule Check (FALLBACK)

    // 2a. Day-of-week Check
    if (tier.activeDays && tier.activeDays.length > 0) {
      const currentDay = now.getDay(); // 0-6
      if (!tier.activeDays.includes(currentDay)) {
        const dayNames = [
          'Minggu',
          'Senin',
          'Selasa',
          'Rabu',
          'Kamis',
          'Jumat',
          'Sabtu',
        ];
        const allowedDays = tier.activeDays.map((d) => dayNames[d]).join(', ');
        throw new ForbiddenException(
          `Kategori ${tier.name} hanya aktif pada hari: ${allowedDays}.`,
        );
      }
    }

    // 2b. Hourly Check
    const [startH, startM] = (tier.activeStartTime || '00:00')
      .split(':')
      .map(Number);
    const [endH, endM] = (tier.activeEndTime || '23:59').split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const isInsideHours =
      startMinutes <= endMinutes
        ? currentMinutes >= startMinutes && currentMinutes <= endMinutes
        : currentMinutes >= startMinutes || currentMinutes <= endMinutes;

    if (!isInsideHours) {
      throw new ForbiddenException(
        `Kategori ${tier.name} hanya aktif pada jam ${tier.activeStartTime} - ${tier.activeEndTime}.`,
      );
    }
  }

  private async generateMemberCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.memberRepository.count();
    const nextNum = (count + 1).toString().padStart(4, '0');
    return `VOC-${year}-${nextNum}`;
  }

  private generateReferralCode(memberCode: string): string {
    // Simple referral code based on member code or random string
    return (
      memberCode.split('-').pop() ||
      Math.random().toString(36).substring(7).toUpperCase()
    );
  }

  async createMember(data: any): Promise<any> {
    if (data.rfidUid) {
      const existing = await this.memberRepository.findOne({
        where: { rfidUid: data.rfidUid },
      });
      if (existing) throw new ConflictException('RFID Card already registered');
    }

    // Standardize Phone to 62xxx
    if (data.phone) {
      data.phone = data.phone.startsWith('0')
        ? '62' + data.phone.substring(1)
        : data.phone;
      if (!data.phone.startsWith('62')) data.phone = '62' + data.phone;
    }

    // Generate Member Code
    data.memberCode = await this.generateMemberCode();
    data.referralCode = this.generateReferralCode(data.memberCode);

    // Handle Referral
    let referrer: Member | null = null;
    if (data.referredByCode) {
      referrer = await this.memberRepository.findOne({
        where: { referralCode: data.referredByCode },
        relations: ['tier'],
      });
      if (referrer) {
        data.referredById = referrer.id;
      }
    }

    // Cleanup non-entity fields
    delete data.expiryTemplate;
    delete data.tier;
    delete data.referredByCode;

    const member = this.memberRepository.create(data as Partial<Member>);
    const savedMember = await this.memberRepository.save(member);

    // Award Referrer Points (if applicable)
    if (referrer && referrer.tier?.referralBonusPoints) {
      await this.awardPoints(
        referrer.id,
        referrer.tier.referralBonusPoints,
        this.memberRepository.manager,
      );

      // Log to PointLedger
      await this.memberRepository.manager.save(PointLedger, {
        memberId: referrer.id,
        type: 'REFERRAL',
        amount: referrer.tier.referralBonusPoints,
        description: `Bonus Refferal: ${savedMember.name} (${savedMember.memberCode})`,
        referenceId: `REF-${savedMember.id}`,
      });
    }

    // Generate Token for return and WA
    const qrToken = QRUtils.generateToken({
      code: savedMember.memberCode,
      v: Number(savedMember.securityVersion || 0),
      t: Date.now(),
    });

    // Generate Card URL
    const cardFilename = await this.getOrGenerateCard(savedMember, qrToken);
    const cardUrl = `${this.getApiBaseUrl()}/member-cards/${cardFilename}`;

    // Send WA Card (NON-BLOCKING)
    this.sendWelcomeCard(savedMember.id).catch(e => console.error(`Welcome Card WA Failed: ${e.message}`));

    this.billiardGateway.broadcastMemberUpdate(savedMember);

    return { ...savedMember, qrToken, cardUrl };
  }

  async updateMember(id: number, data: any): Promise<Member> {
    // Standardize Phone to 62xxx
    if (data.phone) {
      data.phone = data.phone.startsWith('0')
        ? '62' + data.phone.substring(1)
        : data.phone;
      if (!data.phone.startsWith('62')) data.phone = '62' + data.phone;
    }

    // Cleanup non-entity fields
    delete data.expiryTemplate;
    delete data.tier;
    delete data.cardUrl;
    delete data.qrToken;

    await this.memberRepository.update(id, data);
    const updatedMember = await this.getMemberById(id);
    this.billiardGateway.broadcastMemberUpdate(updatedMember);
    return updatedMember;
  }

  async deleteMember(id: number): Promise<void> {
    await this.memberRepository.delete(id);
    this.billiardGateway.broadcastMemberUpdate({ id, deleted: true });
  }

  async regenerateQrCode(id: number): Promise<any> {
    const member = await this.getMemberById(id);
    member.securityVersion += 1;
    const saved = await this.memberRepository.save(member);

    const qrToken = QRUtils.generateToken({
      code: saved.memberCode,
      v: Number(saved.securityVersion || 0),
      t: Date.now(),
    });

    const cardFilename = await this.getOrGenerateCard(saved, qrToken);
    const cardUrl = `${this.getApiBaseUrl()}/member-cards/${cardFilename}`;

    // Send WA Card (NON-BLOCKING)
    this.sendWelcomeCard(saved.id).catch(e => console.error(`Regenerate QR WA Failed: ${e.message}`));
    this.billiardGateway.broadcastMemberUpdate(saved);
    return { ...saved, qrToken, cardUrl };
  }

  private getApiBaseUrl(): string {
    return this.whatsappService.getAppUrl && this.whatsappService.getAppUrl()
      ? this.whatsappService.getAppUrl()
      : 'http://localhost:4000';
  }

  private async getOrGenerateCard(
    member: Member,
    qrToken: string,
  ): Promise<string> {
    const tierName = member.tier?.name || 'REGULER';
    const expiryStr = member.expiryDate
      ? new Date(member.expiryDate).toLocaleDateString('id-ID')
      : 'Selamanya';
    const joinStr = new Date(member.createdAt).toLocaleDateString('id-ID');

    return await CardUtils.generateMemberCard({
      name: member.name,
      tierName,
      memberCode: member.memberCode,
      joinDate: joinStr,
      expiryDate: expiryStr,
      qrToken,
    });
  }

  async sendWelcomeCard(id: number): Promise<void> {
    const member = await this.getMemberById(id);
    try {
      // 1. Generate a cryptographically signed token for the QR
      const qrToken = QRUtils.generateToken({
        code: member.memberCode,
        v: Number(member.securityVersion || 0),
        t: Date.now(),
      });

      const cardFilename = await this.getOrGenerateCard(member, qrToken);
      const finalImageUrl = `${this.getApiBaseUrl()}/member-cards/${cardFilename}`;

      // 3. Send the Image
      await this.whatsappService.sendImage(
        member.phone,
        `Kartu Digital Member Anda - ${member.name}`,
        finalImageUrl,
      );

      // 4. Send Text Notification with Details
      const settings = await this.settingsService.getSettings();
      const tierName = member.tier?.name || 'REGULER';
      const expiryStr = member.expiryDate
        ? new Date(member.expiryDate).toLocaleDateString('id-ID')
        : 'Selamanya';

      let welcomeMsg = settings.waTemplateWelcome;
      if (!welcomeMsg) {
        welcomeMsg = `Halo {{name}}, ini adalah kartu digital member billiard Anda! \n\nID Member: {{code}}\nKategori: {{category}}\nMasa Berlaku: {{expiry}}\n\nSilakan tunjukkan QR di atas saat bertransaksi untuk otomatisasi pembayaran dan keamanan transaksi Anda.`;
      }

      const finalMsg = welcomeMsg
        .replace(/{{name}}/g, member.name)
        .replace(/{{code}}/g, member.memberCode)
        .replace(/{{category}}/g, tierName)
        .replace(/{{expiry}}/g, expiryStr);

      await this.whatsappService.sendMessage(member.phone, finalMsg);
    } catch (err) {
      console.error('Failed to send QR to Member:', err);
    }
  }

  async topUp(
    id: number,
    amount: number,
    userId?: number,
    paymentMethod: string = 'CASH',
  ): Promise<any> {
    const memberId = Number(id);
    if (this.toppingUp.has(memberId)) {
      throw new ConflictException(
        'Proses top-up sedang berjalan untuk member ini.',
      );
    }
    this.toppingUp.add(memberId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const member = await queryRunner.manager.findOne(Member, {
        where: { id: memberId },
        relations: ['tier'],
      });
      if (!member) throw new NotFoundException('Member tidak ditemukan');

      // --- Validation ---
      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0)
        throw new BadRequestException('Nominal harus > 0');
      if (numAmount > 10_000_000)
        throw new BadRequestException('Maksimal Rp 10jt');
      if (!member.isActive) throw new BadRequestException('Member tidak aktif');

      const methodUpper = (paymentMethod || 'CASH').toUpperCase().trim();

      // 1. Update Balance
      let bonusAmount = 0;
      if (
        member.tier?.bonusTopupConfig &&
        numAmount >= member.tier.bonusTopupConfig.minAmount
      ) {
        bonusAmount = Math.floor(
          numAmount * (member.tier.bonusTopupConfig.bonusPercent / 100),
        );
      }

      member.balance = Number(member.balance || 0) + numAmount + bonusAmount;
      const savedMember = await queryRunner.manager.save(member);

      // 2. Record Transaction
      const now = new Date();
      const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '');
      const hhmmss = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const invoiceNumber = `MEM-${yymmdd}${hhmmss}`;

      const transaction = queryRunner.manager.create(Transaction, {
        invoiceNumber,
        memberId: member.id,
        customerName: member.name,
        status: TransactionStatus.PAID,
        type: TransactionType.TOPUP,
        grandTotal: numAmount,
        paidAmount: numAmount,
        paymentDetails: [
          { method: methodUpper, amount: numAmount, timestamp: now },
        ],
        createdByUserId: userId,
        startTime: now,
      });

      if (userId) {
        const activeShift = await this.shiftService.getActiveShift(userId);
        if (activeShift) {
          transaction.shiftId = activeShift.id;
          transaction.businessDayId = activeShift.businessDayId;
        }
      }

      const savedTx = await queryRunner.manager.save(transaction);

      // 2.1 Record Bonus to PointLedger (if any)
      if (bonusAmount > 0) {
        await queryRunner.manager.save(PointLedger, {
          memberId: member.id,
          type: 'TOPUP_BONUS',
          amount: bonusAmount,
          description: `Bonus Top-up ${member.tier?.bonusTopupConfig?.label || 'Tier'}: Rp ${bonusAmount.toLocaleString('id-ID')}`,
          referenceId: invoiceNumber,
        });
      }

      // 3. Log Cashflow (Atomic using FinanceService for correct balanceAfter)
      await this.financeService.logCashflow(
        {
          amount: numAmount,
          type: CashflowType.IN,
          source: 'sale:topup',
          referenceId: invoiceNumber,
          description: `Top-up [${methodUpper}] - ${member.name} (${member.memberCode}) → Rp ${numAmount.toLocaleString('id-ID')}${bonusAmount > 0 ? ` (+ Bonus Rp ${bonusAmount.toLocaleString('id-ID')})` : ''}`,
          businessDayId: savedTx.businessDayId ?? undefined,
          shiftId: savedTx.shiftId ?? undefined,
          paymentMethod: methodUpper,
        },
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
      this.toppingUp.delete(memberId);

      // 4. Notifications (Outside Transaction - NON-BLOCKING)
      this.whatsappService.sendMessage(
        savedMember.phone,
        `✅ Top-up Berhasil!\n\nNama: ${savedMember.name}\nJumlah: Rp ${numAmount.toLocaleString('id-ID')}${bonusAmount > 0 ? `\nBonus: Rp ${bonusAmount.toLocaleString('id-ID')}` : ''}\nMetode: ${methodUpper}\nSaldo Sekarang: Rp ${Number(savedMember.balance).toLocaleString('id-ID')}`,
      ).catch(waErr => console.error(`Topup WA Failed: ${waErr.message}`));

      this.billiardGateway.broadcastMemberBalance(
        savedMember.id,
        Number(savedMember.balance),
      );

      return { member: savedMember, transaction: savedTx };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
      this.toppingUp.delete(memberId);
    }
  }

  async getMemberActivityLogs(memberId: number) {
    // Fetch transactions for this member
    const transactions = await this.transactionRepository.find({
      where: { memberId },
      relations: ['table', 'cafeTable', 'orderItems', 'orderItems.menuItem'],
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return transactions;
  }

  async deductBalance(
    id: number,
    amount: number,
    manager?: any,
  ): Promise<Member> {
    const queryManager = manager || this.memberRepository.manager;
    const member = await queryManager.findOne(Member, { where: { id } });
    if (!member) throw new NotFoundException('Member not found');

    const currentBalance = Number(member.balance);
    const deductAmount = Number(amount);

    if (currentBalance < deductAmount) {
      throw new HttpException(
        'Saldo tidak cukup untuk menyelesaikan transaksi.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    member.balance = currentBalance - deductAmount;
    const savedMember = await queryManager.save(member);

    // Broadcast real-time balance update
    this.billiardGateway.broadcastMemberBalance(
      savedMember.id,
      Number(savedMember.balance),
    );

    return savedMember;
  }

  async addBalance(
    id: number,
    amount: number,
    manager?: any,
  ): Promise<Member> {
    const queryManager = manager || this.memberRepository.manager;
    const member = await queryManager.findOne(Member, { where: { id } });
    if (!member) throw new NotFoundException('Member not found');

    const addAmount = Number(amount);
    if (addAmount > 0) {
      member.balance = Number(member.balance || 0) + addAmount;
      const savedMember = await queryManager.save(member);

      // Broadcast real-time balance update
      this.billiardGateway.broadcastMemberBalance(
        savedMember.id,
        Number(savedMember.balance),
      );
      return savedMember;
    }
    return member;
  }

  async awardPoints(
    id: number,
    amount: number,
    manager?: any,
  ): Promise<Member> {
    const queryManager = manager || this.memberRepository.manager;
    const member = await queryManager.findOne(Member, { where: { id } });
    if (!member) throw new NotFoundException('Member not found');

    member.points = Number(member.points || 0) + Math.round(amount);
    const savedMember = await queryManager.save(Member, member);

    // Broadcast real-time point update
    this.billiardGateway.broadcastMemberUpdate(savedMember);

    return savedMember;
  }

  /**
   * Add to member's cumulative totalSpend, then check for auto tier-upgrade.
   */
  async updateTotalSpend(
    id: number,
    amount: number,
    manager?: any,
  ): Promise<void> {
    const queryManager = manager || this.memberRepository.manager;
    try {
      const member = await queryManager.findOne(Member, {
        where: { id },
        relations: ['tier'],
      });
      if (!member) return;

      member.totalSpend = Number(member.totalSpend || 0) + Number(amount);
      await queryManager.save(Member, member);

      // Check if they qualify for a tier upgrade
      await this.checkAndAutoUpgradeTier(member, queryManager);
    } catch (err) {
      console.error('[Royalty] updateTotalSpend failed:', err.message);
    }
  }

  /**
   * Automatically upgrade a member's tier based on their totalSpend.
   * Finds the highest-qualifying tier (by autoUpgradeSpend) above current tier.
   */
  async checkAndAutoUpgradeTier(member: Member, manager?: any): Promise<void> {
    const queryManager = manager || this.memberRepository.manager;
    try {
      const allTiers = await queryManager.find(MemberTier, {
        where: { isActive: true },
        order: { autoUpgradeSpend: 'DESC' } as any,
      });

      const currentSpend = Number(member.totalSpend || 0);

      // Find the highest tier the member qualifies for
      const qualifyingTier = allTiers.find(
        (t: MemberTier) =>
          t.autoUpgradeSpend !== null &&
          currentSpend >= Number(t.autoUpgradeSpend),
      );

      if (!qualifyingTier) return;

      // Only upgrade (never downgrade via this flow)
      const currentTierSpend = member.tier?.autoUpgradeSpend
        ? Number(member.tier.autoUpgradeSpend)
        : -1;

      if (
        qualifyingTier.id !== member.tierId &&
        Number(qualifyingTier.autoUpgradeSpend) > currentTierSpend
      ) {
        const oldTier = member.tier?.name || 'None';
        member.tierId = qualifyingTier.id;
        await queryManager.save(Member, member);

        console.log(
          `[Royalty] 🎉 Auto-upgraded "${member.name}" from ${oldTier} → ${qualifyingTier.name} (totalSpend: Rp ${currentSpend.toLocaleString('id-ID')})`,
        );

        // Notify via WhatsApp
        try {
          await this.whatsappService.sendMessage(
            member.phone,
            `🎉 Selamat ${member.name}!\n\nAnda telah naik ke tier *${qualifyingTier.name}*!\n\nTotal belanja Anda: Rp ${currentSpend.toLocaleString('id-ID')}\n\nNikmati keuntungan tier baru Anda. Terima kasih!`,
          );
        } catch {
          /* silent */
        }

        // Broadcast real-time member update (use manager find if available)
        const updatedMember = await queryManager.findOne(Member, {
          where: { id: member.id },
          relations: ['tier'],
        });
        if (updatedMember) {
          this.billiardGateway.broadcastMemberUpdate(updatedMember);
        }
      }
    } catch (err) {
      console.error('[Royalty] checkAndAutoUpgradeTier failed:', err.message);
    }
  }

  async sendSessionCompletionNotification(
    memberId: number,
    data: {
      tableName: string;
      duration: string;
      billiardTotal: number;
      cafeTotal: number;
      grandTotal: number;
      orderItems?: any[];
      awardedPoints?: number;
    },
  ) {
    const member = await this.getMemberById(memberId);
    try {
      const settings = await this.settingsService.getSettings();
      let template = settings.waTemplateSessionEnd;

      if (!template) {
        template = `Sesi Billiard Selesai!

Meja: {{table}}
Durasi: {{duration}}

Detail Biaya:
- Billiard: Rp {{billiard_total}}
- Cafe: Rp {{cafe_total}}
--------------------------
Grand Total: Rp {{grand_total}}

Sisa Saldo Anda: Rp {{balance}}

Terima kasih telah bermain di VOC Billiard!`;
      }

      // Format Order Items detail
      let orderDetailsStr = '';
      if (data.orderItems && data.orderItems.length > 0) {
        orderDetailsStr = '\n\n📦 *Detail Pesanan:*';
        data.orderItems.forEach((item) => {
          if (item.status !== 'CANCELLED') {
            const itemName = item.menuItem?.name || item.customName || 'Item';
            orderDetailsStr += `\n- ${itemName} x ${item.quantity}`;
          }
        });
      }

      const formatCurrency = (amount: number) => {
        return `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;
      };

      const finalMsg = template
        .replace(/{{name}}/g, member.name)
        .replace(/{{table}}/g, data.tableName)
        .replace(/{{duration}}/g, data.duration)
        .replace(/{{billiard_total}}/g, formatCurrency(data.billiardTotal))
        .replace(/{{cafe_total}}/g, formatCurrency(data.cafeTotal))
        .replace(/{{grand_total}}/g, formatCurrency(data.grandTotal))
        .replace(/{{balance}}/g, formatCurrency(Number(member.balance)))
        .replace(
          /{{points_earned}}/g,
          (data.awardedPoints || 0).toLocaleString('id-ID'),
        )
        .replace(/{{order_details}}/g, orderDetailsStr);

      await this.whatsappService.sendMessage(member.phone, finalMsg);
    } catch (err) {
      console.error('Failed to send session completion notification:', err);
    }
  }

  async broadcastToAll(message: string): Promise<any> {
    const members = await this.memberRepository.find({
      where: { isActive: true },
      select: ['phone'],
    });

    const targets = members.map((m) => m.phone).filter((p) => !!p);

    if (targets.length === 0) {
      return { message: 'No active members with phone numbers found.' };
    }

    return this.whatsappService.broadcastMessage(targets, message);
  }
}
