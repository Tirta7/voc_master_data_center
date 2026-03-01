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
}

export interface Category {
    id: number;
    name: string;
    productionTarget: 'KDS' | 'BDS' | 'NONE';
    isActive: boolean;
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
}
