import { Injectable, NotFoundException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from './entities/menu-item.entity';
import { Category, ProductionTarget } from './entities/category.entity';
import { OrderItem, OrderItemStatus } from './entities/order-item.entity';
import { DailyOrderSummary } from './entities/daily-order-summary.entity';
import { InventoryService } from '../inventory/inventory.service';
import { KdsGateway } from '../kds/kds/kds.gateway';
import { TransactionService } from '../transaction/transaction.service';
import { BilliardGateway } from '../socket/billiard.gateway';
import type { BilliardService } from '../billiard/billiard.service';
import { PromoService } from '../promo/promo.service';
import { ReportService } from '../report/report.service';
import { ShiftService } from '../finance/shift.service';


import { Recipe } from '../inventory/entities/recipe.entity';
import { Transaction } from '../transaction/entities/transaction.entity';

import { CafeTable } from '../cafe-table/entities/cafe-table.entity';

@Injectable()
export class CafeService {
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
        private readonly inventoryService: InventoryService,
        private readonly kdsGateway: KdsGateway,
        private readonly transactionService: TransactionService,
        private readonly billiardGateway: BilliardGateway,
        @Inject(forwardRef(() => { const { BilliardService } = require('../billiard/billiard.service'); return BilliardService; }))
        private readonly billiardService: BilliardService,
        private readonly promoService: PromoService,
        private readonly reportService: ReportService,
        private readonly shiftService: ShiftService,
    ) { }


    async getAllMenuItems(includeInactive = false): Promise<MenuItem[]> {
        const items = await this.menuItemRepository.find({
            where: includeInactive ? {} : { isActive: true },
            relations: ['category', 'recipes', 'recipes.ingredient', 'recipes.subMenuItem'],
            order: { createdAt: 'DESC' },
        });

        return items.map(item => {
            if (item.recipes) {
                item.recipes = item.recipes.map(r => {
                    const { menuItem: _mi, ...rest } = r;
                    return rest as any;
                });
            }
            return item;
        });
    }

    async findAllCategories(): Promise<Category[]> {
        return this.categoryRepository.find({
            order: { name: 'ASC' }
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
        if (existing) throw new BadRequestException(`Kategori "${name}" sudah ada.`);

        const category = this.categoryRepository.create({
            ...data,
            name: name
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
            if (existing && existing.id !== id) throw new BadRequestException(`Kategori "${name}" sudah ada.`);
            category.name = name;
        }

        if (data.productionTarget) category.productionTarget = data.productionTarget;
        if (data.isActive !== undefined) category.isActive = data.isActive;

        return await this.categoryRepository.save(category);
    }

    async deleteCategory(id: number): Promise<void> {
        const itemsCount = await this.menuItemRepository.count({ where: { categoryId: id } });
        if (itemsCount > 0) throw new BadRequestException('Kategori tidak bisa dihapus karena masih digunakan oleh beberapa menu.');

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

    async createMenuItem(data: any): Promise<MenuItem> {
        try {
            let sku = data.sku?.trim();
            if (!sku) {
                sku = await this.getNextSKU();
            }

            // Handle category if passed as a string (for seeder/older code)
            let category = data.category;
            if (typeof data.category === 'string') {
                const catName = data.category.trim();
                let catEntity = await this.categoryRepository
                    .createQueryBuilder('cat')
                    .where('LOWER(cat.name) = LOWER(:catName)', { catName })
                    .getOne();
                if (!catEntity) {
                    // Auto-create category if it doesn't exist (helpful for seeder)
                    catEntity = this.categoryRepository.create({
                        name: catName,
                        productionTarget: ProductionTarget.KITCHEN
                    });
                    catEntity = await this.categoryRepository.save(catEntity);
                }
                category = catEntity;
            }

            const item = this.menuItemRepository.create({
                ...data,
                category,
                price: Number(data.price || 0),
                taxPercentage: Number(data.taxPercentage || 0),
                sku: sku,
                // Sanitize date: MySQL DATE column rejects empty string
                expiryDate: data.expiryDate || null,
            });
            const saved = await this.menuItemRepository.save(item);
            return saved as unknown as MenuItem;
        } catch (error) {
            console.error('CREATE_MENU_ITEM_ERROR:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new BadRequestException('Nama atau SKU menu sudah terdaftar.');
            }
            throw error;
        }
    }

    async updateMenuItem(id: number, data: any, userName?: string): Promise<MenuItem> {
        try {
            const item = await this.menuItemRepository.findOne({ where: { id } });
            if (!item) throw new NotFoundException('Menu item not found');

            const oldPrice = Number(item.price);
            const newPrice = data.price !== undefined ? Number(data.price) : oldPrice;

            if (userName && newPrice !== oldPrice) {
                await this.reportService.logAction(
                    'PRICE_CHANGE',
                    userName,
                    `Ubah harga menu "${item.name}" dari Rp ${oldPrice.toLocaleString()} ke Rp ${newPrice.toLocaleString()}`
                );
            }

            // Handle category if passed as a string
            let category = data.category;
            if (typeof data.category === 'string') {
                const catName = data.category.trim();
                let catEntity = await this.categoryRepository
                    .createQueryBuilder('cat')
                    .where('LOWER(cat.name) = LOWER(:catName)', { catName })
                    .getOne();
                if (!catEntity) {
                    catEntity = this.categoryRepository.create({
                        name: catName,
                        productionTarget: ProductionTarget.KITCHEN
                    });
                    catEntity = await this.categoryRepository.save(catEntity);
                }
                category = catEntity;
            }

            Object.assign(item, {
                ...data,
                category: category !== undefined ? category : item.category,
                price: data.price !== undefined ? Number(data.price) : item.price,
                taxPercentage: data.taxPercentage !== undefined ? Number(data.taxPercentage) : item.taxPercentage,
                sku: data.sku?.trim() || item.sku,
                // Sanitize date: MySQL DATE column rejects empty string
                expiryDate: data.expiryDate !== undefined ? (data.expiryDate || null) : item.expiryDate,
            });

            return await this.menuItemRepository.save(item);
        } catch (error) {
            console.error('UPDATE_MENU_ITEM_ERROR:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new BadRequestException('Nama atau SKU menu sudah terdaftar.');
            }
            throw error;
        }
    }

    async deleteMenuItem(id: number): Promise<void> {
        // 1. Check if used as sub-recipe for other items
        const usedInRecipes = await this.recipeRepository.count({ where: { subMenuItemId: id } });
        if (usedInRecipes > 0) {
            throw new Error('Menu tidak bisa dihapus karena digunakan sebagai bahan (sub-resep) di menu lain.');
        }

        // 2. Check if it has order history
        const orderCount = await this.orderItemRepository.count({ where: { menuItemId: id } });

        if (orderCount > 0) {
            // Soft delete: keep historical data by just making it inactive
            await this.menuItemRepository.update(id, { isActive: false });
        } else {
            // Hard delete: clean up recipes and remove the item
            await this.recipeRepository.delete({ menuItemId: id });
            const result = await this.menuItemRepository.delete(id);
            if (result.affected === 0) throw new NotFoundException('Menu item not found');
        }
    }

    async getMenuItemById(id: number): Promise<MenuItem> {
        const item = await this.menuItemRepository.findOne({
            where: { id },
            relations: ['category', 'recipes', 'recipes.ingredient', 'recipes.subMenuItem']
        });
        if (!item) throw new NotFoundException('Menu item not found');

        // Ensure no circularity (though TypeORM shouldn't have loaded menuItem back unless stated)
        if (item.recipes) {
            item.recipes = item.recipes.map(r => {
                const { menuItem: _mi, ...rest } = r;
                return rest as any;
            });
        }

        return item;
    }

    async updateMenuItemRecipes(id: number, recipes: { ingredientId?: number; subMenuItemId?: number; quantity: number; unit: string }[]) {
        await this.getMenuItemById(id);

        // Remove existing recipes
        await this.recipeRepository.delete({ menuItemId: id });

        // Add new recipes
        const newRecipes = recipes.map(r => this.recipeRepository.create({
            menuItemId: id,
            ingredientId: r.ingredientId || null,
            subMenuItemId: r.subMenuItemId || null,
            quantity: r.quantity,
            unit: r.unit
        } as any));

        await this.recipeRepository.save(newRecipes as any);

        return this.getMenuItemById(id);
    }

    private getStation(item: MenuItem): ProductionTarget {
        // Preference 1: Override on MenuItem level
        if (item.productionTarget) return item.productionTarget;

        // Preference 2: Category setting
        if (item.category?.productionTarget) return item.category.productionTarget;

        // Default fallback (KITCHEN)
        return ProductionTarget.KITCHEN;
    }

    /**
     * Process a customer order
     */
    async processOrder(
        menuItems: { id?: number; promoId?: number; quantity: number; note?: string; customName?: string; priceOverride?: number }[],
        tableId?: number,
        transactionId?: number,
        userId?: number,
        userName?: string,
    ): Promise<void> {
        const savedItemIds: number[] = [];
        const kdsItems = [];
        const bdsItems = [];

        // Always create/find a transaction so all orders (even walk-in) are persisted to DB
        let resolvedTransactionId: number | null = null;
        if (transactionId) {
            // Direct transaction reference (e.g., cafe-only table order)
            resolvedTransactionId = transactionId;
        } else if (tableId) {
            // Table order: get existing active transaction or create one
            let transaction = await this.transactionService.getActiveTransactionByTable(tableId);

            // If no billiard transaction, check for active cafe table transaction
            if (!transaction) {
                transaction = await this.transactionService.getActiveTransactionByCafeTable(tableId);
            }

            if (!transaction) {
                // If no billiard transaction, try to use it as cafe table
                transaction = await this.transactionService.createTransaction(undefined, userId, tableId);
            }
            resolvedTransactionId = transaction.id;
        } else {
            // Walk-in / Takeaway order: create a standalone cafe transaction (no table)
            const walkinTransaction = await this.transactionService.createTransaction(undefined, userId);
            await this.transactionService.updateTransaction(walkinTransaction.id, { customerName: 'Takeaway' });
            resolvedTransactionId = walkinTransaction.id;
        }

        const itemsToProcess: { id: number; quantity: number; note: string; customName?: string; priceOverride?: number; bundleGroupId?: string }[] = [];

        for (const orderEntry of menuItems) {
            if (orderEntry.promoId) {
                const promos = await this.promoService.getActivePromos();
                const promo = promos.find(p => p.id === orderEntry.promoId);

                if (promo) {
                    const rule = promo.ruleJson || {};
                    const bundlePrice = Number(rule.fixedPrice || 0);
                    const staticItems = rule.requireMenuItems || [];
                    const bestSellerCount = rule.bestSellerCount || 0;

                    // Generate a unique ID for this specific bundle instance
                    const bundleGroupId = `bundle-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

                    // Fetch current best sellers if rule requires them
                    let resolvedItems = [...staticItems];
                    if (bestSellerCount > 0) {
                        const bestSellers = await this.reportService.getBestSellers(bestSellerCount);
                        resolvedItems = [
                            ...resolvedItems,
                            ...bestSellers.map(bs => ({ id: bs.id, quantity: 1, name: bs.name }))
                        ];
                    }

                    // Add items from bundle
                    resolvedItems.forEach((bi: any, index: number) => {
                        itemsToProcess.push({
                            id: bi.id,
                            quantity: bi.quantity * orderEntry.quantity,
                            note: orderEntry.note || `Bundle: ${promo.name}`,
                            customName: index === 0 ? `[PAKET] ${promo.name}` : undefined,
                            // First item in bundle carries the fixed price, others 0
                            priceOverride: index === 0 ? bundlePrice : 0,
                            bundleGroupId
                        });
                    });
                }

            } else if (orderEntry.id) {
                itemsToProcess.push({
                    id: orderEntry.id || 0,
                    quantity: orderEntry.quantity,
                    note: orderEntry.note || '',
                    customName: orderEntry.customName,
                    priceOverride: orderEntry.priceOverride
                });
            }
        }

        for (const orderItem of itemsToProcess) {
            const menuItem = await this.getMenuItemById(orderItem.id);

            // Deduct stock for this menu item (recursive)
            await this.inventoryService.deductStock(menuItem.id, orderItem.quantity);

            const station = this.getStation(menuItem);
            const isDirectSale = station === 'NONE';

            let savedItemId: number | null = null;
            // Create OrderItem record if transaction exists
            if (resolvedTransactionId) {
                const itemPrice = orderItem.priceOverride !== undefined ? orderItem.priceOverride : menuItem.price;

                // Automatic commission attribution based on table assignments
                let commissionUserId = userId;
                if (tableId) {
                    // We check if it's a billiard table or cafe table
                    let waiterId = await this.shiftService.findAssignedWaiterForTable('BILLIARD', tableId);
                    if (!waiterId) {
                        waiterId = await this.shiftService.findAssignedWaiterForTable('CAFE', tableId);
                    }
                    if (waiterId) commissionUserId = waiterId;
                }

                const itemToCreate = {
                    transactionId: resolvedTransactionId as number,
                    menuItemId: menuItem.id,
                    quantity: orderItem.quantity,
                    priceAtOrder: itemPrice,
                    status: isDirectSale ? OrderItemStatus.DONE : OrderItemStatus.QUEUED,
                    note: orderItem.note,
                    customName: orderItem.customName,
                    bundleGroupId: orderItem.bundleGroupId,
                    station: isDirectSale ? undefined : station.toString(),
                    createdByUserId: userId,
                    commissionUserId,
                    completedAt: isDirectSale ? new Date() : null,
                };
                const item = this.orderItemRepository.create(itemToCreate as any);
                const saved = await this.orderItemRepository.save(item);
                savedItemId = (saved as any).id;
                if (savedItemId) savedItemIds.push(savedItemId);

                if (userName) {
                    await this.reportService.logAction(
                        'ADD_ORDER_ITEM',
                        userName,
                        `Tambah pesanan: ${orderItem.quantity}x ${menuItem.name} ${orderItem.note ? `(Catatan: ${orderItem.note})` : ''}`,
                        tableId,
                        `TRX-${resolvedTransactionId}`
                    );
                }
            }

            const itemDetail = {
                id: savedItemId,
                name: menuItem.name,
                quantity: orderItem.quantity,
                category: menuItem.category,
                note: orderItem.note,
                station,
            };

            // Route based on station
            if (station === 'BDS') {
                bdsItems.push(itemDetail);
            } else if (station === 'KDS') {
                kdsItems.push(itemDetail);
            }

            console.log(`Processed order for ${orderItem.quantity}x ${menuItem.name} (Category: ${menuItem.category?.name}) -> ${station}`);
        }

        // Update transaction totals
        if (resolvedTransactionId) {
            await this.transactionService.updateTotals(resolvedTransactionId);

            // --- AUTO-DEBIT: Potong per-item jika member terdeteksi ---
            const tx = await this.transactionService.getTransactionById(resolvedTransactionId);
            if (tx && tx.memberId && savedItemIds.length > 0) {
                try {
                    await this.transactionService.processMultiPayerPayment(
                        tx.id,
                        {
                            orderItemIds: savedItemIds,
                            payerName: tx.customerName || 'Member',
                            paymentMethod: 'MEMBER',
                            billiardPortion: 0
                        },
                        userId
                    );
                } catch (err) {
                    console.error(`FAILED to auto-deduct member balance for cafe order:`, err);
                    if (err.status === 402 || err.message?.includes('Saldo tidak cukup')) {
                        this.billiardGateway.broadcastWarning(
                            'Saldo Kurang',
                            `Gagal potong saldo otomatis untuk ${tx.customerName || 'Member'}. Saldo tidak cukup.`,
                            tx.tableId || undefined
                        );
                    }
                }
            }

            // Shared order ID prefix
            const baseOrderId = Math.random().toString(36).substr(2, 9).toUpperCase();

            // Fetch table name to show on KDS/BDS
            let tableName: string | undefined;
            if (transactionId && !tableId) {
                // Cafe-only table order: look up transaction to get cafeTable name
                const tx = await this.transactionRepository.findOne({
                    where: { id: transactionId },
                    relations: ['cafeTable'],
                }).catch(() => null);
                if (tx?.cafeTable) {
                    tableName = tx.cafeTable.tableName;
                }
            } else if (tableId) {
                const table = await this.billiardService.getTableById(tableId);
                tableName = table?.tableName || `Meja ${tableId}`;
            }

            // Emit to KDS station if there are food items
            if (kdsItems.length > 0) {
                this.kdsGateway.sendNewOrder({
                    station: 'KDS',
                    items: kdsItems,
                    tableId,
                    tableName,
                    orderId: `${baseOrderId}-K`,
                });
            }

            // Emit to BDS station if there are drink items
            if (bdsItems.length > 0) {
                this.kdsGateway.sendNewOrder({
                    station: 'BDS',
                    items: bdsItems,
                    tableId,
                    tableName,
                    orderId: `${baseOrderId}-B`,
                });
            }

            // Broadcast table update to ensure dashboard reflects new orders/bill
            await this.broadcastTableUpdateByTransactionId(resolvedTransactionId);
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
                { status: OrderItemStatus.CANCEL_REJECTED }
            ],
            relations: ['menuItem', 'transaction', 'transaction.table', 'transaction.cafeTable'],
            order: { createdAt: 'DESC' }
        });

        // Group by Transaction (Order Ticket)
        const grouped = items.reduce((acc: Record<string, any>, item) => {
            const key = item.transactionId;
            if (!acc[key]) {
                const tableId = item.transaction?.tableId;
                const cafeTable = (item.transaction as any)?.cafeTable;
                let tableName: string | undefined;
                if (cafeTable) {
                    tableName = cafeTable.tableName;
                } else if ((item.transaction as any)?.table?.tableName) {
                    tableName = (item.transaction as any).table.tableName;
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
                    status: 'PENDING'
                };
            }

            // Determine station
            const station = this.getStation(item.menuItem);

            acc[key].items.push({
                id: item.id,
                name: item.menuItem?.name || 'Unknown Item',
                quantity: item.quantity,
                status: item.status,
                category: item.menuItem?.category,
                note: item.note,
                station
            });

            return acc;
        }, {} as Record<string, any>);

        // Process into KDS/BDS ready format
        const orders = Object.values(grouped).map((order: any) => {
            // determine aggregate status
            const hasCooking = order.items.some((i: any) =>
                i.status === OrderItemStatus.PROCESSING ||
                i.status === OrderItemStatus.CANCEL_REQUESTED ||
                i.status === OrderItemStatus.CANCEL_REJECTED
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
            relations: ['menuItem', 'transaction', 'transaction.table', 'transaction.cafeTable'],
            order: { updatedAt: 'DESC' },
            take: limit
        });

        // Group by Transaction
        const grouped = items.reduce((acc: Record<string, any>, item) => {
            const key = item.transactionId;
            if (!acc[key]) {
                const tableId = item.transaction?.tableId;
                const cafeTable = (item.transaction as any)?.cafeTable;
                const billiardTable = (item.transaction as any)?.table;

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
                    status: 'SERVED'
                };
            }

            const station = this.getStation(item.menuItem);

            acc[key].items.push({
                id: item.id,
                name: item.menuItem?.name || 'Unknown Item',
                quantity: item.quantity,
                status: item.status,
                category: item.menuItem?.category,
                note: item.note,
                station
            });

            return acc;
        }, {} as Record<string, any>);

        return Object.values(grouped);
    }

    async updateOrderItemStatus(id: number, status: OrderItemStatus, userId?: number, userName?: string): Promise<OrderItem> {
        const item = await this.orderItemRepository.findOne({
            where: { id },
            relations: ['menuItem', 'transaction']
        });
        if (!item) throw new NotFoundException('Order item not found');

        const oldStatus = item.status;

        // --- HARDENED GUARDS ---
        // 1. Prevent updates if item is already DONE or CANCELLED (unless it's a very specific bypass)
        if (oldStatus === OrderItemStatus.DONE || oldStatus === OrderItemStatus.CANCELLED) {
            // Log and ignore to prevent race condition "re-processing"
            return item;
        }

        // 2. Prevent kitchen/bar from marking as DONE/PROCESSING if a cancellation is pending
        const isResolvingCancel = [OrderItemStatus.CANCELLED, OrderItemStatus.CANCEL_REJECTED].includes(status);
        if (oldStatus === OrderItemStatus.CANCEL_REQUESTED && !isResolvingCancel) {
            throw new BadRequestException(
                `Gagal: Item ini sedang dalam permintaan pembatalan. Harap setujui atau tolak pembatalan terlebih dahulu.`
            );
        }

        item.status = status;
        const saved = await this.orderItemRepository.save(item);

        // If status changed to CANCELLED, return stock
        if (status === OrderItemStatus.CANCELLED) {
            await this.inventoryService.returnStock(item.menuItemId, item.quantity);

            if (userName) {
                await this.reportService.logAction(
                    'CANCEL_ORDER_ITEM',
                    userName,
                    `Batal pesanan: ${item.quantity}x ${item.menuItem?.name} (Meja: ${item.transaction?.tableId || 'Cafe'})`,
                    item.transaction?.tableId ?? undefined,
                    `TRX-${item.transactionId}`
                );
            }
        }

        // Broadcast to KDS and Dashboard
        let station = item.station;
        if (!station) {
            station = this.getStation(item.menuItem);
        }

        // Update Daily Summary if completed
        if (status === OrderItemStatus.DONE) {
            if (userId) item.completedByUserId = userId;
            item.completedAt = new Date();
            await this.orderItemRepository.save(item);
            await this.updateDailySummary(station, item.menuItem?.name || 'Unknown', item.quantity);
        }

        const updatePayload = {
            id: saved.id,
            status: saved.status,
            transactionId: saved.transactionId,
            station,
        };

        this.kdsGateway.server.emit('orderItemUpdated', updatePayload);
        this.billiardGateway.broadcastOrderItemUpdate(updatePayload);

        // Also broadcast table update if it's tied to a table (for dashboard cross-alert)
        if (item.transaction) {
            // Billiard Table Update
            if (item.transaction.tableId) {
                const updatedTable = await this.billiardService.getTableById(item.transaction.tableId);
                if (updatedTable) {
                    await this.billiardService.attachTransactionData(updatedTable);
                    this.billiardGateway.broadcastTableUpdate(updatedTable);
                }
            }
            // Cafe Table Update
            if (item.transaction.cafeTableId) {
                const cafeTable = await this.cafeTableRepository.findOneBy({ id: item.transaction.cafeTableId });
                const cafeTx = await this.transactionService.getActiveTransactionByCafeTable(item.transaction.cafeTableId);
                if (cafeTable && cafeTx) {
                    this.billiardGateway.broadcastTableUpdate({
                        ...cafeTable,
                        type: 'cafe',
                        activeTransaction: cafeTx,
                        grandTotal: Number(cafeTx.grandTotal || 0)
                    });
                }
            }
        }

        return saved;
    }

    private async updateDailySummary(station: string, itemName: string, quantity: number) {
        const today = new Date().toISOString().split('T')[0];
        let summary = await this.dailySummaryRepository.findOne({
            where: { date: today, station }
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
        items[itemName] = (items[itemName] || 0) + quantity;

        summary.totalItems += quantity;
        summary.itemsJson = JSON.stringify(items);

        await this.dailySummaryRepository.save(summary);
    }

    async getDailyStationSummary(station: string) {
        const today = new Date().toISOString().split('T')[0];
        return this.dailySummaryRepository.findOne({
            where: { date: today, station }
        });
    }

    /**
     * Cancel an order item
     */
    async cancelOrderItem(id: number, reason: string, user: string): Promise<void> {
        const item = await this.orderItemRepository.findOne({
            where: { id },
            relations: ['menuItem', 'transaction', 'transaction.table', 'transaction.cafeTable'],
        });
        if (!item) throw new NotFoundException('Order item not found');

        const s = item.status?.toUpperCase() || OrderItemStatus.QUEUED;
        if (s === OrderItemStatus.CANCELLED) return;
        if (s === OrderItemStatus.DONE) {
            throw new Error('Pesanan yang sudah selesai tidak bisa dibatalkan secara normal.');
        }

        // Restore Flow: All cancellations (even QUEUED) must request permission
        // This ensures the Kitchen (KDS) sees the request.
        item.status = OrderItemStatus.CANCEL_REQUESTED;
        item.cancelledBy = user;
        item.cancelReason = reason;
        await this.orderItemRepository.save(item);

        // Audit Log: Capture the request and the reason
        await this.reportService.logAction(
            'CANCEL_REQUESTED',
            user,
            `Minta pembatalan pesanan "${item.menuItem?.name || 'Unknown'}" (x${item.quantity}) dengan alasan: "${reason}"`,
            item.transaction?.tableId ?? undefined,
            item.transaction?.invoiceNumber
        );

        // Notify KDS/BDS about the request
        const targetStation = item.station?.toUpperCase() || 'KDS';
        console.log(`BROADCASTING CANCEL_REQUEST for ${item.menuItem?.name} (Target Station: ${targetStation})`);

        this.kdsGateway.sendCancellationRequest({
            id: item.id,
            orderId: `TRX-${item.transactionId}`,
            station: targetStation,
            itemName: item.menuItem?.name || 'Unknown',
            tableName: item.transaction?.table?.tableName || item.transaction?.cafeTable?.tableName || 'Takeaway',
            reason,
            user
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
            item.transaction?.tableId ?? undefined
        );
    }

    /**
     * Confirm a cancellation from the kitchen/bar
     */
    async confirmCancelOrderItem(id: number, user: string): Promise<void> {
        const item = await this.orderItemRepository.findOne({
            where: { id },
            relations: ['menuItem', 'transaction', 'transaction.table', 'transaction.cafeTable'],
        });
        if (!item) throw new NotFoundException('Order item not found');

        if (item.status !== OrderItemStatus.CANCEL_REQUESTED) {
            throw new BadRequestException(`Gagal: Status item saat ini adalah ${item.status}, bukan CANCEL_REQUESTED.`);
        }

        item.status = OrderItemStatus.CANCELLED;
        item.cancelledAt = new Date();
        await this.orderItemRepository.save(item);

        // Return stock
        await this.inventoryService.returnStock(item.menuItemId, item.quantity);

        // Notify KDS/BDS to remove
        this.kdsGateway.sendItemCancelled({
            id: item.id,
            orderId: `TRX-${item.transactionId}`,
            station: item.station || 'KDS',
            itemName: item.menuItem?.name,
            tableName: item.transaction?.table?.tableName || item.transaction?.cafeTable?.tableName || 'Takeaway'
        });

        // Broadcast table update for Dashboard/Customer UI
        await this.broadcastTableUpdateByTransactionId(item.transactionId);

        // Update transaction totals
        await this.transactionService.updateTotals(item.transactionId);

        // Log
        await this.reportService.logAction(
            'CANCEL_CONFIRMED',
            user,
            `Konfirmasi pembatalan pesanan "${item.menuItem?.name || 'Unknown'}" (x${item.quantity}). Alasan awal: "${item.cancelReason || 'Tidak ada'}"`,
            item.transaction?.tableId ?? undefined,
            item.transaction?.invoiceNumber
        );
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
            throw new BadRequestException(`Gagal menolak: Status item saat ini adalah ${item.status}, bukan CANCEL_REQUESTED.`);
        }

        item.status = OrderItemStatus.CANCEL_REJECTED;
        await this.orderItemRepository.save(item);

        // Notify Table/Frontdesk
        if (this.kdsGateway.server) {
            this.kdsGateway.sendCancellationRejected({
                id: item.id,
                message: 'Pesanan Diproses, Tak dapat batal',
                transactionId: item.transactionId
            });

            // Broadcast status update to KDS to update UI
            this.kdsGateway.server.emit('orderItemUpdated', {
                id: item.id,
                status: item.status,
                transactionId: item.transactionId
            });
        }

        // Broadcast table update for Dashboard/Customer UI
        try {
            await this.broadcastTableUpdateByTransactionId(item.transactionId);
        } catch (err) {
            console.error('Failed to broadcast table update after rejection:', err);
        }

        // Log
        await this.reportService.logAction(
            'CANCEL_REJECTED',
            `Chef/Admin: ${user}`,
            `Cancellation rejected for ${item.menuItem?.name || 'Unknown'} x${item.quantity}`,
            item.transaction?.tableId ?? undefined
        );
    }

    /**
     * Helper to broadcast table updates with full relations
     */
    private async broadcastTableUpdateByTransactionId(transactionId: number) {
        const fullTransaction = await this.transactionRepository.findOne({
            where: { id: transactionId },
            relations: ['orderItems', 'orderItems.menuItem', 'orderItems.menuItem.category', 'table', 'cafeTable']
        });

        if (!fullTransaction) return;

        if (fullTransaction.tableId) {
            const table = await this.billiardService.getTableById(fullTransaction.tableId);
            if (table) {
                // Standardize with BilliardService helper
                await this.billiardService.attachTransactionData(table);
                this.billiardGateway.broadcastTableUpdate(table);
            }
        } else if ((fullTransaction as any).cafeTableId) {
            const cafeTable = await this.cafeTableRepository.findOne({
                where: { id: (fullTransaction as any).cafeTableId }
            });
            if (cafeTable) {
                this.billiardGateway.broadcastTableUpdate({
                    ...cafeTable,
                    type: 'cafe',
                    activeTransaction: fullTransaction,
                    grandTotal: Number(fullTransaction.grandTotal || 0)
                });
            }
        }
    }
}
