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
        return this.promoRepository.find({
            order: {
                createdAt: 'DESC'
            }
        });
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
   */ async evaluatePromos(orderItems, billiardMinutes, preFetchedPromos) {
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
                // If it's a fixed price package selected at start, we might handle it differently
                // but for general auto-evaluation:
                const reqMinutes = rule.requireBilliardMinutes || 0;
                const reqItems = rule.requireMenuItemIds || [];
                const hasTime = billiardMinutes >= reqMinutes;
                // Cek ketersediaan item di orderItems
                const currentItemIds = activeItems.map((oi)=>oi.menuItemId);
                const hasItems = reqItems.every((id)=>{
                    const idx = currentItemIds.indexOf(id);
                    if (idx > -1) {
                        currentItemIds.splice(idx, 1);
                        return true;
                    }
                    return false;
                });
                if (hasTime && hasItems) {
                    isMatch = true;
                }
            }
            if (isMatch) {
                appliedPromos.push({
                    id: promo.id,
                    name: promo.name
                });
                if (rule.discountAmount) {
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
    constructor(promoRepository){
        this.promoRepository = promoRepository;
        this.logger = new _common.Logger(PromoService.name);
    }
};
PromoService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_promoentity.Promo)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository
    ])
], PromoService);

//# sourceMappingURL=promo.service.js.map