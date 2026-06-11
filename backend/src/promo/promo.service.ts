import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Not, IsNull } from 'typeorm';
import { Promo, PromoType } from './entities/promo.entity';
import { Transaction } from '../transaction/entities/transaction.entity';

@Injectable()
export class PromoService {
  private readonly logger = new Logger(PromoService.name);

  constructor(
    @InjectRepository(Promo)
    private readonly promoRepository: Repository<Promo>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  private activePromosCache: { data: Promo[]; expiry: number } | null = null;

  async getAllPromos(): Promise<any[]> {
    const promos = await this.promoRepository.find({
      order: { createdAt: 'DESC' },
    });

    // Fetch last 7 days of transactions to calculate trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      const transactions = await this.transactionRepository.find({
        where: {
          createdAt: MoreThanOrEqual(sevenDaysAgo),
        },
        relations: ['orderItems'],
        select: ['id', 'appliedPromos', 'createdAt', 'orderItems'],
      });

      // Prepare date array for consistent keys
      const dates: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }

      return promos.map((promo) => {
        // 1. Bundle Level Trend
        const bundleTrend = dates.map((dateStr) => {
          const count = transactions.filter((t) => {
            const tDate = new Date(t.createdAt).toISOString().split('T')[0];
            if (tDate !== dateStr) return false;
            const applied = Array.isArray(t.appliedPromos)
              ? t.appliedPromos
              : [];
            return applied.some((p: any) => p.id === promo.id);
          }).length;
          return { day: dateStr.split('-').slice(2).join('/'), count };
        });

        // 2. Individual Item Trends (for items inside the bundle)
        if (promo.ruleJson && Array.isArray(promo.ruleJson.requireMenuItems)) {
          promo.ruleJson.requireMenuItems = promo.ruleJson.requireMenuItems.map(
            (item: any) => {
              const itemTrend = dates.map((dateStr) => {
                let count = 0;
                transactions.forEach((t) => {
                  const tDate = new Date(t.createdAt)
                    .toISOString()
                    .split('T')[0];
                  if (tDate !== dateStr) return;

                  // Only count usage context where THIS promo was also applied?
                  // Or global usage of this item? Global is usually more useful for context.
                  const matches = (t.orderItems || []).filter(
                    (oi) => oi.menuItemId === item.id,
                  );
                  matches.forEach((m) => (count += Number(m.quantity) || 0));
                });
                return { day: dateStr.split('-').slice(2).join('/'), count };
              });
              return { ...item, weeklyTrend: itemTrend };
            },
          );
        }

        return { ...promo, weeklyTrend: bundleTrend };
      });
    } catch (err) {
      this.logger.error(`Trend calculation failed: ${err.message}`);
      return promos;
    }
  }

  async getActivePromos(): Promise<Promo[]> {
    const now = Date.now();
    if (this.activePromosCache && this.activePromosCache.expiry > now) {
      return this.activePromosCache.data;
    }

    const promos = await this.promoRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });

    this.activePromosCache = {
      data: promos,
      expiry: now + 10000, // 10 seconds cache
    };

    return promos;
  }

  async getStartSessionPromos(): Promise<Promo[]> {
    return this.promoRepository.find({
      where: { isActive: true, type: PromoType.PACKAGE },
      order: { createdAt: 'DESC' },
    });
  }

  async getMenuBundles(): Promise<Promo[]> {
    return this.promoRepository.find({
      where: { isActive: true, type: PromoType.BUNDLE },
      order: { createdAt: 'DESC' },
    });
  }

  async createPromo(data: Partial<Promo>): Promise<Promo> {
    const promo = this.promoRepository.create(data);
    const saved = await this.promoRepository.save(promo);
    this.activePromosCache = null; // Clear cache
    return saved;
  }

  async updatePromo(id: number, data: Partial<Promo>): Promise<Promo> {
    const promo = await this.promoRepository.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('Promo not found');
    Object.assign(promo, data);
    const updated = await this.promoRepository.save(promo);
    this.activePromosCache = null; // Clear cache
    return updated;
  }

  async deletePromo(id: number): Promise<void> {
    const result = await this.promoRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException('Promo not found');
    this.activePromosCache = null; // Clear cache
  }

  /**
   * Mengevaluasi promo yang berlaku pada transaksi
   */
  async evaluatePromos(
    orderItems: any[],
    billiardMinutes: number,
    grossBilliardTotal: number = 0,
    preFetchedPromos?: Promo[],
    sessionType?: string | null,
  ): Promise<{ discounts: any[]; appliedPromos: any[] }> {
    const activeItems = (orderItems || []).filter(
      (item) => item.status?.toUpperCase() !== 'CANCELLED',
    );
    const activePromos = preFetchedPromos || (await this.getActivePromos());
    const discounts: any[] = [];
    const appliedPromos: any[] = [];

    for (const promo of activePromos) {
      const rule = promo.ruleJson;
      if (!rule) continue;

      let isMatch = false;

      // Logic BUNDLE (Contoh: Beli X Jam + Item Y = Diskon Z)
      if (promo.type === PromoType.BUNDLE || promo.type === PromoType.PACKAGE) {
        const reqMinutes = rule.requireBilliardMinutes || 0;

        // Handle field name mismatch and flatten items based on quantity
        let reqItems: number[] = [];
        if (Array.isArray(rule.requireMenuItems)) {
          // New structure: [{id, name, quantity}]
          rule.requireMenuItems.forEach((item: any) => {
            for (let i = 0; i < (item.quantity || 1); i++) {
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
        const matchedPrices: number[] = [];
        const tempActiveItems = [...activeItems];
        const hasItems = reqItems.every((id: number) => {
          const idx = tempActiveItems.findIndex((oi) => oi.menuItemId === id);
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

            const retailSum = matchedPrices.reduce(
              (a, b) => Number(a) + Number(b),
              0,
            );

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
                isFixedPrice: true,
              });
            } else {
              // If it's not cheaper, don't auto-apply!
              isMatch = false;
            }
          }
        }
      }

      if (isMatch) {
        appliedPromos.push({ id: promo.id, name: promo.name });
        // Old style discount amount (additive) - only if not using fixedPrice logic
        if (rule.discountAmount && !rule.fixedPrice) {
          const amount = Number(rule.discountAmount);
          discounts.push({
            name: promo.name,
            amount: isNaN(amount) ? 0 : amount,
          });
        }
      }
    }

    return { discounts, appliedPromos };
  }

  async trackPromoUsage(
    promoId: number,
    revenue: number,
    profit: number,
  ): Promise<void> {
    try {
      await this.promoRepository
        .createQueryBuilder()
        .update(Promo)
        .set({
          usageCount: () => 'usageCount + 1',
          totalRevenueContribution: () =>
            `totalRevenueContribution + ${revenue}`,
          totalProfitContribution: () => `totalProfitContribution + ${profit}`,
        })
        .where('id = :id', { id: promoId })
        .execute();
    } catch (err) {
      this.logger.error(
        `Failed to track promo usage for ID ${promoId}: ${err.message}`,
      );
    }
  }

  async getPromoStats(): Promise<any[]> {
    return this.promoRepository.find({
      select: [
        'id',
        'usageCount',
        'totalRevenueContribution',
        'totalProfitContribution',
      ],
    });
  }

  async recalibrateStats(id: number): Promise<Promo> {
    const promo = await this.promoRepository.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('Promo not found');

    const count = promo.usageCount || 0;
    const price = Number(promo.ruleJson?.fixedPrice || 0);
    const hpp = Number(promo.estimatedHpp || 0);

    // Reset and compute based on count * current price/cost
    promo.totalRevenueContribution = count * price;
    promo.totalProfitContribution = count * (price - hpp);

    return this.promoRepository.save(promo);
  }
}
