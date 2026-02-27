import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { Shift, ShiftStatus } from './entities/shift.entity';
import { BusinessDay } from './entities/business-day.entity';
import { Transaction, TransactionStatus, TransactionType } from '../transaction/entities/transaction.entity';
import { User } from '../user/entities/user.entity';
import { Setting } from '../settings/entities/setting.entity';
import { Expense } from './entities/expense.entity';
import { EventsGateway } from '../socket/events.gateway';

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

        // 1. Modal Awal
        const openingCash = Number(shift.cashStart || 0);

        // 2. Total Tunai Masuk dari Transaksi
        const transactions = await this.transactionRepo.find({
            where: { shiftId }
        });

        let totalCashIn = 0;
        transactions.forEach(tx => {
            if (tx.paymentDetails && Array.isArray(tx.paymentDetails)) {
                tx.paymentDetails.forEach((p: any) => {
                    if (p.method?.toUpperCase() === 'CASH') {
                        totalCashIn += Number(p.amount);
                    }
                });
            } else if (tx.paymentDetails && (tx.paymentDetails as any).method?.toUpperCase() === 'CASH') {
                totalCashIn += Number((tx.paymentDetails as any).amount);
            }
        });

        // 3. Total Pengeluaran Kas selama shift ini
        const expenses = await this.expenseRepo.find({
            where: { shiftId }
        });
        const totalCashOut = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

        return openingCash + totalCashIn - totalCashOut;
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
        return this.userRepo.save(user);
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
            relations: ['orderItems', 'orderItems.menuItem', 'orderItems.menuItem.category', 'table', 'cafeTable', 'createdBy', 'createdBy.role'],
            order: { createdAt: 'DESC' }
        });

        // Ensure shifts are sorted newest first
        businessDay.shifts.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

        // Grouping by Shift
        const shiftSummaries = businessDay.shifts.map(shift => {
            const shiftTx = transactions.filter(t => t.shiftId === shift.id);
            const methods: any = {};
            let total = 0;
            let billiardTotal = 0;
            let cafeTotal = 0;
            let topUpTotal = 0;
            const itemCounts: Record<string, { name: string, qty: number }> = {};

            shiftTx.forEach(tx => {
                const txGrandTotal = Number(tx.grandTotal || 0);
                total += txGrandTotal;

                if (tx.type === 'TOPUP') {
                    topUpTotal += txGrandTotal;
                } else {
                    billiardTotal += Number(tx.billiardTotal || 0);
                    cafeTotal += Number(tx.cafeTotal || 0);
                }

                // Payment methods
                if (tx.paymentDetails && Array.isArray(tx.paymentDetails)) {
                    tx.paymentDetails.forEach((p: any) => {
                        const m = (p.method || 'UNKNOWN').toUpperCase();
                        methods[m] = (methods[m] || 0) + Number(p.amount);
                    });
                } else if (tx.paymentDetails) {
                    const m = (tx.paymentDetails.method || 'UNKNOWN').toUpperCase();
                    methods[m] = (methods[m] || 0) + Number(tx.paymentDetails.amount);
                }

                // Item aggregation
                if (tx.orderItems && Array.isArray(tx.orderItems)) {
                    tx.orderItems.forEach((oi: any) => {
                        const menuId = oi.menuItemId || `custom-${oi.customName}`;
                        if (!itemCounts[menuId]) {
                            itemCounts[menuId] = { name: oi.menuItem?.name || oi.customName, qty: 0 };
                        }
                        itemCounts[menuId].qty += Number(oi.quantity);
                    });
                }
            });

            const topItems = Object.values(itemCounts)
                .sort((a, b) => b.qty - a.qty)
                .slice(0, 5);

            return {
                shiftId: shift.id,
                userName: shift.user?.name || 'Unknown',
                userRole: shift.user?.role?.name || 'UNKNOWN',
                shiftName: shift.shiftName || 'N/A',
                startTime: shift.startTime,
                endTime: shift.endTime,
                totalRevenue: total,
                billiardRevenue: billiardTotal,
                cafeRevenue: cafeTotal,
                topUpRevenue: topUpTotal,
                paymentMethods: methods,
                topItems: topItems,
                discrepancy: shift.discrepancy,
                latenessMinutes: shift.latenessMinutes,
                overtimeMinutes: shift.overtimeMinutes
            };
        });

        // Overall Top Items for Business Day
        const dayItemCounts: Record<string, { name: string, qty: number }> = {};
        transactions.forEach(tx => {
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

        return {
            businessDay,
            summary: {
                totalRevenue: transactions.reduce((sum, t) => sum + Number(t.grandTotal), 0),
                billiardRevenue: transactions.filter(t => t.type !== 'TOPUP').reduce((sum, t) => sum + Number(t.billiardTotal || 0), 0),
                cafeRevenue: transactions.filter(t => t.type !== 'TOPUP').reduce((sum, t) => sum + Number(t.cafeTotal || 0), 0),
                topUpRevenue: transactions.filter(t => t.type === 'TOPUP').reduce((sum, t) => sum + Number(t.grandTotal || 0), 0),
                transactionCount: transactions.length,
                topItems: dayTopItems
            },
            shifts: shiftSummaries,
            transactions: transactions
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
}
