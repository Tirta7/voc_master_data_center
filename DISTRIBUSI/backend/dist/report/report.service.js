"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ReportService", {
    enumerable: true,
    get: function() {
        return ReportService;
    }
});
const _common = require("@nestjs/common");
const _schedule = require("@nestjs/schedule");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _shiftentity = require("../finance/entities/shift.entity");
const _shiftservice = require("../finance/shift.service");
const _financeservice = require("../finance/finance.service");
const _transactionentity = require("../transaction/entities/transaction.entity");
const _ingrediententity = require("../inventory/entities/ingredient.entity");
const _menuitementity = require("../cafe/entities/menu-item.entity");
const _orderitementity = require("../cafe/entities/order-item.entity");
const _expenseentity = require("../finance/entities/expense.entity");
const _auditlogentity = require("./entities/audit-log.entity");
const _userservice = require("../user/user.service");
const _path = /*#__PURE__*/ _interop_require_wildcard(require("path"));
const _fs = /*#__PURE__*/ _interop_require_wildcard(require("fs"));
const _puppeteer = /*#__PURE__*/ _interop_require_wildcard(require("puppeteer"));
const _handlebars = /*#__PURE__*/ _interop_require_wildcard(require("handlebars"));
const _mqttservice = require("../mqtt/mqtt.service");
const _billiardgateway = require("../socket/billiard.gateway");
const _whatsappservice = require("../whatsapp/whatsapp.service");
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
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
// AIService implementation imported via forwardRef/require below
const pdfmake = require('pdfmake');
let ReportService = class ReportService {
    parseDate(dateStr, defaultDate, endOfDay = false) {
        if (!dateStr) return defaultDate;
        let cleanStr = dateStr;
        if (!cleanStr.includes('T')) {
            cleanStr += endOfDay ? 'T23:59:59' : 'T00:00:00';
        } else {
            const timePart = cleanStr.split('T')[1];
            const colonCount = (timePart.match(/:/g) || []).length;
            if (colonCount === 1) {
                cleanStr += endOfDay ? ':59' : ':00';
            }
        }
        const date = new Date(cleanStr);
        return isNaN(date.getTime()) ? defaultDate : date;
    }
    async getDailySummary() {
        const settings = await this.settingsService.getSettings();
        const [hours, minutes] = (settings.businessDayOffset || '00:00').split(':').map(Number);
        // Get current moment in System Local Time
        const now = new Date();
        // Determine the "Business Day" date in Local Time
        // If it's 2 AM and offset is 4 AM, the effective business day is still the previous calendar day.
        const effectiveDay = new Date(now.getTime() - (hours * 3600000 + minutes * 60000));
        effectiveDay.setHours(0, 0, 0, 0);
        // The business day for 'effectiveDay' starts at 'hours:minutes' Local Time
        const businessDayStart = new Date(effectiveDay);
        businessDayStart.setHours(hours, minutes, 0, 0);
        const detailed = await this.getDetailedRevenueReport(businessDayStart, now);
        return {
            ...detailed.summary,
            paymentMethods: detailed.paymentMethods
        };
    }
    async getInventoryHealth() {
        const ingredients = await this.ingredientRepository.find();
        return ingredients.filter((ing)=>{
            return Number(ing.stockQuantity) <= Number(ing.minStockLevel);
        });
    }
    async getBestSellers(limit = 3) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const results = await this.orderItemRepository.createQueryBuilder('oi').select('oi.menuItemId', 'menuItemId').addSelect('SUM(oi.quantity)', 'totalQuantity').innerJoin('oi.menuItem', 'menuItem').addSelect('menuItem.name', 'name').where('(oi.status = :status OR oi.isPaid = :isPaid)', {
            status: _orderitementity.OrderItemStatus.DONE,
            isPaid: true
        }).andWhere('oi.status NOT IN (:...excluded)', {
            excluded: [
                _orderitementity.OrderItemStatus.CANCELLED,
                _orderitementity.OrderItemStatus.CANCEL_REQUESTED
            ]
        }).andWhere('oi.createdAt >= :date', {
            date: thirtyDaysAgo
        }).groupBy('oi.menuItemId').addGroupBy('menuItem.name').orderBy('SUM(oi.quantity)', 'DESC').limit(limit).getRawMany();
        return results.map((r)=>({
                id: Number(r.menuItemId),
                name: r.name,
                totalSales: Number(r.totalQuantity)
            }));
    }
    async getGlobalItemTrends(days = 7) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const orderItems = await this.orderItemRepository.find({
            where: {
                createdAt: (0, _typeorm1.MoreThanOrEqual)(startDate),
                status: (0, _typeorm1.Not)(_orderitementity.OrderItemStatus.CANCELLED)
            },
            select: [
                'menuItemId',
                'quantity',
                'createdAt'
            ]
        });
        const dates = [];
        for(let i = days - 1; i >= 0; i--){
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().split('T')[0]);
        }
        const itemIds = Array.from(new Set(orderItems.map((oi)=>oi.menuItemId)));
        const trends = {};
        itemIds.forEach((id)=>{
            trends[id] = dates.map((dateStr)=>{
                let count = 0;
                orderItems.forEach((oi)=>{
                    if (oi.menuItemId !== id) return;
                    const oiDate = new Date(oi.createdAt).toISOString().split('T')[0];
                    if (oiDate === dateStr) count += Number(oi.quantity);
                });
                return {
                    day: dateStr.split('-').slice(2).join('/'),
                    count
                };
            });
        });
        return trends;
    }
    async getItemsPerformance(startDate, endDate) {
        let startD;
        let endD;
        if (startDate && endDate) {
            startD = new Date(startDate);
            endD = new Date(endDate);
            // Ensure end of day for endD
            if (endDate.length <= 10) {
                endD.setHours(23, 59, 59, 999);
            }
        } else {
            startD = new Date();
            startD.setDate(startD.getDate() - 30);
            startD.setHours(0, 0, 0, 0);
            endD = new Date();
        }
        // 1. Fetch Menu Items with Finance Data (for HPP/Margin)
        const allItems = await this.menuItemRepository.find({
            where: {
                isActive: true
            },
            relations: [
                'category',
                'productFinance'
            ]
        });
        // 2. Fetch Sales Aggregate Data
        const salesData = await this.orderItemRepository.createQueryBuilder('oi').select('oi.menuItemId', 'menuItemId').addSelect('SUM(oi.quantity)', 'totalQuantity').addSelect('SUM(oi.quantity * (oi.priceAtOrder - oi.discountAmount / oi.quantity))', 'totalRevenue').where('(oi.status = :status OR oi.isPaid = :isPaid)', {
            status: _orderitementity.OrderItemStatus.DONE,
            isPaid: true
        }).andWhere('oi.status NOT IN (:...excluded)', {
            excluded: [
                _orderitementity.OrderItemStatus.CANCELLED,
                _orderitementity.OrderItemStatus.CANCEL_REQUESTED
            ]
        }).andWhere('oi.createdAt BETWEEN :start AND :end', {
            start: startD,
            end: endD
        }).groupBy('oi.menuItemId').getRawMany();
        const salesMap = new Map(salesData.map((r)=>[
                Number(r.menuItemId),
                {
                    qty: Number(r.totalQuantity),
                    revenue: Number(r.totalRevenue)
                }
            ]));
        // 3. Menu Engineering Logic
        let totalCombinedQty = 0;
        let totalCombinedProfit = 0;
        const itemsWithMargin = allItems.map((item)=>{
            const stats = salesMap.get(item.id) || {
                qty: 0,
                revenue: 0
            };
            const hpp = Number(item.productFinance?.baseHpp || 0);
            const marginPerUnit = Number(item.price) - hpp;
            const totalMargin = marginPerUnit * stats.qty;
            totalCombinedQty += stats.qty;
            totalCombinedProfit += totalMargin;
            return {
                id: item.id,
                name: item.name,
                category: item.category?.name || '—',
                price: Number(item.price),
                hpp,
                margin: marginPerUnit,
                totalQty: stats.qty,
                totalRevenue: stats.revenue,
                totalMargin
            };
        });
        const avgVolume = totalCombinedQty / (allItems.length || 1);
        const avgMargin = totalCombinedProfit / (totalCombinedQty || 1);
        const engineering = itemsWithMargin.map((it)=>{
            let cat = 'DOGS'; // Default: Low Volume, Low Margin
            let advice = 'Pertimbangkan untuk dihapus atau di-rebranding.';
            const isHighVolume = it.totalQty >= avgVolume;
            const isHighMargin = it.margin >= avgMargin;
            if (isHighVolume && isHighMargin) {
                cat = 'STARS';
                advice = 'Pertahankan & Promosikan lebih intensif!';
            } else if (isHighVolume && !isHighMargin) {
                cat = 'PLOWHORSES';
                advice = 'Populer tapi untung tipis. Coba naikkan harga sedikit atau kontrol porsi.';
            } else if (!isHighVolume && isHighMargin) {
                cat = 'PUZZLES';
                advice = 'Kurang laku tapi untung besar. Masukkan ke dalam paket bundling!';
            }
            return {
                ...it,
                engineeringCategory: cat,
                aiAdvice: advice
            };
        }).sort((a, b)=>b.totalQty - a.totalQty);
        // 4. Table Profitability Analysis
        const transactions = await this.transactionRepository.find({
            where: {
                createdAt: (0, _typeorm1.Between)(startD, endD),
                status: _transactionentity.TransactionStatus.PAID
            },
            relations: [
                'table',
                'orderItems',
                'orderItems.menuItem',
                'orderItems.menuItem.category'
            ]
        });
        const tableStats = {};
        transactions.forEach((tx)=>{
            if (!tx.table) return;
            const tName = tx.table.tableName;
            if (!tableStats[tName]) tableStats[tName] = {
                billiard: 0,
                cafe: 0,
                total: 0,
                count: 0
            };
            const billiard = Number(tx.billiardTotal || 0);
            const cafe = (tx.orderItems || []).reduce((sum, oi)=>sum + Number(oi.quantity) * Number(oi.priceAtOrder), 0);
            tableStats[tName].billiard += billiard;
            tableStats[tName].cafe += cafe;
            tableStats[tName].total += billiard + cafe;
            tableStats[tName].count += 1;
        });
        const tableRanking = Object.entries(tableStats).map(([name, data])=>({
                name,
                ...data,
                avgPerSession: data.total / data.count
            })).sort((a, b)=>b.total - a.total);
        // 5. Staff/Waiter Audit (Bundle Conversion)
        const waiterSales = await this.userService.findManagementStaff();
        const staffAudit = await Promise.all(waiterSales.map(async (u)=>{
            const staffTxs = transactions.filter((tx)=>tx.createdByUserId === u.id);
            const totalTxs = staffTxs.length;
            const bundleTxs = staffTxs.filter((tx)=>(tx.orderItems || []).some((oi)=>oi.bundleGroupId || oi.note?.includes('PACKAGE'))).length;
            let totalRevenue = 0;
            let billiardTotal = 0;
            let cafeTotal = 0;
            const categories = {};
            const packages = {};
            staffTxs.forEach((tx)=>{
                const bTotal = Number(tx.billiardTotal || 0);
                billiardTotal += bTotal;
                tx.orderItems?.forEach((oi)=>{
                    const price = Number(oi.priceAtOrder) * Number(oi.quantity);
                    cafeTotal += price;
                    const isPackage = oi.bundleGroupId || oi.note?.includes('PACKAGE');
                    const itemName = oi.menuItem?.name || oi.customName || 'Unknown Item';
                    if (isPackage) {
                        packages[itemName] = (packages[itemName] || 0) + Number(oi.quantity);
                    } else {
                        const catName = oi.menuItem?.category?.name || 'OTHERS';
                        if (!categories[catName]) categories[catName] = {};
                        categories[catName][itemName] = (categories[catName][itemName] || 0) + Number(oi.quantity);
                    }
                });
                totalRevenue += bTotal + (tx.orderItems || []).reduce((sum, oi)=>sum + Number(oi.priceAtOrder) * Number(oi.quantity), 0);
            });
            return {
                id: u.id,
                name: u.name,
                totalTxs,
                bundleTxs,
                conversionRate: totalTxs > 0 ? bundleTxs / totalTxs * 100 : 0,
                totalRevenue,
                billiardTotal,
                cafeTotal,
                categories,
                packages
            };
        }));
        const ranked = engineering;
        const sold = ranked.filter((i)=>i.totalQty > 0);
        const unsold = ranked.filter((i)=>i.totalQty === 0);
        return {
            all: ranked,
            topItems: sold.slice(0, 8),
            slowItems: [
                ...sold.slice(-5).reverse(),
                ...unsold.slice(0, 3)
            ],
            totalMenuItems: allItems.length,
            activeItems: sold.length,
            unsoldItems: unsold.length,
            // Executive Synthesis
            menuEngineering: {
                stars: engineering.filter((it)=>it.engineeringCategory === 'STARS'),
                plowhorses: engineering.filter((it)=>it.engineeringCategory === 'PLOWHORSES'),
                puzzles: engineering.filter((it)=>it.engineeringCategory === 'PUZZLES'),
                dogs: engineering.filter((it)=>it.engineeringCategory === 'DOGS'),
                avgMargin,
                avgVolume
            },
            tableProfitability: tableRanking,
            staffAudit: staffAudit.sort((a, b)=>b.conversionRate - a.conversionRate)
        };
    }
    async startShift(startedBy, openingCash) {
        const existingActive = await this.shiftRepository.findOne({
            where: {
                isActive: true
            }
        });
        if (existingActive) throw new Error('A shift is already active');
        const shift = this.shiftRepository.create({
            startedBy,
            cashStart: openingCash,
            isActive: true
        });
        return this.shiftRepository.save(shift);
    }
    async closeShift(id, endedBy, closingCash, remarks, stockReports, attachmentUrl) {
        const shift = await this.shiftRepository.findOne({
            where: {
                id,
                isActive: true
            }
        });
        if (!shift) throw new _common.NotFoundException('Active shift not found');
        // Check if all mandatory department reports are DONE (only for those the user is responsible for)
        const pendingDepts = [];
        const userRole = (shift.user?.role?.name || '').toUpperCase();
        const userDepts = this.shiftService.getDepartmentsByRole(userRole);
        if (userDepts.length > 0) {
            const reportStatus = shift.stockReportStatus || {};
            for (const dept of userDepts){
                if (dept === 'CASHIER') continue;
                const hasHvi = await this.ingredientRepository.exists({
                    where: {
                        department: dept,
                        isHighValue: true
                    }
                }) || await this.menuItemRepository.exists({
                    where: {
                        department: dept,
                        isHighValue: true
                    }
                });
                if (hasHvi && reportStatus[dept] !== 'DONE') {
                    pendingDepts.push(dept);
                }
            }
        }
        if (pendingDepts.length > 0) {
            throw new Error(`Shift tidak bisa ditutup. Laporan stok departemen berikut belum selesai: ${pendingDepts.join(', ')}`);
        }
        shift.endTime = new Date();
        shift.endedBy = endedBy;
        shift.cashPhysical = closingCash;
        if (remarks) shift.note = remarks;
        shift.attachmentUrl = attachmentUrl || '';
        shift.isActive = false;
        // 3. Final Reconciliation (Use ShiftService for precision)
        const breakdown = await this.shiftService.calculateExpectedCash(id);
        shift.cashSystem = breakdown.expectedTotal;
        shift.cashRevenue = breakdown.cashRevenue;
        shift.nonCashRevenue = breakdown.nonCashRevenue;
        shift.totalExpenses = breakdown.totalExpenses;
        shift.discrepancy = Number(shift.cashPhysical) - Number(shift.cashSystem);
        // 3.5 Calculate Performance Summary (for the frontend summary card)
        shift.performanceSummary = await this.shiftService.calculateShiftPerformance(id);
        const saved = await this.shiftRepository.save(shift);
        // 4. Handle Stock Reports
        if (stockReports && Array.isArray(stockReports)) {
            await this.shiftService.handleShiftStockReporting(id, stockReports);
        }
        // 5. Notify Owner via WhatsApp
        this.shiftService.notifyOwnerShiftClosed(id).catch((err)=>{
            this.logger.error('Failed to notify owner about shift closing (ReportService):', err);
        });
        return saved;
    }
    async getActiveShift() {
        const shift = await this.shiftRepository.findOne({
            where: {
                isActive: true
            }
        });
        if (shift) {
            const breakdown = await this.shiftService.calculateExpectedCash(shift.id);
            shift.cashSystem = breakdown.expectedTotal;
            shift.cashRevenue = breakdown.cashRevenue;
            shift.nonCashRevenue = breakdown.nonCashRevenue;
            shift.totalExpenses = breakdown.totalExpenses;
        }
        return shift;
    }
    async getShiftAuditReport(startDate, endDate, shiftId) {
        let shifts = [];
        if (shiftId) {
            const singleShift = await this.shiftRepository.findOne({
                where: {
                    id: shiftId
                },
                relations: [
                    'user',
                    'user.role',
                    'stockReports'
                ]
            });
            if (singleShift) shifts = [
                singleShift
            ];
        } else if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (endDate.length <= 10) end.setHours(23, 59, 59, 999);
            shifts = await this.shiftRepository.find({
                where: {
                    startTime: (0, _typeorm1.Between)(start, end)
                },
                relations: [
                    'user',
                    'user.role',
                    'stockReports'
                ],
                order: {
                    startTime: 'DESC'
                }
            });
        } else {
            const now = new Date();
            shifts = await this.shiftRepository.find({
                where: {
                    startTime: (0, _typeorm1.Between)(new Date(now.setHours(0, 0, 0, 0)), new Date(now.setHours(23, 59, 59, 999)))
                },
                relations: [
                    'user',
                    'user.role',
                    'stockReports'
                ],
                order: {
                    startTime: 'DESC'
                }
            });
        }
        const filteredShifts = shiftId ? shifts : shifts.filter((shift)=>{
            const role = (shift.user?.role?.name || '').toUpperCase();
            return !role.includes('WAITER') && !role.includes('PELAYAN');
        });
        const mappedShifts = await Promise.all(filteredShifts.map(async (shift)=>{
            const shiftExpenses = await this.getShiftExpenses(shift.id, shift.user?.id, shift.startTime, shift.endTime || new Date());
            const totalExp = shiftExpenses.reduce((sum, e)=>sum + Number(e.amount), 0);
            const paymentMethods = await this.getShiftPaymentBreakdown(shift.id);
            const totalRev = Object.values(paymentMethods).reduce((s, v)=>s + Number(v), 0);
            return {
                id: shift.id,
                status: shift.status,
                shiftName: shift.shiftName,
                userName: shift.user?.name || 'Unknown',
                role: shift.user?.role?.name || 'Staff',
                startTime: shift.startTime,
                endTime: shift.endTime,
                cashSystem: Number(shift.cashSystem),
                cashPhysical: Number(shift.cashPhysical),
                cashStart: Number(shift.cashStart),
                discrepancy: Number(shift.discrepancy),
                cashRevenue: Number(paymentMethods['CASH'] || 0),
                nonCashRevenue: totalRev - Number(paymentMethods['CASH'] || 0),
                totalExpenses: totalExp,
                netCashflow: totalRev - totalExp,
                stockReportStatus: shift.stockReportStatus,
                stockReportsGrouped: this.groupStockReportsByDepartment(shift.stockReports || []),
                aiAnalysis: this.generateShiftAIAnalysis(shift),
                paymentBreakdown: paymentMethods,
                expenses: shiftExpenses
            };
        }));
        return mappedShifts;
    }
    groupStockReportsByDepartment(reports) {
        const grouped = {};
        reports.forEach((sr)=>{
            const dept = sr.department || 'OTHER';
            if (!grouped[dept]) grouped[dept] = [];
            grouped[dept].push({
                itemName: sr.itemName,
                systemStock: Number(sr.systemStock),
                physicalStock: Number(sr.physicalStock),
                discrepancy: Number(sr.discrepancy),
                lostValue: Number(sr.lostValue || 0),
                note: sr.note
            });
        });
        return grouped;
    }
    async getShiftPaymentBreakdown(shiftId) {
        const transactions = await this.transactionRepository.find({
            where: {
                shiftId
            }
        });
        const breakdown = {
            CASH: 0,
            QRIS: 0,
            TRANSFER: 0,
            MEMBER: 0
        };
        transactions.forEach((tx)=>{
            if (tx.paymentDetails && Array.isArray(tx.paymentDetails)) {
                tx.paymentDetails.forEach((p)=>{
                    const method = (p.method || 'CASH').toUpperCase();
                    const normalized = method === 'MEMBERSHIP' ? 'MEMBER' : method;
                    breakdown[normalized] = (breakdown[normalized] || 0) + Number(p.amount);
                });
            } else if (Number(tx.paidAmount) > 0) {
                const method = (tx.paymentMethod || 'CASH').toUpperCase();
                const normalized = method === 'MEMBERSHIP' ? 'MEMBER' : method;
                breakdown[normalized] = (breakdown[normalized] || 0) + Number(tx.paidAmount);
            }
        });
        return breakdown;
    }
    async getShiftExpenses(shiftId, userId, start, end) {
        if (!userId) {
            return this.expenseRepository.find({
                where: {
                    shiftId
                },
                order: {
                    date: 'DESC'
                }
            });
        }
        return this.expenseRepository.find({
            where: [
                {
                    shiftId
                },
                {
                    recordedByUserId: userId,
                    date: (0, _typeorm1.Between)(start, end)
                }
            ],
            order: {
                date: 'DESC'
            }
        });
    }
    generateShiftAIAnalysis(shift) {
        const cashDisc = Number(shift.discrepancy);
        const stockDisc = (shift.stockReports || []).filter((r)=>Number(r.discrepancy) !== 0).length;
        const insights = [];
        let riskLevel = 'LOW';
        let summary = 'Shift berjalan normal dengan integritas data yang baik.';
        if (Math.abs(cashDisc) > 100000) {
            riskLevel = 'HIGH';
            insights.push(`Selisih kas signifikan sebesar ${new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR'
            }).format(cashDisc)}. Periksa log pembatalan transaksi.`);
        } else if (Math.abs(cashDisc) > 0) {
            riskLevel = 'MEDIUM';
            insights.push(`Ditemukan selisih kas minor. Pastikan akurasi pengembalian uang tunai.`);
        }
        if (stockDisc > 3) {
            riskLevel = riskLevel === 'HIGH' ? 'CRITICAL' : 'HIGH';
            insights.push(`Variansi stok tinggi ditemukan pada ${stockDisc} item. Potensi kebocoran inventori terdeteksi.`);
        } else if (stockDisc > 0) {
            insights.push(`Terdapat ${stockDisc} item dengan selisih stok. Harap verifikasi catatan waste.`);
        }
        if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
            summary = 'Ditemukan anomali signifikan pada shift ini. Diperlukan audit mendalam oleh manajemen.';
        } else if (riskLevel === 'MEDIUM') {
            summary = 'Shift menunjukkan variansi kecil. Perlu perhatian pada prosedur standar kasir.';
        }
        return {
            riskLevel,
            summary,
            insights,
            recommendation: riskLevel !== 'LOW' ? 'Lakukan cross-check dengan CCTV pada jam-jam sibuk.' : 'Pertahankan performa operasional saat ini.'
        };
    }
    async getAuditAIInsights(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (endDate.length <= 10) end.setHours(23, 59, 59, 999);
        const shifts = await this.shiftRepository.find({
            where: {
                startTime: (0, _typeorm1.Between)(start, end)
            },
            relations: [
                'stockReports'
            ]
        });
        if (shifts.length === 0) return null;
        let totalCashDisc = 0;
        let totalStockDisc = 0;
        const itemRisks = {};
        shifts.forEach((s)=>{
            totalCashDisc += Math.abs(Number(s.discrepancy || 0));
            (s.stockReports || []).forEach((r)=>{
                if (Number(r.discrepancy) !== 0) {
                    totalStockDisc++; // Keep as anomaly event count
                    itemRisks[r.itemName] = (itemRisks[r.itemName] || 0) + Math.abs(Number(r.discrepancy));
                }
            });
        });
        const integrityScore = Math.max(0, 100 - totalCashDisc / 200000 - totalStockDisc * 2);
        const topRisks = Object.entries(itemRisks).sort((a, b)=>b[1] - a[1]).map(([name, qty])=>({
                name,
                frequency: Number(qty)
            }));
        let aiSummary = 'Integritas operasional stabil.';
        if (integrityScore < 70) aiSummary = 'Terdeteksi anomali pola kehilangan aset yang konsisten.';
        else if (integrityScore < 90) aiSummary = 'Operasional berjalan baik dengan variansi minor yang wajar.';
        return {
            integrityScore: Math.round(integrityScore),
            totalCashDiscrepancy: totalCashDisc,
            totalStockDiscrepancy: totalStockDisc,
            topRisks,
            aiSummary,
            recommendations: [
                'Tingkatkan frekuensi audit stok pada item: ' + (topRisks.map((r)=>r.name).join(', ') || 'Semua Item'),
                'Lakukan evaluasi prosedur serah terima kasir.',
                'Aktifkan notifikasi real-time untuk selisih di atas Rp 50.000.'
            ]
        };
    }
    async getShiftHistory() {
        return this.shiftRepository.find({
            order: {
                startTime: 'DESC'
            }
        });
    }
    async logAction(action, user, details, tableId, invoiceNumber) {
        const log = this.auditRepository.create({
            action,
            user,
            details,
            tableId,
            invoiceNumber
        });
        const saved = await this.auditRepository.save(log);
        this.mqttService.broadcastAuditUpdate(saved);
        this.billiardGateway.broadcastAuditUpdate(saved);
        return saved;
    }
    async getAuditLogs(filters = {}) {
        const { action, user, startDate, endDate, page = 1, limit = 100 } = filters;
        const query = this.auditRepository.createQueryBuilder('log');
        if (action) {
            query.andWhere('log.action = :action', {
                action
            });
        }
        if (user) {
            query.andWhere('log.user LIKE :user', {
                user: `%${user}%`
            });
        }
        if (startDate && endDate) {
            query.andWhere('log.createdAt BETWEEN :start AND :end', {
                start: new Date(startDate),
                end: new Date(endDate)
            });
        } else if (startDate) {
            query.andWhere('log.createdAt >= :start', {
                start: new Date(startDate)
            });
        } else if (endDate) {
            query.andWhere('log.createdAt <= :end', {
                end: new Date(endDate)
            });
        }
        const [items, total] = await query.orderBy('log.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }
    async getAuditStats() {
        const settings = await this.settingsService.getSettings();
        const [h, m] = (settings.businessDayOffset || '00:00').split(':').map(Number);
        const now = new Date();
        const today = new Date(now);
        if (now.getHours() < h) today.setDate(today.getDate() - 1);
        today.setHours(h, m, 0, 0);
        const totalToday = await this.auditRepository.count({
            where: {
                createdAt: (0, _typeorm1.MoreThanOrEqual)(today)
            }
        });
        const criticalActions = [
            'CANCEL_ORDER',
            'CANCEL_REQUESTED',
            'CANCEL_CONFIRMED',
            'DELETE_ITEM',
            'VOID_TRANSACTION',
            'STOCK_ADJUSTMENT',
            'PRICE_CHANGE',
            'BILLIARD_PRICE_OVERRIDE'
        ];
        const criticalToday = await this.auditRepository.createQueryBuilder('log').where('log.createdAt >= :today', {
            today
        }).andWhere('log.action IN (:...actions)', {
            actions: criticalActions
        }).getCount();
        const topUserRaw = await this.auditRepository.createQueryBuilder('log').select('log.user', 'user').addSelect('COUNT(log.id)', 'count').where('log.createdAt >= :today', {
            today
        }).groupBy('log.user').orderBy('count', 'DESC').limit(1).getRawOne();
        const actionDistribution = await this.auditRepository.createQueryBuilder('log').select('log.action', 'action').addSelect('COUNT(log.id)', 'count').where('log.createdAt >= :today', {
            today
        }).groupBy('log.action').getRawMany();
        return {
            totalToday,
            criticalToday,
            topUser: topUserRaw || {
                user: 'None',
                count: 0
            },
            distribution: actionDistribution.map((d)=>({
                    action: d.action,
                    count: Number(d.count)
                }))
        };
    }
    async getFullTransactions(limit = 300) {
        return this.transactionRepository.find({
            where: {
                status: _transactionentity.TransactionStatus.PAID
            },
            relations: [
                'table',
                'cafeTable',
                'payments',
                'orderItems',
                'orderItems.menuItem',
                'orderItems.menuItem.category'
            ],
            order: {
                updatedAt: 'DESC'
            },
            take: limit
        });
    }
    async getSettings() {
        return this.settingsService.getSettings();
    }
    async getDetailedRevenueReport(startQuery, endQuery) {
        const start = typeof startQuery === 'string' ? this.parseDate(startQuery, new Date()) : startQuery;
        const end = typeof endQuery === 'string' ? this.parseDate(endQuery, new Date(), true) : endQuery;
        // 1. Fetch Transactions in range (based on createdAt for full coverage)
        const transactions = await this.transactionRepository.find({
            where: {
                createdAt: (0, _typeorm1.Between)(start, end),
                status: (0, _typeorm1.Not)(_transactionentity.TransactionStatus.CANCELLED)
            },
            relations: [
                'table',
                'cafeTable',
                'payments',
                'orderItems',
                'createdBy',
                'member'
            ]
        });
        // 2. Fetch Order Items in range (based on createdAt - order time)
        const orderItems = await this.orderItemRepository.find({
            where: {
                createdAt: (0, _typeorm1.Between)(start, end),
                status: (0, _typeorm1.Not)(_orderitementity.OrderItemStatus.CANCELLED)
            },
            relations: [
                'menuItem',
                'menuItem.productFinance'
            ]
        });
        // 3. Aggregate By Hour
        const hourlyData = {};
        for(let i = 0; i < 24; i++){
            hourlyData[i] = {
                billiard: 0,
                cafe: 0,
                topup: 0,
                count: 0
            };
        }
        // Helper to get hour in Local Time
        const getLocalHour = (d)=>{
            return d.getHours();
        };
        // Billiard & Topup revenue grouped by startTime hour (Local)
        transactions.forEach((tx)=>{
            const hour = getLocalHour(new Date(tx.startTime || tx.createdAt));
            if (tx.type === 'TOPUP') {
                hourlyData[hour].topup += Number(tx.grandTotal || 0);
            } else {
                hourlyData[hour].billiard += Number(tx.billiardTotal || 0);
            }
            hourlyData[hour].count += 1;
        });
        // Cafe revenue grouped by OrderItem createdAt hour (Local)
        orderItems.forEach((item)=>{
            const hour = getLocalHour(new Date(item.createdAt));
            hourlyData[hour].cafe += Number(item.quantity) * Number(item.priceAtOrder);
        });
        // 4. Payment Method Totals & Breakdown Accuracy
        const paymentMethods = {};
        const paymentCounts = {};
        const tableUsage = {};
        const staffRevenue = {};
        let totalTaxService = 0;
        let totalAwardedPoints = 0;
        let totalRewardCount = 0;
        let totalRewardValue = 0;
        let totalOccupancyMinutes = 0;
        transactions.forEach((tx)=>{
            // 4.1 Payment Distribution (Authoritative source: payments relation)
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
                paymentMethods[m] = (paymentMethods[m] || 0) + p.amount;
                paymentCounts[m] = (paymentCounts[m] || 0) + 1;
            });
            // 4.2 Tax, Service, and Points Summation
            if (tx.type !== 'TOPUP') {
                totalTaxService += Number(tx.vatAmount || 0) + Number(tx.serviceChargeAmount || 0);
                // table / facility metrics
                const tableId = tx.table?.id || tx.cafeTable?.id;
                if (tableId) {
                    const tableName = tx.table?.tableName || tx.cafeTable?.tableName || 'Unknown';
                    if (!tableUsage[tableName]) tableUsage[tableName] = {
                        count: 0,
                        duration: 0,
                        revenue: 0,
                        billiardRevenue: 0,
                        cafeRevenue: 0,
                        hourlyStats: {}
                    };
                    tableUsage[tableName].count++;
                    tableUsage[tableName].revenue += Number(tx.grandTotal || 0);
                    tableUsage[tableName].billiardRevenue += Number(tx.billiardTotal || 0);
                    tableUsage[tableName].cafeRevenue += Number(tx.cafeTotal || 0);
                    if (tx.startTime) {
                        const hour = new Date(tx.startTime).getHours();
                        tableUsage[tableName].hourlyStats[hour] = (tableUsage[tableName].hourlyStats[hour] || 0) + 1;
                    }
                    if (tx.startTime && tx.updatedAt) {
                        const duration = Math.max(0, (tx.updatedAt.getTime() - tx.startTime.getTime()) / 60000);
                        tableUsage[tableName].duration += duration;
                        totalOccupancyMinutes += duration;
                    }
                }
                // staff attribution
                const staffName = tx.createdBy?.name || 'System';
                staffRevenue[staffName] = (staffRevenue[staffName] || 0) + Number(tx.grandTotal || 0);
            }
            totalAwardedPoints += Number(tx.awardedPoints || 0);
        });
        // Calculate real cash omzet (exclude MEMBER balance usage — not physical cash)
        let totalOmzetCash = 0;
        let totalVat = 0;
        let totalServiceCharge = 0;
        let totalDiscount = 0;
        let totalRounding = 0;
        let totalMemberUsage = 0;
        let memberRevenue = 0;
        let guestRevenue = 0;
        transactions.forEach((tx)=>{
            const gtotal = Number(tx.grandTotal || 0);
            if (tx.memberId) {
                memberRevenue += gtotal;
            } else {
                guestRevenue += gtotal;
            }
        });
        // Recalculate based on payment distribution...
        Object.entries(paymentMethods).forEach(([method, amount])=>{
            const m = method.toUpperCase();
            if (m !== 'MEMBER' && m !== 'MEMBERSHIP') {
                totalOmzetCash += Number(amount);
            } else {
                totalMemberUsage += Number(amount);
            }
        });
        // 4.3 Reward Analytics
        orderItems.forEach((item)=>{
            if (item.priceAtOrder === 0 && (item.customName?.includes('[RWD]') || item.note?.includes('POIN'))) {
                totalRewardCount += Number(item.quantity || 0);
                totalRewardValue += Number(item.quantity || 0) * Number(item.menuItem?.price || 0);
            }
        });
        // Aggregate per-transaction tax, service charge, and discount
        transactions.forEach((tx)=>{
            if (tx.type !== 'TOPUP') {
                totalVat += Number(tx.vatAmount || 0);
                totalServiceCharge += Number(tx.serviceChargeAmount || 0);
                totalDiscount += Number(tx.discountAmount || 0);
                totalRounding += Number(tx.roundingAmount || 0);
            }
        });
        return {
            startTime: start,
            endTime: end,
            hourly: Object.entries(hourlyData).map(([hour, data])=>({
                    hour: Number(hour),
                    ...data,
                    total: data.billiard + data.cafe + data.topup
                })),
            paymentMethods,
            summary: {
                totalBilliard: transactions.filter((tx)=>tx.type !== 'TOPUP').reduce((s, t)=>s + Number(t.billiardTotal || 0), 0),
                totalCafe: orderItems.reduce((s, i)=>s + Number(i.quantity) * Number(i.priceAtOrder), 0),
                totalTopUp: transactions.filter((tx)=>tx.type === 'TOPUP').reduce((s, t)=>s + Number(t.grandTotal || 0), 0),
                taxServiceRevenue: totalTaxService,
                totalOmzet: totalOmzetCash,
                grossRevenue: transactions.reduce((s, t)=>s + Number(t.grandTotal || 0), 0),
                totalVat,
                totalServiceCharge,
                totalDiscount,
                totalRounding,
                totalMemberUsage,
                totalAwardedPoints,
                transactionCount: transactions.length,
                paymentCounts,
                unpaidAmount: transactions.filter((tx)=>tx.status !== _transactionentity.TransactionStatus.PAID).reduce((s, t)=>s + (Number(t.grandTotal || 0) - Number(t.paidAmount || 0)), 0),
                totalRewardCount,
                totalRewardValue,
                tableUsage: Object.entries(tableUsage).reduce((acc, [name, stats])=>{
                    let peakHour = 0;
                    let maxSessions = 0;
                    Object.entries(stats.hourlyStats).forEach(([hour, sessions])=>{
                        if (sessions > maxSessions) {
                            maxSessions = sessions;
                            peakHour = Number(hour);
                        }
                    });
                    acc[name] = {
                        ...stats,
                        peakHour,
                        avgSessionMinutes: stats.count > 0 ? stats.duration / stats.count : 0
                    };
                    return acc;
                }, {}),
                totalOccupancyMinutes,
                memberRevenue,
                currentBusinessDayId: transactions.length > 0 ? transactions[0].businessDayId : null,
                // Phase 5 Additions
                staffPerformance: Object.entries(staffRevenue).map(([name, revenue])=>{
                    const staffShiftDurations = transactions.filter((tx)=>(tx.createdBy?.name || 'System') === name && tx.startTime && tx.updatedAt).map((tx)=>(tx.updatedAt.getTime() - tx.startTime.getTime()) / 3600000); // in hours
                    const totalHours = staffShiftDurations.length > 0 ? staffShiftDurations.reduce((a, b)=>a + b, 0) : 1;
                    // Upsell Ratio: (Cafe Revenue / Billiard Revenue) for this staff
                    const staffBilliard = transactions.filter((tx)=>(tx.createdBy?.name || 'System') === name && tx.type !== 'TOPUP').reduce((s, t)=>s + Number(t.billiardTotal || 0), 0);
                    const staffTransactions = transactions.filter((tx)=>(tx.createdBy?.name || 'System') === name);
                    const staffCafeItems = orderItems.filter((oi)=>staffTransactions.some((tx)=>tx.orderItems?.some((ti)=>ti.id === oi.id)));
                    const staffCafe = staffCafeItems.reduce((s, i)=>s + Number(i.quantity) * Number(i.priceAtOrder), 0);
                    return {
                        name,
                        revenue,
                        rph: revenue / totalHours,
                        upsellRatio: staffBilliard > 0 ? staffCafe / staffBilliard : 0,
                        txCount: staffTransactions.length
                    };
                })
            },
            hourlyForecast: (await this.aiService.predictDailyTraffic()).hourlyTraffic,
            churnRiskMembers: await (async ()=>{
                const fourteenDaysAgo = new Date();
                fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
                const members = await this.transactionRepository.createQueryBuilder('t').innerJoinAndSelect('t.member', 'm').select('m.id', 'id').addSelect('m.name', 'name').addSelect('m.phone', 'phone').addSelect('MAX(t.createdAt)', 'lastVisit').groupBy('m.id').addGroupBy('m.name').addGroupBy('m.phone').having('MAX(t.createdAt) < :date', {
                    date: fourteenDaysAgo
                }).orderBy('MAX(t.createdAt)', 'DESC').limit(5).getRawMany();
                return members;
            })()
        };
    }
    async getStoreStockReport() {
        const storeItems = await this.menuItemRepository.find({
            where: {
                category: {
                    name: 'STORE'
                }
            },
            relations: [
                'category'
            ]
        });
        const ingredients = await this.ingredientRepository.find();
        const reportMap = new Map();
        // 1. Process Ingredients first (Primary source for raw materials)
        for (const ing of ingredients){
            const usageData = await this.orderItemRepository.createQueryBuilder('oi').leftJoin('oi.menuItem', 'mi').leftJoin('mi.recipes', 'rec').where('rec.ingredientId = :ingId', {
                ingId: ing.id
            }).andWhere('oi.status != :cancelled', {
                cancelled: _orderitementity.OrderItemStatus.CANCELLED
            }).select('SUM(oi.quantity * rec.quantity)', 'estimatedUsage').getRawOne();
            const sumData = await this.ingredientRepository.manager.createQueryBuilder('shift_stock_reports', 'ssr').select('SUM(ssr.lostValue)', 'totalLostValue').where('ssr.ingredientId = :ingId', {
                ingId: ing.id
            }).getRawOne();
            const latestData = await this.ingredientRepository.manager.createQueryBuilder('shift_stock_reports', 'ssr').select('ssr.discrepancy', 'latestDiscrepancy').addSelect('ssr.createdAt', 'lastAuditAt').where('ssr.ingredientId = :ingId', {
                ingId: ing.id
            }).orderBy('ssr.createdAt', 'DESC').getRawOne();
            const netDiscrepancy = Number(latestData?.latestDiscrepancy || 0);
            const totalLostValue = Number(sumData?.totalLostValue || 0);
            const lastAuditAt = latestData?.lastAuditAt || null;
            const totalUsage = Number(usageData.estimatedUsage || 0);
            const currentStock = Number(ing.stockQuantity || 0);
            const totalStock = currentStock + totalUsage;
            reportMap.set(ing.name.toLowerCase(), {
                id: `ing_${ing.id}`,
                originalId: ing.id,
                type: 'ingredient',
                name: ing.name,
                sku: ing.sku,
                category: ing.category || 'Raw Material',
                price: Number(ing.costPrice),
                totalStock,
                totalSold: totalUsage,
                currentStock,
                totalRevenue: 0,
                minStockLevel: Number(ing.minStockLevel || 0),
                isLowStock: currentStock <= Number(ing.minStockLevel || 0),
                unit: ing.unit || 'Unit',
                totalDiscrepancy: Math.abs(netDiscrepancy),
                isSurplus: netDiscrepancy > 0,
                totalLostValue,
                isHighValue: !!ing.isHighValue,
                auditFrequency: ing.auditFrequency || 'SHIFT',
                lastAuditAt
            });
        }
        // 2. Process Store Menu Items (Merge or Add)
        for (const item of storeItems){
            const nameKey = item.name.toLowerCase();
            const salesData = await this.orderItemRepository.createQueryBuilder('orderItem').select('SUM(orderItem.quantity)', 'totalSold').addSelect('SUM(orderItem.quantity * orderItem.priceAtOrder)', 'totalRevenue').where('orderItem.menuItemId = :itemId', {
                itemId: item.id
            }).andWhere('orderItem.status != :cancelled', {
                cancelled: _orderitementity.OrderItemStatus.CANCELLED
            }).getRawOne();
            const sumData = await this.menuItemRepository.manager.createQueryBuilder('shift_stock_reports', 'ssr').select('SUM(ssr.lostValue)', 'totalLostValue').where('ssr.menuItemId = :itemId', {
                itemId: item.id
            }).getRawOne();
            const latestData = await this.menuItemRepository.manager.createQueryBuilder('shift_stock_reports', 'ssr').select('ssr.discrepancy', 'latestDiscrepancy').addSelect('ssr.createdAt', 'lastAuditAt').where('ssr.menuItemId = :itemId', {
                itemId: item.id
            }).orderBy('ssr.createdAt', 'DESC').getRawOne();
            const netDiscrepancy = Number(latestData?.latestDiscrepancy || 0);
            const totalLostValue = Number(sumData?.totalLostValue || 0);
            const lastAuditAt = latestData?.lastAuditAt || null;
            const totalSold = Number(salesData.totalSold || 0);
            const totalRevenue = Number(salesData.totalRevenue || 0);
            if (reportMap.has(nameKey)) {
                // Merge with existing Ingredient entry
                const existing = reportMap.get(nameKey);
                existing.totalSold += totalSold;
                existing.totalRevenue += totalRevenue;
                existing.totalStock += totalSold;
                // Merge discrepancies: Use the most recent audit instead of adding them together
                if (lastAuditAt && (!existing.lastAuditAt || lastAuditAt > existing.lastAuditAt)) {
                    existing.lastAuditAt = lastAuditAt;
                    existing.totalDiscrepancy = Math.abs(netDiscrepancy);
                    existing.isSurplus = netDiscrepancy > 0;
                }
                existing.totalLostValue += totalLostValue;
            } else {
                // Add new Menu Item entry
                const currentStock = Number(item.stockQuantity || 0);
                const totalStock = currentStock + totalSold;
                reportMap.set(nameKey, {
                    id: `menu_${item.id}`,
                    originalId: item.id,
                    type: 'menu',
                    name: item.name,
                    sku: item.sku,
                    category: item.category?.name || 'STORE',
                    price: Number(item.price),
                    totalStock,
                    totalSold,
                    currentStock,
                    totalRevenue,
                    minStockLevel: Number(item.minStockLevel || 0),
                    isLowStock: currentStock <= Number(item.minStockLevel || 0),
                    unit: 'Pcs',
                    totalDiscrepancy: Math.abs(netDiscrepancy),
                    isSurplus: netDiscrepancy > 0,
                    totalLostValue,
                    isHighValue: !!item.isHighValue,
                    auditFrequency: item.auditFrequency || 'SHIFT',
                    lastAuditAt
                });
            }
        }
        return Array.from(reportMap.values());
    }
    async generateMissionReportPdf(businessDayId) {
        this.logger.log(`Generating AI Mission Report PDF for BD: ${businessDayId}`);
        const missionReport = await this.aiService.getDailyMissionReport(businessDayId);
        const coachingData = await this.aiService.getStaffCoachingTips(businessDayId);
        const settings = await this.settingsService.getSettings();
        const templatePath = _path.join(__dirname, 'templates', 'ai-mission-report.hbs');
        if (!_fs.existsSync(templatePath)) {
            throw new Error(`AI Mission Report template not found at ${templatePath}`);
        }
        const source = _fs.readFileSync(templatePath, 'utf8');
        const template = _handlebars.compile(source);
        const fmt = (n)=>`Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`;
        const fDate = (d)=>d ? new Date(d).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            }) : '—';
        const context = {
            ...missionReport,
            tips: coachingData.tips,
            businessDate: fDate(new Date()),
            printTime: new Date().toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            reportId: `AI-${businessDayId}-${Date.now().toString(36).toUpperCase()}`,
            fmt
        };
        const html = template(context);
        const browser = await _puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });
        try {
            const page = await browser.newPage();
            await page.setContent(html, {
                waitUntil: 'networkidle0'
            });
            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '0px',
                    right: '0px',
                    bottom: '0px',
                    left: '0px'
                }
            });
            return Buffer.from(pdf);
        } finally{
            await browser.close();
        }
    }
    async generateDailyReportPdf(startDate, endDate) {
        const startStr = startDate ? startDate.toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }) : '';
        const endStr = endDate ? endDate.toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }) : '';
        const rangeLabel = startDate && endDate ? `${startStr} — ${endStr}` : 'Laporan Harian (Business Day)';
        this.logger.log(`Generating Premium Business Day PDF... Range: ${rangeLabel}`);
        let reportData;
        try {
            const activeBd = await this.shiftService.getOrCreateActiveBusinessDay();
            reportData = await this.shiftService.getBusinessDayReport(activeBd.id);
        } catch (e) {
            this.logger.error(`Failed to retrieve detailed report data: ${e.message}`);
            throw e;
        }
        const bd = reportData.businessDay || {};
        const summary = reportData.summary || {};
        const shifts = reportData.shifts || [];
        const txs = reportData.transactions || [];
        const settings = await this.settingsService.getSettings();
        const venue = settings.businessName || 'VOC BILLIARD';
        const printAt = new Date();
        const fmt = (n)=>`Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`;
        const fDate = (d)=>d ? new Date(d).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            }) : '—';
        const fTime = (d)=>d ? new Date(d).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            }) : '—';
        // Calculation for waterfall
        const grossBilliard = summary.billiardRevenue || 0;
        const grossCafe = summary.cafeRevenue || 0;
        const grossRevenue = grossBilliard + grossCafe;
        const netPenjualan = grossRevenue - (summary.totalDiscount || 0) + (summary.totalVat || 0) + (summary.totalService || 0) + (summary.totalRounding || 0);
        // Global Deep Dives
        const globalPackages = {};
        const globalItems = {};
        const allShifts = reportData.allShifts || shifts;
        allShifts.forEach((s)=>{
            (s.topPackages || []).forEach((p)=>{
                if (!globalPackages[p.name]) globalPackages[p.name] = {
                    count: 0,
                    revenue: 0
                };
                globalPackages[p.name].count += p.count;
                globalPackages[p.name].revenue += Number(p.revenue);
            });
            (s.topItems || []).forEach((it)=>{
                if (!globalItems[it.item]) globalItems[it.item] = {
                    qty: 0
                };
                globalItems[it.item].qty += it.count;
            });
        });
        const sortedPackages = Object.entries(globalPackages).map(([name, val])=>({
                name,
                ...val
            })).sort((a, b)=>b.count - a.count).slice(0, 5);
        const sortedItems = Object.entries(globalItems).map(([name, val])=>({
                name,
                ...val
            })).sort((a, b)=>b.qty - a.qty).slice(0, 5);
        // 2. Prepare Template Data
        const templatePath = _path.join(__dirname, 'templates', 'business-day.hbs');
        if (!_fs.existsSync(templatePath)) {
            this.logger.error(`Template not found at ${templatePath}`);
            throw new Error(`Template not found at ${templatePath}`);
        }
        const source = _fs.readFileSync(templatePath, 'utf8');
        const template = _handlebars.compile(source);
        const context = {
            venueName: venue,
            rangeLabel,
            totalTransactions: txs.length,
            totalOmzet: summary.totalOmzet || 0,
            grossRevenue,
            businessDate: bd.date || fDate(printAt),
            printTime: fTime(printAt),
            grossBilliard,
            grossCafe,
            totalDiscount: summary.totalDiscount,
            totalService: summary.totalService,
            totalVat: summary.totalVat,
            totalRounding: summary.totalRounding,
            totalExpenses: summary.totalExpenses || 0,
            netProfit: summary.netProfit || netPenjualan,
            netPenjualan,
            totalTopUp: summary.totalTopUp || 0,
            sortedPackages: sortedPackages.slice(0, 5),
            sortedItems: sortedItems.slice(0, 5).map((it)=>({
                    name: it.name,
                    qty: it.qty
                })),
            shifts: shifts.map((s)=>({
                    userName: s.userName,
                    startTime: fTime(s.startTime),
                    endTime: s.endTime ? fTime(s.endTime) : null,
                    revenue: fmt(s.totalRevenue || 0),
                    discrepancy: s.discrepancy !== 0 ? fmt(s.discrepancy) : '0',
                    isDiscrepancy: s.discrepancy !== 0
                })),
            transactions: txs.map((t)=>{
                const itemNames = [];
                // 1. Cafe Items
                if (Array.isArray(t.orderItems)) {
                    t.orderItems.forEach((oi)=>{
                        if (oi.status?.toUpperCase() === 'CANCELLED') return;
                        const name = oi.menuItem?.name || oi.customName || 'Item';
                        itemNames.push(`${name} x${oi.quantity}`);
                    });
                }
                // 2. Billiard Segments
                if (Array.isArray(t.billingDetails)) {
                    t.billingDetails.forEach((seg)=>{
                        const mins = Number(seg.duration || 0);
                        const durStr = mins % 60 === 0 ? `${mins / 60} Jam (${mins}m)` : `${mins}m`;
                        const timeRange = seg.startTimeFormatted && seg.endTimeFormatted ? ` (${(seg.startTimeFormatted || '').replace(/:/g, '.')}-${(seg.endTimeFormatted || '').replace(/:/g, '.')})` : '';
                        itemNames.push(`${seg.isExtension ? 'Extend: ' : ''}${seg.title || 'Table'} ${durStr}${timeRange}`);
                    });
                }
                return {
                    invoiceNumber: t.invoiceNumber,
                    time: fTime(t.createdAt),
                    tableNumber: t.table?.tableName || t.cafeTable?.tableName || 'POS',
                    customerName: t.customerName || 'Walk-in',
                    items: itemNames.join(', '),
                    paymentMethod: t.paymentMethod || 'CASH',
                    amount: fmt(t.grandTotal)
                };
            }),
            fmt: (n)=>`Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`
        };
        const browser = await _puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        try {
            const page = await browser.newPage();
            const html = template(context, {
                helpers: {
                    fmt: (n)=>`Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`
                }
            });
            await page.setContent(html, {
                waitUntil: 'networkidle0'
            });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                displayHeaderFooter: true,
                headerTemplate: `
          <div style="font-size: 7px; font-family: 'Inter', sans-serif; width: 100%; padding: 15px 50px 0 50px; display: flex; justify-content: space-between; align-items: center; color: #94a3b8; border-bottom: 1px solid #f1f5f9; margin: 0 15mm; height: 30px;">
            <div style="font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">${venue} · Operational Audit</div>
            <div style="font-weight: 500;">Premium Report Ecosystem</div>
          </div>`,
                footerTemplate: `
          <div style="font-size: 7px; color: #94a3b8; width: 100%; padding: 0 50px 15px 50px; display: flex; justify-content: space-between; align-items: center; font-family: 'Inter', sans-serif; border-top: 1px solid #f1f5f9; margin: 0 15mm;">
            <div style="font-weight: bold; text-transform: uppercase;">Verified Business Data · Confidential</div>
            <div style="font-weight: 800;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
          </div>`,
                preferCSSPageSize: true,
                margin: {
                    top: '25mm',
                    bottom: '20mm',
                    left: '15mm',
                    right: '15mm'
                }
            });
            this.logger.log('Premium Business Day PDF created successfully.');
            return Buffer.from(pdfBuffer);
        } catch (e) {
            this.logger.error(`Failed to generate High-Fidelity PDF: ${e.message}`);
            throw e;
        } finally{
            await browser.close();
        }
    }
    async generateDashboardExecutivePdf(startDate, endDate) {
        const startStr = startDate.toLocaleString('id-ID', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
        const rangeLabel = startStr;
        this.logger.log(`Performing Extreme Premium PDF Redesign... Range: ${rangeLabel}`);
        // 1. Data Aggregation
        const detailed = await this.getDetailedRevenueReport(startDate, endDate);
        const perf = await this.getItemsPerformance();
        const inventory = await this.getInventoryHealth();
        const financeSummary = await this.financeService.getExpenseSummary(startDate.toISOString(), endDate.toISOString());
        const settings = await this.settingsService.getSettings();
        const venue = settings.businessName || 'VOC BILLIARD';
        const fmt = (n)=>`Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`;
        const pfmt = (n)=>`${(n || 0).toFixed(1)}%`;
        // 1b. Accrued Payroll Fetching (matching dashboard)
        const month = startDate.getMonth() + 1;
        const year = startDate.getFullYear();
        const payrollDataMap = await this.userService.calculateBulkPayroll(month, year, startDate.toISOString(), endDate.toISOString(), true);
        const payrollData = Object.values(payrollDataMap);
        const totalCommissions = payrollData.reduce((sum, p)=>sum + (Number(p.commissionService || 0) + Number(p.commissionSales || 0) + Number(p.commissionProduction || 0)), 0);
        const totalPenalties = payrollData.reduce((sum, p)=>sum + Number(p.penalties || 0), 0);
        const totalSalaryAccrual = payrollData.reduce((sum, p)=>sum + Number(p.basicSalary || 0), 0);
        // Detailed Accounting Calculations
        const dailySum = detailed.summary;
        const grossTotal = Number(dailySum?.grossRevenue || 0);
        const totalTax = Number(dailySum?.totalVat || 0);
        const totalService = Number(dailySum?.totalServiceCharge || 0);
        const totalDiscount = Number(dailySum?.totalDiscount || 0);
        const totalRounding = Number(dailySum?.totalRounding || 0);
        const totalExpenses = Number(financeSummary.totalExpenses || 0);
        // Adjusted Profit: Real Revenue - Recorded Expenses - Accrued Payroll (matching Dashboard logic)
        // Note: grossTotal is already net of discounts (sum of grandTotal)
        const netProfit = Number(grossTotal) - totalExpenses - totalCommissions - totalSalaryAccrual + totalPenalties;
        const hourly = detailed.hourly || [];
        const maxHourly = Math.max(...hourly.map((h)=>h.total), 1);
        // 2. Prepare Template Data
        const templatePath = _path.join(__dirname, 'templates', 'dashboard-executive.hbs');
        if (!_fs.existsSync(templatePath)) {
            this.logger.error(`Template not found at ${templatePath}`);
            throw new Error(`Template not found at ${templatePath}`);
        }
        const source = _fs.readFileSync(templatePath, 'utf8');
        const template = _handlebars.compile(source);
        const hourlyData = (detailed.hourly || []).map((h)=>({
                hour: String(h.hour).padStart(2, '0'),
                value: fmt(h.total),
                width: h.total === 0 ? 0 : h.total / maxHourly * 100,
                isNight: h.hour > 17 || h.hour < 6
            }));
        const topItems = (perf.topItems || []).slice(0, 10).map((it, idx)=>({
                rank: idx + 1,
                name: it.name,
                category: it.category,
                qty: it.totalQty,
                revenue: fmt(it.totalRevenue)
            }));
        const criticalStock = inventory.slice(0, 8).map((i)=>({
                name: i.name,
                stock: i.stockQuantity,
                unit: i.unit
            }));
        const execSum = detailed.summary;
        const revenueStreams = [
            {
                label: 'Billiard / Session',
                value: fmt(execSum?.totalBilliard),
                percentage: pfmt((execSum?.totalBilliard || 0) / grossTotal * 100)
            },
            {
                label: 'Cafe / F&B',
                value: fmt(execSum?.totalCafe),
                percentage: pfmt((execSum?.totalCafe || 0) / grossTotal * 100)
            },
            {
                label: 'Top-up Member',
                value: fmt(execSum?.totalTopUp),
                percentage: pfmt((execSum?.totalTopUp || 0) / grossTotal * 100)
            },
            {
                label: 'Service Charge (SC)',
                value: fmt(totalService),
                percentage: pfmt(totalService / grossTotal * 100)
            },
            {
                label: 'PPN / VAT',
                value: fmt(totalTax),
                percentage: pfmt(totalTax / grossTotal * 100)
            },
            {
                label: 'Pembulatan',
                value: fmt(totalRounding),
                percentage: pfmt(totalRounding / grossTotal * 100)
            }
        ];
        const paymentMethodsArr = Object.entries(detailed.paymentMethods).map(([method, amount])=>({
                method,
                amount: fmt(amount),
                count: (execSum?.paymentCounts || {})[method] || 0
            }));
        const context = {
            rangeLabel,
            netProfit,
            grossTotal,
            transactionCount: execSum?.transactionCount || 0,
            totalOmzet: execSum?.totalOmzet,
            unpaidAmount: execSum?.unpaidAmount,
            inventoryCount: inventory.length,
            revenueStreams,
            totalMemberUsage: execSum?.totalMemberUsage || 0,
            paymentMethods: paymentMethodsArr,
            totalTax,
            totalService,
            totalTaxService: totalTax + totalService,
            totalRounding,
            totalDiscount,
            totalCommissions,
            totalPenalties,
            totalSalaryAccrual,
            totalAwardedPoints: execSum?.totalAwardedPoints || 0,
            totalExpenses,
            hourlyData,
            topItems,
            criticalStock,
            staffPerformance: execSum.staffPerformance?.map((s)=>({
                    name: s.name,
                    revenue: fmt(s.revenue),
                    percentage: pfmt(s.revenue / grossTotal * 100)
                })).slice(0, 5) || [],
            tableOccupancy: Object.entries(execSum.tableUsage || {}).map(([name, data])=>({
                    name,
                    minutes: Math.round(data.duration),
                    sessions: data.count
                })).sort((a, b)=>b.minutes - a.minutes).slice(0, 8),
            avgOccupancyMinutes: Math.round(execSum.avgOccupancyMinutes || 0),
            reportId: `REP-${Date.now()}`,
            financeSummaryByCategory: Object.entries(financeSummary.byCategory || {}).map(([c, a])=>({
                    c,
                    a
                })),
            netRevenueCash: grossTotal - totalDiscount,
            avgTransactionValue: grossTotal > 0 ? grossTotal / (execSum?.transactionCount || 1) : 0
        };
        // 3. Render HTML to PDF via Puppeteer
        let browser;
        try {
            this.logger.log('Launching Puppeteer for high-fidelity PDF rendering...');
            browser = await _puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage'
                ]
            });
            const page = await browser.newPage();
            const html = template(context, {
                helpers: {
                    fmt: (n)=>`Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`
                }
            });
            await page.setContent(html, {
                waitUntil: 'networkidle0'
            });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                displayHeaderFooter: true,
                headerTemplate: `
          <div style="font-size: 7px; font-family: 'Inter', sans-serif; width: 100%; padding: 15px 50px 0 50px; display: flex; justify-content: space-between; align-items: center; color: #94a3b8; border-bottom: 1px solid #f1f5f9; margin: 0 15mm; height: 30px;">
            <div style="font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">${venue} · Executive Dashboard</div>
            <div style="font-weight: 500;">Premium Report Ecosystem</div>
          </div>`,
                footerTemplate: `
          <div style="font-size: 7px; color: #94a3b8; width: 100%; padding: 0 50px 15px 50px; display: flex; justify-content: space-between; align-items: center; font-family: 'Inter', sans-serif; border-top: 1px solid #f1f5f9; margin: 0 15mm;">
            <div style="font-weight: bold; text-transform: uppercase;">Verified Business Data · Confidential</div>
            <div style="font-weight: 800;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
          </div>`,
                preferCSSPageSize: true,
                margin: {
                    top: '25mm',
                    bottom: '20mm',
                    left: '15mm',
                    right: '15mm'
                }
            });
            await browser.close();
            this.logger.log('PDF generation complete (Next-Gen Web-to-PDF).');
            return Buffer.from(pdfBuffer);
        } catch (error) {
            if (browser) await browser.close();
            this.logger.error(`Puppeteer PDF generation failed: ${error.message}`);
            throw error;
        }
    }
    async sendExecutiveDashboardToWhatsApp(phone, startDate, endDate) {
        this.logger.log(`Request to send Executive Dashboard to WhatsApp: ${phone}`);
        try {
            const pdfBuffer = await this.generateDashboardExecutivePdf(startDate, endDate);
            const startStr = startDate.toLocaleDateString('id-ID');
            const endStr = endDate.toLocaleDateString('id-ID');
            const result = await this.whatsappService.sendDocument(phone, pdfBuffer, `Executive_Summary_VOC_${new Date().toISOString().split('T')[0]}.pdf`, `Halo Owner, berikut adalah **EXECUTIVE SUMMARY DASHBOARD** VOC BILLIARD periode ${startStr} s/d ${endStr}.\n\nLaporan ini mencakup Ringkasan Keuangan, Performa Menu, dan Status Inventori Kritis.`);
            if (!result) throw new Error('STATUS_DISCONNECTED');
            return {
                status: 'success'
            };
        } catch (err) {
            this.logger.error(`Failed to send Executive Dashboard: ${err.message}`);
            throw err;
        }
    }
    async getStaffPerformanceLeaderboard(days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const report = await this.getDetailedRevenueReport(startDate, new Date());
        const staffStats = report.summary.staffPerformance;
        const ranked = staffStats.sort((a, b)=>b.revenue - a.revenue);
        return ranked.map((s, index)=>{
            let badge = 'Standard';
            if (index === 0) badge = 'Revenue King';
            else if (s.upsellRatio > 0.4) badge = 'Upsell Master';
            else if (s.rph > 500000) badge = 'Efficiency Pro';
            return {
                ...s,
                rank: index + 1,
                badge,
                performanceLevel: s.rph > 300000 ? 'High' : s.rph > 150000 ? 'Steady' : 'Developing'
            };
        });
    }
    async sendReportToWhatsApp(phone, startDate, endDate) {
        this.logger.log(`Request to send report to WhatsApp: ${phone}`);
        try {
            const pdfBuffer = await this.generateDailyReportPdf(startDate, endDate);
            this.logger.log(`PDF Buffer ready (${pdfBuffer.length} bytes). Sending to WhatsApp...`);
            const startStr = startDate ? startDate.toLocaleDateString('id-ID') : new Date().toLocaleDateString('id-ID');
            const endStr = endDate ? ` s/d ${endDate.toLocaleDateString('id-ID')}` : '';
            const result = await this.whatsappService.sendDocument(phone, pdfBuffer, `Laporan_VOC_${new Date().toISOString().split('T')[0]}.pdf`, `Halo Owner, berikut adalah Laporan Pendapatan VOC BILLIARD tanggal ${startStr}${endStr}.`);
            if (!result) {
                this.logger.error('WhatsApp Gateway returned null result (Disconnected?)');
                throw new Error('STATUS_DISCONNECTED');
            }
            this.logger.log('WhatsApp report sent successfully.');
            return {
                status: 'success'
            };
        } catch (err) {
            this.logger.error(`Failed to send report to WhatsApp: ${err.message}`);
            throw err;
        }
    }
    async checkAndSendAutoReport() {
        const settings = await this.settingsService.getSettings();
        if (!settings.autoReportEnabled || !settings.ownerPhone) return;
        const now = new Date();
        // Use local time for HH:mm check
        const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if (currentHHmm === settings.reportSchedule) {
            this.logger.log(`Starting automated daily report delivery to ${settings.ownerPhone}`);
            try {
                await this.sendReportToWhatsApp(settings.ownerPhone);
            } catch (e) {
                this.logger.error('Auto report delivery failed');
            }
        }
    }
    constructor(shiftRepository, transactionRepository, ingredientRepository, orderItemRepository, menuItemRepository, expenseRepository, auditRepository, settingsService, mqttService, billiardGateway, whatsappService, shiftService, financeService, userService, aiService){
        this.shiftRepository = shiftRepository;
        this.transactionRepository = transactionRepository;
        this.ingredientRepository = ingredientRepository;
        this.orderItemRepository = orderItemRepository;
        this.menuItemRepository = menuItemRepository;
        this.expenseRepository = expenseRepository;
        this.auditRepository = auditRepository;
        this.settingsService = settingsService;
        this.mqttService = mqttService;
        this.billiardGateway = billiardGateway;
        this.whatsappService = whatsappService;
        this.shiftService = shiftService;
        this.financeService = financeService;
        this.userService = userService;
        this.aiService = aiService;
        this.logger = new _common.Logger(ReportService.name);
    }
};
_ts_decorate([
    (0, _schedule.Cron)(_schedule.CronExpression.EVERY_MINUTE),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], ReportService.prototype, "checkAndSendAutoReport", null);
