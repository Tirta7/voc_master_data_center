"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PromoService", {
    enumerable: true,
    get: function() {
        return PromoService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _promoentity = require("./entities/promo.entity");
const _transactionentity = require("../transaction/entities/transaction.entity");
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
let PromoService = class PromoService {
    async getAllPromos() {
        const promos = await this.promoRepository.find({
            order: {
                createdAt: 'DESC'
            }
        });
        // Fetch last 7 days of transactions to calculate trend
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        try {
            const transactions = await this.transactionRepository.find({
                where: {
                    createdAt: (0, _typeorm1.MoreThanOrEqual)(sevenDaysAgo)
                },
                relations: [
                    'orderItems'
                ],
                select: [
                    'id',
                    'appliedPromos',
                    'createdAt',
                    'orderItems'
                ]
            });
            // Prepare date array for consistent keys
            const dates = [];
            for(let i = 6; i >= 0; i--){
                const d = new Date();
                d.setDate(d.getDate() - i);
                dates.push(d.toISOString().split('T')[0]);
            }
            return promos.map((promo)=>{
                // 1. Bundle Level Trend
                const bundleTrend = dates.map((dateStr)=>{
                    const count = transactions.filter((t)=>{
                        const tDate = new Date(t.createdAt).toISOString().split('T')[0];
                        if (tDate !== dateStr) return false;
                        const applied = Array.isArray(t.appliedPromos) ? t.appliedPromos : [];
                        return applied.some((p)=>p.id === promo.id);
                    }).length;
                    return {
                        day: dateStr.split('-').slice(2).join('/'),
                        count
                    };
                });
                // 2. Individual Item Trends (for items inside the bundle)
                if (promo.ruleJson && Array.isArray(promo.ruleJson.requireMenuItems)) {
                    promo.ruleJson.requireMenuItems = promo.ruleJson.requireMenuItems.map((item)=>{
                        const itemTrend = dates.map((dateStr)=>{
                            let count = 0;
                            transactions.forEach((t)=>{
                                const tDate = new Date(t.createdAt).toISOString().split('T')[0];
                                if (tDate !== dateStr) return;
                                // Only count usage context where THIS promo was also applied?
                                // Or global usage of this item? Global is usually more useful for context.
                                const matches = (t.orderItems || []).filter((oi)=>oi.menuItemId === item.id);
                                matches.forEach((m)=>count += m.quantity);
                            });
                            return {
                                day: dateStr.split('-').slice(2).join('/'),
                                count
                            };
                        });
                        return {
                            ...item,
                            weeklyTrend: itemTrend
                        };
                    });
                }
                return {
                    ...promo,
                    weeklyTrend: bundleTrend
                };
            });
        } catch (err) {
            this.logger.error(`Trend calculation failed: ${err.message}`);
            return promos;
        }
    }
    async getActivePromos() {
        return this.promoRepository.find({
            where: {
                isActive: true
            },
            order: {
                createdAt: 'DESC'
            }
        });
    }
    async getStartSessionPromos() {
        return this.promoRepository.find({
            where: {
                isActive: true,
                type: _promoentity.PromoType.PACKAGE
            },
            order: {
                createdAt: 'DESC'
            }
        });
    }
    async getMenuBundles() {
        return this.promoRepository.find({
            where: {
                isActive: true,
                type: _promoentity.PromoType.BUNDLE
            },
            order: {
                createdAt: 'DESC'
            }
        });
    }
    async createPromo(data) {
        const promo = this.promoRepository.create(data);
        return this.promoRepository.save(promo);
    }
    async updatePromo(id, data) {
        const promo = await this.promoRepository.findOne({
            where: {
                id
            }
        });
        if (!promo) throw new _common.NotFoundException('Promo not found');
        Object.assign(promo, data);
        return this.promoRepository.save(promo);
    }
    async deletePromo(id) {
        const result = await this.promoRepository.delete(id);
        if (result.affected === 0) throw new _common.NotFoundException('Promo not found');
    }
    /**
   * Mengevaluasi promo yang berlaku pada transaksi
   */ async evaluatePromos(orderItems, billiardMinutes, grossBilliardTotal = 0, preFetchedPromos, sessionType) {
        const activeItems = (orderItems || []).filter((item)=>item.status?.toUpperCase() !== 'CANCELLED');
        const activePromos = preFetchedPromos || await this.getActivePromos();
        const discounts = [];
        const appliedPromos = [];
        for (const promo of activePromos){
            const rule = promo.ruleJson;
            if (!rule) continue;
            let isMatch = false;
            // Logic BUNDLE (Contoh: Beli X Jam + Item Y = Diskon Z)
            if (promo.type === _promoentity.PromoType.BUNDLE || promo.type === _promoentity.PromoType.PACKAGE) {
                const reqMinutes = rule.requireBilliardMinutes || 0;
                // Handle field name mismatch and flatten items based on quantity
                let reqItems = [];
                if (Array.isArray(rule.requireMenuItems)) {
                    // New structure: [{id, name, quantity}]
                    rule.requireMenuItems.forEach((item)=>{
                        for(let i = 0; i < (item.quantity || 1); i++){
                            reqItems.push(item.id);
                        }
                    });
                } else {
                    // Fallback for old structure
                    reqItems = rule.requireMenuItemIds || [];
                }
                // SAFEGUARD: If no requirements are specified, don't auto-apply to everything.
                if (reqMinutes <= 0 && reqItems.length === 0) {
                    continue;
                }
                const hasTime = billiardMinutes >= reqMinutes;
                // Cek ketersediaan item di orderItems
                const matchedPrices = [];
                const tempActiveItems = [
                    ...activeItems
                ];
                const hasItems = reqItems.every((id)=>{
                    const idx = tempActiveItems.findIndex((oi)=>oi.menuItemId === id);
                    if (idx > -1) {
                        matchedPrices.push(Number(tempActiveItems[idx].price || 0));
                        tempActiveItems.splice(idx, 1);
                        return true;
                    }
                    return false;
                });
                if (hasTime && hasItems) {
                    isMatch = true;
                    // SPECIAL LOGIC: Fixed Price Bundles
                    // If the bundle has a fixedPrice, calculate the dynamic discount
                    if (Number(rule.fixedPrice) > 0) {
                        // GUARD: Fixed-price bundle promos that require billiard time should NOT apply
                        // to Open Table (session type 'open') sessions. Open Table billing is dynamic
                        // and can accumulate over many hours/days. Adding grossBilliardTotal to a
                        // fixed-price promo would generate a massive erroneous discount.
                        if (reqMinutes > 0 && sessionType === 'open') {
                            isMatch = false;
                            continue;
                        }
                        const retailSum = matchedPrices.reduce((a, b)=>Number(a) + Number(b), 0);
                        // If the bundle requires time, we add the gross billiard total to the "Normal Price" side
                        // to see how much we are actually discounting.
                        let subtotalNormal = retailSum;
                        if (reqMinutes > 0) {
                            subtotalNormal += Number(grossBilliardTotal);
                        }
                        const calculatedDiscount = subtotalNormal - Number(rule.fixedPrice);
                        // Safeguard: Only apply if it's actually cheaper
                        if (calculatedDiscount > 0) {
                            discounts.push({
                                name: promo.name,
                                amount: calculatedDiscount,
                                isFixedPrice: true
                            });
                        } else {
                            // If it's not cheaper, don't auto-apply!
                            isMatch = false;
                        }
                    }
                }
            }
            if (isMatch) {
                appliedPromos.push({
                    id: promo.id,
                    name: promo.name
                });
                // Old style discount amount (additive) - only if not using fixedPrice logic
                if (rule.discountAmount && !rule.fixedPrice) {
                    const amount = Number(rule.discountAmount);
                    discounts.push({
                        name: promo.name,
                        amount: isNaN(amount) ? 0 : amount
                    });
                }
            }
        }
        return {
            discounts,
            appliedPromos
        };
    }
    async trackPromoUsage(promoId, revenue, profit) {
        try {
            await this.promoRepository.createQueryBuilder().update(_promoentity.Promo).set({
                usageCount: ()=>'usageCount + 1',
                totalRevenueContribution: ()=>`totalRevenueContribution + ${revenue}`,
                totalProfitContribution: ()=>`totalProfitContribution + ${profit}`
            }).where('id = :id', {
                id: promoId
            }).execute();
        } catch (err) {
            this.logger.error(`Failed to track promo usage for ID ${promoId}: ${err.message}`);
        }
    }
    async getPromoStats() {
        return this.promoRepository.find({
            select: [
                'id',
                'usageCount',
                'totalRevenueContribution',
                'totalProfitContribution'
            ]
        });
    }
    async recalibrateStats(id) {
        const promo = await this.promoRepository.findOne({
            where: {
                id
            }
        });
        if (!promo) throw new _common.NotFoundException('Promo not found');
        const count = promo.usageCount || 0;
        const price = Number(promo.ruleJson?.fixedPrice || 0);
        const hpp = Number(promo.estimatedHpp || 0);
        // Reset and compute based on count * current price/cost
        promo.totalRevenueContribution = count * price;
        promo.totalProfitContribution = count * (price - hpp);
        return this.promoRepository.save(promo);
    }
    constructor(promoRepository, transactionRepository){
        this.promoRepository = promoRepository;
        this.transactionRepository = transactionRepository;
        this.logger = new _common.Logger(PromoService.name);
    }
};
PromoService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_promoentity.Promo)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_transactionentity.Transaction)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository
    ])
], PromoService);

//# sourceMappingURL=promo.service.js.map