"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "InventoryService", {
    enumerable: true,
    get: function() {
        return InventoryService;
    }
});
const _common = require("@nestjs/common");
const _eventemitter = require("@nestjs/event-emitter");
const _approvalservice = require("../common/approval/approval.service");
const _approvalentity = require("../common/entities/approval.entity");
const _wasteentity = require("./entities/waste.entity");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _ingrediententity = require("./entities/ingredient.entity");
const _recipeentity = require("./entities/recipe.entity");
const _inventorygateway = require("./inventory.gateway");
const _promoservice = require("../promo/promo.service");
const _mqttservice = require("../mqtt/mqtt.service");
const _whatsappservice = require("../whatsapp/whatsapp.service");
const _settingsservice = require("../settings/settings.service");
const _supplierentity = require("./entities/supplier.entity");
const _stockinentity = require("./entities/stock-in.entity");
const _stockpaymententity = require("./entities/stock-payment.entity");
const _financeservice = require("../finance/finance.service");
const _cashflowentity = require("../finance/entities/cashflow.entity");
const _stockinstallmentplanentity = require("./entities/stock-installment-plan.entity");
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
let InventoryService = class InventoryService {
    async findAllSuppliers() {
        return this.supplierRepository.find({
            order: {
                name: 'ASC'
            }
        });
    }
    async createSupplier(data) {
        const supplier = this.supplierRepository.create(data);
        return this.supplierRepository.save(supplier);
    }
    async deleteSupplier(id) {
        return this.supplierRepository.delete(id);
    }
    async updateSupplier(id, data) {
        const supplier = await this.supplierRepository.findOne({
            where: {
                id
            }
        });
        if (!supplier) throw new _common.NotFoundException('Supplier not found');
        Object.assign(supplier, data);
        return this.supplierRepository.save(supplier);
    }
    async receiveStock(data) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const ingredient = await queryRunner.manager.findOne(_ingrediententity.Ingredient, {
                where: {
                    id: data.ingredientId
                }
            });
            if (!ingredient) throw new _common.NotFoundException('Ingredient not found');
            const totalCost = Number(data.quantity) * Number(data.purchasePrice);
            const paidAmount = Number(data.paidAmount || 0);
            // 1. Create StockIn record
            const stockIn = this.stockInRepository.create({
                ...data,
                unit: ingredient.unit,
                totalCost,
                paidAmount: paidAmount,
                paymentStatus: data.paymentStatus || (paidAmount >= totalCost ? _stockinentity.StockPaymentStatus.PAID : paidAmount > 0 ? _stockinentity.StockPaymentStatus.PARTIAL : _stockinentity.StockPaymentStatus.UNPAID)
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
                    moduleType: _approvalentity.ApprovalModuleType.STOCK_IN,
                    referenceId: savedStockIn.id,
                    requestedByUserId: data.receivedByUserId,
                    requiredLevels: [
                        ...config
                    ].sort((a, b)=>a - b),
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
                    notes: 'Cicilan Pertama / DP'
                });
                await queryRunner.manager.save(payment);
                // 3. Log to Cashflow if paid now
                await this.financeService.logCashflow({
                    amount: paidAmount,
                    type: _cashflowentity.CashflowType.OUT,
                    source: 'stock_purchase',
                    referenceId: savedStockIn.id.toString(),
                    description: `Pembelian stok: ${ingredient.name} (${data.invoiceNumber || 'No Inv'})`,
                    paymentMethod: data.paymentMethod || 'CASH',
                    shiftId: data.shiftId
                }, queryRunner.manager);
            }
            // 4. Update Ingredient Stock & Pricing
            await queryRunner.manager.update(_ingrediententity.Ingredient, data.ingredientId, {
                stockQuantity: Number(ingredient.stockQuantity) + Number(data.quantity),
                costPrice: Number(data.purchasePrice),
                lastPurchasePrice: Number(data.purchasePrice),
                lastPurchaseQuantity: Number(data.quantity),
                lastPurchaseUnit: ingredient.unit
            });
            // 5. Create Installment Plans if requested
            if (data.paymentStatus === _stockinentity.StockPaymentStatus.PARTIAL && data.installmentPlans && data.installmentPlans.length > 0) {
                for (const plan of data.installmentPlans){
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
            const updatedIng = await this.ingredientRepository.findOne({
                where: {
                    id: data.ingredientId
                }
            });
            if (updatedIng) {
                this.inventoryGateway.broadcastStockUpdate(updatedIng);
                this.eventEmitter.emit('inventory.update', updatedIng);
                this.broadcastAvailability();
            }
            return savedStockIn;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally{
            await queryRunner.release();
        }
    }
    async payInstallment(data) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const stockIn = await queryRunner.manager.findOne(_stockinentity.StockIn, {
                where: {
                    id: data.stockInId
                },
                relations: [
                    'ingredient'
                ]
            });
            if (!stockIn) throw new _common.NotFoundException('StockIn record not found');
            const amountToPay = Number(data.amount);
            const newPaidAmount = Number(stockIn.paidAmount) + amountToPay;
            const totalCost = Number(stockIn.totalCost);
            // 1. Create Payment Record
            const payment = this.stockPaymentRepository.create({
                ...data,
                notes: data.notes || 'Cicilan Pembayaran'
            });
            const savedPayment = await queryRunner.manager.save(payment);
            // 2. Update StockIn Status
            stockIn.paidAmount = newPaidAmount;
            if (newPaidAmount >= totalCost) {
                stockIn.paymentStatus = _stockinentity.StockPaymentStatus.PAID;
            } else {
                stockIn.paymentStatus = _stockinentity.StockPaymentStatus.PARTIAL;
            }
            await queryRunner.manager.save(stockIn);
            // 3. Sync Installment Plans (Auto-mark as paid based on cumulative paidAmount)
            const installmentPlans = await queryRunner.manager.find(_stockinstallmentplanentity.StockInstallmentPlan, {
                where: {
                    stockInId: data.stockInId,
                    isPaid: false
                },
                order: {
                    dueDate: 'ASC'
                }
            });
            let remainingPaidForPlans = Number(stockIn.paidAmount);
            for (const plan of installmentPlans){
                if (remainingPaidForPlans >= Number(plan.amount)) {
                    plan.isPaid = true;
                    plan.paidAt = new Date();
                    await queryRunner.manager.save(plan);
                    remainingPaidForPlans -= Number(plan.amount);
                } else {
                    break;
                }
            }
            // 4. Log Cashflow
            await this.financeService.logCashflow({
                amount: amountToPay,
                type: _cashflowentity.CashflowType.OUT,
                source: 'stock_purchase',
                referenceId: stockIn.id.toString(),
                description: `Cicilan stok: ${stockIn.ingredient?.name || 'Item'} (${stockIn.invoiceNumber || 'No Inv'})`,
                paymentMethod: data.paymentMethod,
                shiftId: data.shiftId
            }, queryRunner.manager);
            await queryRunner.commitTransaction();
            return savedPayment;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally{
            await queryRunner.release();
        }
    }
    async getPurchaseLedger(stockInId) {
        return this.stockPaymentRepository.find({
            where: {
                stockInId
            },
            relations: [
                'user'
            ],
            order: {
                paidAt: 'DESC'
            }
        });
    }
    async findAllStockIn() {
        return this.stockInRepository.find({
            relations: [
                'ingredient',
                'supplier',
                'receivedBy',
                'payments'
            ],
            order: {
                createdAt: 'DESC'
            },
            take: 100
        });
    }
    async getInventoryStats() {
        const ingredients = await this.ingredientRepository.find({
            where: {
                deletedAt: (0, _typeorm1.IsNull)()
            }
        });
        let totalAssetValue = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        const expiringSoon = [];
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        for (const ing of ingredients){
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
            expiringSoon: expiringSoon.sort((a, b)=>a.daysLeft - b.daysLeft).slice(0, 5)
        };
    }
    async getAllIngredients() {
        return this.ingredientRepository.find({
            where: {
                deletedAt: (0, _typeorm1.IsNull)()
            },
            order: {
                createdAt: 'DESC'
            }
        });
    }
    async getLowStockItems() {
        const ingredients = await this.ingredientRepository.find({
            where: {
                deletedAt: (0, _typeorm1.IsNull)()
            }
        });
        return ingredients.filter((ing)=>Number(ing.stockQuantity) <= Number(ing.minStockLevel));
    }
    async getMandatoryReportingItems() {
        const ingredients = await this.ingredientRepository.find({
            where: [
                {
                    isMandatoryReporting: true,
                    deletedAt: (0, _typeorm1.IsNull)()
                },
                {
                    isHighValue: true,
                    deletedAt: (0, _typeorm1.IsNull)()
                }
            ]
        });
        const menuItems = await this.dataSource.getRepository('MenuItem').find({
            where: [
                {
                    isMandatoryReporting: true,
                    deletedAt: (0, _typeorm1.IsNull)()
                },
                {
                    isHighValue: true,
                    deletedAt: (0, _typeorm1.IsNull)()
                }
            ]
        });
        return [
            ...ingredients.map((ing)=>({
                    ...ing,
                    type: 'INGREDIENT'
                })),
            ...menuItems.map((item)=>({
                    ...item,
                    type: 'MENU_ITEM'
                }))
        ];
    }
    async getUpcomingInstallments() {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const plans = await this.installmentPlanRepository.find({
            where: {
                isPaid: false,
                dueDate: (0, _typeorm1.LessThanOrEqual)(nextWeek)
            },
            relations: [
                'stockIn',
                'stockIn.ingredient',
                'stockIn.supplier'
            ],
            order: {
                dueDate: 'ASC'
            }
        });
        return plans.filter((p)=>p.stockIn?.paymentStatus !== _stockinentity.StockPaymentStatus.PAID);
    }
    async getAllUnpaidInstallments() {
        const plans = await this.installmentPlanRepository.find({
            where: {
                isPaid: false
            },
            relations: [
                'stockIn',
                'stockIn.ingredient',
                'stockIn.supplier'
            ],
            order: {
                dueDate: 'ASC'
            }
        });
        return plans.filter((p)=>p.stockIn?.paymentStatus !== _stockinentity.StockPaymentStatus.PAID);
    }
    async getNextSKU() {
        // Find the latest ingredient with an IG- pattern SKU
        const latestIngredient = await this.ingredientRepository.createQueryBuilder('ingredient').where('ingredient.sku LIKE :pattern', {
            pattern: 'IG-%'
        }).orderBy('ingredient.sku', 'DESC').getOne();
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
    async createIngredient(data) {
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
                sku: sku
            });
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
    async updateIngredient(id, data, userId, bypassApproval) {
        try {
            const settings = await this.settingsService.getSettings();
            const config = settings.approvalConfig?.DATA_EDIT;
            if (config && config.length > 0 && !bypassApproval && userId) {
                const oldIng = await this.ingredientRepository.findOne({
                    where: {
                        id
                    }
                });
                // Compute diff for accurate summary in Approval Center
                const changes = {};
                const fieldLabels = {
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
                    auditFrequency: 'Audit'
                };
                for (const key of Object.keys(fieldLabels)){
                    const oldVal = oldIng?.[key];
                    const newVal = data[key];
                    if (newVal === undefined) continue;
                    // Normalize for numeric comparison
                    const isNum = !isNaN(parseFloat(oldVal)) && isFinite(oldVal) && (typeof oldVal === 'number' || typeof oldVal === 'string' && oldVal.trim() !== '');
                    if (isNum) {
                        const isStockField = key === 'stockQuantity' || key === 'minStockLevel';
                        const finalOld = isStockField ? Math.round(Number(oldVal)) : Number(oldVal);
                        const finalNew = isStockField ? Math.round(Number(newVal)) : Number(newVal);
                        if (Math.abs(finalOld - finalNew) > 0.0001) {
                            changes[key] = {
                                old: finalOld,
                                new: finalNew
                            };
                        }
                    } else {
                        if (String(oldVal || '').trim() !== String(newVal || '').trim()) {
                            changes[key] = {
                                old: oldVal,
                                new: newVal
                            };
                        }
                    }
                }
                await this.approvalService.createRequest({
                    moduleType: _approvalentity.ApprovalModuleType.DATA_EDIT,
                    referenceId: id,
                    requestedByUserId: userId,
                    requiredLevels: [
                        ...config
                    ].sort((a, b)=>a - b),
                    metadata: {
                        entityType: 'INGREDIENT',
                        itemName: oldIng?.name || 'Unknown',
                        price: Number(oldIng?.costPrice || 0),
                        payload: data,
                        changes,
                        fieldLabels
                    }
                });
                return {
                    pendingApproval: true
                };
            }
            const ingredient = await this.ingredientRepository.findOne({
                where: {
                    id
                }
            });
            if (!ingredient) throw new _common.NotFoundException('Ingredient not found');
            Object.assign(ingredient, {
                ...data,
                stockQuantity: Number(data.stockQuantity || 0),
                minStockLevel: Number(data.minStockLevel || 0),
                yieldPercentage: Number(data.yieldPercentage || 100),
                costPrice: Number(data.costPrice || 0),
                sku: data.sku?.trim() || null
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
    async deleteIngredient(id) {
        const ingredient = await this.ingredientRepository.findOne({
            where: {
                id
            }
        });
        if (!ingredient) throw new _common.NotFoundException('Ingredient not found');
        // Rename to allow reuse of name/SKU if needed (optional but consistent with Table/Locker)
        const timestamp = Date.now();
        await this.ingredientRepository.update(id, {
            name: `${ingredient.name} (DELETED-${timestamp})`,
            sku: ingredient.sku ? `${ingredient.sku}-DEL-${timestamp}` : undefined
        });
        await this.ingredientRepository.softDelete(id);
    }
    async updateStock(id, quantity, type = 'subtract', userName, reason, manager, userId, bypassApproval) {
        const settings = await this.settingsService.getSettings();
        const config = settings.approvalConfig?.STOCK_UPDATE;
        console.log(`[DEBUG-APPROVAL] updateStock for ID: ${id}`);
        console.log(`[DEBUG-APPROVAL] Config: ${JSON.stringify(config)}`);
        console.log(`[DEBUG-APPROVAL] userId: ${userId}, bypass: ${bypassApproval}, manager: ${!!manager}`);
        const oldIng = await this.ingredientRepository.findOne({
            where: {
                id
            }
        });
        if (config && config.length > 0 && !bypassApproval && userId && !manager) {
            console.log(`[DEBUG-APPROVAL] >>> CREATING APPROVAL REQUEST`);
            await this.approvalService.createRequest({
                moduleType: _approvalentity.ApprovalModuleType.STOCK_UPDATE,
                referenceId: id,
                requestedByUserId: userId,
                requiredLevels: [
                    ...config
                ].sort((a, b)=>a - b),
                metadata: {
                    itemName: oldIng?.name,
                    quantity,
                    type,
                    reason,
                    userName,
                    stockBefore: Number(oldIng?.stockQuantity || 0),
                    stockAfter: type === 'add' ? Number(oldIng?.stockQuantity || 0) + Number(quantity) : Number(oldIng?.stockQuantity || 0) - Number(quantity),
                    category: oldIng?.category || 'Bahan Baku'
                }
            });
            return {
                pendingApproval: true
            };
        }
        const repo = manager ? manager.getRepository(_ingrediententity.Ingredient) : this.ingredientRepository;
        // 1. Fetch current for logging and audit purposes
        const ingredient = await repo.findOne({
            where: {
                id
            }
        });
        if (!ingredient) throw new _common.NotFoundException('Ingredient not found');
        const oldStock = Number(ingredient.stockQuantity);
        // 2. Perform ATOMIC update in DB (prevents race conditions)
        const sign = type === 'add' ? '+' : '-';
        if (manager) {
            await manager.createQueryBuilder().update(_ingrediententity.Ingredient).set({
                stockQuantity: ()=>`stockQuantity ${sign} ${quantity}`
            }).where('id = :id', {
                id
            }).execute();
        } else {
            await this.ingredientRepository.createQueryBuilder().update(_ingrediententity.Ingredient).set({
                stockQuantity: ()=>`stockQuantity ${sign} ${quantity}`
            }).where('id = :id', {
                id
            }).execute();
        }
        // 3. Fetch updated version to return
        const updated = await repo.findOne({
            where: {
                id
            }
        });
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
    async notifyLowStock(ingredient) {
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
    async setRecipe(menuItemId, recipes) {
        // Clear old recipes
        await this.recipeRepository.delete({
            menuItemId
        });
        for (const item of recipes){
            const recipe = this.recipeRepository.create({
                menuItemId,
                ingredientId: item.ingredientId,
                subMenuItemId: item.subMenuItemId,
                quantity: item.quantity,
                unit: item.unit
            });
            await this.recipeRepository.save(recipe);
        }
    }
    getConversionFactor(fromUnit, toUnit) {
        const units = {
            Gram: {
                Kg: 0.001,
                Gram: 1
            },
            Kg: {
                Gram: 1000,
                Kg: 1
            },
            Ml: {
                Liter: 0.001,
                Ml: 1
            },
            Liter: {
                Ml: 1000,
                Liter: 1
            }
        };
        if (units[fromUnit] && units[fromUnit][toUnit]) {
            return units[fromUnit][toUnit];
        }
        return 1; // Default no conversion (e.g., Pcs to Pcs)
    }
    /**
   * Recursive stock deduction logic
   */ async deductStock(menuItemId, orderQuantity, manager) {
        try {
            const menuRepo = manager ? manager.getRepository('MenuItem') : this.dataSource.getRepository('MenuItem');
            const recipeRepo = manager ? manager.getRepository(_recipeentity.Recipe) : this.recipeRepository;
            const menuItem = await menuRepo.findOne({
                where: {
                    id: menuItemId
                },
                relations: [
                    'category'
                ]
            });
            if (!menuItem) return;
            // 1. Handle STORE category (Direct Stock Deduction) - only if NO recipe
            const recipes = await recipeRepo.find({
                where: {
                    menuItemId
                },
                relations: [
                    'ingredient'
                ]
            });
            if (menuItem.category?.name?.toUpperCase() === 'STORE' && recipes.length === 0) {
                console.log(`Deducting direct stock for STORE item "${menuItem.name}" (Qty: ${orderQuantity})`);
                menuItem.stockQuantity = Number((Number(menuItem.stockQuantity) - orderQuantity).toFixed(3));
                await menuRepo.save(menuItem);
                this.broadcastAvailability();
                return;
            }
            // 2. Handle Recursive Recipe Deduction
            // (Recipes already loaded above)
            for (const recipe of recipes){
                if (recipe.ingredientId) {
                    if (!recipe.ingredient) continue;
                    const conversionFactor = this.getConversionFactor(recipe.unit, recipe.ingredient.unit);
                    const yieldFactor = (Number(recipe.ingredient.yieldPercentage) || 100) / 100;
                    const amountToDeduct = Number(recipe.quantity) * orderQuantity * conversionFactor / yieldFactor;
                    await this.updateStock(recipe.ingredientId, amountToDeduct, 'subtract', undefined, manager);
                } else if (recipe.subMenuItemId) {
                    await this.deductStock(recipe.subMenuItemId, Number(recipe.quantity) * orderQuantity, manager);
                }
            }
        } catch (error) {
            console.error(`Failed to deduct stock for MenuItem ${menuItemId}:`, error);
        }
    }
    /**
   * Calculates maximum portions for all menu items based on available ingredients or direct stock
   */ async getMenuAvailability() {
        const ingredients = await this.ingredientRepository.find();
        const recipes = await this.recipeRepository.find({
            relations: [
                'ingredient'
            ]
        });
        const bundles = await this.promoService.getMenuBundles();
        const allMenuItems = await this.dataSource.getRepository('MenuItem').find({
            relations: [
                'category'
            ]
        });
        const availability = {};
        const isCriticalMap = {};
        // 1. Calculate for STORE items (Direct Stock) - only if they DON'T have a recipe
        for (const menu of allMenuItems){
            if (!menu.isActive) {
                availability[menu.id] = -1;
                continue;
            }
            const hasRecipe = recipes.some((r)=>r.menuItemId === menu.id);
            if (!hasRecipe) {
                const stock = Number(menu.stockQuantity);
                const minStock = Number(menu.minStockLevel);
                availability[menu.id] = Math.max(0, Math.floor(stock));
                isCriticalMap[menu.id] = stock <= minStock;
            }
        }
        // 2. Calculate for regular recipe items
        const menuRecipes = {};
        recipes.forEach((r)=>{
            if (!menuRecipes[r.menuItemId]) menuRecipes[r.menuItemId] = [];
            menuRecipes[r.menuItemId].push(r);
        });
        for(const menuItemIdString in menuRecipes){
            const menuItemId = Number(menuItemIdString);
            if (availability[menuItemId] !== undefined) continue;
            const menuItem = allMenuItems.find((m)=>m.id === menuItemId);
            if (menuItem && !menuItem.isActive) {
                availability[menuItemId] = -1;
                continue;
            }
            const itemRecipes = menuRecipes[menuItemId];
            let maxPortions = Infinity;
            let isCritical = false;
            for (const re of itemRecipes){
                if (re.ingredientId && re.ingredient) {
                    const ing = re.ingredient;
                    const stock = Number(ing.stockQuantity);
                    const minStock = Number(ing.minStockLevel);
                    if (stock <= minStock) isCritical = true;
                    const conversionFactor = this.getConversionFactor(re.unit, re.ingredient.unit);
                    const yieldFactor = (Number(re.ingredient.yieldPercentage) || 100) / 100;
                    const requiredPerPortion = Number(re.quantity) * conversionFactor / yieldFactor;
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
        for (const promo of bundles){
            if (!promo.isActive) {
                availability[`PROMO_${promo.id}`] = -1;
                continue;
            }
            const rule = promo.ruleJson || {};
            const itemsToCheck = [
                ...rule.requireMenuItems || []
            ];
            let maxBundles = Infinity;
            let hasCriticalItem = false;
            for (const bi of itemsToCheck){
                if (isCriticalMap[bi.id]) hasCriticalItem = true;
                const itemPortions = availability[bi.id] ?? 999;
                const requiredPerBundle = Number(bi.quantity || 1);
                if (requiredPerBundle > 0) {
                    const possibleBundles = Math.floor(itemPortions / requiredPerBundle);
                    if (possibleBundles < maxBundles) maxBundles = possibleBundles;
                }
            }
            if (hasCriticalItem) maxBundles = 0;
            availability[`PROMO_${promo.id}`] = maxBundles === Infinity ? 999 : maxBundles;
        }
        return availability;
    }
    async broadcastAvailability() {
        try {
            const availability = await this.getMenuAvailability();
            console.log('Emitting menuAvailability to inventory namespace:', Object.keys(availability).length, 'items');
            this.inventoryGateway.broadcastMenuAvailability(availability);
            this.mqttService.broadcastMenuAvailability(availability);
        } catch (error) {
            console.error('Failed to broadcast availability:', error);
        }
    }
    /**
   * Recursive stock return logic (for cancellations)
   */ async returnStock(menuItemId, orderQuantity, manager) {
        try {
            const menuRepo = manager ? manager.getRepository('MenuItem') : this.dataSource.getRepository('MenuItem');
            const recipeRepo = manager ? manager.getRepository(_recipeentity.Recipe) : this.recipeRepository;
            const menuItem = await menuRepo.findOne({
                where: {
                    id: menuItemId
                },
                relations: [
                    'category'
                ]
            });
            if (!menuItem) return;
            // 1. Handle STORE category (Direct Stock Return) - only if NO recipe
            const recipes = await recipeRepo.find({
                where: {
                    menuItemId
                },
                relations: [
                    'ingredient'
                ]
            });
            if (menuItem.category?.name?.toUpperCase() === 'STORE' && recipes.length === 0) {
                menuItem.stockQuantity = Number((Number(menuItem.stockQuantity) + orderQuantity).toFixed(3));
                await menuRepo.save(menuItem);
                this.broadcastAvailability();
                return;
            }
            // 2. Handle Recursive Recipe Return
            // (Recipes already loaded above)
            for (const recipe of recipes){
                if (recipe.ingredientId) {
                    if (!recipe.ingredient) continue;
                    const conversionFactor = this.getConversionFactor(recipe.unit, recipe.ingredient.unit);
                    const yieldFactor = (Number(recipe.ingredient.yieldPercentage) || 100) / 100;
                    const amountToReturn = Number(recipe.quantity) * orderQuantity * conversionFactor / yieldFactor;
                    await this.updateStock(recipe.ingredientId, amountToReturn, 'add', undefined, manager);
                } else if (recipe.subMenuItemId) {
                    await this.returnStock(recipe.subMenuItemId, Number(recipe.quantity) * orderQuantity, manager);
                }
            }
        } catch (error) {
            console.error(`Failed to return stock for MenuItem ${menuItemId}:`, error);
        }
    }
    async declareWaste(data) {
        const ingredient = await this.ingredientRepository.findOne({
            where: {
                id: data.ingredientId
            }
        });
        if (!ingredient) throw new _common.NotFoundException('Ingredient not found');
        const valuation = Number(ingredient.costPrice || 0) * Number(data.quantity);
        const waste = this.wasteRepository.create({
            ...data,
            valuation,
            status: _wasteentity.WasteStatus.PENDING
        });
        const savedWaste = await this.wasteRepository.save(waste);
        // Dynamic Configured Approval Request
        const settings = await this.settingsService.getSettings();
        let requiredLevels = settings.approvalConfig?.WASTE;
        if (!requiredLevels || requiredLevels.length === 0) {
            requiredLevels = [
                2,
                3
            ]; // fallback safety
        }
        requiredLevels = [
            ...requiredLevels
        ].sort((a, b)=>a - b);
        await this.approvalService.createRequest({
            moduleType: _approvalentity.ApprovalModuleType.WASTE,
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
            }
        });
        return savedWaste;
    }
    async finalizeWaste(wasteId) {
        const waste = await this.wasteRepository.findOne({
            where: {
                id: wasteId
            },
            relations: [
                'ingredient'
            ]
        });
        if (!waste || waste.status !== _wasteentity.WasteStatus.PENDING) return;
        await this.updateStock(waste.ingredientId, Number(waste.quantity), 'subtract', 'SYSTEM', `Finalisasi Deklarasi Waste #${waste.id}`, undefined, undefined, true);
        waste.status = _wasteentity.WasteStatus.APPROVED;
        await this.wasteRepository.save(waste);
    }
    async finalizeStockUpdate(referenceId, metadata) {
        await this.updateStock(referenceId, metadata.quantity, metadata.type, metadata.userName || 'SYSTEM', (metadata.reason || 'Manual Adjust') + ' (Approved)', undefined, undefined, true);
    }
    async finalizeStockIn(referenceId) {
        const stockIn = await this.stockInRepository.findOne({
            where: {
                id: referenceId
            },
            relations: [
                'ingredient'
            ]
        });
        if (!stockIn) return;
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // 1. Update Ingredient Stock & Pricing
            await queryRunner.manager.update(_ingrediententity.Ingredient, stockIn.ingredientId, {
                stockQuantity: Number(stockIn.ingredient.stockQuantity) + Number(stockIn.quantity),
                costPrice: Number(stockIn.purchasePrice),
                lastPurchasePrice: Number(stockIn.purchasePrice),
                lastPurchaseQuantity: Number(stockIn.quantity),
                lastPurchaseUnit: stockIn.unit
            });
            // 2. Create Payment Record if DP provided
            if (Number(stockIn.paidAmount) > 0) {
                const payment = this.stockPaymentRepository.create({
                    stockInId: stockIn.id,
                    amount: stockIn.paidAmount,
                    paymentMethod: 'CASH',
                    userId: stockIn.receivedByUserId,
                    notes: 'Cicilan Pertama / DP (Approved)'
                });
                await queryRunner.manager.save(payment);
                // 3. Log to Cashflow
                await this.financeService.logCashflow({
                    amount: stockIn.paidAmount,
                    type: _cashflowentity.CashflowType.OUT,
                    source: 'stock_purchase',
                    referenceId: stockIn.id.toString(),
                    description: `Pembelian stok (Approved): ${stockIn.ingredient.name} (${stockIn.invoiceNumber || 'No Inv'})`,
                    paymentMethod: 'CASH'
                }, queryRunner.manager);
            }
            await queryRunner.commitTransaction();
            // Broadcast update
            const updated = await this.ingredientRepository.findOne({
                where: {
                    id: stockIn.ingredientId
                }
            });
            if (updated) {
                this.inventoryGateway.broadcastStockUpdate(updated);
                this.mqttService.broadcastInventoryUpdate(updated);
                this.eventEmitter.emit('inventory.update', updated);
            }
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally{
            await queryRunner.release();
        }
    }
    async finalizeDataEdit(referenceId, metadata) {
        if (metadata.entityType === 'INGREDIENT') {
            await this.updateIngredient(referenceId, metadata.payload, undefined, true);
        }
    }
    constructor(ingredientRepository, recipeRepository, wasteRepository, supplierRepository, stockInRepository, dataSource, inventoryGateway, promoService, reportService, mqttService, whatsappService, settingsService, approvalService, stockPaymentRepository, financeService, installmentPlanRepository, eventEmitter){
        this.ingredientRepository = ingredientRepository;
        this.recipeRepository = recipeRepository;
        this.wasteRepository = wasteRepository;
        this.supplierRepository = supplierRepository;
        this.stockInRepository = stockInRepository;
        this.dataSource = dataSource;
        this.inventoryGateway = inventoryGateway;
        this.promoService = promoService;
        this.reportService = reportService;
        this.mqttService = mqttService;
        this.whatsappService = whatsappService;
        this.settingsService = settingsService;
        this.approvalService = approvalService;
        this.stockPaymentRepository = stockPaymentRepository;
        this.financeService = financeService;
        this.installmentPlanRepository = installmentPlanRepository;
        this.eventEmitter = eventEmitter;
    }
};
InventoryService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_ingrediententity.Ingredient)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_recipeentity.Recipe)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_wasteentity.Waste)),
    _ts_param(3, (0, _typeorm.InjectRepository)(_supplierentity.Supplier)),
    _ts_param(4, (0, _typeorm.InjectRepository)(_stockinentity.StockIn)),
    _ts_param(8, (0, _common.Inject)((0, _common.forwardRef)(()=>{
        const { ReportService: ReportService1 } = require('../report/report.service');
        return ReportService1;
    }))),
    _ts_param(13, (0, _typeorm.InjectRepository)(_stockpaymententity.StockPayment)),
    _ts_param(14, (0, _common.Inject)((0, _common.forwardRef)(()=>_financeservice.FinanceService))),
    _ts_param(15, (0, _typeorm.InjectRepository)(_stockinstallmentplanentity.StockInstallmentPlan)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.DataSource === "undefined" ? Object : _typeorm1.DataSource,
        typeof _inventorygateway.InventoryGateway === "undefined" ? Object : _inventorygateway.InventoryGateway,
        typeof _promoservice.PromoService === "undefined" ? Object : _promoservice.PromoService,
        typeof ReportService === "undefined" ? Object : ReportService,
        typeof _mqttservice.MqttService === "undefined" ? Object : _mqttservice.MqttService,
        typeof _whatsappservice.WhatsAppService === "undefined" ? Object : _whatsappservice.WhatsAppService,
        typeof _settingsservice.SettingsService === "undefined" ? Object : _settingsservice.SettingsService,
        typeof _approvalservice.ApprovalService === "undefined" ? Object : _approvalservice.ApprovalService,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _financeservice.FinanceService === "undefined" ? Object : _financeservice.FinanceService,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _eventemitter.EventEmitter2 === "undefined" ? Object : _eventemitter.EventEmitter2
    ])
], InventoryService);

//# sourceMappingURL=inventory.service.js.map