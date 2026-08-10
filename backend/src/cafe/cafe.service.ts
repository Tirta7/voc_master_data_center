import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from '../redis/redis.service';
import { Repository, In, DataSource, IsNull } from 'typeorm';
import { MenuItem } from './entities/menu-item.entity';
import { Category, ProductionTarget } from './entities/category.entity';
import { ProductFinance } from './entities/product-finance.entity';
import { OrderItem, OrderItemStatus } from './entities/order-item.entity';
import { DailyOrderSummary } from './entities/daily-order-summary.entity';
import { Recipe } from '../inventory/entities/recipe.entity';
import { InventoryService } from '../inventory/inventory.service';
import { KdsGateway } from '../kds/kds/kds.gateway';
import { TransactionService } from '../transaction/transaction.service';
import { BilliardGateway } from '../socket/billiard.gateway';
import type { BilliardService } from '../billiard/billiard.service';
import { PromoService } from '../promo/promo.service';
import { ReportService } from '../report/report.service';
import { ShiftService } from '../finance/shift.service';
import { EventsGateway } from '../socket/events.gateway';
import { AIService } from '../ai/ai.service';
import { ApprovalService } from '../common/approval/approval.service';
import { ApprovalModuleType } from '../common/entities/approval.entity';
import { SettingsService } from '../settings/settings.service';
import { PrinterService } from '../settings/printer.service';
import { InvoiceService } from '../transaction/invoice.service';
import { HardwareService } from '../hardware/hardware.service';
import { PrinterType } from '../settings/entities/printer.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../transaction/entities/transaction.entity';
import { Promo } from '../promo/entities/promo.entity';
import { CafeTable } from '../cafe-table/entities/cafe-table.entity';
import { Table } from '../billiard/entities/table.entity';

@Injectable()
export class CafeService {
  private readonly logger = new Logger(CafeService.name);
  constructor(
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(CafeTable)
    private readonly cafeTableRepository: Repository<CafeTable>,
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(DailyOrderSummary)
    private readonly dailySummaryRepository: Repository<DailyOrderSummary>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(ProductFinance)
    private readonly productFinanceRepository: Repository<ProductFinance>,
    private readonly inventoryService: InventoryService,
    private readonly kdsGateway: KdsGateway,
    private readonly transactionService: TransactionService,
    private readonly billiardGateway: BilliardGateway,
    @Inject(
      forwardRef(() => {
        const { BilliardService } = require('../billiard/billiard.service');
        return BilliardService;
      }),
    )
    private readonly billiardService: BilliardService,
    private readonly promoService: PromoService,
    private readonly reportService: ReportService,
    private readonly shiftService: ShiftService,
    private readonly eventsGateway: EventsGateway,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly aiService: AIService,
    private readonly approvalService: ApprovalService,
    private readonly settingsService: SettingsService,
    private readonly printerService: PrinterService,
    private readonly invoiceService: InvoiceService,
    private readonly hardwareService: HardwareService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  private itemUpdating = new Set<number>(); // key: orderItemId (mutex untuk status update)

  async getAllMenuItems(includeInactive = false): Promise<MenuItem[]> {
    const where: any = { deletedAt: IsNull() };
    if (!includeInactive) where.isActive = true;

    const items = await this.menuItemRepository.find({
      where,
      relations: [
        'category',
        'recipes',
        'recipes.ingredient',
        'recipes.subMenuItem',
        'productFinance',
      ],
      order: { createdAt: 'DESC' },
    });

    return items.map((item) => {
      if (item.recipes) {
        item.recipes = item.recipes.map((r) => {
          const { menuItem: _mi, ...rest } = r;
          return rest as any;
        });
      }
      return item;
    });
  }

  async findAllCategories(): Promise<Category[]> {
    return this.categoryRepository.find({
      order: { name: 'ASC' },
    });
  }

  async createCategory(data: Partial<Category>): Promise<Category> {
    const name = data.name?.trim();
    if (!name) throw new BadRequestException('Nama kategori harus diisi.');

    // Case-insensitive check
    const existing = await this.categoryRepository
      .createQueryBuilder('cat')
      .where('LOWER(cat.name) = LOWER(:name)', { name })
      .getOne();
    if (existing)
      throw new BadRequestException(`Kategori "${name}" sudah ada.`);

    const category = this.categoryRepository.create({
      ...data,
      name: name,
    });
    return await this.categoryRepository.save(category);
  }

  async updateCategory(id: number, data: Partial<Category>): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan.');

    if (data.name) {
      const name = data.name.trim();
      const existing = await this.categoryRepository
        .createQueryBuilder('cat')
        .where('LOWER(cat.name) = LOWER(:name)', { name })
        .getOne();
      if (existing && existing.id !== id)
        throw new BadRequestException(`Kategori "${name}" sudah ada.`);
      category.name = name;
    }

    if (data.productionTarget)
      category.productionTarget = data.productionTarget;
    if (data.isActive !== undefined) category.isActive = data.isActive;

    return await this.categoryRepository.save(category);
  }

  async deleteCategory(id: number): Promise<void> {
    const itemsCount = await this.menuItemRepository.count({
      where: { categoryId: id },
    });
    if (itemsCount > 0)
      throw new BadRequestException(
        'Kategori tidak bisa dihapus karena masih digunakan oleh beberapa menu.',
      );

    await this.categoryRepository.delete(id);
  }

  private async getNextSKU(): Promise<string> {
    const latestItem = await this.menuItemRepository
      .createQueryBuilder('item')
      .where('item.sku LIKE :pattern', { pattern: 'MN-%' })
      .orderBy('item.sku', 'DESC')
      .getOne();

    if (!latestItem || !latestItem.sku) {
      return 'MN-001';
    }

    const matches = latestItem.sku.match(/MN-(\d+)/);
    if (!matches) {
      return 'MN-001';
    }

    const nextNumber = parseInt(matches[1], 10) + 1;
    return `MN-${nextNumber.toString().padStart(3, '0')}`;
  }

  private sanitizeFinanceData(finance: any) {
    if (!finance) return undefined;
    return {
      ...finance,
      baseHpp: Number(finance.baseHpp || 0),
      targetMarginPercent: Number(
        Number(finance.targetMarginPercent || 0).toFixed(2),
      ),
      targetMarkupFixed: Number(
        Number(finance.targetMarkupFixed || 0).toFixed(2),
      ),
      targetMarkupPercent: Number(
        Number(finance.targetMarkupPercent || 0).toFixed(2),
      ),
      targetMultiplier: Number(
        Number(finance.targetMultiplier || 0).toFixed(2),
      ),
      maxHppThreshold: Number(Number(finance.maxHppThreshold || 0).toFixed(2)),
    };
  }

