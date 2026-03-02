import { Injectable, NotFoundException, ConflictException, ForbiddenException, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from './entities/member.entity';
import { MemberTier } from './entities/member-tier.entity';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { Transaction, TransactionStatus, TransactionType } from '../transaction/entities/transaction.entity';
import { Shift } from '../finance/entities/shift.entity';
import { ShiftService } from '../finance/shift.service';
import { FinanceService } from '../finance/finance.service';
import { CashflowType } from '../finance/entities/cashflow.entity';
import { BilliardGateway } from '../socket/billiard.gateway';
import { QRUtils } from './qr.utils';
import { CardUtils } from './card.utils';

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
    ) { }

    /**
     * Centralized logic to match a category name against a member tier's discount config.
     * Logic: Exact Match > Bidirectional Prefix Match (Longest Key first) > Keyword Fallback.
     */
    getTierDiscountPercentage(tier: MemberTier, categoryName: string): number {
        if (!tier || !tier.discountConfig) return 0;
        const cfg = tier.discountConfig as any;
        const catUpper = String(categoryName || 'LAINNYA').trim().toUpperCase();

        let percent = 0;
        let found = false;

        // 1. Priority: Exact or Bidirectional Prefix Match
        // We look for the "best" match (prioritizing longer keys for more specificity)
        const entries = Object.entries(cfg).sort((a, b) => b[0].length - a[0].length);

        for (const [k, v] of entries) {
            const keyUpper = k.trim().toUpperCase();
            if (keyUpper === catUpper || catUpper.startsWith(keyUpper) || keyUpper.startsWith(catUpper)) {
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
            } else if (catUpper.includes('MINUM') || catUpper.includes('DRINK') || catUpper.includes('BEVERAGE')) {
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
            order: { createdAt: 'DESC' }
        });

        return members.map(m => ({
            ...m,
            cardUrl: `${this.getApiBaseUrl()}/member-cards/card_${m.memberCode.replace(/[^a-zA-Z0-0]/g, '_')}.png`
        })) as any;
    }

    async getMemberById(id: number): Promise<Member> {
        const member = await this.memberRepository.findOne({
            where: { id },
            relations: ['tier']
        });
        if (!member) throw new NotFoundException('Member not found');

        const cardUrl = `${this.getApiBaseUrl()}/member-cards/card_${member.memberCode.replace(/[^a-zA-Z0-0]/g, '_')}.png`;
        return { ...member, cardUrl } as any;
    }

    async ensureCardGenerated(id: number): Promise<string> {
        const member = await this.getMemberById(id);

        // Use current security version to generate token
        const qrToken = QRUtils.generateToken({
            code: member.memberCode as string,
            v: Number(member.securityVersion || 0),
            t: Date.now()
        });

        const cardFilename = await this.getOrGenerateCard(member, qrToken);
        return `${this.getApiBaseUrl()}/member-cards/${cardFilename}`;
    }

    async getMemberByRfid(rfidUid: string): Promise<Member> {
        const member = await this.memberRepository.findOne({
            where: { rfidUid, isActive: true },
            relations: ['tier']
        });
        if (!member) throw new NotFoundException('Member card not registered or inactive');

        this.validateMemberAccess(member);

        return member;
    }

    async getMemberByCode(tokenOrCode: string, securityVersion?: number): Promise<Member> {
        let memberCode = tokenOrCode;
        let providedVersion = securityVersion !== undefined ? Number(securityVersion) : -1;

        // Secure Token Verification (Detect if it's a signed token)
        if (tokenOrCode.includes('.')) {
            const decoded = QRUtils.verifyToken(tokenOrCode);
            if (!decoded) {
                throw new ForbiddenException('QR Code tidak valid atau telah dimanipulasi.');
            }
            memberCode = decoded.code;
            providedVersion = decoded.v;

            // Optional: Expiry check based on token timestamp (e.g., tokens valid for 30 days maximum, or just rely on DB version)
            // if (Date.now() - decoded.t > 30 * 24 * 60 * 60 * 1000) { ... }
        }

        const member = await this.memberRepository.findOne({
            where: { memberCode, isActive: true },
            relations: ['tier']
        });
        if (!member) throw new NotFoundException('Member tidak ditemukan atau tidak aktif');

        // Security Version Check (Mandatory match)
        const currentVersion = Number(member.securityVersion || 0);

        console.log(`[QR SCAN] Member: ${member.memberCode}, DB Version: ${currentVersion}, Scan Version: ${providedVersion}`);

        if (currentVersion !== providedVersion) {
            throw new ForbiddenException('QR Code sudah tidak berlaku. Silakan gunakan QR Code terbaru dari WhatsApp.');
        }

        // Expiry Check
        if (member.expiryDate) {
            const now = new Date();
            const expiry = new Date(member.expiryDate);
            if (now > expiry) {
                throw new ForbiddenException(`Membership ${member.name} sudah kadaluarsa pada ${expiry.toLocaleDateString('id-ID')}. Silakan perpanjang.`);
            }
        }

        this.validateMemberAccess(member);

        return member;
    }

    private validateMemberAccess(member: Member): void {
        const tier = member.tier;
        if (!tier) return;

        // WIB Time Check (GMT+7)
        const now = new Date();
        const currentWIB = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        const currentMinutes = currentWIB.getHours() * 60 + currentWIB.getMinutes();
        const currentDateStr = currentWIB.toISOString().split('T')[0];

        // 1. Specific Date Check (HIGHEST PRIORITY)
        if (tier.activeDates && tier.activeDates.length > 0) {
            const specialDate = tier.activeDates.find(d => d.date === currentDateStr);
            if (specialDate) {
                const [sH, sM] = (specialDate.startTime || '00:00').split(':').map(Number);
                const [eH, eM] = (specialDate.endTime || '23:59').split(':').map(Number);
                const startMin = sH * 60 + sM;
                const endMin = eH * 60 + eM;
                const isInsideHours = startMin <= endMin
                    ? (currentMinutes >= startMin && currentMinutes <= endMin)
                    : (currentMinutes >= startMin || currentMinutes <= endMin);

                if (!isInsideHours) {
                    throw new ForbiddenException(`Khusus hari ini (${currentDateStr}), kategori ${tier.name} hanya aktif pada jam ${specialDate.startTime} - ${specialDate.endTime}.`);
                }
                return; // Access granted by special date
            } else if (tier.activeDates.some(d => d.date !== currentDateStr) && tier.activeDays?.length === 0 && !tier.activeStartTime) {
                // Optimization: if ONLY special dates are defined and today isn't one of them, block access
                // But typically global hours exist as fallback.
            }
        }

        // 2. Global Schedule Check (FALLBACK)

        // 2a. Day-of-week Check
        if (tier.activeDays && tier.activeDays.length > 0) {
            const currentDay = currentWIB.getDay(); // 0-6
            if (!tier.activeDays.includes(currentDay)) {
                const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                const allowedDays = tier.activeDays.map(d => dayNames[d]).join(', ');
                throw new ForbiddenException(`Kategori ${tier.name} hanya aktif pada hari: ${allowedDays}.`);
            }
        }

        // 2b. Hourly Check
        const [startH, startM] = (tier.activeStartTime || '00:00').split(':').map(Number);
        const [endH, endM] = (tier.activeEndTime || '23:59').split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        const isInsideHours = startMinutes <= endMinutes
            ? (currentMinutes >= startMinutes && currentMinutes <= endMinutes)
            : (currentMinutes >= startMinutes || currentMinutes <= endMinutes);

        if (!isInsideHours) {
            throw new ForbiddenException(`Kategori ${tier.name} hanya aktif pada jam ${tier.activeStartTime} - ${tier.activeEndTime}.`);
        }
    }

    private async generateMemberCode(): Promise<string> {
        const year = new Date().getFullYear();
        const count = await this.memberRepository.count();
        const nextNum = (count + 1).toString().padStart(4, '0');
        return `VOC-${year}-${nextNum}`;
    }

    async createMember(data: any): Promise<any> {
        if (data.rfidUid) {
            const existing = await this.memberRepository.findOne({ where: { rfidUid: data.rfidUid } });
            if (existing) throw new ConflictException('RFID Card already registered');
        }

        // Standardize Phone to 62xxx
        if (data.phone) {
            data.phone = data.phone.startsWith('0') ? '62' + data.phone.substring(1) : data.phone;
            if (!data.phone.startsWith('62')) data.phone = '62' + data.phone;
        }

        // Generate Member Code
        data.memberCode = await this.generateMemberCode();

        // Cleanup non-entity fields
        delete data.expiryTemplate;
        delete data.tier;

        const member = this.memberRepository.create(data as Partial<Member>);
        const savedMember = await this.memberRepository.save(member);

        // Generate Token for return and WA
        const qrToken = QRUtils.generateToken({
            code: savedMember.memberCode as string,
            v: Number(savedMember.securityVersion || 0),
            t: Date.now()
        });

        // Generate Card URL
        const cardFilename = await this.getOrGenerateCard(savedMember, qrToken);
        const cardUrl = `${this.getApiBaseUrl()}/member-cards/${cardFilename}`;

        // Send WA Card
        await this.sendWelcomeCard(savedMember.id);

        this.billiardGateway.broadcastMemberUpdate(savedMember);

        return { ...savedMember, qrToken, cardUrl };
    }

    async updateMember(id: number, data: any): Promise<Member> {
        // Standardize Phone to 62xxx
        if (data.phone) {
            data.phone = data.phone.startsWith('0') ? '62' + data.phone.substring(1) : data.phone;
            if (!data.phone.startsWith('62')) data.phone = '62' + data.phone;
        }

        // Cleanup non-entity fields
        delete data.expiryTemplate;
        delete data.tier;

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
            code: saved.memberCode as string,
            v: Number(saved.securityVersion || 0),
            t: Date.now()
        });

        const cardFilename = await this.getOrGenerateCard(saved, qrToken);
        const cardUrl = `${this.getApiBaseUrl()}/member-cards/${cardFilename}`;

        await this.sendWelcomeCard(saved.id);
        this.billiardGateway.broadcastMemberUpdate(saved);
        return { ...saved, qrToken, cardUrl };
    }

    private getApiBaseUrl(): string {
        return this.whatsappService.getAppUrl && this.whatsappService.getAppUrl()
            ? this.whatsappService.getAppUrl()
            : 'http://localhost:4000';
    }

    private async getOrGenerateCard(member: Member, qrToken: string): Promise<string> {
        const tierName = member.tier?.name || 'REGULER';
        const expiryStr = member.expiryDate ? new Date(member.expiryDate).toLocaleDateString('id-ID') : 'Selamanya';
        const joinStr = new Date(member.createdAt).toLocaleDateString('id-ID');

        return await CardUtils.generateMemberCard({
            name: member.name,
            tierName,
            memberCode: member.memberCode as string,
            joinDate: joinStr,
            expiryDate: expiryStr,
            qrToken
        });
    }

    async sendWelcomeCard(id: number): Promise<void> {
        const member = await this.getMemberById(id);
        try {
            // 1. Generate a cryptographically signed token for the QR
            const qrToken = QRUtils.generateToken({
                code: member.memberCode as string,
                v: Number(member.securityVersion || 0),
                t: Date.now()
            });

            const cardFilename = await this.getOrGenerateCard(member, qrToken);
            const finalImageUrl = `${this.getApiBaseUrl()}/member-cards/${cardFilename}`;

            // 3. Send the Image
            await this.whatsappService.sendImage(
                member.phone,
                `Kartu Digital Member Anda - ${member.name}`,
                finalImageUrl
            );

            // 4. Send Text Notification with Details
            const tierName = member.tier?.name || 'REGULER';
            const expiryStr = member.expiryDate ? new Date(member.expiryDate).toLocaleDateString('id-ID') : 'Selamanya';
            await this.whatsappService.sendMessage(
                member.phone,
                `Halo ${member.name}, ini adalah kartu digital member billiard Anda! \n\nID Member: ${member.memberCode}\nKategori: ${tierName}\nMasa Berlaku: ${expiryStr}\n\nSilakan tunjukkan QR di atas saat bertransaksi untuk otomatisasi pembayaran dan keamanan transaksi Anda.`
            );
        } catch (err) {
            console.error('Failed to send QR to Member:', err);
        }
    }

    async topUp(id: number, amount: number, userId?: number, paymentMethod: string = 'CASH'): Promise<any> {
        const member = await this.getMemberById(id);

        // ── Validation ───────────────────────────────────────────────────────
        const numAmount = Number(amount);
        if (!numAmount || numAmount <= 0) {
            throw new BadRequestException('Nominal top-up harus lebih dari Rp 0.');
        }
        if (numAmount > 10_000_000) {
            throw new BadRequestException('Nominal top-up melebihi batas maksimum Rp 10.000.000 per transaksi.');
        }
        if (!member.isActive) {
            throw new BadRequestException(`Member "${member.name}" tidak aktif. Top-up hanya bisa dilakukan untuk member aktif.`);
        }
        const methodUpper = (paymentMethod || 'CASH').toUpperCase().trim();

        member.balance = Number(member.balance) + numAmount;
        const savedMember = await this.memberRepository.save(member);

        let transaction: Transaction | null = null;
        // Record Transaction
        try {
            const now = new Date();
            const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '');
            const hhmmss = now.toTimeString().slice(0, 8).replace(/:/g, '');
            const invoiceNumber = `MEM-${yymmdd}${hhmmss}`;

            transaction = this.transactionRepository.create({
                invoiceNumber,
                memberId: member.id,
                customerName: member.name,
                status: TransactionStatus.PAID,
                type: TransactionType.TOPUP,
                grandTotal: numAmount,
                paidAmount: numAmount,
                paymentDetails: [{ method: methodUpper, amount: numAmount, timestamp: now }],
                createdByUserId: userId,
            });

            if (userId) {
                const activeShift = await this.shiftService.getActiveShift(userId);
                if (activeShift) {
                    transaction.shiftId = activeShift.id;
                    transaction.businessDayId = activeShift.businessDayId;
                }
            }

            await this.transactionRepository.save(transaction);

            // Log Cashflow
            try {
                await this.financeService.logCashflow({
                    amount: numAmount,
                    type: CashflowType.IN,
                    source: 'sale:topup',
                    referenceId: transaction.invoiceNumber,
                    description: `Top-up [${methodUpper}] - ${member.name} (${member.memberCode}) → Rp ${numAmount.toLocaleString('id-ID')}`,
                    businessDayId: transaction.businessDayId,
                    shiftId: transaction.shiftId,
                });
            } catch (cfError) {
                console.error('Failed to log top-up cashflow:', cfError);
            }
        } catch (txErr) {
            console.error('Failed to record Topup transaction:', txErr);
        }

        try {
            await this.whatsappService.sendMessage(
                savedMember.phone,
                `✅ Top-up Berhasil!\n\nNama: ${savedMember.name}\nJumlah: Rp ${numAmount.toLocaleString('id-ID')}\nMetode: ${methodUpper}\nSaldo Sekarang: Rp ${Number(savedMember.balance).toLocaleString('id-ID')}\n\nTerima kasih telah menjadi member setia!`
            );
        } catch (err) {
            console.error('Failed to send Topup notification:', err);
        }

        // Broadcast real-time balance update
        this.billiardGateway.broadcastMemberBalance(savedMember.id, Number(savedMember.balance));

        return {
            member: savedMember,
            transaction: transaction
        } as any;
    }

    async getMemberActivityLogs(memberId: number) {
        // Fetch transactions for this member
        const transactions = await this.transactionRepository.find({
            where: { memberId },
            relations: ['table', 'cafeTable', 'orderItems', 'orderItems.menuItem'],
            order: { createdAt: 'DESC' },
            take: 50
        });

        return transactions;
    }

    async deductBalance(id: number, amount: number): Promise<Member> {
        const member = await this.getMemberById(id);
        if (Number(member.balance) < Number(amount)) {
            throw new HttpException("Saldo tidak cukup untuk menyelesaikan transaksi.", HttpStatus.PAYMENT_REQUIRED);
        }
        member.balance = Number(member.balance) - Number(amount);
        const savedMember = await this.memberRepository.save(member);

        // Broadcast real-time balance update
        this.billiardGateway.broadcastMemberBalance(savedMember.id, Number(savedMember.balance));

        return savedMember;
    }

    async awardPoints(id: number, amount: number): Promise<Member> {
        const member = await this.getMemberById(id);
        member.points = Number(member.points || 0) + Math.round(amount);
        const savedMember = await this.memberRepository.save(member);

        // Broadcast real-time point update
        this.billiardGateway.broadcastMemberUpdate(savedMember);

        return savedMember;
    }

    async sendSessionCompletionNotification(memberId: number, data: { tableName: string, duration: string, billiardTotal: number, cafeTotal: number, grandTotal: number }) {
        const member = await this.getMemberById(memberId);
        try {
            const message = `Sesi Billiard Selesai!

Meja: ${data.tableName}
Durasi: ${data.duration}

Detail Biaya:
- Billiard: Rp ${data.billiardTotal.toLocaleString()}
- Cafe: Rp ${data.cafeTotal.toLocaleString()}
--------------------------
Grand Total: Rp ${data.grandTotal.toLocaleString()}

Sisa Saldo Anda: Rp ${Number(member.balance).toLocaleString()}

Terima kasih telah bermain di Spoton Billiard!`;

            await this.whatsappService.sendMessage(member.phone, message);
        } catch (err) {
            console.error('Failed to send session completion notification:', err);
        }
    }
}
