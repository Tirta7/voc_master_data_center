import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { Transaction, TransactionStatus, TransactionType } from './entities/transaction.entity';
import { OrderItem, OrderItemStatus } from '../cafe/entities/order-item.entity';
import { TableStatus } from '../billiard/entities/table.entity';
import { SettingsService } from '../settings/settings.service';
import { FinanceService } from '../finance/finance.service';
import { CashflowType } from '../finance/entities/cashflow.entity';
import { Table } from '../billiard/entities/table.entity';
import { BilliardGateway } from '../socket/billiard.gateway';
import { TransactionPayment } from './entities/transaction-payment.entity';
import { InvoiceService } from './invoice.service';
import { HardwareService } from '../hardware/hardware.service';
import { ShiftService } from '../finance/shift.service';

import { BilliardPackage, PackageType } from '../billiard/entities/billiard-package.entity';
import { CafeTable, CafeTableStatus } from '../cafe-table/entities/cafe-table.entity';
import { PromoService } from '../promo/promo.service';
import { ReportService } from '../report/report.service';
import { Member } from '../member/entities/member.entity';
import { MemberService } from '../member/member.service';

@Injectable()
export class TransactionService {
    private readonly logger = new Logger(TransactionService.name);

    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
        @InjectRepository(OrderItem)
        private readonly orderItemRepository: Repository<OrderItem>,
        @InjectRepository(Table)
        private readonly tableRepository: Repository<Table>,
        @InjectRepository(BilliardPackage)
        private readonly packageRepository: Repository<BilliardPackage>,
        @InjectRepository(CafeTable)
        private readonly cafeTableRepository: Repository<CafeTable>,
        @InjectRepository(TransactionPayment)
        private readonly transactionPaymentRepository: Repository<TransactionPayment>,
        @InjectRepository(Member)
        private readonly memberRepository: Repository<Member>,
        private readonly settingsService: SettingsService,
        private readonly financeService: FinanceService,
        private readonly billiardGateway: BilliardGateway,
        private readonly promoService: PromoService,
        private readonly invoiceService: InvoiceService,
        private readonly hardwareService: HardwareService,
        private readonly reportService: ReportService,
        @Inject(forwardRef(() => ShiftService))
        private readonly shiftService: ShiftService,
        private readonly memberService: MemberService,
    ) { }

    async createTransaction(tableId?: number, userId?: number, cafeTableId?: number, packageId?: number, fareName?: string): Promise<Transaction> {
        this.logger.log(`Creating transaction for tableId: ${tableId}, cafeTableId: ${cafeTableId}`);
        try {
            const now = new Date();
            const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '');
            const hhmmss = now.toTimeString().slice(0, 8).replace(/:/g, '');
            const invoiceNumber = `TAB-${yymmdd}${hhmmss}`;

            // Safety check for forward-referenced ShiftService
            if (!this.shiftService) {
                this.logger.error('ShiftService is not yet initialized (Circular Dependency?)');
                throw new Error('Internal Server Error: ShiftService unavailable');
            }

            // Automatic commission attribution based on table assignments
            let commissionUserId = userId;
            if (tableId) {
                const waiterId = await this.shiftService.findAssignedWaiterForTable('BILLIARD', tableId);
                if (waiterId) commissionUserId = waiterId;
            } else if (cafeTableId) {
                const waiterId = await this.shiftService.findAssignedWaiterForTable('CAFE', cafeTableId);
                if (waiterId) commissionUserId = waiterId;
            }

            // Link to the current reporting day and shift immediately for operational history visibility
            const activeDay = await this.shiftService.getOrCreateActiveBusinessDay();
            const activeShift = userId ? await this.shiftService.getActiveShift(userId) : null;

            const transaction = new Transaction();
            transaction.invoiceNumber = invoiceNumber;
            transaction.packageId = (packageId ?? null) as any;
            transaction.fareName = fareName ?? null;
            transaction.tableId = tableId || null;
            transaction.cafeTableId = cafeTableId || null;
            transaction.status = TransactionStatus.UNPAID;
            transaction.type = tableId ? TransactionType.BILLIARD : (cafeTableId ? TransactionType.CAFE : TransactionType.BILLIARD);
            transaction.createdByUserId = (userId ?? null) as any;
            transaction.openedByUserId = (userId ?? null) as any;
            transaction.commissionUserId = (commissionUserId ?? null) as any;
            transaction.businessDayId = activeDay.id;
            transaction.shiftId = (activeShift?.id ?? null) as any;

            const saved = await this.transactionRepository.save(transaction);
            return saved;
        } catch (error) {
            this.logger.error(`FAILED TO CREATE TRANSACTION: ${error.message}`, error.stack);
            throw error;
        }
    }

    async updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction> {
        await this.transactionRepository.update(id, data);
        return this.updateTotals(id);
    }

    async getActiveTransactionByTable(tableId: number): Promise<Transaction | null> {
        const results = await this.getActiveTransactionsByTableIds([tableId]);
        if (results.length === 0) return null;
        return this.calculateTransientTotals(results[0]);
    }

    async getActiveTransactionsByTableIds(tableIds: number[]): Promise<Transaction[]> {
        if (!tableIds.length) return [];

        const transactions = await this.transactionRepository.find({
            where: {
                tableId: In(tableIds),
                status: In([TransactionStatus.UNPAID, TransactionStatus.PARTIAL, TransactionStatus.PAID])
            },
            relations: ['orderItems', 'orderItems.menuItem', 'orderItems.menuItem.category', 'table', 'payments', 'openedBy', 'createdBy', 'member', 'member.tier'],
            order: { createdAt: 'DESC' }
        });

        // Filter out PAID transactions for already available tables
        const activeTransactions = transactions.filter(tr => {
            if (tr.status === TransactionStatus.PAID) {
                return tr.table && tr.table.status !== TableStatus.AVAILABLE;
            }
            return true;
        });

        // Batch fetch packages if needed
        const packageIds = activeTransactions
            .filter(tr => tr.table?.packageId)
            .map(tr => tr.table!.packageId);

        const packageMap = new Map<number, any>();
        if (packageIds.length > 0) {
            const packages = await this.packageRepository.findBy({ id: In(packageIds) });
            packages.forEach(pkg => packageMap.set(pkg.id, pkg));
        }

        // Process each transaction for transient data
        const now = new Date();
        for (const transaction of activeTransactions) {
            await this.calculateBilliardTransient(transaction, packageMap);
            await this.calculateTransientTotals(transaction);
        }

        return activeTransactions;
    }

    async getActiveTransactionByCafeTable(cafeTableId: number): Promise<Transaction | null> {
        const tx = await this.transactionRepository.findOne({
            where: {
                cafeTableId,
                status: In([TransactionStatus.UNPAID, TransactionStatus.PARTIAL])
            },
            relations: ['orderItems', 'orderItems.menuItem', 'orderItems.menuItem.category', 'cafeTable', 'payments', 'member', 'member.tier'],
            order: { createdAt: 'DESC' }
        });

        if (!tx) return null;
        return this.calculateTransientTotals(tx);
    }

    /**
     * Centralized calculation logic for all transaction vitals.
     * Use this to ensure Subtotal + SC + VAT + Rounding ALWAYS equals Grand Total.
     *
     * BILLING SEGREGATION PRINCIPLE:
     * Items with isPaid=true have already been charged to the member's wallet at order time.
     * They must NOT be included in the grand total here to prevent double billing.
     * Similarly, if billiardTotal is already covered by a MEMBER payment (prepaid), it contributes 0.
     */
    private getTierDiscountPercentage(cfg: any, categoryName: string): number {
        const catUpper = String(categoryName || 'LAINNYA').trim().toUpperCase();
        let percent = 0;
        let found = false;

        // 1. Priority: Exact or Bidirectional Prefix Match
        // We look for the "best" match (prioritizing longer keys for more specificity)
        const entries = Object.entries(cfg).sort((a, b) => b[0].length - a[0].length);

        for (const [k, v] of entries) {
            const keyUpper = k.trim().toUpperCase();
            // Match if categories are identical, or if category starts with key (e.g. key "FOOD" matches "FOOD & BEV")
            // or if key starts with category (e.g. key "FOOD & BEV" matches "FOOD")
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

    private calculateVitals(transaction: Transaction, settings: any): {
        session: Partial<Transaction> & { tierDiscountAmount: number };
        remaining: Partial<Transaction> & { tierDiscountAmount: number; effectiveBilliardTotal: number };
    } {
        let billiardTotal = Number(transaction.billiardTotal || 0);
        const orderItems = transaction.orderItems || [];

        // --- SESSION TOTAL CALCULATION (Everything from start to finish) ---
        const sessionCategoryTotals: Record<string, number> = {};
        orderItems.forEach(item => {
            if (item.status?.toUpperCase() === 'CANCELLED') return;
            const lineTotal = Number(item.priceAtOrder || 0) * Number(item.quantity || 0);
            const category = item.menuItem?.category;
            const categoryName = (typeof category === 'object' ? (category?.name || 'LAINNYA') : (category || 'LAINNYA'));
            const catUpper = String(categoryName).trim().toUpperCase();
            sessionCategoryTotals[catUpper] = (sessionCategoryTotals[catUpper] || 0) + lineTotal;
        });

        // --- REMAINING BALANCE CALCULATION (Unpaid only) ---
        const memberBilliardPaid = (transaction.payments || [])
            .filter(p => (p.paymentMethod === 'MEMBER' || p.paymentMethod === 'MEMBERSHIP') && Number(p.billiardPortion) > 0)
            .reduce((sum: number, p: any) => sum + Number(p.billiardPortion), 0);

        const legacyBilliardPaid = (Array.isArray(transaction.paymentDetails) ? transaction.paymentDetails : [])
            .filter((p: any) => (p.method === 'MEMBER' || p.method === 'MEMBERSHIP') && Number(p.billiardPortion) > 0)
            .reduce((sum: number, p: any) => sum + Number(p.billiardPortion), 0);

        const toNumOverall = (val: any) => {
            const n = Number(val);
            return isNaN(n) ? 0 : n;
        };

        const totalBilliardPaid = Math.max(0, toNumOverall(memberBilliardPaid)); // Legacy logic used max(member, legacy)
        const effectiveBilliardTotal = Math.max(0, toNumOverall(billiardTotal) - totalBilliardPaid);

        const unpaidCategoryTotals: Record<string, number> = {};
        orderItems.forEach(item => {
            if (item.status?.toUpperCase() === 'CANCELLED' || item.isPaid) return;
            const lineTotal = toNumOverall(item.priceAtOrder) * toNumOverall(item.quantity);
            const category = item.menuItem?.category;
            const categoryName = (typeof category === 'object' ? (category?.name || 'LAINNYA') : (category || 'LAINNYA'));
            const catUpper = String(categoryName).trim().toUpperCase();
            unpaidCategoryTotals[catUpper] = (unpaidCategoryTotals[catUpper] || 0) + lineTotal;
        });

        const toNum = (val: any) => {
            const n = Number(val);
            return isNaN(n) ? 0 : n;
        };

        const computeSet = (billPortion: number, catTotals: Record<string, number>) => {
            const cafeTotal = Object.values(catTotals).reduce((sum, val) => sum + toNum(val), 0);
            const subtotal = toNum(billPortion) + cafeTotal;
            let discount = 0;

            const member = transaction.member;
            if (member && member.tier && member.tier.discountConfig) {
                const cfg = member.tier.discountConfig as any;
                const billiardDiscPercent = toNum(cfg.billiardOpen || cfg.billiardPackage);
                const billiardDisc = toNum(billPortion) * (billiardDiscPercent / 100);

                let cafeDisc = 0;

                // --- NEW PERSISTENT DISCOUNT LOGIC ---
                // We sum up the pre-calculated discountAmount from the order items themselves.
                // This ensures that "locked-in" prices are respected.
                const totalItemDiscounts = Object.values(transaction.orderItems || [])
                    .filter(item => item.status?.toUpperCase() !== 'CANCELLED' && !item.isPaid) // Only for current unpaid set
                    .reduce((sum, item) => sum + toNum(item.discountAmount), 0);

                // Note: The 'catTotals' passed to computeSet already filters for relevant items (session vs unpaid).
                // However, the original logic used dynamic calculation. For robustness, 
                // we'll check if the items actually have discountAmount set.
                const hasPersistentDiscounts = (transaction.orderItems || []).some(i => toNum(i.discountAmount) > 0);

                if (hasPersistentDiscounts) {
                    // Logic for unpaid/remaining set needs to be careful: 
                    // computeSet is called for both 'session' (all items) and 'remaining' (unpaid items).
                    // catTotals correctly reflects the set.

                    // Improved cafe discount calculation:
                    const setItemIds = new Set((transaction.orderItems || []).filter(i => {
                        const cat = i.menuItem?.category;
                        const catName = typeof cat === 'object' ? cat?.name : cat;
                        const catUpper = String(catName || 'LAINNYA').trim().toUpperCase();
                        return catTotals[catUpper] !== undefined;
                    }).map(i => i.id));

                    cafeDisc = (transaction.orderItems || [])
                        .filter(i => setItemIds.has(i.id) && i.status?.toUpperCase() !== 'CANCELLED')
                        .reduce((sum, i) => sum + toNum(i.discountAmount), 0);
                } else {
                    // Fallback to dynamic calculation if no persistent discounts found (legacy items)
                    const cats = Object.keys(catTotals);
                    for (const catUpper of cats) {
                        const percent = this.getTierDiscountPercentage(cfg, catUpper);
                        cafeDisc += toNum(catTotals[catUpper]) * (percent / 100);
                    }
                }

                discount = Math.round(billiardDisc + cafeDisc);
            }

            const discountedSub = Math.max(0, subtotal - discount);
            const sc = Math.round(discountedSub * (toNum(settings.serviceChargePercentage) / 100));
            // VAT applies to (Subtotal - Discount + Service Charge)
            const vat = Math.round((discountedSub + sc) * (toNum(settings.ppnPercentage) / 100));
            const rawTotal = discountedSub + sc + vat;
            const kelipatan = Math.max(1, toNum(settings.roundingKelipatan));
            const grand = isNaN(rawTotal) ? 0 : Math.ceil(rawTotal / kelipatan) * kelipatan;

            return {
                cafeTotal,
                tierDiscountAmount: isNaN(discount) ? 0 : discount,
                discountAmount: isNaN(discount) ? 0 : discount,
                serviceChargeAmount: isNaN(sc) ? 0 : sc,
                vatAmount: isNaN(vat) ? 0 : vat,
                roundingAmount: isNaN(grand - rawTotal) ? 0 : grand - rawTotal,
                grandTotal: isNaN(grand) ? 0 : grand,
                billiardTotal: toNum(billPortion)
            };
        };

        return {
            session: computeSet(billiardTotal, sessionCategoryTotals),
            remaining: {
                ...computeSet(effectiveBilliardTotal, unpaidCategoryTotals),
                effectiveBilliardTotal
            }
        };
    }

    /**
     * Internal method to calculate vitals without saving to DB (for real-time GETs)
     */
    async calculateTransientTotals(transaction: Transaction): Promise<Transaction> {
        // Ensure billiard total is calculated if this is a billiard transaction with a valid start time.
        // We run this even if table is AVAILABLE to support historical log reconstruction (reprints).
        if (transaction.type === TransactionType.BILLIARD && (transaction.startTime || transaction.table?.startTime)) {
            await this.calculateBilliardTransient(transaction);
        }

        const settings = await this.settingsService.getSettings();
        const { session, remaining } = this.calculateVitals(transaction, settings);

        // For real-time display (GET), we show the REMAINING balance as the grand total 
        // to help the cashier know what's due NOW.
        Object.assign(transaction, remaining);

        // Promo Evaluation (Promo engine works ON TOP of tier discounts or alongside them)
        let billiardMins = 0;
        const calcStart = transaction.table?.startTime || transaction.startTime;
        const calcEnd = (transaction.table?.status && transaction.table.status !== TableStatus.AVAILABLE)
            ? new Date()
            : (transaction.endTime || new Date());

        if (calcStart && calcEnd) {
            billiardMins = Math.round((new Date(calcEnd).getTime() - new Date(calcStart).getTime()) / 60000);
            if (isNaN(billiardMins)) billiardMins = 0;
        }

        const { discounts, appliedPromos } = await this.promoService.evaluatePromos(transaction.orderItems || [], billiardMins);
        const totalPromoDiscount = discounts.reduce((sum, d) => sum + Number(d.amount || 0), 0);
        transaction.appliedPromos = appliedPromos;

        if (totalPromoDiscount > 0) {
            const subtotal = (Number(remaining.billiardTotal) || 0) + (Number(remaining.cafeTotal) || 0);
            const tierDisc = Number(remaining.tierDiscountAmount) || 0;
            const discountedSubtotal = Math.max(0, subtotal - tierDisc - totalPromoDiscount);

            const scPercent = Number(settings.serviceChargePercentage || 0) / 100;
            const vatPercent = Number(settings.ppnPercentage || 0) / 100;

            const serviceCharge = Math.round(discountedSubtotal * scPercent);
            const vat = Math.round((discountedSubtotal + serviceCharge) * vatPercent);
            const rawTotal = discountedSubtotal + serviceCharge + vat;
            const kelipatan = Math.max(1, Number(settings.roundingKelipatan || 1));
            const roundedTotal = Math.ceil(rawTotal / kelipatan) * kelipatan;

            transaction.serviceChargeAmount = serviceCharge;
            transaction.vatAmount = vat;
            transaction.roundingAmount = roundedTotal - rawTotal;
            transaction.grandTotal = roundedTotal;
            transaction.discountAmount = (remaining.tierDiscountAmount || 0) + totalPromoDiscount;
        }

        // Attach full session vitals as a transient property for receipt previews
        transaction.sessionTotals = session as any;

        return transaction;
    }

    private async calculateBilliardTransient(transaction: Transaction, packageMap?: Map<number, any>) {
        const table = transaction.table;
        const startTime = table?.startTime || (transaction.startTime ? new Date(transaction.startTime) : null);
        const endTime = new Date((table?.status && table.status !== TableStatus.AVAILABLE)
            ? (table.endTime || new Date())
            : (transaction.endTime || new Date()));
        const packageId = table?.packageId || transaction.packageId; // Fallback to hidden packageId if any
        const sessionType = table?.sessionType || transaction.sessionType || 'open';

        // Essential: If no start time or invalid dates, we can't calculate anything
        if (!startTime || isNaN(new Date(startTime).getTime()) || isNaN(endTime.getTime())) return;

        // 1. Resolve Package
        let pkg = null;
        const effectivePackageId = packageId || transaction.billiardPackage?.id;

        if (effectivePackageId) {
            if (packageMap) {
                pkg = packageMap.get(effectivePackageId);
            }
            if (!pkg) {
                pkg = await this.packageRepository.findOneBy({ id: effectivePackageId });
            }
        }

        // Attach package to transaction for receipt/UI display
        if (pkg) {
            transaction.billiardPackage = pkg;
        }

        // 2. Calculate Billing Details (for OPEN TABLE)
        if (sessionType === 'open') {
            const pricing = this.calculateTimeBasedPrice(startTime, endTime, pkg || { minutePrice: 50000 / 60 });

            // Only overwrite if billiardTotal is not already a hard-coded session total
            if (Number(transaction.billiardTotal || 0) === 0) {
                transaction.billiardTotal = pricing.total;
            }
            transaction.billingDetails = pricing.details;

            const elapsedMins = Math.round((endTime.getTime() - new Date(startTime).getTime()) / 60000);
            if (!isNaN(elapsedMins)) {
                const hours = Math.floor(elapsedMins / 60);
                const minutes = elapsedMins % 60;
                transaction.sessionDuration = `${hours} Hour : ${minutes} Minute : 00 Second`;
            }
        }
        // 3. Handle PREPAID
        else if (sessionType === 'prepaid') {
            const activePrice = table?.activePackagePrice || transaction.billiardTotal;
            transaction.billiardTotal = Number(activePrice);

            // Populate billing details for prepaid sessions too (for report transparency)
            transaction.billingDetails = [{
                title: pkg?.name || transaction.fareName || 'Prepaid Session',
                duration: pkg?.durationMinutes || Math.round((endTime.getTime() - new Date(startTime).getTime()) / 60000),
                subtotal: Number(activePrice),
                ratePerHour: pkg?.type === PackageType.FIXED ? Number(activePrice) : (Number(pkg?.minutePrice || 0) * 60),
                startTimeFormatted: new Date(startTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(/:/g, '.'),
                endTimeFormatted: new Date(endTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(/:/g, '.'),
            }];

            const diffMs = endTime.getTime() - new Date(startTime).getTime();
            const totalMins = Math.round(diffMs / 60000);
            if (!isNaN(totalMins)) {
                const hours = Math.floor(totalMins / 60);
                const minutes = totalMins % 60;
                transaction.sessionDuration = `${hours} Hour : ${minutes} Minute : 00 Second`;
            }
        }
    }

    /**
     * Calculates the currently active price for a package, considering time slots and fallbacks.
     * Uses GMT+7 (WIB) time for slot matching.
     */
    calculateCurrentPackagePrice(pkg: any): number {
        const now = new Date();
        const timeVal = now.getHours() * 60 + now.getMinutes();

        let activePrice = Number(pkg.price || 0);

        if (pkg.timeSlots && pkg.timeSlots.length > 0) {
            let matchedAny = false;
            for (const slot of pkg.timeSlots) {
                const [sH, sM] = slot.start.split(':').map(Number);
                const [eH, eM] = slot.end.split(':').map(Number);
                const slotStart = sH * 60 + sM;
                const slotEnd = eH * 60 + eM;

                let isMatch = false;
                if (slotEnd < slotStart) { // Midnight crossover
                    if (timeVal >= slotStart || timeVal < slotEnd) isMatch = true;
                } else {
                    if (timeVal >= slotStart && timeVal < slotEnd) isMatch = true;
                }

                if (isMatch) {
                    activePrice = Number(slot.price);
                    matchedAny = true;
                    break;
                }
            }

            // Fallback: If no match and activePrice is 0, use first slot price or a default
            if (!matchedAny && activePrice === 0) {
                activePrice = Number(pkg.timeSlots[0].price);
            }
        }

        // Absolute fallback to prevent Rp 0 if needed, but per user request we follow settings
        if (activePrice === 0) {
            if (pkg.minutePrice && Number(pkg.minutePrice) > 0) {
                activePrice = Number(pkg.minutePrice) * 60;
            }
        }

        return activePrice;
    }

    /**
     * Calculates the time-based price given a startTime, endTime (or now), and a package configuration.
     * Uses GMT+7 awareness.
     */
    calculateTimeBasedPrice(startTime: Date, endTime: Date, pkg: any): { total: number, details: any[] } {
        const start = new Date(startTime);
        const end = new Date(endTime);
        let total = 0;
        const details: any[] = [];

        // If no time slots, use simple minute price or default calculation
        if (!pkg.timeSlots || pkg.timeSlots.length === 0) {
            const actualDurationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);

            // ENFORCE MINIMUM 1 HOUR RULE (3600 seconds)
            const billedDurationSeconds = Math.max(3600, actualDurationSeconds);

            const ratePerHour = Number(pkg.minutePrice || 0) * 60;
            const price = (ratePerHour / 3600) * billedDurationSeconds;

            total = Math.round(price);

            const durationMinutes = Math.floor(billedDurationSeconds / 60);
            details.push({
                title: 'Regular Rate',
                duration: durationMinutes,
                subtotal: Math.round(price),
                ratePerHour: ratePerHour,
                startTimeFormatted: start.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(/:/g, '.'),
                endTimeFormatted: end.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(/:/g, '.'),
            });
            return { total, details };
        }

        // ENFORCE MINIMUM 1 HOUR RULE (3600 seconds) for the calculation loop
        const actualDurationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
        const calculationEndSeconds = Math.max(3600, actualDurationSeconds);
        const calculationEnd = new Date(start.getTime() + calculationEndSeconds * 1000);

        // We iterate and group by segments per second
        let current = new Date(start);
        let currentSegment: any = null;

        while (current < calculationEnd) {
            const timeVal = Number(current.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', timeZone: 'Asia/Jakarta' })) * 60 +
                Number(current.toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', timeZone: 'Asia/Jakarta' }));

            let matchedSlot = null;
            for (const slot of pkg.timeSlots) {
                if (!slot?.start || !slot?.end) continue;
                const [sH, sM] = slot.start.split(':').map(Number);
                const [eH, eM] = slot.end.split(':').map(Number);
                const slotStart = sH * 60 + sM;
                const slotEnd = eH * 60 + eM;

                let isMatch = false;
                if (slotEnd < slotStart) { // Midnight crossover
                    if (timeVal >= slotStart || timeVal < slotEnd) isMatch = true;
                } else {
                    if (timeVal >= slotStart && timeVal < slotEnd) isMatch = true;
                }

                if (isMatch) {
                    matchedSlot = slot;
                    break;
                }
            }

            const slotName = matchedSlot ? `${matchedSlot.start}-${matchedSlot.end}` : 'Default Rate';
            const slotRate = matchedSlot ? Number(matchedSlot.price) : (Number(pkg.minutePrice || 0) * 60 || 50000);
            const secondRate = slotRate / 3600; // Calculate cost per second

            if (!currentSegment || currentSegment.title !== slotName) {
                if (currentSegment) { // If there was a previous segment, finalize it
                    currentSegment.subtotal = Math.round(currentSegment.cost);
                    currentSegment.duration = Math.floor(currentSegment.duration / 60);
                    currentSegment.endTimeFormatted = current.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(/:/g, '.');
                    details.push(currentSegment);
                }
                currentSegment = {
                    title: slotName,
                    startTimeFormatted: current.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(/:/g, '.'),
                    duration: 0, // in seconds
                    cost: 0,
                    ratePerHour: slotRate
                };
            }

            currentSegment.duration += 60;
            currentSegment.cost += (secondRate * 60);
            current = new Date(current.getTime() + 60000); // Increment by 60 seconds (1 minute)
        }

        if (currentSegment) {
            currentSegment.subtotal = Math.round(currentSegment.cost);
            currentSegment.duration = Math.floor(currentSegment.duration / 60);
            currentSegment.endTimeFormatted = current.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(/:/g, '.');
            details.push(currentSegment);
        }

        total = details.reduce((sum, d) => sum + d.subtotal, 0);
        return { total: Math.round(total), details };
    }

    async getTransactionById(id: number): Promise<Transaction> {
        const transaction = await this.transactionRepository.findOne({
            where: { id },
            relations: ['table', 'cafeTable', 'orderItems', 'orderItems.menuItem', 'orderItems.menuItem.category', 'payments', 'openedBy', 'createdBy', 'member', 'member.tier'],
        });
        if (!transaction) throw new NotFoundException('Transaction not found');
        return await this.calculateTransientTotals(transaction);
    }

    /** Lightweight lookup for ledger display — returns only essential info */
    async getTransactionInfoByInvoice(invoiceNumber: string): Promise<{
        id: number;
        invoiceNumber: string;
        customerName: string | null;
        tableId: number | null;
        cafeTableId: number | null;
        tableName: string | null;
    }> {
        const tx = await this.transactionRepository.findOne({
            where: { invoiceNumber },
            relations: ['table', 'cafeTable'],
        });
        if (!tx) throw new NotFoundException('Transaction not found');
        return {
            id: tx.id,
            invoiceNumber: tx.invoiceNumber,
            customerName: tx.customerName ?? null,
            tableId: tx.tableId ?? null,
            cafeTableId: tx.cafeTableId ?? null,
            tableName: (tx.table as any)?.tableName ?? (tx.table as any)?.name ?? tx.cafeTable?.tableName ?? null,
        };
    }

    async moveTable(fromTableId: number, toTableId: number): Promise<void> {
        const transaction = await this.getActiveTransactionByTable(fromTableId);
        if (!transaction) throw new NotFoundException('No active transaction on source table');

        transaction.tableId = toTableId;
        await this.transactionRepository.save(transaction);
    }

    async mergeTransactions(sourceTableId: number, targetTableId: number): Promise<Transaction> {
        const sourceTx = await this.getActiveTransactionByTable(sourceTableId);
        const targetTx = await this.getActiveTransactionByTable(targetTableId);

        if (!sourceTx || !targetTx) throw new NotFoundException('Source or Target transaction not found');

        targetTx.billiardTotal = Number(targetTx.billiardTotal) + Number(sourceTx.billiardTotal);

        for (const item of sourceTx.orderItems) {
            item.transactionId = targetTx.id;
            await this.orderItemRepository.save(item);
        }

        sourceTx.status = TransactionStatus.PAID;
        sourceTx.paidAmount = sourceTx.grandTotal;
        sourceTx.remarks = `Merged into ${targetTx.invoiceNumber}`;

        await this.transactionRepository.save(sourceTx);
        return this.updateTotals(targetTx.id);
    }

    /**
     * Membayar item tertentu saja (Pay per Item)
     * Ditujukan untuk mencicil pembayaran cafe saat billing billiard masih jalan
     */
    async paySelectedItems(transactionId: number, orderItemIds: number[], paymentMethod: string): Promise<Transaction> {
        return this.processMultiPayerPayment(transactionId, {
            orderItemIds,
            paymentMethod,
            payerName: 'Partial Payment'
        });
    }

    /**
     * PROSES PEMBAYARAN MULTI-PAYER (REDESIGN)
     * Mendukung pembayaran per orang dengan rincian item tertentu.
     */
    async processMultiPayerPayment(
        transactionId: number,
        data: {
            orderItemIds: number[];
            payerName: string;
            paymentMethod: string;
            billiardPortion?: number
        },
        userId?: number
    ): Promise<Transaction> {
        try {
            const transaction = await this.getTransactionById(transactionId);
            if (!transaction) throw new NotFoundException('Transaction not found');

            const itemsToPay = (transaction.orderItems || []).filter(item => (data.orderItemIds || []).includes(item.id) && !item.isPaid);
            const billiardPortion = Math.max(0, Number(data.billiardPortion) || 0);

            if (itemsToPay.length === 0 && billiardPortion === 0) {
                return transaction;
            }

            // 1. Calculate Individual Payer Totals using centralized logic
            const settings = await this.settingsService.getSettings();
            const vitalsResult = this.calculateVitals({
                billiardTotal: billiardPortion,
                orderItems: itemsToPay,
                member: transaction.member
            } as any, settings);
            const vitals = vitalsResult.session; // For a single payer, 'session' and 'remaining' are the same here.

            const totalPaid = Number(vitals.grandTotal);
            const roundingAmount = Number(vitals.roundingAmount);
            const itemsSubtotal = Number(vitals.cafeTotal);
            const discountAmount = Number(vitals.discountAmount || 0);

            // 2. Create Payment Record (Do not use transaction object here to avoid circular saves)
            const paymentMethod = (data.paymentMethod || 'CASH').toUpperCase();

            // Handle Membership Payment for Split Bill
            if (paymentMethod === 'MEMBERSHIP' || paymentMethod === 'MEMBER') {
                if (!transaction.memberId) {
                    throw new Error('This transaction is not associated with a member');
                }
                await this.memberService.deductBalance(transaction.memberId, totalPaid);
            }

            const paymentRecord = this.transactionPaymentRepository.create({
                transactionId: transaction.id,
                payerName: data.payerName || 'Payer',
                itemsSubtotal,
                billiardPortion,
                taxAmount: Number(vitals.vatAmount),
                serviceAmount: Number(vitals.serviceChargeAmount),
                roundingAmount,
                discountAmount,
                totalPaid,
                paymentMethod: paymentMethod === 'MEMBERSHIP' ? 'MEMBER' : paymentMethod, // Normalize for DB consistency
                itemsSnapshot: itemsToPay.map(i => ({
                    name: i.menuItem?.name || 'Item',
                    displayName: i.customName || i.menuItem?.name || 'Item',
                    category: (typeof i.menuItem?.category === 'object' ? i.menuItem?.category?.name : i.menuItem?.category) || 'LAIN-LAIN',
                    qty: Number(i.quantity || 0),
                    price: Number(i.priceAtOrder || 0),
                    subtotal: Number(i.priceAtOrder || 0) * Number(i.quantity || 0),
                    bundleGroupId: i.bundleGroupId || null
                })),
                createdByUserId: userId
            });

            // Link to active shift/business day
            // RULE: Always attribute to the active CASHIER shift, regardless of who triggered the payment.
            // Fallback: actor's own shift, then no shift (no crash).
            if (userId) {
                transaction.createdByUserId = userId;
                const cashierShift = await this.shiftService.findActiveCashierShift();
                const activeShift = cashierShift ?? await this.shiftService.getActiveShift(userId);
                if (activeShift) {
                    paymentRecord.shiftId = activeShift.id;
                    paymentRecord.businessDayId = activeShift.businessDayId;
                    transaction.shiftId = activeShift.id;
                    transaction.businessDayId = activeShift.businessDayId;
                } else {
                    // No cashier and no actor shift — still assign to active business day
                    const activeDay = await this.shiftService.getOrCreateActiveBusinessDay();
                    transaction.businessDayId = activeDay.id;
                    paymentRecord.businessDayId = activeDay.id;
                }
            }

            const savedPayment = await this.transactionPaymentRepository.save(paymentRecord);

            // 3. Mark Order Items as Paid
            for (const item of itemsToPay) {
                item.isPaid = true;
                item.paymentId = savedPayment.id;
                await this.orderItemRepository.save(item);
            }

            // Add to history
            const paymentDtl = {
                method: (data.paymentMethod || 'Cash').toUpperCase(),
                amount: totalPaid,
                payer: data.payerName || 'Payer',
                timestamp: new Date(),
                paymentId: savedPayment.id,
                billiardPortion: billiardPortion
            };
            transaction.paymentDetails = [...(transaction.paymentDetails || []), paymentDtl];

            // 5. Recalculate AND Save the Transaction once
            const savedTx = await this.updateTotals(transaction);

            // 6. Check status and handle completion
            if (Number(savedTx.paidAmount) >= Number(savedTx.grandTotal) - 1) {
                savedTx.status = TransactionStatus.PAID;

                // AWARD ROYALTY POINTS ON COMPLETION
                await this.applyRoyaltyPoints(savedTx);

                if (savedTx.tableId) {
                    const table = await this.tableRepository.findOne({ where: { id: savedTx.tableId } });
                    if (table) {
                        const now = new Date();
                        const isPrepaid = table.sessionType === 'prepaid';
                        const isExpired = table.endTime && now >= table.endTime;

                        // Only set AVAILABLE if:
                        // 1. The table is explicitly WAITING_PAYMENT (it was already stopped)
                        // 2. OR it IS prepaid but the time has already expired
                        // NEVER auto-close an IN_USE Open Table.
                        if (table.status === TableStatus.WAITING_PAYMENT || (isPrepaid && isExpired)) {
                            table.status = TableStatus.AVAILABLE;
                            table.sessionType = null;
                            table.startTime = null;
                            table.endTime = null;
                            table.isLightOn = false;

                            // Aggressive Backend State Clear to prevent data leaks into the next session
                            table.memberId = null;
                            table.packageId = null;
                            table.activePackagePrice = null;
                            table.remainingMinutes = null;

                            const finalTable = await this.tableRepository.save(table);
                            this.billiardGateway.broadcastTableUpdate(finalTable);
                        } else {
                            // If it's prepaid and still has time, just broadcast the current status
                            // (which might have updated totals/payments)
                            this.billiardGateway.broadcastTableUpdate(table);
                        }
                    }
                }
                else if (savedTx.cafeTableId) {
                    const cafeTable = await this.cafeTableRepository.findOne({ where: { id: savedTx.cafeTableId } });
                    if (cafeTable) {
                        cafeTable.status = CafeTableStatus.AVAILABLE;
                        cafeTable.currentTransactionId = null;
                        cafeTable.currentCustomer = null;

                        const savedCafeTable = await this.cafeTableRepository.save(cafeTable);
                        this.billiardGateway.broadcastTableUpdate({ ...savedCafeTable, type: 'cafe' });
                    }
                }
                // Save status update
                await this.transactionRepository.save(savedTx);
            } else {
                savedTx.status = TransactionStatus.PARTIAL;
                const finalTx = await this.transactionRepository.save(savedTx);

                // BROADCAST for Real-time Dashboard (Sisa Tagihan)
                if (finalTx.tableId) {
                    const table = await this.tableRepository.findOne({
                        where: { id: finalTx.tableId }
                    });
                    if (table) {
                        (table as any).type = 'billiard';
                        table.activeTransaction = finalTx;
                        table.grandTotal = Number(finalTx.grandTotal || 0);
                        this.billiardGateway.broadcastTableUpdate(table);
                    }
                } else if (finalTx.cafeTableId) {
                    const cafeTable = await this.cafeTableRepository.findOne({ where: { id: finalTx.cafeTableId } });
                    if (cafeTable) {
                        this.billiardGateway.broadcastTableUpdate({
                            ...cafeTable,
                            type: 'cafe',
                            activeTransaction: finalTx,
                            grandTotal: Number(finalTx.grandTotal || 0)
                        });
                    }
                }
            }

            // 7. Log Cashflow (Try-Catch secondary)
            try {
                const isMemberPmt = paymentMethod === 'MEMBER' || paymentMethod === 'MEMBERSHIP';
                const description = `Split Payment [${data.payerName}] for INV: ${transaction.invoiceNumber}`;
                if (!isMemberPmt) {
                    // Real cash income - record full amount
                    await this.financeService.logCashflow({
                        amount: totalPaid,
                        type: CashflowType.IN,
                        source: (transaction.cafeTableId && !transaction.tableId) ? 'sale:cafe' : 'sale:billiard',
                        referenceId: transaction.invoiceNumber,
                        description,
                        businessDayId: transaction.businessDayId,
                        shiftId: transaction.shiftId,
                    });
                } else {
                    // Member balance usage — audit trail only, NOT real cash in
                    await this.financeService.logCashflow({
                        amount: 0,
                        type: CashflowType.IN,
                        source: 'usage:member',
                        referenceId: transaction.invoiceNumber,
                        description: `[MEMBER USAGE] ${description}`,
                        businessDayId: transaction.businessDayId,
                        shiftId: transaction.shiftId,
                    });
                }
            } catch (cfError) {
                this.logger.error(`Cashflow logging failed: ${cfError.message}`);
            }

            // Return a fresh fetch to avoid circular reference serialization errors
            return this.getTransactionById(transactionId);
        } catch (error) {
            this.logger.error(`Multi-payer payment ERROR: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Hitung estimasi bagi rata (Split Bill Evenly)
     */
    async calculateSplitEvenly(transactionId: number, peopleCount: number): Promise<any> {
        const transaction = await this.updateTotals(transactionId);
        const remaining = Number(transaction.grandTotal) - Number(transaction.paidAmount);

        return {
            total: Number(transaction.grandTotal),
            paid: Number(transaction.paidAmount),
            remaining: remaining > 0 ? remaining : 0,
            peopleCount,
            perPerson: Math.ceil((remaining > 0 ? remaining : 0) / peopleCount)
        };
    }

    async splitTransaction(sourceTransactionId: number, orderItemIds: number[]): Promise<Transaction> {
        const sourceTx = await this.getTransactionById(sourceTransactionId);
        const newTx = await this.createTransaction();

        const itemsToMove = sourceTx.orderItems.filter(item => orderItemIds.includes(item.id));
        for (const item of itemsToMove) {
            item.transactionId = newTx.id;
            await this.orderItemRepository.save(item);
        }

        await this.updateTotals(sourceTransactionId);
        return this.updateTotals(newTx.id);
    }

    async updateTotals(transactionOrId: number | Transaction): Promise<Transaction> {
        const settings = await this.settingsService.getSettings();
        let transactionId: number;
        let billiardTotal: number;
        let billingDetails: any;
        let paidAmount: number;
        let paymentDetails: any;
        let orderItems: OrderItem[];

        let businessDayId: number | null = null;
        let shiftId: number | null = null;
        let createdByUserId: number | null = null;

        let foundTx: Transaction | null = null;
        if (typeof transactionOrId === 'number') {
            transactionId = transactionOrId;
            foundTx = await this.transactionRepository.findOne({
                where: { id: transactionId },
                relations: ['orderItems', 'table', 'member', 'member.tier', 'payments'],
            });
            if (!foundTx) throw new NotFoundException('Transaction not found');
            billiardTotal = Number(foundTx.billiardTotal || 0);
            billingDetails = foundTx.billingDetails;
            paidAmount = Number(foundTx.paidAmount || 0);
            paymentDetails = foundTx.paymentDetails;
            orderItems = foundTx.orderItems || [];

            businessDayId = foundTx.businessDayId;
            shiftId = foundTx.shiftId;
            createdByUserId = foundTx.createdByUserId;
        } else {
            const tx = transactionOrId;
            transactionId = tx.id;
            billiardTotal = Number(tx.billiardTotal || 0);
            billingDetails = tx.billingDetails;
            paidAmount = Number(tx.paidAmount || 0);
            paymentDetails = tx.paymentDetails;

            businessDayId = tx.businessDayId;
            shiftId = tx.shiftId;
            createdByUserId = tx.createdByUserId;

            // Use pre-loaded orderItems from memory, or re-fetch if missing
            if (tx.orderItems && tx.payments) {
                orderItems = tx.orderItems;
                foundTx = tx; // Ensure we have something for later calc
            } else {
                foundTx = await this.transactionRepository.findOne({
                    where: { id: transactionId },
                    relations: ['orderItems', 'orderItems.menuItem', 'orderItems.menuItem.category', 'table', 'member', 'member.tier', 'payments'],
                });
                if (!foundTx) throw new NotFoundException('Transaction not found');
                orderItems = foundTx.orderItems || [];
            }
        }

        // Use centralized vitals calculation based on discounts
        const txForVitals = (typeof transactionOrId === 'object' ? transactionOrId : foundTx) as Transaction;

        // IMPORTANT: For active sessions, we must ensure computeSet uses the LATEST billiard total
        // instead of whatever stale value might be in txObj.billiardTotal.
        if (txForVitals.table && txForVitals.table.startTime && txForVitals.table.status !== TableStatus.AVAILABLE) {
            await this.calculateBilliardTransient(txForVitals);
        }

        const { session, remaining } = this.calculateVitals(txForVitals, settings);
        let finalVitals = session; // WE PERSIST THE FULL SESSION TOTAL TO THE DB

        // Re-evaluate promos for permanence
        let billiardMins = 0;

        // Use the transaction object regardless of how it was passed
        const txObj = (typeof transactionOrId === 'object' ? transactionOrId : foundTx) as Transaction;

        // Search for relevant date info
        if (txObj?.table?.startTime && txObj?.table?.status !== TableStatus.AVAILABLE) {
            billiardMins = Math.round((new Date().getTime() - new Date(txObj.table.startTime).getTime()) / 60000);
        } else if (txObj?.startTime && txObj?.endTime) {
            billiardMins = Math.round((new Date(txObj.endTime).getTime() - new Date(txObj.startTime).getTime()) / 60000);
        }

        const { discounts, appliedPromos } = await this.promoService.evaluatePromos(orderItems, billiardMins);
        const totalPromoDiscount = discounts.reduce((sum, d) => sum + Number(d.amount || 0), 0);

        if (totalPromoDiscount > 0) {
            // Use effectiveBilliardTotal from remaining to check against unpaid portion IF needed, 
            // but for reports, we usually want the session-wide promo effect.
            const subtotal = Number(session.billiardTotal || 0) + Number(session.cafeTotal || 0);
            const discountedSubtotal = Math.max(0, subtotal - Number(session.tierDiscountAmount || 0) - totalPromoDiscount);
            const scPercent = Number(settings.serviceChargePercentage || 0) / 100;
            const vatPercent = Number(settings.ppnPercentage || 0) / 100;

            const serviceCharge = Math.round(discountedSubtotal * scPercent);
            const vat = Math.round((discountedSubtotal + serviceCharge) * vatPercent);
            const rawTotal = discountedSubtotal + serviceCharge + vat;
            const kelipatan = Math.max(1, Number(settings.roundingKelipatan || 1));
            const roundedTotal = Math.ceil(rawTotal / kelipatan) * kelipatan;

            finalVitals = {
                ...finalVitals,
                serviceChargeAmount: serviceCharge,
                vatAmount: vat,
                roundingAmount: roundedTotal - rawTotal,
                grandTotal: roundedTotal,
                discountAmount: Number(session.tierDiscountAmount || 0) + totalPromoDiscount
            };
        }

        // Use a targeted UPDATE to avoid circular entity issues with `.save(entity)`
        // NOTE: We do NOT update billiardTotal here because:
        //   - For prepaid sessions: billiardTotal holds the original package price (needed for reports/receipts)
        //   - The effective (unpaid) portion is already factored into grandTotal via effectiveBilliardTotal
        // Calculate total paid from all related payments
        const calculatedPaidAmount = (foundTx?.payments || []).reduce((sum: number, p: any) => sum + Number(p.totalPaid || 0), 0);

        await this.transactionRepository.update(transactionId, {
            cafeTotal: Number(finalVitals.cafeTotal || 0),
            serviceChargeAmount: Number(finalVitals.serviceChargeAmount || 0),
            vatAmount: Number(finalVitals.vatAmount || 0),
            roundingAmount: Number(finalVitals.roundingAmount || 0),
            grandTotal: Number(finalVitals.grandTotal || 0),
            discountAmount: Number(finalVitals.discountAmount || 0),
            billiardTotal: Number(finalVitals.billiardTotal || 0),
            packageId: txObj.packageId || txObj.table?.packageId || undefined,
            paidAmount: calculatedPaidAmount,
            billingDetails: txObj.billingDetails || billingDetails,
            paymentDetails: paymentDetails,
            appliedPromos: appliedPromos,
            businessDayId: businessDayId,
            shiftId: shiftId,
            createdByUserId: createdByUserId
        });

        // Return a clean re-fetch (no circular relations in the result)
        const finalResult = await this.transactionRepository.findOne({
            where: { id: transactionId },
            relations: ['orderItems', 'orderItems.menuItem', 'orderItems.menuItem.category', 'payments', 'openedBy', 'createdBy', 'member', 'member.tier'],
        });
        if (!finalResult) throw new NotFoundException(`Transaction ${transactionId} not found after update`);

        // Broadcast for real-time payroll/ledger refresh
        this.billiardGateway.broadcastTransactionUpdate(finalResult);

        return finalResult;
    }

    async setBilliardTotal(transactionId: number, amount: number, details?: any, userName?: string): Promise<Transaction> {
        const transaction = await this.transactionRepository.findOne({
            where: { id: transactionId },
            relations: ['orderItems', 'table']
        });
        if (!transaction) throw new NotFoundException('Transaction not found');

        const oldAmount = Number(transaction.billiardTotal);
        transaction.billiardTotal = amount;

        if (userName && Number(amount) !== oldAmount) {
            await this.reportService.logAction(
                'BILLIARD_PRICE_OVERRIDE',
                userName,
                `Ubah harga billiard manual dari Rp ${oldAmount.toLocaleString()} ke Rp ${Number(amount).toLocaleString()}`,
                transaction.tableId ?? undefined,
                transaction.invoiceNumber
            );
        }

        if (details) {
            if (Array.isArray(details)) {
                transaction.billingDetails = details;
            } else {
                // If this is a final summary object from stopSession, it often duplicates the breakdown.
                // We intelligently replace or append. For now, let's ensure we don't duplicate.
                const current = Array.isArray(transaction.billingDetails) ? transaction.billingDetails : [];
                // If the new detail has the same subtotal as an existing one and no title, it's likely a duplicate.
                const isDuplicate = current.some(d => d.subtotal === details.subtotal && d.title === details.title);
                if (!isDuplicate) {
                    transaction.billingDetails = [...current, details];
                }
            }
        }

        // Pass the already modified object to preserve billiardTotal and billingDetails
        return this.updateTotals(transaction);
    }

    async processPayment(transactionId: number, paymentDetails: any, userId?: number): Promise<Transaction> {
        const transaction = await this.transactionRepository.findOne({
            where: { id: transactionId },
            relations: ['orderItems', 'table']
        });
        if (!transaction) throw new NotFoundException('Transaction not found');

        const amount = Number(paymentDetails.amount);

        // IMPORTANT: Calculate latest totals before applying payment to ensure we compare against real grandTotal
        const settings = await this.settingsService.getSettings();

        // If it's an active open session, recalculate current billiard cost to ensure we don't save 0
        // removed hardcoded duration calculation bug to trust the stopSession/transient calculations


        // For non-active (historical/paid/stopped) transactions, ensure we re-attach the package if it was recorded
        if (!transaction.billiardPackage && (transaction.packageId || (transaction as any).billiardPackageId)) {
            const pkgId = transaction.packageId || (transaction as any).billiardPackageId;
            const pkg = await this.packageRepository.findOne({ where: { id: pkgId } });
            if (pkg) {
                transaction.billiardPackage = pkg;
                transaction.packageId = pkg.id;
            }
        }

        // Recalculate based on current transaction state using centralized vitals
        const { session } = this.calculateVitals(transaction, settings);

        // Normalize payment method
        const paymentMethod = (paymentDetails.method || 'CASH').toUpperCase();
        if (paymentMethod === 'MEMBER' || paymentMethod === 'MEMBERSHIP') {
            if (!transaction.memberId) {
                throw new Error('This transaction is not associated with a member');
            }
            await this.memberService.deductBalance(transaction.memberId, amount);
            paymentDetails.method = 'MEMBER'; // Normalize for DB consistency
        }

        // CREATE FORMAL PAYMENT RECORD
        // For a simple payment, the "itemsSubtotal" and "billiardPortion" are not easily separable
        // unless we use multi-payer logic. For simplicity and consistency, we attribute 
        // the payment proportional to the remaining debt if needed, OR just record it as a lump payment.
        // Rule: If it's the final payment, it covers everything.

        const paymentRecord = this.transactionPaymentRepository.create({
            transactionId: transaction.id,
            payerName: paymentDetails.payer || transaction.customerName || 'Customer',
            itemsSubtotal: 0, // In simple pay, we track total paid. 
            billiardPortion: 0,
            taxAmount: 0,
            serviceAmount: 0,
            roundingAmount: 0, // Rounding is handled at the transaction level
            discountAmount: 0,
            totalPaid: amount,
            paymentMethod: paymentDetails.method === 'MEMBERSHIP' ? 'MEMBER' : paymentMethod,
            itemsSnapshot: [], // Simple payment doesn't snapshot items by default
            createdByUserId: userId
        });

        // Link to active shift/business day
        const cashierShift = await this.shiftService.findActiveCashierShift();
        const activeShift = cashierShift ?? (userId ? await this.shiftService.getActiveShift(userId) : null);
        if (activeShift) {
            paymentRecord.shiftId = activeShift.id;
            paymentRecord.businessDayId = activeShift.businessDayId;
            transaction.shiftId = activeShift.id;
            transaction.businessDayId = activeShift.businessDayId;
        } else {
            const activeDay = await this.shiftService.getOrCreateActiveBusinessDay();
            transaction.businessDayId = activeDay.id;
            paymentRecord.businessDayId = activeDay.id;
        }

        const savedPayment = await this.transactionPaymentRepository.save(paymentRecord);

        // Update JSON details for legacy support/quick preview
        const paymentDtl = {
            method: paymentMethod,
            amount: amount,
            payer: paymentRecord.payerName,
            timestamp: new Date(),
            paymentId: savedPayment.id
        };
        transaction.paymentDetails = [...(transaction.paymentDetails || []), paymentDtl];

        // Track who handled this payment (if it completes the transaction or for single pay)
        if (userId) {
            transaction.createdByUserId = userId;

            // RULE: Always attribute to the active CASHIER shift, regardless of who triggered the payment.
            // Fallback: actor's own shift, then just active business day.
            const cashierShift = await this.shiftService.findActiveCashierShift();
            const activeShift = cashierShift ?? await this.shiftService.getActiveShift(userId);
            if (activeShift) {
                transaction.shiftId = activeShift.id;
                transaction.businessDayId = activeShift.businessDayId;
            } else {
                const activeDay = await this.shiftService.getOrCreateActiveBusinessDay();
                transaction.businessDayId = activeDay.id;
            }
        }

        if (transaction.paidAmount >= transaction.grandTotal) {
            transaction.status = TransactionStatus.PAID;

            // AWARD ROYALTY POINTS ON COMPLETION
            await this.applyRoyaltyPoints(transaction);

            // Mark all items as paid for consistency
            if (transaction.orderItems) {
                for (const item of transaction.orderItems) {
                    if (!item.isPaid && item.status !== 'CANCELLED') {
                        item.isPaid = true;
                        await this.orderItemRepository.save(item);
                    }
                }
            }
        } else if (transaction.paidAmount > 0) {
            transaction.status = TransactionStatus.PARTIAL;
        }

        const saved = await this.transactionRepository.save(transaction);

        if (transaction.status === TransactionStatus.PAID) {
            if (transaction.tableId) {
                const table = await this.tableRepository.findOne({ where: { id: transaction.tableId } });
                if (table) {
                    const now = new Date();
                    const isPrepaid = table.sessionType === 'prepaid';
                    const isExpired = table.endTime && now >= table.endTime;

                    if (table.status === TableStatus.WAITING_PAYMENT || (isPrepaid && isExpired)) {
                        table.status = TableStatus.AVAILABLE;
                        table.sessionType = null;
                        table.startTime = null;
                        table.endTime = null;
                        table.remainingMinutes = null;
                        table.packageId = null;
                        table.activePackagePrice = null;
                        table.isLightOn = false;

                        // Aggressive Backend State Clear to prevent data leaks into the next session
                        table.memberId = null;

                        const savedTable = await this.tableRepository.save(table);
                        this.billiardGateway.broadcastTableUpdate(savedTable);
                    } else {
                        // Table is IN_USE and just fully paid (e.g. member auto-debit or early prepaid payment)
                        // Just broadcast the updated transaction
                        (table as any).type = 'billiard';
                        table.activeTransaction = transaction;
                        table.grandTotal = Number(transaction.grandTotal || 0);
                        this.billiardGateway.broadcastTableUpdate(table);
                    }
                }
            } else if (transaction.cafeTableId) {
                const cafeTable = await this.cafeTableRepository.findOne({ where: { id: transaction.cafeTableId } });
                if (cafeTable) {
                    cafeTable.status = CafeTableStatus.AVAILABLE;
                    cafeTable.currentTransactionId = null;
                    cafeTable.currentCustomer = null;

                    const savedCafeTable = await this.cafeTableRepository.save(cafeTable);
                    this.billiardGateway.broadcastTableUpdate({ ...savedCafeTable, type: 'cafe' });
                }
            }
        } else if (transaction.status === TransactionStatus.PARTIAL) {
            // BROADCAST for Real-time Dashboard (Sisa Tagihan)
            if (transaction.tableId) {
                const table = await this.tableRepository.findOne({
                    where: { id: transaction.tableId }
                });
                if (table) {
                    (table as any).type = 'billiard';
                    table.activeTransaction = transaction;
                    table.grandTotal = Number(transaction.grandTotal || 0);
                    this.billiardGateway.broadcastTableUpdate(table);
                }
            } else if (transaction.cafeTableId) {
                const cafeTable = await this.cafeTableRepository.findOne({ where: { id: transaction.cafeTableId } });
                if (cafeTable) {
                    this.billiardGateway.broadcastTableUpdate({
                        ...cafeTable,
                        type: 'cafe',
                        activeTransaction: transaction,
                        grandTotal: Number(transaction.grandTotal || 0)
                    });
                }
            }
        }

        const isDebtPayment = transaction.status === TransactionStatus.DEBT || transaction.status === TransactionStatus.PARTIAL;
        const description = isDebtPayment
            ? `Pelunasan Hutang: ${transaction.invoiceNumber} (${paymentDetails.method})`
            : `Payment for INV: ${transaction.invoiceNumber} (${paymentDetails.method})`;

        const isMemberPayment = paymentDetails.method?.toUpperCase() === 'MEMBER';
        if (!isMemberPayment) {
            await this.financeService.logCashflow({
                amount,
                type: CashflowType.IN,
                source: (transaction.cafeTableId && !transaction.tableId) ? 'sale:cafe' : 'sale:billiard',
                referenceId: transaction.invoiceNumber,
                description,
                businessDayId: transaction.businessDayId,
                shiftId: transaction.shiftId,
            });
        } else {
            // Log to ledger with 0 amount just for audit trail of usage
            await this.financeService.logCashflow({
                amount: 0,
                type: CashflowType.IN,
                source: 'usage:member',
                referenceId: transaction.invoiceNumber,
                description: `[MEMBER USAGE] ${description}`,
                businessDayId: transaction.businessDayId,
                shiftId: transaction.shiftId,
            });
        }

        return saved;
    }

    async holdTransaction(id: number): Promise<Transaction> {
        const transaction = await this.transactionRepository.findOne({
            where: { id },
            relations: ['table']
        });
        if (!transaction) throw new NotFoundException('Transaction not found');

        // 1. Mark status as DEBT if not already PAID or PARTIAL
        if (transaction.status === TransactionStatus.UNPAID) {
            transaction.status = TransactionStatus.DEBT;
        }
        // If PARTIAL, we keep it as PARTIAL (it's inherently a debt now because it's off-table)

        // 2. Unlink the table
        const tableId = transaction.tableId;
        transaction.tableId = null;
        transaction.table = null;

        const saved = await this.transactionRepository.save(transaction);

        // 3. Reset the table status to AVAILABLE
        if (tableId) {
            const table = await this.tableRepository.findOne({ where: { id: tableId } });
            if (table) {
                table.status = TableStatus.AVAILABLE;
                table.sessionType = null;
                table.startTime = null;
                table.endTime = null;
                table.remainingMinutes = null;
                table.isLightOn = false;
                const savedTable = await this.tableRepository.save(table);
                this.billiardGateway.broadcastTableUpdate(savedTable);
            }
        }
        return saved;
    }

    async getDebtTransactions(): Promise<Transaction[]> {
        return this.transactionRepository.find({
            where: {
                status: In([TransactionStatus.DEBT, TransactionStatus.PARTIAL]),
                tableId: IsNull()
            },
            relations: ['table', 'orderItems', 'orderItems.menuItem'],
            order: { createdAt: 'DESC' }
        });
    }

    /**
     * Mengirim struk pembayaran individu ke printer
     */
    async printPaymentReceipt(paymentId: number, printerIp: string): Promise<{ success: boolean }> {
        try {
            this.logger.log(`Attempting to print receipt for Payment ID: ${paymentId} to IP: ${printerIp}`);

            const payment = await this.transactionPaymentRepository.findOne({
                where: { id: paymentId },
                relations: ['transaction', 'transaction.table', 'transaction.orderItems', 'transaction.orderItems.menuItem', 'transaction.orderItems.menuItem.category']
            });

            if (!payment) {
                this.logger.error(`Payment record with ID ${paymentId} not found`);
                throw new NotFoundException('Payment record not found');
            }

            if (!payment.transaction) {
                this.logger.error(`Transaction relation missing for Payment ID ${paymentId}`);
                throw new Error('Transaction data missing');
            }

            const receiptText = await this.invoiceService.generateThermalReceipt(payment, payment.transaction);

            this.logger.log(`Sending receipt text to printer: ${printerIp}`);
            await this.hardwareService.printRaw(printerIp || '192.168.1.100', 9100, receiptText);

            return { success: true };
        } catch (error) {
            this.logger.error(`Cetak Struk Gagal [Payment ID: ${paymentId}]:`, error.message);
            throw error;
        }
    }

    /**
     * Unified logic to award royalty points on transaction completion.
     */
    private async applyRoyaltyPoints(transaction: Transaction): Promise<void> {
        // Points are for spending (Billiard/Cafe), not for Top-ups
        if (transaction.type === TransactionType.TOPUP) return;
        if (!transaction.memberId || transaction.isPointsAwarded) return;

        try {
            const member = await this.memberRepository.findOne({
                where: { id: transaction.memberId },
                relations: ['tier']
            });

            if (member && member.tier) {
                const settings = await this.settingsService.getSettings();
                const pointsPerUnit = Number(settings.royaltyPointsPerAmount || 1000);
                const multiplier = Number(member.tier.pointMultiplier || 1);

                // Calculate points based on spending
                // e.g. 55,000 / 1000 = 55 points * multiplier
                const pointsToAward = Math.floor(Number(transaction.grandTotal || 0) / pointsPerUnit) * multiplier;

                if (pointsToAward > 0) {
                    await this.memberService.awardPoints(member.id, pointsToAward);
                    transaction.isPointsAwarded = true;
                    this.logger.log(`[Royalty] Awarded ${pointsToAward} points to member ${member.name} for INV: ${transaction.invoiceNumber} (Total: ${transaction.grandTotal})`);
                }
            }
        } catch (error) {
            this.logger.error(`[Royalty] FAILED to award points: ${error.message}`);
        }
    }
}
