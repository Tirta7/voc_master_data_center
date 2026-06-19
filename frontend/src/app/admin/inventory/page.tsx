'use client';

import React, { useState, useEffect, Suspense } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
    Box,
    Plus,
    Search,
    ChefHat,
    Package,
    Scale,
    Zap,
    ChevronRight,
    Database,
    ArrowUp,
    ArrowDown,
    Filter,
    MoreHorizontal,
    AlertTriangle,
    Trash2,
    X,
    Save,
    ArrowRight,
    HelpCircle,
    Info,
    AlertCircle,
    Edit2,
    DollarSign,
    User,
    ShieldOff,
    ShieldCheck,
    TrendingUp,
    History,
    Banknote,
    Tag,
    Layers,
    Monitor,
    Calendar,
    Image,
    ClipboardCheck,
    CalendarDays
} from 'lucide-react';
import InputField from '@/components/ui/InputField';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useMqtt } from '@/context/MqttContext';
import useSWR, { mutate } from 'swr';
import { useSearchParams } from 'next/navigation';
import { fetcher } from '@/lib/fetcher';

import { inventorySocket, socket } from '@/lib/socket';
import { Ingredient, Category, MenuItem } from './types';
import { CategoriesView } from './components/CategoriesView';
import { InventoryStockView } from './components/InventoryStockView';
import { RecipesView } from './components/RecipesView';
import { SuppliersView } from './components/SuppliersView';
import { StockAuditView } from './components/StockAuditView';
import { PurchaseHistoryView } from './components/PurchaseHistoryView';
import { StatCard } from './components/StatCard';
import { StockReportView } from './components/StockReportView';
import { MarginGuardView } from './components/MarginGuardView';
import { WasteDeclarationModal } from './components/WasteDeclarationModal';
import { ImportExcelModal } from './components/ImportExcelModal';
import { AIInsightsView } from './components/AIInsightsView';
import { InstallmentCalendarView } from './components/InstallmentCalendarView';
import { Brain, Truck } from 'lucide-react';

import { formatRupiah as fmt, formatCompact as fmtK } from '@/utils/formatUtils';
// import { API_URL } from '@/utils/urlUtils';
const getConversionFactor = (fromUnit: string, toUnit: string): number => {
    if (!fromUnit || !toUnit) return 1;
    if (fromUnit.toLowerCase() === toUnit.toLowerCase()) return 1;

    // Special handling for Portion (used in sub-recipes)
    if (fromUnit.toLowerCase() === 'portion') return 1;

    const units: Record<string, Record<string, number>> = {
        'Gram': { 'Kg': 0.001, 'Gram': 1 },
        'Kg': { 'Gram': 1000, 'Kg': 1 },
        'Ml': { 'Liter': 0.001, 'Ml': 1 },
        'Liter': { 'Ml': 1000, 'Liter': 1 },
    };
    if (units[fromUnit] && units[fromUnit][toUnit]) return units[fromUnit][toUnit];
    return 1;
};