  async createMenuItem(data: any): Promise<MenuItem> {
    return this.menuItemRepository.manager.transaction(async (manager) => {
      try {
        // Sanitize data: remove ID if leaked from frontend to ensure new record creation
        const { id: _id, ...cleanData } = data;

        // Validate SKU
        const sku = cleanData.sku?.trim() || `MNU-${Date.now()}`;
        const existing = await manager.findOne(MenuItem, { where: { sku } });
        if (existing) {
          throw new BadRequestException(`SKU "${sku}" sudah terdaftar.`);
        }

        // Handle category if passed as a string (for seeder/older code)
        let category = cleanData.category;
        if (typeof cleanData.category === 'string') {
          const catName = cleanData.category.trim();
          let catEntity = await manager.findOne(Category, {
            where: { name: catName },
          });
          if (!catEntity) {
            catEntity = manager.create(Category, {
              name: catName,
              productionTarget: ProductionTarget.KITCHEN,
            });
            catEntity = await manager.save(catEntity);
          }
          category = catEntity;
        }

        const item = manager.create(MenuItem, {
          ...cleanData,
          category,
          price: Number(cleanData.price || 0),
          taxPercentage: Number(cleanData.taxPercentage || 0),
          sku: sku,
          expiryDate: cleanData.expiryDate || null,
          productFinance: this.sanitizeFinanceData(cleanData.productFinance),
        });

        // Note: productFinance will be saved automatically due to { cascade: true }
        // if it exists in cleanData and is properly mapped in the entity.
        const saved = await manager.save(item);

        return saved;
      } catch (error) {
        console.error('CREATE_MENU_ITEM_ERROR:', error);
        if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
          throw new BadRequestException('Nama atau SKU menu sudah terdaftar.');
        }
        throw error;
      }
    });
  }

  async updateMenuItem(
    id: number,
    data: any,
    userName?: string,
    userId?: number,
    bypassApproval?: boolean,
  ): Promise<any> {
    const settings = await this.settingsService.getSettings();
    const config = settings.approvalConfig?.DATA_EDIT;

    if (config && config.length > 0 && !bypassApproval && userId) {
      const oldItem = (await this.menuItemRepository.findOne({
        where: { id },
        relations: ['category', 'productFinance', 'recipes', 'recipes.ingredient'],
      })) as any;

      if (oldItem) {
        // Compute effective stock if linked to an ingredient (1-to-1) to avoid false-positive diffs
        if (oldItem.recipes && oldItem.recipes.length === 1 && oldItem.recipes[0].ingredient) {
          const ing = oldItem.recipes[0].ingredient;
          oldItem.stockQuantity = Number(ing.stockQuantity || 0);
          oldItem.minStockLevel = Number(ing.minStockLevel || 0);
        }

        // Smart Diffing for MenuItem
        const changes: Record<string, { old: any; new: any }> = {};
        const fieldLabels: Record<string, string> = {
          name: 'Nama Menu',
          sku: 'SKU / Kode',
          price: 'Harga Jual',
          taxPercentage: 'Pajak (%)',
          stockQuantity: 'Stok Tersedia',
          minStockLevel: 'Min. Stock Alert',
          department: 'Departemen',
          isActive: 'Status Aktif',
          description: 'Deskripsi',
          imageUrl: 'URL Foto',
          yieldPercentage: 'Yield (%)',
          categoryId: 'Kategori ID',
          expiryDate: 'Tgl Kadaluwarsa',
        };

        for (const key of Object.keys(fieldLabels)) {
          const oldVal = oldItem[key];
          const newVal = data[key];

          if (newVal === undefined) continue;

          if (key === 'expiryDate') {
            const oldDate = oldVal ? new Date(oldVal).toISOString().split('T')[0] : '';
            const newDate = newVal ? new Date(newVal).toISOString().split('T')[0] : '';
            if (oldDate !== newDate) {
              changes[key] = { old: oldDate || '-', new: newDate || '-' };
            }
            continue;
          }

          // Normalize for comparison
          const isNum =
            !isNaN(parseFloat(oldVal)) &&
            isFinite(oldVal) &&
            (typeof oldVal === 'number' ||
              (typeof oldVal === 'string' && oldVal.trim() !== ''));

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

        if (Object.keys(changes).length > 0) {
          await this.approvalService.createRequest({
            moduleType: ApprovalModuleType.DATA_EDIT,
            referenceId: id,
            requestedByUserId: userId,
            requiredLevels: [...config].sort((a, b) => a - b),
            metadata: {
              entityType: 'MENU_ITEM',
              itemName: oldItem.name,
              price: Number(oldItem.price || 0),
              payload: data,
              changes,
              fieldLabels,
            },
          });
          return { pendingApproval: true };
        }
      }
    }

    return this.menuItemRepository.manager.transaction(async (manager) => {
      try {
        const item = await manager.findOne(MenuItem, {
          where: { id },
          relations: ['productFinance'],
        });
        if (!item) throw new NotFoundException('Menu item not found');

        const oldPrice = Number(item.price);
        const newPrice =
          data.price !== undefined ? Number(data.price) : oldPrice;

        if (userName && Math.abs(newPrice - oldPrice) > 0.01) {
          await this.reportService.logAction(
            'PRICE_CHANGE',
            userName,
            `Ubah harga menu "${item.name}" dari Rp ${oldPrice.toLocaleString()} ke Rp ${newPrice.toLocaleString()}`,
          );
        }

        // Handle category
        let category = data.category;
        if (typeof data.category === 'string') {
          const catName = data.category.trim();
          let catEntity = await manager.findOne(Category, {
            where: { name: catName },
          });
          if (!catEntity) {
            catEntity = manager.create(Category, {
              name: catName,
              productionTarget: ProductionTarget.KITCHEN,
            });
            catEntity = await manager.save(catEntity);
          }
          category = catEntity;
        }

        Object.assign(item, {
          ...data,
          category: category !== undefined ? category : item.category,
          price: data.price !== undefined ? Number(data.price) : item.price,
          taxPercentage:
            data.taxPercentage !== undefined
              ? Number(data.taxPercentage)
              : item.taxPercentage,
          sku: data.sku?.trim() || item.sku,
          expiryDate:
            data.expiryDate !== undefined
              ? data.expiryDate || null
              : item.expiryDate,
          // Round stock quantities for consistent integer storage
          stockQuantity:
            data.stockQuantity !== undefined
              ? Math.round(Number(data.stockQuantity))
              : item.stockQuantity,
          minStockLevel:
            data.minStockLevel !== undefined
              ? Math.round(Number(data.minStockLevel))
              : item.minStockLevel,
        });

        // Update productFinance if provided and mapped
        if (data.productFinance) {
          const cleanFinance = this.sanitizeFinanceData(data.productFinance);
          if (item.productFinance) {
            Object.assign(item.productFinance, cleanFinance);
          } else {
            item.productFinance = manager.create(ProductFinance, {
              ...cleanFinance,
              menuItemId: item.id,
            });
          }
        }

        const saved = await manager.save(item);
        await this.inventoryService.broadcastAvailability();

        return saved;
      } catch (error) {
        console.error('UPDATE_MENU_ITEM_ERROR:', error);
        if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
          throw new BadRequestException('Nama atau SKU menu sudah terdaftar.');
        }
        throw error;
      }
    });
  }

  async deleteMenuItem(
    id: number,
  ): Promise<{ success: boolean; mode: 'hard' | 'soft'; message: string }> {
    const item = await this.menuItemRepository.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Menu item not found');

    // 1. Check if used as sub-recipe for other items
    const usedInRecipes = await this.recipeRepository.count({
      where: { subMenuItemId: id },
    });
    if (usedInRecipes > 0) {
      throw new BadRequestException(
        'Menu tidak bisa dihapus karena digunakan sebagai bahan (sub-resep) di menu lain.',
      );
    }

    // 2. Check if used in Promos (Scanning ruleJson)
    // We search for the ID in requireMenuItems array within ruleJson
    const promos = await this.promoService.getAllPromos(); // Or a more optimized query
    const usedInPromo = promos.some((p) => {
      const items = p.ruleJson?.requireMenuItems || [];
      return items.some((mi: any) => mi.id === id);
    });

    if (usedInPromo) {
      throw new BadRequestException(
        'Menu tidak bisa dihapus karena sedang digunakan dalam Promo Bundling aktif.',
      );
    }

    // 2.5 Check if used in active unpaid transactions
    const activeOrderCount = await this.orderItemRepository.count({
      where: {
        menuItemId: id,
        transaction: {
          status: In([TransactionStatus.UNPAID, TransactionStatus.PARTIAL]),
        },
      },
    });

    if (activeOrderCount > 0) {
      throw new BadRequestException(
        'Menu/Item tidak bisa dihapus karena sedang ada di pesanan (Bill/Invoice) aktif yang belum lunas. Selesaikan atau batalkan pesanan tersebut terlebih dahulu.',
      );
    }

    // 3. Check if it has order history
    const orderCount = await this.orderItemRepository.count({
      where: { menuItemId: id },
    });

    if (orderCount > 0) {
      // Soft delete: keep historical data
      const timestamp = Date.now();
      await this.menuItemRepository.update(id, {
        isActive: false,
        name: `${item.name} (DELETED-${timestamp})`,
        sku: item.sku ? `${item.sku}-DEL-${timestamp}` : undefined,
      });
      await this.menuItemRepository.softDelete(id);

      return {
        success: true,
        mode: 'soft',
        message:
          'Menu memiliki riwayat transaksi. Data diarsipkan agar laporan tetap akurat.',
      };
    } else {
      // Hard delete: clean up related data
      await this.recipeRepository.delete({ menuItemId: id });
      await this.productFinanceRepository.delete({ menuItemId: id });
      await this.menuItemRepository.delete(id);
      return {
        success: true,
        mode: 'hard',
        message: 'Menu berhasil dihapus secara permanen.',
      };
    }
  }

  async getMenuItemById(id: number): Promise<MenuItem> {
    const item = await this.menuItemRepository.findOne({
      where: { id },
      relations: [
        'category',
        'recipes',
        'recipes.ingredient',
        'recipes.subMenuItem',
        'productFinance',
      ],
    });
    if (!item) throw new NotFoundException('Menu item not found');

    // Ensure no circularity (though TypeORM shouldn't have loaded menuItem back unless stated)
    if (item.recipes) {
      item.recipes = item.recipes.map((r) => {
        const { menuItem: _mi, ...rest } = r;
        return rest as any;
      });
    }

    return item;
  }

  async updateMenuItemRecipes(
    id: number,
    recipes: {
      ingredientId?: number;
      subMenuItemId?: number;
      quantity: number;
      unit: string;
    }[],
    userId?: number,
  ) {
    await this.getMenuItemById(id);

    // Remove existing recipes
    await this.recipeRepository.delete({ menuItemId: id });

    // Add new recipes
    const newRecipes = recipes.map((r) =>
      this.recipeRepository.create({
        menuItemId: id,
        ingredientId: r.ingredientId || null,
        subMenuItemId: r.subMenuItemId || null,
        quantity: r.quantity,
        unit: r.unit,
      } as any),
    );

    await this.recipeRepository.save(newRecipes as any);

    return this.getMenuItemById(id);
  }

  private getStation(item: MenuItem): string {
    // Priority 1: Item-level explicit override (if set and not null/empty)
    const itemTarget = item.productionTarget?.trim();
    if (itemTarget) return itemTarget;

    // Priority 2: Category productionTarget (the primary routing config)
    const catTarget = item.category?.productionTarget?.trim();
    if (catTarget) return catTarget;

    // Default fallback — kitchen
    return 'KDS';
  }

  /**
   * Process a customer order
   */
  async processOrder(
    menuItems: {
      id?: number;
      promoId?: number;
      quantity: number;
      note?: string;
      customName?: string;
      priceOverride?: number;
    }[],
    tableId?: number,
    transactionId?: number,
    userId?: number,
    userName?: string,
    idempotencyKey?: string,
  ): Promise<void> {
    // ── IDEMPOTENCY: check cache ───────────────────────────────────
    if (idempotencyKey) {
      const cached = await this.redisService.getIdempotency(idempotencyKey);
      if (cached) return cached;
    }
    // ─────────────────────────────────────────────────────────────
    // --- MUTEX GUARD: Cegah double-order hit ganda dari UI ---
    // Use Redis for a robust distributed lock
    const mutexKey = `order_${userId}_${tableId || 'walkin'}_${JSON.stringify(menuItems[0]?.id)}`;
    const lockAcquired = await this.redisService.acquireLock(mutexKey, 3000); // 3 seconds lock
    if (!lockAcquired) {
      this.logger.warn(
        `Order is already being processed (Redis Lock): ${mutexKey}, skipping redundant request.`,
      );
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const stationItems: Record<string, any[]> = {};
      const savedItemIds: number[] = [];

      // 1. Resolve Transaction (Atomic context)
      let resolvedTransactionId: number | null = null;
      if (transactionId) {
        resolvedTransactionId = transactionId;
      } else if (tableId) {
        // 🛡️ FIX v2: Pisahkan pencarian billiard table vs cafe table.
        // Sebelumnya, query OR gabungan (tableId OR cafeTableId) menyebabkan
        // cafe table dengan ID yang sama (mis: cafe table 4 & billiard table 4)
        // bisa "menang" jika dibuat lebih baru (ORDER BY createdAt DESC).
        // Hasilnya: order billiard menempel ke transaksi cafe (salah table!),
        // customerName berubah jadi 'Customer', dan STANDALONE transaction terbuat.
        //
        // Solusi: Prioritaskan billiard transaction (tableId) terlebih dahulu.
        // Jika tidak ada, BARU cari cafe transaction (cafeTableId).
        let transaction = await queryRunner.manager.findOne(Transaction, {
          where: {
            tableId: tableId,
            status: In([
              TransactionStatus.UNPAID,
              TransactionStatus.PARTIAL,
              TransactionStatus.PAID,
            ]),
          },
          order: { createdAt: 'DESC' },
          relations: ['table', 'cafeTable', 'member'],
        });

        // Fallback: jika tidak ada billiard transaction, cek cafe transaction
        if (!transaction) {
          transaction = await queryRunner.manager.findOne(Transaction, {
            where: {
              cafeTableId: tableId,
              status: In([
                TransactionStatus.UNPAID,
                TransactionStatus.PARTIAL,
                TransactionStatus.PAID,
              ]),
            },
            order: { createdAt: 'DESC' },
            relations: ['table', 'cafeTable', 'member'],
          });
        }

        // 🛡️ REVISED LOGIC:
        // Only force a new transaction if the table is actually AVAILABLE.
        // If the table is IN_USE, WARNING, or WAITING_PAYMENT, it belongs to the CURRENT customer,
        // so we should attach the order to the existing active transaction.
        // Note: For PREPAID sessions, `endTime` is populated while the session is STILL RUNNING.
        if (transaction) {
          const isTableAvailable = 
            (transaction.table && transaction.table.status === 'available') || 
            (transaction.cafeTable && transaction.cafeTable.status === 'available');

          if (isTableAvailable) {
            this.logger.warn(
              `processOrder: Table ${tableId} is AVAILABLE but has an existing transaction (id: ${transaction.id}). Forcing new transaction creation to avoid billing the previous customer.`,
            );
            transaction = null;
          }
        }


        const activeDay = await this.shiftService.getOrCreateActiveBusinessDay();
        const activeShift = userId ? await this.shiftService.getActiveShift(userId) : null;

        if (!transaction) {
          // 🛡️ FIX: Ambil data table secara lengkap sebelum membuat STANDALONE
          // agar customerName dan startTime diambil dari sesi billiard yang sedang aktif
          const table = await queryRunner.manager.findOne(Table, {
            where: { id: tableId },
          });

          // Cari nama customer dari active transaction billiard yang mungkin ada
          // (misal: race condition dimana transaksi baru saja dibuat tapi belum ter-index)
          let inheritedCustomerName: string | null = null;
          let inheritedStartTime: Date | null = null;
          let inheritedMemberId: number | null = null;
          
          if (table && table.status !== 'available') {
            // Meja sedang aktif — cari transaction billiard yang mungkin ada tapi belum ter-query
            const latestBilliardTx = await queryRunner.manager.findOne(Transaction, {
              where: { tableId: tableId, status: In([TransactionStatus.UNPAID, TransactionStatus.PARTIAL]) },
              order: { createdAt: 'DESC' },
            });
            if (latestBilliardTx) {
              // Ada billiard transaction! Gunakan itu, jangan buat STANDALONE baru.
              this.logger.warn(
                `processOrder: Ditemukan billiard transaction (id: ${latestBilliardTx.id}) pada meja ${tableId} yang sebelumnya tidak ter-query. Menggunakan transaction ini.`,
              );
              transaction = latestBilliardTx;
            } else {
              // Tidak ada billiard transaction — STANDALONE memang perlu dibuat.
              // Ambil customerName dan startTime dari table entity
              inheritedCustomerName = (table as any).currentCustomerName || table?.bookedByName || null;
              inheritedStartTime = table?.startTime || null;
              inheritedMemberId = table?.memberId ?? null;
            }
          }

          if (!transaction) {
            // Buat STANDALONE sebagai last-resort fallback
            this.logger.warn(
              `processOrder: Tidak ada active transaction untuk table ${tableId} (status: ${table?.status}). Membuat STANDALONE transaction.`,
            );
            transaction = queryRunner.manager.create(Transaction, {
              invoiceNumber: `STANDALONE-${Date.now()}`,
              customerName: inheritedCustomerName || table?.bookedByName || 'Customer',
              tableId: tableId, 
              status: TransactionStatus.UNPAID,
              openedByUserId: userId ?? null,
              createdByUserId: userId ?? null,
              startTime: inheritedStartTime || new Date(), // Gunakan startTime billiard jika ada
              memberId: inheritedMemberId ?? null,
              businessDayId: activeDay.id,
              shiftId: activeShift?.id ?? null,
            });
            transaction = await queryRunner.manager.save(transaction);
          }
        }
        resolvedTransactionId = transaction.id;
      } else {
        const activeDay = await this.shiftService.getOrCreateActiveBusinessDay();
        const activeShift = userId ? await this.shiftService.getActiveShift(userId) : null;

        const walkinTransaction = queryRunner.manager.create(Transaction, {
          invoiceNumber: `TAKEAWAY-${Date.now()}`,
          customerName: 'Takeaway',
          status: TransactionStatus.UNPAID,
          type: TransactionType.CAFE,
          openedByUserId: userId ?? null,
          createdByUserId: userId ?? null,
          startTime: new Date(),
          businessDayId: activeDay.id,
          shiftId: activeShift?.id ?? null,
        });
        const savedWalkin = await queryRunner.manager.save(walkinTransaction);
        resolvedTransactionId = savedWalkin.id;
      }

      // 2.5 Membership Balance Guard (Strict enforcement)
      if (resolvedTransactionId) {
        const txn = await queryRunner.manager.findOne(Transaction, {
          where: { id: resolvedTransactionId },
          relations: ['member']
        });

        if (txn && txn.memberId && txn.member) {
          // Calculate the projected cost of new items
          let newItemsSubtotal = 0;
          for (const orderEntry of menuItems) {
            if (orderEntry.promoId) {
              const promo = await queryRunner.manager.findOne(Promo, { where: { id: orderEntry.promoId } });
              if (promo) newItemsSubtotal += Number(promo.ruleJson?.fixedPrice || 0) * orderEntry.quantity;
            } else if (orderEntry.id) {
              const menuItem = await queryRunner.manager.findOne(MenuItem, { where: { id: orderEntry.id } });
              if (menuItem) newItemsSubtotal += (orderEntry.priceOverride !== undefined ? orderEntry.priceOverride : menuItem.price) * orderEntry.quantity;
            }
          }

          // Current total debt (Table total minus what's paid)
          const currentLiability = Math.max(0, Number(txn.grandTotal || 0) - Number(txn.paidAmount || 0));

          // SC & VAT for NEW items (Projection)
          const settings = await queryRunner.manager.findOne('Setting', { where: { id: 1 } }) as any;
          const scPct = Number(settings?.serviceChargePercentage || 0) / 100;
          const vatPct = Number(settings?.ppnPercentage || 0) / 100;

          const newSc = Math.round(newItemsSubtotal * scPct);
          const newVat = Math.round((newItemsSubtotal + newSc) * vatPct);
          const newOrderTotal = newItemsSubtotal + newSc + newVat;

          if (Number(txn.member.balance) < (currentLiability + newOrderTotal)) {
            throw new BadRequestException(
              `Saldo member (Rp ${Number(txn.member.balance).toLocaleString()}) tidak mencukupi untuk pesanan ini plus bill meja berjalan (Total: Rp ${(currentLiability + newOrderTotal).toLocaleString()}).`,
            );
          }
        }
      }

      // 3. Prepare items to process (Promos/Bundles expansion)
      const itemsToProcess: {
        id: number;
        quantity: number;
        note: string;
        customName?: string;
        priceOverride?: number;
        bundleGroupId?: string;
        promoId?: number;
        isBundleHeader?: boolean;
      }[] = [];
      for (const orderEntry of menuItems) {
        if (orderEntry.promoId) {
          const promo = await queryRunner.manager.findOne(Promo, {
            where: { id: orderEntry.promoId },
          });
          if (promo) {
            const rule = promo.ruleJson || {};
            const bundlePrice = Number(rule.fixedPrice || 0);
            const staticItems = rule.requireMenuItems || [];
            const bundleGroupId = `bundle-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

            const safeParseId = (raw: any) => {
              if (typeof raw === 'string' && raw.includes('_')) return parseInt(raw.split('_')[1], 10);
              return Number(raw) || 0;
            };

            // ADD BUNDLE HEADER (Revenue/Bill placeholder)
            itemsToProcess.push({
              id: safeParseId(staticItems[0]?.id),
              quantity: orderEntry.quantity,
              note: orderEntry.note || `Bundle: ${promo.name}`,
              customName: `[PAKET] ${promo.name}`,
              priceOverride: bundlePrice,
              bundleGroupId,
              promoId: promo.id,
              isBundleHeader: true,
            });

            // ADD BUNDLE COMPONENTS (Stock/Kitchen items)
            staticItems.forEach((bi: any) => {
              itemsToProcess.push({
                id: safeParseId(bi.id),
                quantity: (bi.quantity || 1) * orderEntry.quantity,
                note: orderEntry.note || `Bundle: ${promo.name}`,
                customName: undefined,
                priceOverride: 0,
                bundleGroupId,
                promoId: promo.id,
                isBundleHeader: false,
              });
            });
          }
        } else if (orderEntry.id) {
          itemsToProcess.push({
            id: orderEntry.id,
            quantity: orderEntry.quantity,
            note: orderEntry.note || '',
            customName: orderEntry.customName,
            priceOverride: orderEntry.priceOverride,
          });
        }
      }

      // 3. Stock & Transaction persist
      // PERFORMANCE: Pre-fetch semua menu sekaligus dalam SATU query (batch)
      // daripada query satu per satu di dalam loop (N queries → 1 query)
      const allItemIds = [...new Set(itemsToProcess.map(i => i.id).filter(Boolean))];
      const fetchedMenuItems = await queryRunner.manager.find(MenuItem, {
        where: { id: In(allItemIds) },
        relations: ['category'],
      });
      const menuItemMap = new Map<number, MenuItem>(fetchedMenuItems.map(m => [m.id, m]));

      const addedItemsSummary: string[] = [];
      for (const orderItem of itemsToProcess) {
        const menuItem = menuItemMap.get(orderItem.id);
        if (!menuItem || !menuItem.isActive) {
          throw new BadRequestException(
            `Menu "${menuItem?.name || orderItem.id}" tidak tersedia.`,
          );
        }

        // Deduct stock within transaction (SKIP for bundle header to avoid double deduction)
        if (!orderItem.isBundleHeader) {
          await this.inventoryService.deductStock(
            menuItem.id,
            orderItem.quantity,
            queryRunner.manager,
          );
        }

        const station = orderItem.isBundleHeader ? 'NONE' : this.getStation(menuItem);
        const isDirectSale = station === 'NONE';
        
        let itemPrice =
          orderItem.priceOverride !== undefined
            ? orderItem.priceOverride
            : menuItem.price;
        let itemDiscountAmount = 0;

        // Apply item-level discount (Harga Coret) if active and no manual override
        if (orderItem.priceOverride === undefined && menuItem.isDiscountActive && menuItem.discountPrice !== null) {
            itemPrice = menuItem.price;
            itemDiscountAmount = menuItem.price - menuItem.discountPrice;
        }

        const item = queryRunner.manager.create(OrderItem, {
          transactionId: resolvedTransactionId,
          menuItemId: menuItem.id,
          quantity: orderItem.quantity,
          priceAtOrder: itemPrice,
          discountAmount: itemDiscountAmount,
          status: isDirectSale ? OrderItemStatus.DONE : OrderItemStatus.QUEUED,
          note: orderItem.note,
          customName: orderItem.customName,
          bundleGroupId: orderItem.bundleGroupId,
          station: isDirectSale ? undefined : station,
          createdByUserId: userId,
          completedAt: isDirectSale ? new Date() : null,
        } as any);
        const saved = await queryRunner.manager.save(item);
        savedItemIds.push(saved.id);

        if (!isDirectSale) {
          if (!stationItems[station]) stationItems[station] = [];
          stationItems[station].push({
            id: saved.id,
            name: menuItem.name,
            quantity: orderItem.quantity,
            note: orderItem.note,
            station,
          });
        }
        addedItemsSummary.push(`${orderItem.quantity}x ${menuItem.name}`);
      }

      await queryRunner.commitTransaction();

      // 4. Update Totals (Outside Transaction for performance/broadcast)
      if (resolvedTransactionId) {
        const updatedTx = await this.transactionService.updateTotals(
          resolvedTransactionId,
        );

        // PERFORMANCE: Gunakan data yang sudah ada di memory daripada query ulang ke DB
        // tableName dan resolvedTableId di-derive dari data transaksi yang sudah di-resolve sebelumnya
        let tableName: string | undefined;
        let resolvedTableId: number | undefined = tableId;
        try {
          // Coba ambil dari Redis cache dulu (transaction.service sudah cache ini)
          const cachedTx = await this.redisService.get(`bill_preview_${tableId}`) as any;
          if (cachedTx?.cafeTable?.tableName) {
            tableName = cachedTx.cafeTable.tableName;
            resolvedTableId = cachedTx.cafeTable.id;
          } else if (cachedTx?.table?.tableName) {
            tableName = cachedTx.table.tableName;
            resolvedTableId = cachedTx.table.id;
          } else if (tableId) {
            // Fallback: simple lookup tanpa JOIN besar
            const tbl = await this.dataSource.manager.findOne('CafeTable', { where: { id: tableId } }) as any
              ?? await this.dataSource.manager.findOne('Table', { where: { id: tableId } }) as any;
            tableName = tbl?.tableName || `Meja ${tableId}`;
            resolvedTableId = tableId;
          } else {
            tableName = 'Takeaway';
          }
        } catch (e) {
          this.logger.warn(`Could not resolve tableName for TRX-${resolvedTransactionId}: ${e.message}`);
          tableName = tableId ? `Meja ${tableId}` : 'Takeaway';
        }

        // --- AI SALES ORCHESTRATOR: Real-time progress tracking & Combo Suggestions ---
        if (updatedTx?.businessDayId) {
          for (const item of itemsToProcess) {
            // Update Sold Quantities for Progress Tracking
            this.aiService
              .updateSoldQuantities(
                item.id,
                updatedTx.businessDayId,
                item.quantity,
                resolvedTransactionId,
                tableId,
                undefined,
                userId,
                item.promoId,
              )
              .catch((err) =>
                this.logger.error(`AI Tracking Error: ${err.message}`),
              );

            // Phase 10: AI Combo Suggestion Trigger
            this.aiService
              .getComboSuggestion(item.id)
              .then((suggestion) => {
                if (suggestion) {
                  this.eventsGateway.battlePlanUpdated({
                    type: 'COMBO_SUGGESTION',
                    message: `💡 TIP: Pelanggan menu ini biasanya juga memesan ${suggestion.name}!`,
                    tableName: tableName || 'Meja',
                    menuItemName: suggestion.name,
                    confidence: Math.round(suggestion.confidence * 100),
                  });
                }
              })
              .catch((err) =>
                this.logger.error(`AI Combo Suggestion Error: ${err.message}`),
              );
          }
        }

        // KDS/BDS Notification
        for (const [station, items] of Object.entries(stationItems)) {
          this.kdsGateway.sendNewOrder({
            station,
            items,
            tableId: resolvedTableId,
            tableName,
            orderId: `TRX-${resolvedTransactionId}`,
          });
        }
        // ── AUDIT LOG: Tambah Menu ────────────────────────────────────
        if (userName && addedItemsSummary.length > 0) {
          try {
            const details = `Menambahkan ${addedItemsSummary.join(', ')} ke ${tableName || 'Order'}`;
            await this.reportService.logAction(
              'ADD_MENU',
              userName,
              details,
              resolvedTableId || tableId,
            );
          } catch (e) {
            this.logger.warn(`Failed to log ADD_MENU audit: ${e.message}`);
          }
        }

        await this.broadcastTableUpdateByTransactionId(resolvedTransactionId);

        // --- DYNAMIC PRINTER ROUTING ---
        if (resolvedTableId) {
          this.routeOrderToPrinters(
            stationItems,
            resolvedTableId,
            tableName,
            userName,
          ).catch((err) => this.logger.error('Printing route error:', err));
        }
      }

      if (idempotencyKey) {
        await this.redisService.setIdempotency(idempotencyKey, {
          success: true,
        });
      }
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
      await this.redisService.releaseLock(mutexKey);
    }
  }

  /**
   * Dispatches order items to their respective production printers based on floor and zone.
   */
  private async routeOrderToPrinters(
    stationItems: Record<string, any[]>,
    tableId: number,
    tableName: string | undefined,
    userName: string | undefined,
  ) {
    try {
      const table = await this.dailySummaryRepository.manager.findOne(Table, {
        where: { id: tableId },
      });
      if (!table) return;

      for (const [station, items] of Object.entries(stationItems)) {
        if (items.length === 0) continue;

        // Map station string (KDS/BDS) to PrinterType
        const printerType =
          station === 'KDS' ? PrinterType.KITCHEN : PrinterType.BARTENDER;

        const printer = await this.printerService.getPrinterForRouting(
          table,
          printerType,
        );

        const chitData = {
          tableName: tableName || table.tableName || `Meja ${tableId}`,
          customerName: table.bookedByName || 'Guest',
          orderTime: new Date(),
          waiterName: userName || 'System',
          items: items.map((i) => ({
            name: i.name || 'Unknown Item',
            quantity: i.quantity,
            note: i.note,
          })),
        };

        const chitPayload = await this.invoiceService.generateKitchenChit(
          chitData,
          station === 'KDS' ? 'DAPUR' : 'BAR',
        );

        let printSuccess = false;
        if (printer && printer.isOnline) {
          printSuccess = await this.hardwareService.printRaw(
            printer.ipAddress,
            printer.port,
            chitPayload,
          );
        }

        // FAIL-SAFE: If station printer is offline or failed, route to CASHIER printer
        if (!printSuccess) {
          this.logger.warn(
            `Printer for ${station} is offline or not found. Routing to Cashier fallback.`,
          );
          const printers = await this.printerService.findAll();
          const cashierPrinter = printers.find(
            (p) => p.type === PrinterType.CASHIER && p.isOnline,
          );

          if (cashierPrinter) {
            const warningHeader =
              '\x1B\x45\x01!!! PRINTER ' +
              (station === 'KDS' ? 'DAPUR' : 'BAR') +
              ' OFFLINE !!!\x1B\x45\x00\n';
            await this.hardwareService.printRaw(
              cashierPrinter.ipAddress,
              cashierPrinter.port,
              warningHeader + chitPayload,
            );
          } else {
            this.logger.error('No online Cashier printer found for fallback.');
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in routeOrderToPrinters:', error);
    }
  }

  /**
   * Get all active orders (QUEUED/PROCESSING) for KDS regeneration
   */
  async getActiveOrders() {
    // Fetch all items that are not DONE or CANCELLED
    const items = await this.orderItemRepository.find({
      where: [
        { status: OrderItemStatus.QUEUED },
        { status: OrderItemStatus.PROCESSING },
        { status: OrderItemStatus.CANCEL_REQUESTED },
        { status: OrderItemStatus.CANCEL_REJECTED },
      ],
      relations: [
        'menuItem',
        'menuItem.category',
        'transaction',
        'transaction.table',
        'transaction.cafeTable',
      ],
      order: { createdAt: 'DESC' },
    });

    // Group by Transaction (Order Ticket)
    const grouped = items.reduce(
      (acc: Record<string, any>, item) => {
        const key = item.transactionId;
        if (!acc[key]) {
          const tableId = item.transaction?.tableId;
          const cafeTable = item.transaction?.cafeTable;
          let tableName: string | undefined;
          if (cafeTable) {
            tableName = cafeTable.tableName;
          } else if (item.transaction?.table?.tableName) {
            tableName = item.transaction.table.tableName;
          } else if (tableId) {
            tableName = `Meja ${tableId}`;
          }
          acc[key] = {
            orderId: `TRX-${item.transactionId}`,
            tableId,
            tableName,
            customerName: item.transaction?.customerName || 'Guest',
            timestamp: item.createdAt,
            items: [],
            status: 'PENDING',
          };
        }

        // Determine station (use persisted station first, fallback to calculation)
        const station = item.station || this.getStation(item.menuItem);

        acc[key].items.push({
          id: item.id,
          name: item.menuItem?.name || item.customName || 'Unknown Item',
          quantity: item.quantity,
          status: item.status,
          category: item.menuItem?.category,
          note: item.note,
          station,
        });

        return acc;
      },
      {} as Record<string, any>,
    );

    // Process into KDS/BDS ready format
    const orders = Object.values(grouped).map((order: any) => {
      // determine aggregate status
      const hasCooking = order.items.some(
        (i: any) =>
          i.status === OrderItemStatus.PROCESSING ||
          i.status === OrderItemStatus.CANCEL_REQUESTED ||
          i.status === OrderItemStatus.CANCEL_REJECTED,
      );
      order.status = hasCooking ? 'COOKING' : 'PENDING';
      return order;
    });

    return orders;
  }

  async getCompletedOrders(limit: number = 50) {
    // Fetch recently completed items
    const items = await this.orderItemRepository.find({
      where: { status: OrderItemStatus.DONE },
      relations: [
        'menuItem',
        'menuItem.category',
        'transaction',
        'transaction.table',
        'transaction.cafeTable',
      ],
      order: { updatedAt: 'DESC' },
      take: limit,
    });

    // Group by Transaction
    const grouped = items.reduce(
      (acc: Record<string, any>, item) => {
        const key = item.transactionId;
        if (!acc[key]) {
          const tableId = item.transaction?.tableId;
          const cafeTable = item.transaction?.cafeTable;
          const billiardTable = item.transaction?.table;

          let tableName: string | undefined;
          if (cafeTable) {
            tableName = `C-${cafeTable.tableName}`;
          } else if (billiardTable) {
            tableName = billiardTable.tableName || `M-${tableId}`;
          } else if (tableId) {
            tableName = `M-${tableId}`;
          }

          acc[key] = {
            orderId: `TRX-${item.transactionId}`,
            tableId,
            tableName,
            customerName: item.transaction?.customerName || 'Guest',
            timestamp: item.updatedAt,
            items: [],
            status: 'SERVED',
          };
        }

        const station = item.station || this.getStation(item.menuItem);

        acc[key].items.push({
          id: item.id,
          name: item.menuItem?.name || item.customName || 'Unknown Item',
          quantity: item.quantity,
          status: item.status,
          category: item.menuItem?.category,
          note: item.note,
          station,
        });

        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(grouped);
  }

  async updateOrderItemStatus(
    id: number,
    status: OrderItemStatus,
    userId?: number,
    userName?: string,
  ): Promise<OrderItem | undefined> {
    const lockKey = `item_update_${id}`;
    const acquired = await this.redisService.acquireLock(lockKey, 3000);
    if (!acquired) {
      this.logger.warn(
        `Item ${id} is already being updated (Redis Lock), skipping.`,
      );
      return;
    }

    try {
      const result = await this.menuItemRepository.manager.transaction(
        async (manager) => {
          const item = await manager.findOne(OrderItem, {
            where: { id },
            relations: ['menuItem', 'transaction'],
          });
          if (!item) throw new NotFoundException('Order item not found');

          const oldStatus = item.status;

          // 1. Prevent updates if item is already DONE or CANCELLED
          if (
            oldStatus === OrderItemStatus.DONE ||
            oldStatus === OrderItemStatus.CANCELLED
          ) {
            return item;
          }

          // 2. Prevent kitchen/bar from marking as DONE if cancellation pending
          const isResolvingCancel = [
            OrderItemStatus.CANCELLED,
            OrderItemStatus.CANCEL_REJECTED,
          ].includes(status);
          if (
            oldStatus === OrderItemStatus.CANCEL_REQUESTED &&
            !isResolvingCancel
          ) {
            throw new BadRequestException(
              `Gagal: Item sedang dalam permintaan pembatalan.`,
            );
          }

          item.status = status;
          const saved = await manager.save(OrderItem, item);

          // Audit Log: Status Change
          if (userName && oldStatus !== status) {
            await this.reportService.logAction(
              'ORDER_STATUS_CHANGE',
              userName,
              `Ubah status "${item.menuItem?.name || 'Item'}" dari ${oldStatus} ke ${status}`,
              item.transaction?.tableId || undefined,
              item.transaction?.invoiceNumber,
            );
          }

          // If status changed to CANCELLED, return stock (Atomic)
          if (status === OrderItemStatus.CANCELLED) {
            await this.inventoryService.returnStock(
              item.menuItemId,
              item.quantity,
              manager,
            );
            // ... log action logic ...
          }

          if (status === OrderItemStatus.DONE) {
            if (userId) item.completedByUserId = userId;
            item.completedAt = new Date();
            await manager.save(OrderItem, item);
            const station = item.station || this.getStation(item.menuItem);
            await this.updateDailySummary(
              station,
              item.menuItem?.name || 'Unknown',
              item.quantity,
            );
          }

          return saved;
        },
      );

      if (result) {
        // Invalidate transaction cache so getTableById fetches fresh order items
        if (result.transaction?.tableId) {
          const tableId = result.transaction.tableId;
          await this.redisService.del(`bill_preview_${tableId}`).catch(() => {});
          await this.redisService.del(`bill_preview_${tableId}_light`).catch(() => {});
        }
        if ((result.transaction as any)?.cafeTableId) {
          const cafeTableId = (result.transaction as any).cafeTableId;
          await this.redisService.del(`bill_preview_cafe_${cafeTableId}`).catch(() => {});
          await this.redisService.del(`bill_preview_cafe_${cafeTableId}_light`).catch(() => {});
          await this.redisService.del('cafe_all_tables').catch(() => {});
        }
        await this.redisService.del('billiard_all_tables').catch(() => {});

        // Broadcast outside transaction so getTableById reads the committed data
        this.broadcastStatusChange(
          result,
          result.station || this.getStation(result.menuItem),
        );
      }

      return result;
    } finally {
      await this.redisService.releaseLock(lockKey);
    }
  }

  private async broadcastStatusChange(item: OrderItem, station: string) {
    const updatePayload = {
      id: item.id,
      status: item.status,
      transactionId: item.transactionId || item.transaction?.id,
      station,
    };
    // Broadcast via both Socket.IO and MQTT WebSocket
    this.kdsGateway.broadcastOrderItemUpdated(updatePayload);
    this.billiardGateway.broadcastOrderItemUpdate(updatePayload);
  }

  private async updateDailySummary(
    station: string,
    itemName: string,
    quantity: number,
  ) {
    const today = new Date().toISOString().split('T')[0];
    let summary = await this.dailySummaryRepository.findOne({
      where: { date: today, station },
    });

    if (!summary) {
      summary = this.dailySummaryRepository.create({
        date: today,
        station,
        totalItems: 0,
        itemsJson: JSON.stringify({}),
      });
    }

    const items = JSON.parse(summary.itemsJson || '{}');
    const qty = Number(quantity) || 0;
    items[itemName] = (items[itemName] || 0) + qty;

    summary.totalItems = Number(summary.totalItems || 0) + qty;
    summary.itemsJson = JSON.stringify(items);

    await this.dailySummaryRepository.save(summary);
  }

  async getDailyStationSummary(station: string) {
    const today = new Date().toISOString().split('T')[0];
    return this.dailySummaryRepository.findOne({
      where: { date: today, station },
    });
  }

  /**
   * Cancel an order item
   */
  async cancelOrderItem(
    id: number,
    reason: string,
    user: string,
    managerPin?: string,
  ): Promise<void> {
    const item = await this.orderItemRepository.findOne({
      where: { id },
      relations: [
        'menuItem',
        'transaction',
        'transaction.table',
        'transaction.cafeTable',
      ],
    });
    if (!item) throw new NotFoundException('Order item not found');

    const s = item.status?.toUpperCase() || OrderItemStatus.QUEUED;
    if (s === OrderItemStatus.CANCELLED) return;
    // GHOST VOID PROTECTION: Manager PIN required for items sent to kitchen or already done
    const isProcessing = ['QUEUED', 'PROCESSING', 'COOKING', 'CANCEL_REJECTED', 'DONE', 'SERVED', 'COMPLETED'].includes(s);
    let managerName = user;

    if (isProcessing) {
      if (!managerPin) {
        throw new BadRequestException('Otorisasi ditolak. Pembatalan item dapur memerlukan PIN Supervisor/Manajer.');
      }
      
      const userRepository = this.dataSource.getRepository('User');
      const manager = await userRepository.findOne({
        where: { pin: managerPin },
        relations: ['role'],
      });
      
      if (!manager) {
        throw new BadRequestException('Otorisasi ditolak. PIN Manajer tidak valid.');
      }
      
      const role = manager.role?.name?.toUpperCase() || '';
      const allowedRoles = ['MANAGER', 'SUPERVISOR', 'ADMIN', 'OWNER', 'SUPERADMIN'];
      if (!allowedRoles.includes(role)) {
        throw new BadRequestException(`Otorisasi ditolak. Jabatan ${role} tidak diizinkan membatalkan pesanan dapur.`);
      }
      
      managerName = manager.name;
    }

    // Restore Flow: All cancellations (even QUEUED) must request permission
    // This ensures the Kitchen (KDS) sees the request.
    item.status = OrderItemStatus.CANCEL_REQUESTED;
    item.cancelledBy = managerName;
    item.cancelReason = reason;
    await this.orderItemRepository.save(item);

    // Audit Log: Capture the request and the reason
    await this.reportService.logAction(
      'CANCEL_REQUESTED',
      managerName,
      `Minta pembatalan pesanan "${item.menuItem?.name || 'Unknown'}" (x${item.quantity}) dengan alasan: "${reason}" (Oleh: ${user})`,
      item.transaction?.tableId ?? undefined,
      item.transaction?.invoiceNumber,
    );

    // Notify KDS/BDS about the request
    const targetStation = item.station?.toUpperCase() || 'KDS';
    console.log(
      `BROADCASTING CANCEL_REQUEST for ${item.menuItem?.name} (Target Station: ${targetStation})`,
    );

    this.kdsGateway.sendCancellationRequest({
      id: item.id,
      orderId: `TRX-${item.transactionId}`,
      station: targetStation,
      itemName: item.menuItem?.name || 'Unknown',
      tableName:
        item.transaction?.table?.tableName ||
        item.transaction?.cafeTable?.tableName ||
        'Takeaway',
      reason,
      user,
    });

    this.eventEmitter.emit('order.cancel_requested', {
      item,
      reason,
      user,
    });

    // Trigger real-time calculation & broadcast
    // Price drops immediately because TransactionService excludes CANCEL_REQUESTED
    if (item.transactionId) {
      await this.transactionService.updateTotals(item.transactionId);
      await this.broadcastTableUpdateByTransactionId(item.transactionId);
    }

    // Log the request
    await this.reportService.logAction(
      'CANCEL_REQUEST',
      user,
      `${item.menuItem?.name || 'Unknown'} x${item.quantity} — Reason: ${reason}`,
      item.transaction?.tableId ?? undefined,
    );
  }

  /**
   * Confirm a cancellation from the kitchen/bar
   */
  async confirmCancelOrderItem(id: number, user: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const item = await queryRunner.manager.findOne(OrderItem, {
        where: { id },
        relations: [
          'menuItem',
          'transaction',
          'transaction.table',
          'transaction.cafeTable',
        ],
      });
      if (!item) throw new NotFoundException('Order item not found');

      if (item.status !== OrderItemStatus.CANCEL_REQUESTED) {
        throw new BadRequestException(
          `Gagal: Status item saat ini adalah ${item.status}, bukan CANCEL_REQUESTED.`,
        );
      }

      item.status = OrderItemStatus.CANCELLED;
      item.cancelledAt = new Date();
      await queryRunner.manager.save(OrderItem, item);

      // Return stock within transaction
      await this.inventoryService.returnStock(
        item.menuItemId,
        item.quantity,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();

      // Notify KDS/BDS to remove
      this.kdsGateway.sendItemCancelled({
        id: item.id,
        orderId: `TRX-${item.transactionId}`,
        station: item.station || 'KDS',
        itemName: item.menuItem?.name,
        tableName:
          item.transaction?.table?.tableName ||
          item.transaction?.cafeTable?.tableName ||
          'Takeaway',
      });

      // Broadcast table update for Dashboard/Customer UI
      await this.broadcastTableUpdateByTransactionId(item.transactionId);

      // Update transaction totals (uses manager or repo)
      await this.transactionService.updateTotals(item.transactionId);

      // Log
      await this.reportService.logAction(
        'CANCEL_CONFIRMED',
        user,
        `Konfirmasi pembatalan pesanan "${item.menuItem?.name || 'Unknown'}" (x${item.quantity}). Alasan awal: "${item.cancelReason || 'Tidak ada'}"`,
        item.transaction?.tableId ?? undefined,
        item.transaction?.invoiceNumber,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reject a cancellation request
   */
  async rejectCancelOrderItem(id: number, user: string): Promise<void> {
    const item = await this.orderItemRepository.findOne({
      where: { id },
      relations: ['menuItem', 'transaction'],
    });
    if (!item) throw new NotFoundException('Order item not found');

    if (item.status !== OrderItemStatus.CANCEL_REQUESTED) {
      throw new BadRequestException(
        `Gagal menolak: Status item saat ini adalah ${item.status}, bukan CANCEL_REQUESTED.`,
      );
    }

    item.status = OrderItemStatus.CANCEL_REJECTED;
    await this.orderItemRepository.save(item);

    // Notify Table/Frontdesk
    this.kdsGateway.sendCancellationRejected({
      id: item.id,
      message: 'Pesanan Diproses, Tak dapat batal',
      transactionId: item.transactionId,
    });

    // Broadcast status update to KDS via MQTT + Socket.IO
    this.kdsGateway.broadcastOrderItemUpdated({
      id: item.id,
      status: item.status,
      transactionId: item.transactionId,
      station: item.station || 'KDS',
    });
    this.billiardGateway.broadcastOrderItemUpdate({
      id: item.id,
      status: item.status,
      transactionId: item.transactionId,
      station: item.station || 'KDS',
    });

    // Broadcast table update for Dashboard/Customer UI
    try {
      if (item.transaction?.tableId) {
        await this.redisService.del(`bill_preview_${item.transaction.tableId}`).catch(() => {});
        await this.redisService.del('billiard_all_tables').catch(() => {});
      }
      if ((item.transaction as any)?.cafeTableId) {
        const cafeTableId = (item.transaction as any).cafeTableId;
        await this.redisService.del(`bill_preview_cafe_${cafeTableId}`).catch(() => {});
        await this.redisService.del('cafe_all_tables').catch(() => {});
      }
      await this.broadcastTableUpdateByTransactionId(item.transactionId);
    } catch (err) {
      console.error('Failed to broadcast table update after rejection:', err);
    }

    // Log
    await this.reportService.logAction(
      'CANCEL_REJECTED',
      `Chef/Admin: ${user}`,
      `Cancellation rejected for ${item.menuItem?.name || 'Unknown'} x${item.quantity}`,
      item.transaction?.tableId ?? undefined,
    );
  }

  /**
   * Helper to broadcast table updates with full relations
   */
  private async broadcastTableUpdateByTransactionId(transactionId: number) {
    const fullTransaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: [
        'orderItems',
        'orderItems.menuItem',
        'orderItems.menuItem.category',
        'table',
        'cafeTable',
        'member',
        'member.tier',
      ],
    });

    if (!fullTransaction) return;

    if (fullTransaction.tableId) {
      await this.redisService.del(`bill_preview_${fullTransaction.tableId}`).catch(() => {});
      const table = await this.billiardService.getTableById(
        fullTransaction.tableId,
      );
      if (table) {
        // Standardize with BilliardService helper
        await this.billiardService.attachTransactionData(table);
        this.billiardGateway.broadcastTableUpdate(table);
      }
    } else if ((fullTransaction as any).cafeTableId) {
      const cafeTable = await this.cafeTableRepository.findOne({
        where: { id: (fullTransaction as any).cafeTableId },
      });
      if (cafeTable) {
        // 🛡️ FIX: Explicitly include customerName so it's not lost when orders are added by different users.
        // cafeTable entity may not have customerName field directly — it lives in the transaction.
        this.billiardGateway.broadcastTableUpdate({
          ...cafeTable,
          type: 'cafe',
          activeTransaction: fullTransaction,
          grandTotal: Number(fullTransaction.grandTotal || 0),
          customerName: fullTransaction.customerName || (cafeTable as any).currentCustomer || null,
          currentCustomer: fullTransaction.customerName || (cafeTable as any).currentCustomer || null,
        });
      }
    }
  }
}
