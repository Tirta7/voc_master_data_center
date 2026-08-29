export interface Ingredient {
    id: number;
    name: string;
    unit: string;
    stockQuantity: number;
    minStockLevel: number;
    yieldPercentage: number;
    sku?: string;
    category?: string;
    costPrice?: number;
    description?: string;
    imageUrl?: string;
    lastPurchasePrice?: number;
    lastPurchaseQuantity?: number;
    lastPurchaseUnit?: string;
    department?: string;
    isHighValue?: boolean;
    isMandatoryReporting?: boolean;
    auditFrequency?: 'SHIFT' | 'DAILY' | 'WEEKLY';
    expiryDate?: string;
    isBatchTracked?: boolean;
    baseUnit?: string;
    displayUnit?: string;
    conversionFactor?: number;
    wasteThreshold?: number;
}

export interface IngredientBatch {
    id: number;
    ingredientId: number;
    stockInId?: number;
    batchNumber: string;
    initialQuantity: number;
    remainingQuantity: number;
    costPrice: number;
    status: 'AVAILABLE' | 'DEPLETED' | 'SCRAP';
    createdAt: string;
}

export interface Category {
    id: number;
    name: string;
    productionTarget: string;
    isActive: boolean;
    type?: 'MENU' | 'INGREDIENT' | 'BOTH';
}

export interface ProductFinance {
    id: number;
    menuItemId: number;
    baseHpp: number;
    targetMarginPercent: number;
    targetMarkupFixed: number;
    targetMarkupPercent: number;
    targetMultiplier: number;
    maxHppThreshold: number;
    pricingAdvice?: string;
}

export interface MenuItem {
    id: number;
    name: string;
    categoryId: number;
    category?: Category;
    productionTarget?: 'KDS' | 'BDS' | 'NONE';
    expiryDate?: string;
    price: number;
    discountPrice?: number;
    isDiscountActive?: boolean;
    sku?: string;
    description?: string;
    imageUrl?: string;
    taxPercentage?: number;
    isSubRecipe?: boolean;
    isActive?: boolean;
    stockQuantity?: number;
    minStockLevel?: number;
    recipes?: {
        ingredientId?: number;
        subMenuItemId?: number;
        quantity: number;
        unit: string;
        ingredient?: Ingredient;
        subMenuItem?: MenuItem;
    }[];
    productFinance?: ProductFinance;
    department?: string;
    isHighValue?: boolean;
    isMandatoryReporting?: boolean;
    auditFrequency?: 'SHIFT' | 'DAILY' | 'WEEKLY';
}
