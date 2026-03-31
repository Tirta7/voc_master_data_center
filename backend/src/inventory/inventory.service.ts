import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Ingredient } from './entities/ingredient.entity';
import { Recipe } from './entities/recipe.entity';
import { InventoryGateway } from './inventory.gateway';
import { PromoService } from '../promo/promo.service';
import { ReportService } from '../report/report.service';
import { MqttService } from '../mqtt/mqtt.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Ingredient)
    private readonly ingredientRepository: Repository<Ingredient>,
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    private readonly dataSource: DataSource,
    private readonly inventoryGateway: InventoryGateway,
    private readonly promoService: PromoService,
    private readonly reportService: ReportService,
    private readonly mqttService: MqttService,
    private readonly whatsappService: WhatsAppService,
    private readonly settingsService: SettingsService,
  ) {}

  async getAllIngredients(): Promise<Ingredient[]> {
    return this.ingredientRepository.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async getLowStockItems(): Promise<Ingredient[]> {
    const ingredients = await this.ingredientRepository.find({
      where: { deletedAt: IsNull() },
    });
    return ingredients.filter(
      (ing) => Number(ing.stockQuantity) <= Number(ing.minStockLevel),
    );
  }

  async getMandatoryReportingItems(): Promise<any[]> {
    const ingredients = await this.ingredientRepository.find({
      where: [
        { isMandatoryReporting: true, deletedAt: IsNull() },
        { isHighValue: true, deletedAt: IsNull() },
      ],
    });

    const menuItems = (await this.dataSource.getRepository('MenuItem').find({
      where: [
        { isMandatoryReporting: true, deletedAt: IsNull() },
        { isHighValue: true, deletedAt: IsNull() },
      ],
    })) as any[];

    return [
      ...ingredients.map((ing) => ({ ...ing, type: 'INGREDIENT' })),
      ...menuItems.map((item) => ({ ...item, type: 'MENU_ITEM' })),
    ];
  }

  private async getNextSKU(): Promise<string> {
    // Find the latest ingredient with an IG- pattern SKU
    const latestIngredient = await this.ingredientRepository
      .createQueryBuilder('ingredient')
      .where('ingredient.sku LIKE :pattern', { pattern: 'IG-%' })
      .orderBy('ingredient.sku', 'DESC')
      .getOne();

    if (!latestIngredient || !latestIngredient.sku) {
      return 'IG-001';
    }

    // Extract the number and increment it
    const matches = latestIngredient.sku.match(/IG-(\d+)/);
    if (!matches) {
      return 'IG-001';
    }

    const nextNumber = parseInt(matches[1], 10) + 1;
    // Keep the 3-digit padding (or expand if needed, but padStart(3) is usually enough)
    return `IG-${nextNumber.toString().padStart(3, '0')}`;
  }

  async createIngredient(data: any): Promise<Ingredient> {
    try {
      let sku = data.sku?.trim();
      if (!sku) {
        sku = await this.getNextSKU();
      }

      const ingredient = this.ingredientRepository.create({
        ...data,
        stockQuantity: Number(data.stockQuantity || 0),
        minStockLevel: Number(data.minStockLevel || 0),
        yieldPercentage: Number(data.yieldPercentage || 100),
        costPrice: Number(data.costPrice || 0),
        sku: sku,
      }) as any;

      // Map purchase helper fields to history if price is provided and > 0
      if (Number(data.purchasePrice) > 0) {
        ingredient.lastPurchasePrice = Number(data.purchasePrice);
        ingredient.lastPurchaseQuantity = Number(data.purchaseQuantity) || 1;
        ingredient.lastPurchaseUnit = data.purchaseUnit;
      }

      const saved = await this.ingredientRepository.save(ingredient);
      await this.broadcastAvailability();
      return saved;
    } catch (error) {
      console.error('CREATE_INGREDIENT_ERROR:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Nama atau SKU bahan sudah terdaftar.');
      }
      throw error;
    }
  }

  async updateIngredient(id: number, data: any): Promise<Ingredient> {
    try {
      const ingredient = (await this.ingredientRepository.findOne({
        where: { id },
      })) as any;
      if (!ingredient) throw new NotFoundException('Ingredient not found');

      Object.assign(ingredient, {
        ...data,
        stockQuantity: Number(data.stockQuantity || 0),
        minStockLevel: Number(data.minStockLevel || 0),
        yieldPercentage: Number(data.yieldPercentage || 100),
        costPrice: Number(data.costPrice || 0),
        sku: data.sku?.trim() || null,
      });

      // Map purchase helper fields to history if price is provided and > 0
      if (Number(data.purchasePrice) > 0) {
        ingredient.lastPurchasePrice = Number(data.purchasePrice);
        ingredient.lastPurchaseQuantity = Number(data.purchaseQuantity) || 1;
        ingredient.lastPurchaseUnit = data.purchaseUnit;
      }

      const updated = await this.ingredientRepository.save(ingredient);

      // Broadcast full object if stock or details changed
      this.inventoryGateway.broadcastStockUpdate(updated);

      // Also broadcast overall menu availability since it might have changed
      this.broadcastAvailability();

      return updated;
    } catch (error) {
      console.error('UPDATE_INGREDIENT_ERROR:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Nama atau SKU bahan sudah terdaftar.');
      }
      throw error;
    }
  }

  async deleteIngredient(id: number): Promise<void> {
    const ingredient = await this.ingredientRepository.findOne({
      where: { id },
    });
    if (!ingredient) throw new NotFoundException('Ingredient not found');

    // Rename to allow reuse of name/SKU if needed (optional but consistent with Table/Locker)
    const timestamp = Date.now();
    await this.ingredientRepository.update(id, {
      name: `${ingredient.name} (DELETED-${timestamp})`,
      sku: ingredient.sku ? `${ingredient.sku}-DEL-${timestamp}` : undefined,
    });

    await this.ingredientRepository.softDelete(id);
  }

  async updateStock(
    id: number,
    quantity: number,
    type: 'add' | 'subtract' = 'subtract',
    userName?: string,
    reason?: string,
    manager?: any,
  ): Promise<Ingredient> {
    const repo = manager
      ? manager.getRepository(Ingredient)
      : this.ingredientRepository;

    // 1. Fetch current for logging and audit purposes
    const ingredient = await repo.findOne({ where: { id } });
    if (!ingredient) throw new NotFoundException('Ingredient not found');
    const oldStock = Number(ingredient.stockQuantity);

    // 2. Perform ATOMIC update in DB (prevents race conditions)
    const sign = type === 'add' ? '+' : '-';

    if (manager) {
      await manager
        .createQueryBuilder()
        .update(Ingredient)
        .set({
          stockQuantity: () => `stockQuantity ${sign} ${quantity}`,
        })
        .where('id = :id', { id })
        .execute();
    } else {
      await this.ingredientRepository
        .createQueryBuilder()
        .update(Ingredient)
        .set({
          stockQuantity: () => `stockQuantity ${sign} ${quantity}`,
        })
        .where('id = :id', { id })
        .execute();
    }

    // 3. Fetch updated version to return
    const updated = await repo.findOne({ where: { id } });
    if (!updated) throw new Error('Failed to retrieve updated ingredient');

    // Audit log if performed by a user (manual adjustment)
    if (userName) {
      let details = `${type === 'add' ? 'Penambahan' : 'Pengurangan'} stok manual untuk "${ingredient.name}" sebesar ${quantity} ${ingredient.unit}. Stok lama: ${oldStock} -> Baru: ${updated.stockQuantity}`;
      if (reason) details += ` | Alasan: ${reason}`;
      await this.reportService.logAction('STOCK_ADJUSTMENT', userName, details);
    }

    // Broadcast update via socket & MQTT
    this.inventoryGateway.broadcastStockUpdate(updated);
    this.mqttService.broadcastInventoryUpdate(updated);
    this.broadcastAvailability();

    // Check for low stock alert
    if (Number(updated.stockQuantity) <= Number(updated.minStockLevel)) {
      this.notifyLowStock(updated);
    }

    return updated;
  }

  private async notifyLowStock(ingredient: Ingredient) {
    try {
      const settings = await this.settingsService.getSettings();
      const adminPhone = settings.ownerPhone;
      if (!adminPhone) return;

      const message = `⚠️ *PERINGATAN STOK RENDAH*\n\nBahan: *${ingredient.name}*\nStok Saat Ini: ${ingredient.stockQuantity} ${ingredient.unit}\nBatas Minimum: ${ingredient.minStockLevel} ${ingredient.unit}\n\nMohon segera lakukan pengadaan ulang.`;

      await this.whatsappService.sendMessage(adminPhone, message);
    } catch (error) {
      console.error('Failed to send low stock notification:', error);
    }
  }

  async setRecipe(menuItemId: number, recipes: any[]): Promise<void> {
    // Clear old recipes
    await this.recipeRepository.delete({ menuItemId });

    for (const item of recipes) {
      const recipe = this.recipeRepository.create({
        menuItemId,
        ingredientId: item.ingredientId,
        subMenuItemId: item.subMenuItemId,
        quantity: item.quantity,
        unit: item.unit,
      });
      await this.recipeRepository.save(recipe);
    }
  }

  private getConversionFactor(fromUnit: string, toUnit: string): number {
    const units: Record<string, Record<string, number>> = {
      Gram: { Kg: 0.001, Gram: 1 },
      Kg: { Gram: 1000, Kg: 1 },
      Ml: { Liter: 0.001, Ml: 1 },
      Liter: { Ml: 1000, Liter: 1 },
    };

    if (units[fromUnit] && units[fromUnit][toUnit]) {
      return units[fromUnit][toUnit];
    }

    return 1; // Default no conversion (e.g., Pcs to Pcs)
  }

  /**
   * Recursive stock deduction logic
   */
  async deductStock(
    menuItemId: number,
    orderQuantity: number,
    manager?: any,
  ): Promise<void> {
    try {
      const menuRepo = manager
        ? manager.getRepository('MenuItem')
        : this.dataSource.getRepository('MenuItem');
      const recipeRepo = manager
        ? manager.getRepository(Recipe)
        : this.recipeRepository;

      const menuItem = await menuRepo.findOne({
        where: { id: menuItemId },
        relations: ['category'],
      });

      if (!menuItem) return;

      // 1. Handle STORE category (Direct Stock Deduction)
      if (menuItem.category?.name?.toUpperCase() === 'STORE') {
        console.log(
          `Deducting direct stock for STORE item "${menuItem.name}" (Qty: ${orderQuantity})`,
        );
        menuItem.stockQuantity = Number(
          (Number(menuItem.stockQuantity) - orderQuantity).toFixed(3),
        );
        await menuRepo.save(menuItem);

        this.broadcastAvailability();
        return;
      }

      // 2. Handle Recursive Recipe Deduction
      const recipes = await recipeRepo.find({
        where: { menuItemId },
        relations: ['ingredient'],
      });

      for (const recipe of recipes) {
        if (recipe.ingredientId) {
          if (!recipe.ingredient) continue;

          const conversionFactor = this.getConversionFactor(
            recipe.unit,
            recipe.ingredient.unit,
          );
          const yieldFactor =
            (Number(recipe.ingredient.yieldPercentage) || 100) / 100;
          const amountToDeduct =
            (Number(recipe.quantity) * orderQuantity * conversionFactor) /
            yieldFactor;

          await this.updateStock(
            recipe.ingredientId,
            amountToDeduct,
            'subtract',
            undefined,
            manager,
          );
        } else if (recipe.subMenuItemId) {
          await this.deductStock(
            recipe.subMenuItemId,
            Number(recipe.quantity) * orderQuantity,
            manager,
          );
        }
      }
    } catch (error) {
      console.error(
        `Failed to deduct stock for MenuItem ${menuItemId}:`,
        error,
      );
    }
  }

  /**
   * Calculates maximum portions for all menu items based on available ingredients or direct stock
   */
  async getMenuAvailability(): Promise<Record<string, number>> {
    const ingredients = await this.ingredientRepository.find();
    const recipes = await this.recipeRepository.find({
      relations: ['ingredient'],
    });
    const bundles = await this.promoService.getMenuBundles();
    const allMenuItems = (await this.dataSource.getRepository('MenuItem').find({
      relations: ['category'],
    })) as any[];

    const availability: Record<string, number> = {};
    const isCriticalMap: Record<number, boolean> = {};

    // 1. Calculate for STORE items (Direct Stock)
    for (const menu of allMenuItems) {
      if (!menu.isActive) {
        availability[menu.id] = -1;
        continue;
      }
      if (menu.category?.name?.toUpperCase() === 'STORE') {
        const stock = Number(menu.stockQuantity);
        const minStock = Number(menu.minStockLevel);
        availability[menu.id] = Math.max(0, Math.floor(stock));
        isCriticalMap[menu.id] = stock <= minStock;
      }
    }

    // 2. Calculate for regular recipe items
    const menuRecipes: Record<number, Recipe[]> = {};
    recipes.forEach((r) => {
      if (!menuRecipes[r.menuItemId]) menuRecipes[r.menuItemId] = [];
      menuRecipes[r.menuItemId].push(r);
    });

    for (const menuItemIdString in menuRecipes) {
      const menuItemId = Number(menuItemIdString);
      if (availability[menuItemId] !== undefined) continue;

      const menuItem = allMenuItems.find((m) => m.id === menuItemId);
      if (menuItem && !menuItem.isActive) {
        availability[menuItemId] = -1;
        continue;
      }

      const itemRecipes = menuRecipes[menuItemId];
      let maxPortions = Infinity;
      let isCritical = false;

      for (const re of itemRecipes) {
        if (re.ingredientId && re.ingredient) {
          const ing = re.ingredient;
          const stock = Number(ing.stockQuantity);
          const minStock = Number(ing.minStockLevel);

          if (stock <= minStock) isCritical = true;

          const conversionFactor = this.getConversionFactor(
            re.unit,
            re.ingredient.unit,
          );
          const yieldFactor =
            (Number(re.ingredient.yieldPercentage) || 100) / 100;
          const requiredPerPortion =
            (Number(re.quantity) * conversionFactor) / yieldFactor;

          if (requiredPerPortion > 0) {
            const possible = Math.floor(stock / requiredPerPortion);
            if (possible < maxPortions) maxPortions = possible;
          }
        }
      }

      availability[menuItemId] = maxPortions === Infinity ? 999 : maxPortions;
      isCriticalMap[menuItemId] = isCritical;
    }

    // 3. Calculate for BUNDLE promos
    for (const promo of bundles) {
      if (!promo.isActive) {
        availability[`PROMO_${promo.id}`] = -1;
        continue;
      }

      const rule = promo.ruleJson || {};
      const itemsToCheck = [...(rule.requireMenuItems || [])];

      let maxBundles = Infinity;
      let hasCriticalItem = false;

      for (const bi of itemsToCheck) {
        if (isCriticalMap[bi.id]) hasCriticalItem = true;

        const itemPortions = availability[bi.id] ?? 999;
        const requiredPerBundle = Number(bi.quantity || 1);

        if (requiredPerBundle > 0) {
          const possibleBundles = Math.floor(itemPortions / requiredPerBundle);
          if (possibleBundles < maxBundles) maxBundles = possibleBundles;
        }
      }

      if (hasCriticalItem) maxBundles = 0;
      availability[`PROMO_${promo.id}`] =
        maxBundles === Infinity ? 999 : maxBundles;
    }

    return availability;
  }

  async broadcastAvailability() {
    try {
      const availability = await this.getMenuAvailability();
      console.log(
        'Emitting menuAvailability to inventory namespace:',
        Object.keys(availability).length,
        'items',
      );
      this.inventoryGateway.broadcastMenuAvailability(availability);
      this.mqttService.broadcastMenuAvailability(availability);
    } catch (error) {
      console.error('Failed to broadcast availability:', error);
    }
  }

  /**
   * Recursive stock return logic (for cancellations)
   */
  async returnStock(
    menuItemId: number,
    orderQuantity: number,
    manager?: any,
  ): Promise<void> {
    try {
      const menuRepo = manager
        ? manager.getRepository('MenuItem')
        : this.dataSource.getRepository('MenuItem');
      const recipeRepo = manager
        ? manager.getRepository(Recipe)
        : this.recipeRepository;

      const menuItem = await menuRepo.findOne({
        where: { id: menuItemId },
        relations: ['category'],
      });

      if (!menuItem) return;

      // 1. Handle STORE category (Direct Stock Return)
      if (menuItem.category?.name?.toUpperCase() === 'STORE') {
        menuItem.stockQuantity = Number(
          (Number(menuItem.stockQuantity) + orderQuantity).toFixed(3),
        );
        await menuRepo.save(menuItem);
        this.broadcastAvailability();
        return;
      }

      // 2. Handle Recursive Recipe Return
      const recipes = await recipeRepo.find({
        where: { menuItemId },
        relations: ['ingredient'],
      });

      for (const recipe of recipes) {
        if (recipe.ingredientId) {
          if (!recipe.ingredient) continue;

          const conversionFactor = this.getConversionFactor(
            recipe.unit,
            recipe.ingredient.unit,
          );
          const yieldFactor =
            (Number(recipe.ingredient.yieldPercentage) || 100) / 100;
          const amountToReturn =
            (Number(recipe.quantity) * orderQuantity * conversionFactor) /
            yieldFactor;

          await this.updateStock(
            recipe.ingredientId,
            amountToReturn,
            'add',
            undefined,
            manager,
          );
        } else if (recipe.subMenuItemId) {
          await this.returnStock(
            recipe.subMenuItemId,
            Number(recipe.quantity) * orderQuantity,
            manager,
          );
        }
      }
    } catch (error) {
      console.error(
        `Failed to return stock for MenuItem ${menuItemId}:`,
        error,
      );
    }
  }
}
