import { Injectable, NotFoundException, ConflictException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
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
        return this.memberRepository.find({
            relations: ['tier'],
            order: { createdAt: 'DESC' }
        });
    }

    async getMemberById(id: number): Promise<Member> {
        const member = await this.memberRepository.findOne({
            where: { id },
            relations: ['tier']
        });
        if (!member) throw new NotFoundException('Member not found');
        return member;
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

    async getMemberByCode(memberCode: string, securityVersion?: number): Promise<Member> {
        const member = await this.memberRepository.findOne({
            where: { memberCode, isActive: true },
            relations: ['tier']
        });
        if (!member) throw new NotFoundException('Member not found or inactive');

        // Security Version Check (Mandatory match)
        const currentVersion = Number(member.securityVersion || 0);
        const providedVersion = securityVersion !== undefined ? Number(securityVersion) : -1;

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

    async createMember(data: any): Promise<Member> {
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

        // Send WA Card
        await this.sendWelcomeCard(savedMember.id);

        return savedMember;
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
        return this.getMemberById(id);
    }

    async deleteMember(id: number): Promise<void> {
        await this.memberRepository.delete(id);
    }

    async regenerateQrCode(id: number): Promise<Member> {
        const member = await this.getMemberById(id);
        member.securityVersion += 1;
        const saved = await this.memberRepository.save(member);
        await this.sendWelcomeCard(saved.id);
        return saved;
    }

    async sendWelcomeCard(id: number): Promise<void> {
        const member = await this.getMemberById(id);
        try {
            // Security version embedded in QR data to invalidate old ones
            const qrData = JSON.stringify({
                type: 'MEMBERSHIP',
                code: member.memberCode,
                v: member.securityVersion
            });

            const tierName = member.tier?.name || 'REGULER';
            const expiryStr = member.expiryDate ? new Date(member.expiryDate).toLocaleDateString('id-ID') : 'Selamanya';

            // Text Notification
            await this.whatsappService.sendMessage(
                member.phone,
                `Halo ${member.name}, ini adalah kartu digital member billiard Anda! \n\nID Member: ${member.memberCode}\nKategori: ${tierName}\nMasa Berlaku: ${expiryStr}\n\nSilakan tunjukkan QR ini saat bertransaksi untuk otomatisasi pembayaran.`
            );
        } catch (err) {
            console.error('Failed to send QR to Member:', err);
        }
    }

    async topUp(id: number, amount: number, userId?: number, paymentMethod: string = 'CASH'): Promise<any> {
        const member = await this.getMemberById(id);
        member.balance = Number(member.balance) + Number(amount);
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
                grandTotal: amount,
                paidAmount: amount,
                paymentDetails: [{ method: paymentMethod.toUpperCase(), amount: amount, timestamp: now }],
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
                    amount,
                    type: CashflowType.IN,
                    source: 'sale:topup',
                    referenceId: transaction.invoiceNumber,
                    description: `Top-up Member: ${member.name} (Code: ${member.memberCode})`,
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
                `Topup Berhasil! \n\nNama: ${savedMember.name}\nJumlah: Rp ${Number(amount).toLocaleString()}\nSaldo Sekarang: Rp ${Number(savedMember.balance).toLocaleString()}\n\nTerima kasih telah menjadi member setia!`
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