ReportService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_shiftentity.Shift)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_transactionentity.Transaction)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_ingrediententity.Ingredient)),
    _ts_param(3, (0, _typeorm.InjectRepository)(_orderitementity.OrderItem)),
    _ts_param(4, (0, _typeorm.InjectRepository)(_menuitementity.MenuItem)),
    _ts_param(5, (0, _typeorm.InjectRepository)(_expenseentity.Expense)),
    _ts_param(6, (0, _typeorm.InjectRepository)(_auditlogentity.AuditLog)),
    _ts_param(7, (0, _common.Inject)((0, _common.forwardRef)(()=>{
        const { SettingsService: SettingsService1 } = require('../settings/settings.service');
        return SettingsService1;
    }))),
    _ts_param(13, (0, _common.Inject)((0, _common.forwardRef)(()=>_userservice.UserService))),
    _ts_param(14, (0, _common.Inject)((0, _common.forwardRef)(()=>{
        const { AIService: AIService1 } = require('../ai/ai.service');
        return AIService1;
    }))),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof SettingsService === "undefined" ? Object : SettingsService,
        typeof _mqttservice.MqttService === "undefined" ? Object : _mqttservice.MqttService,
        typeof _billiardgateway.BilliardGateway === "undefined" ? Object : _billiardgateway.BilliardGateway,
        typeof _whatsappservice.WhatsAppService === "undefined" ? Object : _whatsappservice.WhatsAppService,
        typeof _shiftservice.ShiftService === "undefined" ? Object : _shiftservice.ShiftService,
        typeof _financeservice.FinanceService === "undefined" ? Object : _financeservice.FinanceService,
        typeof _userservice.UserService === "undefined" ? Object : _userservice.UserService,
        typeof AIService === "undefined" ? Object : AIService
    ])
], ReportService);

//# sourceMappingURL=report.service.js.map