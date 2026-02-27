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
const _typeorm1 = require("typeorm");
const _menuitementity = require("./entities/menu-item.entity");
const _categoryentity = require("./entities/category.entity");
const _orderitementity = require("./entities/order-item.entity");
const _dailyordersummaryentity = require("./entities/daily-order-summary.entity");
const _inventoryservice = require("../inventory/inventory.service");
const _kdsgateway = require("../kds/kds/kds.gateway");
const _transactionservice = require("../transaction/transaction.service");
const _billiardgateway = require("../socket/billiard.gateway");
const _promoservice = require("../promo/promo.service");
const _reportservice = require("../report/report.service");
const _shiftservice = require("../finance/shift.service");
const _recipeentity = require("../inventory/entities/recipe.entity");
const _transactionentity = require("../transaction/entities/transaction.entity");
const _cafetableentity = require("../cafe-table/entities/cafe-table.entity");
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
        const items = await this.menuItemRepository.find({
            where: includeInactive ? {} : {
                isActive: true
            },
            relations: [
                'category',
                'recipes',
                'recipes.ingredient',
                'recipes.subMenuItem'
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
    async createMenuItem(data) {
        try {
            let sku = data.sku?.trim();
            if (!sku) {
                sku = await this.getNextSKU();
            }
            // Handle category if passed as a string (for seeder/older code)
            let category = data.category;
            if (typeof data.category === 'string') {
                const catName = data.category.trim();
                let catEntity = await this.categoryRepository.createQueryBuilder('cat').where('LOWER(cat.name) = LOWER(:catName)', {
                    catName
                }).getOne();
                if (!catEntity) {
                    // Auto-create category if it doesn't exist (helpful for seeder)
                    catEntity = this.categoryRepository.create({
                        name: catName,
                        productionTarget: _categoryentity.ProductionTarget.KITCHEN
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
                expiryDate: data.expiryDate || null
            });
            const saved = await this.menuItemRepository.save(item);
            return saved;
        } catch (error) {
            console.error('CREATE_MENU_ITEM_ERROR:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new _common.BadRequestException('Nama atau SKU menu sudah terdaftar.');
            }
            throw error;
        }
    }
    async updateMenuItem(id, data, userName) {
        try {
            const item = await this.menuItemRepository.findOne({
                where: {
                    id
                }
            });
            if (!item) throw new _common.NotFoundException('Menu item not found');
            const oldPrice = Number(item.price);
            const newPrice = data.price !== undefined ? Number(data.price) : oldPrice;
            if (userName && newPrice !== oldPrice) {
                await this.reportService.logAction('PRICE_CHANGE', userName, `Ubah harga menu "${item.name}" dari Rp ${oldPrice.toLocaleString()} ke Rp ${newPrice.toLocaleString()}`);
            }
            // Handle category if passed as a string
            let category = data.category;
            if (typeof data.category === 'string') {
                const catName = data.category.trim();
                let catEntity = await this.categoryRepository.createQueryBuilder('cat').where('LOWER(cat.name) = LOWER(:catName)', {
                    catName
                }).getOne();
                if (!catEntity) {
                    catEntity = this.categoryRepository.create({
                        name: catName,
                        productionTarget: _categoryentity.ProductionTarget.KITCHEN
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
                expiryDate: data.expiryDate !== undefined ? data.expiryDate || null : item.expiryDate
            });
            return await this.menuItemRepository.save(item);
        } catch (error) {
            console.error('UPDATE_MENU_ITEM_ERROR:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                throw new _common.BadRequestException('Nama atau SKU menu sudah terdaftar.');
            }
            throw error;
        }
    }
    async deleteMenuItem(id) {
        // 1. Check if used as sub-recipe for other items
        const usedInRecipes = await this.recipeRepository.count({
            where: {
                subMenuItemId: id
            }
        });
        if (usedInRecipes > 0) {
            throw new Error('Menu tidak bisa dihapus karena digunakan sebagai bahan (sub-resep) di menu lain.');
        }
        // 2. Check if it has order history
        const orderCount = await this.orderItemRepository.count({
            where: {
                menuItemId: id
            }
        });
        if (orderCount > 0) {
            // Soft delete: keep historical data by just making it inactive
            await this.menuItemRepository.update(id, {
                isActive: false
            });
        } else {
            // Hard delete: clean up recipes and remove the item
            await this.recipeRepository.delete({
                menuItemId: id
            });
            const result = await this.menuItemRepository.delete(id);
            if (result.affected === 0) throw new _common.NotFoundException('Menu item not found');
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
                'recipes.subMenuItem'
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
        // Preference 1: Override on MenuItem level
        if (item.productionTarget) return item.productionTarget;
        // Preference 2: Category setting
        if (item.category?.productionTarget) return item.category.productionTarget;
        // Default fallback (KITCHEN)
        return _categoryentity.ProductionTarget.KITCHEN;
    }
    /**
     * Process a customer order
     */ async processOrder(menuItems, tableId, transactionId, userId, userName) {
        const savedItemIds = [];
        const kdsItems = [];
        const bdsItems = [];
        // Always create/find a transaction so all orders (even walk-in) are persisted to DB
        let resolvedTransactionId = null;
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
            await this.transactionService.updateTransaction(walkinTransaction.id, {
                customerName: 'Takeaway'
            });
            resolvedTransactionId = walkinTransaction.id;
        }
        const itemsToProcess = [];
        for (const orderEntry of menuItems){
            if (orderEntry.promoId) {
                const promos = await this.promoService.getActivePromos();
                const promo = promos.find((p)=>p.id === orderEntry.promoId);
                if (promo) {
                    const rule = promo.ruleJson || {};
                    const bundlePrice = Number(rule.fixedPrice || 0);
                    const staticItems = rule.requireMenuItems || [];
                    const bestSellerCount = rule.bestSellerCount || 0;
                    // Generate a unique ID for this specific bundle instance
                    const bundleGroupId = `bundle-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                    // Fetch current best sellers if rule requires them
                    let resolvedItems = [
                        ...staticItems
                    ];
                    if (bestSellerCount > 0) {
                        const bestSellers = await this.reportService.getBestSellers(bestSellerCount);
                        resolvedItems = [
                            ...resolvedItems,
                            ...bestSellers.map((bs)=>({
                                    id: bs.id,
                                    quantity: 1,
                                    name: bs.name
                                }))
                        ];
                    }
                    // Add items from bundle
                    resolvedItems.forEach((bi, index)=>{
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
        for (const orderItem of itemsToProcess){
            const menuItem = await this.getMenuItemById(orderItem.id);
            // Deduct stock for this menu item (recursive)
            await this.inventoryService.deductStock(menuItem.id, orderItem.quantity);
            const station = this.getStation(menuItem);
            const isDirectSale = station === 'NONE';
            let savedItemId = null;
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
                    transactionId: resolvedTransactionId,
                    menuItemId: menuItem.id,
                    quantity: orderItem.quantity,
                    priceAtOrder: itemPrice,
                    status: isDirectSale ? _orderitementity.OrderItemStatus.DONE : _orderitementity.OrderItemStatus.QUEUED,
                    note: orderItem.note,
                    customName: orderItem.customName,
                    bundleGroupId: orderItem.bundleGroupId,
                    station: isDirectSale ? undefined : station.toString(),
                    createdByUserId: userId,
                    commissionUserId,
                    completedAt: isDirectSale ? new Date() : null
                };
                const item = this.orderItemRepository.create(itemToCreate);
                const saved = await this.orderItemRepository.save(item);
                savedItemId = saved.id;
                if (savedItemId) savedItemIds.push(savedItemId);
                if (userName) {
                    await this.reportService.logAction('ADD_ORDER_ITEM', userName, `Tambah pesanan: ${orderItem.quantity}x ${menuItem.name} ${orderItem.note ? `(Catatan: ${orderItem.note})` : ''}`, tableId, `TRX-${resolvedTransactionId}`);
                }
            }
            const itemDetail = {
                id: savedItemId,
                name: menuItem.name,
                quantity: orderItem.quantity,
                category: menuItem.category,
                note: orderItem.note,
                station
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
                    await this.transactionService.processMultiPayerPayment(tx.id, {
                        orderItemIds: savedItemIds,
                        payerName: tx.customerName || 'Member',
                        paymentMethod: 'MEMBER',
                        billiardPortion: 0
                    }, userId);
                } catch (err) {
                    console.error(`FAILED to auto-deduct member balance for cafe order:`, err);
                    if (err.status === 402 || err.message?.includes('Saldo tidak cukup')) {
                        this.billiardGateway.broadcastWarning('Saldo Kurang', `Gagal potong saldo otomatis untuk ${tx.customerName || 'Member'}. Saldo tidak cukup.`, tx.tableId || undefined);
                    }
                }
            }
            // Shared order ID prefix
            const baseOrderId = Math.random().toString(36).substr(2, 9).toUpperCase();
            // Fetch table name to show on KDS/BDS
            let tableName;
            if (transactionId && !tableId) {
                // Cafe-only table order: look up transaction to get cafeTable name
                const tx = await this.transactionRepository.findOne({
                    where: {
                        id: transactionId
                    },
                    relations: [
                        'cafeTable'
                    ]
                }).catch(()=>null);
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
                    orderId: `${baseOrderId}-K`
                });
            }
            // Emit to BDS station if there are drink items
            if (bdsItems.length > 0) {
                this.kdsGateway.sendNewOrder({
                    station: 'BDS',
                    items: bdsItems,
                    tableId,
                    tableName,
                    orderId: `${baseOrderId}-B`
                });
            }
            // Broadcast table update to ensure dashboard reflects new orders/bill
            await this.broadcastTableUpdateByTransactionId(resolvedTransactionId);
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
        }, {});
        return Object.values(grouped);
    }
    async updateOrderItemStatus(id, status, userId, userName) {
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
        const oldStatus = item.status;
        // --- HARDENED GUARDS ---
        // 1. Prevent updates if item is already DONE or CANCELLED (unless it's a very specific bypass)
        if (oldStatus === _orderitementity.OrderItemStatus.DONE || oldStatus === _orderitementity.OrderItemStatus.CANCELLED) {
            // Log and ignore to prevent race condition "re-processing"
            return item;
        }
        // 2. Prevent kitchen/bar from marking as DONE/PROCESSING if a cancellation is pending
        const isResolvingCancel = [
            _orderitementity.OrderItemStatus.CANCELLED,
            _orderitementity.OrderItemStatus.CANCEL_REJECTED
        ].includes(status);
        if (oldStatus === _orderitementity.OrderItemStatus.CANCEL_REQUESTED && !isResolvingCancel) {
            throw new _common.BadRequestException(`Gagal: Item ini sedang dalam permintaan pembatalan. Harap setujui atau tolak pembatalan terlebih dahulu.`);
        }
        item.status = status;
        const saved = await this.orderItemRepository.save(item);
        // If status changed to CANCELLED, return stock
        if (status === _orderitementity.OrderItemStatus.CANCELLED) {
            await this.inventoryService.returnStock(item.menuItemId, item.quantity);
            if (userName) {
                await this.reportService.logAction('CANCEL_ORDER_ITEM', userName, `Batal pesanan: ${item.quantity}x ${item.menuItem?.name} (Meja: ${item.transaction?.tableId || 'Cafe'})`, item.transaction?.tableId ?? undefined, `TRX-${item.transactionId}`);
            }
        }
        // Broadcast to KDS and Dashboard
        let station = item.station;
        if (!station) {
            station = this.getStation(item.menuItem);
        }
        // Update Daily Summary if completed
        if (status === _orderitementity.OrderItemStatus.DONE) {
            if (userId) item.completedByUserId = userId;
            item.completedAt = new Date();
            await this.orderItemRepository.save(item);
            await this.updateDailySummary(station, item.menuItem?.name || 'Unknown', item.quantity);
        }
        const updatePayload = {
            id: saved.id,
            status: saved.status,
            transactionId: saved.transactionId,
            station
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
                const cafeTable = await this.cafeTableRepository.findOneBy({
                    id: item.transaction.cafeTableId
                });
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
        if (item.status !== _orderitementity.OrderItemStatus.CANCEL_REQUESTED) {
            throw new _common.BadRequestException(`Gagal: Status item saat ini adalah ${item.status}, bukan CANCEL_REQUESTED.`);
        }
        item.status = _orderitementity.OrderItemStatus.CANCELLED;
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
        await this.reportService.logAction('CANCEL_CONFIRMED', user, `Konfirmasi pembatalan pesanan "${item.menuItem?.name || 'Unknown'}" (x${item.quantity}). Alasan awal: "${item.cancelReason || 'Tidak ada'}"`, item.transaction?.tableId ?? undefined, item.transaction?.invoiceNumber);
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
                'cafeTable'
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
    constructor(menuItemRepository, categoryRepository, orderItemRepository, cafeTableRepository, recipeRepository, dailySummaryRepository, transactionRepository, inventoryService, kdsGateway, transactionService, billiardGateway, billiardService, promoService, reportService, shiftService){
        this.menuItemRepository = menuItemRepository;
        this.categoryRepository = categoryRepository;
        this.orderItemRepository = orderItemRepository;
        this.cafeTableRepository = cafeTableRepository;
        this.recipeRepository = recipeRepository;
        this.dailySummaryRepository = dailySummaryRepository;
        this.transactionRepository = transactionRepository;
        this.inventoryService = inventoryService;
        this.kdsGateway = kdsGateway;
        this.transactionService = transactionService;
        this.billiardGateway = billiardGateway;
        this.billiardService = billiardService;
        this.promoService = promoService;
        this.reportService = reportService;
        this.shiftService = shiftService;
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
    _ts_param(11, (0, _common.Inject)((0, _common.forwardRef)(()=>{
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
        typeof _inventoryservice.InventoryService === "undefined" ? Object : _inventoryservice.InventoryService,
        typeof _kdsgateway.KdsGateway === "undefined" ? Object : _kdsgateway.KdsGateway,
        typeof _transactionservice.TransactionService === "undefined" ? Object : _transactionservice.TransactionService,
        typeof _billiardgateway.BilliardGateway === "undefined" ? Object : _billiardgateway.BilliardGateway,
        typeof BilliardService === "undefined" ? Object : BilliardService,
        typeof _promoservice.PromoService === "undefined" ? Object : _promoservice.PromoService,
        typeof _reportservice.ReportService === "undefined" ? Object : _reportservice.ReportService,
        typeof _shiftservice.ShiftService === "undefined" ? Object : _shiftservice.ShiftService
    ])
], CafeService);

//# sourceMappingURL=cafe.service.js.map