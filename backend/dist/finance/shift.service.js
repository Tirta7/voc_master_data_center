"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ShiftService", {
    enumerable: true,
    get: function() {
        return ShiftService;
    }
});
const _common = require("@nestjs/common");
const _core = require("@nestjs/core");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _shiftentity = require("./entities/shift.entity");
const _transactionpaymententity = require("../transaction/entities/transaction-payment.entity");
const _sessionentity = require("../billiard/entities/session.entity");
const _shiftstockreportentity = require("./entities/shift-stock-report.entity");
const _approvalservice = require("../common/approval/approval.service");
const _approvalentity = require("../common/entities/approval.entity");
const _businessdayentity = require("./entities/business-day.entity");
const _transactionentity = require("../transaction/entities/transaction.entity");
const _orderitementity = require("../cafe/entities/order-item.entity");
const _ingrediententity = require("../inventory/entities/ingredient.entity");
const _menuitementity = require("../cafe/entities/menu-item.entity");
const _cashflowentity = require("./entities/cashflow.entity");
const _financeservice = require("./finance.service");
const _userentity = require("../user/entities/user.entity");
const _settingentity = require("../settings/entities/setting.entity");
const _expenseentity = require("./entities/expense.entity");
const _redisservice = require("../redis/redis.service");
const _whatsappservice = require("../whatsapp/whatsapp.service");
const _auditlogentity = require("../report/entities/audit-log.entity");
const _pointledgerentity = require("../loyalty/entities/point-ledger.entity");
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
let ShiftService = class ShiftService {
    /** Lazy getter — resolves EventsGateway only after all modules are initialized */ get eventsGateway() {
        const { EventsGateway: EG } = require('../socket/events.gateway');
        return this.moduleRef.get(EG, {
            strict: false
        });
    }
    /** Lazy getter — resolves AIService only after all modules are initialized */ get aiService() {
        try {
            const { AIService: AI } = require('../ai/ai.service');
            return this.moduleRef.get(AI, {
                strict: false
            });
        } catch (e) {
            return null;
        }
    }
    /**
   * Mendapatkan Business Day yang aktif atau membuat baru jika belum ada
   * Termasuk logika Safe Auto-Settlement jika diaktifkan.
   */ async getOrCreateActiveBusinessDay() {
        // 1. Fetch Settings
        const settings = await this.settingRepo.findOne({
            where: {}
        });
        const offset = settings?.businessDayOffset || '00:00';
        const [offsetHours, offsetMinutes] = offset.split(':').map(Number);
        // 2. Calculate Logical Date for "now"
        const now = new Date();
        const logicalDate = new Date(now);
        const cutoffToday = new Date(now);
        cutoffToday.setHours(offsetHours, offsetMinutes, 0, 0);
        if (now < cutoffToday) {
            logicalDate.setDate(logicalDate.getDate() - 1);
        }
        // FIX: toISOString() uses UTC which causes "Yesterday" date during early morning in WIB/Local.
        // Use local YYYY-MM-DD format.
        const dateString = `${logicalDate.getFullYear()}-${String(logicalDate.getMonth() + 1).padStart(2, '0')}-${String(logicalDate.getDate()).padStart(2, '0')}`;
        // 3. Find current active (unclosed) day
        let activeDay = await this.businessDayRepo.findOne({
            where: {
                isClosed: false
            },
            order: {
                id: 'DESC'
            }
        });
        // 4. Safe Auto-Settle logic
        // Guard: Only auto-settle if we are past the deadline AND the logical date has actually shifted.
        if (activeDay && settings?.autoSettlementEnabled && activeDay.date !== dateString) {
            const [h, m] = (settings.autoSettlementTime || '04:00').split(':').map(Number);
            const deadline = new Date(activeDay.date);
            deadline.setDate(deadline.getDate() + 1);
            deadline.setHours(h, m, 0, 0);
            if (now > deadline) {
                // Only auto-settle if NO active sessions
                const activeSessions = await this.sessionRepo.count({
                    where: {
                        endTime: (0, _typeorm1.IsNull)()
                    }
                });
                if (activeSessions === 0) {
                    this.logger.log(`Auto-settling stale Business Day #${activeDay.id} (${activeDay.date}) - No active sessions. Target logical date: ${dateString}`);
                    // Calculate revenue before closing
                    const transactions = await this.transactionRepo.find({
                        where: {
                            businessDayId: activeDay.id
                        },
                        select: [
                            'status',
                            'grandTotal',
                            'type'
                        ]
                    });
                    activeDay.totalRevenue = transactions.filter((t)=>t.status === _transactionentity.TransactionStatus.PAID || t.status === _transactionentity.TransactionStatus.DEBT || t.status === _transactionentity.TransactionStatus.PARTIAL).reduce((sum, t)=>sum + Number(t.grandTotal), 0);
                    activeDay.totalTopUp = transactions.filter((t)=>t.type === _transactionentity.TransactionType.TOPUP && t.status === _transactionentity.TransactionStatus.PAID).reduce((sum, t)=>sum + Number(t.grandTotal || 0), 0);
                    activeDay.isClosed = true;
                    activeDay.endTime = now;
                    await this.businessDayRepo.save(activeDay);
                    activeDay = null; // Force create new day below
                } else {
                    this.logger.warn(`Business Day #${activeDay.id} is stale but has ${activeSessions} active sessions. Skipping auto-settle.`);
                }
            }
        }
        // 5. Create new day if none active
        if (!activeDay) {
            // VALIDATION: Check if a Business Day for this logical date already exists
            // This prevents human error where someone closes the business day prematurely
            // and causes duplicate business days for the same date.
            let existingDay = await this.businessDayRepo.findOne({
                where: {
                    date: dateString
                },
                order: {
                    id: 'DESC'
                }
            });
            if (existingDay && existingDay.isClosed) {
                this.logger.warn(`Business Day for ${dateString} was closed prematurely. Reopening existing Business Day #${existingDay.id} to prevent duplicates.`);
                existingDay.isClosed = false;
                existingDay.endTime = null;
                activeDay = await this.businessDayRepo.save(existingDay);
            } else {
                activeDay = this.businessDayRepo.create({
                    date: dateString,
                    startTime: new Date(),
                    isClosed: false,
                    totalRevenue: 0,
                    totalExpenses: 0
                });
                activeDay = await this.businessDayRepo.save(activeDay);
                this.logger.log(`New Business Day started: ${dateString} (Logical Date)`);
                // --- AI AUTO-SUGGEST & PUBLISH TRIGGER ---
                // Pemicu otomatis pembuatan strategi AI berdasarkan Jam Potong Laporan
                try {
                    if (settings?.enableAISalesOrchestrator) {
                        const aiSvc = this.aiService;
                        if (aiSvc && typeof aiSvc.autoSuggestAndPublish === 'function') {
                            this.logger.log(`Triggering AI Sales Orchestrator for new Business Day...`);
                            aiSvc.autoSuggestAndPublish().catch((e)=>{
                                this.logger.error('Failed to auto-suggest AI target: ' + e.message);
                            });
                        }
                    }
                } catch (e) {
                    this.logger.error('Could not trigger AIService: ' + e.message);
                }
            }
        }
        return activeDay;
    }
    /**
   * Mendapatkan status settlement untuk peringatan di frontend
   */ async getSettlementStatus() {
        const settings = await this.settingRepo.findOne({
            where: {}
        });
        const autoSettlementEnabled = settings?.autoSettlementEnabled || false;
        const autoSettlementTime = settings?.autoSettlementTime || '04:00';
        const activeDay = await this.businessDayRepo.findOne({
            where: {
                isClosed: false
            },
            order: {
                id: 'DESC'
            }
        });
        if (!activeDay) {
            return {
                isStale: false,
                canAutoSettle: false,
                autoSettlementEnabled
            };
        }
        const [h, m] = autoSettlementTime.split(':').map(Number);
        const deadline = new Date(activeDay.date);
        deadline.setDate(deadline.getDate() + 1);
        deadline.setHours(h, m, 0, 0);
        const now = new Date();
        const isStale = now > deadline;
        if (!isStale) {
            return {
                isStale: false,
                canAutoSettle: false,
                businessDayId: activeDay.id,
                businessDayDate: activeDay.date,
                settlementDeadline: deadline,
                autoSettlementEnabled
            };
        }
        const activeSessions = await this.sessionRepo.count({
            where: {
                endTime: (0, _typeorm1.IsNull)()
            }
        });
        return {
            isStale: true,
            canAutoSettle: activeSessions === 0,
            reason: activeSessions > 0 ? `${activeSessions} active sessions present` : undefined,
            businessDayId: activeDay.id,
            businessDayDate: activeDay.date,
            settlementDeadline: deadline,
            autoSettlementEnabled
        };
    }
    /**
   * Memulai shift baru untuk user
   */ async startShift(userId, cashStart, shiftName, assignedTableIds, isEmergencyCover, coverNote) {
        // ── MUTEX: distributed lock ────────────────────────────────────
        const lockKey = `shift_start_${userId}`;
        const acquired = await this.redisService.acquireLock(lockKey, 5000);
        if (!acquired) {
            this.logger.warn(`startShift: Shift start for user ${userId} is already in progress.`);
            throw new _common.ConflictException('Proses mulai shift sedang berjalan.');
        }
        try {
            // Cek jika user sudah punya shift yang masih OPEN
            const existingShift = await this.shiftRepo.findOne({
                where: {
                    userId,
                    status: _shiftentity.ShiftStatus.OPEN
                }
            });
            if (existingShift) {
                throw new _common.ConflictException('Anda masih memiliki shift yang belum ditutup.');
            }
            const activeDay = await this.getOrCreateActiveBusinessDay();
            const user = await this.userRepo.findOneBy({
                id: userId
            });
            // ── EMERGENCY COVER DETECTION ──────────────────────────────────
            // Detect if this user already has a CLOSED shift in the same business day.
            // This is the "Nana comes back after endShift" scenario.
            let detectedEmergency = isEmergencyCover || false;
            let warningMessage;
            const prevShiftToday = await this.shiftRepo.findOne({
                where: {
                    userId,
                    businessDayId: activeDay.id,
                    status: _shiftentity.ShiftStatus.CLOSED
                },
                order: {
                    endTime: 'DESC'
                }
            });
            if (prevShiftToday) {
                detectedEmergency = true;
                warningMessage = `⚠️ Anda sudah pernah bertugas hari ini (${prevShiftToday.shiftName || 'Shift sebelumnya'} pukul ${prevShiftToday.startTime.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}–${prevShiftToday.endTime?.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}). Shift ini akan ditandai sebagai "COVER DARURAT" dan dicatat terpisah. Pastikan modal awal (kas di laci) yang Anda isi sudah benar.`;
                this.logger.warn(`[startShift] Emergency cover detected for user ${userId}. Previous shift #${prevShiftToday.id} was closed today at ${prevShiftToday.endTime}.`);
            }
            // ──────────────────────────────────────────────────────────────
            // Use provided assignments OR user defaults
            const finalAssignments = assignedTableIds || user?.assignedTableIds || undefined;
            // Calculate Lateness
            let latenessMinutes = 0;
            if (shiftName && shiftName !== 'CUSTOM' && !detectedEmergency) {
                const settings = await this.settingRepo.findOne({
                    where: {}
                });
                const matchingShift = settings?.availableShifts?.find((s)=>s.name.toUpperCase() === shiftName.toUpperCase());
                if (matchingShift && matchingShift.startTime) {
                    const now = new Date();
                    const [h, m] = matchingShift.startTime.split(':').map(Number);
                    const scheduledStart = new Date(now);
                    scheduledStart.setHours(h, m, 0, 0);
                    // Adjust for cross-midnight if necessary (within 12h window)
                    if (scheduledStart.getTime() - now.getTime() > 12 * 60 * 60 * 1000) {
                        scheduledStart.setDate(scheduledStart.getDate() - 1);
                    } else if (now.getTime() - scheduledStart.getTime() > 12 * 60 * 60 * 1000) {
                        scheduledStart.setDate(scheduledStart.getDate() + 1);
                    }
                    const diffMs = now.getTime() - scheduledStart.getTime();
                    if (diffMs > 0) {
                        latenessMinutes = Math.floor(diffMs / 60000);
                    }
                }
            }
            const shift = this.shiftRepo.create({
                userId,
                businessDayId: activeDay.id,
                startTime: new Date(),
                shiftName: detectedEmergency ? `COVER (${shiftName || 'DARURAT'})` : shiftName,
                cashStart,
                assignedTableIds: finalAssignments,
                cashSystem: 0,
                cashPhysical: 0,
                discrepancy: 0,
                status: _shiftentity.ShiftStatus.OPEN,
                startedBy: user?.name || 'Unknown',
                isActive: true,
                latenessMinutes,
                isEmergencyCover: detectedEmergency,
                coverNote: detectedEmergency ? coverNote || `Cover darurat oleh ${user?.name || 'Unknown'} — menunggu kasir shift berikutnya` : null
            });
            const savedShift = await this.shiftRepo.save(shift);
            this.eventsGateway.shiftStarted(savedShift);
            // Attach warning for frontend toast notification
            const result = savedShift;
            if (warningMessage) result.warning = warningMessage;
            return result;
        } finally{
            await this.redisService.releaseLock(lockKey);
        }
    }
    /**
   * Mendapatkan shift aktif milik user dengan kalkulasi kas sistem live
   */ async getActiveShift(userId) {
        let shift = await this.shiftRepo.findOne({
            where: {
                userId,
                status: _shiftentity.ShiftStatus.OPEN
            },
            relations: [
                'businessDay',
                'user'
            ]
        });
        // If no direct shift found for user, try finding ANY open shift in the current day
        // This allows Kitchen/Bar staff to "see" the active shift they need to report into.
        // We strictly prevent Waiters from falling back to the global shift.
        if (!shift) {
            const user = await this.userRepo.findOne({
                where: {
                    id: userId
                },
                relations: [
                    'role'
                ]
            });
            const roleName = (user?.role?.name || '').toUpperCase();
            const isWaiter = roleName.includes('WAITER') || roleName.includes('PELAYAN');
            const isAdmin = roleName.includes('ADMIN') || roleName === 'OWNER' || roleName === 'SUPERADMIN' || roleName === 'SUPER ADMIN';
            // 🛡️ FIX: ADMINs and WAITERs should NOT inherit an active shift from other users.
            // Waiters need their own shift to track assignments.
            // Admins are generally overseeing and shouldn't mix their operations into a cashier's shift.
            if (!isWaiter && !isAdmin) {
                shift = await this.shiftRepo.findOne({
                    where: {
                        status: _shiftentity.ShiftStatus.OPEN
                    },
                    relations: [
                        'businessDay',
                        'user',
                        'user.role'
                    ],
                    order: {
                        id: 'DESC'
                    }
                });
            }
        }
        if (shift) {
            try {
                const breakdown = await this.calculateExpectedCash(shift.id);
                shift.cashSystem = breakdown.expectedTotal;
                shift.cashRevenue = breakdown.cashRevenue;
                shift.nonCashRevenue = breakdown.nonCashRevenue;
                shift.totalExpenses = breakdown.totalExpenses;
                shift.paymentMethods = breakdown.paymentMethods;
            } catch (error) {
                this.logger.error(`Failed to calculate breakdown for shift ${shift.id}: ${error.message}`);
                // Fallback to basic data
                shift.cashSystem = Number(shift.cashStart || 0);
                shift.paymentMethods = {
                    CASH: 0,
                    QRIS: 0,
                    TRANSFER: 0,
                    MEMBER: 0
                };
            }
            // Live top-up calculation
            try {
                const shiftTxs = await this.transactionRepo.find({
                    where: {
                        shiftId: shift.id,
                        type: _transactionentity.TransactionType.TOPUP
                    }
                });
                shift.totalTopUp = shiftTxs.reduce((sum, tx)=>sum + Number(tx.grandTotal || 0), 0);
            } catch (error) {
                this.logger.error(`Failed to calculate top-ups for shift ${shift.id}: ${error.message}`);
                shift.totalTopUp = 0;
            }
        }
        return shift;
    }
    async updateActiveShift(userId, data) {
        const shift = await this.shiftRepo.findOne({
            where: {
                userId,
                status: _shiftentity.ShiftStatus.OPEN
            }
        });
        if (!shift) throw new _common.NotFoundException('Tidak ada shift aktif.');
        if (data.cashStart !== undefined) shift.cashStart = data.cashStart;
        if (data.shiftName !== undefined) shift.shiftName = data.shiftName;
        const saved = await this.shiftRepo.save(shift);
        this.eventsGateway.shiftStarted(saved); // Re-broadcast to sync UI
        return saved;
    }
    /**
   * Kalkulasi uang tunai yang seharusnya ada di laci (Modal + Tunai Masuk - Pengeluaran Kas)
   */ async calculateExpectedCash(shiftId) {
        const shift = await this.shiftRepo.findOneBy({
            id: shiftId
        });
        if (!shift) {
            return {
                expectedTotal: 0,
                cashRevenue: 0,
                nonCashRevenue: 0,
                totalExpenses: 0,
                paymentMethods: {
                    CASH: 0,
                    QRIS: 0,
                    TRANSFER: 0,
                    MEMBER: 0
                },
                expenses: [],
                totalTenderedCash: 0,
                totalChangeMoney: 0
            };
        }
        // 1. Initial Cash (Modal)
        const openingCash = Number(shift.cashStart || 0);
        let netCashflow = 0;
        let cashRevenue = 0;
        let nonCashRevenue = 0;
        let totalTenderedCash = 0; // NEW
        let totalChangeMoney = 0; // NEW
        let totalExpenses = 0;
        const paymentMethods = {
            CASH: 0,
            QRIS: 0,
            TRANSFER: 0,
            MEMBER: 0
        };
        // 2. Fetch PAYMENTS for this shift (Primary source for Revenue)
        // Use TransactionPayment.shiftId — this is always updated to the shift that RECEIVED the payment.
        // This correctly handles cross-shift handovers (table opened by Shift 1, paid by Shift 2).
        const shiftPayments = await this.shiftRepo.manager.find(_transactionpaymententity.TransactionPayment, {
            where: [
                {
                    shiftId
                },
                {
                    businessDayId: shift.businessDayId,
                    createdAt: (0, _typeorm1.Between)(shift.startTime, shift.endTime || new Date())
                }
            ]
        });
        // Map payments to a deduplicated structure (avoid counting same payment twice)
        const seenPaymentIds = new Set();
        const transactions = [];
        for (const pmt of shiftPayments){
            if (!seenPaymentIds.has(pmt.id)) {
                seenPaymentIds.add(pmt.id);
                transactions.push({
                    payments: [
                        pmt
                    ],
                    paymentDetails: null,
                    paidAmount: pmt.totalPaid
                });
                // Aggregate Cash Tendered and Change
                if ((pmt.paymentMethod || '').toUpperCase() === 'CASH') {
                    totalTenderedCash += Number(pmt.tenderedAmount || pmt.totalPaid || 0);
                    totalChangeMoney += Number(pmt.changeAmount || 0);
                }
            }
        }
        // 3. Aggregate Payment Methods from Transactions
        transactions.forEach((tx)=>{
            const txPayments = [];
            if (tx.payments && tx.payments.length > 0) {
                tx.payments.forEach((p)=>{
                    txPayments.push({
                        method: p.paymentMethod,
                        amount: Number(p.totalPaid)
                    });
                });
            } else if (tx.paymentDetails && Array.isArray(tx.paymentDetails)) {
                tx.paymentDetails.forEach((p)=>{
                    txPayments.push({
                        method: p.method || 'UNKNOWN',
                        amount: Number(p.amount)
                    });
                });
            } else if (Number(tx.paidAmount) > 0) {
                txPayments.push({
                    method: tx.paymentMethod || 'CASH',
                    amount: Number(tx.paidAmount)
                });
            }
            txPayments.forEach((p)=>{
                const m = p.method.toUpperCase();
                const normalizedMethod = m === 'MEMBERSHIP' ? 'MEMBER' : m;
                paymentMethods[normalizedMethod] = (paymentMethods[normalizedMethod] || 0) + p.amount;
                if (normalizedMethod === 'CASH') {
                    cashRevenue += p.amount;
                    netCashflow += p.amount;
                } else if (normalizedMethod !== 'MEMBER') {
                    nonCashRevenue += p.amount;
                }
            });
        });
        // 4. Fetch Manual/Other Cashflow Entries (for adjustments)
        const ledgerEntries = await this.cashflowRepo.find({
            where: [
                {
                    shiftId,
                    source: (0, _typeorm1.In)([
                        'manual',
                        'stock_purchase'
                    ])
                },
                {
                    businessDayId: shift.businessDayId,
                    source: (0, _typeorm1.In)([
                        'manual',
                        'stock_purchase'
                    ]),
                    timestamp: (0, _typeorm1.Between)(shift.startTime, shift.endTime || new Date())
                }
            ]
        });
        ledgerEntries.forEach((entry)=>{
            const amount = Number(entry.amount);
            const method = (entry.paymentMethod || 'CASH').toUpperCase();
            if (entry.type === _cashflowentity.CashflowType.IN) {
                if (method === 'CASH') {
                    netCashflow += amount;
                // cashRevenue += amount; // Optional: include manual ins in revenue? Usually not.
                }
            } else {
                // CashflowType.OUT
                if (method === 'CASH') {
                    netCashflow -= amount;
                }
            }
        });
        // 5. Fetch Expenses for this shift (Use robust fallback like in ReportService)
        const foundExpenses = await this.expenseRepo.find({
            where: [
                {
                    shiftId
                },
                {
                    recordedByUserId: shift.userId,
                    date: (0, _typeorm1.Between)(shift.startTime, shift.endTime || new Date())
                }
            ]
        });
        totalExpenses = foundExpenses.reduce((s, e)=>s + Number(e.amount), 0);
        return {
            expectedTotal: openingCash + netCashflow - totalExpenses,
            cashRevenue,
            nonCashRevenue,
            totalExpenses,
            paymentMethods,
            expenses: foundExpenses,
            totalTenderedCash,
            totalChangeMoney
        };
    }
    /**
   * Mendapatkan semua shift yang sedang terbuka (untuk Admin)
   */ async getOpenShifts() {
        return this.shiftRepo.find({
            where: {
                status: _shiftentity.ShiftStatus.OPEN
            },
            relations: [
                'user',
                'user.role'
            ],
            order: {
                startTime: 'DESC'
            }
        });
    }
    /**
   * Update penugasan meja pada shift yang sedang berjalan
   */ async updateAssignments(shiftId, assignedTableIds) {
        const shift = await this.shiftRepo.findOne({
            where: {
                id: shiftId
            },
            relations: [
                'user'
            ]
        });
        if (!shift) throw new _common.NotFoundException('Shift tidak ditemukan.');
        shift.assignedTableIds = assignedTableIds;
        const savedShift = await this.shiftRepo.save(shift);
        // Also save to user as persistent default
        if (shift.user) {
            shift.user.assignedTableIds = assignedTableIds;
            await this.userRepo.save(shift.user);
        }
        // Notify the waiter in real-time
        this.eventsGateway.assignmentsUpdated(shift.userId, assignedTableIds);
        return savedShift;
    }
    /**
   * Update penugasan meja permanen untuk user (bahkan jika tidak ada shift)
   */ async updatePersistentAssignments(userId, assignedTableIds) {
        const user = await this.userRepo.findOneBy({
            id: userId
        });
        if (!user) throw new _common.NotFoundException('User tidak ditemukan.');
        user.assignedTableIds = assignedTableIds;
        const saved = await this.userRepo.save(user);
        // CRITICAL: Also update any active shift for this user (Hot-Swap)
        const activeShift = await this.shiftRepo.findOne({
            where: {
                userId,
                status: _shiftentity.ShiftStatus.OPEN
            }
        });
        if (activeShift) {
            activeShift.assignedTableIds = assignedTableIds;
            await this.shiftRepo.save(activeShift);
        }
        // Notify the frontend via socket
        this.eventsGateway.assignmentsUpdated(userId, assignedTableIds);
        return saved;
    }
    /**
   * Mendapatkan departemen yang menjadi tanggung jawab role tertentu
   */ getDepartmentsByRole(roleName) {
        const role = (roleName || '').toUpperCase();
        if (role.includes('KITCHEN') || role.includes('DAPUR')) return [
            'KITCHEN'
        ];
        if (role.includes('BAR')) return [
            'BAR'
        ];
        if (role.includes('KASIR') || role.includes('CASHIER') || role.includes('ADMIN') || role.includes('OWNER')) {
            return [
                'KITCHEN',
                'BAR',
                'CASHIER'
            ];
        }
        if (role.includes('WAITER') || role.includes('PELAYAN')) return [
            'WAITER'
        ];
        return [];
    }
    /**
   * Menutup shift dan melakukan rekonsiliasi
   */ async endShift(userId, cashPhysical, note, stockReports, attachmentUrl) {
        // ── MUTEX: distributed lock ────────────────────────────────────
        const lockKey = `shift_end_${userId}`;
        const acquired = await this.redisService.acquireLock(lockKey, 5000);
        if (!acquired) {
            this.logger.warn(`endShift: Shift end for user ${userId} is already in progress.`);
            throw new _common.ConflictException('Proses tutup shift sedang berjalan.');
        }
        try {
            const shift = await this.getActiveShift(userId);
            if (!shift) {
                throw new _common.NotFoundException('Tidak ada shift aktif untuk user ini.');
            }
            if (shift.userId !== userId) {
                throw new _common.ConflictException('Anda tidak memiliki shift aktif yang dapat ditutup.');
            }
            // Check if all mandatory department reports are DONE (only for those the user is responsible for)
            const pendingDepts = [];
            const userRole = (shift.user?.role?.name || '').toUpperCase();
            const userDepts = this.getDepartmentsByRole(userRole);
            // If user is not responsible for any department, they are not blocked by stock reports
            if (userDepts.length > 0) {
                const reportStatus = shift.stockReportStatus || {};
                for (const dept of userDepts){
                    // Skip check if the user is providing reports for this department in the current request
                    // For Cashier/Admin, we assume the provided stockReports are for their own audit (CASHIER)
                    const isProvidingReportNow = stockReports && stockReports.length > 0 && (dept === 'CASHIER' && (userRole.includes('CASHIER') || userRole.includes('KASIR') || userRole.includes('ADMIN') || userRole.includes('OWNER')) || dept === 'KITCHEN' && userRole.includes('KITCHEN') || dept === 'BAR' && userRole.includes('BAR'));
                    if (isProvidingReportNow) continue;
                    const pending = await this.getPendingStockItems(shift.id, dept);
                    const hasPendingItems = pending.ingredients.length > 0 || pending.menuItems.length > 0;
                    if (hasPendingItems && reportStatus[dept] !== 'DONE') {
                        pendingDepts.push(dept);
                    }
                }
            }
            if (pendingDepts.length > 0) {
                throw new _common.ConflictException(`Shift tidak bisa ditutup. Laporan stok departemen berikut belum selesai: ${pendingDepts.join(', ')}`);
            }
            // Kalkulasi uang tunai yang seharusnya ada
            const breakdown = await this.calculateExpectedCash(shift.id);
            const totalCashInSystem = breakdown.expectedTotal;
            const user = await this.userRepo.findOneBy({
                id: userId
            });
            const now = new Date();
            // Calculate Performance Summary BEFORE closing shift object
            const performance = await this.calculateShiftPerformance(shift.id);
            // Calculate Overtime
            let overtimeMinutes = 0;
            if (shift.shiftName && shift.shiftName !== 'CUSTOM') {
                const settings = await this.settingRepo.findOne({
                    where: {}
                });
                const matchingShift = settings?.availableShifts?.find((s)=>s.name.toUpperCase() === shift.shiftName.toUpperCase());
                if (matchingShift && matchingShift.endTime) {
                    const [h, m] = matchingShift.endTime.split(':').map(Number);
                    const scheduledEnd = new Date(now);
                    scheduledEnd.setHours(h, m, 0, 0);
                    // Adjust for cross-midnight: if scheduledEnd is before shift start, it must be the next day
                    if (scheduledEnd < shift.startTime) {
                        scheduledEnd.setDate(scheduledEnd.getDate() + 1);
                    }
                    const diffMs = now.getTime() - scheduledEnd.getTime();
                    if (diffMs > 0) {
                        overtimeMinutes = Math.floor(diffMs / 60000);
                    }
                }
            }
            // Calculate Shift Totals
            const shiftTxs = await this.transactionRepo.find({
                where: {
                    shiftId: shift.id
                },
                relations: [
                    'table',
                    'cafeTable'
                ]
            });
            const totalTopUp = shiftTxs.filter((tx)=>tx.type === 'TOPUP').reduce((sum, tx)=>sum + Number(tx.grandTotal || 0), 0);
            // ── HANDOVER DETECTION: Catat meja yang masih UNPAID saat shift ditutup ──
            const unpaidTxs = shiftTxs.filter((tx)=>tx.status === _transactionentity.TransactionStatus.UNPAID || tx.status === _transactionentity.TransactionStatus.PARTIAL);
            const handoverTransactions = unpaidTxs.map((tx)=>({
                    transactionId: tx.id,
                    invoiceNumber: tx.invoiceNumber,
                    tableName: tx.table?.name || tx.cafeTable?.tableName || `TX #${tx.id}`,
                    grandTotal: Number(tx.grandTotal || 0)
                }));
            if (handoverTransactions.length > 0) {
                this.logger.warn(`[endShift] Shift ${shift.id} has ${handoverTransactions.length} UNPAID transactions at close. Recording as handover.`);
            }
            shift.endTime = now;
            shift.cashSystem = totalCashInSystem;
            shift.cashPhysical = cashPhysical;
            shift.discrepancy = cashPhysical - totalCashInSystem; // Selisih
            shift.totalTopUp = totalTopUp;
            shift.cashRevenue = breakdown.cashRevenue;
            shift.nonCashRevenue = breakdown.nonCashRevenue;
            shift.totalExpenses = breakdown.totalExpenses;
            shift.attachmentUrl = attachmentUrl || '';
            shift.note = note || '';
            shift.handoverTransactions = handoverTransactions.length > 0 ? handoverTransactions : null;
            shift.status = _shiftentity.ShiftStatus.CLOSED;
            shift.endedBy = user?.name || 'Unknown';
            shift.isActive = false;
            shift.overtimeMinutes = overtimeMinutes;
            shift.performanceSummary = performance;
            // Dynamic Approval for Closing (Waiters bypass this as they don't handle stock/cash)
            const settings = await this.settingRepo.findOne({
                where: {}
            });
            const closingConfig = settings?.approvalConfig?.CLOSING || [];
            const requiresApproval = userDepts.includes('CASHIER');
            if (closingConfig.length > 0 && requiresApproval) {
                shift.approvalStatus = _shiftentity.ShiftApprovalStatus.PENDING;
                await this.shiftRepo.save(shift);
                // Gather Audit Summary for Approval Metadata
                const existingReports = await this.shiftStockReportRepo.find({
                    where: {
                        shiftId: shift.id
                    }
                });
                const auditSummary = existingReports.map((r)=>({
                        name: r.itemName,
                        system: Number(r.systemStock),
                        physical: Number(r.physicalStock),
                        diff: Number(r.discrepancy),
                        dept: r.department
                    }));
                // Automatically mark providing department as DONE if reports are included
                if (stockReports && stockReports.length > 0) {
                    const reportStatus = shift.stockReportStatus || {};
                    const reportingDept = userDepts.includes('CASHIER') ? 'CASHIER' : userDepts[0];
                    if (reportingDept) {
                        reportStatus[reportingDept] = 'DONE';
                        shift.stockReportStatus = reportStatus;
                        // Prepare summary for incoming reports
                        for (const r of stockReports){
                            let sysStock = 0;
                            let itemName = r.itemName || 'Item';
                            if (r.ingredientId) {
                                const ing = await this.ingredientRepo.findOneBy({
                                    id: r.ingredientId
                                });
                                if (ing) {
                                    sysStock = Number(ing.stockQuantity);
                                    itemName = ing.name;
                                }
                            } else if (r.menuItemId) {
                                const menu = await this.menuItemRepo.findOneBy({
                                    id: r.menuItemId
                                });
                                if (menu) {
                                    sysStock = Number(menu.stockQuantity || 0);
                                    itemName = menu.name;
                                }
                            }
                            auditSummary.push({
                                name: itemName,
                                system: sysStock,
                                physical: Number(r.physicalStock),
                                diff: Number(r.physicalStock) - sysStock,
                                dept: reportingDept
                            });
                        }
                    }
                }
                // Create specialized approval request for closing
                await this.approvalService.createRequest({
                    moduleType: _approvalentity.ApprovalModuleType.CLOSING,
                    referenceId: shift.id,
                    requestedByUserId: userId,
                    requiredLevels: [
                        ...closingConfig
                    ].sort((a, b)=>a - b),
                    metadata: {
                        shiftName: shift.shiftName,
                        userName: user?.name,
                        cashSystem: totalCashInSystem,
                        cashPhysical: cashPhysical,
                        discrepancy: shift.discrepancy,
                        totalRevenue: (breakdown.cashRevenue || 0) + (breakdown.nonCashRevenue || 0),
                        paymentMethods: breakdown.paymentMethods,
                        expenses: breakdown.expenses,
                        netCashflow: (breakdown.cashRevenue || 0) + (breakdown.nonCashRevenue || 0) - (breakdown.totalExpenses || 0),
                        stockAudit: auditSummary,
                        stockReportStatus: shift.stockReportStatus
                    }
                });
            } else {
                shift.approvalStatus = _shiftentity.ShiftApprovalStatus.APPROVED;
            }
            const savedShift = await this.shiftRepo.save(shift);
            // Handle Stock Reports if provided (typically from Cashier/Retail)
            if (stockReports && Array.isArray(stockReports)) {
                await this.handleShiftStockReporting(savedShift.id, stockReports);
            }
            // Notify Owner via WhatsApp
            this.notifyOwnerShiftClosed(savedShift.id).catch((err)=>{
                this.logger.error('Failed to notify owner about shift closing:', err);
            });
            this.logger.log(`Shift closed for User ${userId}. Discrepancy: ${shift.discrepancy}`);
            await this.eventsGateway.shiftEnded(userId);
            return savedShift;
        } finally{
            await this.redisService.releaseLock(lockKey);
        }
    }
    async notifyOwnerShiftClosed(shiftId) {
        try {
            const shift = await this.shiftRepo.findOne({
                where: {
                    id: shiftId
                },
                relations: [
                    'user'
                ]
            });
            if (!shift) return;
            const settings = await this.settingRepo.findOne({
                where: {}
            });
            const ownerPhone = settings?.ownerPhone;
            if (!ownerPhone) return;
            const fmt = (val)=>new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    maximumFractionDigits: 0
                }).format(val);
            const stockReports = await this.shiftStockReportRepo.find({
                where: {
                    shiftId
                }
            });
            const stockSummary = stockReports.length > 0 ? '\n📦 *STOK BARANG*\n' + stockReports.map((r)=>`- ${r.itemName}: ${r.discrepancy > 0 ? '+' : ''}${r.discrepancy} ${r.unit} (${r.discrepancy === 0 ? 'OK' : 'SELISIH'})`).join('\n') : '';
            const statusIcon = shift.discrepancy === 0 ? '✅' : '⚠️';
            const timeStr = shift.endTime?.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const message = `🏁 *LAPORAN CLOSING SHIFT* 🏁\n\n` + `Petugas: *${shift.endedBy || shift.user?.name || 'Unknown'}*\n` + `Waktu: *${timeStr}*\n\n` + `💵 *KEUANGAN*\n` + `Modal Awal: ${fmt(shift.cashStart)}\n` + `Ekspektasi Kas: ${fmt(shift.cashSystem)}\n` + `Fisik di Laci: ${fmt(shift.cashPhysical)}\n` + `-------------------------\n` + `*SELISIH: ${fmt(shift.discrepancy)}* ${statusIcon}\n` + stockSummary + `\n\n` + `📝 *CATATAN*\n` + `${shift.note || '-'}\n\n` + (shift.attachmentUrl ? `🖼️ *BUKTI FOTO*\n${process.env.NEXT_PUBLIC_API_BASE_URL || ''}${shift.attachmentUrl}\n\n` : '') + `_Sistem Billing Otomatis_`;
            await this.whatsappService.sendMessage(ownerPhone, message);
        } catch (error) {
            this.logger.error('Error in notifyOwnerShiftClosed:', error);
        }
    }
    /**
   * Menghitung statistik performa shift
   */ async calculateShiftPerformance(shiftId) {
        const transactions = await this.transactionRepo.find({
            where: {
                shiftId
            },
            relations: [
                'orderItems',
                'orderItems.menuItem',
                'createdBy'
            ]
        });
        const stats = {
            totalTransactions: transactions.length,
            topWaiters: {},
            topPackages: {},
            topPromos: {},
            topItems: {},
            billiardRevenue: 0,
            cafeRevenue: 0,
            topupRevenue: 0
        };
        transactions.forEach((tx)=>{
            // Waiters
            const waiterId = tx.createdByUserId;
            if (waiterId) {
                const name = tx.createdBy?.name || 'Unknown';
                if (!stats.topWaiters[waiterId]) stats.topWaiters[waiterId] = {
                    name,
                    count: 0
                };
                stats.topWaiters[waiterId].count++;
            }
            // Packages (using billingDetails to count extensions correctly)
            if (tx.type === _transactionentity.TransactionType.BILLIARD) {
                if (tx.billingDetails && Array.isArray(tx.billingDetails)) {
                    tx.billingDetails.forEach((detail)=>{
                        if (detail.subtotal > 0) {
                            const pkgName = detail.fareName || tx.fareName || 'Unknown Package';
                            stats.topPackages[pkgName] = (stats.topPackages[pkgName] || 0) + 1;
                        }
                    });
                } else if (tx.fareName) {
                    stats.topPackages[tx.fareName] = (stats.topPackages[tx.fareName] || 0) + 1;
                }
                stats.billiardRevenue += Number(tx.billiardTotal || 0);
            }
            // Promos
            if (tx.appliedPromos && Array.isArray(tx.appliedPromos)) {
                tx.appliedPromos.forEach((p)=>{
                    const name = p.name || 'Promo';
                    stats.topPromos[name] = (stats.topPromos[name] || 0) + 1;
                });
            }
            // Items (Cafe/Store)
            if (tx.orderItems) {
                tx.orderItems.forEach((oi)=>{
                    if (oi.status === _orderitementity.OrderItemStatus.DONE || oi.status === _orderitementity.OrderItemStatus.QUEUED || oi.status === _orderitementity.OrderItemStatus.PROCESSING) {
                        const name = oi.menuItem?.name || oi.customName || 'Item';
                        stats.topItems[name] = (stats.topItems[name] || 0) + Number(oi.quantity);
                    }
                });
            }
            if (tx.type === _transactionentity.TransactionType.CAFE) stats.cafeRevenue += Number(tx.cafeTotal || 0);
            if (tx.type === _transactionentity.TransactionType.TOPUP) stats.topupRevenue += Number(tx.grandTotal || 0);
        });
        return {
            ...stats,
            topWaiters: Object.values(stats.topWaiters).sort((a, b)=>b.count - a.count).slice(0, 5),
            topPackages: Object.entries(stats.topPackages).map(([name, count])=>({
                    name,
                    count
                })).sort((a, b)=>b.count - a.count).slice(0, 5),
            topPromos: Object.entries(stats.topPromos).map(([name, count])=>({
                    name,
                    count
                })).sort((a, b)=>b.count - a.count).slice(0, 5),
            topItems: Object.entries(stats.topItems).map(([name, count])=>({
                    name,
                    count
                })).sort((a, b)=>b.count - a.count).slice(0, 10)
        };
    }
    /**
   * Proses pelaporan stok di akhir shift
   */ async handleShiftStockReporting(shiftId, reports, department) {
        const queryRunner = this.shiftRepo.manager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            for (const report of reports){
                // PREVENT DUPLICATION: Delete existing reports for this item in this shift
                if (report.ingredientId) {
                    await queryRunner.manager.delete(_shiftstockreportentity.ShiftStockReport, {
                        shiftId,
                        ingredientId: report.ingredientId
                    });
                } else if (report.menuItemId) {
                    await queryRunner.manager.delete(_shiftstockreportentity.ShiftStockReport, {
                        shiftId,
                        menuItemId: report.menuItemId
                    });
                }
                let systemStock = 0;
                let itemName = report.itemName;
                let unit = report.unit;
                let itemDept = report.department;
                if (report.ingredientId) {
                    const ing = await queryRunner.manager.findOne(_ingrediententity.Ingredient, {
                        where: {
                            id: report.ingredientId
                        }
                    });
                    if (ing) {
                        systemStock = Number(ing.stockQuantity);
                        itemName = ing.name;
                        unit = ing.unit;
                        if (!itemDept) itemDept = ing.department;
                        // PHASE 6: Sync physical stock back to database
                        ing.stockQuantity = Number(report.physicalStock);
                        await queryRunner.manager.save(_ingrediententity.Ingredient, ing);
                    }
                } else if (report.menuItemId) {
                    const menu = await queryRunner.manager.findOne(_menuitementity.MenuItem, {
                        where: {
                            id: report.menuItemId
                        }
                    });
                    if (menu) {
                        systemStock = Number(menu.stockQuantity || 0);
                        itemName = menu.name;
                        if (!itemDept) itemDept = menu.department;
                        // PHASE 6: Sync physical stock back to database
                        menu.stockQuantity = Number(report.physicalStock);
                        await queryRunner.manager.save(_menuitementity.MenuItem, menu);
                    }
                }
                const discrepancy = Number(report.physicalStock) - systemStock;
                let lostValue = 0;
                // Calculate loss value (negative discrepancy means items are missing)
                if (discrepancy < 0) {
                    const absLoss = Math.abs(discrepancy);
                    if (report.ingredientId) {
                        const ing = await queryRunner.manager.findOne(_ingrediententity.Ingredient, {
                            where: {
                                id: report.ingredientId
                            }
                        });
                        lostValue = absLoss * Number(ing?.costPrice || 0);
                    } else if (report.menuItemId) {
                        const menu = await queryRunner.manager.findOne(_menuitementity.MenuItem, {
                            where: {
                                id: report.menuItemId
                            }
                        });
                        lostValue = absLoss * Number(menu?.price || 0);
                    }
                }
                const stockReport = this.shiftStockReportRepo.create({
                    shiftId,
                    ingredientId: report.ingredientId,
                    menuItemId: report.menuItemId,
                    itemName,
                    systemStock,
                    physicalStock: Number(report.physicalStock),
                    discrepancy,
                    lostValue,
                    unit,
                    note: report.note,
                    department: department || itemDept || 'CASHIER'
                });
                await queryRunner.manager.save(stockReport);
            }
            await queryRunner.commitTransaction();
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error('Failed to save shift stock reports', error);
            throw error;
        } finally{
            await queryRunner.release();
        }
    }
    /**
   * Mendapatkan daftar barang yang wajib dilaporkan oleh departemen tertentu
   */ async getPendingStockItems(shiftId, department) {
        const shift = await this.shiftRepo.findOne({
            where: {
                id: shiftId
            }
        });
        if (!shift) throw new _common.NotFoundException('Shift tidak ditemukan.');
        const ingredients = await this.ingredientRepo.find({
            where: department === 'ALL' ? {} : {
                department: (0, _typeorm1.Raw)((alias)=>`UPPER(${alias}) = :dept`, {
                    dept: department.toUpperCase()
                })
            }
        });
        const menuItems = await this.menuItemRepo.find({
            where: department === 'ALL' ? {} : {
                department: (0, _typeorm1.Raw)((alias)=>`UPPER(${alias}) = :dept`, {
                    dept: department.toUpperCase()
                })
            },
            relations: [
                'recipes',
                'recipes.ingredient'
            ]
        });
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const checkStatus = async (items, type)=>{
            const results = [];
            const now = new Date();
            const isMonday = now.getDay() === 1;
            for (const item of items){
                if (item.isActive === false) continue;
                if (!item.isHighValue && !item.isMandatoryReporting) continue;
                const freq = item.auditFrequency || 'SHIFT';
                let reportedStatus = 'PENDING';
                if (freq === 'SHIFT') {
                    const exists = await this.shiftStockReportRepo.exists({
                        where: type === 'INGREDIENT' ? {
                            shiftId,
                            ingredientId: item.id
                        } : {
                            shiftId,
                            menuItemId: item.id
                        }
                    });
                    if (exists) reportedStatus = 'DONE';
                } else if (freq === 'DAILY') {
                    const exists = await this.shiftStockReportRepo.exists({
                        where: type === 'INGREDIENT' ? {
                            shift: {
                                businessDayId: shift.businessDayId
                            },
                            ingredientId: item.id
                        } : {
                            shift: {
                                businessDayId: shift.businessDayId
                            },
                            menuItemId: item.id
                        }
                    });
                    if (exists) reportedStatus = 'DONE';
                } else if (freq === 'WEEKLY') {
                    const exists = await this.shiftStockReportRepo.exists({
                        where: type === 'INGREDIENT' ? {
                            createdAt: (0, _typeorm1.MoreThanOrEqual)(oneWeekAgo),
                            ingredientId: item.id
                        } : {
                            createdAt: (0, _typeorm1.MoreThanOrEqual)(oneWeekAgo),
                            menuItemId: item.id
                        }
                    });
                    if (exists) reportedStatus = 'DONE';
                }
                results.push({
                    ...item,
                    reportedStatus
                });
            }
            return results;
        };
        const ingredientsWithStatus = await checkStatus(ingredients, 'INGREDIENT');
        const menuItemsWithStatus = await checkStatus(menuItems, 'MENU_ITEM');
        const menuItemsWithCalculatedStock = menuItemsWithStatus.map((item)=>{
            let theoreticalStock = Number(item.stockQuantity || 0);
            // If it has a recipe, calculate availability based on ingredients
            if (item.recipes && item.recipes.length > 0) {
                let maxPossible = Infinity;
                for (const r of item.recipes){
                    if (r.ingredient && r.quantity > 0) {
                        const possible = Number(r.ingredient.stockQuantity || 0) / Number(r.quantity);
                        if (possible < maxPossible) maxPossible = possible;
                    }
                }
                if (maxPossible !== Infinity) {
                    theoreticalStock = maxPossible;
                }
            }
            return {
                id: item.id,
                name: item.name,
                unit: 'Pcs',
                currentStock: theoreticalStock,
                type: 'MENU_ITEM',
                auditFrequency: item.auditFrequency || 'SHIFT',
                reportedStatus: item.reportedStatus,
                department: item.department
            };
        });
        // Deduplicate: If an Ingredient and a MenuItem have the EXACT same name, 
        // and both are in the list, we prioritize the Ingredient (it's the source of truth)
        const finalMenuItems = menuItemsWithCalculatedStock.filter((m)=>{
            return !ingredientsWithStatus.some((ing)=>ing.name.toLowerCase() === m.name.toLowerCase());
        });
        return {
            ingredients: ingredientsWithStatus.map((i)=>({
                    id: i.id,
                    name: i.name,
                    unit: i.unit,
                    currentStock: i.stockQuantity,
                    type: 'INGREDIENT',
                    auditFrequency: i.auditFrequency || 'SHIFT',
                    reportedStatus: i.reportedStatus,
                    department: i.department
                })),
            menuItems: finalMenuItems
        };
    }
    /**
   * Submit laporan stok per departemen
   */ async submitDepartmentStockReport(shiftId, department, reports) {
        const shift = await this.shiftRepo.findOne({
            where: {
                id: shiftId
            }
        });
        if (!shift) throw new _common.NotFoundException('Shift tidak ditemukan.');
        // Save reports
        await this.handleShiftStockReporting(shiftId, reports, department);
        // Update status
        const reportStatus = shift.stockReportStatus || {};
        if (department === 'ALL') {
            reportStatus['KITCHEN'] = 'DONE';
            reportStatus['BAR'] = 'DONE';
            reportStatus['CASHIER'] = 'DONE';
        } else {
            reportStatus[department] = 'DONE';
        }
        shift.stockReportStatus = reportStatus;
        await this.shiftRepo.save(shift);
        // Notify Gateway
        this.eventsGateway.server.emit('stockReportSubmitted', {
            shiftId,
            department
        });
        return {
            success: true
        };
    }
    /**
   * Mendapatkan laporan stok untuk shift tertentu
   */ async getShiftStockReports(shiftId) {
        return this.shiftStockReportRepo.find({
            where: {
                shiftId
            },
            order: {
                createdAt: 'ASC'
            }
        });
    }
    /**
   * Mendapatkan rekapitulasi untuk Business Day tertentu
   */ async getBusinessDayReport(businessDayId) {
        // ── CACHE: Business Day Report (TTL 30s) ───────────────────────
        const cacheKey = `report_business_day_${businessDayId}`;
        // const cached = await this.redisService.get(cacheKey);
        // if (cached) return cached;
        const businessDay = await this.businessDayRepo.findOne({
            where: {
                id: businessDayId
            },
            relations: [
                'shifts',
                'shifts.user',
                'shifts.user.role',
                'shifts.stockReports'
            ]
        });
        if (!businessDay) throw new _common.NotFoundException('Business Day tidak ditemukan.');
        const transactions = await this.transactionRepo.find({
            where: {
                businessDayId
            },
            relations: [
                'orderItems',
                'orderItems.menuItem',
                'orderItems.menuItem.category',
                'table',
                'cafeTable',
                'createdBy',
                'createdBy.role',
                'payments'
            ],
            order: {
                createdAt: 'DESC'
            }
        });
        // Ensure shifts are sorted newest first
        businessDay.shifts.sort((a, b)=>b.startTime.getTime() - a.startTime.getTime());
        const dayItemCounts = {};
        const dayPaymentMethods = {};
        let totalVat = 0;
        let totalService = 0;
        let totalDiscount = 0;
        let totalRounding = 0;
        let totalRevenue = 0; // Actual external cash flow (Cash, Bank, QRIS, etc.)
        let totalTopUp = 0;
        let totalBilliardSales = 0;
        let totalPlaystationSales = 0;
        let totalCafeSales = 0;
        const waiterCounts = {};
        const dayStockAudit = {};
        // 1. Fetch loyalty redemptions for this period
        const settings = await this.settingRepo.findOne({
            where: {}
        });
        const offsetString = settings?.businessDayOffset || '00:00';
        const [offsetH, offsetM] = offsetString.split(':').map(Number);
        const dayStart = new Date(businessDay.date);
        dayStart.setHours(offsetH, offsetM, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const redemptions = await this.pointLedgerRepo.find({
            where: {
                type: 'REDEEM',
                createdAt: (0, _typeorm1.Between)(dayStart, dayEnd)
            },
            relations: [
                'member'
            ]
        });
        const totalPointsRedeemed = Math.abs(redemptions.reduce((s, r)=>s + Number(r.amount), 0));
        const shiftIds = businessDay.shifts.map((s)=>s.id);
        const expenses = await this.expenseRepo.find({
            where: [
                {
                    businessDayId,
                    status: (0, _typeorm1.In)([
                        _expenseentity.ExpenseStatus.APPROVED,
                        _expenseentity.ExpenseStatus.PENDING
                    ])
                },
                {
                    shiftId: (0, _typeorm1.In)(shiftIds),
                    status: (0, _typeorm1.In)([
                        _expenseentity.ExpenseStatus.APPROVED,
                        _expenseentity.ExpenseStatus.PENDING
                    ])
                }
            ]
        });
        const dayTotalExpenses = expenses.reduce((s, e)=>s + Number(e.amount), 0);
        const redemptionBreakdown = Object.entries(redemptions.reduce((acc, r)=>{
            const item = r.description?.replace('Tukar ', '') || 'Reward Item';
            if (!acc[item]) acc[item] = {
                count: 0,
                points: 0
            };
            acc[item].count++;
            acc[item].points += Math.abs(Number(r.amount));
            return acc;
        }, {})).map(([name, stats])=>({
                name,
                ...stats
            }));
        transactions.forEach((tx)=>{
            // Count transactions per creator (waiter)
            const creatorId = tx.createdByUserId;
            if (creatorId) {
                const creatorName = tx.createdBy?.name || 'Unknown';
                if (!waiterCounts[creatorId]) waiterCounts[creatorId] = {
                    name: creatorName,
                    count: 0
                };
                waiterCounts[creatorId].count++;
            }
            const isTopUp = tx.type === 'TOPUP';
            const txGrandTotal = Number(tx.grandTotal || 0);
            // 1. Calculate Revenue and aggregate global methods
            const txPayments = [];
            if (tx.payments && tx.payments.length > 0) {
                tx.payments.forEach((p)=>{
                    txPayments.push({
                        method: p.paymentMethod,
                        amount: Number(p.totalPaid)
                    });
                });
            } else if (tx.paymentDetails && Array.isArray(tx.paymentDetails)) {
                tx.paymentDetails.forEach((p)=>{
                    txPayments.push({
                        method: p.method || 'UNKNOWN',
                        amount: Number(p.amount)
                    });
                });
            } else if (Number(tx.paidAmount) > 0) {
                txPayments.push({
                    method: tx.paymentMethod || 'CASH',
                    amount: Number(tx.paidAmount)
                });
            }
            txPayments.forEach((p)=>{
                const m = p.method.toUpperCase();
                // Global methods for the whole day (including those without shiftId)
                dayPaymentMethods[m] = (dayPaymentMethods[m] || 0) + p.amount;
                if (m !== 'MEMBER' && m !== 'MEMBERSHIP') {
                    totalRevenue += p.amount;
                }
            });
            if (isTopUp) {
                totalTopUp += txGrandTotal;
            } else {
                // ONLY count sales towards Revenue Sources if the transaction is PAID
                // to prevent mismatch between Gross Sales and Net Total Revenue
                if (tx.status === 'PAID' || Number(tx.paidAmount) >= Number(tx.grandTotal)) {
                    if (tx.table?.stationType === 'PLAYSTATION') {
                        totalPlaystationSales += Number(tx.billiardTotal || 0);
                    } else {
                        totalBilliardSales += Number(tx.billiardTotal || 0);
                    }
                    // Robust Cafe Total: Use column if > 0, otherwise sum orderItems
                    let txCafe = Number(tx.cafeTotal || 0);
                    if (txCafe === 0 && tx.orderItems && tx.orderItems.length > 0) {
                        tx.orderItems.forEach((oi)=>{
                            if (oi.status?.toUpperCase() !== 'CANCELLED' && oi.status?.toUpperCase() !== 'CANCEL_REQUESTED') {
                                txCafe += Number(oi.price || oi.priceAtOrder || 0) * Number(oi.quantity || 0);
                            }
                        });
                    }
                    totalCafeSales += txCafe;
                    totalVat += Number(tx.vatAmount || 0);
                    totalService += Number(tx.serviceChargeAmount || 0);
                    totalDiscount += Number(tx.discountAmount || 0);
                    totalRounding += Number(tx.roundingAmount || 0);
                }
            }
            // Item aggregation (exclude cancelled)
            if (tx.orderItems && Array.isArray(tx.orderItems)) {
                tx.orderItems.forEach((oi)=>{
                    if (oi.status?.toUpperCase() !== 'CANCELLED' && oi.status?.toUpperCase() !== 'CANCEL_REQUESTED') {
                        const menuId = oi.menuItemId || `custom-${oi.customName}`;
                        if (!dayItemCounts[menuId]) {
                            dayItemCounts[menuId] = {
                                name: oi.menuItem?.name || oi.customName,
                                qty: 0
                            };
                        }
                        dayItemCounts[menuId].qty += Number(oi.quantity);
                    }
                });
            }
        });
        const dayTopItems = Object.values(dayItemCounts).sort((a, b)=>b.qty - a.qty).slice(0, 10);
        // Map shift summaries with the same logic
        const shiftSummaries = businessDay.shifts.map((shift)=>{
            const shiftTx = transactions.filter((t)=>t.shiftId === shift.id);
            const methods = {};
            let sTotalRevenue = 0;
            let sCashRevenue = 0;
            let sNonCashRevenue = 0;
            let sBilliardSales = 0;
            let sPlaystationSales = 0;
            let sCafeSales = 0;
            let sTopUp = 0;
            let sRounding = 0;
            let sTotalTenderedCash = 0; // NEW
            let sTotalChangeMoney = 0; // NEW
            const sItemCounts = {};
            const sPackageCounts = {};
            const sTablePerformance = {};
            const sWaiterPerformance = {};
            shiftTx.forEach((tx)=>{
                // Tracking Waiter (Creator) Performance within this shift
                const waiterId = tx.createdByUserId;
                if (waiterId) {
                    if (!sWaiterPerformance[waiterId]) {
                        sWaiterPerformance[waiterId] = {
                            id: waiterId,
                            name: tx.createdBy?.name || 'Unknown',
                            revenue: 0,
                            billiardRevenue: 0,
                            cafeRevenue: 0,
                            packageCounts: {},
                            itemCounts: {}
                        };
                    }
                    const w = sWaiterPerformance[waiterId];
                    if (tx.status === 'PAID' || Number(tx.paidAmount) >= Number(tx.grandTotal)) {
                        // Package performance from billingDetails (handles extensions)
                        if (tx.billingDetails && Array.isArray(tx.billingDetails)) {
                            tx.billingDetails.forEach((d)=>{
                                if (d.title && !d.title.includes('Open Table') && !d.title.includes('Base Session')) {
                                    const pName = d.title;
                                    if (!sPackageCounts[pName]) {
                                        sPackageCounts[pName] = {
                                            name: pName,
                                            count: 0,
                                            revenue: 0
                                        };
                                    }
                                    sPackageCounts[pName].count++;
                                    sPackageCounts[pName].revenue += Number(d.subtotal || 0);
                                    if (!w.packageCounts[pName]) {
                                        w.packageCounts[pName] = {
                                            name: pName,
                                            count: 0
                                        };
                                    }
                                    w.packageCounts[pName].count++;
                                }
                            });
                        }
                        // Table Performance tracking (Billiard/PS)
                        if (tx.tableId && tx.table) {
                            const tName = tx.table.tableName;
                            if (!sTablePerformance[tName]) {
                                sTablePerformance[tName] = {
                                    name: tName,
                                    sessions: 0,
                                    revenue: 0
                                };
                            }
                            sTablePerformance[tName].sessions++;
                            sTablePerformance[tName].revenue += Number(tx.billiardTotal || 0);
                        }
                    }
                    ;
                    w.billiardRevenue += Number(tx.billiardTotal || 0);
                    w.cafeRevenue += Number(tx.cafeTotal || 0);
                    w.revenue += Number(tx.billiardTotal || 0) + Number(tx.cafeTotal || 0);
                    // Package performance from billingDetails (handles extensions)
                    if (tx.billingDetails && Array.isArray(tx.billingDetails)) {
                        tx.billingDetails.forEach((detail)=>{
                            if (detail.subtotal > 0) {
                                const pkg = detail.fareName || tx.fareName || 'Unknown Package';
                                if (!w.packageCounts[pkg]) w.packageCounts[pkg] = {
                                    name: pkg,
                                    count: 0
                                };
                                w.packageCounts[pkg].count++;
                            }
                        });
                    } else if (tx.fareName) {
                        const pkg = tx.fareName;
                        if (!w.packageCounts[pkg]) w.packageCounts[pkg] = {
                            name: pkg,
                            count: 0
                        };
                        w.packageCounts[pkg].count++;
                    }
                    if (tx.orderItems && Array.isArray(tx.orderItems)) {
                        tx.orderItems.forEach((oi)=>{
                            if (oi.status?.toUpperCase() !== 'CANCELLED' && oi.status?.toUpperCase() !== 'CANCEL_REQUESTED') {
                                const mId = oi.menuItemId || `c-${oi.customName}`;
                                if (!w.itemCounts[mId]) w.itemCounts[mId] = {
                                    name: oi.menuItem?.name || oi.customName,
                                    qty: 0
                                };
                                w.itemCounts[mId].qty += Number(oi.quantity);
                            }
                        });
                    }
                }
                const txPayments = [];
                if (tx.payments && tx.payments.length > 0) {
                    tx.payments.forEach((p)=>{
                        txPayments.push({
                            method: p.paymentMethod,
                            amount: Number(p.totalPaid),
                            tenderedAmount: Number(p.tenderedAmount || p.totalPaid),
                            changeAmount: Number(p.changeAmount || 0)
                        });
                    });
                } else if (tx.paymentDetails && Array.isArray(tx.paymentDetails)) {
                    tx.paymentDetails.forEach((p)=>{
                        txPayments.push({
                            method: p.method || 'UNKNOWN',
                            amount: Number(p.amount),
                            tenderedAmount: Number(p.tenderedAmount || p.amount),
                            changeAmount: Number(p.changeAmount || 0)
                        });
                    });
                } else if (Number(tx.paidAmount) > 0) {
                    txPayments.push({
                        method: tx.paymentMethod || 'CASH',
                        amount: Number(tx.paidAmount),
                        tenderedAmount: Number(tx.paidAmount),
                        changeAmount: 0
                    });
                }
                txPayments.forEach((p)=>{
                    const m = p.method.toUpperCase();
                    const normalizedMethod = m === 'MEMBERSHIP' ? 'MEMBER' : m;
                    methods[normalizedMethod] = (methods[normalizedMethod] || 0) + p.amount;
                    if (normalizedMethod !== 'MEMBER') {
                        sTotalRevenue += p.amount;
                        if (normalizedMethod === 'CASH') {
                            sCashRevenue += p.amount;
                            sTotalTenderedCash += Number(p.tenderedAmount || 0);
                            sTotalChangeMoney += Number(p.changeAmount || 0);
                        } else {
                            sNonCashRevenue += p.amount;
                        }
                    }
                });
                if (tx.type === 'TOPUP') {
                    sTopUp += Number(tx.grandTotal || 0);
                } else {
                    if (tx.table?.stationType === 'PLAYSTATION') {
                        sPlaystationSales += Number(tx.billiardTotal || 0);
                    } else {
                        sBilliardSales += Number(tx.billiardTotal || 0);
                    }
                    sCafeSales += Number(tx.cafeTotal || 0);
                    sRounding += Number(tx.roundingAmount || 0);
                    // Table performance (using joined table or cafeTable)
                    const tbl = tx.table || tx.cafeTable;
                    if (tbl) {
                        const tId = tbl.id.toString();
                        if (!sTablePerformance[tId]) {
                            sTablePerformance[tId] = {
                                name: tbl.tableName,
                                sessions: 0,
                                revenue: 0
                            };
                        }
                        sTablePerformance[tId].sessions += 1;
                        sTablePerformance[tId].revenue += Number(tx.billiardTotal || 0);
                    }
                    // Package performance (using billingDetails to catch extensions)
                    if (tx.billingDetails && Array.isArray(tx.billingDetails)) {
                        tx.billingDetails.forEach((detail)=>{
                            if (detail.subtotal > 0) {
                                const pkgName = detail.fareName || tx.fareName || 'Package';
                                if (!sPackageCounts[pkgName]) {
                                    sPackageCounts[pkgName] = {
                                        name: pkgName,
                                        count: 0,
                                        revenue: 0
                                    };
                                }
                                sPackageCounts[pkgName].count += 1;
                                sPackageCounts[pkgName].revenue += Number(detail.subtotal || 0);
                            }
                        });
                    } else if (tx.fareName) {
                        const pkgName = tx.fareName;
                        if (!sPackageCounts[pkgName]) {
                            sPackageCounts[pkgName] = {
                                name: pkgName,
                                count: 0,
                                revenue: 0
                            };
                        }
                        sPackageCounts[pkgName].count += 1;
                        sPackageCounts[pkgName].revenue += Number(tx.billiardTotal || 0);
                    }
                }
                if (tx.orderItems && Array.isArray(tx.orderItems)) {
                    tx.orderItems.forEach((oi)=>{
                        if (oi.status?.toUpperCase() !== 'CANCELLED' && oi.status?.toUpperCase() !== 'CANCEL_REQUESTED') {
                            const menuId = oi.menuItemId || `custom-${oi.customName}`;
                            if (!sItemCounts[menuId]) {
                                sItemCounts[menuId] = {
                                    name: oi.menuItem?.name || oi.customName,
                                    qty: 0,
                                    notes: []
                                };
                            }
                            sItemCounts[menuId].qty += Number(oi.quantity);
                            if (oi.note) {
                                sItemCounts[menuId].notes.push(oi.note);
                            }
                        }
                    });
                }
            });
            const roleName = (shift.user?.role?.name || '').toUpperCase();
            const isWaiter = roleName.includes('WAITER') || roleName.includes('PELAYAN');
            const sExpenses = expenses.filter((e)=>{
                if (e.shiftId === shift.id) return true;
                if (e.shiftId) return false; // Explicitly tied to a different shift
                // Fallback 1: Attribute by recordedByUserId or recordedBy name if on the same business day
                if (e.recordedByUserId && e.recordedByUserId === shift.userId) return true;
                if (e.recordedBy && e.recordedBy.toUpperCase() === (shift.user?.name || '').toUpperCase()) return true;
                // Fallback 2: Attribute by timestamp if no shiftId is present
                const eTime = new Date(e.date).getTime();
                const sStart = new Date(shift.startTime).getTime();
                const sEnd = shift.endTime ? new Date(shift.endTime).getTime() : Date.now();
                return eTime >= sStart && eTime <= sEnd;
            }).reduce((sum, e)=>sum + Number(e.amount), 0);
            return {
                shiftId: shift.id,
                userName: shift.user?.name || 'Unknown',
                userRole: shift.user?.role?.name || 'UNKNOWN',
                isWaiter,
                shiftName: shift.shiftName || 'N/A',
                startTime: shift.startTime,
                endTime: shift.endTime,
                totalRevenue: isWaiter ? 0 : sTotalRevenue,
                billiardRevenue: isWaiter ? 0 : sBilliardSales,
                playstationRevenue: isWaiter ? 0 : sPlaystationSales,
                cafeRevenue: isWaiter ? 0 : sCafeSales,
                topUpRevenue: isWaiter ? 0 : sTopUp,
                roundingAmount: isWaiter ? 0 : sRounding,
                paymentMethods: isWaiter ? {} : methods,
                topItems: isWaiter ? [] : Object.values(sItemCounts).sort((a, b)=>b.qty - a.qty),
                topPackages: isWaiter ? [] : Object.values(sPackageCounts).sort((a, b)=>b.count - a.count),
                tablePerformance: isWaiter ? [] : Object.values(sTablePerformance).sort((a, b)=>b.revenue - a.revenue),
                waiterPerformance: Object.values(sWaiterPerformance).sort((a, b)=>b.revenue - a.revenue),
                discrepancy: shift.discrepancy,
                cashStart: shift.cashStart,
                cashRevenue: isWaiter ? 0 : sCashRevenue,
                nonCashRevenue: isWaiter ? 0 : sNonCashRevenue,
                totalTenderedCash: isWaiter ? 0 : sTotalTenderedCash,
                totalChangeMoney: isWaiter ? 0 : sTotalChangeMoney,
                totalExpenses: sExpenses,
                attachmentUrl: shift.attachmentUrl,
                latenessMinutes: shift.latenessMinutes,
                overtimeMinutes: shift.overtimeMinutes,
                performance: shift.performanceSummary || {},
                stockReports: shift.stockReports || []
            };
        });
        // Aggregate global stock audit for the day
        shiftSummaries.forEach((s)=>{
            s.stockReports.forEach((sr)=>{
                const key = sr.ingredientId ? `ING:${sr.ingredientId}` : `MENU:${sr.menuItemId}`;
                if (!dayStockAudit[key]) {
                    dayStockAudit[key] = {
                        name: sr.itemName,
                        discrepancy: 0,
                        department: sr.department,
                        unit: sr.unit
                    };
                }
                dayStockAudit[key].discrepancy += Number(sr.discrepancy || 0);
            });
        });
        // Enrich each transaction: override paymentDetails with data from the
        // authoritative `payments` relation (TransactionPayment entity) so the
        // frontend always sees the correct payment method (MEMBER, CASH, QRIS, etc.)
        const enrichedTransactions = transactions.map((tx)=>{
            let resolvedPaymentDetails;
            if (tx.payments && tx.payments.length > 0) {
                // Use the formal payment records — most accurate source
                resolvedPaymentDetails = tx.payments.map((p)=>({
                        method: p.paymentMethod,
                        amount: Number(p.totalPaid),
                        payer: p.payerName || tx.customerName || 'Payer',
                        paymentId: p.id
                    }));
            } else if (tx.paymentDetails && Array.isArray(tx.paymentDetails) && tx.paymentDetails.length > 0) {
                // Fallback to JSON column but normalize unknown methods
                resolvedPaymentDetails = tx.paymentDetails.map((p)=>({
                        method: p.method || 'UNKNOWN',
                        amount: Number(p.amount || 0),
                        payer: p.payer || tx.customerName || 'Payer',
                        paymentId: p.paymentId
                    }));
            } else if (Number(tx.paidAmount) > 0) {
                // Last resort: single lump payment
                resolvedPaymentDetails = [
                    {
                        method: tx.paymentMethod || 'UNKNOWN',
                        amount: Number(tx.paidAmount),
                        payer: tx.customerName || 'Customer',
                        paymentId: 0
                    }
                ];
            } else {
                resolvedPaymentDetails = [];
            }
            // Strip circular relations and back-references
            const cleanTx = {
                ...tx
            };
            delete cleanTx.table;
            delete cleanTx.cafeTable;
            if (cleanTx.orderItems) {
                cleanTx.orderItems = cleanTx.orderItems.map((oi)=>{
                    const { transaction: _t, ...cleanOi } = oi;
                    return cleanOi;
                });
            }
            return {
                ...cleanTx,
                paymentDetails: resolvedPaymentDetails
            };
        });
        const totalDayTenderedCash = shiftSummaries.reduce((acc, s)=>acc + (s.totalTenderedCash || 0), 0);
        const totalDayChangeMoney = shiftSummaries.reduce((acc, s)=>acc + (s.totalChangeMoney || 0), 0);
        const finalReport = {
            businessDay,
            summary: {
                totalRevenue,
                totalTenderedCash: totalDayTenderedCash,
                totalChangeMoney: totalDayChangeMoney,
                billiardRevenue: totalBilliardSales,
                playstationRevenue: totalPlaystationSales,
                cafeRevenue: totalCafeSales,
                topUpRevenue: totalTopUp,
                totalVat,
                totalService,
                totalDiscount,
                totalRounding,
                totalExpenses: dayTotalExpenses,
                netProfit: totalRevenue - dayTotalExpenses,
                totalAwardedPoints: transactions.reduce((sum, tx)=>sum + Number(tx.awardedPoints || 0), 0),
                totalPointsRedeemed,
                redemptionBreakdown,
                totalMemberUsage: Object.entries(dayPaymentMethods).reduce((sum, [method, amount])=>{
                    return method === 'MEMBER' || method === 'MEMBERSHIP' ? sum + amount : sum;
                }, 0),
                transactionCount: transactions.length,
                topItems: dayTopItems,
                paymentMethods: dayPaymentMethods,
                totalWaiters: Object.values(waiterCounts).sort((a, b)=>b.count - a.count).slice(0, 5),
                stockAudit: Object.values(dayStockAudit)
            },
            shifts: shiftSummaries.filter((s)=>!s.isWaiter),
            allShifts: shiftSummaries,
            transactions: enrichedTransactions
        };
        // Cache the finalized report
        await this.redisService.set(cacheKey, JSON.stringify(finalReport), 30);
        return finalReport;
    }
    /**
   * Menutup Business Day (Closing Harian)
   */ async closeBusinessDay(id) {
        const businessDay = await this.businessDayRepo.findOneBy({
            id
        });
        if (!businessDay) throw new _common.NotFoundException('Business Day tidak ditemukan.');
        // 1. Check for UNCLOSED SHIFTS
        const openShifts = await this.shiftRepo.find({
            where: {
                businessDayId: id,
                status: _shiftentity.ShiftStatus.OPEN
            },
            relations: [
                'user'
            ]
        });
        if (openShifts.length > 0) {
            const userNames = openShifts.map((s)=>s.user?.name || 'Unknown').join(', ');
            throw new _common.ConflictException(`Gagal tutup buku: Masih ada ${openShifts.length} shift yang belum ditutup (Oleh: ${userNames}).`);
        }
        // 2. Check for ACTIVE BILLIARD SESSIONS (Unpaid)
        const activeSessions = await this.sessionRepo.count({
            where: {
                isPaid: false,
                endTime: (0, _typeorm1.IsNull)()
            }
        });
        if (activeSessions > 0) {
            throw new _common.ConflictException(`Gagal tutup buku: Masih ada ${activeSessions} sesi billiard yang sedang berjalan / belum dibayar.`);
        }
        // 3. Check for OPEN TRANSACTIONS (Unpaid Orders)
        const openTransactions = await this.transactionRepo.count({
            where: {
                businessDayId: id,
                status: _transactionentity.TransactionStatus.UNPAID
            }
        });
        if (openTransactions > 0) {
            throw new _common.ConflictException(`Gagal tutup buku: Masih ada ${openTransactions} transaksi (order) yang belum dibayar / diselesaikan.`);
        }
        businessDay.isClosed = true;
        businessDay.endTime = new Date();
        // 4. Automated Revenue Reconciliation (Precise aggregation)
        const transactions = await this.transactionRepo.find({
            where: {
                businessDayId: id
            }
        });
        // Sum only PAID/DEBT transactions for revenue (actual omzet)
        businessDay.totalRevenue = transactions.filter((t)=>t.status === _transactionentity.TransactionStatus.PAID || t.status === _transactionentity.TransactionStatus.DEBT || t.status === _transactionentity.TransactionStatus.PARTIAL).reduce((sum, t)=>sum + Number(t.grandTotal), 0);
        businessDay.totalTopUp = transactions.filter((t)=>t.type === _transactionentity.TransactionType.TOPUP && t.status === _transactionentity.TransactionStatus.PAID).reduce((sum, t)=>sum + Number(t.grandTotal || 0), 0);
        // 5. Automated Expense Reconciliation
        const expenses = await this.expenseRepo.find({
            where: {
                businessDayId: id
            }
        });
        businessDay.totalExpenses = expenses.reduce((sum, e)=>sum + Number(e.amount), 0);
        return this.businessDayRepo.save(businessDay);
    }
    /**
   * Toggle status audit untuk Business Day (Admin only)
   */ async toggleAuditStatus(id, isAudited) {
        const businessDay = await this.businessDayRepo.findOneBy({
            id
        });
        if (!businessDay) throw new _common.NotFoundException('Business Day tidak ditemukan.');
        businessDay.isAudited = isAudited;
        const saved = await this.businessDayRepo.save(businessDay);
        // Invalidate Redis cache so the frontend gets fresh data immediately
        await this.redisService.del(`report_business_day_${id}`).catch(()=>{});
        this.logger.log(`Business Day #${id} audit status set to: ${isAudited}`);
        return saved;
    }
    /**
   * Mendapatkan daftar semua Business Day
   */ async getBusinessDays() {
        const days = await this.businessDayRepo.find({
            order: {
                date: 'DESC',
                id: 'DESC'
            }
        });
        for (const day of days){
            if (Number(day.totalRevenue) === 0) {
                const txs = await this.transactionRepo.find({
                    where: {
                        businessDayId: day.id
                    },
                    select: [
                        'status',
                        'grandTotal',
                        'type'
                    ]
                });
                const revenue = txs.filter((t)=>t.status === _transactionentity.TransactionStatus.PAID || t.status === _transactionentity.TransactionStatus.DEBT || t.status === _transactionentity.TransactionStatus.PARTIAL).reduce((sum, t)=>sum + Number(t.grandTotal), 0);
                day.totalRevenue = revenue;
                // Save to DB if it's closed to fix past data
                if (day.isClosed && revenue > 0) {
                    await this.businessDayRepo.update(day.id, {
                        totalRevenue: revenue
                    });
                }
            }
        }
        return days;
    }
    /**
   * Find the waiter currently assigned to a table in an open shift
   */ async findAssignedWaiterForTable(type, tableId) {
        const openShifts = await this.getOpenShifts();
        for (const shift of openShifts){
            if (shift.assignedTableIds && Array.isArray(shift.assignedTableIds)) {
                const isAssigned = shift.assignedTableIds.some((t)=>t.type === type && Number(t.id) === Number(tableId));
                if (isAssigned) {
                    return shift.userId;
                }
            }
        }
        return null;
    }
    /**
   * Find the active cashier (Kasir) shift.
   * Revenue from ANY payment should always be attributed to the cashier on duty,
   * regardless of who (admin, super admin, waiter) performed the payment action.
   * Falls back to null if no cashier is currently on shift.
   */ async findActiveCashierShift() {
        const openShifts = await this.shiftRepo.find({
            where: {
                status: _shiftentity.ShiftStatus.OPEN
            },
            relations: [
                'user',
                'user.role'
            ],
            order: {
                startTime: 'DESC'
            }
        });
        // Find first open shift whose user has a cashier/kasir role
        const cashierShift = openShifts.find((shift)=>{
            const roleName = (shift.user?.role?.name || '').toUpperCase();
            return roleName.includes('KASIR') || roleName.includes('CASHIER');
        });
        return cashierShift ?? null;
    }
    /**
   * Mendapatkan Admin/Kasir yang paling mungkin aktif (punya shift OPEN atau Role Admin)
   */ async getActiveAdmin() {
        const openShifts = await this.shiftRepo.find({
            where: {
                status: _shiftentity.ShiftStatus.OPEN
            },
            relations: [
                'user',
                'user.role'
            ]
        });
        // Strategy 1: Find anyone with ADMIN/OWNER role who has an OPEN shift
        const adminWithShift = openShifts.find((s)=>[
                'ADMIN',
                'OWNER',
                'CASHIER',
                'SUPERADMIN',
                'SUPER ADMIN',
                'MANAGER'
            ].includes(s.user?.role?.name?.toUpperCase()));
        if (adminWithShift?.user) {
            return {
                id: adminWithShift.user.id,
                name: adminWithShift.user.name
            };
        }
        // Strategy 2: Find any user with Role Admin who is ACTIVE
        const activeAdmin = await this.userRepo.findOne({
            where: {
                role: {
                    name: 'ADMIN'
                },
                status: _userentity.UserStatus.ACTIVE
            }
        });
        if (activeAdmin) {
            return {
                id: activeAdmin.id,
                name: activeAdmin.name
            };
        }
        // Strategy 3: Fallback to first Admin found
        const firstAdmin = await this.userRepo.findOne({
            where: {
                role: {
                    name: 'ADMIN'
                }
            }
        });
        if (firstAdmin) {
            return {
                id: firstAdmin.id,
                name: firstAdmin.name
            };
        }
        return null;
    }
    /**
   * Final effect when shift closing is approved
   */ async finalizeClosing(shiftId) {
        const shift = await this.shiftRepo.findOne({
            where: {
                id: shiftId
            }
        });
        if (!shift || shift.approvalStatus !== _shiftentity.ShiftApprovalStatus.PENDING) return;
        shift.approvalStatus = _shiftentity.ShiftApprovalStatus.APPROVED;
        shift.isActive = false;
        await this.shiftRepo.save(shift);
        this.logger.log(`Shift #${shiftId} closing has been FINALIZED by approval.`);
    }
    constructor(shiftRepo, businessDayRepo, transactionRepo, userRepo, settingRepo, expenseRepo, cashflowRepo, shiftStockReportRepo, ingredientRepo, menuItemRepo, orderItemRepo, pointLedgerRepo, sessionRepo, financeService, auditLogRepository, approvalService, moduleRef, redisService, whatsappService){
        this.shiftRepo = shiftRepo;
        this.businessDayRepo = businessDayRepo;
        this.transactionRepo = transactionRepo;
        this.userRepo = userRepo;
        this.settingRepo = settingRepo;
        this.expenseRepo = expenseRepo;
        this.cashflowRepo = cashflowRepo;
        this.shiftStockReportRepo = shiftStockReportRepo;
        this.ingredientRepo = ingredientRepo;
        this.menuItemRepo = menuItemRepo;
        this.orderItemRepo = orderItemRepo;
        this.pointLedgerRepo = pointLedgerRepo;
        this.sessionRepo = sessionRepo;
        this.financeService = financeService;
        this.auditLogRepository = auditLogRepository;
        this.approvalService = approvalService;
        this.moduleRef = moduleRef;
        this.redisService = redisService;
        this.whatsappService = whatsappService;
        this.logger = new _common.Logger(ShiftService.name);
    }
};
ShiftService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_shiftentity.Shift)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_businessdayentity.BusinessDay)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_transactionentity.Transaction)),
    _ts_param(3, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_param(4, (0, _typeorm.InjectRepository)(_settingentity.Setting)),
    _ts_param(5, (0, _typeorm.InjectRepository)(_expenseentity.Expense)),
    _ts_param(6, (0, _typeorm.InjectRepository)(_cashflowentity.Cashflow)),
    _ts_param(7, (0, _typeorm.InjectRepository)(_shiftstockreportentity.ShiftStockReport)),
    _ts_param(8, (0, _typeorm.InjectRepository)(_ingrediententity.Ingredient)),
    _ts_param(9, (0, _typeorm.InjectRepository)(_menuitementity.MenuItem)),
    _ts_param(10, (0, _typeorm.InjectRepository)(_orderitementity.OrderItem)),
    _ts_param(11, (0, _typeorm.InjectRepository)(_pointledgerentity.PointLedger)),
    _ts_param(12, (0, _typeorm.InjectRepository)(_sessionentity.Session)),
    _ts_param(14, (0, _typeorm.InjectRepository)(_auditlogentity.AuditLog)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _financeservice.FinanceService === "undefined" ? Object : _financeservice.FinanceService,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _approvalservice.ApprovalService === "undefined" ? Object : _approvalservice.ApprovalService,
        typeof _core.ModuleRef === "undefined" ? Object : _core.ModuleRef,
        typeof _redisservice.RedisService === "undefined" ? Object : _redisservice.RedisService,
        typeof _whatsappservice.WhatsAppService === "undefined" ? Object : _whatsappservice.WhatsAppService
    ])
], ShiftService);

//# sourceMappingURL=shift.service.js.map