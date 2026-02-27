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
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _ingrediententity = require("./entities/ingredient.entity");
const _recipeentity = require("./entities/recipe.entity");
const _inventorygateway = require("./inventory.gateway");
const _promoservice = require("../promo/promo.service");
const _reportservice = require("../report/report.service");
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
    async getAllIngredients() {
        return this.ingredientRepository.find({
            order: {
                createdAt: 'DESC'
            }
        });
    }
    async getLowStockItems() {
        const ingredients = await this.ingredientRepository.find();
        return ingredients.filter((ing)=>Number(ing.stockQuantity) <= Number(ing.minStockLevel));
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
    async updateIngredient(id, data) {
        try {
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
        const result = await this.ingredientRepository.delete(id);
        if (result.affected === 0) throw new _common.NotFoundException('Ingredient not found');
    }
    async updateStock(id, quantity, type = 'subtract', userName) {
        const ingredient = await this.ingredientRepository.findOne({
            where: {
                id
            }
        });
        if (!ingredient) throw new _common.NotFoundException('Ingredient not found');
        const oldStock = Number(ingredient.stockQuantity);
        if (type === 'add') {
            ingredient.stockQuantity = Number((Number(ingredient.stockQuantity) + quantity).toFixed(3));
        } else {
            ingredient.stockQuantity = Number((Number(ingredient.stockQuantity) - quantity).toFixed(3));
        }
        const updated = await this.ingredientRepository.save(ingredient);
        // Audit log if performed by a user (manual adjustment)
        if (userName) {
            const action = 'STOCK_ADJUSTMENT'; // Consistent with criticalActions in reportService
            const details = `${type === 'add' ? 'Penambahan' : 'Pengurangan'} stok manual untuk "${ingredient.name}" sebesar ${quantity} ${ingredient.unit}. Stok lama: ${oldStock} -> Baru: ${updated.stockQuantity}`;
            await this.reportService.logAction(action, userName, details);
        }
        // Broadcast full object update via socket
        console.log(`Broadcasting stock update for ingredient ${id}: ${updated.stockQuantity}`);
        this.inventoryGateway.broadcastStockUpdate(updated);
        // Also broadcast overall menu availability since it might have changed
        this.broadcastAvailability();
        return updated;
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
            'Gram': {
                'Kg': 0.001,
                'Gram': 1
            },
            'Kg': {
                'Gram': 1000,
                'Kg': 1
            },
            'Ml': {
                'Liter': 0.001,
                'Ml': 1
            },
            'Liter': {
                'Ml': 1000,
                'Liter': 1
            }
        };
        if (units[fromUnit] && units[fromUnit][toUnit]) {
            return units[fromUnit][toUnit];
        }
        return 1; // Default no conversion (e.g., Pcs to Pcs)
    }
    /**
     * Recursive stock deduction logic
     */ async deductStock(menuItemId, orderQuantity) {
        try {
            const menuItem = await this.dataSource.getRepository('MenuItem').findOne({
                where: {
                    id: menuItemId
                },
                relations: [
                    'category'
                ]
            });
            if (!menuItem) return;
            // 1. Handle STORE category (Direct Stock Deduction)
            if (menuItem.category?.name?.toUpperCase() === 'STORE') {
                console.log(`Deducting direct stock for STORE item "${menuItem.name}" (Qty: ${orderQuantity})`);
                menuItem.stockQuantity = Number((Number(menuItem.stockQuantity) - orderQuantity).toFixed(3));
                await this.dataSource.getRepository('MenuItem').save(menuItem);
                this.broadcastAvailability();
                return;
            }
            // 2. Handle Recursive Recipe Deduction
            const recipes = await this.recipeRepository.find({
                where: {
                    menuItemId
                },
                relations: [
                    'ingredient'
                ]
            });
            for (const recipe of recipes){
                if (recipe.ingredientId) {
                    if (!recipe.ingredient) continue;
                    const conversionFactor = this.getConversionFactor(recipe.unit, recipe.ingredient.unit);
                    const yieldFactor = (Number(recipe.ingredient.yieldPercentage) || 100) / 100;
                    const amountToDeduct = Number(recipe.quantity) * orderQuantity * conversionFactor / yieldFactor;
                    await this.updateStock(recipe.ingredientId, amountToDeduct, 'subtract');
                } else if (recipe.subMenuItemId) {
                    await this.deductStock(recipe.subMenuItemId, Number(recipe.quantity) * orderQuantity);
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
        // 1. Calculate for STORE items (Direct Stock)
        for (const menu of allMenuItems){
            if (menu.category?.name?.toUpperCase() === 'STORE') {
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
        } catch (error) {
            console.error('Failed to broadcast availability:', error);
        }
    }
    /**
     * Recursive stock return logic (for cancellations)
     */ async returnStock(menuItemId, orderQuantity) {
        try {
            const menuItem = await this.dataSource.getRepository('MenuItem').findOne({
                where: {
                    id: menuItemId
                },
                relations: [
                    'category'
                ]
            });
            if (!menuItem) return;
            // 1. Handle STORE category (Direct Stock Return)
            if (menuItem.category?.name?.toUpperCase() === 'STORE') {
                menuItem.stockQuantity = Number((Number(menuItem.stockQuantity) + orderQuantity).toFixed(3));
                await this.dataSource.getRepository('MenuItem').save(menuItem);
                this.broadcastAvailability();
                return;
            }
            // 2. Handle Recursive Recipe Return
            const recipes = await this.recipeRepository.find({
                where: {
                    menuItemId
                },
                relations: [
                    'ingredient'
                ]
            });
            for (const recipe of recipes){
                if (recipe.ingredientId) {
                    if (!recipe.ingredient) continue;
                    const conversionFactor = this.getConversionFactor(recipe.unit, recipe.ingredient.unit);
                    const yieldFactor = (Number(recipe.ingredient.yieldPercentage) || 100) / 100;
                    const amountToReturn = Number(recipe.quantity) * orderQuantity * conversionFactor / yieldFactor;
                    await this.updateStock(recipe.ingredientId, amountToReturn, 'add');
                } else if (recipe.subMenuItemId) {
                    await this.returnStock(recipe.subMenuItemId, Number(recipe.quantity) * orderQuantity);
                }
            }
        } catch (error) {
            console.error(`Failed to return stock for MenuItem ${menuItemId}:`, error);
        }
    }
    constructor(ingredientRepository, recipeRepository, dataSource, inventoryGateway, promoService, reportService){
        this.ingredientRepository = ingredientRepository;
        this.recipeRepository = recipeRepository;
        this.dataSource = dataSource;
        this.inventoryGateway = inventoryGateway;
        this.promoService = promoService;
        this.reportService = reportService;
    }
};
InventoryService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_ingrediententity.Ingredient)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_recipeentity.Recipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.DataSource === "undefined" ? Object : _typeorm1.DataSource,
        typeof _inventorygateway.InventoryGateway === "undefined" ? Object : _inventorygateway.InventoryGateway,
        typeof _promoservice.PromoService === "undefined" ? Object : _promoservice.PromoService,
        typeof _reportservice.ReportService === "undefined" ? Object : _reportservice.ReportService
    ])
], InventoryService);

//# sourceMappingURL=inventory.service.js.map