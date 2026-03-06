import { Injectable, Logger, ConflictException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { Shift, ShiftStatus } from './entities/shift.entity';
import { BusinessDay } from './entities/business-day.entity';
import { Transaction, TransactionStatus, TransactionType } from '../transaction/entities/transaction.entity';
import { Cashflow, CashflowType } from './entities/cashflow.entity';
import { FinanceService } from './finance.service';
import { User } from '../user/entities/user.entity';
import { Setting } from '../settings/entities/setting.entity';
import { Expense } from './entities/expense.entity';
import type { EventsGateway } from '../socket/events.gateway';

@Injectable()
export class ShiftService {
    private readonly logger = new Logger(ShiftService.name);

    constructor(
        @InjectRepository(Shift)
        private readonly shiftRepo: Repository<Shift>,
        @InjectRepository(BusinessDay)
        private readonly businessDayRepo: Repository<BusinessDay>,
        @InjectRepository(Transaction)
        private readonly transactionRepo: Repository<Transaction>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(Setting)
        private readonly settingRepo: Repository<Setting>,
        @InjectRepository(Expense)
        private readonly expenseRepo: Repository<Expense>,
        @InjectRepository(Cashflow)
        private readonly cashflowRepo: Repository<Cashflow>,
        private readonly financeService: FinanceService,
        @Inject(forwardRef(() => { const { EventsGateway } = require('../socket/events.gateway'); return EventsGateway; }))
        private readonly eventsGateway: EventsGateway,
    ) { }

    /**
     * Mendapatkan Business Day yang aktif atau membuat baru jika belum ada
     */
    async getOrCreateActiveBusinessDay(): Promise<BusinessDay> {
        // 1. Fetch Offset from Settings
        const settings = await this.settingRepo.findOne({ where: {} });
        const offset = settings?.businessDayOffset || '00:00';
        const [offsetHours, offsetMinutes] = offset.split(':').map(Number);

        // 2. Calculate Logical Date
        const now = new Date();
        const logicalDate = new Date(now);

        // If current time is before offset, it belongs to "yesterday"
        const cutoffToday = new Date(now);
        cutoffToday.setHours(offsetHours, offsetMinutes, 0, 0);

        if (now < cutoffToday) {
            logicalDate.setDate(logicalDate.getDate() - 1);
        }

        const dateString = logicalDate.toISOString().split('T')[0];

        // 3. Find if there's an OPEN business day for this logical date
        // OR simply the MOST RECENT open day
        let activeDay = await this.businessDayRepo.findOne({
            where: { isClosed: false },
            order: { id: 'DESC' }
        });

        // 4. If an active day exists, we reuse it regardless of date string 
        // (to allow flexibility if they started late).
        // BUT if it doesn't exist, we create one for the calculated logical date.
        if (!activeDay) {
            activeDay = this.businessDayRepo.create({
                date: dateString,
                startTime: new Date(),
                isClosed: false,
                totalRevenue: 0,
                totalExpenses: 0
            });
            activeDay = await this.businessDayRepo.save(activeDay);
            this.logger.log(`New Business Day started: ${dateString} (Logical Date)`);
        }

        return activeDay;
    }

    /**
     * Memulai shift baru untuk user
     */
    async startShift(userId: number, cashStart: number, shiftName?: string, assignedTableIds?: any[]): Promise<Shift> {
        // Cek jika user sudah punya shift yang masih OPEN
        const existingShift = await this.shiftRepo.findOne({
            where: { userId, status: ShiftStatus.OPEN }
        });

        if (existingShift) {
            throw new ConflictException('Anda masih memiliki shift yang belum ditutup.');
        }

        const activeDay = await this.getOrCreateActiveBusinessDay();
        const user = await this.userRepo.findOneBy({ id: userId });

        // Use provided assignments OR user defaults
        const finalAssignments = assignedTableIds || user?.assignedTableIds || undefined;

        // Calculate Lateness
        let latenessMinutes = 0;
        if (shiftName && shiftName !== 'CUSTOM') {
            const settings = await this.settingRepo.findOne({ where: {} });
            const matchingShift = settings?.availableShifts?.find(s => s.name.toUpperCase() === shiftName.toUpperCase());

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
            shiftName,
            cashStart,
            assignedTableIds: finalAssignments as any,
            cashSystem: 0,
            cashPhysical: 0,
            discrepancy: 0,
            status: ShiftStatus.OPEN,
            startedBy: user?.name || 'Unknown',
            isActive: true,
            latenessMinutes
        });

        const savedShift = await this.shiftRepo.save(shift);
        this.eventsGateway.shiftStarted(savedShift);
        return savedShift;
    }

    /**
     * Mendapatkan shift aktif milik user dengan kalkulasi kas sistem live
     */
    async getActiveShift(userId: number): Promise<Shift | null> {
        const shift = await this.shiftRepo.findOne({
            where: { userId, status: ShiftStatus.OPEN },
            relations: ['businessDay']
        });

        if (shift) {
            shift.cashSystem = await this.calculateExpectedCash(shift.id);

            // Live top-up calculation
            const shiftTxs = await this.transactionRepo.find({
                where: {
                    shiftId: shift.id,
                    type: TransactionType.TOPUP
                }
            });
            shift.totalTopUp = shiftTxs.reduce((sum, tx) => sum + Number(tx.grandTotal || 0), 0);
        }

        return shift;
    }

    /**
     * Kalkulasi uang tunai yang seharusnya ada di laci (Modal + Tunai Masuk - Pengeluaran Kas)
     */
    async calculateExpectedCash(shiftId: number): Promise<number> {
        const shift = await this.shiftRepo.findOneBy({ id: shiftId });
        if (!shift) return 0;

        // 1. Initial Cash (Modal)
        const openingCash = Number(shift.cashStart || 0);

        // 2. Query Unified Ledger (Cashflow) for this shift
        const ledgerEntries = await this.cashflowRepo.find({
            where: { shiftId }
        });

        let netCashflow = 0;
        ledgerEntries.forEach(entry => {
            const amount = Number(entry.amount);
            if (entry.type === CashflowType.IN) {
                netCashflow += amount;
            } else {
                netCashflow -= amount;
            }
        });

        return openingCash + netCashflow;
    }

    /**
     * Mendapatkan semua shift yang sedang terbuka (untuk Admin)
     */
    async getOpenShifts(): Promise<Shift[]> {
        return this.shiftRepo.find({
            where: { status: ShiftStatus.OPEN },
            relations: ['user', 'user.role'],
            order: { startTime: 'DESC' }
        });
    }

    /**
     * Update penugasan meja pada shift yang sedang berjalan
     */
    async updateAssignments(shiftId: number, assignedTableIds: any[]): Promise<Shift> {
        const shift = await this.shiftRepo.findOne({
            where: { id: shiftId },
            relations: ['user']
        });
        if (!shift) throw new NotFoundException('Shift tidak ditemukan.');

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
     */
    async updatePersistentAssignments(userId: number, assignedTableIds: any[]): Promise<User> {
        const user = await this.userRepo.findOneBy({ id: userId });
        if (!user) throw new NotFoundException('User tidak ditemukan.');

        user.assignedTableIds = assignedTableIds;
        const saved = await this.userRepo.save(user);

        // Notify
        this.eventsGateway.assignmentsUpdated(userId, assignedTableIds);

        return saved;
    }

    /**
     * Menutup shift dan melakukan rekonsiliasi
     */
    async endShift(userId: number, cashPhysical: number, note?: string): Promise<Shift> {
        const shift = await this.getActiveShift(userId);
        if (!shift) {
            throw new NotFoundException('Tidak ada shift aktif untuk user ini.');
        }

        // Kalkulasi uang tunai yang seharusnya ada
        const totalCashInSystem = await this.calculateExpectedCash(shift.id);

        const user = await this.userRepo.findOneBy({ id: userId });
        const now = new Date();

        // Calculate Overtime
        let overtimeMinutes = 0;
        if (shift.shiftName && shift.shiftName !== 'CUSTOM') {
            const settings = await this.settingRepo.findOne({ where: {} });
            const matchingShift = settings?.availableShifts?.find(s => s.name.toUpperCase() === shift.shiftName.toUpperCase());

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
        const shiftTxs = await this.transactionRepo.find({ where: { shiftId: shift.id } });
        const totalTopUp = shiftTxs
            .filter(tx => tx.type === 'TOPUP')
            .reduce((sum, tx) => sum + Number(tx.grandTotal || 0), 0);

        shift.endTime = now;
        shift.cashSystem = totalCashInSystem;
        shift.cashPhysical = cashPhysical;
        shift.discrepancy = cashPhysical - totalCashInSystem; // Selisih
        shift.totalTopUp = totalTopUp;
        shift.note = note || '';
        shift.status = ShiftStatus.CLOSED;
        shift.endedBy = user?.name || 'Unknown';
        shift.isActive = false;
        shift.overtimeMinutes = overtimeMinutes;

        const savedShift = await this.shiftRepo.save(shift);
        this.logger.log(`Shift closed for User ${userId}. Discrepancy: ${shift.discrepancy}`);

        await this.eventsGateway.shiftEnded(userId);

        return savedShift;
    }

    /**
     * Mendapatkan rekapitulasi untuk Business Day tertentu
     */
    async getBusinessDayReport(businessDayId: number): Promise<any> {
        const businessDay = await this.businessDayRepo.findOne({
            where: { id: businessDayId },
            relations: ['shifts', 'shifts.user', 'shifts.user.role']
        });

        if (!businessDay) throw new NotFoundException('Business Day tidak ditemukan.');

        const transactions = await this.transactionRepo.find({
            where: { businessDayId },
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
            order: { createdAt: 'DESC' }
        });

        // Ensure shifts are sorted newest first
        businessDay.shifts.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());



        const dayItemCounts: Record<string, { name: string, qty: number }> = {};
        const dayPaymentMethods: Record<string, number> = {};
        let totalVat = 0;
        let totalService = 0;
        let totalDiscount = 0;
        let totalRounding = 0;
        let totalRevenue = 0; // Actual external cash flow (Cash, Bank, QRIS, etc.)
        let totalTopUp = 0;
        let totalBilliardSales = 0;
        let totalCafeSales = 0;

        transactions.forEach(tx => {
            const isTopUp = tx.type === 'TOPUP';
            const txGrandTotal = Number(tx.grandTotal || 0);

            // 1. Calculate Revenue and aggregate global methods
            const txPayments: { method: string, amount: number }[] = [];

            if (tx.payments && tx.payments.length > 0) {
                tx.payments.forEach(p => {
                    txPayments.push({ method: p.paymentMethod, amount: Number(p.totalPaid) });
                });
            } else if (tx.paymentDetails && Array.isArray(tx.paymentDetails)) {
                tx.paymentDetails.forEach((p: any) => {
                    txPayments.push({ method: p.method || 'UNKNOWN', amount: Number(p.amount) });
                });
            } else if (Number(tx.paidAmount) > 0) {
                txPayments.push({ method: (tx as any).paymentMethod || 'CASH', amount: Number(tx.paidAmount) });
            }

            txPayments.forEach(p => {
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
                totalBilliardSales += Number(tx.billiardTotal || 0);

                // Robust Cafe Total: Use column if > 0, otherwise sum orderItems
                let txCafe = Number(tx.cafeTotal || 0);
                if (txCafe === 0 && tx.orderItems && tx.orderItems.length > 0) {
                    tx.orderItems.forEach((oi: any) => {
                        txCafe += Number(oi.price || 0) * Number(oi.quantity || 0);
                    });
                }
                totalCafeSales += txCafe;

                totalVat += Number(tx.vatAmount || 0);
                totalService += Number(tx.serviceChargeAmount || 0);
                totalDiscount += Number(tx.discountAmount || 0);
                totalRounding += Number(tx.roundingAmount || 0);
            }

            // Item aggregation
            if (tx.orderItems && Array.isArray(tx.orderItems)) {
                tx.orderItems.forEach((oi: any) => {
                    const menuId = oi.menuItemId || `custom-${oi.customName}`;
                    if (!dayItemCounts[menuId]) {
                        dayItemCounts[menuId] = { name: oi.menuItem?.name || oi.customName, qty: 0 };
                    }
                    dayItemCounts[menuId].qty += Number(oi.quantity);
                });
            }
        });

        const dayTopItems = Object.values(dayItemCounts)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 10);

        // Map shift summaries with the same logic
        const shiftSummaries = businessDay.shifts.map(shift => {
            const shiftTx = transactions.filter(t => t.shiftId === shift.id);
            const methods: any = {};
            let sTotalRevenue = 0;
            let sBilliardSales = 0;
            let sCafeSales = 0;
            let sTopUp = 0;
            let sRounding = 0;
            const sItemCounts: Record<string, { name: string, qty: number }> = {};

            shiftTx.forEach(tx => {
                const txPayments: { method: string, amount: number }[] = [];
                if (tx.payments && tx.payments.length > 0) {
                    tx.payments.forEach(p => {
                        txPayments.push({ method: p.paymentMethod, amount: Number(p.totalPaid) });
                    });
                } else if (tx.paymentDetails && Array.isArray(tx.paymentDetails)) {
                    tx.paymentDetails.forEach((p: any) => {
                        txPayments.push({ method: p.method || 'UNKNOWN', amount: Number(p.amount) });
                    });
                } else if (Number(tx.paidAmount) > 0) {
                    txPayments.push({ method: (tx as any).paymentMethod || 'CASH', amount: Number(tx.paidAmount) });
                }

                txPayments.forEach(p => {
                    const m = p.method.toUpperCase();
                    methods[m] = (methods[m] || 0) + p.amount;
                    if (m !== 'MEMBER' && m !== 'MEMBERSHIP') {
                        sTotalRevenue += p.amount;
                    }
                });

                if (tx.type === 'TOPUP') {
                    sTopUp += Number(tx.grandTotal || 0);
                } else {
                    sBilliardSales += Number(tx.billiardTotal || 0);
                    sCafeSales += Number(tx.cafeTotal || 0);
                    sRounding += Number(tx.roundingAmount || 0);
                }

                if (tx.orderItems && Array.isArray(tx.orderItems)) {
                    tx.orderItems.forEach((oi: any) => {
                        const menuId = oi.menuItemId || `custom-${oi.customName}`;
                        if (!sItemCounts[menuId]) {
                            sItemCounts[menuId] = { name: oi.menuItem?.name || oi.customName, qty: 0 };
                        }
                        sItemCounts[menuId].qty += Number(oi.quantity);
                    });
                }
            });

            const roleName = (shift.user?.role?.name || '').toUpperCase();
            const isWaiter = roleName.includes('WAITER') || roleName.includes('PELAYAN');

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
                cafeRevenue: isWaiter ? 0 : sCafeSales,
                topUpRevenue: isWaiter ? 0 : sTopUp,
                roundingAmount: isWaiter ? 0 : sRounding,
                paymentMethods: isWaiter ? {} : methods,
                topItems: isWaiter ? [] : Object.values(sItemCounts).sort((a, b) => b.qty - a.qty).slice(0, 5),
                discrepancy: shift.discrepancy,
                latenessMinutes: shift.latenessMinutes,
                overtimeMinutes: shift.overtimeMinutes
            };
        });

        // Enrich each transaction: override paymentDetails with data from the
        // authoritative `payments` relation (TransactionPayment entity) so the
        // frontend always sees the correct payment method (MEMBER, CASH, QRIS, etc.)
        const enrichedTransactions = transactions.map(tx => {
            let resolvedPaymentDetails: { method: string; amount: number; payer: string; paymentId: number }[];

            if (tx.payments && tx.payments.length > 0) {
                // Use the formal payment records — most accurate source
                resolvedPaymentDetails = tx.payments.map(p => ({
                    method: p.paymentMethod,      // e.g. 'MEMBER', 'CASH', 'QRIS'
                    amount: Number(p.totalPaid),
                    payer: p.payerName || tx.customerName || 'Payer',
                    paymentId: p.id,
                }));
            } else if (tx.paymentDetails && Array.isArray(tx.paymentDetails) && tx.paymentDetails.length > 0) {
                // Fallback to JSON column but normalize unknown methods
                resolvedPaymentDetails = tx.paymentDetails.map((p: any) => ({
                    method: p.method || 'UNKNOWN',
                    amount: Number(p.amount || 0),
                    payer: p.payer || tx.customerName || 'Payer',
                    paymentId: p.paymentId,
                }));
            } else if (Number(tx.paidAmount) > 0) {
                // Last resort: single lump payment
                resolvedPaymentDetails = [{
                    method: (tx as any).paymentMethod || 'UNKNOWN',
                    amount: Number(tx.paidAmount),
                    payer: tx.customerName || 'Customer',
                    paymentId: 0,
                }];
            } else {
                resolvedPaymentDetails = [];
            }

            return {
                ...tx,
                paymentDetails: resolvedPaymentDetails,
            };
        });

        return {
            businessDay,
            summary: {
                totalRevenue, // External Omzet (excludes MEMBER payments)
                billiardRevenue: totalBilliardSales,
                cafeRevenue: totalCafeSales,
                topUpRevenue: totalTopUp,
                totalVat,
                totalService,
                totalDiscount,
                totalRounding,
                totalAwardedPoints: transactions.reduce((sum, tx) => sum + Number((tx as any).awardedPoints || 0), 0),
                totalMemberUsage: Object.entries(dayPaymentMethods).reduce((sum, [method, amount]) => {
                    return (method === 'MEMBER' || method === 'MEMBERSHIP') ? sum + amount : sum;
                }, 0),
                transactionCount: transactions.length,
                topItems: dayTopItems,
                paymentMethods: dayPaymentMethods
            },
            shifts: shiftSummaries,
            transactions: enrichedTransactions
        };
    }

    /**
     * Menutup Business Day (Closing Harian)
     */
    async closeBusinessDay(id: number): Promise<BusinessDay> {
        const businessDay = await this.businessDayRepo.findOneBy({ id });
        if (!businessDay) throw new NotFoundException('Business Day tidak ditemukan.');

        // Pastikan semua shift sudah CLOSED
        const openShifts = await this.shiftRepo.count({
            where: { businessDayId: id, status: ShiftStatus.OPEN }
        });

        if (openShifts > 0) {
            throw new ConflictException(`Gagal tutup buku: Masih ada ${openShifts} shift yang belum ditutup.`);
        }

        businessDay.isClosed = true;
        businessDay.endTime = new Date();

        // Hitung total akhir
        const transactions = await this.transactionRepo.find({ where: { businessDayId: id } });
        businessDay.totalRevenue = transactions.reduce((sum, t) => sum + Number(t.grandTotal), 0);
        businessDay.totalTopUp = transactions
            .filter(t => t.type === 'TOPUP')
            .reduce((sum, t) => sum + Number(t.grandTotal || 0), 0);

        return this.businessDayRepo.save(businessDay);
    }
    /**
     * Mendapatkan daftar semua Business Day
     */
    async getBusinessDays(): Promise<BusinessDay[]> {
        return this.businessDayRepo.find({
            order: { date: 'DESC', id: 'DESC' }
        });
    }

    /**
     * Find the waiter currently assigned to a table in an open shift
     */
    async findAssignedWaiterForTable(type: 'CAFE' | 'BILLIARD', tableId: number): Promise<number | null> {
        const openShifts = await this.getOpenShifts();
        for (const shift of openShifts) {
            if (shift.assignedTableIds && Array.isArray(shift.assignedTableIds)) {
                const isAssigned = shift.assignedTableIds.some(t => t.type === type && Number(t.id) === Number(tableId));
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
     */
    async findActiveCashierShift(): Promise<Shift | null> {
        const openShifts = await this.shiftRepo.find({
            where: { status: ShiftStatus.OPEN },
            relations: ['user', 'user.role'],
            order: { startTime: 'DESC' }
        });

        // Find first open shift whose user has a cashier/kasir role
        const cashierShift = openShifts.find(shift => {
            const roleName = (shift.user?.role?.name || '').toUpperCase();
            return roleName.includes('KASIR') || roleName.includes('CASHIER');
        });

        return cashierShift ?? null;
    }
}
