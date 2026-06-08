import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApprovalService } from '../common/approval/approval.service';
import { ApprovalModuleType } from '../common/entities/approval.entity';
import { Waste, WasteStatus } from './entities/waste.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Ingredient } from './entities/ingredient.entity';
import { Recipe } from './entities/recipe.entity';
import { InventoryGateway } from './inventory.gateway';
import { PromoService } from '../promo/promo.service';
import type { ReportService } from '../report/report.service';
import { MqttService } from '../mqtt/mqtt.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { SettingsService } from '../settings/settings.service';
import { Supplier } from './entities/supplier.entity';
import { StockIn, StockPaymentStatus } from './entities/stock-in.entity';
import { StockPayment } from './entities/stock-payment.entity';
import { FinanceService } from '../finance/finance.service';
import { CashflowType } from '../finance/entities/cashflow.entity';
import { StockInstallmentPlan } from './entities/stock-installment-plan.entity';
import { MoreThanOrEqual, LessThanOrEqual, And } from 'typeorm';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Ingredient)
    private readonly ingredientRepository: Repository<Ingredient>,
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(Waste)
    private readonly wasteRepository: Repository<Waste>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(StockIn)
    private readonly stockInRepository: Repository<StockIn>,
    private readonly dataSource: DataSource,
    private readonly inventoryGateway: InventoryGateway,
    private readonly promoService: PromoService,
    @Inject(forwardRef(() => {
      const { ReportService } = require('../report/report.service');
      return ReportService;
    }))
    private readonly reportService: ReportService,
    private readonly mqttService: MqttService,
    private readonly whatsappService: WhatsAppService,
    private readonly settingsService: SettingsService,
    private readonly approvalService: ApprovalService,
    @InjectRepository(StockPayment)
    private readonly stockPaymentRepository: Repository<StockPayment>,
    @Inject(forwardRef(() => FinanceService))
    private readonly financeService: FinanceService,
    @InjectRepository(StockInstallmentPlan)
    private readonly installmentPlanRepository: Repository<StockInstallmentPlan>,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async findAllSuppliers() {
    return this.supplierRepository.find({ order: { name: 'ASC' } });
  }

  async createSupplier(data: any) {
    const supplier = this.supplierRepository.create(data);
    return this.supplierRepository.save(supplier);
  }

  async deleteSupplier(id: number) {
    return this.supplierRepository.delete(id);
  }

  async updateSupplier(id: number, data: any) {
    const supplier = await this.supplierRepository.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    Object.assign(supplier, data);
    return this.supplierRepository.save(supplier);
  }

  async receiveStock(data: {
    ingredientId: number;
    supplierId?: number;
    quantity: number;
    purchasePrice: number;
    receivedByUserId?: number;
    notes?: string;
    paymentStatus?: StockPaymentStatus;
    dueDate?: Date;
    paidAmount?: number;
    invoiceNumber?: string;
    paymentMethod?: string;
    shiftId?: number;
    installmentPlans?: { dueDate: Date; amount: number }[];
  }): Promise<StockIn> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ingredient = await queryRunner.manager.findOne(Ingredient, {
        where: { id: data.ingredientId },
      });
      if (!ingredient) throw new NotFoundException('Ingredient not found');

      const totalCost = Number(data.quantity) * Number(data.purchasePrice);
      const paidAmount = Number(data.paidAmount || 0);

      // 1. Create StockIn record
      const stockIn = this.stockInRepository.create({
        ...data,
        unit: ingredient.unit,
        totalCost,
        paidAmount: paidAmount,
        paymentStatus: data.paymentStatus || (paidAmount >= totalCost ? StockPaymentStatus.PAID : (paidAmount > 0 ? StockPaymentStatus.PARTIAL : StockPaymentStatus.UNPAID)),
      });
      const savedStockIn = await queryRunner.manager.save(stockIn);

      const settings = await this.settingsService.getSettings();
      const config = settings.approvalConfig?.STOCK_IN;
      
      console.log(`[DEBUG-APPROVAL] receiveStock for IngID: ${data.ingredientId}`);
      console.log(`[DEBUG-APPROVAL] Config STOCK_IN: ${JSON.stringify(config)}`);
      console.log(`[DEBUG-APPROVAL] receivedByUserId: ${data.receivedByUserId}`);

      if (config && config.length > 0 && data.receivedByUserId) {
        console.log(`[DEBUG-APPROVAL] >>> CREATING STOCK_IN APPROVAL REQUEST`);
        await this.approvalService.createRequest({
          moduleType: ApprovalModuleType.STOCK_IN,
          referenceId: savedStockIn.id,
          requestedByUserId: data.receivedByUserId,
          requiredLevels: [...config].sort((a, b) => a - b),
          metadata: {
            itemName: ingredient.name,
            quantity: data.quantity,
            totalCost,
            paidAmount,
            invoiceNumber: data.invoiceNumber,
            stockBefore: Number(ingredient.stockQuantity || 0),
            stockAfter: Number(ingredient.stockQuantity || 0) + Number(data.quantity),
            category: ingredient.category || 'Bahan Baku'
          }
        });
        
        // Commit only the StockIn record (and installments if any) 
        // but we need to mark it as PENDING in some way if possible.
        // For now, let's just return to avoid the immediate stock update below.
        await queryRunner.commitTransaction();
        return savedStockIn;
      }

      // 2. Create Payment Record if DP provided
      if (paidAmount > 0) {
        const payment = this.stockPaymentRepository.create({
          stockInId: savedStockIn.id,
          amount: paidAmount,
          paymentMethod: data.paymentMethod || 'CASH',
          userId: data.receivedByUserId,
          notes: 'Cicilan Pertama / DP',
        });
        await queryRunner.manager.save(payment);

        // 3. Log to Cashflow if paid now
        await this.financeService.logCashflow({
          amount: paidAmount,
          type: CashflowType.OUT,
          source: 'stock_purchase',
          referenceId: savedStockIn.id.toString(),
          description: `Pembelian stok: ${ingredient.name} (${data.invoiceNumber || 'No Inv'})`,
          paymentMethod: data.paymentMethod || 'CASH',
          shiftId: data.shiftId,
        }, queryRunner.manager);
      }

      // 4. Update Ingredient Stock & Pricing
      await queryRunner.manager.update(Ingredient, data.ingredientId, {
        stockQuantity: Number(ingredient.stockQuantity) + Number(data.quantity),
        costPrice: Number(data.purchasePrice),
        lastPurchasePrice: Number(data.purchasePrice),
        lastPurchaseQuantity: Number(data.quantity),
        lastPurchaseUnit: ingredient.unit,
      });

      // 5. Create Installment Plans if requested
      if (data.paymentStatus === StockPaymentStatus.PARTIAL && data.installmentPlans && data.installmentPlans.length > 0) {
        for (const plan of data.installmentPlans) {
          const installment = this.installmentPlanRepository.create({
            stockInId: savedStockIn.id,
            amount: plan.amount,
            dueDate: new Date(plan.dueDate),
            isPaid: false
          });
          await queryRunner.manager.save(installment);
        }
      }

      await queryRunner.commitTransaction();

      // 5. Broadcast updates
      const updatedIng = await this.ingredientRepository.findOne({ where: { id: data.ingredientId } });
      if (updatedIng) {
        this.inventoryGateway.broadcastStockUpdate(updatedIng);
        this.eventEmitter.emit('inventory.update', updatedIng);
        this.broadcastAvailability();
      }

      return savedStockIn;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async payInstallment(data: {
    stockInId: number;
    amount: number;
    paymentMethod: string;
    userId: number;
    notes?: string;
    shiftId?: number;
  }): Promise<StockPayment> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const stockIn = await queryRunner.manager.findOne(StockIn, {
        where: { id: data.stockInId },
        relations: ['ingredient'],
      });
      if (!stockIn) throw new NotFoundException('StockIn record not found');

      const amountToPay = Number(data.amount);
      const newPaidAmount = Number(stockIn.paidAmount) + amountToPay;
      const totalCost = Number(stockIn.totalCost);

      // 1. Create Payment Record
      const payment = this.stockPaymentRepository.create({
        ...data,
        notes: data.notes || 'Cicilan Pembayaran',
      });
      const savedPayment = await queryRunner.manager.save(payment);

      // 2. Update StockIn Status
      stockIn.paidAmount = newPaidAmount;
      if (newPaidAmount >= totalCost) {
        stockIn.paymentStatus = StockPaymentStatus.PAID;
      } else {
        stockIn.paymentStatus = StockPaymentStatus.PARTIAL;
      }
      await queryRunner.manager.save(stockIn);
      
      // 3. Sync Installment Plans (Auto-mark as paid based on cumulative paidAmount)
      const installmentPlans = await queryRunner.manager.find(StockInstallmentPlan, {
        where: { stockInId: data.stockInId, isPaid: false },
        order: { dueDate: 'ASC' }
      });

      let remainingPaidForPlans = Number(stockIn.paidAmount);
      for (const plan of installmentPlans) {
        if (remainingPaidForPlans >= Number(plan.amount)) {
          plan.isPaid = true;
          plan.paidAt = new Date();
          await queryRunner.manager.save(plan);
          remainingPaidForPlans -= Number(plan.amount);
        } else {
          // If the total paid doesn't cover this installment, we stop
          break;
        }
      }

      // 4. Log Cashflow
      await this.financeService.logCashflow({
        amount: amountToPay,
        type: CashflowType.OUT,
        source: 'stock_purchase',
        referenceId: stockIn.id.toString(),
        description: `Cicilan stok: ${stockIn.ingredient?.name || 'Item'} (${stockIn.invoiceNumber || 'No Inv'})`,
        paymentMethod: data.paymentMethod,
        shiftId: data.shiftId,
      }, queryRunner.manager);

      await queryRunner.commitTransaction();
      return savedPayment;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getPurchaseLedger(stockInId: number) {
    return this.stockPaymentRepository.find({
      where: { stockInId },
      relations: ['user'],
      order: { paidAt: 'DESC' },
    });
  }

  async findAllStockIn() {
    return this.stockInRepository.find({
      relations: ['ingredient', 'supplier', 'receivedBy', 'payments'],
      order: { createdAt: 'DESC' },
      take: 100, // Limit to last 100 entries for performance
    });
  }

  async getInventoryStats() {
    const ingredients = await this.ingredientRepository.find({
      where: { deletedAt: IsNull() },
    });

    let totalAssetValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const expiringSoon = [];
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    for (const ing of ingredients) {
      const stock = Number(ing.stockQuantity || 0);
      const hpp = Number(ing.costPrice || 0);
      
      totalAssetValue += stock * hpp;

      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= Number(ing.minStockLevel || 0)) {
        lowStockCount++;
      }

      if (ing.expiryDate) {
        const expDate = new Date(ing.expiryDate);
        if (expDate <= nextWeek) {
          expiringSoon.push({
            id: ing.id,
            name: ing.name,
            expiryDate: ing.expiryDate,
            daysLeft: Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
          });
        }
      }
    }

    return {
      totalAssetValue,
      totalItems: ingredients.length,
      lowStockCount,
      outOfStockCount,
      expiringSoon: expiringSoon.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5),
    };
  }

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

  async getUpcomingInstallments() {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const plans = await this.installmentPlanRepository.find({
      where: {
        isPaid: false,
        dueDate: LessThanOrEqual(nextWeek)
      },
      relations: ['stockIn', 'stockIn.ingredient', 'stockIn.supplier'],
      order: { dueDate: 'ASC' }
    });

    return plans.filter(p => p.stockIn?.paymentStatus !== StockPaymentStatus.PAID);
  }

  async getAllUnpaidInstallments() {
    const plans = await this.installmentPlanRepository.find({
      where: { isPaid: false },
      relations: ['stockIn', 'stockIn.ingredient', 'stockIn.supplier'],
      order: { dueDate: 'ASC' }
    });

    return plans.filter(p => p.stockIn?.paymentStatus !== StockPaymentStatus.PAID);
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

  async updateIngredient(id: number, data: any, userId?: number, bypassApproval?: boolean): Promise<any> {
    try {
      const settings = await this.settingsService.getSettings();
      const config = settings.approvalConfig?.DATA_EDIT;

      if (config && config.length > 0 && !bypassApproval && userId) {
        const oldIng = (await this.ingredientRepository.findOne({ where: { id } })) as any;

        // Compute diff for accurate summary in Approval Center
        const changes: Record<string, { old: any; new: any }> = {};
        const fieldLabels: Record<string, string> = {
          name: 'Nama',
          sku: 'SKU',
          category: 'Kategori',
          unit: 'Satuan',
          costPrice: 'Harga Beli',
          stockQuantity: 'Stok Saat Ini',
          minStockLevel: 'Batas Minimum',
          yieldPercentage: '% Yield',
          description: 'Deskripsi',
          imageUrl: 'URL Gambar',
          department: 'Departemen',
          isHighValue: 'High Value',
          auditFrequency: 'Audit',
          expiryDate: 'Tgl Kadaluwarsa',
        };

        for (const key of Object.keys(fieldLabels)) {
          const oldVal = oldIng?.[key];
          const newVal = data[key];

          if (newVal === undefined) continue;

          if (key === 'expiryDate') {
            const oldDate = oldVal ? new Date(oldVal).toISOString().split('T')[0] : '';
            const newDate = newVal ? new Date(newVal).toISOString().split('T')[0] : '';
            console.log(`[DEBUG-APPROVAL] expiryDate check: oldDate=${oldDate}, newDate=${newDate}`);
            if (oldDate !== newDate) {
              changes[key] = { old: oldDate || '-', new: newDate || '-' };
            }
            continue;
          }

          // Normalize for numeric comparison
          const isNum = !isNaN(parseFloat(oldVal)) && isFinite(oldVal) && (typeof oldVal === 'number' || (typeof oldVal === 'string' && oldVal.trim() !== ''));

          if (isNum) {
            const isStockField = key === 'stockQuantity' || key === 'minStockLevel';
            const finalOld = isStockField ? Math.round(Number(oldVal)) : Number(oldVal);
            const finalNew = isStockField ? Math.round(Number(newVal)) : Number(newVal);

            if (Math.abs(finalOld - finalNew) > 0.0001) {
              changes[key] = { old: finalOld, new: finalNew };
            }
          } else {
            if (String(oldVal || '').trim() !== String(newVal || '').trim()) {
              changes[key] = { old: oldVal, new: newVal };
            }
          }
        }

        await this.approvalService.createRequest({
          moduleType: ApprovalModuleType.DATA_EDIT,
          referenceId: id,
          requestedByUserId: userId,
          requiredLevels: [...config].sort((a, b) => a - b),
          metadata: {
            entityType: 'INGREDIENT',
            itemName: oldIng?.name || 'Unknown',
            price: Number(oldIng?.costPrice || 0),
            payload: data,
            changes,
            fieldLabels,
          },
        });
        return { pendingApproval: true };
      }
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
    userId?: number,
    bypassApproval?: boolean
  ): Promise<any> {
    const settings = await this.settingsService.getSettings();
    const config = settings.approvalConfig?.STOCK_UPDATE;
    
    console.log(`[DEBUG-APPROVAL] updateStock for ID: ${id}`);
    console.log(`[DEBUG-APPROVAL] Config: ${JSON.stringify(config)}`);
    console.log(`[DEBUG-APPROVAL] userId: ${userId}, bypass: ${bypassApproval}, manager: ${!!manager}`);

    const oldIng = await this.ingredientRepository.findOne({ where: { id } });

    if (config && config.length > 0 && !bypassApproval && userId && !manager) {
      console.log(`[DEBUG-APPROVAL] >>> CREATING APPROVAL REQUEST`);
      await this.approvalService.createRequest({
        moduleType: ApprovalModuleType.STOCK_UPDATE,
        referenceId: id,
        requestedByUserId: userId,
        requiredLevels: [...config].sort((a, b) => a - b),
        metadata: {
          itemName: oldIng?.name,
          quantity,
          type,
          reason,
          userName,
          stockBefore: Number(oldIng?.stockQuantity || 0),
          stockAfter: type === 'add' 
            ? Number(oldIng?.stockQuantity || 0) + Number(quantity)
            : Number(oldIng?.stockQuantity || 0) - Number(quantity),
          category: oldIng?.category || 'Bahan Baku'
        }
      });
      return { pendingApproval: true };
    }
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
    this.eventEmitter.emit('inventory.update', updated);
    this.broadcastAvailability();

    // Check for low stock alert
    if (Number(updated.stockQuantity) <= Number(updated.minStockLevel)) {
      this.notifyLowStock(updated);
    }

    return updated;
  }

  private async notifyLowStock(ingredient: Ingredient) {
    this.eventEmitter.emit('inventory.critical', ingredient);
    try {
      const settings = await this.settingsService.getSettings();
      const adminPhone = settings.ownerPhone;
      if (!adminPhone) return;

      const stock = Number(ingredient.stockQuantity);
      const minStock = Number(ingredient.minStockLevel);
      const formattedStock = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(stock);
      const formattedMin = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(minStock);

      const message = `⚠️ *PERINGATAN STOK RENDAH*\n\nBahan: *${ingredient.name}*\nStok Saat Ini: ${formattedStock} ${ingredient.unit}\nBatas Minimum: ${formattedMin} ${ingredient.unit}\n\nMohon segera lakukan pengadaan ulang.`;

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

      // 1. Handle STORE category (Direct Stock Deduction) - only if NO recipe
      const recipes = await recipeRepo.find({
        where: { menuItemId },
        relations: ['ingredient'],
      });

      if (menuItem.category?.name?.toUpperCase() === 'STORE' && recipes.length === 0) {
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
      // (Recipes already loaded above)

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

    // 1. Calculate for STORE items (Direct Stock) - only if they DON'T have a recipe
    for (const menu of allMenuItems) {
      if (!menu.isActive) {
        availability[menu.id] = -1;
        continue;
      }
      
      const hasRecipe = recipes.some(r => r.menuItemId === menu.id);
      if (!hasRecipe) {
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

      // 1. Handle STORE category (Direct Stock Return) - only if NO recipe
      const recipes = await recipeRepo.find({
        where: { menuItemId },
        relations: ['ingredient'],
      });

      if (menuItem.category?.name?.toUpperCase() === 'STORE' && recipes.length === 0) {
        menuItem.stockQuantity = Number(
          (Number(menuItem.stockQuantity) + orderQuantity).toFixed(3),
        );
        await menuRepo.save(menuItem);
        this.broadcastAvailability();
        return;
      }

      // 2. Handle Recursive Recipe Return
      // (Recipes already loaded above)

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

  async declareWaste(data: {
    ingredientId: number;
    quantity: number;
    reason: string;
    recordedByUserId: number;
  }): Promise<Waste> {
    const ingredient = await this.ingredientRepository.findOne({
      where: { id: data.ingredientId },
    });
    if (!ingredient) throw new NotFoundException('Ingredient not found');

    const valuation = Number(ingredient.costPrice || 0) * Number(data.quantity);

    const waste = this.wasteRepository.create({
      ...data,
      valuation,
      status: WasteStatus.PENDING,
    });

    const savedWaste = await this.wasteRepository.save(waste);

    // Dynamic Configured Approval Request
    const settings = await this.settingsService.getSettings();
    let requiredLevels = settings.approvalConfig?.WASTE;
    if (!requiredLevels || requiredLevels.length === 0) {
      requiredLevels = [2, 3]; // fallback safety
    }

    requiredLevels = [...requiredLevels].sort((a, b) => a - b);

    await this.approvalService.createRequest({
      moduleType: ApprovalModuleType.WASTE,
      referenceId: savedWaste.id,
      requestedByUserId: data.recordedByUserId,
      requiredLevels,
      metadata: {
        itemName: ingredient.name,
        quantity: data.quantity,
        unit: ingredient.unit,
        valuation,
        reason: data.reason,
        stockBefore: Number(ingredient.stockQuantity || 0),
        stockAfter: Number(ingredient.stockQuantity || 0) - Number(data.quantity),
        category: ingredient.category || 'Bahan Baku'
      },
    });

    return savedWaste;
  }

  async finalizeWaste(wasteId: number): Promise<void> {
    const waste = await this.wasteRepository.findOne({
      where: { id: wasteId },
      relations: ['ingredient'],
    });

    if (!waste || waste.status !== WasteStatus.PENDING) return;

    await this.updateStock(
      waste.ingredientId,
      Number(waste.quantity),
      'subtract',
      'SYSTEM',
      `Finalisasi Deklarasi Waste #${waste.id}`,
      undefined,
      undefined,
      true
    );

    waste.status = WasteStatus.APPROVED;
    await this.wasteRepository.save(waste);
  }

  async finalizeStockUpdate(referenceId: number, metadata: any): Promise<void> {
    await this.updateStock(
      referenceId,
      metadata.quantity,
      metadata.type,
      metadata.userName || 'SYSTEM',
      (metadata.reason || 'Manual Adjust') + ' (Approved)',
      undefined,
      undefined,
      true
    );
  }

  async finalizeStockIn(referenceId: number): Promise<void> {
    const stockIn = await this.stockInRepository.findOne({
      where: { id: referenceId },
      relations: ['ingredient']
    });

    if (!stockIn) return;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Update Ingredient Stock & Pricing
      await queryRunner.manager.update(Ingredient, stockIn.ingredientId, {
        stockQuantity: Number(stockIn.ingredient.stockQuantity) + Number(stockIn.quantity),
        costPrice: Number(stockIn.purchasePrice),
        lastPurchasePrice: Number(stockIn.purchasePrice),
        lastPurchaseQuantity: Number(stockIn.quantity),
        lastPurchaseUnit: stockIn.unit,
      });

      // 2. Create Payment Record if DP provided
      if (Number(stockIn.paidAmount) > 0) {
        const payment = this.stockPaymentRepository.create({
          stockInId: stockIn.id,
          amount: stockIn.paidAmount,
          paymentMethod: 'CASH', // default
          userId: stockIn.receivedByUserId,
          notes: 'Cicilan Pertama / DP (Approved)',
        });
        await queryRunner.manager.save(payment);

        // 3. Log to Cashflow
        await this.financeService.logCashflow({
          amount: stockIn.paidAmount,
          type: CashflowType.OUT,
          source: 'stock_purchase',
          referenceId: stockIn.id.toString(),
          description: `Pembelian stok (Approved): ${stockIn.ingredient.name} (${stockIn.invoiceNumber || 'No Inv'})`,
          paymentMethod: 'CASH',
        }, queryRunner.manager);
      }

      await queryRunner.commitTransaction();

      // Broadcast update
      const updated = await this.ingredientRepository.findOne({ where: { id: stockIn.ingredientId } });
      if (updated) {
        this.inventoryGateway.broadcastStockUpdate(updated);
        this.mqttService.broadcastInventoryUpdate(updated);
        this.eventEmitter.emit('inventory.update', updated);
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async finalizeDataEdit(referenceId: number, metadata: any): Promise<void> {
    if (metadata.entityType === 'INGREDIENT') {
      await this.updateIngredient(referenceId, metadata.payload, undefined, true);
    }
  }
}
