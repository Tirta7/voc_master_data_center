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

  async getAllPromos(): Promise<any[]> {
    const promos = await this.promoRepository.find({ order: { createdAt: 'DESC' } });
    
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

      return promos.map(promo => {
        // 1. Bundle Level Trend
        const bundleTrend = dates.map(dateStr => {
          const count = transactions.filter(t => {
            const tDate = new Date(t.createdAt).toISOString().split('T')[0];
            if (tDate !== dateStr) return false;
            const applied = Array.isArray(t.appliedPromos) ? t.appliedPromos : [];
            return applied.some((p: any) => p.id === promo.id);
          }).length;
          return { day: dateStr.split('-').slice(2).join('/'), count };
        });

        // 2. Individual Item Trends (for items inside the bundle)
        if (promo.ruleJson && Array.isArray(promo.ruleJson.requireMenuItems)) {
          promo.ruleJson.requireMenuItems = promo.ruleJson.requireMenuItems.map((item: any) => {
            const itemTrend = dates.map(dateStr => {
              let count = 0;
              transactions.forEach(t => {
                const tDate = new Date(t.createdAt).toISOString().split('T')[0];
                if (tDate !== dateStr) return;
                
                // Only count usage context where THIS promo was also applied? 
                // Or global usage of this item? Global is usually more useful for context.
                const matches = (t.orderItems || []).filter(oi => oi.menuItemId === item.id);
                matches.forEach(m => count += m.quantity);
              });
              return { day: dateStr.split('-').slice(2).join('/'), count };
            });
            return { ...item, weeklyTrend: itemTrend };
          });
        }

        return { ...promo, weeklyTrend: bundleTrend };
      });
    } catch (err) {
      this.logger.error(`Trend calculation failed: ${err.message}`);
      return promos;
    }
  }

  async getActivePromos(): Promise<Promo[]> {
    return this.promoRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
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
  async evaluatePromos(
    orderItems: any[],
    billiardMinutes: number,
    preFetchedPromos?: Promo[],
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
        // If it's a fixed price package selected at start, we might handle it differently
        // but for general auto-evaluation:
        const reqMinutes = rule.requireBilliardMinutes || 0;
        const reqItems = rule.requireMenuItemIds || [];

        const hasTime = billiardMinutes >= reqMinutes;

        // Cek ketersediaan item di orderItems
        const currentItemIds = activeItems.map((oi) => oi.menuItemId);
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
          totalRevenueContribution: () => `totalRevenueContribution + ${revenue}`,
          totalProfitContribution: () => `totalProfitContribution + ${profit}`,
        })
        .where('id = :id', { id: promoId })
        .execute();
    } catch (err) {
      this.logger.error(`Failed to track promo usage for ID ${promoId}: ${err.message}`);
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
}
