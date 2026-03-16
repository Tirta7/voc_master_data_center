"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "TransactionService", {
    enumerable: true,
    get: function() {
        return TransactionService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _redisservice = require("../redis/redis.service");
const _transactionentity = require("./entities/transaction.entity");
const _orderitementity = require("../cafe/entities/order-item.entity");
const _tableentity = require("../billiard/entities/table.entity");
const _settingsservice = require("../settings/settings.service");
const _financeservice = require("../finance/finance.service");
const _cashflowentity = require("../finance/entities/cashflow.entity");
const _billiardgateway = require("../socket/billiard.gateway");
const _transactionpaymententity = require("./entities/transaction-payment.entity");
const _invoiceservice = require("./invoice.service");
const _hardwareservice = require("../hardware/hardware.service");
const _shiftservice = require("../finance/shift.service");
const _billiardpackageentity = require("../billiard/entities/billiard-package.entity");
const _cafetableentity = require("../cafe-table/entities/cafe-table.entity");
const _promoservice = require("../promo/promo.service");
const _reportservice = require("../report/report.service");
const _memberentity = require("../member/entities/member.entity");
const _memberservice = require("../member/member.service");
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
let TransactionService = class TransactionService {
    // Mutex replaced by Redis distributed locks
    async createTransaction(tableId, userId, cafeTableId, packageId, fareName) {
        this.logger.log(`Creating transaction for tableId: ${tableId}, cafeTableId: ${cafeTableId}`);
        try {
            const now = new Date();
            const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '');
            const hhmmss = now.toTimeString().slice(0, 8).replace(/:/g, '');
            const invoiceNumber = `TAB-${yymmdd}${hhmmss}`;
            // Safety check for forward-referenced ShiftService
            // Remove explicit check as it might throw 500 prematurely
            // if (!this.shiftService) { ... }
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
            const activeShift = await this.shiftService.findActiveCashierShift() || (userId ? await this.shiftService.getActiveShift(userId) : null);
            const transaction = new _transactionentity.Transaction();
            transaction.invoiceNumber = invoiceNumber;
            transaction.packageId = packageId ?? null;
            transaction.fareName = fareName ?? null;
            transaction.tableId = tableId || null;
            transaction.cafeTableId = cafeTableId || null;
            transaction.status = _transactionentity.TransactionStatus.UNPAID;
            transaction.type = tableId ? _transactionentity.TransactionType.BILLIARD : cafeTableId ? _transactionentity.TransactionType.CAFE : _transactionentity.TransactionType.BILLIARD;
            transaction.createdByUserId = userId ?? null;
            transaction.openedByUserId = userId ?? null;
            transaction.commissionUserId = commissionUserId ?? null;
            transaction.businessDayId = activeDay.id;
            transaction.shiftId = activeShift?.id ?? null;
            const saved = await this.transactionRepository.save(transaction);
            return saved;
        } catch (error) {
            this.logger.error(`FAILED TO CREATE TRANSACTION: ${error.message}`, error.stack);
            throw error;
        }
    }
    async updateTransaction(id, data) {
        await this.transactionRepository.update(id, data);
        return this.updateTotals(id);
    }
    async getActiveTransactionByTable(tableId) {
        const cacheKey = `bill_preview_${tableId}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) return cached;
        const results = await this.getActiveTransactionsByTableIds([
            tableId
        ]);
        if (results.length === 0) return null;
        const result = results[0];
        // Invalidate/Clean relations to avoid circularity in Redis/JSON
        const { table: _t, cafeTable: _ct, ...cleanResult } = result;
        await this.redisService.set(cacheKey, cleanResult, 60);
        return result;
    }
    async getActiveTransactionsByTableIds(tableIds) {
        if (!tableIds.length) return [];
        const transactions = await this.transactionRepository.find({
            where: {
                tableId: (0, _typeorm1.In)(tableIds),
                status: (0, _typeorm1.In)([
                    _transactionentity.TransactionStatus.UNPAID,
                    _transactionentity.TransactionStatus.PARTIAL,
                    _transactionentity.TransactionStatus.PAID
                ])
            },
            relations: [
                'orderItems',
                'orderItems.menuItem',
                'orderItems.menuItem.category',
                'table',
                'payments',
                'openedBy',
                'createdBy',
                'member',
                'member.tier'
            ],
            order: {
                createdAt: 'DESC'
            }
        });
        // Filter out PAID transactions for already available tables
        const activeTransactions = transactions.filter((tr)=>{
            if (tr.status === _transactionentity.TransactionStatus.PAID) {
                return tr.table && tr.table.status !== _tableentity.TableStatus.AVAILABLE;
            }
            return true;
        });
        // Batch fetch packages if needed
        const packageIds = activeTransactions.filter((tr)=>tr.table?.packageId).map((tr)=>tr.table.packageId);
        const packageMap = new Map();
        if (packageIds.length > 0) {
            const packages = await this.packageRepository.findBy({
                id: (0, _typeorm1.In)(packageIds)
            });
            packages.forEach((pkg)=>packageMap.set(pkg.id, pkg));
        }
        // Process each transaction for transient data
        const settings = await this.settingsService.getSettings();
        const activePromos = await this.promoService.getActivePromos();
        await Promise.all(activeTransactions.map(async (transaction)=>{
            await this.calculateBilliardTransient(transaction, packageMap);
            await this.calculateTransientTotals(transaction, settings, activePromos);
            // Strip circular relations after processing
            transaction.table = undefined;
            transaction.cafeTable = undefined;
            if (transaction.orderItems) {
                transaction.orderItems.forEach((oi)=>{
                    oi.transaction = undefined;
                });
            }
        }));
        return activeTransactions;
    }
    async getActiveTransactionByCafeTable(cafeTableId) {
        const cacheKey = `bill_preview_cafe_${cafeTableId}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) return cached;
        const tx = await this.transactionRepository.findOne({
            where: {
                cafeTableId,
                status: (0, _typeorm1.In)([
                    _transactionentity.TransactionStatus.UNPAID,
                    _transactionentity.TransactionStatus.PARTIAL
                ])
            },
            relations: [
                'orderItems',
                'orderItems.menuItem',
                'orderItems.menuItem.category',
                'cafeTable',
                'payments',
                'member',
                'member.tier'
            ],
            order: {
                createdAt: 'DESC'
            }
        });
        if (!tx) return null;
        // Invalidate/Clean relations to avoid circularity in Redis/JSON
        const { table: _t, cafeTable: _ct, ...cleanTx } = tx;
        await this.redisService.set(cacheKey, cleanTx, 60);
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
   */ getTierDiscountPercentage(cfg, categoryName) {
        const catUpper = String(categoryName || 'LAINNYA').trim().toUpperCase();
        let percent = 0;
        let found = false;
        // 1. Priority: Exact or Bidirectional Prefix Match
        // We look for the "best" match (prioritizing longer keys for more specificity)
        const entries = Object.entries(cfg).sort((a, b)=>b[0].length - a[0].length);
        for (const [k, v] of entries){
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
    calculateVitals(transaction, settings) {
        // --- BILLIARD TOTAL RESOLUTION ---
        // Use segments (billingDetails) as the Source of Truth if available.
        // This prevents stale/corrupt billiardTotal values from sticking when multi-day sessions are active.
        let billiardTotal = Number(transaction.billiardTotal || 0);
        if (Array.isArray(transaction.billingDetails) && transaction.billingDetails.length > 0) {
            const segmentsSum = transaction.billingDetails.reduce((sum, seg)=>sum + Number(seg.subtotal || seg.amount || 0), 0);
            if (segmentsSum > billiardTotal) {
                billiardTotal = segmentsSum;
            }
        }
        const orderItems = transaction.orderItems || [];
        // --- SESSION TOTAL CALCULATION (Everything from start to finish) ---
        const sessionCategoryTotals = {};
        orderItems.forEach((item)=>{
            if (item.status?.toUpperCase() === 'CANCELLED' || item.status?.toUpperCase() === 'CANCEL_REQUESTED') return;
            const lineTotal = Number(item.priceAtOrder || 0) * Number(item.quantity || 0);
            const category = item.menuItem?.category;
            const categoryName = typeof category === 'object' ? category?.name || 'LAINNYA' : category || 'LAINNYA';
            const catUpper = String(categoryName).trim().toUpperCase();
            sessionCategoryTotals[catUpper] = (sessionCategoryTotals[catUpper] || 0) + lineTotal;
        });
        // --- REMAINING BALANCE CALCULATION (Unpaid only) ---
        const memberBilliardPaid = (transaction.payments || []).filter((p)=>(p.paymentMethod === 'MEMBER' || p.paymentMethod === 'MEMBERSHIP') && Number(p.billiardPortion) > 0).reduce((sum, p)=>sum + Number(p.billiardPortion), 0);
        const legacyBilliardPaid = (Array.isArray(transaction.paymentDetails) ? transaction.paymentDetails : []).filter((p)=>(p.method === 'MEMBER' || p.method === 'MEMBERSHIP') && Number(p.billiardPortion) > 0).reduce((sum, p)=>sum + Number(p.billiardPortion), 0);
        const toNumOverall = (val)=>{
            const n = Number(val);
            return isNaN(n) ? 0 : n;
        };
        const totalBilliardPaid = Math.max(0, toNumOverall(memberBilliardPaid)); // Legacy logic used max(member, legacy)
        const effectiveBilliardTotal = Math.max(0, toNumOverall(billiardTotal) - totalBilliardPaid);
        const unpaidCategoryTotals = {};
        orderItems.forEach((item)=>{
            if (item.status?.toUpperCase() === 'CANCELLED' || item.status?.toUpperCase() === 'CANCEL_REQUESTED' || item.isPaid) return;
            const lineTotal = toNumOverall(item.priceAtOrder) * toNumOverall(item.quantity);
            const category = item.menuItem?.category;
            const categoryName = typeof category === 'object' ? category?.name || 'LAINNYA' : category || 'LAINNYA';
            const catUpper = String(categoryName).trim().toUpperCase();
            unpaidCategoryTotals[catUpper] = (unpaidCategoryTotals[catUpper] || 0) + lineTotal;
        });
        const toNum = (val)=>{
            const n = Number(val);
            return isNaN(n) ? 0 : n;
        };
        const computeSet = (billPortion, catTotals)=>{
            const cafeTotal = Object.values(catTotals).reduce((sum, val)=>sum + toNum(val), 0);
            const subtotal = toNum(billPortion) + cafeTotal;
            let discount = 0;
            const member = transaction.member;
            if (member && member.tier && member.tier.discountConfig) {
                const cfg = member.tier.discountConfig;
                const billiardDiscPercent = toNum(cfg.billiardOpen || cfg.billiardPackage);
                const billiardDisc = toNum(billPortion) * (billiardDiscPercent / 100);
                let cafeDisc = 0;
                // --- NEW PERSISTENT DISCOUNT LOGIC ---
                // We sum up the pre-calculated discountAmount from the order items themselves.
                // This ensures that "locked-in" prices are respected.
                const totalItemDiscounts = Object.values(transaction.orderItems || []).filter((item)=>item.status?.toUpperCase() !== 'CANCELLED' && !item.isPaid) // Only for current unpaid set
                .reduce((sum, item)=>sum + toNum(item.discountAmount), 0);
                // Note: The 'catTotals' passed to computeSet already filters for relevant items (session vs unpaid).
                // However, the original logic used dynamic calculation. For robustness,
                // we'll check if the items actually have discountAmount set.
                const hasPersistentDiscounts = (transaction.orderItems || []).some((i)=>toNum(i.discountAmount) > 0);
                if (hasPersistentDiscounts) {
                    // Logic for unpaid/remaining set needs to be careful:
                    // computeSet is called for both 'session' (all items) and 'remaining' (unpaid items).
                    // catTotals correctly reflects the set.
                    // Improved cafe discount calculation:
                    const setItemIds = new Set((transaction.orderItems || []).filter((i)=>{
                        const cat = i.menuItem?.category;
                        const catName = typeof cat === 'object' ? cat?.name : cat;
                        const catUpper = String(catName || 'LAINNYA').trim().toUpperCase();
                        return catTotals[catUpper] !== undefined;
                    }).map((i)=>i.id));
                    cafeDisc = (transaction.orderItems || []).filter((i)=>setItemIds.has(i.id) && i.status?.toUpperCase() !== 'CANCELLED').reduce((sum, i)=>sum + toNum(i.discountAmount), 0);
                } else {
                    // Fallback to dynamic calculation if no persistent discounts found (legacy items)
                    const cats = Object.keys(catTotals);
                    for (const catUpper of cats){
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
   */ async calculateTransientTotals(transaction, providedSettings, preFetchedPromos) {
        // Ensure billiard total is calculated if this is a billiard transaction with a valid start time.
        // We run this even if table is AVAILABLE to support historical log reconstruction (reprints).
        // Calculate billiard portion if there is ANY billiard activity (Table link or START time)
        if ((transaction.type === _transactionentity.TransactionType.BILLIARD || transaction.tableId || transaction.table) && (transaction.startTime || transaction.table?.startTime)) {
            await this.calculateBilliardTransient(transaction);
        }
        const settings = providedSettings || await this.settingsService.getSettings();
        const { session, remaining } = this.calculateVitals(transaction, settings);
        // For real-time display (GET), we show the REMAINING balance as the grand total
        // to help the cashier know what's due NOW.
        Object.assign(transaction, remaining);
        // Promo Evaluation (Promo engine works ON TOP of tier discounts or alongside them)
        let billiardMins = 0;
        const calcStart = transaction.table?.startTime || transaction.startTime;
        const calcEnd = transaction.table?.status && transaction.table.status !== _tableentity.TableStatus.AVAILABLE ? new Date() : transaction.endTime || new Date();
        if (calcStart && calcEnd) {
            billiardMins = Math.round((new Date(calcEnd).getTime() - new Date(calcStart).getTime()) / 60000);
            if (isNaN(billiardMins)) billiardMins = 0;
        }
        const { discounts, appliedPromos } = await this.promoService.evaluatePromos(transaction.orderItems || [], billiardMins, preFetchedPromos);
        const totalPromoDiscount = discounts.reduce((sum, d)=>sum + Number(d.amount || 0), 0);
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
        transaction.sessionTotals = session;
        return transaction;
    }
    async calculateBilliardTransient(transaction, packageMap) {
        const table = transaction.table;
        const startTime = table?.startTime || (transaction.startTime ? new Date(transaction.startTime) : null);
        const endTime = new Date(table?.status && table.status !== _tableentity.TableStatus.AVAILABLE ? table.endTime || new Date() : transaction.endTime || new Date());
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
                pkg = await this.packageRepository.findOneBy({
                    id: effectivePackageId
                });
            }
        }
        // Attach package to transaction for receipt/UI display
        if (pkg) {
            transaction.billiardPackage = pkg;
        }
        // 2. Calculate Billing Details (for OPEN TABLE)
        if (sessionType === 'open') {
            const pricing = this.calculateTimeBasedPrice(startTime, endTime, pkg || {
                minutePrice: 50000 / 60
            });
            // ALWAYS sync with the most accurate calculation for Open Table
            transaction.billiardTotal = pricing.total;
            transaction.billingDetails = pricing.details;
            const elapsedMins = Math.round((endTime.getTime() - new Date(startTime).getTime()) / 60000);
            if (!isNaN(elapsedMins)) {
                const hours = Math.floor(elapsedMins / 60);
                const minutes = elapsedMins % 60;
                transaction.sessionDuration = `${hours} Hour : ${minutes} Minute : 00 Second`;
            }
        } else if (sessionType === 'prepaid') {
            const activePrice = table?.activePackagePrice || transaction.billiardTotal;
            transaction.billiardTotal = Number(activePrice);
            // Ensure transaction.endTime reflects the table's end time for accurate invoice headers
            if (table?.endTime) {
                transaction.endTime = table.endTime;
            }
            // Populate billing details for prepaid sessions too (for report transparency)
            // BUT: Preserve existing details if extensions were already added (e.g. by extendSession)
            const currentDetails = Array.isArray(transaction.billingDetails) ? transaction.billingDetails : [];
            if (currentDetails.length === 0) {
                transaction.billingDetails = [
                    {
                        title: pkg?.name || transaction.fareName || 'Prepaid Session',
                        duration: pkg?.durationMinutes || Math.round((endTime.getTime() - new Date(startTime).getTime()) / 60000),
                        subtotal: Number(activePrice),
                        isExtension: false,
                        ratePerHour: pkg?.type === _billiardpackageentity.PackageType.FIXED ? Number(activePrice) : Number(pkg?.minutePrice || 0) * 60,
                        startTimeFormatted: new Date(startTime).toLocaleTimeString('en-US', {
                            hour12: false,
                            hour: '2-digit',
                            minute: '2-digit'
                        }).replace(/:/g, '.'),
                        endTimeFormatted: new Date(endTime).toLocaleTimeString('en-US', {
                            hour12: false,
                            hour: '2-digit',
                            minute: '2-digit'
                        }).replace(/:/g, '.')
                    }
                ];
            }
            const diffMs = endTime.getTime() - new Date(startTime).getTime();
            const totalMins = Math.round(diffMs / 60000);
            if (!isNaN(totalMins)) {
                const hours = Math.floor(totalMins / 60);
                const minutes = totalMins % 60;
                transaction.sessionDuration = `${hours} Hour : ${minutes} Minute : 00 Second`;
            }
        }
    }
    calculateCurrentPackagePrice(pkg) {
        const now = new Date();
        const timeVal = now.getHours() * 60 + now.getMinutes();
        let activePrice = Number(pkg.price || 0);
        const slots = Array.isArray(pkg.timeSlots) ? pkg.timeSlots : [];
        if (slots.length > 0) {
            let matchedAny = false;
            for (const slot of slots){
                if (!slot?.start || !slot?.end) continue;
                const [sH, sM] = slot.start.split(':').map(Number);
                const [eH, eM] = slot.end.split(':').map(Number);
                const slotStart = sH * 60 + sM;
                const slotEnd = eH * 60 + eM;
                let isMatch = false;
                if (slotEnd < slotStart) {
                    // Midnight crossover
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
   */ calculateTimeBasedPrice(startTime, endTime, pkg) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        let total = 0;
        const details = [];
        // 1. Handle packages with no slots (Simple Flat Rate)
        if (!pkg.timeSlots || pkg.timeSlots.length === 0) {
            const actualSecs = Math.floor((end.getTime() - start.getTime()) / 1000);
            const billedSecs = Math.max(3600, actualSecs);
            const ratePerHour = Number(pkg.minutePrice || 0) * 60;
            const price = ratePerHour / 3600 * billedSecs;
            total = Math.round(price);
            details.push({
                title: 'Regular Rate',
                duration: Math.floor(billedSecs / 60),
                subtotal: total,
                isExtension: false,
                ratePerHour,
                startTimeFormatted: start.getHours().toString().padStart(2, '0') + '.' + start.getMinutes().toString().padStart(2, '0'),
                endTimeFormatted: end.getHours().toString().padStart(2, '0') + '.' + end.getMinutes().toString().padStart(2, '0')
            });
            return {
                total,
                details
            };
        }
        // 2. Pre-parse all slots for high-performance matching
        const parsedSlots = pkg.timeSlots.map((slot)=>{
            if (!slot?.start || !slot?.end) return null;
            const [sH, sM] = slot.start.split(':').map(Number);
            const [eH, eM] = slot.end.split(':').map(Number);
            return {
                ...slot,
                startMin: sH * 60 + sM,
                endMin: eH * 60 + eM,
                price: Number(slot.price)
            };
        }).filter(Boolean);
        const actualDurationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
        const calculationEndSeconds = Math.max(3600, actualDurationSeconds);
        const calculationEnd = new Date(start.getTime() + calculationEndSeconds * 1000);
        let current = new Date(start);
        let currentSegment = null;
        let lastSegmentKey = null;
        const formatTime = (d)=>d.getHours().toString().padStart(2, '0') + '.' + d.getMinutes().toString().padStart(2, '0');
        while(current < calculationEnd){
            const timeVal = current.getHours() * 60 + current.getMinutes();
            const dateVal = current.toLocaleDateString('en-GB'); // Use as part of key to separate days if needed
            let matchedSlot = null;
            for (const slot of parsedSlots){
                if (slot.endMin < slot.startMin) {
                    if (timeVal >= slot.startMin || timeVal < slot.endMin) matchedSlot = slot;
                } else {
                    if (timeVal >= slot.startMin && timeVal < slot.endMin) matchedSlot = slot;
                }
                if (matchedSlot) break;
            }
            const slotName = matchedSlot ? `${matchedSlot.start}-${matchedSlot.end}` : 'Default Rate';
            const slotRate = matchedSlot ? matchedSlot.price : Number(pkg.minutePrice || 0) * 60 || 50000;
            const segmentKey = `${slotName}_${dateVal}`; // Group by slot AND date for clarity in multi-day sessions
            if (!currentSegment || lastSegmentKey !== segmentKey) {
                // Finalize previous segment
                if (currentSegment) {
                    currentSegment.subtotal = Math.round(currentSegment.cost);
                    currentSegment.duration = Math.floor(currentSegment.duration / 60);
                    currentSegment.endTimeFormatted = formatTime(current);
                    details.push(currentSegment);
                }
                // Start new segment
                currentSegment = {
                    title: slotName,
                    date: dateVal,
                    startTimeFormatted: formatTime(current),
                    duration: 0,
                    cost: 0,
                    isExtension: false,
                    ratePerHour: slotRate
                };
                lastSegmentKey = segmentKey;
            }
            currentSegment.duration += 60;
            currentSegment.cost += slotRate / 3600 * 60;
            current = new Date(current.getTime() + 60000);
        }
        if (currentSegment) {
            currentSegment.subtotal = Math.round(currentSegment.cost);
            currentSegment.duration = Math.floor(currentSegment.duration / 60);
            currentSegment.endTimeFormatted = formatTime(current);
            details.push(currentSegment);
        }
        total = details.reduce((sum, d)=>sum + d.subtotal, 0);
        return {
            total: Math.round(total),
            details
        };
    }
    async getTransactionById(id) {
        const transaction = await this.transactionRepository.findOne({
            where: {
                id
            },
            relations: [
                'table',
                'cafeTable',
                'orderItems',
                'orderItems.menuItem',
                'orderItems.menuItem.category',
                'payments',
                'openedBy',
                'createdBy',
                'member',
                'member.tier'
            ]
        });
        if (!transaction) throw new _common.NotFoundException('Transaction not found');
        return await this.calculateTransientTotals(transaction);
    }
    /** Lightweight lookup for ledger display — returns only essential info */ async getTransactionInfoByInvoice(invoiceNumber) {
        const tx = await this.transactionRepository.findOne({
            where: {
                invoiceNumber
            },
            relations: [
                'table',
                'cafeTable'
            ]
        });
        if (!tx) throw new _common.NotFoundException('Transaction not found');
        return {
            id: tx.id,
            invoiceNumber: tx.invoiceNumber,
            customerName: tx.customerName ?? null,
            tableId: tx.tableId ?? null,
            cafeTableId: tx.cafeTableId ?? null,
            tableName: tx.table?.tableName ?? tx.table?.name ?? tx.cafeTable?.tableName ?? null
        };
    }
    async moveTable(fromTableId, toTableId) {
        const transaction = await this.getActiveTransactionByTable(fromTableId);
        if (!transaction) throw new _common.NotFoundException('No active transaction on source table');
        transaction.tableId = toTableId;
        await this.transactionRepository.save(transaction);
    }
    async mergeTransactions(sourceTableId, targetTableId) {
        const sourceTx = await this.transactionRepository.findOne({
            where: {
                tableId: sourceTableId,
                status: (0, _typeorm1.Not)(_transactionentity.TransactionStatus.PAID)
            },
            relations: [
                'orderItems'
            ]
        });
        const targetTx = await this.transactionRepository.findOne({
            where: {
                tableId: targetTableId,
                status: (0, _typeorm1.Not)(_transactionentity.TransactionStatus.PAID)
            },
            relations: [
                'orderItems'
            ]
        });
        if (!sourceTx || !targetTx) throw new _common.NotFoundException('Source or Target active transaction not found');
        // Transfer billiard total (billiard value generated so far)
        targetTx.billiardTotal = Number(targetTx.billiardTotal) + Number(sourceTx.billiardTotal);
        // Move all items
        for (const item of sourceTx.orderItems){
            item.transactionId = targetTx.id;
            await this.orderItemRepository.save(item);
        }
        // Neutralize source transaction to prevent double-counting in reports
        sourceTx.status = _transactionentity.TransactionStatus.CANCELLED;
        sourceTx.billiardTotal = 0;
        sourceTx.cafeTotal = 0;
        sourceTx.grandTotal = 0;
        sourceTx.paidAmount = 0;
        sourceTx.remarks = `Merged into ${targetTx.invoiceNumber}`;
        await this.transactionRepository.save(sourceTx);
        // Recalculate target final totals
        return this.updateTotals(targetTx.id);
    }
    /**
   * Membayar item tertentu saja (Pay per Item)
   * Ditujukan untuk mencicil pembayaran cafe saat billing billiard masih jalan
   */ async paySelectedItems(transactionId, orderItemIds, paymentMethod) {
        return this.processMultiPayerPayment(transactionId, {
            orderItemIds,
            paymentMethod,
            payerName: 'Partial Payment'
        });
    }
    /**
   * PROSES PEMBAYARAN MULTI-PAYER (REDESIGN)
   * Mendukung pembayaran per orang dengan rincian item tertentu.
   */ async processMultiPayerPayment(transactionId, data, userId) {
        this.logger.log(`[processMultiPayerPayment] ID: ${transactionId}, Payload: ${JSON.stringify(data)}`);
        const lockKey = `payment_${transactionId}`;
        const acquired = await this.redisService.acquireLock(lockKey, 10000);
        if (!acquired) {
            throw new _common.ConflictException('Transaksi ini sedang diproses pembayarannya (Redis Lock). Harap tunggu.');
        }
        // Remove explicit check as it might throw 500 prematurely during race conditions
        // if (!this.shiftService) { ... }
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const transaction = await queryRunner.manager.findOne(_transactionentity.Transaction, {
                where: {
                    id: transactionId
                },
                relations: [
                    'member',
                    'member.tier',
                    'orderItems',
                    'orderItems.menuItem',
                    'table',
                    'cafeTable',
                    'payments'
                ]
            });
            if (!transaction) throw new _common.NotFoundException('Transaction not found');
            const itemsToPay = (transaction.orderItems || []).filter((item)=>(data.orderItemIds || []).includes(item.id) && !item.isPaid);
            const billiardPortion = Math.max(0, Number(data.billiardPortion) || 0);
            if (itemsToPay.length === 0 && billiardPortion === 0) {
                await queryRunner.rollbackTransaction();
                return transaction;
            }
            // 1. Calculate Individual Payer Totals
            const settings = await this.settingsService.getSettings();
            const vitalsResult = this.calculateVitals({
                billiardTotal: billiardPortion,
                orderItems: itemsToPay,
                member: transaction.member
            }, settings);
            const vitals = vitalsResult.session;
            const totalPaid = Number(vitals.grandTotal);
            const roundingAmount = Number(vitals.roundingAmount);
            const itemsSubtotal = Number(vitals.cafeTotal);
            const discountAmount = Number(vitals.discountAmount || 0);
            const paymentMethod = (data.paymentMethod || 'CASH').toUpperCase();
            // Handle Membership Payment
            if (paymentMethod === 'MEMBERSHIP' || paymentMethod === 'MEMBER') {
                if (!transaction.memberId) {
                    throw new _common.BadRequestException('Transaksi ini tidak terikat dengan member');
                }
                await this.memberService.deductBalance(transaction.memberId, totalPaid, queryRunner.manager);
            }
            // 2. Create Payment Record
            const paymentRecord = queryRunner.manager.create(_transactionpaymententity.TransactionPayment, {
                transactionId: transaction.id,
                payerName: data.payerName || 'Payer',
                itemsSubtotal,
                billiardPortion,
                taxAmount: Number(vitals.vatAmount),
                serviceAmount: Number(vitals.serviceChargeAmount),
                roundingAmount,
                discountAmount,
                totalPaid,
                paymentMethod: paymentMethod === 'MEMBERSHIP' ? 'MEMBER' : paymentMethod,
                itemsSnapshot: itemsToPay.map((i)=>({
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
            // Attribute to shift
            const activeShift = await this.shiftService.findActiveCashierShift() ?? (userId ? await this.shiftService.getActiveShift(userId) : null);
            if (activeShift) {
                paymentRecord.shiftId = activeShift.id;
                paymentRecord.businessDayId = activeShift.businessDayId;
            } else {
                const activeDay = await this.shiftService.getOrCreateActiveBusinessDay();
                paymentRecord.businessDayId = activeDay.id;
            }
            const savedPayment = await queryRunner.manager.save(paymentRecord);
            // 3. Mark Items as Paid
            for (const item of itemsToPay){
                item.isPaid = true;
                item.paymentId = savedPayment.id;
                await queryRunner.manager.save(item);
            }
            // 4. Update Transaction
            const paymentDtl = {
                method: paymentRecord.paymentMethod,
                amount: totalPaid,
                payer: paymentRecord.payerName,
                timestamp: new Date(),
                paymentId: savedPayment.id,
                billiardPortion
            };
            transaction.paymentDetails = [
                ...transaction.paymentDetails || [],
                paymentDtl
            ];
            if (activeShift) {
                transaction.shiftId = activeShift.id;
                transaction.businessDayId = activeShift.businessDayId;
            }
            if (userId) transaction.createdByUserId = userId;
            // Recalculate totals by re-fetching from DB to include the NEW payment
            const savedTx = await this.updateTotals(transaction.id, queryRunner.manager);
            // 5. Check completion
            if (Number(savedTx.paidAmount) >= Number(savedTx.grandTotal) - 1) {
                savedTx.status = _transactionentity.TransactionStatus.PAID;
                await this.applyRoyaltyPoints(savedTx, queryRunner.manager);
                // Broadcast Transaction specifically for UI that listens to tx updates
                this.billiardGateway.broadcastTransactionUpdate(savedTx);
                // Handle Table Closure
                if (savedTx.tableId) {
                    const table = await queryRunner.manager.findOne(_tableentity.Table, {
                        where: {
                            id: savedTx.tableId
                        }
                    });
                    if (table) {
                        const now = new Date();
                        const isPrepaid = table.sessionType === 'prepaid';
                        const isExpired = table.endTime && now >= table.endTime;
                        // Loosen requirement: If paid in full, we release the table if it was Waiting or if it's an Open session
                        // that the cashier is now finalising via payment.
                        const isBilliardDone = table.status === _tableentity.TableStatus.WAITING_PAYMENT || isPrepaid && isExpired || table.status === _tableentity.TableStatus.IN_USE || table.status === _tableentity.TableStatus.WARNING;
                        if (isBilliardDone) {
                            Object.assign(table, {
                                status: _tableentity.TableStatus.AVAILABLE,
                                sessionType: null,
                                startTime: null,
                                endTime: null,
                                isLightOn: false,
                                memberId: null,
                                packageId: null,
                                activePackagePrice: null,
                                remainingMinutes: null
                            });
                            const finalTable = await queryRunner.manager.save(_tableentity.Table, table);
                            this.billiardGateway.broadcastTableUpdate(finalTable);
                        } else {
                            this.billiardGateway.broadcastTableUpdate({
                                ...table,
                                activeTransaction: savedTx
                            });
                        }
                    }
                } else if (savedTx.cafeTableId) {
                    const ct = await queryRunner.manager.findOne(_cafetableentity.CafeTable, {
                        where: {
                            id: savedTx.cafeTableId
                        }
                    });
                    if (ct) {
                        Object.assign(ct, {
                            status: _cafetableentity.CafeTableStatus.AVAILABLE,
                            currentTransactionId: null,
                            currentCustomer: null
                        });
                        await queryRunner.manager.save(_cafetableentity.CafeTable, ct);
                        this.billiardGateway.broadcastTableUpdate({
                            ...ct,
                            type: 'cafe'
                        });
                    }
                }
                await queryRunner.manager.save(savedTx);
            } else {
                savedTx.status = _transactionentity.TransactionStatus.PARTIAL;
                await queryRunner.manager.save(savedTx);
                // Broadcast partial update
                this.billiardGateway.broadcastTransactionUpdate(savedTx);
            }
            // 6. Cashflow
            const isMemberPmt = paymentMethod === 'MEMBER' || paymentMethod === 'MEMBERSHIP';
            const description = `Split Payment [${paymentRecord.payerName}] INV: ${savedTx.invoiceNumber}`;
            await this.financeService.logCashflow({
                amount: isMemberPmt ? 0 : totalPaid,
                type: _cashflowentity.CashflowType.IN,
                source: isMemberPmt ? 'usage:member' : savedTx.cafeTableId && !savedTx.tableId ? 'sale:cafe' : 'sale:billiard',
                referenceId: savedTx.invoiceNumber,
                description: isMemberPmt ? `[MEMBER] ${description}` : description,
                businessDayId: savedTx.businessDayId,
                shiftId: savedTx.shiftId
            }, queryRunner.manager);
            await queryRunner.commitTransaction();
            return this.getTransactionById(transactionId);
        } catch (err) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Multi-payer payment FAILED: ${err.message}`);
            throw err;
        } finally{
            await queryRunner.release();
            await this.redisService.releaseLock(lockKey);
        }
    }
    /**
   * Hitung estimasi bagi rata (Split Bill Evenly)
   */ async calculateSplitEvenly(transactionId, peopleCount) {
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
    async splitTransaction(sourceTransactionId, orderItemIds) {
        const sourceTx = await this.getTransactionById(sourceTransactionId);
        const newTx = await this.createTransaction();
        const itemsToMove = sourceTx.orderItems.filter((item)=>orderItemIds.includes(item.id));
        for (const item of itemsToMove){
            item.transactionId = newTx.id;
            await this.orderItemRepository.save(item);
        }
        await this.updateTotals(sourceTransactionId);
        return this.updateTotals(newTx.id);
    }
    async updateTotals(transactionOrId, manager) {
        const queryManager = manager || this.transactionRepository.manager;
        const settings = await this.settingsService.getSettings();
        this.logger.log(`[updateTotals] Start for ${typeof transactionOrId === 'number' ? 'ID: ' + transactionOrId : 'Transaction: ' + transactionOrId.invoiceNumber}`);
        let transactionId;
        let billiardTotal;
        let billingDetails;
        let paidAmount;
        let paymentDetails;
        let orderItems;
        let businessDayId = null;
        let shiftId = null;
        let createdByUserId = null;
        let foundTx = null;
        if (typeof transactionOrId === 'number') {
            transactionId = transactionOrId;
            foundTx = await queryManager.findOne(_transactionentity.Transaction, {
                where: {
                    id: transactionId
                },
                relations: [
                    'orderItems',
                    'table',
                    'member',
                    'member.tier',
                    'payments'
                ]
            });
            if (!foundTx) throw new _common.NotFoundException('Transaction not found');
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
            if (tx.orderItems && tx.payments) {
                orderItems = tx.orderItems;
                foundTx = tx; // Ensure foundTx is set!
            } else {
                foundTx = await queryManager.findOne(_transactionentity.Transaction, {
                    where: {
                        id: transactionId
                    },
                    relations: [
                        'orderItems',
                        'orderItems.menuItem',
                        'orderItems.menuItem.category',
                        'table',
                        'member',
                        'member.tier',
                        'payments'
                    ]
                });
                if (!foundTx) throw new _common.NotFoundException('Transaction not found');
                orderItems = foundTx.orderItems || [];
            }
        }
        // Use centralized vitals calculation based on discounts
        if (!foundTx) {
            this.logger.error(`[updateTotals] foundTx is STILL NULL after resolution! txOrId type: ${typeof transactionOrId}`);
            throw new Error('Internal Server Error: Transaction context lost');
        }
        const txForVitals = foundTx;
        this.logger.log(`[updateTotals] txForVitals resolved: ${txForVitals.invoiceNumber}`);
        // IMPORTANT: For active sessions, we must ensure computeSet uses the LATEST billiard total
        // instead of whatever stale value might be in txObj.billiardTotal.
        if (txForVitals.table && txForVitals.table.startTime && txForVitals.table.status !== _tableentity.TableStatus.AVAILABLE) {
            await this.calculateBilliardTransient(txForVitals);
        }
        const { session, remaining } = this.calculateVitals(txForVitals, settings);
        let finalVitals = session; // WE PERSIST THE FULL SESSION TOTAL TO THE DB
        // Re-evaluate promos for permanence
        let billiardMins = 0;
        // Use the transaction object regardless of how it was passed
        const txObj = typeof transactionOrId === 'object' ? transactionOrId : foundTx;
        // Search for relevant date info
        if (txObj?.table?.startTime && txObj?.table?.status !== _tableentity.TableStatus.AVAILABLE) {
            billiardMins = Math.round((new Date().getTime() - new Date(txObj.table.startTime).getTime()) / 60000);
        } else if (txObj?.startTime && txObj?.endTime) {
            billiardMins = Math.round((new Date(txObj.endTime).getTime() - new Date(txObj.startTime).getTime()) / 60000);
        }
        const { discounts, appliedPromos } = await this.promoService.evaluatePromos(orderItems, billiardMins);
        const totalPromoDiscount = discounts.reduce((sum, d)=>sum + Number(d.amount || 0), 0);
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
        // Calculate total paid and reconstruct paymentDetails from all related formal payments
        const calculatedPaidAmount = (foundTx?.payments || []).reduce((sum, p)=>sum + Number(p.totalPaid || 0), 0);
        const reconstructedPaymentDetails = (foundTx?.payments || []).map((p)=>({
                method: p.paymentMethod,
                amount: Number(p.totalPaid),
                payer: p.payerName || 'Unknown',
                timestamp: p.createdAt || new Date(),
                paymentId: p.id
            }));
        // IMPORTANT: Use JSON.stringify for appliedPromos to ensure DB compatibility if driver has issues with auto-mapping
        this.logger.log(`[updateTotals] Performing DB update for ID: ${transactionId}`);
        try {
            await queryManager.update(_transactionentity.Transaction, transactionId, {
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
                appliedPromos: appliedPromos || null,
                endTime: txObj.endTime || undefined,
                paymentDetails: reconstructedPaymentDetails.length > 0 ? reconstructedPaymentDetails : paymentDetails || null,
                businessDayId: businessDayId,
                shiftId: shiftId,
                createdByUserId: createdByUserId
            });
        } catch (dbErr) {
            this.logger.error(`[updateTotals] DATABASE UPDATE FAILED: ${dbErr.message}`, dbErr.stack);
            throw dbErr;
        }
        const finalResult = await queryManager.findOne(_transactionentity.Transaction, {
            where: {
                id: transactionId
            },
            relations: [
                'orderItems',
                'orderItems.menuItem',
                'orderItems.menuItem.category',
                'payments',
                'openedBy',
                'createdBy',
                'member',
                'member.tier'
            ]
        });
        if (!finalResult) throw new _common.NotFoundException(`Transaction ${transactionId} not found after update`);
        // Broadcast for real-time payroll/ledger refresh
        this.billiardGateway.broadcastTransactionUpdate(finalResult);
        // Invalidate Bill Preview Cache for the table
        if (finalResult.tableId) {
            await this.redisService.del(`bill_preview_${finalResult.tableId}`).catch(()=>{});
            await this.redisService.del('billiard_all_tables').catch(()=>{});
        } else if (finalResult.cafeTableId) {
            await this.redisService.del(`bill_preview_cafe_${finalResult.cafeTableId}`).catch(()=>{});
            await this.redisService.del('cafe_all_tables').catch(()=>{});
        }
        return finalResult;
    }
    async setBilliardTotal(transactionId, amount, details, userName, endTime) {
        const transaction = await this.transactionRepository.findOne({
            where: {
                id: transactionId
            },
            relations: [
                'orderItems',
                'table'
            ]
        });
        if (!transaction) throw new _common.NotFoundException('Transaction not found');
        const oldAmount = Number(transaction.billiardTotal);
        transaction.billiardTotal = amount;
        if (endTime) {
            transaction.endTime = endTime;
        }
        if (userName && Number(amount) !== oldAmount) {
            await this.reportService.logAction('BILLIARD_PRICE_OVERRIDE', userName, `Ubah harga billiard manual dari Rp ${oldAmount.toLocaleString()} ke Rp ${Number(amount).toLocaleString()}`, transaction.tableId ?? undefined, transaction.invoiceNumber);
        }
        if (details) {
            if (Array.isArray(details)) {
                transaction.billingDetails = details;
            } else {
                // If this is a final summary object from stopSession, it often duplicates the breakdown.
                // We intelligently replace or append. For now, let's ensure we don't duplicate.
                const current = Array.isArray(transaction.billingDetails) ? transaction.billingDetails : [];
                // Allow duplicate Tambahan Waktu entries (e.g. extending twice with the same package)
                const isExtend = details.title && (details.title.includes('Extend') || details.title.includes('Tambahan'));
                let isDuplicate = false;
                if (!isExtend) {
                    isDuplicate = current.some((d)=>d.subtotal === details.subtotal && d.title === details.title);
                }
                if (!isDuplicate) {
                    transaction.billingDetails = [
                        ...current,
                        {
                            ...details,
                            logTime: new Date().toISOString()
                        }
                    ];
                }
            }
        }
        // CRITICAL: Persist the changes (billiardTotal and billingDetails) before calling updateTotals
        // otherwise updateTotals will pull stale data from the DB for recalculations.
        await this.transactionRepository.save(transaction);
        // Re-fetch to ensure we have latest totals
        return this.updateTotals(transaction.id);
    }
    async processPayment(transactionId, paymentDetails, userId) {
        this.logger.log(`[processPayment] ID: ${transactionId}, Payload: ${JSON.stringify(paymentDetails)}`);
        // ── IDEMPOTENCY CHECK ──────────────────────────────────────────
        const idempKey = paymentDetails.idempotencyKey;
        if (idempKey) {
            const existing = await this.redisService.getIdempotency(idempKey);
            if (existing) {
                this.logger.log(`[processPayment] ID: ${transactionId} - Returning cached idempotent result`);
                return existing;
            }
        }
        // ── MUTEX: distributed lock ────────────────────────────────────
        const lockKey = `payment_${transactionId}`;
        const acquired = await this.redisService.acquireLock(lockKey, 10000); // 10s wait
        if (!acquired) {
            throw new _common.ConflictException('Pembayaran sedang diproses oleh kasir lain.');
        }
        // ─────────────────────────────────────────────────────────────
        // if (!this.shiftService) { ... }
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const transaction = await queryRunner.manager.findOne(_transactionentity.Transaction, {
                where: {
                    id: transactionId
                },
                relations: [
                    'orderItems',
                    'table',
                    'member',
                    'member.tier',
                    'payments'
                ]
            });
            if (!transaction) throw new _common.NotFoundException('Transaction not found');
            const amount = Number(paymentDetails.amount);
            const settings = await this.settingsService.getSettings();
            // Refresh Package Data
            if (!transaction.billiardPackage && (transaction.packageId || transaction.billiardPackageId)) {
                const pkgId = transaction.packageId || transaction.billiardPackageId;
                const pkg = await queryRunner.manager.findOne(_billiardpackageentity.BilliardPackage, {
                    where: {
                        id: pkgId
                    }
                });
                if (pkg) {
                    transaction.billiardPackage = pkg;
                    transaction.packageId = pkg.id;
                }
            }
            const paymentMethod = (paymentDetails.method || 'CASH').toUpperCase();
            if (paymentMethod === 'MEMBER' || paymentMethod === 'MEMBERSHIP') {
                if (!transaction.memberId) throw new _common.BadRequestException('Bukan transaksi member');
                await this.memberService.deductBalance(transaction.memberId, amount, queryRunner.manager);
            }
            // Create Formal Payment Record
            const paymentRecord = queryRunner.manager.create(_transactionpaymententity.TransactionPayment, {
                transactionId: transaction.id,
                payerName: paymentDetails.payer || transaction.customerName || 'Customer',
                itemsSubtotal: 0,
                billiardPortion: 0,
                taxAmount: 0,
                serviceAmount: 0,
                roundingAmount: 0,
                discountAmount: 0,
                totalPaid: amount,
                paymentMethod: paymentMethod === 'MEMBERSHIP' ? 'MEMBER' : paymentMethod,
                itemsSnapshot: [],
                createdByUserId: userId
            });
            // Link to shift
            const activeShift = await this.shiftService.findActiveCashierShift() ?? (userId ? await this.shiftService.getActiveShift(userId) : null);
            if (activeShift) {
                paymentRecord.shiftId = activeShift.id;
                paymentRecord.businessDayId = activeShift.businessDayId;
                transaction.shiftId = activeShift.id;
                transaction.businessDayId = activeShift.businessDayId;
            } else {
                const activeDay = await this.shiftService.getOrCreateActiveBusinessDay();
                paymentRecord.businessDayId = activeDay.id;
                transaction.businessDayId = activeDay.id;
            }
            const savedPayment = await queryRunner.manager.save(paymentRecord);
            // Update details
            transaction.paymentDetails = [
                ...transaction.paymentDetails || [],
                {
                    method: paymentRecord.paymentMethod,
                    amount: amount,
                    payer: paymentRecord.payerName,
                    timestamp: new Date(),
                    paymentId: savedPayment.id
                }
            ];
            if (userId) transaction.createdByUserId = userId;
            // Recalculate totals by re-fetching from DB to include the NEW payment
            this.logger.log(`[processPayment] Fetching latest totals for ID: ${transactionId}`);
            const savedTx = await this.updateTotals(transactionId, queryRunner.manager);
            this.logger.log(`[processPayment] updateTotals DONE for ID: ${transactionId}. PaidAmount: ${savedTx.paidAmount}, GrandTotal: ${savedTx.grandTotal}`);
            if (savedTx.paidAmount >= savedTx.grandTotal - 1) {
                savedTx.status = _transactionentity.TransactionStatus.PAID;
                await this.applyRoyaltyPoints(savedTx, queryRunner.manager);
                // Mark items
                if (savedTx.orderItems) {
                    for (const item of savedTx.orderItems){
                        if (!item.isPaid && item.status !== 'CANCELLED') {
                            item.isPaid = true;
                            item.paymentId = savedPayment.id;
                            await queryRunner.manager.save(item);
                        }
                    }
                }
                if (savedTx.tableId) {
                    const table = await queryRunner.manager.findOne(_tableentity.Table, {
                        where: {
                            id: savedTx.tableId
                        }
                    });
                    if (table) {
                        const now = new Date();
                        const isPrepaid = table.sessionType === 'prepaid';
                        const isExpired = table.endTime && now >= table.endTime;
                        if (table.status === _tableentity.TableStatus.WAITING_PAYMENT || isPrepaid && isExpired) {
                            Object.assign(table, {
                                status: _tableentity.TableStatus.AVAILABLE,
                                sessionType: null,
                                startTime: null,
                                endTime: null,
                                remainingMinutes: null,
                                packageId: null,
                                activePackagePrice: null,
                                isLightOn: false,
                                memberId: null
                            });
                            const savedTable = await queryRunner.manager.save(_tableentity.Table, table);
                            this.billiardGateway.broadcastTableUpdate(savedTable);
                        } else {
                            this.billiardGateway.broadcastTableUpdate({
                                ...table,
                                activeTransaction: savedTx
                            });
                        }
                    }
                } else if (savedTx.cafeTableId) {
                    const ct = await queryRunner.manager.findOne(_cafetableentity.CafeTable, {
                        where: {
                            id: savedTx.cafeTableId
                        }
                    });
                    if (ct) {
                        Object.assign(ct, {
                            status: _cafetableentity.CafeTableStatus.AVAILABLE,
                            currentTransactionId: null,
                            currentCustomer: null
                        });
                        await queryRunner.manager.save(_cafetableentity.CafeTable, ct);
                        this.billiardGateway.broadcastTableUpdate({
                            ...ct,
                            type: 'cafe'
                        });
                    }
                }
            } else if (savedTx.paidAmount > 0) {
                savedTx.status = _transactionentity.TransactionStatus.PARTIAL;
                this.billiardGateway.broadcastTransactionUpdate(savedTx);
            }
            const finalSaved = await queryRunner.manager.save(savedTx);
            // Cashflow
            const isMemberPmt = paymentMethod === 'MEMBER' || paymentMethod === 'MEMBERSHIP';
            const desc = `Payment INV: ${savedTx.invoiceNumber} (${paymentRecord.paymentMethod})`;
            await this.financeService.logCashflow({
                amount: isMemberPmt ? 0 : amount,
                type: _cashflowentity.CashflowType.IN,
                source: savedTx.cafeTableId && !savedTx.tableId ? 'sale:cafe' : 'sale:billiard',
                referenceId: savedTx.invoiceNumber,
                description: isMemberPmt ? `[MEMBER] ${desc}` : desc,
                businessDayId: savedTx.businessDayId,
                shiftId: savedTx.shiftId
            }, queryRunner.manager);
            await queryRunner.commitTransaction();
            return finalSaved;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Payment failed: ${err.message}`);
            throw err;
        } finally{
            await queryRunner.release();
            await this.redisService.releaseLock(lockKey);
        }
    }
    async holdTransaction(id) {
        const transaction = await this.transactionRepository.findOne({
            where: {
                id
            },
            relations: [
                'table'
            ]
        });
        if (!transaction) throw new _common.NotFoundException('Transaction not found');
        // 1. Mark status as DEBT if not already PAID or PARTIAL
        if (transaction.status === _transactionentity.TransactionStatus.UNPAID) {
            transaction.status = _transactionentity.TransactionStatus.DEBT;
        }
        // If PARTIAL, we keep it as PARTIAL (it's inherently a debt now because it's off-table)
        // 2. Unlink the table
        const tableId = transaction.tableId;
        transaction.tableId = null;
        transaction.table = null;
        const saved = await this.transactionRepository.save(transaction);
        // 3. Reset the table status to AVAILABLE
        if (tableId) {
            const table = await this.tableRepository.findOne({
                where: {
                    id: tableId
                }
            });
            if (table) {
                table.status = _tableentity.TableStatus.AVAILABLE;
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
    async getDebtTransactions() {
        return this.transactionRepository.find({
            where: {
                status: (0, _typeorm1.In)([
                    _transactionentity.TransactionStatus.DEBT,
                    _transactionentity.TransactionStatus.PARTIAL
                ]),
                tableId: (0, _typeorm1.IsNull)()
            },
            relations: [
                'table',
                'orderItems',
                'orderItems.menuItem'
            ],
            order: {
                createdAt: 'DESC'
            }
        });
    }
    /**
   * Mengirim struk pembayaran individu ke printer
   */ async printPaymentReceipt(paymentId, printerIp) {
        try {
            this.logger.log(`Attempting to print receipt for Payment ID: ${paymentId} to IP: ${printerIp}`);
            const payment = await this.transactionPaymentRepository.findOne({
                where: {
                    id: paymentId
                },
                relations: [
                    'transaction',
                    'transaction.table',
                    'transaction.orderItems',
                    'transaction.orderItems.menuItem',
                    'transaction.orderItems.menuItem.category'
                ]
            });
            if (!payment) {
                this.logger.error(`Payment record with ID ${paymentId} not found`);
                throw new _common.NotFoundException('Payment record not found');
            }
            if (!payment.transaction) {
                this.logger.error(`Transaction relation missing for Payment ID ${paymentId}`);
                throw new Error('Transaction data missing');
            }
            const receiptText = await this.invoiceService.generateThermalReceipt(payment, payment.transaction);
            this.logger.log(`Sending receipt text to printer: ${printerIp}`);
            await this.hardwareService.printRaw(printerIp || '192.168.1.100', 9100, receiptText);
            return {
                success: true
            };
        } catch (error) {
            this.logger.error(`Cetak Struk Gagal [Payment ID: ${paymentId}]:`, error.message);
            throw error;
        }
    }
    /**
   * Unified logic to award royalty points on transaction completion.
   */ async applyRoyaltyPoints(transaction, manager) {
        const queryManager = manager || this.transactionRepository.manager;
        // WE REMOVED THE Guard isPointsAwarded TO ALLOW ADDITIVE AWARDS FOR MULTIPLE PAYMENTS (e.g. Billiard then Cafe later)
        if (transaction.type === _transactionentity.TransactionType.TOPUP) return;
        if (!transaction.memberId) return;
        try {
            const settings = await this.settingsService.getSettings();
            const pointsPerUnit = Number(settings.royaltyPointsPerAmount || 1000);
            // pointsPerUnit=0 effectively disables royalty (set royaltyPointsPerAmount=0 in settings)
            if (pointsPerUnit <= 0) return;
            const member = await queryManager.findOne(_memberentity.Member, {
                where: {
                    id: transaction.memberId
                },
                relations: [
                    'tier'
                ]
            });
            if (!member) {
                this.logger.warn(`[Royalty] Member ${transaction.memberId} not found, skipping points`);
                return;
            }
            // Update cumulative total spend (triggers auto tier-upgrade check)
            const currentSpend = Number(transaction.grandTotal || 0);
            const spendToAward = currentSpend - Number(transaction.awardedSpend || 0);
            if (spendToAward > 0) {
                await this.memberService.updateTotalSpend(member.id, spendToAward, queryManager);
                transaction.awardedSpend = currentSpend;
            }
            // ✅ FIX: Use multiplier=1 as fallback for members without a tier
            let multiplier = Number(member.tier?.pointMultiplier || 1);
            // Double-point-days bonus: check if today is a double point day for this tier
            const today = new Date().getDay(); // 0=Sun…6=Sat
            const doublePointDays = member.tier?.doublePointDays || [];
            if (doublePointDays.includes(today)) {
                multiplier *= 2;
                this.logger.log(`[Royalty] 2x Double Point Day applied for ${member.name} (day: ${today})`);
            }
            // Calculate points based on the amount PAID so far
            const totalEligiblePoints = Math.floor(Number(transaction.paidAmount || 0) / pointsPerUnit) * multiplier;
            const pointsToAward = totalEligiblePoints - Number(transaction.awardedPoints || 0);
            if (pointsToAward > 0) {
                await this.memberService.awardPoints(member.id, pointsToAward, queryManager);
                // ✅ Accrue Point Ledger
                const ledger = new _pointledgerentity.PointLedger();
                ledger.memberId = member.id;
                ledger.type = 'EARN';
                ledger.amount = pointsToAward;
                ledger.description = `Point dari TRX: ${transaction.invoiceNumber}`;
                ledger.referenceId = transaction.invoiceNumber;
                await queryManager.save(_pointledgerentity.PointLedger, ledger);
                // ✅ Update Transaction accumulators
                transaction.awardedPoints = Number(transaction.awardedPoints || 0) + pointsToAward;
                // IMPORTANT: Use queryManager directly to ensure it participates in the payment transaction
                await queryManager.save(_transactionentity.Transaction, transaction);
                this.logger.log(`[Royalty] ✅ Awarded ${pointsToAward} pts to "${member.name}" ` + `(Tier: ${member.tier?.name || 'none'}, x${multiplier}) ` + `for INV: ${transaction.invoiceNumber} (Total: Rp ${transaction.grandTotal})`);
            } else {
                this.logger.log(`[Royalty] 0 pts to award for INV: ${transaction.invoiceNumber} (Total: Rp ${transaction.grandTotal}, perUnit: ${pointsPerUnit})`);
            }
        } catch (error) {
            this.logger.error(`[Royalty] FAILED to award points for INV ${transaction.invoiceNumber}: ${error.message}`);
        }
    }
    constructor(transactionRepository, orderItemRepository, tableRepository, packageRepository, cafeTableRepository, transactionPaymentRepository, memberRepository, settingsService, financeService, billiardGateway, promoService, invoiceService, hardwareService, reportService, shiftService, memberService, dataSource, redisService){
        this.transactionRepository = transactionRepository;
        this.orderItemRepository = orderItemRepository;
        this.tableRepository = tableRepository;
        this.packageRepository = packageRepository;
        this.cafeTableRepository = cafeTableRepository;
        this.transactionPaymentRepository = transactionPaymentRepository;
        this.memberRepository = memberRepository;
        this.settingsService = settingsService;
        this.financeService = financeService;
        this.billiardGateway = billiardGateway;
        this.promoService = promoService;
        this.invoiceService = invoiceService;
        this.hardwareService = hardwareService;
        this.reportService = reportService;
        this.shiftService = shiftService;
        this.memberService = memberService;
        this.dataSource = dataSource;
        this.redisService = redisService;
        this.logger = new _common.Logger(TransactionService.name);
    }
};
TransactionService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_transactionentity.Transaction)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_orderitementity.OrderItem)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_tableentity.Table)),
    _ts_param(3, (0, _typeorm.InjectRepository)(_billiardpackageentity.BilliardPackage)),
    _ts_param(4, (0, _typeorm.InjectRepository)(_cafetableentity.CafeTable)),
    _ts_param(5, (0, _typeorm.InjectRepository)(_transactionpaymententity.TransactionPayment)),
    _ts_param(6, (0, _typeorm.InjectRepository)(_memberentity.Member)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _settingsservice.SettingsService === "undefined" ? Object : _settingsservice.SettingsService,
        typeof _financeservice.FinanceService === "undefined" ? Object : _financeservice.FinanceService,
        typeof _billiardgateway.BilliardGateway === "undefined" ? Object : _billiardgateway.BilliardGateway,
        typeof _promoservice.PromoService === "undefined" ? Object : _promoservice.PromoService,
        typeof _invoiceservice.InvoiceService === "undefined" ? Object : _invoiceservice.InvoiceService,
        typeof _hardwareservice.HardwareService === "undefined" ? Object : _hardwareservice.HardwareService,
        typeof _reportservice.ReportService === "undefined" ? Object : _reportservice.ReportService,
        typeof _shiftservice.ShiftService === "undefined" ? Object : _shiftservice.ShiftService,
        typeof _memberservice.MemberService === "undefined" ? Object : _memberservice.MemberService,
        typeof _typeorm1.DataSource === "undefined" ? Object : _typeorm1.DataSource,
        typeof _redisservice.RedisService === "undefined" ? Object : _redisservice.RedisService
    ])
], TransactionService);

//# sourceMappingURL=transaction.service.js.map