function InventoryContent() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<'stock' | 'recipes' | 'categories' | 'report' | 'margin-guard' | 'ai' | 'suppliers' | 'audit' | 'purchase-history' | 'calendar'>('stock');
    
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'purchase-history' || tab === 'stock' || tab === 'recipes' || tab === 'categories' || tab === 'report' || tab === 'margin-guard' || tab === 'ai' || tab === 'suppliers' || tab === 'audit' || tab === 'calendar') {
            setActiveTab(tab as any);
        }
    }, [searchParams]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'ALL'>('ALL');
    const [showWasteModal, setShowWasteModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedIngCategory, setSelectedIngCategory] = useState<string>('ALL');
    
    // SWR Data Fetching
    const { data: ingredients, mutate: mutateIngredients, isLoading: loadingIngredients } = useSWR<Ingredient[]>('/inventory/ingredients', fetcher);
    const { data: menuItems, mutate: mutateMenu, isLoading: loadingMenu } = useSWR<MenuItem[]>('/cafe/menu?includeInactive=true', fetcher);
    const { data: categories, mutate: mutateCategories } = useSWR<Category[]>('/cafe/categories', fetcher);
    const { data: availability, mutate: mutateAvailability } = useSWR<any>('/inventory/menu-availability', fetcher);

    const isLoading = loadingIngredients || loadingMenu;
    const [searchTerm, setSearchTerm] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
    const [categoryTogglingIds, setCategoryTogglingIds] = useState<Set<number>>(new Set());
    const [filterMandatoryOnly, setFilterMandatoryOnly] = useState(false);
    const { hasPermission } = useAuth();
    const { subscribe } = useMqtt();

    // Form states
    const [showAddModal, setShowAddModal] = useState(false);
    const [newIngredient, setNewIngredient] = useState<any>({
        name: '',
        sku: '',
        category: 'Raw Material',
        unit: 'Gram',
        costPrice: '',
        purchasePrice: '',
        purchaseQuantity: 1,
        purchaseUnit: 'Gram',
        stockQuantity: '',
        minStockLevel: '',
        yieldPercentage: 100,
        description: '',
        imageUrl: '',
        department: 'CASHIER',
        isHighValue: false,
        auditFrequency: 'SHIFT',
        expiryDate: '',
        isBatchTracked: false,
        baseUnit: '',
        displayUnit: '',
        conversionFactor: '',
        wasteThreshold: ''
    });

    const resetIngredientForm = () => {
        setNewIngredient({
            name: '',
            sku: '',
            category: 'Raw Material',
            unit: 'Gram',
            costPrice: '',
            purchasePrice: '',
            purchaseQuantity: 1,
            purchaseUnit: 'Gram',
            stockQuantity: '',
            minStockLevel: '',
            yieldPercentage: 100,
            description: '',
            imageUrl: '',
            department: 'CASHIER',
            isHighValue: false,
            auditFrequency: 'SHIFT',
            expiryDate: '',
            isBatchTracked: false,
            baseUnit: '',
            displayUnit: '',
            conversionFactor: '',
            wasteThreshold: ''
        });
        setEditingIngredient(null);
        setLastSavedIngredient(null);
    };

    // Menu & Recipe Modal States
    const [showAddMenuModal, setShowAddMenuModal] = useState(false);
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
    const [newMenu, setNewMenu] = useState<any>({
        name: '',
        sku: '',
        categoryId: '',
        productionTarget: '', // Optional override
        expiryDate: '',
        price: '',
        taxPercentage: '',
        stockQuantity: '',
        minStockLevel: '',
        description: '',
        imageUrl: '',
        productFinance: {
            baseHpp: 0,
            targetMarginPercent: 35,
            targetMarkupFixed: 0,
            targetMarkupPercent: 0,
            targetMultiplier: 3,
            maxHppThreshold: 35,
            pricingAdvice: ''
        },
        _calcMethod: 'margin',
        department: 'CASHIER',
        isHighValue: false,
        auditFrequency: 'SHIFT'
    });
    const resetMenuForm = () => {
        setNewMenu({
            name: '',
            sku: '',
            categoryId: '',
            productionTarget: '',
            expiryDate: '',
            price: '',
            taxPercentage: '',
            stockQuantity: '',
            minStockLevel: '',
            description: '',
            imageUrl: '',
            productFinance: {
                baseHpp: 0,
                targetMarginPercent: 35,
                targetMarkupFixed: 0,
                targetMarkupPercent: 0,
                targetMultiplier: 3,
                maxHppThreshold: 35,
                pricingAdvice: ''
            },
            _calcMethod: 'margin',
            department: 'CASHIER',
            isHighValue: false,
            auditFrequency: 'SHIFT'
        });
        setEditingMenu(null);
        setLastSavedMenu(null);
    };

    const openAddMenuModal = () => {
        resetMenuForm();
        setShowAddMenuModal(true);
    };

    const openAddIngredientModal = () => {
        resetIngredientForm();
        setShowAddModal(true);
    };

    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
    const [lastSavedIngredient, setLastSavedIngredient] = useState<any>(null);
    const [lastSavedMenu, setLastSavedMenu] = useState<any>(null);
    const [originalRecipeIngredients, setOriginalRecipeIngredients] = useState<any[]>([]);
    const [recipeIngredients, setRecipeIngredients] = useState<{ ingredientId?: number, subMenuItemId?: number, quantity: number, unit: string }[]>([]);

    // Category Management States
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [newCategory, setNewCategory] = useState<any>({
        name: '',
        productionTarget: 'KDS',
        isActive: true,
        type: 'MENU'
    });

    useBodyScrollLock(showAddModal || showAddMenuModal || showRecipeModal || showCategoryModal || showImportModal);

    useEffect(() => {
        const onInventoryUpdate = (data: Ingredient) => {
            console.log('Inventory data updated via real-time channel:', data);
            mutateIngredients();
            mutateMenu(); 
            mutateAvailability();
        };

        const onMenuAvailability = (data: any) => {
            console.log('Menu availability updated via WebSocket:', data);
            mutateMenu();
            mutateAvailability();
        };

        // WebSocket Channel
        inventorySocket.on('inventoryUpdate', onInventoryUpdate);
        socket.on('menuAvailability', onMenuAvailability);

        const unsubs = [
            subscribe('billiard/inventory/update', (data) => onInventoryUpdate(data)),
            subscribe('billiard/menu/availability', (data) => {
                console.log('Menu availability updated via MQTT:', data);
                mutateMenu();
                mutateAvailability();
            })
        ];

        return () => {
            inventorySocket.off('inventoryUpdate', onInventoryUpdate);
            socket.off('menuAvailability', onMenuAvailability);
            unsubs.forEach(u => u());
        };
    }, [subscribe, socket, mutateIngredients, mutateMenu]);

    // Initial fetch is handled by SWR
    const fetchData = async () => {
        await Promise.all([
            mutateIngredients(),
            mutateMenu(),
            mutateCategories(),
            mutateAvailability()
        ]);
    };

    const recalculateHPP = (updates: any) => {
        setNewIngredient((prev: any) => {
            const merged = { ...prev, ...updates };
            const pPrice = Number(merged.purchasePrice) || 0;
            const pQty = Number(merged.purchaseQuantity) || 1;
            const pUnit = merged.purchaseUnit;
            const baseUnit = merged.unit;
            const yieldVal = Number(merged.yieldPercentage) || 100;

            const factor = getConversionFactor(pUnit, baseUnit);
            let baseCost = (pPrice / (pQty * factor)) / (yieldVal / 100);
            if (isNaN(baseCost) || !isFinite(baseCost)) baseCost = 0;

            return { ...merged, costPrice: baseCost };
        });
    };

    const handleAddIngredient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Sanitize data: ensure expiryDate is null if empty string, and numbers are correctly typed
            const payload = {
                ...newIngredient,
                expiryDate: newIngredient.expiryDate || null,
                costPrice: Number(newIngredient.costPrice || 0),
                stockQuantity: Number(newIngredient.stockQuantity || 0),
                minStockLevel: Number(newIngredient.minStockLevel || 0),
                yieldPercentage: Number(newIngredient.yieldPercentage || 100),
                isBatchTracked: newIngredient.isBatchTracked,
                baseUnit: newIngredient.baseUnit,
                displayUnit: newIngredient.displayUnit,
                conversionFactor: Number(newIngredient.conversionFactor || 0),
                wasteThreshold: Number(newIngredient.wasteThreshold || 0)
            };

            let res;
            if (editingIngredient) {
                res = await axios.patch(`/inventory/ingredients/${editingIngredient.id}`, payload);
            } else {
                res = await axios.post(`/inventory/ingredients`, payload);
            }

            if (res?.data?.pendingApproval) {
                alert('Tindakan ini memerlukan Otorisasi. Permintaan Anda telah dimasukkan ke dalam Antrean [Approval Center]. Data tidak akan berubah sampai Manajer menyetujuinya.');
            } else {
                alert('Berhasil menyimpan bahan baku!');
            }

            setShowAddModal(false);
            resetIngredientForm();
            fetchData();
        } catch (error: any) {
            const serverMessage = error.response?.data?.message || error.message;
            alert(serverMessage || (editingIngredient ? 'Gagal update bahan baku' : 'Gagal menambah bahan baku'));
        }
    };

    const openEditModal = (ing: Ingredient) => {
        setEditingIngredient(ing);
        setNewIngredient({
            name: ing.name,
            sku: ing.sku || '',
            category: ing.category || 'Raw Material',
            unit: ing.unit,
            costPrice: Number(ing.costPrice),
            stockQuantity: Number(ing.stockQuantity),
            minStockLevel: Number(ing.minStockLevel),
            yieldPercentage: Number(ing.yieldPercentage),
            description: ing.description || '',
            imageUrl: ing.imageUrl || '',
            department: ing.department || 'CASHIER',
            isHighValue: !!ing.isHighValue,
            isMandatoryReporting: !!ing.isMandatoryReporting,
            auditFrequency: ing.auditFrequency || 'SHIFT',
            expiryDate: ing.expiryDate ? new Date(ing.expiryDate).toISOString().split('T')[0] : '',
            isBatchTracked: !!ing.isBatchTracked,
            baseUnit: ing.baseUnit || '',
            displayUnit: ing.displayUnit || '',
            conversionFactor: ing.conversionFactor || '',
            wasteThreshold: ing.wasteThreshold || ''
        });
        setLastSavedIngredient({
            name: ing.name,
            sku: ing.sku || '',
            category: ing.category || 'Raw Material',
            unit: ing.unit,
            costPrice: Number(ing.costPrice),
            stockQuantity: Number(ing.stockQuantity),
            minStockLevel: Number(ing.minStockLevel),
            yieldPercentage: Number(ing.yieldPercentage),
            description: ing.description || '',
            imageUrl: ing.imageUrl || '',
            department: ing.department || 'CASHIER',
            isHighValue: !!ing.isHighValue,
            isMandatoryReporting: !!ing.isMandatoryReporting,
            auditFrequency: ing.auditFrequency || 'SHIFT',
            expiryDate: ing.expiryDate ? new Date(ing.expiryDate).toISOString().split('T')[0] : '',
            isBatchTracked: !!ing.isBatchTracked,
            baseUnit: ing.baseUnit || '',
            displayUnit: ing.displayUnit || '',
            conversionFactor: ing.conversionFactor || '',
            wasteThreshold: ing.wasteThreshold || ''
        });
        setShowAddModal(true);
    };

    const handleDeleteIngredient = async (id: number) => {
        if (!confirm('Apakah Anda yakin ingin menghapus bahan baku ini? Formula resep yang menggunakan bahan ini mungkin akan terpengaruh.')) return;
        try {
            await axios.delete(`/inventory/ingredients/${id}`);
            fetchData();
        } catch (error) {
            alert('Gagal menghapus bahan baku');
        }
    };

    const updateStock = async (id: number, quantity: number, type: 'add' | 'subtract', reason: string) => {
        try {
            const res = await axios.patch(`/inventory/ingredients/${id}/stock`, { quantity, type, reason });
            if (res.data?.pendingApproval) {
                alert('Tindakan ini memerlukan Otorisasi. Permintaan Update Stock telah dimasukkan ke dalam Antrean [Approval Center].');
            } else {
                alert('Stok berhasil diperbarui.');
            }
            fetchData();
        } catch (error) {
            alert('Gagal update stok');
        }
    };

    const handleAddMenu = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const menuData = {
                ...newMenu,
                price: Number(newMenu.price),
                taxPercentage: Number(newMenu.taxPercentage || 0),
                stockQuantity: newMenu.stockQuantity ? Math.round(Number(newMenu.stockQuantity)) : 0,
                minStockLevel: newMenu.minStockLevel ? Math.round(Number(newMenu.minStockLevel)) : 0,
                categoryId: Number(newMenu.categoryId),
                productFinance: newMenu.productFinance,
                department: newMenu.department,
                isHighValue: newMenu.isHighValue,
                expiryDate: newMenu.expiryDate || null
            };

            if (editingMenu) {
                const res = await axios.patch(`/cafe/menu/${editingMenu.id}`, menuData);
                if (res.data?.pendingApproval) {
                    alert('Tindakan ini memerlukan Otorisasi. Permintaan Perubahan Menu telah dimasukkan ke dalam Antrean [Approval Center].');
                } else {
                    alert('Menu berhasil diperbarui.');
                }
            } else {
                await axios.post(`/cafe/menu`, menuData);
                alert('Menu berhasil ditambahkan.');
            }
            setShowAddMenuModal(false);
            resetMenuForm();
            fetchData();
        } catch (error: any) {
            const serverMessage = error.response?.data?.message || error.message;
            alert(serverMessage || (editingMenu ? 'Gagal update menu' : 'Gagal menambah menu'));
        }
    };

    const openEditMenuModal = (menu: MenuItem) => {
        setEditingMenu(menu);
        
        // Sync stock & min stock from recipe/availability if exists
        const currentRealStock = availability?.[menu.id] !== undefined ? availability[menu.id] : (menu.stockQuantity || 0);
        
        let syncedMinStock = menu.minStockLevel || 0;
        if (menu.recipes && menu.recipes.length > 0) {
            const mainRecipe = menu.recipes[0];
            if (mainRecipe.ingredient) {
                syncedMinStock = mainRecipe.ingredient.minStockLevel;
            }
        }

        const menuFinance = menu.productFinance || {
            baseHpp: 0,
            targetMarginPercent: 35,
            targetMarkupFixed: 0,
            targetMarkupPercent: 0,
            targetMultiplier: 3,
            maxHppThreshold: 35,
            pricingAdvice: ''
        };

        setNewMenu({
            name: menu.name,
            sku: menu.sku || '',
            categoryId: menu.categoryId.toString(),
            productionTarget: menu.productionTarget || '',
            expiryDate: menu.expiryDate ? new Date(menu.expiryDate).toISOString().split('T')[0] : '',
            price: Math.round(Number(menu.price)).toString(),
            taxPercentage: menu.taxPercentage?.toString() || '0',
            stockQuantity: Math.round(Number(currentRealStock)).toString(),
            minStockLevel: Math.round(Number(syncedMinStock)).toString(),
            description: menu.description || '',
            imageUrl: menu.imageUrl || '',
            productFinance: menuFinance,
            department: menu.department || 'CASHIER',
            isHighValue: !!menu.isHighValue,
            isMandatoryReporting: !!menu.isMandatoryReporting,
            auditFrequency: menu.auditFrequency || 'SHIFT'
        });

        setLastSavedMenu({
            name: menu.name,
            sku: menu.sku || '',
            categoryId: menu.categoryId.toString(),
            productionTarget: menu.productionTarget || '',
            expiryDate: menu.expiryDate ? new Date(menu.expiryDate).toISOString().split('T')[0] : '',
            price: menu.price.toString(),
            taxPercentage: menu.taxPercentage?.toString() || '0',
            stockQuantity: menu.stockQuantity?.toString() || '0',
            minStockLevel: menu.minStockLevel?.toString() || '0',
            description: menu.description || '',
            imageUrl: menu.imageUrl || '',
            productFinance: menuFinance,
            department: menu.department || 'CASHIER',
            isHighValue: !!menu.isHighValue,
            isMandatoryReporting: !!menu.isMandatoryReporting,
            auditFrequency: menu.auditFrequency || 'SHIFT'
        });
        setShowAddMenuModal(true);
    };

    const handleToggleMenuItemActive = async (menu: MenuItem) => {
        if (togglingIds.has(menu.id)) return;
        
        const newStatus = menu.isActive === false ? true : false;
        setTogglingIds(prev => new Set(prev).add(menu.id));
        
        try {
            const res = await axios.patch(`/cafe/menu/${menu.id}`, { isActive: newStatus });
            
            if (res.data?.pendingApproval) {
                alert('Tindakan ini memerlukan Otorisasi. Permintaan perubahan status menu telah dimasukkan ke dalam Antrean [Approval Center].');
            } else {
                // Success feedback
                const statusText = newStatus ? 'DIAKTIFKAN' : 'DINONAKTIFKAN';
                alert(`Menu "${menu.name}" berhasil ${statusText}.`);
            }
            
            await fetchData();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Gagal mengubah status menu');
        } finally {
            setTogglingIds(prev => {
                const next = new Set(prev);
                next.delete(menu.id);
                return next;
            });
        }
    };

    const handleToggleCategoryActive = async (cat: Category) => {
        if (categoryTogglingIds.has(cat.id)) return;
        
        const newStatus = cat.isActive === false ? true : false;
        setCategoryTogglingIds(prev => new Set(prev).add(cat.id));
        
        try {
            const res = await axios.patch(`/cafe/categories/${cat.id}`, { isActive: newStatus });
            if (res.data?.pendingApproval) {
                alert('Tindakan ini memerlukan Otorisasi. Permintaan perubahan status kategori telah dimasukkan ke dalam Antrean [Approval Center].');
            } else {
                alert(`Kategori "${cat.name}" berhasil ${newStatus ? 'DIAKTIFKAN' : 'DINONAKTIFKAN'}.`);
            }
            await fetchData();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Gagal mengubah status kategori');
        } finally {
            setCategoryTogglingIds(prev => {
                const next = new Set(prev);
                next.delete(cat.id);
                return next;
            });
        }
    };

    const handleDeleteMenu = async (id: number) => {
        if (!confirm('Apakah Anda yakin ingin menghapus menu ini? Formula resep untuk menu ini juga akan ikut terhapus.')) return;
        try {
            const response = await axios.delete(`/cafe/menu/${id}`);
            const { mode, message } = response.data;
            
            if (mode === 'soft') {
                alert(message);
            }
            
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Gagal menghapus menu');
        }
    };

    const handleUpdateRecipes = async () => {
        if (!selectedMenu) return;
        try {
            // Clean up recipes: ensure ingredientId/subMenuItemId are present and quantity > 0
            const validRecipes = recipeIngredients.filter(r => (r.ingredientId || r.subMenuItemId) && Number(r.quantity) > 0);

            await axios.put(`/cafe/menu/${selectedMenu.id}/recipes`, {
                recipes: validRecipes.map(r => ({
                    ...r,
                    ingredientId: r.ingredientId ? Number(r.ingredientId) : null,
                    subMenuItemId: r.subMenuItemId ? Number(r.subMenuItemId) : null,
                    quantity: Number(r.quantity)
                })) as any
            });

            // Also update menu price and finance
            const res = await axios.patch(`/cafe/menu/${selectedMenu.id}`, {
                price: Number(selectedMenu.price),
                productFinance: selectedMenu.productFinance
            } as any);

            if (res.data?.pendingApproval) {
                alert('Formula berhasil dikirim, namun Perubahan Harga/Finansial memerlukan Otorisasi [Approval Center].');
            } else {
                alert('Formula resep berhasil diperbarui');
            }
            setShowRecipeModal(false);
            fetchData();
        } catch (error: any) {
            console.error('RECIPE_UPDATE_ERROR:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
            alert(`Gagal update formula: ${errorMsg}`);
        }
    };

    const handleCategoryAction = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await axios.patch(`/cafe/categories/${editingCategory.id}`, newCategory);
            } else {
                await axios.post(`/cafe/categories`, newCategory);
            }
            setShowCategoryModal(false);
            setEditingCategory(null);
            setNewCategory({ name: '', productionTarget: 'KDS', isActive: true });
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Gagal menyimpan kategori');
        }
    };

    const handleDeleteCategory = async (id: number) => {
        if (!confirm('Hapus kategori ini? Item menu dalam kategori ini akan kehilangan relasi kategori.')) return;
        try {
            await axios.delete(`/cafe/categories/${id}`);
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Gagal menghapus kategori');
        }
    };

    const openRecipeModal = (menu: MenuItem) => {
        setSelectedMenu({
            ...menu,
            _calcMethod: 'margin' // Default transient method
        } as any);
        const mappedRecipes = (menu.recipes || []).map((r: any) => ({
            ingredientId: r.ingredientId || undefined,
            subMenuItemId: r.subMenuItemId || undefined,
            quantity: Number(r.quantity),
            unit: r.unit
        }));
        setRecipeIngredients(mappedRecipes);
        setOriginalRecipeIngredients(mappedRecipes);
        setShowRecipeModal(true);
    };

    const filteredIngredients = (ingredients || []).filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedIngCategory === 'ALL' || i.category === selectedIngCategory;
        const matchesMandatory = !filterMandatoryOnly || (i.isHighValue || i.isMandatoryReporting);
        return matchesSearch && matchesCategory && matchesMandatory;
    });

    const filteredMenu = (menuItems || []).filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategoryId === 'ALL' || m.categoryId === selectedCategoryId;
        const matchesMandatory = !filterMandatoryOnly || (m.isHighValue || m.isMandatoryReporting);
        return matchesSearch && matchesCategory && matchesMandatory;
    });

    const { data: serverStats } = useSWR<any>('/inventory/stats', fetcher);
    const { data: history } = useSWR<any[]>('/inventory/stock-in', fetcher);

    const stats = {
        totalItems: serverStats?.totalItems || (ingredients || []).length,
        criticalStock: serverStats?.lowStockCount || (ingredients || []).filter(i => Number(i.stockQuantity) <= Number(i.minStockLevel)).length,
        mandatoryReports: (ingredients || []).filter(i => i.isHighValue || i.isMandatoryReporting).length + (menuItems || []).filter(m => m.isHighValue || m.isMandatoryReporting).length,
        valuation: fmt(serverStats?.totalAssetValue || (ingredients || []).reduce((acc, curr) => acc + (Number(curr.stockQuantity) * Number(curr.costPrice || 0)), 0))
    };

    if (!hasPermission('INV_VIEW')) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-10 text-center">
                <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mb-6 border-2 border-rose-100 shadow-xl shadow-rose-100/50">
                    <ShieldOff className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter uppercase">Akses Terbatas</h2>
                <p className="text-slate-500 max-w-md font-medium leading-relaxed">
                    Maaf, akun Anda tidak memiliki izin untuk melihat data inventaris.
                    Silakan hubungi Administrator untuk mendapatkan akses.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 w-full overflow-x-hidden p-0 md:p-8 lg:p-10 flex flex-col">
            <div className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-0">
                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-800 via-indigo-700 to-slate-900 rounded-3xl p-6 lg:p-10 text-white shadow-2xl shadow-indigo-200 mb-6 md:mb-10">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12" />
                    <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <Box className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Resource Management</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Inventory & ERP</h1>
                            <p className="text-white/60 text-sm font-semibold mt-1">Kelola stok bahan baku dan formula resep secara terintegrasi</p>
                        </div>

                        {/* Modern Tabs - Scrollable on mobile */}
                        <div className="bg-white/10 backdrop-blur-sm p-1.5 rounded-2xl border border-white/20 flex overflow-x-auto whitespace-nowrap scrollbar-hide self-start lg:self-auto w-full lg:w-auto gap-1 pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                            <button
                                onClick={() => { setActiveTab('stock'); setSelectedIngCategory('ALL'); }}
                                className={`flex-shrink-0 flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'stock'
                                    ? 'bg-white text-indigo-700 shadow-md'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <Package className="w-4 h-4" /> Stock
                            </button>
                            <button
                                onClick={() => { setActiveTab('recipes'); setSelectedCategoryId('ALL'); }}
                                className={`flex-shrink-0 flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'recipes'
                                    ? 'bg-white text-indigo-700 shadow-md'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <ChefHat className="w-4 h-4" /> Recipe
                            </button>
                            <button
                                onClick={() => setActiveTab('categories')}
                                className={`flex-shrink-0 flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'categories'
                                    ? 'bg-white text-indigo-700 shadow-md'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <Zap className="w-4 h-4" /> Category
                            </button>
                            <button
                                onClick={() => setActiveTab('margin-guard')}
                                className={`flex-shrink-0 flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'margin-guard'
                                    ? 'bg-white text-indigo-700 shadow-md'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <ShieldOff className="w-4 h-4" /> Margin Guard
                            </button>
                            <button
                                onClick={() => setActiveTab('calendar')}
                                className={`flex-shrink-0 flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'calendar'
                                    ? 'bg-white text-indigo-700 shadow-md'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <CalendarDays className="w-4 h-4" /> Calendar
                            </button>
                            <button
                                onClick={() => setActiveTab('ai')}
                                className={`flex-shrink-0 flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'ai'
                                    ? 'bg-rose-500 text-white shadow-md'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <Brain className="w-4 h-4" /> AI Neural
                            </button>
                            <button
                                onClick={() => setActiveTab('suppliers')}
                                className={`flex-shrink-0 flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'suppliers'
                                    ? 'bg-white text-indigo-700 shadow-md'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <Truck className="w-4 h-4" /> Suppliers
                            </button>
                            <button
                                onClick={() => setActiveTab('audit')}
                                className={`flex-shrink-0 flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'audit'
                                    ? 'bg-white text-indigo-700 shadow-md'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <ClipboardCheck className="w-4 h-4" /> Audit Stok
                            </button>
                            <button
                                onClick={() => setActiveTab('purchase-history')}
                                className={`flex-shrink-0 flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'purchase-history'
                                    ? 'bg-white text-indigo-700 shadow-md'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <History className="w-4 h-4" /> Purchase Log
                            </button>
                            <button
                                onClick={() => setActiveTab('report')}
                                className={`flex-shrink-0 flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'report'
                                    ? 'bg-white text-indigo-700 shadow-md'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <TrendingUp className="w-4 h-4" /> Report
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-12">
                    {[
                        { label: 'TOTAL BAHAN', value: stats.totalItems, icon: <Database className="w-4 h-4 md:w-5 md:h-5" />, gradient: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-700' },
                        { label: 'STOK KRITIS', value: stats.criticalStock, icon: <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />, gradient: 'from-rose-500 to-rose-600', light: 'bg-rose-50', text: 'text-rose-700' },
                        { label: 'WAJIB LAPOR', value: stats.mandatoryReports, icon: <ShieldCheck className="w-4 h-4 md:w-5 md:h-5" />, gradient: 'from-amber-500 to-amber-600', light: 'bg-amber-50', text: 'text-amber-700' },
                        { label: 'VALUASI STOK', value: stats.valuation, icon: <DollarSign className="w-4 h-4 md:w-5 md:h-5" />, gradient: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-700' },
                    ].map((s, i) => (
                        <div 
                            key={i} 
                            onClick={s.label === 'WAJIB LAPOR' ? () => setFilterMandatoryOnly(!filterMandatoryOnly) : undefined}
                            className={`bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-100 shadow-sm md:shadow-xl md:shadow-slate-200/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-500 group flex flex-col justify-between items-start text-left ${s.label === 'WAJIB LAPOR' ? 'cursor-pointer active:scale-95' : ''} ${s.label === 'WAJIB LAPOR' && filterMandatoryOnly ? 'ring-2 ring-indigo-500/50 bg-indigo-50/30' : ''}`}
                        >
                            <div className="flex items-start justify-between mb-3 md:mb-6 w-full">
                                <div className={`w-8 h-8 md:w-12 md:h-12 ${s.light} ${s.text} rounded-xl md:rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300 shrink-0`}>{s.icon}</div>
                                <div className={`h-1.5 w-8 md:w-10 rounded-full bg-gradient-to-r ${s.gradient} opacity-20 group-hover:opacity-100 transition-opacity duration-500`} />
                            </div>
                            <div className="w-full">
                                <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest md:tracking-[0.2em] mb-1 md:mb-2 leading-tight truncate w-full">{s.label}</p>
                                <p className={`text-sm md:text-2xl font-black ${s.text} leading-none tracking-tight truncate w-full`}>{typeof s.value === 'string' && s.value.startsWith('Rp') ? s.value.replace('Rp ', 'Rp') : s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-3xl md:rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-white overflow-hidden min-h-[500px] flex flex-col w-full">
                    {/* Visual Header & Controls */}
                    <div className="p-4 md:p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between gap-4 sticky top-0 bg-white z-10">
                        {activeTab !== 'report' && activeTab !== 'categories' && activeTab !== 'ai' && (
                            <div className="flex flex-col xl:flex-row gap-4 flex-1 min-w-0 overflow-hidden">
                                <div className="relative flex-1 max-w-md group shrink-0">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder={`Cari ${activeTab === 'stock' ? 'bahan baku' : activeTab === 'margin-guard' ? 'performa menu' : 'resep menu'}...`}
                                        className="w-full pl-14 pr-6 py-4 bg-slate-50/50 hover:bg-slate-50 focus:bg-white rounded-2xl border-2 border-transparent focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                {/* Contextual Filter Tabs */}
                                <div className="flex gap-1.5 p-1.5 bg-slate-100/50 rounded-2xl w-fit self-start md:self-center border border-slate-200/50 overflow-x-auto max-w-full no-scrollbar shadow-inner">
                                    {activeTab === 'stock' ? (
                                        <>
                                            <button
                                                onClick={() => setSelectedIngCategory('ALL')}
                                                className={`px-4 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${selectedIngCategory === 'ALL' 
                                                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-100' 
                                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'}`}
                                            >
                                                <Box className="w-3.5 h-3.5" />
                                                SEMUA
                                            </button>
                                            {(categories || [])
                                                .filter(cat => cat.isActive && (cat.type === 'INGREDIENT' || cat.type === 'BOTH'))
                                                .map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => setSelectedIngCategory(cat.name)}
                                                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${selectedIngCategory === cat.name 
                                                            ? 'bg-white text-indigo-700 shadow-sm border border-slate-100' 
                                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'}`}
                                                    >
                                                        <span className={selectedIngCategory === cat.name ? 'text-indigo-600' : 'text-slate-400'}>
                                                            <Database className="w-3.5 h-3.5" />
                                                        </span>
                                                        {cat.name.toUpperCase()}
                                                    </button>
                                                ))}
                                            {/* Legacy Fallback if no dynamic categories yet */}
                                            {!(categories || []).some(c => c.type === 'INGREDIENT' || c.type === 'BOTH') && (
                                                ['Raw Material', 'Packaging', 'Semi-Finished'].map(legacy => (
                                                    <button
                                                        key={legacy}
                                                        onClick={() => setSelectedIngCategory(legacy)}
                                                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${selectedIngCategory === legacy 
                                                            ? 'bg-white text-indigo-700 shadow-sm border border-slate-100' 
                                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'}`}
                                                    >
                                                        <Database className="w-3.5 h-3.5" />
                                                        {legacy.toUpperCase()}
                                                    </button>
                                                ))
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setSelectedCategoryId('ALL')}
                                                className={`px-4 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${selectedCategoryId === 'ALL' 
                                                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-100' 
                                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'}`}
                                            >
                                                <Box className="w-3.5 h-3.5" />
                                                SEMUA
                                            </button>
                                            {(categories || [])
                                                .filter(cat => cat.isActive && (cat.type === 'MENU' || cat.type === 'BOTH'))
                                                .map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => setSelectedCategoryId(cat.id)}
                                                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${selectedCategoryId === cat.id 
                                                            ? 'bg-white text-indigo-700 shadow-sm border border-slate-100' 
                                                            : 'text-slate-400 hover:bg-slate-600 hover:bg-slate-100/50'}`}
                                                    >
                                                        <span className={selectedCategoryId === cat.id ? 'text-indigo-600' : 'text-slate-400'}>
                                                            <Filter className="w-3.5 h-3.5" />
                                                        </span>
                                                        {cat.name.toUpperCase()}
                                                    </button>
                                                ))}
                                        </>
                                    )}
                                </div>

                                {/* Mandatory Filter Toggle */}
                                <div className="flex items-center gap-2 bg-slate-100/50 px-4 py-2 rounded-2xl border border-slate-200/50 self-start md:self-center">
                                    <span className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors ${filterMandatoryOnly ? 'text-indigo-600' : 'text-slate-400'}`}>Wajib Lapor</span>
                                    <button 
                                        onClick={() => setFilterMandatoryOnly(!filterMandatoryOnly)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${filterMandatoryOnly ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${filterMandatoryOnly ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'recipes' && (
                            <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm self-start md:self-center">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${showInactive ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`} />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Show Inactive</span>
                                </div>
                                <button 
                                    onClick={() => setShowInactive(!showInactive)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none ${showInactive ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${showInactive ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        )}

                        {activeTab === 'stock' ? (
                            <div className="flex flex-row flex-wrap sm:flex-nowrap gap-2 md:gap-3 w-full lg:w-auto shrink-0">
                                {/* Waste Declaration Trigger */}
                                {hasPermission('INVENTORY_WASTE') && (
                                    <button
                                        onClick={() => setShowWasteModal(true)}
                                        className="flex-1 sm:flex-none bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 px-3 py-3 sm:px-5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
                                    >
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="hidden sm:inline">Deklarasi Waste</span>
                                        <span className="sm:hidden">Waste</span>
                                    </button>
                                )}
                                {hasPermission('INV_ADD_ITEM') && (
                                    <>
                                        <button
                                            onClick={() => setShowImportModal(true)}
                                            className="flex-1 sm:flex-none bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 px-3 py-3 sm:px-5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
                                        >
                                            <Database className="w-4 h-4" />
                                            <span className="hidden sm:inline">Import Excel</span>
                                            <span className="sm:hidden">Import</span>
                                        </button>
                                        <button
                                            onClick={openAddIngredientModal}
                                            className="w-full sm:w-auto bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-3 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-200/50"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Tambah Bahan</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : activeTab === 'recipes' ? (
                            <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
                                {hasPermission('INV_ADD_MENU') && (
                                    <button
                                        onClick={openAddMenuModal}
                                        className="w-full sm:w-auto bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-3 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-200/50"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Tambah Menu</span>
                                    </button>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 bg-slate-50/30 relative">
                        {isLoading ? (
                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-32 bg-white rounded-3xl animate-skeleton border border-slate-100" />
                                    ))}
                                </div>
                                <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden">
                                    <div className="p-8 border-b border-slate-50 space-y-4">
                                        <div className="h-4 w-1/4 bg-slate-50 rounded animate-skeleton" />
                                        <div className="h-10 w-full bg-slate-50 rounded-2xl animate-skeleton" />
                                    </div>
                                    <div className="p-8 space-y-4">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className="h-16 w-full bg-slate-50 rounded-2xl animate-skeleton" />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-0">
                                {activeTab === 'stock' ? (
                                    <InventoryStockView
                                        data={filteredIngredients}
                                        menuItems={menuItems || []}
                                        onUpdateStock={updateStock}
                                        onEdit={openEditModal}
                                        onDelete={handleDeleteIngredient}
                                    />
                                ) : activeTab === 'recipes' ? (
                                    <RecipesView
                                        data={filteredMenu}
                                        ingredients={ingredients || []}
                                        availability={availability || {}}
                                        onManageRecipe={openRecipeModal}
                                        onEdit={openEditMenuModal}
                                        onDelete={handleDeleteMenu}
                                        onToggleActive={handleToggleMenuItemActive}
                                        showInactive={showInactive}
                                        togglingIds={togglingIds}
                                    />
                                ) : activeTab === 'categories' ? (
                                    <CategoriesView
                                        data={categories || []}
                                        onEdit={(cat) => {
                                            setEditingCategory(cat);
                                            setNewCategory({ 
                                                name: cat.name, 
                                                productionTarget: cat.productionTarget, 
                                                isActive: cat.isActive,
                                                type: cat.type || 'MENU'
                                            });
                                            setShowCategoryModal(true);
                                        }}
                                        onDelete={handleDeleteCategory}
                                        onAdd={() => {
                                            setEditingCategory(null);
                                            setNewCategory({ name: '', productionTarget: 'KDS', isActive: true, type: 'MENU' });
                                            setShowCategoryModal(true);
                                        }}
                                        onToggleActive={handleToggleCategoryActive}
                                        togglingIds={categoryTogglingIds}
                                    />
                                ) : activeTab === 'report' ? (
                                    <div className="p-8">
                                        <StockReportView ingredients={ingredients || []} menuItems={menuItems || []} />
                                    </div>
                                ) : activeTab === 'margin-guard' ? (
                                    <div className="p-8">
                                        <MarginGuardView menuItems={menuItems || []} ingredients={ingredients || []} />
                                    </div>
                                ) : activeTab === 'ai' ? (
                                    <AIInsightsView 
                                        ingredients={ingredients || []} 
                                        menuItems={menuItems || []} 
                                    />
                                ) : activeTab === 'suppliers' ? (
                                    <SuppliersView />
                                ) : activeTab === 'audit' ? (
                                    <StockAuditView 
                                        ingredients={ingredients || []} 
                                        menuItems={menuItems || []}
                                    />
                                ) : activeTab === 'purchase-history' ? (
                                    <PurchaseHistoryView filter={searchParams.get('filter') || undefined} />
                                ) : activeTab === 'calendar' ? (
                                    <InstallmentCalendarView />
                                ) : null}
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Ingredient Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pt-[max(1rem,calc(env(safe-area-inset-top)+1rem))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 lg:p-0 overscroll-contain">
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => { setShowAddModal(false); resetIngredientForm(); }} />
                        <div className="relative bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-7xl p-5 sm:p-10 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 max-h-[calc(100dvh-max(2rem,calc(env(safe-area-inset-top)+env(safe-area-inset-bottom)+2rem)))] sm:max-h-[90vh] flex flex-col">
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <div className="flex justify-between items-center mb-4 md:mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{editingIngredient ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}</h2>
                                    <p className="text-slate-500 font-semibold text-[10px] md:text-xs">Input detail bahan baku untuk akurasi HPP (COGS).</p>
                                </div>
                                <button onClick={() => { setShowAddModal(false); resetIngredientForm(); }} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-90 shadow-sm border border-slate-100 group">
                                    <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                                </button>
                            </div>

                            <form onSubmit={handleAddIngredient} className="space-y-5 md:space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-8 lg:gap-14">
                                    {/* Left Column: Info & Stock */}
                                    <div className="space-y-8">
                                        {/* Section: Basic Info */}
                                        <div className="space-y-4 md:space-y-6">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Informasi Dasar</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2">
                                                    <InputField
                                                        label="Nama Bahan"
                                                        value={newIngredient.name}
                                                        savedValue={lastSavedIngredient?.name}
                                                        onChange={val => setNewIngredient({ ...newIngredient, name: val })}
                                                        placeholder="Contoh: Daging Sapi Wagyu"
                                                        isEditing={!!editingIngredient}
                                                        required
                                                    />
                                                </div>
                                                <InputField
                                                    label="SKU / Kode"
                                                    value={newIngredient.sku}
                                                    savedValue={lastSavedIngredient?.sku}
                                                    onChange={val => setNewIngredient({ ...newIngredient, sku: val })}
                                                    placeholder="BRG-001"
                                                    isEditing={!!editingIngredient}
                                                />
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Kategori</label>
                                                      <select
                                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-[5px] focus:ring-indigo-500/5 font-bold text-slate-800 focus:outline-none transition-all cursor-pointer"
                                                        value={newIngredient.category}
                                                        onChange={e => setNewIngredient({ ...newIngredient, category: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">Pilih Kategori</option>
                                                        {(categories || [])
                                                            .filter(c => c.isActive && (c.type === 'INGREDIENT' || c.type === 'BOTH'))
                                                            .map(c => (
                                                                <option key={c.id} value={c.name}>{c.name}</option>
                                                            ))
                                                        }
                                                        {/* Fallback defaults if no dynamic categories exist yet */}
                                                        {!(categories || []).some(c => c.type === 'INGREDIENT' || c.type === 'BOTH') && (
                                                            <>
                                                                <option value="Raw Material">Bahan Mentah</option>
                                                                <option value="Packaging">Packaging</option>
                                                                <option value="Semi-Finished">Bahan Setengah Jadi</option>
                                                            </>
                                                        )}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Satuan Dasar (@HPP)</label>
                                                    <select
                                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-[5px] focus:ring-indigo-500/5 font-bold text-slate-800 focus:outline-none transition-all cursor-pointer"
                                                        value={newIngredient.unit}
                                                        onChange={e => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                                                    >
                                                        <option value="Gram">Gram</option>
                                                        <option value="Ml">Mililiter</option>
                                                        <option value="Pcs">Pieces</option>
                                                        <option value="Kg">Kilogram</option>
                                                        <option value="L">Liter</option>
                                                        <option value="Meter">Meter</option>
                                                        <option value="Yard">Yard</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Dept. Penanggung Jawab</label>
                                                    <select
                                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-[5px] focus:ring-indigo-500/5 font-bold text-slate-800 focus:outline-none transition-all cursor-pointer"
                                                        value={newIngredient.department}
                                                        onChange={e => setNewIngredient({ ...newIngredient, department: e.target.value })}
                                                    >
                                                        <option value="KITCHEN">Dapur (Kitchen)</option>
                                                        <option value="BAR">Bar (Bartender)</option>
                                                        <option value="CASHIER">Kasir / Retail</option>
                                                    </select>
                                                </div>
                                                <div className="md:col-span-2 pt-2">
                                                    <div className="flex flex-col gap-3 p-4 bg-amber-50 rounded-[2rem] border border-amber-100">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1">
                                                                <p className="text-xs font-black text-amber-900 uppercase tracking-wider">Wajib Lapor Stok</p>
                                                                <p className="text-[10px] text-amber-700 font-bold">Wajib dilaporkan untuk validasi penutupan shift.</p>
                                                            </div>
                                                            <button 
                                                                type="button"
                                                                onClick={() => setNewIngredient({ 
                                                                    ...newIngredient, 
                                                                    isHighValue: !newIngredient.isHighValue,
                                                                    isMandatoryReporting: !newIngredient.isHighValue 
                                                                })}
                                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${newIngredient.isHighValue ? 'bg-amber-500' : 'bg-slate-200'}`}
                                                            >
                                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newIngredient.isHighValue ? 'translate-x-6' : 'translate-x-1'}`} />
                                                            </button>
                                                        </div>
                                                        
                                                        {newIngredient.isHighValue && (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-amber-100 animate-in slide-in-from-top-2 duration-300">
                                                                <div className="space-y-1.5">
                                                                    <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest px-1">Frekuensi Pengecekan</label>
                                                                    <select
                                                                        className="w-full px-4 py-2 bg-white rounded-xl border border-amber-200 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                                                        value={newIngredient.auditFrequency || 'SHIFT'}
                                                                        onChange={e => setNewIngredient({ ...newIngredient, auditFrequency: e.target.value as any })}
                                                                    >
                                                                        <option value="SHIFT">Setiap Pergantian Shift</option>
                                                                        <option value="DAILY">Harian (Tiap Pagi)</option>
                                                                        <option value="WEEKLY">Mingguan (Tiap Senin)</option>
                                                                    </select>
                                                                </div>
                                                                <div className="flex items-center gap-2 px-2 py-3 bg-amber-100/50 rounded-xl">
                                                                    <Info className="w-3.5 h-3.5 text-amber-600" />
                                                                    <p className="text-[9px] text-amber-800 font-medium leading-tight">Mempengaruhi blokir 'Closing' jika stok belum dilaporkan.</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section: Stock & Measurement */}
                                        <div className="space-y-4 md:space-y-6">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Stok & Pengukuran</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <InputField
                                                    label="Stok Tersedia"
                                                    type="number"
                                                    value={newIngredient.stockQuantity}
                                                    savedValue={lastSavedIngredient?.stockQuantity !== undefined ? Number(lastSavedIngredient.stockQuantity).toLocaleString('id-ID', { maximumFractionDigits: 2 }) : undefined}
                                                    onChange={val => setNewIngredient({ ...newIngredient, stockQuantity: val })}
                                                    placeholder="0"
                                                    isEditing={!!editingIngredient}
                                                    required
                                                    step="any"
                                                />
                                                <InputField
                                                    label="Min. Stock Alert"
                                                    type="number"
                                                    value={newIngredient.minStockLevel}
                                                    savedValue={lastSavedIngredient?.minStockLevel !== undefined ? Number(lastSavedIngredient.minStockLevel).toLocaleString('id-ID', { maximumFractionDigits: 2 }) : undefined}
                                                    onChange={val => setNewIngredient({ ...newIngredient, minStockLevel: val })}
                                                    placeholder="0"
                                                    isEditing={!!editingIngredient}
                                                    required
                                                    step="any"
                                                />
                                                <InputField
                                                    label="Yield (%)"
                                                    type="number"
                                                    value={newIngredient.yieldPercentage}
                                                    savedValue={lastSavedIngredient?.yieldPercentage !== undefined ? Number(lastSavedIngredient.yieldPercentage).toLocaleString('id-ID') : undefined}
                                                    onChange={val => {
                                                        const yieldVal = Number(val) || 100;
                                                        const pPrice = Number(newIngredient.purchasePrice) || 0;
                                                        const pQty = Number(newIngredient.purchaseQuantity) || 1;
                                                        const factorLabels = ['Kg', 'L', 'Liter'];
                                                        const factor = factorLabels.includes(newIngredient.purchaseUnit) ? 1000 : 1;
                                                        let baseCost = (pPrice / (pQty * factor)) / (yieldVal / 100);
                                                        if (isNaN(baseCost) || !isFinite(baseCost)) baseCost = 0;
                                                        setNewIngredient({ ...newIngredient, yieldPercentage: val, costPrice: baseCost });
                                                    }}
                                                    placeholder="100"
                                                    isEditing={!!editingIngredient}
                                                    required
                                                />
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Tgl Kadaluwarsa</label>
                                                    <div className="relative">
                                                        <input
                                                            type="date"
                                                            className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-[5px] focus:ring-indigo-500/5 font-bold text-slate-800 focus:outline-none transition-all cursor-pointer"
                                                            value={newIngredient.expiryDate}
                                                            onChange={e => setNewIngredient({ ...newIngredient, expiryDate: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    {/* Section: Batch Tracking (For Fabric/Rolls) */}
                                    <div className="space-y-4 md:space-y-6 pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                                            <div className="flex-1">
                                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Lacak Batch / Roll</h3>
                                                <p className="text-[10px] text-slate-500 font-bold">Gunakan untuk barang yang dijual per Roll/Meter seperti Kain.</p>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => setNewIngredient({ 
                                                    ...newIngredient, 
                                                    isBatchTracked: !newIngredient.isBatchTracked 
                                                })}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${newIngredient.isBatchTracked ? 'bg-indigo-500' : 'bg-slate-200'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newIngredient.isBatchTracked ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                        
                                        {newIngredient.isBatchTracked && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                                <InputField
                                                    label="Unit Jual Eceran (Base)"
                                                    value={newIngredient.baseUnit}
                                                    onChange={val => setNewIngredient({ ...newIngredient, baseUnit: val })}
                                                    placeholder="Meter / Yard"
                                                />
                                                <InputField
                                                    label="Unit Jual Grosir (Display)"
                                                    value={newIngredient.displayUnit}
                                                    onChange={val => setNewIngredient({ ...newIngredient, displayUnit: val })}
                                                    placeholder="Roll / Gulung"
                                                />
                                                <InputField
                                                    label="Faktor Konversi (1 Grosir = ? Ecer)"
                                                    type="number"
                                                    value={newIngredient.conversionFactor}
                                                    onChange={val => setNewIngredient({ ...newIngredient, conversionFactor: val })}
                                                    placeholder="Contoh: 100"
                                                    step="any"
                                                />
                                                <InputField
                                                    label="Batas Waste / Perca"
                                                    type="number"
                                                    value={newIngredient.wasteThreshold}
                                                    onChange={val => setNewIngredient({ ...newIngredient, wasteThreshold: val })}
                                                    placeholder="Contoh: 1.0 (Meter)"
                                                    step="any"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Column: Financial & Additional */}
                                    <div className="space-y-8">
                                        {/* Section: Financial */}
                                        <div className="space-y-4 md:space-y-6">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1.5 h-4 bg-amber-600 rounded-full" />
                                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Finansial & Kalkulator Harga</h3>
                                            </div>
                                            <div className="bg-gradient-to-br from-white via-amber-50/10 to-amber-50/40 p-5 md:p-8 rounded-[3rem] border border-amber-100 shadow-sm space-y-6 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 relative z-10">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-2 px-1">
                                                            <Banknote className="w-3.5 h-3.5 text-amber-500" />
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail Pembelian</span>
                                                        </div>
                                                        <InputField
                                                            label="Harga Total"
                                                            type="number"
                                                            value={newIngredient.purchasePrice}
                                                            onChange={val => recalculateHPP({ purchasePrice: val })}
                                                            placeholder="0"
                                                            suffix={<span className="font-bold text-slate-400">Rp</span>}
                                                        />
                                                        <InputField
                                                            label="Isi / Qty"
                                                            type="number"
                                                            value={newIngredient.purchaseQuantity}
                                                            onChange={val => recalculateHPP({ purchaseQuantity: val })}
                                                            placeholder="1"
                                                            suffix={<Package className="w-4 h-4 text-slate-300" />}
                                                        />
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-2 px-1">
                                                            <Scale className="w-3.5 h-3.5 text-amber-500" />
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Konversi Satuan</span>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Satuan Beli</label>
                                                            <select
                                                                className="w-full px-5 py-3.5 bg-white rounded-2xl border-2 border-transparent focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 font-bold text-slate-800 focus:outline-none transition-all shadow-sm cursor-pointer"
                                                                value={newIngredient.purchaseUnit}
                                                                onChange={e => recalculateHPP({ purchaseUnit: e.target.value })}
                                                            >
                                                                <option value="Gram">Unit (Gram/Pcs)</option>
                                                                <option value="Kg">Bulk (Kg/Liter)</option>
                                                                <option value="Ml">Mililiter</option>
                                                                <option value="Liter">Liter</option>
                                                                <option value="Roll">Roll</option>
                                                                <option value="Meter">Meter</option>
                                                                <option value="Yard">Yard</option>
                                                            </select>
                                                        </div>

                                                        {/* conversion result badge premium */}
                                                        <div className="bg-white p-5 rounded-[2rem] border-2 border-amber-200 shadow-xl shadow-amber-500/10 flex items-center gap-4 relative overflow-hidden group/result">
                                                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 -translate-x-full group-hover/result:translate-x-full transition-transform duration-1000" />
                                                            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30 shrink-0">
                                                                <TrendingUp className="w-6 h-6" />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em] mb-0.5">HPP Netto</span>
                                                                <div className="flex items-baseline gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                                                                    <span className="text-xl font-black text-slate-900 tracking-tight">Rp {Number(newIngredient.costPrice).toLocaleString('id-ID')}</span>
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">/ {newIngredient.unit || 'Unit'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {editingIngredient?.lastPurchasePrice && (
                                                    <div className="pt-4 border-t border-amber-100 relative z-10 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-white border border-amber-100 flex items-center justify-center text-amber-500">
                                                                <History className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Transaksi Terakhir</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-slate-700">Rp {Number(editingIngredient.lastPurchasePrice).toLocaleString('id-ID')}</span>
                                                                    <span className="text-[10px] text-slate-400 font-medium">({(Number(editingIngredient.lastPurchaseQuantity) || 0).toLocaleString('id-ID')} {editingIngredient.lastPurchaseUnit})</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-tighter">
                                                            Recorded
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Section: Additional */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1.5 h-4 bg-slate-400 rounded-full" />
                                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Tambahan</h3>
                                            </div>
                                            <div className="space-y-4">
                                                <InputField
                                                    label="Deskripsi"
                                                    type="textarea"
                                                    value={newIngredient.description}
                                                    savedValue={lastSavedIngredient?.description}
                                                    onChange={val => setNewIngredient({ ...newIngredient, description: val })}
                                                    placeholder="Penjelasan singkat bahan..."
                                                    isEditing={!!editingIngredient}
                                                    rows={1}
                                                />
                                                <InputField
                                                    label="Image URL"
                                                    value={newIngredient.imageUrl}
                                                    savedValue={lastSavedIngredient?.imageUrl}
                                                    onChange={val => setNewIngredient({ ...newIngredient, imageUrl: val })}
                                                    placeholder="https://..."
                                                    isEditing={!!editingIngredient}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black shadow-lg shadow-indigo-100 transition-all mt-4 flex items-center justify-center gap-3 active:scale-95"
                                >
                                    {editingIngredient ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                    {editingIngredient ? 'SIMPAN PERUBAHAN' : 'SIMPAN DATA BAHAN'}
                                </button>
                            </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Menu Modal */}
                {showAddMenuModal && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-0 overscroll-contain">
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => { setShowAddMenuModal(false); setEditingMenu(null); }} />
                        <div className="relative bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-7xl p-6 sm:p-10 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 max-h-[92vh] sm:max-h-[90vh] flex flex-col">
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <div className="flex justify-between items-center mb-4 md:mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{editingMenu ? 'Edit Menu' : 'Tambah Menu'}</h2>
                                    <p className="text-slate-500 font-semibold text-[10px] md:text-xs">{editingMenu ? 'Update detail menu dalam katalog cafe.' : 'Input menu baru ke dalam katalog cafe.'}</p>
                                </div>
                                <button onClick={() => { setShowAddMenuModal(false); setEditingMenu(null); }} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-90 shadow-sm border border-slate-100 group">
                                    <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                                </button>
                            </div>

                            <form onSubmit={handleAddMenu} className="space-y-5 md:space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
                                    {/* Left Column: Basic Info */}
                                    <div className="space-y-8">
                                        <div className="space-y-4 md:space-y-6">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Informasi Dasar</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2">
                                                    <InputField
                                                        label="Nama Menu"
                                                        value={newMenu.name}
                                                        savedValue={lastSavedMenu?.name}
                                                        onChange={val => setNewMenu({ ...newMenu, name: val })}
                                                        placeholder="Contoh: Nasi Goreng Spesial"
                                                        isEditing={!!editingMenu}
                                                        required
                                                    />
                                                </div>
                                                <InputField
                                                    label="SKU / Kode"
                                                    value={newMenu.sku}
                                                    savedValue={lastSavedMenu?.sku}
                                                    onChange={val => setNewMenu({ ...newMenu, sku: val })}
                                                    placeholder="MNU-001"
                                                    isEditing={!!editingMenu}
                                                />
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Kategori</label>
                                                        <select
                                                            className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-[5px] focus:ring-indigo-500/5 font-bold text-slate-800 focus:outline-none transition-all cursor-pointer"
                                                            value={newMenu.categoryId}
                                                            onChange={e => setNewMenu({ ...newMenu, categoryId: e.target.value })}
                                                            required
                                                        >
                                                            <option value="">Pilih Kategori</option>
                                                            {(categories || [])
                                                                .filter(c => c.isActive && (c.type === 'MENU' || c.type === 'BOTH'))
                                                                .map(cat => (
                                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                                ))
                                                            }
                                                        </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Target Station</label>
                                                    <div className="relative">
                                                        <input
                                                            list="stations"
                                                            className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-[5px] focus:ring-indigo-500/5 font-bold text-slate-800 focus:outline-none transition-all"
                                                            value={newMenu.productionTarget}
                                                            onChange={e => setNewMenu({ ...newMenu, productionTarget: e.target.value })}
                                                            placeholder="Ikuti Kategori"
                                                        />
                                                        <Monitor className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Tgl Kadaluwarsa</label>
                                                    <div className="relative">
                                                        <input
                                                            type="date"
                                                            className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-[5px] focus:ring-indigo-500/5 font-bold text-slate-800 focus:outline-none transition-all cursor-pointer"
                                                            value={newMenu.expiryDate}
                                                            onChange={e => setNewMenu({ ...newMenu, expiryDate: e.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Conditional Stock Management for STORE Category */}
                                                {(() => {
                                                    const selCat = (categories || []).find(c => c.id.toString() === newMenu.categoryId?.toString());
                                                    const isStore = selCat?.name.toUpperCase() === 'STORE';
                                                    if (!isStore) return null;
                                                    return (
                                                        <div className="md:col-span-2 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300 py-2">
                                                            <div className="relative group">
                                                                <InputField
                                                                    label={isStore && !editingMenu ? "Stok Awal (Akan diganti Resep)" : "Stok Tersedia"}
                                                                    type="number"
                                                                    value={newMenu.stockQuantity}
                                                                    savedValue={lastSavedMenu?.stockQuantity}
                                                                    onChange={val => setNewMenu({ ...newMenu, stockQuantity: val })}
                                                                    placeholder="0"
                                                                    isEditing={!!editingMenu}
                                                                    required={!isStore && !((editingMenu?.recipes?.length || 0) > 0)}
                                                                    disabled={(editingMenu?.recipes?.length || 0) > 0}
                                                                    step="any"
                                                                />
                                                                {(editingMenu?.recipes?.length || 0) > 0 && (
                                                                    <div className="absolute -top-2 -right-2 bg-indigo-600 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                                        <Info className="w-3 h-3" />
                                                                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-900 text-[9px] text-white p-3 rounded-xl font-bold leading-relaxed shadow-2xl pointer-events-none">
                                                                            Item ini menggunakan resep. Stok dikalkulasi otomatis dari Bahan Baku. Edit stok di tab 'Bahan Baku'.
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {(editingMenu?.recipes?.length || 0) > 0 && (
                                                                    <p className="absolute -bottom-5 left-0 text-[8px] font-black text-indigo-500 uppercase tracking-widest animate-pulse">Auto-kalkulasi Resep</p>
                                                                )}
                                                            </div>
                                                            <InputField
                                                                label={isStore && !editingMenu ? "Min. Stock (Akan diganti Resep)" : "Min. Stock Alert"}
                                                                type="number"
                                                                value={newMenu.minStockLevel}
                                                                savedValue={lastSavedMenu?.minStockLevel}
                                                                onChange={val => setNewMenu({ ...newMenu, minStockLevel: val })}
                                                                placeholder="0"
                                                                isEditing={!!editingMenu}
                                                                required={!isStore}
                                                                step="any"
                                                            />
                                                        </div>
                                                    );
                                                })()}

                                                <div className="md:col-span-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 px-1">Dept. Penanggung Jawab</label>
                                                    <select
                                                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-[5px] focus:ring-indigo-500/5 font-bold text-slate-800 focus:outline-none transition-all cursor-pointer"
                                                        value={newMenu.department}
                                                        onChange={e => setNewMenu({ ...newMenu, department: e.target.value })}
                                                    >
                                                        <option value="KITCHEN">Dapur (Kitchen)</option>
                                                        <option value="BAR">Bar (Bartender)</option>
                                                        <option value="CASHIER">Kasir / Retail</option>
                                                    </select>
                                                </div>
                                                <div className="md:col-span-2 pt-2">
                                                    <div className="flex flex-col gap-3 p-4 bg-indigo-50 rounded-[2rem] border border-indigo-100">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1">
                                                                <p className="text-xs font-black text-indigo-900 uppercase tracking-wider">Wajib Lapor Stok</p>
                                                                <p className="text-[10px] text-indigo-700 font-bold">Wajib dilaporkan untuk validasi penutupan shift.</p>
                                                            </div>
                                                            <button 
                                                                type="button"
                                                                onClick={() => setNewMenu({ 
                                                                    ...newMenu, 
                                                                    isHighValue: !newMenu.isHighValue,
                                                                    isMandatoryReporting: !newMenu.isHighValue 
                                                                })}
                                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${newMenu.isHighValue ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                                            >
                                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newMenu.isHighValue ? 'translate-x-6' : 'translate-x-1'}`} />
                                                            </button>
                                                        </div>

                                                        {newMenu.isHighValue && (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-indigo-100 animate-in slide-in-from-top-2 duration-300">
                                                                <div className="space-y-1.5">
                                                                    <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest px-1">Frekuensi Pengecekan</label>
                                                                    <select
                                                                        className="w-full px-4 py-2 bg-white rounded-xl border border-indigo-200 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                                        value={newMenu.auditFrequency || 'SHIFT'}
                                                                        onChange={e => setNewMenu({ ...newMenu, auditFrequency: e.target.value as any })}
                                                                    >
                                                                        <option value="SHIFT">Setiap Pergantian Shift</option>
                                                                        <option value="DAILY">Harian (Tiap Pagi)</option>
                                                                        <option value="WEEKLY">Mingguan (Tiap Senin)</option>
                                                                    </select>
                                                                </div>
                                                                <div className="flex items-center gap-2 px-2 py-3 bg-indigo-100/50 rounded-xl">
                                                                    <Info className="w-3.5 h-3.5 text-indigo-600" />
                                                                    <p className="text-[9px] text-indigo-800 font-medium leading-tight">Pengaturan audit yang lebih fleksibel untuk operasional cafe.</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Pricing & Additional */}
                                    <div className="space-y-8">
                                        <div className="space-y-4 md:space-y-6">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Harga & Pajak</h3>
                                            </div>
                                            <div className="bg-gradient-to-br from-white via-emerald-50/10 to-emerald-50/40 p-6 md:p-8 rounded-[3rem] border border-emerald-100 shadow-sm space-y-6 relative overflow-hidden group/price">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 group-hover/price:scale-110 transition-transform duration-700" />
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                                    <InputField
                                                        label="Harga Jual"
                                                        type="number"
                                                        value={newMenu.price}
                                                        savedValue={lastSavedMenu?.price !== undefined ? Number(lastSavedMenu.price).toLocaleString('id-ID') : undefined}
                                                        onChange={val => {
                                                            const price = Number(val);
                                                            const hpp = Number(newMenu.productFinance.baseHpp);
                                                            const margin = price > 0 ? ((price - hpp) / price) * 100 : 0;
                                                            setNewMenu({
                                                                ...newMenu,
                                                                price: val,
                                                                productFinance: { ...newMenu.productFinance, targetMarginPercent: margin }
                                                            });
                                                        }}
                                                        placeholder="0"
                                                        suffix={<span className="font-bold text-slate-400">Rp</span>}
                                                        required
                                                        step="any"
                                                    />
                                                    <InputField
                                                        label="Pajak (%)"
                                                        type="number"
                                                        value={newMenu.taxPercentage}
                                                        onChange={val => setNewMenu({ ...newMenu, taxPercentage: val })}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1.5 h-4 bg-slate-400 rounded-full" />
                                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Tambahan</h3>
                                            </div>
                                            <div className="space-y-4">
                                                <InputField
                                                    label="Deskripsi Menu"
                                                    type="textarea"
                                                    value={newMenu.description}
                                                    onChange={val => setNewMenu({ ...newMenu, description: val })}
                                                    placeholder="Penjelasan singkat menu..."
                                                    rows={3}
                                                />
                                                <div className="relative">
                                                    <InputField
                                                        label="URL Foto Produk"
                                                        value={newMenu.imageUrl}
                                                        onChange={val => setNewMenu({ ...newMenu, imageUrl: val })}
                                                        placeholder="https://..."
                                                    />
                                                    <Image className="absolute right-4 top-[3.25rem] w-4 h-4 text-slate-300 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black shadow-lg shadow-indigo-100 transition-all mt-4 flex items-center justify-center gap-3 active:scale-95"
                                >
                                    {editingMenu ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                    {editingMenu ? 'SIMPAN PERUBAHAN' : 'SIMPAN MENU BARU'}
                                </button>
                            </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Manage Recipe Modal - Premium Redesign */}
                {showRecipeModal && selectedMenu && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-0 overscroll-contain">
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowRecipeModal(false)} />
                        <div className="relative bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-5xl shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-bottom-full sm:zoom-in-95 duration-500 max-h-[96vh] sm:max-h-[92vh] flex flex-col border border-white">

                            {/* Elegant Glass Header */}
                            <div className="relative px-5 md:px-8 pt-6 md:pt-10 pb-5 md:pb-8 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100 flex-shrink-0 z-10">
                                <div className="absolute top-0 right-0 p-6">
                                    <button
                                        onClick={() => setShowRecipeModal(false)}
                                        className="p-3 bg-white shadow-sm border border-slate-100 rounded-2xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all active:scale-90 group"
                                    >
                                        <X className="w-6 h-6 text-slate-400 group-hover:text-rose-600 transition-colors" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-4 mb-3">
                                    <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-200">
                                        <ChefHat className="w-6 h-6" />
                                    </div>
                                    <div className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                                        Formula Secret
                                    </div>
                                </div>

                                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                                    Atur Resep: <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">{selectedMenu.name}</span>
                                </h2>
                                <div className="text-slate-500 font-medium mt-2 flex items-center gap-2 text-xs md:text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="flex-1">Konfigurasi formula untuk perhitungan HPP & stok otomatis.</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {/* Instructional Hint */}
                                <div className="px-8 mt-6">
                                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-start gap-4">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                                            <Info className="w-4 h-4" />
                                        </div>
                                        <div className="text-xs leading-relaxed text-blue-800 font-medium">
                                            <span className="font-black block uppercase text-[10px] mb-0.5 tracking-wider">Petunjuk Penggunaan:</span>
                                            Gunakan <span className="font-bold underline">Gram</span> atau <span className="font-bold underline">Ml</span> untuk akurasi resep. Biaya akan otomatis dikonversi sesuai satuan beli di gudang. Masukkan nilai bersih (Netto) karena sistem akan menghitung Yield %.
                                        </div>
                                    </div>
                                </div>

                                <div className="px-8 pb-6 pt-2 space-y-4">
                                    {recipeIngredients.length === 0 ? (
                                        <div className="py-20 flex flex-col items-center justify-center text-center">
                                            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-8 border border-slate-100 shadow-inner group">
                                                <Database className="w-10 h-10 text-slate-200 group-hover:text-indigo-400 group-hover:scale-110 transition-all duration-500" />
                                            </div>
                                            <p className="font-black text-slate-800 uppercase tracking-widest text-sm mb-2">Belum ada bahan baku</p>
                                            <p className="text-slate-400 font-medium text-xs max-w-xs mx-auto leading-relaxed mb-8">Formula resep kosong. Klik tombol di bawah untuk menambah bahan secara manual atau gunakan Smart Link.</p>
                                            
                                            {(() => {
                                                const match = (ingredients || []).find(i => i.name.toUpperCase() === selectedMenu?.name.toUpperCase());
                                                if (!match) return null;
                                                return (
                                                    <div className="animate-in fade-in zoom-in duration-500">
                                                        <div className="mb-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 inline-block">Terdeteksi Bahan Serupa ✨</div>
                                                        <button 
                                                            onClick={() => setRecipeIngredients([{ ingredientId: match.id, quantity: 1, unit: match.unit }])}
                                                            className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 transition-all active:scale-95 group"
                                                        >
                                                            <Zap className="w-5 h-5 fill-white group-hover:animate-pulse" />
                                                            SMART LINK: {match.name}
                                                        </button>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                        recipeIngredients.map((recipe, index) => {
                                            const ing = (ingredients || []).find(i => i.id === recipe.ingredientId);
                                            const sub = (menuItems || []).find(m => m.id === recipe.subMenuItemId);
                                            const unitPrice = ing ? Number(ing.costPrice) : (sub ? sub.price * 0.7 : 0);
                                            const yieldFactor = ing ? (ing.yieldPercentage / 100) : 1;
                                            const isValid = (recipe.ingredientId || recipe.subMenuItemId) && recipe.quantity > 0;
                                            const recipeCost = (recipe.quantity * unitPrice * getConversionFactor(recipe.unit, ing?.unit || 'Pcs')) / yieldFactor;

                                            return (
                                                <div key={index} className={`relative group animate-in slide-in-from-left-4 duration-300 delay-[${index * 50}ms]`}>
                                                    <div className={`bg-white rounded-[1.5rem] p-5 border transition-all hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] ${!isValid ? 'border-rose-200 shadow-sm shadow-rose-100/50' : 'border-slate-200 shadow-sm'}`}>
                                                        <div className="flex flex-col lg:flex-row gap-5">
                                                            {/* Row Label/Counter */}
                                                            <div className="hidden lg:flex flex-shrink-0 w-8 h-8 items-center justify-center rounded-xl bg-slate-50 text-[10px] font-black text-slate-400 border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                                                                {index + 1}
                                                            </div>

                                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5 w-full">
                                                                {/* Item Selection */}
                                                                <div className="md:col-span-12 lg:col-span-4">
                                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 px-1">Pilih Item / Bahan</label>
                                                                    <div className="relative">
                                                                        <select
                                                                            className={`w-full pl-5 pr-10 py-3.5 bg-slate-50 hover:bg-slate-100 rounded-[1rem] border-0 transition-all font-bold text-slate-700 appearance-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 shadow-sm`}
                                                                            value={recipe.ingredientId ? `ing-${recipe.ingredientId}` : (recipe.subMenuItemId ? `sub-${recipe.subMenuItemId}` : '')}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                const newRecipes = [...recipeIngredients];
                                                                                if (val.startsWith('ing-')) {
                                                                                    const id = Number(val.replace('ing-', ''));
                                                                                    newRecipes[index] = { ingredientId: id, quantity: recipe.quantity, unit: (ingredients || []).find(i => i.id === id)?.unit || '' };
                                                                                } else if (val.startsWith('sub-')) {
                                                                                    const id = Number(val.replace('sub-', ''));
                                                                                    newRecipes[index] = { subMenuItemId: id, quantity: recipe.quantity, unit: 'Portion' };
                                                                                }
                                                                                setRecipeIngredients(newRecipes);
                                                                            }}
                                                                        >
                                                                            <option value="">-- Pilih --</option>
                                                                            <optgroup label="📦 Bahan Baku (Inventory)">
                                                                                {(ingredients || []).map(i => <option key={i.id} value={`ing-${i.id}`}>{i.name}</option>)}
                                                                            </optgroup>
                                                                            <optgroup label="🍳 Intermediate (Sub-Menu)">
                                                                                {(menuItems || []).filter(m => m.id !== selectedMenu?.id).map(m => <option key={m.id} value={`sub-${m.id}`}>{m.name}</option>)}
                                                                            </optgroup>
                                                                        </select>
                                                                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 scale-75 pointer-events-none" />
                                                                    </div>
                                                                </div>

                                                                {/* Quantity Row */}
                                                                <div className="md:col-span-6 lg:col-span-3">
                                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 px-1">Kuantitas</label>
                                                                    <div className="flex flex-col">
                                                                        <input
                                                                            type="number"
                                                                            className={`w-full px-5 py-3.5 bg-slate-50 hover:bg-slate-100 rounded-[1rem] border-0 transition-all font-black text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 shadow-sm`}
                                                                            value={recipe.quantity === 0 ? '' : recipe.quantity}
                                                                            onChange={(e) => {
                                                                                const val = Number(e.target.value);
                                                                                const newRecipes = [...recipeIngredients];
                                                                                newRecipes[index].quantity = val;
                                                                                setRecipeIngredients(newRecipes);
                                                                            }}
                                                                            placeholder="0"
                                                                            step="any"
                                                                        />
                                                                        {ing && ing.yieldPercentage < 100 && recipe.quantity > 0 && (
                                                                            <div className="mt-1.5 px-3 py-1 bg-amber-50 rounded-lg border border-amber-100/50 flex items-center justify-between">
                                                                                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter">Potong Stok:</span>
                                                                                <span className="text-[10px] font-black text-amber-700">
                                                                                    {((recipe.quantity * getConversionFactor(recipe.unit, ing.unit)) / (ing.yieldPercentage / 100)).toLocaleString('id-ID', { maximumFractionDigits: 2 })} {ing.unit}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Unit Selection */}
                                                                <div className="md:col-span-6 lg:col-span-2">
                                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 px-1">Unit</label>
                                                                    <div className="relative h-[48px]">
                                                                        <select
                                                                            className={`w-full pl-5 pr-10 py-3.5 bg-slate-50 hover:bg-slate-100 rounded-[1rem] border-0 transition-all font-bold text-indigo-600 appearance-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 shadow-sm text-center`}
                                                                            value={recipe.unit}
                                                                            onChange={(e) => {
                                                                                const newRecipes = [...recipeIngredients];
                                                                                newRecipes[index].unit = e.target.value;
                                                                                setRecipeIngredients(newRecipes);
                                                                            }}
                                                                        >
                                                                            {['Gram', 'Kg', 'Ml', 'Liter', 'Pcs', 'Pack', 'Butir', 'Portion'].map(u => <option key={u} value={u}>{u}</option>)}
                                                                        </select>
                                                                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 scale-75 pointer-events-none" />
                                                                    </div>
                                                                </div>

                                                                {/* Row Cost Insight */}
                                                                <div className="md:col-span-10 lg:col-span-2">
                                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 px-1">Row Cost</label>
                                                                    <div className="px-5 py-3.5 bg-indigo-50/50 rounded-[1rem] font-black text-indigo-700 shadow-sm flex items-center h-[48px] justify-between text-sm overflow-hidden whitespace-nowrap border border-indigo-100/50">
                                                                        {(() => {
                                                                            const ingUnit = ing?.unit || 'Pcs';
                                                                            const factor = getConversionFactor(recipe.unit, ingUnit);
                                                                            const yieldFactor = (ing?.yieldPercentage || 100) / 100;
                                                                            const cost = (recipe.quantity * unitPrice * factor) / yieldFactor;
                                                                            return `Rp ${cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
                                                                        })()}
                                                                    </div>
                                                                </div>

                                                                {/* Action */}
                                                                <div className="md:col-span-2 lg:col-span-1 flex flex-col justify-end p-0">
                                                                    <button
                                                                        onClick={() => setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index))}
                                                                        className="w-full lg:w-10 h-[48px] flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-[1rem] transition-all active:scale-90 border border-transparent hover:border-rose-100"
                                                                        title="Hapus"
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Yield Tip Badge */}
                                                    {ing && ing.yieldPercentage < 100 && (
                                                        <div className="absolute -top-2 -right-2 px-3 py-1 bg-amber-100 text-amber-700 text-[9px] font-black uppercase rounded-lg border border-amber-200 shadow-sm flex items-center gap-1">
                                                            <Zap className="w-3 h-3 fill-amber-700" /> Yield {ing.yieldPercentage}%
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}

                                    <button
                                        onClick={() => setRecipeIngredients([...recipeIngredients, { ingredientId: undefined, quantity: 1, unit: 'Gram' }])}
                                        className="w-full py-8 border-3 border-dashed border-slate-100 rounded-[2.5rem] text-slate-400 font-black text-base hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center gap-3 group"
                                    >
                                        <div className="w-12 h-12 bg-white shadow-md border border-slate-100 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                        <span className="uppercase tracking-[0.2em] text-[10px]">Tambahkan Bahan Rahasia</span>
                                    </button>
                                </div>

                                {/* Summary Footer with Premium Gradient */}
                                <div className="p-4 md:p-8 bg-slate-50 border-t border-slate-200">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
                                        <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-200">
                                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2 flex items-center gap-1.5 md:gap-2">
                                                <Database className="w-3 h-3" /> FOOD COST
                                            </p>
                                            <p className="text-lg md:text-2xl font-black text-slate-900 leading-none">
                                                Rp {recipeIngredients.reduce((acc, curr) => {
                                                    const ing = (ingredients || []).find(i => i.id === curr.ingredientId);
                                                    const sub = (menuItems || []).find(m => m.id === curr.subMenuItemId);
                                                    const unitPrice = ing ? Number(ing.costPrice) : (sub ? sub.price * 0.7 : 0);
                                                    const factor = getConversionFactor(curr.unit, ing?.unit || 'Pcs');
                                                    const yieldFactor = (ing?.yieldPercentage || 100) / 100;
                                                    return acc + ((curr.quantity * unitPrice * factor) / yieldFactor);
                                                }, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>

                                        <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-200">
                                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2 flex items-center gap-1.5 md:gap-2">
                                                <Zap className="w-3 h-3 text-indigo-500" /> MARGIN
                                            </p>
                                            <div className="flex items-center gap-1.5 md:gap-2">
                                                <p className={`text-lg md:text-2xl font-black leading-none ${(() => {
                                                    const cost = recipeIngredients.reduce((acc, curr) => {
                                                        const ing = (ingredients || []).find(i => i.id === curr.ingredientId);
                                                        const sub = (menuItems || []).find(m => m.id === curr.subMenuItemId);
                                                        const unitPrice = ing ? Number(ing.costPrice) : (sub ? sub.price * 0.7 : 0);
                                                        const factor = getConversionFactor(curr.unit, ing?.unit || 'Pcs');
                                                        const yieldFactor = (ing?.yieldPercentage || 100) / 100;
                                                        return acc + ((curr.quantity * unitPrice * factor) / yieldFactor);
                                                    }, 0);
                                                    const margin = (((selectedMenu?.price || 0) - cost) / (selectedMenu?.price || 1)) * 100;
                                                    return margin < 20 ? 'text-rose-600' : 'text-emerald-600';
                                                })()}`}>
                                                    {(() => {
                                                        const cost = recipeIngredients.reduce((acc, curr) => {
                                                            const ing = (ingredients || []).find(i => i.id === curr.ingredientId);
                                                            const sub = (menuItems || []).find(m => m.id === curr.subMenuItemId);
                                                            const unitPrice = ing ? Number(ing.costPrice) : (sub ? sub.price * 0.7 : 0);
                                                            const factor = getConversionFactor(curr.unit, ing?.unit || 'Pcs');
                                                            const yieldFactor = (ing?.yieldPercentage || 100) / 100;
                                                            return acc + ((curr.quantity * unitPrice * factor) / yieldFactor);
                                                        }, 0);
                                                        const margin = (((selectedMenu?.price || 0) - cost) / (selectedMenu?.price || 1)) * 100;
                                                        return `${Math.round(margin)}%`;
                                                    })()}
                                                </p>
                                                <span className="text-[8px] md:text-[10px] pb-0.5 md:pb-1 font-bold text-slate-400 uppercase italic">Gross</span>
                                            </div>
                                        </div>

                                        <div className="hidden md:flex flex-col justify-center px-1 md:px-2">
                                            <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">
                                                💡 Quick Tip
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic opacity-80">
                                                Resep akan terpotong dari gudang setiap kali <span className="font-bold">{selectedMenu?.name}</span> terjual di POS.
                                            </p>
                                        </div>
                                    </div>

                                    {/* AI Price Calculator & Margin Guard - Relocated to Recipe */}
                                    <div className="mt-8 pt-8 border-t border-slate-200">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-1.5 h-4 bg-violet-600 rounded-full" />
                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">AI Price Calculator & Margin Guard</h3>
                                        </div>

                                        <div className="bg-violet-50/50 p-6 md:p-8 rounded-[2rem] border border-violet-100/50 space-y-6">
                                            {/* HPP Display (Auto-sync from Food Cost) */}
                                            <div className="flex items-center gap-4 bg-white/80 p-4 rounded-2xl border border-violet-100 shadow-sm">
                                                <div className="p-3 bg-violet-100 rounded-xl text-violet-600">
                                                    <Database className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HPP Terdeteksi (Auto)</label>
                                                        <div className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded-full">LIVE SYNC</div>
                                                    </div>
                                                    <p className="text-xl font-black text-slate-900">
                                                        Rp {(() => {
                                                            const foodCost = recipeIngredients.reduce((acc, curr) => {
                                                                const ing = (ingredients || []).find(i => i.id === curr.ingredientId);
                                                                const sub = (menuItems || []).find(m => m.id === curr.subMenuItemId);
                                                                const unitPrice = ing ? Number(ing.costPrice) : (sub ? sub.price * 0.7 : 0);
                                                                const factor = getConversionFactor(curr.unit, ing?.unit || 'Pcs');
                                                                return acc + ((curr.quantity * unitPrice * factor) / (ing ? ing.yieldPercentage / 100 : 1));
                                                            }, 0);

                                                            // Sync to state silently if changed
                                                            if (selectedMenu?.productFinance && (selectedMenu.productFinance as any).baseHpp !== foodCost) {
                                                                setTimeout(() => {
                                                                    setSelectedMenu(prev => prev ? ({
                                                                        ...prev,
                                                                        productFinance: { ...prev.productFinance!, baseHpp: foodCost } as any
                                                                    } as any) : null);
                                                                }, 0);
                                                            }
                                                            return Math.round(foodCost).toLocaleString();
                                                        })()}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Pricing Formula */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Atur Strategi Harga</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {[
                                                            { label: 'Margin %', key: 'margin' },
                                                            { label: 'Markup Rp', key: 'markupFixed' },
                                                            { label: 'Markup %', key: 'markupPercent' },
                                                            { label: 'Multiplier', key: 'multiplier' }
                                                        ].map(tab => (
                                                            <button
                                                                key={tab.key}
                                                                type="button"
                                                                onClick={() => setSelectedMenu(prev => prev ? ({ ...prev, _calcMethod: tab.key as any }) : null)}
                                                                className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase transition-all border ${(selectedMenu as any)?._calcMethod === tab.key ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200' : 'bg-white text-slate-400 border-slate-100 hover:border-violet-200'}`}
                                                            >
                                                                {tab.label}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm mt-4">
                                                        {(!(selectedMenu as any)?._calcMethod || (selectedMenu as any)?._calcMethod === 'margin') && (
                                                            <InputField
                                                                label="Target Margin (%)"
                                                                type="number"
                                                                value={(selectedMenu?.productFinance as any)?.targetMarginPercent || 0}
                                                                onChange={(val: any) => {
                                                                    const margin = Number(val);
                                                                    const hpp = (selectedMenu?.productFinance as any)?.baseHpp || 0;
                                                                    const price = margin < 100 ? hpp / (1 - margin / 100) : hpp;
                                                                    setSelectedMenu(prev => prev ? ({
                                                                        ...prev,
                                                                        price: Math.round(price),
                                                                        productFinance: { ...(prev.productFinance || {}), targetMarginPercent: margin } as any
                                                                    } as any) : null);
                                                                }}
                                                                suffix={<span className="font-bold text-slate-400">%</span>}
                                                            />
                                                        )}
                                                        {(selectedMenu as any)?._calcMethod === 'multiplier' && (
                                                            <InputField
                                                                label="Multiplier (x HPP)"
                                                                type="number"
                                                                value={(selectedMenu?.productFinance as any)?.targetMultiplier || 0}
                                                                onChange={val => {
                                                                    const mult = Number(val);
                                                                    const hpp = (selectedMenu?.productFinance as any)?.baseHpp || 0;
                                                                    const price = hpp * mult;
                                                                    setSelectedMenu(prev => prev ? ({
                                                                        ...prev,
                                                                        price: Math.round(price),
                                                                        productFinance: { ...(prev.productFinance || {}), targetMultiplier: mult } as any
                                                                    } as any) : null);
                                                                }}
                                                                suffix={<span className="font-bold text-slate-400">x</span>}
                                                            />
                                                        )}
                                                        {(selectedMenu as any)?._calcMethod === 'markupFixed' && (
                                                            <InputField
                                                                label="Markup (Rp)"
                                                                type="number"
                                                                value={(selectedMenu?.productFinance as any)?.targetMarkupFixed || 0}
                                                                onChange={val => {
                                                                    const markup = Number(val);
                                                                    const hpp = (selectedMenu?.productFinance as any)?.baseHpp || 0;
                                                                    const price = hpp + markup;
                                                                    setSelectedMenu(prev => prev ? ({
                                                                        ...prev,
                                                                        price: Math.round(price),
                                                                        productFinance: { ...(prev.productFinance || {}), targetMarkupFixed: markup } as any
                                                                    } as any) : null);
                                                                }}
                                                                suffix={<span className="font-bold text-slate-400">Rp</span>}
                                                            />
                                                        )}
                                                        {(selectedMenu as any)?._calcMethod === 'markupPercent' && (
                                                            <InputField
                                                                label="Markup (%)"
                                                                type="number"
                                                                value={(selectedMenu?.productFinance as any)?.targetMarkupPercent || 0}
                                                                onChange={val => {
                                                                    const percent = Number(val);
                                                                    const hpp = (selectedMenu?.productFinance as any)?.baseHpp || 0;
                                                                    const price = hpp * (1 + percent / 100);
                                                                    setSelectedMenu(prev => prev ? ({
                                                                        ...prev,
                                                                        price: Math.round(price),
                                                                        productFinance: { ...(prev.productFinance || {}), targetMarkupPercent: percent } as any
                                                                    } as any) : null);
                                                                }}
                                                                suffix={<span className="font-bold text-slate-400">%</span>}
                                                            />
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing Result</label>
                                                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black text-white ${Number((selectedMenu?.productFinance as any)?.baseHpp || 0) / (Number(selectedMenu?.price) || 1) * 100 > Number((selectedMenu?.productFinance as any)?.maxHppThreshold || 35) ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                                                            {Math.round(Number((selectedMenu?.productFinance as any)?.baseHpp || 0) / (Number(selectedMenu?.price) || 1) * 100)}% HPP
                                                        </span>
                                                    </div>
                                                    <div className="p-6 bg-slate-900 rounded-3xl shadow-xl border border-slate-800 flex flex-col items-center justify-center text-center">
                                                        <p className="text-[10px] font-black text-violet-400 uppercase tracking-[0.2em] mb-2">Recommended Price</p>
                                                        <p className="text-3xl font-black text-white mb-1">
                                                            Rp {(Number(selectedMenu?.price || 0)).toLocaleString()}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-bold italic line-through opacity-50">
                                                            Current: Rp {(menuItems || []).find(m => m.id === selectedMenu?.id)?.price.toLocaleString()}
                                                        </p>
                                                    </div>

                                                    {/* Constraint Slider */}
                                                    <div className="space-y-2 px-1">
                                                        <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase">
                                                            <span>Max HPP Guard</span>
                                                            <span>{(selectedMenu?.productFinance as any)?.maxHppThreshold || 35}%</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min="10"
                                                            max="60"
                                                            step="5"
                                                            value={(selectedMenu?.productFinance as any)?.maxHppThreshold || 35}
                                                            onChange={e => {
                                                                const val = Number(e.target.value);
                                                                setSelectedMenu(prev => prev ? ({
                                                                    ...prev,
                                                                    productFinance: { ...(prev.productFinance || {}), maxHppThreshold: val } as any
                                                                } as any) : null);
                                                            }}
                                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                                                        />
                                                    </div>
                                                </div>

                                                {/* AI Smart Advice */}
                                                <div className="p-5 bg-slate-900 rounded-[1.5rem] relative overflow-hidden group border border-violet-500/20">
                                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                                                        <Zap className="w-12 h-12 text-violet-400" />
                                                    </div>
                                                    <div className="relative z-10 flex gap-4">
                                                        <div className="p-2 bg-violet-600 rounded-xl text-white h-fit">
                                                            <ChefHat className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest block mb-1">AI Pricing Strategy Advice</span>
                                                            <p className="text-[11px] text-slate-300 leading-relaxed font-medium italic">
                                                                {Number((selectedMenu?.productFinance as any)?.baseHpp || 0) / (Number(selectedMenu?.price) || 1) * 100 > Number((selectedMenu?.productFinance as any)?.maxHppThreshold || 35)
                                                                    ? `🚨 HPP (${Math.round(Number((selectedMenu?.productFinance as any)?.baseHpp || 0) / (Number(selectedMenu?.price) || 1) * 100)}%) melampaui batas aman ${(selectedMenu?.productFinance as any)?.maxHppThreshold || 35}%. Segera koreksi harga ke minimal Rp ${Math.round(((selectedMenu?.productFinance as any)?.baseHpp || 0) / (((selectedMenu?.productFinance as any)?.maxHppThreshold || 35) / 100)).toLocaleString()} atau tinjau kembali porsi bahan baku.`
                                                                    : `💡 Strategi harga optimal. Margin keuntungan bersih Anda diprediksi mencapai ${Math.round(100 - (Number((selectedMenu?.productFinance as any)?.baseHpp || 0) / (Number(selectedMenu?.price) || 1) * 100))}% per porsi. Gunakan promo bundling di jam sepi untuk meningkatkan volume.`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>

                                        {/* Sticky Action Footer */}
                                        <div className="p-4 md:p-8 bg-white border-t border-slate-100 flex-shrink-0">
                                            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                                                <button
                                                    disabled={recipeIngredients.some(r => (!r.ingredientId && !r.subMenuItemId) || r.quantity <= 0)}
                                                    onClick={handleUpdateRecipes}
                                                    className="flex-[2] bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 md:py-4 rounded-xl font-black shadow-[0_20px_40px_-8px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-2 md:gap-3 active:scale-[0.98] group text-xs md:text-base uppercase tracking-widest md:tracking-normal"
                                                >
                                                    <Save className="w-5 h-5 md:w-6 md:h-6 group-hover:animate-bounce" />
                                                    <span>Simpan Formula</span>
                                                </button>
                                                <button
                                                    onClick={() => setShowRecipeModal(false)}
                                                    className="flex-1 bg-white hover:bg-slate-50 text-slate-600 py-3 md:py-4 rounded-xl font-black border border-slate-200 transition-all active:scale-[0.98] text-xs md:text-base uppercase tracking-widest md:tracking-normal"
                                                >
                                                    Batal
                                                </button>
                                            </div>

                                            {/* Detailed Validation Error Hint */}
                                            {recipeIngredients.some(r => (!r.ingredientId && !r.subMenuItemId) || r.quantity <= 0) && (
                                                <p className="text-[10px] text-rose-500 font-black uppercase tracking-tighter mt-4 text-center animate-pulse flex items-center justify-center gap-2">
                                                    <AlertCircle className="w-3 h-3" /> Silahkan lengkapi semua bahan dan kuantitas sebelum menyimpan
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
                }
                {/* Category Management Modal - Premium Redesign */}
                {showCategoryModal && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-0 overscroll-contain">
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowCategoryModal(false)} />
                        <div className="relative bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-7xl p-6 sm:p-10 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 max-h-[92vh] sm:max-h-[85vh] flex flex-col">
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                <div className="flex justify-between items-center mb-8 md:mb-12">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                                            <Zap className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}</h2>
                                            <p className="text-slate-500 font-semibold text-xs md:text-sm">Konfigurasi pengelompokan menu & stasiun produksi otomatis.</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowCategoryModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-90 shadow-sm border border-slate-100 group">
                                        <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                                    </button>
                                </div>

                                <form onSubmit={handleCategoryAction} className="space-y-10">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20">
                                        {/* Left Side: General Info */}
                                        <div className="space-y-8">
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Identitas Kategori</h3>
                                                </div>
                                                <InputField
                                                    label="Nama Kategori"
                                                    value={newCategory.name}
                                                    onChange={val => setNewCategory({ ...newCategory, name: val })}
                                                    placeholder="Contoh: Merchandise atau Billiard"
                                                    required
                                                />
                                                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100/50 space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            id="isActiveCat"
                                                            checked={newCategory.isActive}
                                                            onChange={e => setNewCategory({ ...newCategory, isActive: e.target.checked })}
                                                            className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        />
                                                        <label htmlFor="isActiveCat" className="text-xs font-black text-slate-700 uppercase tracking-wide cursor-pointer select-none">Kategori Aktif (Tampilkan di POS)</label>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-bold px-8">Kategori yang tidak aktif tidak akan muncul di layar kasir, namun data historis tetap tersimpan.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Side: Operational Logic */}
                                         <div className="space-y-8">
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Tipe & Cakupan</h3>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Berlaku Untuk</label>
                                                        <select
                                                            className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-[5px] focus:ring-indigo-500/5 font-bold text-sm text-slate-800 transition-all outline-none cursor-pointer"
                                                            value={newCategory.type}
                                                            onChange={e => setNewCategory({ ...newCategory, type: e.target.value })}
                                                        >
                                                            <option value="MENU">Menu / Produk Jadi (Penjualan)</option>
                                                            <option value="INGREDIENT">Bahan Baku (Inventaris Gudang)</option>
                                                            <option value="BOTH">Keduanya (Menu & Bahan Baku)</option>
                                                        </select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Default Target Stasiun (KDS/BDS)</label>
                                                        <div className="relative">
                                                            <input
                                                                list="stations"
                                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-[5px] focus:ring-indigo-500/5 font-bold text-sm text-slate-800 transition-all outline-none"
                                                                value={newCategory.productionTarget}
                                                                onChange={e => setNewCategory({ ...newCategory, productionTarget: e.target.value })}
                                                                placeholder="Pilih atau Ketik Stasiun..."
                                                            />
                                                            <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                            <datalist id="stations">
                                                                <option value="KDS">Kitchen (KDS)</option>
                                                                <option value="BDS">Bartender (BDS)</option>
                                                                <option value="NONE">Direct / Instan (Ready)</option>
                                                            </datalist>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-50">
                                        <button
                                            type="submit"
                                            className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98] uppercase tracking-[0.2em] text-sm"
                                        >
                                            <Save className="w-5 h-5" />
                                            Simpan Konfigurasi Kategori
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {showWasteModal && (
                <WasteDeclarationModal 
                    isOpen={showWasteModal} 
                    onClose={() => setShowWasteModal(false)} 
                    items={ingredients || []}
                    onSuccess={() => {
                        fetchData();
                        alert('Deklarasi waste berhasil diajukan untuk approval.');
                    }}
                />
            )}
            {showImportModal && (
                <ImportExcelModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    onSuccess={() => {
                        setShowImportModal(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
}

export default function InventoryPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center font-black text-slate-400 animate-pulse uppercase tracking-[0.3em] text-xs">Memuat Dashboard Inventory...</div>}>
            <InventoryContent />
        </Suspense>
    );
}
