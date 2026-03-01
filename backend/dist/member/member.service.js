"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MemberService", {
    enumerable: true,
    get: function() {
        return MemberService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _memberentity = require("./entities/member.entity");
const _membertierentity = require("./entities/member-tier.entity");
const _whatsappservice = require("../whatsapp/whatsapp.service");
const _transactionentity = require("../transaction/entities/transaction.entity");
const _shiftentity = require("../finance/entities/shift.entity");
const _shiftservice = require("../finance/shift.service");
const _financeservice = require("../finance/finance.service");
const _cashflowentity = require("../finance/entities/cashflow.entity");
const _billiardgateway = require("../socket/billiard.gateway");
const _qrutils = require("./qr.utils");
const _cardutils = require("./card.utils");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let MemberService = class MemberService {
    // --- Member Tier Methods ---
    async getAllTiers() {
        return this.tierRepository.find({
            order: {
                name: 'ASC'
            }
        });
    }
    async createTier(data) {
        const tier = this.tierRepository.create(data);
        return this.tierRepository.save(tier);
    }
    async updateTier(id, data) {
        await this.tierRepository.update(id, data);
        const tier = await this.tierRepository.findOne({
            where: {
                id
            }
        });
        if (!tier) throw new _common.NotFoundException('Tier not found');
        return tier;
    }
    async deleteTier(id) {
        await this.tierRepository.delete(id);
    }
    // --- Member Methods ---
    async getAllMembers() {
        const members = await this.memberRepository.find({
            relations: [
                'tier'
            ],
            order: {
                createdAt: 'DESC'
            }
        });
        return members.map((m)=>({
                ...m,
                cardUrl: `${this.getApiBaseUrl()}/member-cards/card_${m.memberCode.replace(/[^a-zA-Z0-0]/g, '_')}.png`
            }));
    }
    async getMemberById(id) {
        const member = await this.memberRepository.findOne({
            where: {
                id
            },
            relations: [
                'tier'
            ]
        });
        if (!member) throw new _common.NotFoundException('Member not found');
        const cardUrl = `${this.getApiBaseUrl()}/member-cards/card_${member.memberCode.replace(/[^a-zA-Z0-0]/g, '_')}.png`;
        return {
            ...member,
            cardUrl
        };
    }
    async ensureCardGenerated(id) {
        const member = await this.getMemberById(id);
        // Use current security version to generate token
        const qrToken = _qrutils.QRUtils.generateToken({
            code: member.memberCode,
            v: Number(member.securityVersion || 0),
            t: Date.now()
        });
        const cardFilename = await this.getOrGenerateCard(member, qrToken);
        return `${this.getApiBaseUrl()}/member-cards/${cardFilename}`;
    }
    async getMemberByRfid(rfidUid) {
        const member = await this.memberRepository.findOne({
            where: {
                rfidUid,
                isActive: true
            },
            relations: [
                'tier'
            ]
        });
        if (!member) throw new _common.NotFoundException('Member card not registered or inactive');
        this.validateMemberAccess(member);
        return member;
    }
    async getMemberByCode(tokenOrCode, securityVersion) {
        let memberCode = tokenOrCode;
        let providedVersion = securityVersion !== undefined ? Number(securityVersion) : -1;
        // Secure Token Verification (Detect if it's a signed token)
        if (tokenOrCode.includes('.')) {
            const decoded = _qrutils.QRUtils.verifyToken(tokenOrCode);
            if (!decoded) {
                throw new _common.ForbiddenException('QR Code tidak valid atau telah dimanipulasi.');
            }
            memberCode = decoded.code;
            providedVersion = decoded.v;
        // Optional: Expiry check based on token timestamp (e.g., tokens valid for 30 days maximum, or just rely on DB version)
        // if (Date.now() - decoded.t > 30 * 24 * 60 * 60 * 1000) { ... }
        }
        const member = await this.memberRepository.findOne({
            where: {
                memberCode,
                isActive: true
            },
            relations: [
                'tier'
            ]
        });
        if (!member) throw new _common.NotFoundException('Member tidak ditemukan atau tidak aktif');
        // Security Version Check (Mandatory match)
        const currentVersion = Number(member.securityVersion || 0);
        console.log(`[QR SCAN] Member: ${member.memberCode}, DB Version: ${currentVersion}, Scan Version: ${providedVersion}`);
        if (currentVersion !== providedVersion) {
            throw new _common.ForbiddenException('QR Code sudah tidak berlaku. Silakan gunakan QR Code terbaru dari WhatsApp.');
        }
        // Expiry Check
        if (member.expiryDate) {
            const now = new Date();
            const expiry = new Date(member.expiryDate);
            if (now > expiry) {
                throw new _common.ForbiddenException(`Membership ${member.name} sudah kadaluarsa pada ${expiry.toLocaleDateString('id-ID')}. Silakan perpanjang.`);
            }
        }
        this.validateMemberAccess(member);
        return member;
    }
    validateMemberAccess(member) {
        const tier = member.tier;
        if (!tier) return;
        // WIB Time Check (GMT+7)
        const now = new Date();
        const currentWIB = new Date(now.toLocaleString('en-US', {
            timeZone: 'Asia/Jakarta'
        }));
        const currentMinutes = currentWIB.getHours() * 60 + currentWIB.getMinutes();
        const currentDateStr = currentWIB.toISOString().split('T')[0];
        // 1. Specific Date Check (HIGHEST PRIORITY)
        if (tier.activeDates && tier.activeDates.length > 0) {
            const specialDate = tier.activeDates.find((d)=>d.date === currentDateStr);
            if (specialDate) {
                const [sH, sM] = (specialDate.startTime || '00:00').split(':').map(Number);
                const [eH, eM] = (specialDate.endTime || '23:59').split(':').map(Number);
                const startMin = sH * 60 + sM;
                const endMin = eH * 60 + eM;
                const isInsideHours = startMin <= endMin ? currentMinutes >= startMin && currentMinutes <= endMin : currentMinutes >= startMin || currentMinutes <= endMin;
                if (!isInsideHours) {
                    throw new _common.ForbiddenException(`Khusus hari ini (${currentDateStr}), kategori ${tier.name} hanya aktif pada jam ${specialDate.startTime} - ${specialDate.endTime}.`);
                }
                return; // Access granted by special date
            } else if (tier.activeDates.some((d)=>d.date !== currentDateStr) && tier.activeDays?.length === 0 && !tier.activeStartTime) {
            // Optimization: if ONLY special dates are defined and today isn't one of them, block access
            // But typically global hours exist as fallback.
            }
        }
        // 2. Global Schedule Check (FALLBACK)
        // 2a. Day-of-week Check
        if (tier.activeDays && tier.activeDays.length > 0) {
            const currentDay = currentWIB.getDay(); // 0-6
            if (!tier.activeDays.includes(currentDay)) {
                const dayNames = [
                    'Minggu',
                    'Senin',
                    'Selasa',
                    'Rabu',
                    'Kamis',
                    'Jumat',
                    'Sabtu'
                ];
                const allowedDays = tier.activeDays.map((d)=>dayNames[d]).join(', ');
                throw new _common.ForbiddenException(`Kategori ${tier.name} hanya aktif pada hari: ${allowedDays}.`);
            }
        }
        // 2b. Hourly Check
        const [startH, startM] = (tier.activeStartTime || '00:00').split(':').map(Number);
        const [endH, endM] = (tier.activeEndTime || '23:59').split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const isInsideHours = startMinutes <= endMinutes ? currentMinutes >= startMinutes && currentMinutes <= endMinutes : currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        if (!isInsideHours) {
            throw new _common.ForbiddenException(`Kategori ${tier.name} hanya aktif pada jam ${tier.activeStartTime} - ${tier.activeEndTime}.`);
        }
    }
    async generateMemberCode() {
        const year = new Date().getFullYear();
        const count = await this.memberRepository.count();
        const nextNum = (count + 1).toString().padStart(4, '0');
        return `VOC-${year}-${nextNum}`;
    }
    async createMember(data) {
        if (data.rfidUid) {
            const existing = await this.memberRepository.findOne({
                where: {
                    rfidUid: data.rfidUid
                }
            });
            if (existing) throw new _common.ConflictException('RFID Card already registered');
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
        const member = this.memberRepository.create(data);
        const savedMember = await this.memberRepository.save(member);
        // Generate Token for return and WA
        const qrToken = _qrutils.QRUtils.generateToken({
            code: savedMember.memberCode,
            v: Number(savedMember.securityVersion || 0),
            t: Date.now()
        });
        // Generate Card URL
        const cardFilename = await this.getOrGenerateCard(savedMember, qrToken);
        const cardUrl = `${this.getApiBaseUrl()}/member-cards/${cardFilename}`;
        // Send WA Card
        await this.sendWelcomeCard(savedMember.id);
        this.billiardGateway.broadcastMemberUpdate(savedMember);
        return {
            ...savedMember,
            qrToken,
            cardUrl
        };
    }
    async updateMember(id, data) {
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
    async deleteMember(id) {
        await this.memberRepository.delete(id);
        this.billiardGateway.broadcastMemberUpdate({
            id,
            deleted: true
        });
    }
    async regenerateQrCode(id) {
        const member = await this.getMemberById(id);
        member.securityVersion += 1;
        const saved = await this.memberRepository.save(member);
        const qrToken = _qrutils.QRUtils.generateToken({
            code: saved.memberCode,
            v: Number(saved.securityVersion || 0),
            t: Date.now()
        });
        const cardFilename = await this.getOrGenerateCard(saved, qrToken);
        const cardUrl = `${this.getApiBaseUrl()}/member-cards/${cardFilename}`;
        await this.sendWelcomeCard(saved.id);
        this.billiardGateway.broadcastMemberUpdate(saved);
        return {
            ...saved,
            qrToken,
            cardUrl
        };
    }
    getApiBaseUrl() {
        return this.whatsappService.getAppUrl && this.whatsappService.getAppUrl() ? this.whatsappService.getAppUrl() : 'http://localhost:4000';
    }
    async getOrGenerateCard(member, qrToken) {
        const tierName = member.tier?.name || 'REGULER';
        const expiryStr = member.expiryDate ? new Date(member.expiryDate).toLocaleDateString('id-ID') : 'Selamanya';
        const joinStr = new Date(member.createdAt).toLocaleDateString('id-ID');
        return await _cardutils.CardUtils.generateMemberCard({
            name: member.name,
            tierName,
            memberCode: member.memberCode,
            joinDate: joinStr,
            expiryDate: expiryStr,
            qrToken
        });
    }
    async sendWelcomeCard(id) {
        const member = await this.getMemberById(id);
        try {
            // 1. Generate a cryptographically signed token for the QR
            const qrToken = _qrutils.QRUtils.generateToken({
                code: member.memberCode,
                v: Number(member.securityVersion || 0),
                t: Date.now()
            });
            const cardFilename = await this.getOrGenerateCard(member, qrToken);
            const finalImageUrl = `${this.getApiBaseUrl()}/member-cards/${cardFilename}`;
            // 3. Send the Image
            await this.whatsappService.sendImage(member.phone, `Kartu Digital Member Anda - ${member.name}`, finalImageUrl);
            // 4. Send Text Notification with Details
            const tierName = member.tier?.name || 'REGULER';
            const expiryStr = member.expiryDate ? new Date(member.expiryDate).toLocaleDateString('id-ID') : 'Selamanya';
            await this.whatsappService.sendMessage(member.phone, `Halo ${member.name}, ini adalah kartu digital member billiard Anda! \n\nID Member: ${member.memberCode}\nKategori: ${tierName}\nMasa Berlaku: ${expiryStr}\n\nSilakan tunjukkan QR di atas saat bertransaksi untuk otomatisasi pembayaran dan keamanan transaksi Anda.`);
        } catch (err) {
            console.error('Failed to send QR to Member:', err);
        }
    }
    async topUp(id, amount, userId, paymentMethod = 'CASH') {
        const member = await this.getMemberById(id);
        member.balance = Number(member.balance) + Number(amount);
        const savedMember = await this.memberRepository.save(member);
        let transaction = null;
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
                status: _transactionentity.TransactionStatus.PAID,
                type: _transactionentity.TransactionType.TOPUP,
                grandTotal: amount,
                paidAmount: amount,
                paymentDetails: [
                    {
                        method: paymentMethod.toUpperCase(),
                        amount: amount,
                        timestamp: now
                    }
                ],
                createdByUserId: userId
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
                    type: _cashflowentity.CashflowType.IN,
                    source: 'sale:topup',
                    referenceId: transaction.invoiceNumber,
                    description: `Top-up Member: ${member.name} (Code: ${member.memberCode})`
                });
            } catch (cfError) {
                console.error('Failed to log top-up cashflow:', cfError);
            }
        } catch (txErr) {
            console.error('Failed to record Topup transaction:', txErr);
        }
        try {
            await this.whatsappService.sendMessage(savedMember.phone, `Topup Berhasil! \n\nNama: ${savedMember.name}\nJumlah: Rp ${Number(amount).toLocaleString()}\nSaldo Sekarang: Rp ${Number(savedMember.balance).toLocaleString()}\n\nTerima kasih telah menjadi member setia!`);
        } catch (err) {
            console.error('Failed to send Topup notification:', err);
        }
        // Broadcast real-time balance update
        this.billiardGateway.broadcastMemberBalance(savedMember.id, Number(savedMember.balance));
        return {
            member: savedMember,
            transaction: transaction
        };
    }
    async getMemberActivityLogs(memberId) {
        // Fetch transactions for this member
        const transactions = await this.transactionRepository.find({
            where: {
                memberId
            },
            relations: [
                'table',
                'cafeTable',
                'orderItems',
                'orderItems.menuItem'
            ],
            order: {
                createdAt: 'DESC'
            },
            take: 50
        });
        return transactions;
    }
    async deductBalance(id, amount) {
        const member = await this.getMemberById(id);
        if (Number(member.balance) < Number(amount)) {
            throw new _common.HttpException("Saldo tidak cukup untuk menyelesaikan transaksi.", _common.HttpStatus.PAYMENT_REQUIRED);
        }
        member.balance = Number(member.balance) - Number(amount);
        const savedMember = await this.memberRepository.save(member);
        // Broadcast real-time balance update
        this.billiardGateway.broadcastMemberBalance(savedMember.id, Number(savedMember.balance));
        return savedMember;
    }
    async awardPoints(id, amount) {
        const member = await this.getMemberById(id);
        member.points = Number(member.points || 0) + Math.round(amount);
        const savedMember = await this.memberRepository.save(member);
        // Optional: Broadcast point update if needed, but usually balance is enough
        // this.billiardGateway.broadcastMemberUpdate(savedMember);
        return savedMember;
    }
    async sendSessionCompletionNotification(memberId, data) {
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
    constructor(memberRepository, tierRepository, transactionRepository, shiftRepository, whatsappService, shiftService, financeService, billiardGateway){
        this.memberRepository = memberRepository;
        this.tierRepository = tierRepository;
        this.transactionRepository = transactionRepository;
        this.shiftRepository = shiftRepository;
        this.whatsappService = whatsappService;
        this.shiftService = shiftService;
        this.financeService = financeService;
        this.billiardGateway = billiardGateway;
    }
};
MemberService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_memberentity.Member)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_membertierentity.MemberTier)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_transactionentity.Transaction)),
    _ts_param(3, (0, _typeorm.InjectRepository)(_shiftentity.Shift)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _whatsappservice.WhatsAppService === "undefined" ? Object : _whatsappservice.WhatsAppService,
        typeof _shiftservice.ShiftService === "undefined" ? Object : _shiftservice.ShiftService,
        typeof _financeservice.FinanceService === "undefined" ? Object : _financeservice.FinanceService,
        typeof _billiardgateway.BilliardGateway === "undefined" ? Object : _billiardgateway.BilliardGateway
    ])
], MemberService);

//# sourceMappingURL=member.service.js.map