import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promo, PromoType } from './entities/promo.entity';

@Injectable()
export class PromoService {
    private readonly logger = new Logger(PromoService.name);

    constructor(
        @InjectRepository(Promo)
        private readonly promoRepository: Repository<Promo>,
    ) { }

    async getAllPromos(): Promise<Promo[]> {
        return this.promoRepository.find({ order: { createdAt: 'DESC' } });
    }

    async getActivePromos(): Promise<Promo[]> {
        return this.promoRepository.find({
            where: { isActive: true },
            order: { createdAt: 'DESC' }
        });
    }

    async getStartSessionPromos(): Promise<Promo[]> {
        return this.promoRepository.find({
            where: { isActive: true, type: PromoType.PACKAGE },
            order: { createdAt: 'DESC' }
        });
    }

    async getMenuBundles(): Promise<Promo[]> {
        return this.promoRepository.find({
            where: { isActive: true, type: PromoType.BUNDLE },
            order: { createdAt: 'DESC' }
        });
    }

    async createPromo(data: Partial<Promo>): Promise<Promo> {
        const promo = this.promoRepository.create(data);
        return this.promoRepository.save(promo);
    }

    async updatePromo(id: number, data: Partial<Promo>): Promise<Promo> {
        const promo = await this.promoRepository.findOne({ where: { id } });
        if (!promo) throw new NotFoundException('Promo not found');
        Object.assign(promo, data);
        return this.promoRepository.save(promo);
    }

    async deletePromo(id: number): Promise<void> {
        const result = await this.promoRepository.delete(id);
        if (result.affected === 0) throw new NotFoundException('Promo not found');
    }

    /**
     * Mengevaluasi promo yang berlaku pada transaksi
     */
    async evaluatePromos(orderItems: any[], billiardMinutes: number): Promise<{ discounts: any[], appliedPromos: any[] }> {
        const activeItems = (orderItems || []).filter(item => item.status?.toUpperCase() !== 'CANCELLED');
        const activePromos = await this.getActivePromos();
        const discounts: any[] = [];
        const appliedPromos: any[] = [];

        for (const promo of activePromos) {
            const rule = promo.ruleJson;
            if (!rule) continue;

            let isMatch = false;

            // Logic BUNDLE (Contoh: Beli X Jam + Item Y = Diskon Z)
            if (promo.type === PromoType.BUNDLE || promo.type === PromoType.PACKAGE) {
                // If it's a fixed price package selected at start, we might handle it differently 
                // but for general auto-evaluation:
                const reqMinutes = rule.requireBilliardMinutes || 0;
                const reqItems = rule.requireMenuItemIds || [];

                const hasTime = billiardMinutes >= reqMinutes;

                // Cek ketersediaan item di orderItems
                const currentItemIds = activeItems.map(oi => oi.menuItemId);
                const hasItems = reqItems.every((id: number) => {
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
                appliedPromos.push({ id: promo.id, name: promo.name });
                if (rule.discountAmount) {
                    const amount = Number(rule.discountAmount);
                    discounts.push({
                        name: promo.name,
                        amount: isNaN(amount) ? 0 : amount
                    });
                }
            }
        }

        return { discounts, appliedPromos };
    }
}
