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
    async createTransaction(tableId, userId, cafeTableId) {
        this.logger.log(`Creating transaction for tableId: ${tableId}, cafeTableId: ${cafeTableId}`);
        try {
            const now = new Date();
            const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '');
            const hhmmss = now.toTimeString().slice(0, 8).replace(/:/g, '');
            const invoiceNumber = `TAB-${yymmdd}${hhmmss}`;
            // Automatic commission attribution based on table assignments
            let commissionUserId = userId;
            if (tableId) {
                const waiterId = await this.shiftService.findAssignedWaiterForTable('BILLIARD', tableId);
                if (waiterId) commissionUserId = waiterId;
            } else if (cafeTableId) {
                const waiterId = await this.shiftService.findAssignedWaiterForTable('CAFE', cafeTableId);
                if (waiterId) commissionUserId = waiterId;
            }
            const transaction = this.transactionRepository.create({
                invoiceNumber,
                tableId: tableId || null,
                cafeTableId: cafeTableId || null,
                status: _transactionentity.TransactionStatus.UNPAID,
                createdByUserId: userId,
                openedByUserId: userId,
                commissionUserId
            });
            const saved = await this.transactionRepository.save(transaction);
            return saved;
        } catch (error) {
            this.logger.error(`FAILED TO CREATE TRANSACTION: ${error.message}`);
            throw error;
        }
    }
    async updateTransaction(id, data) {
        await this.transactionRepository.update(id, data);
        return this.updateTotals(id);
    }
    async getActiveTransactionByTable(tableId) {
        const transaction = await this.transactionRepository.findOne({
            where: {
                tableId,
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
        // If the transaction is already PAID, only return it if the table is still "active" (not AVAILABLE)
        // This prevents 404 for prepaid sessions that are already paid but still running.
        if (transaction && transaction.status === _transactionentity.TransactionStatus.PAID) {
            if (!transaction.table || transaction.table.status === _tableentity.TableStatus.AVAILABLE) {
                return null;
            }
        }
        if (transaction && transaction.table && transaction.table.startTime && transaction.table.status !== _tableentity.TableStatus.AVAILABLE) {
            // Dynamically update billiard total for active session if it's 'open' or just to ensure precision
            if (transaction.table.sessionType === 'open') {
                const now = new Date();
                // Fetch package if associated (for pricing rules)
                let pkg = {};
                if (transaction.table.packageId) {
                    pkg = await this.packageRepository.findOne({
                        where: {
                            id: transaction.table.packageId
                        }
                    }) || {};
                } else {
                    // Default hourly rate fallback if no package
                    pkg = {
                        minutePrice: 50000 / 60
                    };
                }
                const pricing = this.calculateTimeBasedPrice(transaction.table.startTime, now, pkg);
                transaction.billiardTotal = pricing.total;
                transaction.billingDetails = pricing.details;
                // Add dynamic session duration string for preview (elapsed for open table)
                const elapsedMins = Math.round((now.getTime() - transaction.table.startTime.getTime()) / 60000);
                const hours = Math.floor(elapsedMins / 60);
                const minutes = elapsedMins % 60;
                transaction.sessionDuration = `${hours} Hour : ${minutes} Minute : 00 Second`;
                return await this.calculateTransientTotals(transaction);
            } else if (transaction.table.sessionType === 'prepaid' && transaction.table.activePackagePrice !== null && transaction.table.activePackagePrice !== undefined) {
                // Ensure prepaid total from table is reflected dynamically
                transaction.billiardTotal = Number(transaction.table.activePackagePrice);
                // Add dynamic session duration string for preview
                if (transaction.table.startTime && transaction.table.endTime) {
                    const diffMs = transaction.table.endTime.getTime() - transaction.table.startTime.getTime();
                    const totalMins = Math.round(diffMs / 60000);
                    const hours = Math.floor(totalMins / 60);
                    const minutes = totalMins % 60;
                    transaction.sessionDuration = `${hours} Hour : ${minutes} Minute : 00 Second`;
                }
                return await this.calculateTransientTotals(transaction);
            }
        }
        return transaction;
    }
    async getActiveTransactionByCafeTable(cafeTableId) {
        const transaction = await this.transactionRepository.findOne({
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
                'openedBy',
                'createdBy',
                'member',
                'member.tier'
            ]
        });
        if (transaction) {
            return await this.calculateTransientTotals(transaction);
        }
        return null;
    }
    /**
     * Centralized calculation logic for all transaction vitals.
     * Use this to ensure Subtotal + SC + VAT + Rounding ALWAYS equals Grand Total.
     */ calculateVitals(transaction, settings) {
        const billiardTotal = Number(transaction.billiardTotal || 0);
        const orderItems = transaction.orderItems || [];
        // 1. Calculate Cafe Totals by Category for Tier Discounts
        let foodTotal = 0;
        let drinkTotal = 0;
        let otherCafeTotal = 0;
        orderItems.forEach((item)=>{
            if (item.status?.toUpperCase() === 'CANCELLED') return;
            const lineTotal = Number(item.priceAtOrder || 0) * Number(item.quantity || 0);
            const category = item.menuItem?.category;
            const categoryName = (typeof category === 'object' ? category?.name : category) || '';
            const categoryUpper = String(categoryName).toUpperCase();
            if (categoryUpper.includes('MAKAN') || categoryUpper.includes('FOOD')) {
                foodTotal += lineTotal;
            } else if (categoryUpper.includes('MINUM') || categoryUpper.includes('DRINK') || categoryUpper.includes('BEVERAGE')) {
                drinkTotal += lineTotal;
            } else {
                otherCafeTotal += lineTotal;
            }
        });
        const coffeeTotal = foodTotal + drinkTotal + otherCafeTotal;
        const subtotal = billiardTotal + coffeeTotal;
        // 2. Applied Member Tier Discounts
        let tierDiscountAmount = 0;
        const member = transaction.member;
        if (member && member.tier && member.tier.discountConfig) {
            const cfg = member.tier.discountConfig;
            // Check Active Hours (WIB / Local Time)
            const now = new Date();
            const currentWIB = new Date(now.toLocaleString('en-US', {
                timeZone: 'Asia/Jakarta'
            }));
            const currentMinutes = currentWIB.getHours() * 60 + currentWIB.getMinutes();
            const [startH, startM] = (member.tier.activeStartTime || '00:00').split(':').map(Number);
            const [endH, endM] = (member.tier.activeEndTime || '23:59').split(':').map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            const isInsideActiveHours = startMinutes <= endMinutes ? currentMinutes >= startMinutes && currentMinutes <= endMinutes : currentMinutes >= startMinutes || currentMinutes <= endMinutes;
            if (isInsideActiveHours) {
                // Billiard Discount (Simplified: applies to total billiard for now)
                const billiardDisc = billiardTotal * (Number(cfg.billiardPackage || 0) / 100);
                // Cafe Discounts by Category
                const foodDisc = foodTotal * (Number(cfg.food || 0) / 100);
                const drinkDisc = drinkTotal * (Number(cfg.drink || 0) / 100);
                const otherDisc = otherCafeTotal * (Number(cfg.other || 0) / 100);
                tierDiscountAmount = Math.round(billiardDisc + foodDisc + drinkDisc + otherDisc);
            } else {
                this.logger.debug(`Member tier discount skipped: outside active hours (${member.tier.activeStartTime} - ${member.tier.activeEndTime})`);
                tierDiscountAmount = 0;
            }
        }
        const discountedSubtotalForFees = Math.max(0, subtotal - tierDiscountAmount);
        // 3. Calculate Fees based on (Subtotal - Tier Discount)
        const scPercent = Number(settings.serviceChargePercentage || 0) / 100;
        const vatPercent = Number(settings.ppnPercentage || 0) / 100;
        const serviceCharge = Math.round(discountedSubtotalForFees * scPercent);
        const vat = Math.round((discountedSubtotalForFees + serviceCharge) * vatPercent);
        const rawTotal = discountedSubtotalForFees + serviceCharge + vat;
        const kelipatan = Math.max(1, Number(settings.roundingKelipatan || 1));
        const grandTotal = Math.ceil(rawTotal / kelipatan) * kelipatan;
        const roundingAmount = grandTotal - rawTotal;
        return {
            cafeTotal: coffeeTotal,
            tierDiscountAmount,
            serviceChargeAmount: isNaN(serviceCharge) ? 0 : serviceCharge,
            vatAmount: isNaN(vat) ? 0 : vat,
            roundingAmount: isNaN(roundingAmount) ? 0 : roundingAmount,
            grandTotal: isNaN(grandTotal) ? 0 : grandTotal,
            billiardTotal: isNaN(billiardTotal) ? 0 : billiardTotal,
            discountAmount: isNaN(tierDiscountAmount) ? 0 : tierDiscountAmount
        };
    }
    /**
     * Internal method to calculate vitals without saving to DB (for real-time GETs)
     */ async calculateTransientTotals(transaction) {
        const settings = await this.settingsService.getSettings();
        const vitalsWithTier = this.calculateVitals(transaction, settings);
        const { tierDiscountAmount, ...vitals } = vitalsWithTier;
        // Promo Evaluation (Promo engine works ON TOP of tier discounts or alongside them)
        let billiardMins = 0;
        if (transaction.table?.startTime && transaction.table?.status !== _tableentity.TableStatus.AVAILABLE) {
            billiardMins = Math.round((new Date().getTime() - new Date(transaction.table.startTime).getTime()) / 60000);
        } else if (transaction.startTime && transaction.endTime) {
            billiardMins = Math.round((new Date(transaction.endTime).getTime() - new Date(transaction.startTime).getTime()) / 60000);
        }
        const { discounts, appliedPromos } = await this.promoService.evaluatePromos(transaction.orderItems || [], billiardMins);
        const totalPromoDiscount = discounts.reduce((sum, d)=>sum + Number(d.amount || 0), 0);
        transaction.appliedPromos = appliedPromos;
        // Apply promo discount to vitals which already accounted for tier discount
        if (totalPromoDiscount > 0) {
            const subtotal = Number(vitals.billiardTotal || 0) + Number(vitals.cafeTotal || 0);
            const discountedSubtotal = Math.max(0, subtotal - tierDiscountAmount - totalPromoDiscount);
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
            transaction.discountAmount = tierDiscountAmount + totalPromoDiscount;
        } else {
            Object.assign(transaction, vitals);
        }
        return transaction;
    }
    /**
     * Calculates the currently active price for a package, considering time slots and fallbacks.
     * Uses GMT+7 (WIB) time for slot matching.
     */ calculateCurrentPackagePrice(pkg) {
        const now = new Date();
        const timeVal = now.getHours() * 60 + now.getMinutes();
        let activePrice = Number(pkg.price || 0);
        if (pkg.timeSlots && pkg.timeSlots.length > 0) {
            let matchedAny = false;
            for (const slot of pkg.timeSlots){
                const [sH, sM] = slot.start.split(':').map(Number);
                const [eH, eM] = slot.end.split(':').map(Number);
                const slotStart = sH * 60 + sM;
                const slotEnd = eH * 60 + eM;
                let isMatch = false;
                if (slotEnd < slotStart) {
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
        // If no time slots, use simple minute price or default calculation
        if (!pkg.timeSlots || pkg.timeSlots.length === 0) {
            const durationMs = end.getTime() - start.getTime();
            let durationMinutes = durationMs / 60000;
            // ENFORCE MINIMUM 1 HOUR RULE
            if (durationMinutes < 60) {
                durationMinutes = 60;
            }
            const price = durationMinutes * Number(pkg.minutePrice || 0);
            total = Math.round(price);
            details.push({
                title: 'Regular Rate (Min 1 Hour)',
                duration: Math.round(durationMinutes),
                subtotal: Math.round(price),
                ratePerHour: Number(pkg.minutePrice || 0) * 60
            });
            return {
                total,
                details
            };
        }
        // ENFORCE MINIMUM 1 HOUR RULE for the calculation loop
        const actualDurationMs = end.getTime() - start.getTime();
        const calculationEnd = actualDurationMs < 3600000 ? new Date(start.getTime() + 3600000) : end;
        // We iterate and group by segments sequentially
        let current = new Date(start);
        let currentSegment = null;
        while(current < calculationEnd){
            const timeVal = current.getHours() * 60 + current.getMinutes();
            let matchedSlot = null;
            for (const slot of pkg.timeSlots){
                const [sH, sM] = slot.start.split(':').map(Number);
                const [eH, eM] = slot.end.split(':').map(Number);
                const slotStart = sH * 60 + sM;
                const slotEnd = eH * 60 + eM;
                let isMatch = false;
                if (slotEnd < slotStart) {
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
            const slotRate = matchedSlot ? Number(matchedSlot.price) : Number(pkg.minutePrice || 0) * 60 || 50000;
            const minuteRate = slotRate / 60;
            if (!currentSegment || currentSegment.title !== slotName) {
                if (currentSegment) {
                    currentSegment.subtotal = Math.round(currentSegment.cost);
                    currentSegment.endTimeFormatted = current.toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    }).replace(':', '.');
                    details.push(currentSegment);
                }
                currentSegment = {
                    title: slotName,
                    startTimeFormatted: current.toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    }).replace(':', '.'),
                    duration: 0,
                    cost: 0,
                    ratePerHour: slotRate
                };
            }
            currentSegment.duration += 1;
            currentSegment.cost += minuteRate;
            current = new Date(current.getTime() + 60000);
        }
        if (currentSegment) {
            currentSegment.subtotal = Math.round(currentSegment.cost);
            currentSegment.endTimeFormatted = calculationEnd.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).replace(':', '.');
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
        return transaction;
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
        const sourceTx = await this.getActiveTransactionByTable(sourceTableId);
        const targetTx = await this.getActiveTransactionByTable(targetTableId);
        if (!sourceTx || !targetTx) throw new _common.NotFoundException('Source or Target transaction not found');
        targetTx.billiardTotal = Number(targetTx.billiardTotal) + Number(sourceTx.billiardTotal);
        for (const item of sourceTx.orderItems){
            item.transactionId = targetTx.id;
            await this.orderItemRepository.save(item);
        }
        sourceTx.status = _transactionentity.TransactionStatus.PAID;
        sourceTx.paidAmount = sourceTx.grandTotal;
        sourceTx.remarks = `Merged into ${targetTx.invoiceNumber}`;
        await this.transactionRepository.save(sourceTx);
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
        try {
            const transaction = await this.getTransactionById(transactionId);
            if (!transaction) throw new _common.NotFoundException('Transaction not found');
            const itemsToPay = (transaction.orderItems || []).filter((item)=>(data.orderItemIds || []).includes(item.id) && !item.isPaid);
            const billiardPortion = Math.max(0, Number(data.billiardPortion) || 0);
            if (itemsToPay.length === 0 && billiardPortion === 0) {
                return transaction;
            }
            // 1. Calculate Individual Payer Totals using centralized logic
            const settings = await this.settingsService.getSettings();
            const vitals = this.calculateVitals({
                billiardTotal: billiardPortion,
                orderItems: itemsToPay
            }, settings);
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
            // Link to active shift/business day
            if (userId) {
                transaction.createdByUserId = userId;
                const activeShift = await this.shiftService.getActiveShift(userId);
                if (activeShift) {
                    paymentRecord.shiftId = activeShift.id;
                    paymentRecord.businessDayId = activeShift.businessDayId;
                    transaction.shiftId = activeShift.id;
                    transaction.businessDayId = activeShift.businessDayId;
                }
            }
            const savedPayment = await this.transactionPaymentRepository.save(paymentRecord);
            // 3. Mark Order Items as Paid
            for (const item of itemsToPay){
                item.isPaid = true;
                item.paymentId = savedPayment.id;
                await this.orderItemRepository.save(item);
            }
            // 4. Update Main Transaction
            transaction.paidAmount = Number(transaction.paidAmount || 0) + totalPaid;
            // Point Accrual Logic
            if (transaction.memberId) {
                try {
                    const member = await this.memberRepository.findOne({
                        where: {
                            id: transaction.memberId
                        },
                        relations: [
                            'tier'
                        ]
                    });
                    if (member && member.tier) {
                        const multiplier = Number(member.tier.pointMultiplier || 1);
                        const pointsAwarded = totalPaid / 1000 * multiplier;
                        member.points = Number(member.points || 0) + pointsAwarded;
                        await this.memberRepository.save(member);
                        this.logger.debug(`Awarded ${pointsAwarded} points to member ${member.name} (Multiplier: ${multiplier})`);
                    }
                } catch (pointError) {
                    this.logger.error(`Failed to award points: ${pointError.message}`);
                }
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
            transaction.paymentDetails = [
                ...transaction.paymentDetails || [],
                paymentDtl
            ];
            // 5. Recalculate AND Save the Transaction once
            const savedTx = await this.updateTotals(transaction);
            // 6. Check status and handle table LUNAS (Final adjustment if needed)
            if (Number(savedTx.paidAmount) >= Number(savedTx.grandTotal) - 1) {
                savedTx.status = _transactionentity.TransactionStatus.PAID;
                if (savedTx.tableId) {
                    const table = await this.tableRepository.findOne({
                        where: {
                            id: savedTx.tableId
                        }
                    });
                    if (table) {
                        const now = new Date();
                        const isPrepaid = table.sessionType === 'prepaid';
                        const isExpired = table.endTime && now >= table.endTime;
                        // Only set AVAILABLE if:
                        // 1. It's NOT a prepaid session (e.g. Open Table that is now fully paid)
                        // 2. OR it IS prepaid but the time has already expired
                        if (!isPrepaid || isExpired) {
                            table.status = _tableentity.TableStatus.AVAILABLE;
                            table.sessionType = null;
                            table.startTime = null;
                            table.endTime = null;
                            table.isLightOn = false;
                            const finalTable = await this.tableRepository.save(table);
                            this.billiardGateway.broadcastTableUpdate(finalTable);
                        } else {
                            // If it's prepaid and still has time, just broadcast the current status
                            // (which might have updated totals/payments)
                            this.billiardGateway.broadcastTableUpdate(table);
                        }
                    }
                } else if (savedTx.cafeTableId) {
                    const cafeTable = await this.cafeTableRepository.findOne({
                        where: {
                            id: savedTx.cafeTableId
                        }
                    });
                    if (cafeTable) {
                        cafeTable.status = _cafetableentity.CafeTableStatus.AVAILABLE;
                        cafeTable.currentTransactionId = null;
                        cafeTable.currentCustomer = null;
                        const savedCafeTable = await this.cafeTableRepository.save(cafeTable);
                        this.billiardGateway.broadcastTableUpdate({
                            ...savedCafeTable,
                            type: 'cafe'
                        });
                    }
                }
                // Save status update
                await this.transactionRepository.save(savedTx);
            } else {
                savedTx.status = _transactionentity.TransactionStatus.PARTIAL;
                const finalTx = await this.transactionRepository.save(savedTx);
                // BROADCAST for Real-time Dashboard (Sisa Tagihan)
                if (finalTx.tableId) {
                    const table = await this.tableRepository.findOne({
                        where: {
                            id: finalTx.tableId
                        }
                    });
                    if (table) {
                        table.type = 'billiard';
                        table.activeTransaction = finalTx;
                        table.grandTotal = Number(finalTx.grandTotal || 0);
                        this.billiardGateway.broadcastTableUpdate(table);
                    }
                } else if (finalTx.cafeTableId) {
                    const cafeTable = await this.cafeTableRepository.findOne({
                        where: {
                            id: finalTx.cafeTableId
                        }
                    });
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
                await this.financeService.logCashflow({
                    amount: totalPaid,
                    type: _cashflowentity.CashflowType.IN,
                    source: transaction.cafeTableId && !transaction.tableId ? 'sale:cafe' : 'sale:billiard',
                    referenceId: transaction.invoiceNumber,
                    description: `Split Payment [${data.payerName}] for INV: ${transaction.invoiceNumber}`
                });
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
    async updateTotals(transactionOrId) {
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
            foundTx = await this.transactionRepository.findOne({
                where: {
                    id: transactionId
                },
                relations: [
                    'orderItems',
                    'table',
                    'member',
                    'member.tier'
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
            // Use pre-loaded orderItems from memory, or re-fetch if missing
            if (tx.orderItems) {
                orderItems = tx.orderItems;
            } else {
                foundTx = await this.transactionRepository.findOne({
                    where: {
                        id: transactionId
                    },
                    relations: [
                        'orderItems',
                        'table',
                        'member',
                        'member.tier'
                    ]
                });
                if (!foundTx) throw new _common.NotFoundException('Transaction not found');
                orderItems = foundTx.orderItems || [];
            }
        }
        const settings = await this.settingsService.getSettings();
        // Use centralized vitals calculation based on discounts
        let finalVitals = this.calculateVitals({
            billiardTotal,
            orderItems
        }, settings);
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
        const totalDiscount = discounts.reduce((sum, d)=>sum + Number(d.amount || 0), 0);
        if (totalDiscount > 0) {
            const subtotal = billiardTotal + Number(finalVitals.cafeTotal || 0);
            const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
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
                grandTotal: roundedTotal
            };
        }
        // Use a targeted UPDATE to avoid circular entity issues with `.save(entity)`
        await this.transactionRepository.update(transactionId, {
            cafeTotal: Number(finalVitals.cafeTotal || 0),
            serviceChargeAmount: Number(finalVitals.serviceChargeAmount || 0),
            vatAmount: Number(finalVitals.vatAmount || 0),
            roundingAmount: Number(finalVitals.roundingAmount || 0),
            grandTotal: Number(finalVitals.grandTotal || 0),
            discountAmount: Number(finalVitals.discountAmount || 0),
            billiardTotal: Number(finalVitals.billiardTotal || 0),
            paidAmount: isNaN(paidAmount) ? 0 : paidAmount,
            billingDetails: billingDetails,
            paymentDetails: paymentDetails,
            appliedPromos: appliedPromos,
            businessDayId: businessDayId,
            shiftId: shiftId,
            createdByUserId: createdByUserId
        });
        // Return a clean re-fetch (no circular relations in the result)
        const result = await this.transactionRepository.findOne({
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
        if (!result) throw new _common.NotFoundException(`Transaction ${transactionId} not found after update`);
        // Broadcast for real-time payroll/ledger refresh
        this.billiardGateway.broadcastTransactionUpdate(result);
        return result;
    }
    async setBilliardTotal(transactionId, amount, details, userName) {
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
        if (userName && Number(amount) !== oldAmount) {
            await this.reportService.logAction('BILLIARD_PRICE_OVERRIDE', userName, `Ubah harga billiard manual dari Rp ${oldAmount.toLocaleString()} ke Rp ${Number(amount).toLocaleString()}`, transaction.tableId ?? undefined, transaction.invoiceNumber);
        }
        if (details) {
            let currentDetails = transaction.billingDetails;
            if (!Array.isArray(currentDetails)) {
                currentDetails = [];
            }
            if (Array.isArray(details)) {
                // If details is an array, we replace the whole billing breakdown (common for Open Table finalization)
                transaction.billingDetails = details;
            } else {
                // If it's a single object, we append it (common for extensions)
                // Use spread to create a new array reference so TypeORM detects the change
                transaction.billingDetails = [
                    ...currentDetails,
                    details
                ];
            }
        }
        // Pass the already modified object to preserve billiardTotal and billingDetails
        return this.updateTotals(transaction);
    }
    async processPayment(transactionId, paymentDetails, userId) {
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
        const amount = Number(paymentDetails.amount);
        // IMPORTANT: Calculate latest totals before applying payment to ensure we compare against real grandTotal
        const settings = await this.settingsService.getSettings();
        // If it's an active open session, recalculate current billiard cost to ensure we don't save 0
        if (transaction.table && transaction.table.status !== _tableentity.TableStatus.AVAILABLE && transaction.table.sessionType === 'open' && transaction.table.startTime) {
            const now = new Date();
            const diffMs = now.getTime() - new Date(transaction.table.startTime).getTime();
            const durationMinutes = Math.floor(diffMs / 60000);
            const hourlyRate = 50000; // Default or fetch from package if possible
            transaction.billiardTotal = durationMinutes / 60 * hourlyRate;
        }
        // Recalculate based on current transaction state using centralized vitals
        const vitals = this.calculateVitals(transaction, settings);
        transaction.cafeTotal = Number(vitals.cafeTotal);
        transaction.billiardTotal = Number(vitals.billiardTotal);
        transaction.serviceChargeAmount = Number(vitals.serviceChargeAmount);
        transaction.vatAmount = Number(vitals.vatAmount);
        transaction.roundingAmount = Number(vitals.roundingAmount);
        transaction.discountAmount = Number(vitals.discountAmount);
        transaction.grandTotal = Number(vitals.grandTotal);
        transaction.paidAmount = Number(transaction.paidAmount) + amount;
        // Handle Membership Payment
        const paymentMethod = (paymentDetails.method || 'CASH').toUpperCase();
        if (paymentMethod === 'MEMBER' || paymentMethod === 'MEMBERSHIP') {
            if (!transaction.memberId) {
                throw new Error('This transaction is not associated with a member');
            }
            await this.memberService.deductBalance(transaction.memberId, amount);
            paymentDetails.method = 'MEMBER'; // Normalize for DB consistency
        }
        transaction.paymentDetails = [
            ...transaction.paymentDetails || [],
            paymentDetails
        ];
        // Track who handled this payment (if it completes the transaction or for single pay)
        if (userId) {
            transaction.createdByUserId = userId;
            // Link to active shift/business day
            const activeShift = await this.shiftService.getActiveShift(userId);
            if (activeShift) {
                transaction.shiftId = activeShift.id;
                transaction.businessDayId = activeShift.businessDayId;
            }
        }
        if (transaction.paidAmount >= transaction.grandTotal) {
            transaction.status = _transactionentity.TransactionStatus.PAID;
            // Mark all items as paid for consistency
            if (transaction.orderItems) {
                for (const item of transaction.orderItems){
                    if (!item.isPaid && item.status !== 'CANCELLED') {
                        item.isPaid = true;
                        await this.orderItemRepository.save(item);
                    }
                }
            }
        } else if (transaction.paidAmount > 0) {
            transaction.status = _transactionentity.TransactionStatus.PARTIAL;
        }
        const saved = await this.transactionRepository.save(transaction);
        if (transaction.status === _transactionentity.TransactionStatus.PAID) {
            if (transaction.tableId) {
                const table = await this.tableRepository.findOne({
                    where: {
                        id: transaction.tableId
                    }
                });
                if (table) {
                    table.status = _tableentity.TableStatus.AVAILABLE;
                    table.sessionType = null;
                    table.startTime = null;
                    table.endTime = null;
                    table.remainingMinutes = null;
                    table.packageId = null;
                    table.activePackagePrice = null;
                    table.isLightOn = false;
                    const savedTable = await this.tableRepository.save(table);
                    this.billiardGateway.broadcastTableUpdate(savedTable);
                }
            } else if (transaction.cafeTableId) {
                const cafeTable = await this.cafeTableRepository.findOne({
                    where: {
                        id: transaction.cafeTableId
                    }
                });
                if (cafeTable) {
                    cafeTable.status = _cafetableentity.CafeTableStatus.AVAILABLE;
                    cafeTable.currentTransactionId = null;
                    cafeTable.currentCustomer = null;
                    const savedCafeTable = await this.cafeTableRepository.save(cafeTable);
                    this.billiardGateway.broadcastTableUpdate({
                        ...savedCafeTable,
                        type: 'cafe'
                    });
                }
            }
        } else if (transaction.status === _transactionentity.TransactionStatus.PARTIAL) {
            // BROADCAST for Real-time Dashboard (Sisa Tagihan)
            if (transaction.tableId) {
                const table = await this.tableRepository.findOne({
                    where: {
                        id: transaction.tableId
                    }
                });
                if (table) {
                    table.type = 'billiard';
                    table.activeTransaction = transaction;
                    table.grandTotal = Number(transaction.grandTotal || 0);
                    this.billiardGateway.broadcastTableUpdate(table);
                }
            } else if (transaction.cafeTableId) {
                const cafeTable = await this.cafeTableRepository.findOne({
                    where: {
                        id: transaction.cafeTableId
                    }
                });
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
        const isDebtPayment = transaction.status === _transactionentity.TransactionStatus.DEBT || transaction.status === _transactionentity.TransactionStatus.PARTIAL;
        const description = isDebtPayment ? `Pelunasan Hutang: ${transaction.invoiceNumber} (${paymentDetails.method})` : `Payment for INV: ${transaction.invoiceNumber} (${paymentDetails.method})`;
        const isMemberPayment = paymentDetails.method?.toUpperCase() === 'MEMBER';
        if (!isMemberPayment) {
            await this.financeService.logCashflow({
                amount,
                type: _cashflowentity.CashflowType.IN,
                source: transaction.cafeTableId && !transaction.tableId ? 'sale:cafe' : 'sale:billiard',
                referenceId: transaction.invoiceNumber,
                description
            });
        } else {
            // Log to ledger with 0 amount just for audit trail of usage
            await this.financeService.logCashflow({
                amount: 0,
                type: _cashflowentity.CashflowType.IN,
                source: 'usage:member',
                referenceId: transaction.invoiceNumber,
                description: `[MEMBER USAGE] ${description}`
            });
        }
        return saved;
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
    constructor(transactionRepository, orderItemRepository, tableRepository, packageRepository, cafeTableRepository, transactionPaymentRepository, memberRepository, settingsService, financeService, billiardGateway, promoService, invoiceService, hardwareService, reportService, shiftService, memberService){
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
    _ts_param(14, (0, _common.Inject)((0, _common.forwardRef)(()=>_shiftservice.ShiftService))),
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
        typeof _memberservice.MemberService === "undefined" ? Object : _memberservice.MemberService
    ])
], TransactionService);

//# sourceMappingURL=transaction.service.js.map