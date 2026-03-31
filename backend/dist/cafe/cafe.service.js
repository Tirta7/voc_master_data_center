"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CafeService", {
    enumerable: true,
    get: function() {
        return CafeService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _redisservice = require("../redis/redis.service");
const _typeorm1 = require("typeorm");
const _menuitementity = require("./entities/menu-item.entity");
const _categoryentity = require("./entities/category.entity");
const _productfinanceentity = require("./entities/product-finance.entity");
const _orderitementity = require("./entities/order-item.entity");
const _dailyordersummaryentity = require("./entities/daily-order-summary.entity");
const _inventoryservice = require("../inventory/inventory.service");
const _kdsgateway = require("../kds/kds/kds.gateway");
const _transactionservice = require("../transaction/transaction.service");
const _billiardgateway = require("../socket/billiard.gateway");
const _promoservice = require("../promo/promo.service");
const _reportservice = require("../report/report.service");
const _shiftservice = require("../finance/shift.service");
const _eventsgateway = require("../socket/events.gateway");
const _aiservice = require("../ai/ai.service");
const _recipeentity = require("../inventory/entities/recipe.entity");
const _transactionentity = require("../transaction/entities/transaction.entity");
const _promoentity = require("../promo/entities/promo.entity");
const _cafetableentity = require("../cafe-table/entities/cafe-table.entity");
const _tableentity = require("../billiard/entities/table.entity");
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
let CafeService = class CafeService {
    async getAllMenuItems(includeInactive = false) {
        const where = {
            deletedAt: (0, _typeorm1.IsNull)()
        };
        if (!includeInactive) where.isActive = true;
        const items = await this.menuItemRepository.find({
            where,
            relations: [
                'category',
                'recipes',
                'recipes.ingredient',
                'recipes.subMenuItem',
                'productFinance'
            ],
            order: {
                createdAt: 'DESC'
            }
        });
        return items.map((item)=>{
            if (item.recipes) {
                item.recipes = item.recipes.map((r)=>{
                    const { menuItem: _mi, ...rest } = r;
                    return rest;
                });
            }
            return item;
        });
    }
    async findAllCategories() {
        return this.categoryRepository.find({
            order: {
                name: 'ASC'
            }
        });
    }
    async createCategory(data) {
        const name = data.name?.trim();
        if (!name) throw new _common.BadRequestException('Nama kategori harus diisi.');
        // Case-insensitive check
        const existing = await this.categoryRepository.createQueryBuilder('cat').where('LOWER(cat.name) = LOWER(:name)', {
            name
        }).getOne();
        if (existing) throw new _common.BadRequestException(`Kategori "${name}" sudah ada.`);
        const category = this.categoryRepository.create({
            ...data,
            name: name
        });
        return await this.categoryRepository.save(category);
    }
    async updateCategory(id, data) {
        const category = await this.categoryRepository.findOne({
            where: {
                id
            }
        });
        if (!category) throw new _common.NotFoundException('Kategori tidak ditemukan.');
        if (data.name) {
            const name = data.name.trim();
            const existing = await this.categoryRepository.createQueryBuilder('cat').where('LOWER(cat.name) = LOWER(:name)', {
                name
            }).getOne();
            if (existing && existing.id !== id) throw new _common.BadRequestException(`Kategori "${name}" sudah ada.`);
            category.name = name;
        }
        if (data.productionTarget) category.productionTarget = data.productionTarget;
        if (data.isActive !== undefined) category.isActive = data.isActive;
        return await this.categoryRepository.save(category);
    }
    async deleteCategory(id) {
        const itemsCount = await this.menuItemRepository.count({
            where: {
                categoryId: id
            }
        });
        if (itemsCount > 0) throw new _common.BadRequestException('Kategori tidak bisa dihapus karena masih digunakan oleh beberapa menu.');
        await this.categoryRepository.delete(id);
    }
    async getNextSKU() {
        const latestItem = await this.menuItemRepository.createQueryBuilder('item').where('item.sku LIKE :pattern', {
            pattern: 'MN-%'
        }).orderBy('item.sku', 'DESC').getOne();
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
    sanitizeFinanceData(finance) {
        if (!finance) return undefined;
        return {
            ...finance,
            baseHpp: Number(finance.baseHpp || 0),
            targetMarginPercent: Number(Number(finance.targetMarginPercent || 0).toFixed(2)),
            targetMarkupFixed: Number(Number(finance.targetMarkupFixed || 0).toFixed(2)),
            targetMarkupPercent: Number(Number(finance.targetMarkupPercent || 0).toFixed(2)),
            targetMultiplier: Number(Number(finance.targetMultiplier || 0).toFixed(2)),
            maxHppThreshold: Number(Number(finance.maxHppThreshold || 0).toFixed(2))
        };
    }
    async createMenuItem(data) {
        return this.menuItemRepository.manager.transaction(async (manager)=>{
            try {
                // Sanitize data: remove ID if leaked from frontend to ensure new record creation
                const { id: _id, ...cleanData } = data;
                // Validate SKU
                const sku = cleanData.sku?.trim() || `MNU-${Date.now()}`;
                const existing = await manager.findOne(_menuitementity.MenuItem, {
                    where: {
                        sku
                    }
                });
                if (existing) {
                    throw new _common.BadRequestException(`SKU "${sku}" sudah terdaftar.`);
                }
                // Handle category if passed as a string (for seeder/older code)
                let category = cleanData.category;
                if (typeof cleanData.category === 'string') {
                    const catName = cleanData.category.trim();
                    let catEntity = await manager.findOne(_categoryentity.Category, {
                        where: {
                            name: catName
                        }
                    });
                    if (!catEntity) {
                        catEntity = manager.create(_categoryentity.Category, {
                            name: catName,
                            productionTarget: _categoryentity.ProductionTarget.KITCHEN
                        });
                        catEntity = await manager.save(catEntity);
                    }
                    category = catEntity;
                }
                const item = manager.create(_menuitementity.MenuItem, {
                    ...cleanData,
                    category,
                    price: Number(cleanData.price || 0),
                    taxPercentage: Number(cleanData.taxPercentage || 0),
                    sku: sku,
                    expiryDate: cleanData.expiryDate || null,
                    productFinance: this.sanitizeFinanceData(cleanData.productFinance)
                });
                // Note: productFinance will be saved automatically due to { cascade: true }
                // if it exists in cleanData and is properly mapped in the entity.
                const saved = await manager.save(item);
                return saved;
            } catch (error) {
                console.error('CREATE_MENU_ITEM_ERROR:', error);
                if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
                    throw new _common.BadRequestException('Nama atau SKU menu sudah terdaftar.');
                }
                throw error;
            }
        });
    }
    async updateMenuItem(id, data, userName) {
        return this.menuItemRepository.manager.transaction(async (manager)=>{
            try {
                const item = await manager.findOne(_menuitementity.MenuItem, {
                    where: {
                        id
                    },
                    relations: [
                        'productFinance'
                    ]
                });
                if (!item) throw new _common.NotFoundException('Menu item not found');
                const oldPrice = Number(item.price);
                const newPrice = data.price !== undefined ? Number(data.price) : oldPrice;
                if (userName && newPrice !== oldPrice) {
                    await this.reportService.logAction('PRICE_CHANGE', userName, `Ubah harga menu "${item.name}" dari Rp ${oldPrice.toLocaleString()} ke Rp ${newPrice.toLocaleString()}`);
                }
                // Handle category
                let category = data.category;
                if (typeof data.category === 'string') {
                    const catName = data.category.trim();
                    let catEntity = await manager.findOne(_categoryentity.Category, {
                        where: {
                            name: catName
                        }
                    });
                    if (!catEntity) {
                        catEntity = manager.create(_categoryentity.Category, {
                            name: catName,
                            productionTarget: _categoryentity.ProductionTarget.KITCHEN
                        });
                        catEntity = await manager.save(catEntity);
                    }
                    category = catEntity;
                }
                Object.assign(item, {
                    ...data,
                    category: category !== undefined ? category : item.category,
                    price: data.price !== undefined ? Number(data.price) : item.price,
                    taxPercentage: data.taxPercentage !== undefined ? Number(data.taxPercentage) : item.taxPercentage,
                    sku: data.sku?.trim() || item.sku,
                    expiryDate: data.expiryDate !== undefined ? data.expiryDate || null : item.expiryDate
                });
                // Update productFinance if provided and mapped
                if (data.productFinance) {
                    const cleanFinance = this.sanitizeFinanceData(data.productFinance);
                    if (item.productFinance) {
                        Object.assign(item.productFinance, cleanFinance);
                    } else {
                        item.productFinance = manager.create(_productfinanceentity.ProductFinance, {
                            ...cleanFinance,
                            menuItemId: item.id
                        });
                    }
                }
                const saved = await manager.save(item);
                await this.inventoryService.broadcastAvailability();
                return saved;
            } catch (error) {
                console.error('UPDATE_MENU_ITEM_ERROR:', error);
                if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
                    throw new _common.BadRequestException('Nama atau SKU menu sudah terdaftar.');
                }
                throw error;
            }
        });
    }
    async deleteMenuItem(id) {
        const item = await this.menuItemRepository.findOne({
            where: {
                id
            }
        });
        if (!item) throw new _common.NotFoundException('Menu item not found');
        // 1. Check if used as sub-recipe for other items
        const usedInRecipes = await this.recipeRepository.count({
            where: {
                subMenuItemId: id
            }
        });
        if (usedInRecipes > 0) {
            throw new _common.BadRequestException('Menu tidak bisa dihapus karena digunakan sebagai bahan (sub-resep) di menu lain.');
        }
        // 2. Check if used in Promos (Scanning ruleJson)
        // We search for the ID in requireMenuItems array within ruleJson
        const promos = await this.promoService.getAllPromos(); // Or a more optimized query
        const usedInPromo = promos.some((p)=>{
            const items = p.ruleJson?.requireMenuItems || [];
            return items.some((mi)=>mi.id === id);
        });
        if (usedInPromo) {
            throw new _common.BadRequestException('Menu tidak bisa dihapus karena sedang digunakan dalam Promo Bundling aktif.');
        }
        // 3. Check if it has order history
        const orderCount = await this.orderItemRepository.count({
            where: {
                menuItemId: id
            }
        });
        if (orderCount > 0) {
            // Soft delete: keep historical data
            const timestamp = Date.now();
            await this.menuItemRepository.update(id, {
                isActive: false,
                name: `${item.name} (DELETED-${timestamp})`,
                sku: item.sku ? `${item.sku}-DEL-${timestamp}` : undefined
            });
            await this.menuItemRepository.softDelete(id);
            return {
                success: true,
                mode: 'soft',
                message: 'Menu memiliki riwayat transaksi. Data diarsipkan agar laporan tetap akurat.'
            };
        } else {
            // Hard delete: clean up related data
            await this.recipeRepository.delete({
                menuItemId: id
            });
            await this.productFinanceRepository.delete({
                menuItemId: id
            });
            await this.menuItemRepository.delete(id);
            return {
                success: true,
                mode: 'hard',
                message: 'Menu berhasil dihapus secara permanen.'
            };
        }
    }
    async getMenuItemById(id) {
        const item = await this.menuItemRepository.findOne({
            where: {
                id
            },
            relations: [
                'category',
                'recipes',
                'recipes.ingredient',
                'recipes.subMenuItem',
                'productFinance'
            ]
        });
        if (!item) throw new _common.NotFoundException('Menu item not found');
        // Ensure no circularity (though TypeORM shouldn't have loaded menuItem back unless stated)
        if (item.recipes) {
            item.recipes = item.recipes.map((r)=>{
                const { menuItem: _mi, ...rest } = r;
                return rest;
            });
        }
        return item;
    }
    async updateMenuItemRecipes(id, recipes) {
        await this.getMenuItemById(id);
        // Remove existing recipes
        await this.recipeRepository.delete({
            menuItemId: id
        });
        // Add new recipes
        const newRecipes = recipes.map((r)=>this.recipeRepository.create({
                menuItemId: id,
                ingredientId: r.ingredientId || null,
                subMenuItemId: r.subMenuItemId || null,
                quantity: r.quantity,
                unit: r.unit
            }));
        await this.recipeRepository.save(newRecipes);
        return this.getMenuItemById(id);
    }
    getStation(item) {
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
   */ async processOrder(menuItems, tableId, transactionId, userId, userName, idempotencyKey) {
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
            this.logger.warn(`Order is already being processed (Redis Lock): ${mutexKey}, skipping redundant request.`);
            return;
        }
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const stationItems = {};
            const savedItemIds = [];
            // 1. Resolve Transaction (Atomic context)
            let resolvedTransactionId = null;
            if (transactionId) {
                resolvedTransactionId = transactionId;
            } else if (tableId) {
                // Fetch the latest transaction for this table
                let transaction = await queryRunner.manager.findOne(_transactionentity.Transaction, {
                    where: [
                        {
                            tableId: tableId,
                            status: (0, _typeorm1.In)([
                                _transactionentity.TransactionStatus.UNPAID,
                                _transactionentity.TransactionStatus.PARTIAL,
                                _transactionentity.TransactionStatus.PAID
                            ])
                        },
                        {
                            cafeTableId: tableId,
                            status: (0, _typeorm1.In)([
                                _transactionentity.TransactionStatus.UNPAID,
                                _transactionentity.TransactionStatus.PARTIAL,
                                _transactionentity.TransactionStatus.PAID
                            ])
                        }
                    ],
                    order: {
                        createdAt: 'DESC'
                    },
                    relations: [
                        'table',
                        'cafeTable'
                    ]
                });
                // Filter out PAID transactions if the table is actually AVAILABLE
                if (transaction && transaction.status === _transactionentity.TransactionStatus.PAID) {
                    if (transaction.table && transaction.table.status === 'available') {
                        transaction = null;
                    } else if (transaction.cafeTable && transaction.cafeTable.status === 'available') {
                        transaction = null;
                    }
                }
                if (!transaction) {
                    // Try to get memberId from table before creating standalone
                    const table = await queryRunner.manager.findOne(_tableentity.Table, {
                        where: {
                            id: tableId
                        }
                    });
                    transaction = queryRunner.manager.create(_transactionentity.Transaction, {
                        invoiceNumber: `STANDALONE-${Date.now()}`,
                        customerName: table?.bookedByName || 'Customer',
                        tableId: tableId,
                        status: _transactionentity.TransactionStatus.UNPAID,
                        openedByUserId: userId,
                        createdByUserId: userId,
                        startTime: new Date(),
                        memberId: table?.memberId || null
                    });
                    transaction = await queryRunner.manager.save(transaction);
                }
                resolvedTransactionId = transaction.id;
            } else {
                const walkinTransaction = queryRunner.manager.create(_transactionentity.Transaction, {
                    invoiceNumber: `TAKEAWAY-${Date.now()}`,
                    customerName: 'Takeaway',
                    status: _transactionentity.TransactionStatus.UNPAID,
                    openedByUserId: userId,
                    createdByUserId: userId,
                    startTime: new Date()
                });
                const savedWalkin = await queryRunner.manager.save(walkinTransaction);
                resolvedTransactionId = savedWalkin.id;
            }
            // 2. Prepare items to process (Promos/Bundles expansion)
            const itemsToProcess = [];
            for (const orderEntry of menuItems){
                if (orderEntry.promoId) {
                    const promo = await queryRunner.manager.findOne(_promoentity.Promo, {
                        where: {
                            id: orderEntry.promoId
                        }
                    });
                    if (promo) {
                        const rule = promo.ruleJson || {};
                        const bundlePrice = Number(rule.fixedPrice || 0);
                        const staticItems = rule.requireMenuItems || [];
                        const bundleGroupId = `bundle-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                        staticItems.forEach((bi, index)=>{
                            itemsToProcess.push({
                                id: bi.id,
                                quantity: bi.quantity * orderEntry.quantity,
                                note: orderEntry.note || `Bundle: ${promo.name}`,
                                customName: index === 0 ? `[PAKET] ${promo.name}` : undefined,
                                priceOverride: index === 0 ? bundlePrice : 0,
                                bundleGroupId,
                                promoId: promo.id
                            });
                        });
                    }
                } else if (orderEntry.id) {
                    itemsToProcess.push({
                        id: orderEntry.id,
                        quantity: orderEntry.quantity,
                        note: orderEntry.note || '',
                        customName: orderEntry.customName,
                        priceOverride: orderEntry.priceOverride
                    });
                }
            }
            // 3. Stock & Transaction persist
            const addedItemsSummary = [];
            for (const orderItem of itemsToProcess){
                const menuItem = await queryRunner.manager.findOne(_menuitementity.MenuItem, {
                    where: {
                        id: orderItem.id
                    },
                    relations: [
                        'category'
                    ]
                });
                if (!menuItem || !menuItem.isActive) {
                    throw new _common.BadRequestException(`Menu "${menuItem?.name || orderItem.id}" tidak tersedia.`);
                }
                // Deduct stock within transaction
                await this.inventoryService.deductStock(menuItem.id, orderItem.quantity, queryRunner.manager);
                const station = this.getStation(menuItem);
                const isDirectSale = station === 'NONE';
                const itemPrice = orderItem.priceOverride !== undefined ? orderItem.priceOverride : menuItem.price;
                const item = queryRunner.manager.create(_orderitementity.OrderItem, {
                    transactionId: resolvedTransactionId,
                    menuItemId: menuItem.id,
                    quantity: orderItem.quantity,
                    priceAtOrder: itemPrice,
                    status: isDirectSale ? _orderitementity.OrderItemStatus.DONE : _orderitementity.OrderItemStatus.QUEUED,
                    note: orderItem.note,
                    customName: orderItem.customName,
                    bundleGroupId: orderItem.bundleGroupId,
                    station: isDirectSale ? undefined : station,
                    createdByUserId: userId,
                    completedAt: isDirectSale ? new Date() : null
                });
                const saved = await queryRunner.manager.save(item);
                savedItemIds.push(saved.id);
                if (!isDirectSale) {
                    if (!stationItems[station]) stationItems[station] = [];
                    stationItems[station].push({
                        id: saved.id,
                        name: menuItem.name,
                        quantity: orderItem.quantity,
                        note: orderItem.note,
                        station
                    });
                }
                addedItemsSummary.push(`${orderItem.quantity}x ${menuItem.name}`);
            }
            await queryRunner.commitTransaction();
            // 4. Update Totals (Outside Transaction for performance/broadcast)
            if (resolvedTransactionId) {
                const updatedTx = await this.transactionService.updateTotals(resolvedTransactionId);
                // Resolve tableName for notification context
                let tableName;
                let resolvedTableId = tableId;
                try {
                    const txn = await this.dataSource.manager.findOne(_transactionentity.Transaction, {
                        where: {
                            id: resolvedTransactionId
                        },
                        relations: [
                            'table',
                            'cafeTable'
                        ]
                    });
                    if (txn) {
                        const cafeTable = txn.cafeTable;
                        const billiardTable = txn.table;
                        if (cafeTable?.tableName) {
                            tableName = cafeTable.tableName;
                            resolvedTableId = cafeTable.id;
                        } else if (billiardTable?.tableName) {
                            tableName = billiardTable.tableName;
                            resolvedTableId = billiardTable.id;
                        } else if (txn.tableId) {
                            tableName = `Meja ${txn.tableId}`;
                        } else if (txn.cafeTableId) {
                            tableName = `Cafe ${txn.cafeTableId}`;
                        } else {
                            tableName = 'Takeaway';
                        }
                    }
                } catch (e) {
                    this.logger.warn(`Could not resolve tableName for TRX-${resolvedTransactionId}: ${e.message}`);
                }
                // --- AI SALES ORCHESTRATOR: Real-time progress tracking & Combo Suggestions ---
                if (updatedTx?.businessDayId) {
                    for (const item of itemsToProcess){
                        // Update Sold Quantities for Progress Tracking
                        this.aiService.updateSoldQuantities(item.id, updatedTx.businessDayId, item.quantity, resolvedTransactionId, tableId, undefined, userId, item.promoId).catch((err)=>this.logger.error(`AI Tracking Error: ${err.message}`));
                        // Phase 10: AI Combo Suggestion Trigger
                        this.aiService.getComboSuggestion(item.id).then((suggestion)=>{
                            if (suggestion) {
                                this.eventsGateway.battlePlanUpdated({
                                    type: 'COMBO_SUGGESTION',
                                    message: `💡 TIP: Pelanggan menu ini biasanya juga memesan ${suggestion.name}!`,
                                    tableName: tableName || 'Meja',
                                    menuItemName: suggestion.name,
                                    confidence: Math.round(suggestion.confidence * 100)
                                });
                            }
                        }).catch((err)=>this.logger.error(`AI Combo Suggestion Error: ${err.message}`));
                    }
                }
                // KDS/BDS Notification
                for (const [station, items] of Object.entries(stationItems)){
                    this.kdsGateway.sendNewOrder({
                        station,
                        items,
                        tableId: resolvedTableId,
                        tableName,
                        orderId: `TRX-${resolvedTransactionId}`
                    });
                }
                // ── AUDIT LOG: Tambah Menu ────────────────────────────────────
                if (userName && addedItemsSummary.length > 0) {
                    try {
                        const details = `Menambahkan ${addedItemsSummary.join(', ')} ke ${tableName || 'Order'}`;
                        await this.reportService.logAction('ADD_MENU', userName, details, resolvedTableId || tableId);
                    } catch (e) {
                        this.logger.warn(`Failed to log ADD_MENU audit: ${e.message}`);
                    }
                }
                await this.broadcastTableUpdateByTransactionId(resolvedTransactionId);
            }
            if (idempotencyKey) {
                await this.redisService.setIdempotency(idempotencyKey, {
                    success: true
                });
            }
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally{
            await queryRunner.release();
            await this.redisService.releaseLock(mutexKey);
        }
    }
    /**
   * Get all active orders (QUEUED/PROCESSING) for KDS regeneration
   */ async getActiveOrders() {
        // Fetch all items that are not DONE or CANCELLED
        const items = await this.orderItemRepository.find({
            where: [
                {
                    status: _orderitementity.OrderItemStatus.QUEUED
                },
                {
                    status: _orderitementity.OrderItemStatus.PROCESSING
                },
                {
                    status: _orderitementity.OrderItemStatus.CANCEL_REQUESTED
                },
                {
                    status: _orderitementity.OrderItemStatus.CANCEL_REJECTED
                }
            ],
            relations: [
                'menuItem',
                'menuItem.category',
                'transaction',
                'transaction.table',
                'transaction.cafeTable'
            ],
            order: {
                createdAt: 'DESC'
            }
        });
        // Group by Transaction (Order Ticket)
        const grouped = items.reduce((acc, item)=>{
            const key = item.transactionId;
            if (!acc[key]) {
                const tableId = item.transaction?.tableId;
                const cafeTable = item.transaction?.cafeTable;
                let tableName;
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
                    status: 'PENDING'
                };
            }
            // Determine station (use persisted station first, fallback to calculation)
            const station = item.station || this.getStation(item.menuItem);
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
        }, {});
        // Process into KDS/BDS ready format
        const orders = Object.values(grouped).map((order)=>{
            // determine aggregate status
            const hasCooking = order.items.some((i)=>i.status === _orderitementity.OrderItemStatus.PROCESSING || i.status === _orderitementity.OrderItemStatus.CANCEL_REQUESTED || i.status === _orderitementity.OrderItemStatus.CANCEL_REJECTED);
            order.status = hasCooking ? 'COOKING' : 'PENDING';
            return order;
        });
        return orders;
    }
    async getCompletedOrders(limit = 50) {
        // Fetch recently completed items
        const items = await this.orderItemRepository.find({
            where: {
                status: _orderitementity.OrderItemStatus.DONE
            },
            relations: [
                'menuItem',
                'menuItem.category',
                'transaction',
                'transaction.table',
                'transaction.cafeTable'
            ],
            order: {
                updatedAt: 'DESC'
            },
            take: limit
        });
        // Group by Transaction
        const grouped = items.reduce((acc, item)=>{
            const key = item.transactionId;
            if (!acc[key]) {
                const tableId = item.transaction?.tableId;
                const cafeTable = item.transaction?.cafeTable;
                const billiardTable = item.transaction?.table;
                let tableName;
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
            const station = item.station || this.getStation(item.menuItem);
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
        }, {});
        return Object.values(grouped);
    }
    async updateOrderItemStatus(id, status, userId, userName) {
        const lockKey = `item_update_${id}`;
        const acquired = await this.redisService.acquireLock(lockKey, 3000);
        if (!acquired) {
            this.logger.warn(`Item ${id} is already being updated (Redis Lock), skipping.`);
            return;
        }
        try {
            return await this.menuItemRepository.manager.transaction(async (manager)=>{
                const item = await manager.findOne(_orderitementity.OrderItem, {
                    where: {
                        id
                    },
                    relations: [
                        'menuItem',
                        'transaction'
                    ]
                });
                if (!item) throw new _common.NotFoundException('Order item not found');
                const oldStatus = item.status;
                // 1. Prevent updates if item is already DONE or CANCELLED
                if (oldStatus === _orderitementity.OrderItemStatus.DONE || oldStatus === _orderitementity.OrderItemStatus.CANCELLED) {
                    return item;
                }
                // 2. Prevent kitchen/bar from marking as DONE if cancellation pending
                const isResolvingCancel = [
                    _orderitementity.OrderItemStatus.CANCELLED,
                    _orderitementity.OrderItemStatus.CANCEL_REJECTED
                ].includes(status);
                if (oldStatus === _orderitementity.OrderItemStatus.CANCEL_REQUESTED && !isResolvingCancel) {
                    throw new _common.BadRequestException(`Gagal: Item sedang dalam permintaan pembatalan.`);
                }
                item.status = status;
                const saved = await manager.save(_orderitementity.OrderItem, item);
                // Audit Log: Status Change
                if (userName && oldStatus !== status) {
                    await this.reportService.logAction('ORDER_STATUS_CHANGE', userName, `Ubah status "${item.menuItem?.name || 'Item'}" dari ${oldStatus} ke ${status}`, item.transaction?.tableId || undefined, item.transaction?.invoiceNumber);
                }
                // If status changed to CANCELLED, return stock (Atomic)
                if (status === _orderitementity.OrderItemStatus.CANCELLED) {
                    await this.inventoryService.returnStock(item.menuItemId, item.quantity, manager);
                // ... log action logic ...
                }
                if (status === _orderitementity.OrderItemStatus.DONE) {
                    if (userId) item.completedByUserId = userId;
                    item.completedAt = new Date();
                    await manager.save(_orderitementity.OrderItem, item);
                    const station = item.station || this.getStation(item.menuItem);
                    await this.updateDailySummary(station, item.menuItem?.name || 'Unknown', item.quantity);
                }
                // Broadcast outside transaction or use afterCommit pattern
                this.broadcastStatusChange(saved, item.station || this.getStation(item.menuItem));
                return saved;
            });
        } finally{
            await this.redisService.releaseLock(lockKey);
        }
    }
    async broadcastStatusChange(item, station) {
        const updatePayload = {
            id: item.id,
            status: item.status,
            transactionId: item.transactionId,
            station
        };
        // Broadcast via both Socket.IO and MQTT WebSocket
        this.kdsGateway.broadcastOrderItemUpdated(updatePayload);
        this.billiardGateway.broadcastOrderItemUpdate(updatePayload);
        // Update dashboards
        if (item.transaction?.tableId) {
            const table = await this.billiardService.getTableById(item.transaction.tableId);
            if (table) {
                await this.billiardService.attachTransactionData(table);
                this.billiardGateway.broadcastTableUpdate(table);
            }
        }
    }
    async updateDailySummary(station, itemName, quantity) {
        const today = new Date().toISOString().split('T')[0];
        let summary = await this.dailySummaryRepository.findOne({
            where: {
                date: today,
                station
            }
        });
        if (!summary) {
            summary = this.dailySummaryRepository.create({
                date: today,
                station,
                totalItems: 0,
                itemsJson: JSON.stringify({})
            });
        }
        const items = JSON.parse(summary.itemsJson || '{}');
        items[itemName] = (items[itemName] || 0) + quantity;
        summary.totalItems += quantity;
        summary.itemsJson = JSON.stringify(items);
        await this.dailySummaryRepository.save(summary);
    }
    async getDailyStationSummary(station) {
        const today = new Date().toISOString().split('T')[0];
        return this.dailySummaryRepository.findOne({
            where: {
                date: today,
                station
            }
        });
    }
    /**
   * Cancel an order item
   */ async cancelOrderItem(id, reason, user) {
        const item = await this.orderItemRepository.findOne({
            where: {
                id
            },
            relations: [
                'menuItem',
                'transaction',
                'transaction.table',
                'transaction.cafeTable'
            ]
        });
        if (!item) throw new _common.NotFoundException('Order item not found');
        const s = item.status?.toUpperCase() || _orderitementity.OrderItemStatus.QUEUED;
        if (s === _orderitementity.OrderItemStatus.CANCELLED) return;
        if (s === _orderitementity.OrderItemStatus.DONE) {
            throw new Error('Pesanan yang sudah selesai tidak bisa dibatalkan secara normal.');
        }
        // Restore Flow: All cancellations (even QUEUED) must request permission
        // This ensures the Kitchen (KDS) sees the request.
        item.status = _orderitementity.OrderItemStatus.CANCEL_REQUESTED;
        item.cancelledBy = user;
        item.cancelReason = reason;
        await this.orderItemRepository.save(item);
        // Audit Log: Capture the request and the reason
        await this.reportService.logAction('CANCEL_REQUESTED', user, `Minta pembatalan pesanan "${item.menuItem?.name || 'Unknown'}" (x${item.quantity}) dengan alasan: "${reason}"`, item.transaction?.tableId ?? undefined, item.transaction?.invoiceNumber);
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
        await this.reportService.logAction('CANCEL_REQUEST', user, `${item.menuItem?.name || 'Unknown'} x${item.quantity} — Reason: ${reason}`, item.transaction?.tableId ?? undefined);
    }
    /**
   * Confirm a cancellation from the kitchen/bar
   */ async confirmCancelOrderItem(id, user) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const item = await queryRunner.manager.findOne(_orderitementity.OrderItem, {
                where: {
                    id
                },
                relations: [
                    'menuItem',
                    'transaction',
                    'transaction.table',
                    'transaction.cafeTable'
                ]
            });
            if (!item) throw new _common.NotFoundException('Order item not found');
            if (item.status !== _orderitementity.OrderItemStatus.CANCEL_REQUESTED) {
                throw new _common.BadRequestException(`Gagal: Status item saat ini adalah ${item.status}, bukan CANCEL_REQUESTED.`);
            }
            item.status = _orderitementity.OrderItemStatus.CANCELLED;
            item.cancelledAt = new Date();
            await queryRunner.manager.save(_orderitementity.OrderItem, item);
            // Return stock within transaction
            await this.inventoryService.returnStock(item.menuItemId, item.quantity, queryRunner.manager);
            await queryRunner.commitTransaction();
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
            // Update transaction totals (uses manager or repo)
            await this.transactionService.updateTotals(item.transactionId);
            // Log
            await this.reportService.logAction('CANCEL_CONFIRMED', user, `Konfirmasi pembatalan pesanan "${item.menuItem?.name || 'Unknown'}" (x${item.quantity}). Alasan awal: "${item.cancelReason || 'Tidak ada'}"`, item.transaction?.tableId ?? undefined, item.transaction?.invoiceNumber);
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally{
            await queryRunner.release();
        }
    }
    /**
   * Reject a cancellation request
   */ async rejectCancelOrderItem(id, user) {
        const item = await this.orderItemRepository.findOne({
            where: {
                id
            },
            relations: [
                'menuItem',
                'transaction'
            ]
        });
        if (!item) throw new _common.NotFoundException('Order item not found');
        if (item.status !== _orderitementity.OrderItemStatus.CANCEL_REQUESTED) {
            throw new _common.BadRequestException(`Gagal menolak: Status item saat ini adalah ${item.status}, bukan CANCEL_REQUESTED.`);
        }
        item.status = _orderitementity.OrderItemStatus.CANCEL_REJECTED;
        await this.orderItemRepository.save(item);
        // Notify Table/Frontdesk
        this.kdsGateway.sendCancellationRejected({
            id: item.id,
            message: 'Pesanan Diproses, Tak dapat batal',
            transactionId: item.transactionId
        });
        // Broadcast status update to KDS via MQTT + Socket.IO
        this.kdsGateway.broadcastOrderItemUpdated({
            id: item.id,
            status: item.status,
            transactionId: item.transactionId,
            station: item.station || 'KDS'
        });
        // Broadcast table update for Dashboard/Customer UI
        try {
            await this.broadcastTableUpdateByTransactionId(item.transactionId);
        } catch (err) {
            console.error('Failed to broadcast table update after rejection:', err);
        }
        // Log
        await this.reportService.logAction('CANCEL_REJECTED', `Chef/Admin: ${user}`, `Cancellation rejected for ${item.menuItem?.name || 'Unknown'} x${item.quantity}`, item.transaction?.tableId ?? undefined);
    }
    /**
   * Helper to broadcast table updates with full relations
   */ async broadcastTableUpdateByTransactionId(transactionId) {
        const fullTransaction = await this.transactionRepository.findOne({
            where: {
                id: transactionId
            },
            relations: [
                'orderItems',
                'orderItems.menuItem',
                'orderItems.menuItem.category',
                'table',
                'cafeTable',
                'member',
                'member.tier'
            ]
        });
        if (!fullTransaction) return;
        if (fullTransaction.tableId) {
            const table = await this.billiardService.getTableById(fullTransaction.tableId);
            if (table) {
                // Standardize with BilliardService helper
                await this.billiardService.attachTransactionData(table);
                this.billiardGateway.broadcastTableUpdate(table);
            }
        } else if (fullTransaction.cafeTableId) {
            const cafeTable = await this.cafeTableRepository.findOne({
                where: {
                    id: fullTransaction.cafeTableId
                }
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
    constructor(menuItemRepository, categoryRepository, orderItemRepository, cafeTableRepository, recipeRepository, dailySummaryRepository, transactionRepository, productFinanceRepository, inventoryService, kdsGateway, transactionService, billiardGateway, billiardService, promoService, reportService, shiftService, eventsGateway, dataSource, redisService, aiService){
        this.menuItemRepository = menuItemRepository;
        this.categoryRepository = categoryRepository;
        this.orderItemRepository = orderItemRepository;
        this.cafeTableRepository = cafeTableRepository;
        this.recipeRepository = recipeRepository;
        this.dailySummaryRepository = dailySummaryRepository;
        this.transactionRepository = transactionRepository;
        this.productFinanceRepository = productFinanceRepository;
        this.inventoryService = inventoryService;
        this.kdsGateway = kdsGateway;
        this.transactionService = transactionService;
        this.billiardGateway = billiardGateway;
        this.billiardService = billiardService;
        this.promoService = promoService;
        this.reportService = reportService;
        this.shiftService = shiftService;
        this.eventsGateway = eventsGateway;
        this.dataSource = dataSource;
        this.redisService = redisService;
        this.aiService = aiService;
        this.logger = new _common.Logger(CafeService.name);
        this.itemUpdating = new Set(); // key: orderItemId (mutex untuk status update)
    }
};
CafeService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_menuitementity.MenuItem)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_categoryentity.Category)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_orderitementity.OrderItem)),
    _ts_param(3, (0, _typeorm.InjectRepository)(_cafetableentity.CafeTable)),
    _ts_param(4, (0, _typeorm.InjectRepository)(_recipeentity.Recipe)),
    _ts_param(5, (0, _typeorm.InjectRepository)(_dailyordersummaryentity.DailyOrderSummary)),
    _ts_param(6, (0, _typeorm.InjectRepository)(_transactionentity.Transaction)),
    _ts_param(7, (0, _typeorm.InjectRepository)(_productfinanceentity.ProductFinance)),
    _ts_param(12, (0, _common.Inject)((0, _common.forwardRef)(()=>{
        const { BilliardService: BilliardService1 } = require('../billiard/billiard.service');
        return BilliardService1;
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
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _inventoryservice.InventoryService === "undefined" ? Object : _inventoryservice.InventoryService,
        typeof _kdsgateway.KdsGateway === "undefined" ? Object : _kdsgateway.KdsGateway,
        typeof _transactionservice.TransactionService === "undefined" ? Object : _transactionservice.TransactionService,
        typeof _billiardgateway.BilliardGateway === "undefined" ? Object : _billiardgateway.BilliardGateway,
        typeof BilliardService === "undefined" ? Object : BilliardService,
        typeof _promoservice.PromoService === "undefined" ? Object : _promoservice.PromoService,
        typeof _reportservice.ReportService === "undefined" ? Object : _reportservice.ReportService,
        typeof _shiftservice.ShiftService === "undefined" ? Object : _shiftservice.ShiftService,
        typeof _eventsgateway.EventsGateway === "undefined" ? Object : _eventsgateway.EventsGateway,
        typeof _typeorm1.DataSource === "undefined" ? Object : _typeorm1.DataSource,
        typeof _redisservice.RedisService === "undefined" ? Object : _redisservice.RedisService,
        typeof _aiservice.AIService === "undefined" ? Object : _aiservice.AIService
    ])
], CafeService);

//# sourceMappingURL=cafe.service.js.map