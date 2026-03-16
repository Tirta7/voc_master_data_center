'use client';

import React, { useState, useEffect } from 'react';
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
    TrendingUp
} from 'lucide-react';
import InputField from '@/components/ui/InputField';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useMqtt } from '@/context/MqttContext';

import { inventorySocket, socket } from '@/lib/socket';
import { Ingredient, Category, MenuItem } from './types';
import { CategoriesView } from './components/CategoriesView';
import { InventoryStockView } from './components/InventoryStockView';
import { RecipesView } from './components/RecipesView';
import { StatCard } from './components/StatCard';
import { StockReportView } from './components/StockReportView';
import { MarginGuardView } from './components/MarginGuardView';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtK = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1000000000) return `Rp ${(n / 1000000000).toFixed(abs % 1000000000 === 0 ? 0 : 1)}B`;
    if (abs >= 1000000) return `Rp ${(n / 1000000).toFixed(abs % 1000000 === 0 ? 0 : 1)}M`;
    if (abs >= 1000) return `Rp ${(n / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}K`;
    return fmt(n);
};


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

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState<'stock' | 'recipes' | 'categories' | 'report' | 'margin-guard'>('stock');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
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
        imageUrl: ''
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
            imageUrl: ''
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
        _calcMethod: 'margin'
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
            _calcMethod: 'margin'
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
        isActive: true
    });

    useBodyScrollLock(showAddModal || showAddMenuModal || showRecipeModal || showCategoryModal);

    useEffect(() => {
        fetchData();

        const onInventoryUpdate = (data: Ingredient) => {
            console.log('Inventory data updated via real-time channel:', data);
            setIngredients(prev => prev.map(ing =>
                ing.id === data.id ? { ...data } : ing
            ));

            setMenuItems(prev => prev.map(menu => ({
                ...menu,
                recipes: menu.recipes?.map(recipe =>
                    recipe.ingredientId === data.id
                        ? { ...recipe, ingredient: { ...data } }
                        : recipe
                )
            })));
        };

        const onMenuAvailability = (data: any) => {
            console.log('Menu availability updated via WebSocket:', data);
            fetchData(true); // silent: no skeleton blink on background update
        };

        // WebSocket Channel
        inventorySocket.on('inventoryUpdate', onInventoryUpdate);
        socket.on('menuAvailability', onMenuAvailability);

        const unsubs = [
            subscribe('billiard/inventory/update', (data) => onInventoryUpdate(data)),
            subscribe('billiard/menu/availability', (data) => {
                console.log('Menu availability updated via MQTT:', data);
                fetchData(true); // silent: no skeleton blink on background update
            })
        ];

        return () => {
            inventorySocket.off('inventoryUpdate', onInventoryUpdate);
            socket.off('menuAvailability', onMenuAvailability);
            unsubs.forEach(u => u());
        };
    }, [subscribe, socket]);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [ingRes, menuRes, catRes] = await Promise.all([
                axios.get(`${API_URL}/inventory/ingredients`),
                axios.get(`${API_URL}/cafe/menu?includeInactive=true`),
                axios.get(`${API_URL}/cafe/categories`)
            ]);
            setIngredients(ingRes.data);
            setMenuItems(menuRes.data);
            setCategories(catRes.data);
        } catch (error) {
            console.error('Failed to fetch inventory data:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleAddIngredient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingIngredient) {
                await axios.patch(`${API_URL}/inventory/ingredients/${editingIngredient.id}`, newIngredient);
            } else {
                await axios.post(`${API_URL}/inventory/ingredients`, newIngredient);
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
            imageUrl: ing.imageUrl || ''
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
            imageUrl: ing.imageUrl || ''
        });
        setShowAddModal(true);
    };

    const handleDeleteIngredient = async (id: number) => {
        if (!confirm('Apakah Anda yakin ingin menghapus bahan baku ini? Formula resep yang menggunakan bahan ini mungkin akan terpengaruh.')) return;
        try {
            await axios.delete(`${API_URL}/inventory/ingredients/${id}`);
            fetchData();
        } catch (error) {
            alert('Gagal menghapus bahan baku');
        }
    };

    const updateStock = async (id: number, quantity: number, type: 'add' | 'subtract') => {
        try {
            await axios.patch(`${API_URL}/inventory/ingredients/${id}/stock`, { quantity, type });
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
                stockQuantity: newMenu.stockQuantity ? Number(newMenu.stockQuantity) : 0,
                minStockLevel: newMenu.minStockLevel ? Number(newMenu.minStockLevel) : 0,
                categoryId: Number(newMenu.categoryId),
                productFinance: newMenu.productFinance
            };

            if (editingMenu) {
                await axios.patch(`${API_URL}/cafe/menu/${editingMenu.id}`, menuData);
            } else {
                await axios.post(`${API_URL}/cafe/menu`, menuData);
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
            price: menu.price.toString(),
            taxPercentage: menu.taxPercentage?.toString() || '0',
            stockQuantity: menu.stockQuantity?.toString() || '0',
            minStockLevel: menu.minStockLevel?.toString() || '0',
            description: menu.description || '',
            imageUrl: menu.imageUrl || '',
            productFinance: menuFinance
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
            productFinance: menuFinance
        });
        setShowAddMenuModal(true);
    };

    const handleToggleMenuItemActive = async (menu: MenuItem) => {
        try {
            await axios.patch(`${API_URL}/cafe/menu/${menu.id}`, { isActive: !menu.isActive });
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Gagal mengubah status menu');
        }
    };

    const handleDeleteMenu = async (id: number) => {
        if (!confirm('Apakah Anda yakin ingin menghapus menu ini? Formula resep untuk menu ini juga akan ikut terhapus.')) return;
        try {
            await axios.delete(`${API_URL}/cafe/menu/${id}`);
            fetchData();
        } catch (error) {
            alert('Gagal menghapus menu');
        }
    };

    const handleUpdateRecipes = async () => {
        if (!selectedMenu) return;
        try {
            // Clean up recipes: ensure ingredientId/subMenuItemId are present and quantity > 0
            const validRecipes = recipeIngredients.filter(r => (r.ingredientId || r.subMenuItemId) && Number(r.quantity) > 0);

            await axios.put(`${API_URL}/cafe/menu/${selectedMenu.id}/recipes`, {
                recipes: validRecipes.map(r => ({
                    ...r,
                    ingredientId: r.ingredientId ? Number(r.ingredientId) : null,
                    subMenuItemId: r.subMenuItemId ? Number(r.subMenuItemId) : null,
                    quantity: Number(r.quantity)
                })) as any
            });

            // Also update menu price and finance
            await axios.patch(`${API_URL}/cafe/menu/${selectedMenu.id}`, {
                price: Number(selectedMenu.price),
                productFinance: selectedMenu.productFinance
            } as any);

            alert('Formula resep berhasil diperbarui');
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
                await axios.patch(`${API_URL}/cafe/categories/${editingCategory.id}`, newCategory);
            } else {
                await axios.post(`${API_URL}/cafe/categories`, newCategory);
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
            await axios.delete(`${API_URL}/cafe/categories/${id}`);
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

    const filteredIngredients = ingredients.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredMenu = menuItems.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        totalItems: ingredients.length,
        criticalStock: ingredients.filter(i => Number(i.stockQuantity) <= Number(i.minStockLevel)).length,
        activeMenu: menuItems.filter(m => !m.isSubRecipe).length,
        valuation: fmtK(ingredients.reduce((acc, curr) => acc + (Number(curr.stockQuantity) * Number(curr.costPrice || 0)), 0))
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
            <div className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-0">
                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-800 via-indigo-700 to-slate-900 rounded-3xl p-8 lg:p-10 text-white shadow-2xl shadow-indigo-200 mb-6 md:mb-10">
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
                        <div className="bg-white/10 backdrop-blur-sm p-1.5 rounded-2xl border border-white/20 flex overflow-x-auto whitespace-nowrap scrollbar-hide self-start lg:self-auto w-full lg:w-auto gap-1">
                            <button
                                onClick={() => setActiveTab('stock')}
                                className={`flex-shrink-0 flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'stock'
                                    ? 'bg-white text-indigo-700 shadow-md'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <Package className="w-4 h-4" /> Stock
                            </button>
                            <button
                                onClick={() => setActiveTab('recipes')}
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

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-10">
                    {[
                        { label: 'TOTAL BAHAN', value: stats.totalItems, icon: '📦', gradient: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-700' },
                        { label: 'STOK KRITIS', value: stats.criticalStock, icon: '⚠️', gradient: 'from-rose-500 to-rose-600', light: 'bg-rose-50', text: 'text-rose-700' },
                        { label: 'MENU AKTIF', value: stats.activeMenu, icon: '🍳', gradient: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700' },
                        { label: 'VALUASI STOK', value: stats.valuation, icon: '💰', gradient: 'from-amber-500 to-amber-600', light: 'bg-amber-50', text: 'text-amber-700' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-lg shadow-slate-100/60 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`w-10 h-10 ${s.light} rounded-2xl flex items-center justify-center text-lg`}>{s.icon}</div>
                                <div className={`h-1 w-8 rounded-full bg-gradient-to-r ${s.gradient}`} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                            <p className={`text-xl font-black ${s.text} leading-none`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-3xl md:rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-white overflow-hidden min-h-[500px] flex flex-col w-full">
                    {/* Visual Header & Controls */}
                    <div className="p-4 md:p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between gap-4 sticky top-0 bg-white z-10">
                        {activeTab !== 'report' && (
                            <div className="relative flex-1 max-w-md group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder={`Cari ${activeTab === 'stock' ? 'bahan baku' : activeTab === 'margin-guard' ? 'performa menu' : 'resep menu'}...`}
                                    className="w-full pl-14 pr-6 py-4 bg-slate-50/50 hover:bg-slate-50 focus:bg-white rounded-2xl border-2 border-transparent focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        )}

                        {activeTab === 'stock' ? (
                            <div className="flex gap-3">
                                {hasPermission('INV_UPDATE') && (
                                    <button
                                        onClick={openAddIngredientModal}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-200 active:scale-95 w-full md:w-auto"
                                    >
                                        <Plus className="w-5 h-5" />
                                        <span className="hidden md:inline">Tambah Bahan</span>
                                        <span className="md:hidden">Baru</span>
                                    </button>
                                )}
                            </div>
                        ) : activeTab === 'recipes' ? (
                            <div className="flex gap-3">
                                {hasPermission('INV_RECIPE') && (
                                    <button
                                        onClick={openAddMenuModal}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-200 active:scale-95 w-full md:w-auto"
                                    >
                                        <Plus className="w-5 h-5" />
                                        <span className="hidden md:inline">Tambah Menu</span>
                                        <span className="md:hidden">Baru</span>
                                    </button>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 bg-slate-50/30 relative">
                        {loading ? (
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
                                        menuItems={menuItems}
                                        onUpdateStock={updateStock}
                                        onEdit={openEditModal}
                                        onDelete={handleDeleteIngredient}
                                    />
                                ) : activeTab === 'recipes' ? (
                                    <RecipesView
                                        data={filteredMenu}
                                        ingredients={ingredients}
                                        onManageRecipe={openRecipeModal}
                                        onEdit={openEditMenuModal}
                                        onDelete={handleDeleteMenu}
                                        onToggleActive={handleToggleMenuItemActive}
                                    />
                                ) : activeTab === 'categories' ? (
                                    <CategoriesView
                                        data={categories}
                                        onEdit={(cat) => {
                                            setEditingCategory(cat);
                                            setNewCategory({ ...cat });
                                            setShowCategoryModal(true);
                                        }}
                                        onDelete={handleDeleteCategory}
                                        onAdd={() => {
                                            setEditingCategory(null);
                                            setNewCategory({ name: '', productionTarget: 'KDS', isActive: true });
                                            setShowCategoryModal(true);
                                        }}
                                    />
                                ) : activeTab === 'report' ? (
                                    <div className="p-8">
                                        <StockReportView ingredients={ingredients} menuItems={menuItems} />
                                    </div>
                                ) : (
                                    <div className="p-8">
                                        <MarginGuardView menuItems={menuItems} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Ingredient Modal */}
                {showAddModal && (
                    <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-end sm:items-center justify-center overscroll-contain">
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => { setShowAddModal(false); resetIngredientForm(); }} />
                        <div className="relative bg-white rounded-t-[3rem] sm:rounded-[3rem] w-full max-w-4xl p-6 sm:p-10 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 max-h-[92vh] sm:max-h-[90vh] flex flex-col">
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <div className="flex justify-between items-center mb-5 md:mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">{editingIngredient ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}</h2>
                                    <p className="text-slate-500 font-medium text-xs md:text-sm">Input detail bahan baku untuk akurasi HPP (COGS).</p>
                                </div>
                                <button onClick={() => { setShowAddModal(false); resetIngredientForm(); }} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-90 shadow-sm border border-slate-100 group">
                                    <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                                </button>
                            </div>

                            <form onSubmit={handleAddIngredient} className="space-y-6 md:space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
                                    {/* Left Column: Info & Stock */}
                                    <div className="space-y-8">
                                        {/* Section: Basic Info */}
                                        <div className="space-y-4 md:space-y-6">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Informasi Dasar</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Kategori</label>
                                                    <select
                                                        className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 focus:outline-none transition-all"
                                                        value={newIngredient.category}
                                                        onChange={e => setNewIngredient({ ...newIngredient, category: e.target.value })}
                                                    >
                                                        <option value="Raw Material">Bahan Mentah</option>
                                                        <option value="Packaging">Packaging</option>
                                                        <option value="Semi-Finished">Bahan Setengah Jadi</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Satuan</label>
                                                    <select
                                                        className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 focus:outline-none transition-all"
                                                        value={newIngredient.unit}
                                                        onChange={e => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                                                    >
                                                        <option value="Gram">Gram</option>
                                                        <option value="Ml">Mililiter</option>
                                                        <option value="Pcs">Pieces</option>
                                                        <option value="Kg">Kilogram</option>
                                                        <option value="L">Liter</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section: Stock & Measurement */}
                                        <div className="space-y-4 md:space-y-6">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Stok & Pengukuran</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                                                <InputField
                                                    label="Stock Tersedia"
                                                    type="number"
                                                    value={newIngredient.stockQuantity}
                                                    savedValue={lastSavedIngredient?.stockQuantity}
                                                    onChange={val => setNewIngredient({ ...newIngredient, stockQuantity: val })}
                                                    placeholder="0"
                                                    isEditing={!!editingIngredient}
                                                    required
                                                />
                                                <InputField
                                                    label="Min. Stock Alert"
                                                    type="number"
                                                    value={newIngredient.minStockLevel}
                                                    savedValue={lastSavedIngredient?.minStockLevel}
                                                    onChange={val => setNewIngredient({ ...newIngredient, minStockLevel: val })}
                                                    placeholder="0"
                                                    isEditing={!!editingIngredient}
                                                    required
                                                />
                                                <InputField
                                                    label="Yield (%)"
                                                    type="number"
                                                    value={newIngredient.yieldPercentage}
                                                    savedValue={lastSavedIngredient?.yieldPercentage}
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
                                            </div>
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
                                            <div className="bg-amber-50/50 p-3 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-amber-100/50 space-y-4 md:space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                                    <InputField
                                                        label="Harga Pembelian (Total)"
                                                        type="number"
                                                        value={newIngredient.purchasePrice}
                                                        onChange={val => {
                                                            const pPrice = Number(val) || 0;
                                                            const pQty = Number(newIngredient.purchaseQuantity) || 1;
                                                            const yieldVal = Number(newIngredient.yieldPercentage) || 100;
                                                            const factorLabels = ['Kg', 'L', 'Liter'];
                                                            const factor = factorLabels.includes(newIngredient.purchaseUnit) ? 1000 : 1;
                                                            let baseCost = (pPrice / (pQty * factor)) / (yieldVal / 100);
                                                            if (isNaN(baseCost) || !isFinite(baseCost)) baseCost = 0;
                                                            setNewIngredient({ ...newIngredient, purchasePrice: val, costPrice: baseCost });
                                                        }}
                                                        placeholder="Contoh: 100000"
                                                        suffix={<span className="font-bold text-slate-400">Rp</span>}
                                                    />
                                                    {editingIngredient?.lastPurchasePrice && (
                                                        <div className="md:col-span-1 lg:col-span-3 -mt-2 mb-2 px-1">
                                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-full shadow-sm">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Beli Terakhir:</span>
                                                                <span className="text-xs font-bold text-amber-600">Rp {Number(editingIngredient.lastPurchasePrice).toLocaleString()}</span>
                                                                <span className="text-[10px] font-bold text-slate-400">({editingIngredient.lastPurchaseQuantity} {editingIngredient.lastPurchaseUnit})</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <InputField
                                                        label="Isi per Kemasan"
                                                        type="number"
                                                        value={newIngredient.purchaseQuantity}
                                                        onChange={val => {
                                                            const pQty = Number(val) || 1;
                                                            const pPrice = Number(newIngredient.purchasePrice) || 0;
                                                            const yieldVal = Number(newIngredient.yieldPercentage) || 100;
                                                            const factorLabels = ['Kg', 'L', 'Liter'];
                                                            const factor = factorLabels.includes(newIngredient.purchaseUnit) ? 1000 : 1;
                                                            let baseCost = (pPrice / (pQty * factor)) / (yieldVal / 100);
                                                            if (isNaN(baseCost) || !isFinite(baseCost)) baseCost = 0;
                                                            setNewIngredient({ ...newIngredient, purchaseQuantity: val, costPrice: baseCost });
                                                        }}
                                                        placeholder="1"
                                                    />
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Satuan Pembelian</label>
                                                        <select
                                                            className="w-full px-5 py-4 bg-white rounded-2xl border-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-800 focus:outline-none transition-all shadow-sm"
                                                            value={newIngredient.purchaseUnit}
                                                            onChange={e => {
                                                                const pUnit = e.target.value;
                                                                const pPrice = Number(newIngredient.purchasePrice) || 0;
                                                                const pQty = Number(newIngredient.purchaseQuantity) || 1;
                                                                const yieldVal = Number(newIngredient.yieldPercentage) || 100;
                                                                const factorLabels = ['Kg', 'L', 'Liter'];
                                                                const factor = factorLabels.includes(pUnit) ? 1000 : 1;
                                                                let baseCost = (pPrice / (pQty * factor)) / (yieldVal / 100);
                                                                if (isNaN(baseCost) || !isFinite(baseCost)) baseCost = 0;
                                                                setNewIngredient({ ...newIngredient, purchaseUnit: pUnit, costPrice: baseCost });
                                                            }}
                                                        >
                                                            <option value="Gram">Unit (Gram/Pcs)</option>
                                                            <option value="Kg">Bulk (Kg/Liter)</option>
                                                            <option value="Ml">Mililiter</option>
                                                            <option value="Liter">Liter</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 md:gap-4 bg-white/80 p-3 md:p-4 rounded-2xl border border-amber-100">
                                                    <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
                                                        <Zap className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <InputField
                                                            label={`Hasil Konversi (Harga per ${newIngredient.unit || 'Satuan'})`}
                                                            type="number"
                                                            value={newIngredient.costPrice}
                                                            savedValue={lastSavedIngredient?.costPrice}
                                                            onChange={val => setNewIngredient({ ...newIngredient, costPrice: val })}
                                                            placeholder="0"
                                                            isEditing={!!editingIngredient}
                                                            required
                                                            suffix={<span className="font-bold text-slate-400">Rp</span>}
                                                            className="bg-transparent border-none shadow-none p-0 focus:ring-0"
                                                        />
                                                    </div>
                                                </div>
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
                                                    rows={2}
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
                    <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-end sm:items-center justify-center overscroll-contain">
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => { setShowAddMenuModal(false); setEditingMenu(null); }} />
                        <div className="relative bg-white rounded-t-[3rem] sm:rounded-[3rem] w-full max-w-2xl p-6 sm:p-10 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 max-h-[92vh] sm:max-h-[90vh] flex flex-col">
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <div className="flex justify-between items-center mb-5 md:mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">{editingMenu ? 'Edit Menu' : 'Tambah Menu'}</h2>
                                    <p className="text-slate-500 font-medium text-xs md:text-sm">{editingMenu ? 'Update detail menu dalam katalog cafe.' : 'Input menu baru ke dalam katalog cafe.'}</p>
                                </div>
                                <button onClick={() => { setShowAddMenuModal(false); setEditingMenu(null); }} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-90 shadow-sm border border-slate-100 group">
                                    <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                                </button>
                            </div>

                            <form onSubmit={handleAddMenu} className="space-y-6 md:space-y-8">
                                <div className="space-y-8">
                                    {/* Left Column: Info & Pricing */}
                                    <div className="space-y-8">
                                        {/* Section: Basic Info */}
                                        <div className="space-y-6">
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
                                                    label="SKU / Kode Menu"
                                                    value={newMenu.sku}
                                                    savedValue={lastSavedMenu?.sku}
                                                    onChange={val => setNewMenu({ ...newMenu, sku: val })}
                                                    placeholder="MNU-001"
                                                    isEditing={!!editingMenu}
                                                />
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Kategori</label>
                                                    <select
                                                        className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 focus:outline-none transition-all shadow-sm"
                                                        value={newMenu.categoryId}
                                                        onChange={e => setNewMenu({ ...newMenu, categoryId: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">Pilih Kategori</option>
                                                        {categories.map(cat => (
                                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Target Produksi (Opsional)</label>
                                                    <input
                                                        list="stations"
                                                        className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 focus:outline-none transition-all shadow-sm"
                                                        value={newMenu.productionTarget}
                                                        onChange={e => setNewMenu({ ...newMenu, productionTarget: e.target.value })}
                                                        placeholder="Ikuti Kategori (Default)"
                                                    />
                                                    <datalist id="stations">
                                                        <option value="KDS">Kitchen (KDS)</option>
                                                        <option value="BDS">Bartender (BDS)</option>
                                                        <option value="NONE">Direct / Instan (Ready)</option>
                                                    </datalist>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Tanggal Kadaluwarsa</label>
                                                    <input
                                                        type="date"
                                                        className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 focus:outline-none transition-all shadow-sm"
                                                        value={newMenu.expiryDate}
                                                        onChange={e => setNewMenu({ ...newMenu, expiryDate: e.target.value })}
                                                    />
                                                </div>

                                                {categories.find(c => c.id === Number(newMenu.categoryId))?.name.toUpperCase() === 'STORE' && (
                                                    <>
                                                        <InputField
                                                            label="Jumlah Stok"
                                                            type="number"
                                                            value={newMenu.stockQuantity}
                                                            savedValue={lastSavedMenu?.stockQuantity}
                                                            onChange={val => setNewMenu({ ...newMenu, stockQuantity: val })}
                                                            placeholder="0.00"
                                                            isEditing={!!editingMenu}
                                                            required
                                                        />
                                                        <InputField
                                                            label="Stok Minimum (Alert)"
                                                            type="number"
                                                            value={newMenu.minStockLevel}
                                                            savedValue={lastSavedMenu?.minStockLevel}
                                                            onChange={val => setNewMenu({ ...newMenu, minStockLevel: val })}
                                                            placeholder="0.00"
                                                            isEditing={!!editingMenu}
                                                            required
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Section: Pricing & Tax */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Harga & Pajak</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <InputField
                                                    label="Harga Jual"
                                                    type="number"
                                                    value={newMenu.price}
                                                    savedValue={lastSavedMenu?.price}
                                                    onChange={val => {
                                                        const price = Number(val);
                                                        const hpp = Number(newMenu.productFinance.baseHpp);
                                                        const margin = price > 0 ? ((price - hpp) / price) * 100 : 0;
                                                        const markupFixed = price - hpp;
                                                        const markupPercent = hpp > 0 ? ((price - hpp) / hpp) * 100 : 0;
                                                        const multiplier = hpp > 0 ? price / hpp : 1;

                                                        setNewMenu({
                                                            ...newMenu,
                                                            price: val,
                                                            productFinance: {
                                                                ...newMenu.productFinance,
                                                                targetMarginPercent: margin,
                                                                targetMarkupFixed: markupFixed,
                                                                targetMarkupPercent: markupPercent,
                                                                targetMultiplier: multiplier
                                                            }
                                                        });
                                                    }}
                                                    placeholder="0"
                                                    isEditing={!!editingMenu}
                                                    required
                                                    suffix={<span className="font-bold text-slate-400">Rp</span>}
                                                />
                                                <InputField
                                                    label="Pajak (%)"
                                                    type="number"
                                                    value={newMenu.taxPercentage}
                                                    savedValue={lastSavedMenu?.taxPercentage}
                                                    onChange={val => setNewMenu({ ...newMenu, taxPercentage: val })}
                                                    placeholder="0"
                                                    isEditing={!!editingMenu}
                                                />
                                            </div>
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
                                                label="Deskripsi Menu"
                                                type="textarea"
                                                value={newMenu.description}
                                                savedValue={lastSavedMenu?.description}
                                                onChange={val => setNewMenu({ ...newMenu, description: val })}
                                                placeholder="Penjelasan singkat menu..."
                                                isEditing={!!editingMenu}
                                                rows={2}
                                            />
                                            <InputField
                                                label="URL Foto Produk"
                                                value={newMenu.imageUrl}
                                                savedValue={lastSavedMenu?.imageUrl}
                                                onChange={val => setNewMenu({ ...newMenu, imageUrl: val })}
                                                placeholder="https://..."
                                                isEditing={!!editingMenu}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-2xl font-black shadow-lg transition-all mt-4 flex items-center justify-center gap-3 active:scale-95"
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
                    <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-end sm:items-center justify-center overscroll-contain">
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowRecipeModal(false)} />
                        <div className="relative bg-white rounded-t-[3rem] sm:rounded-[3rem] w-full max-w-3xl shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-bottom-full sm:zoom-in-95 duration-500 max-h-[96vh] sm:max-h-[92vh] flex flex-col border border-white">

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
                                        <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                                <Database className="w-10 h-10 text-slate-400" />
                                            </div>
                                            <p className="font-bold text-slate-600">Belum ada bahan baku ditambahkan</p>
                                            <p className="text-sm mt-1">Silahkan tambah bahan pertama anda di bawah</p>
                                        </div>
                                    ) : (
                                        recipeIngredients.map((recipe, index) => {
                                            const ing = ingredients.find(i => i.id === recipe.ingredientId);
                                            const sub = menuItems.find(m => m.id === recipe.subMenuItemId);
                                            const unitPrice = ing ? Number(ing.costPrice) : (sub ? sub.price * 0.7 : 0);
                                            const yieldFactor = ing ? (ing.yieldPercentage / 100) : 1;
                                            const isValid = (recipe.ingredientId || recipe.subMenuItemId) && recipe.quantity > 0;

                                            return (
                                                <div key={index} className={`relative group animate-in slide-in-from-left-4 duration-300 delay-[${index * 50}ms]`}>
                                                    <div className={`bg-white rounded-[2rem] p-5 border-2 transition-all hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] ${!isValid ? 'border-rose-100 bg-rose-50/10' : 'border-slate-100 hover:border-indigo-100'}`}>
                                                        <div className="flex flex-col lg:flex-row items-center gap-5">

                                                            {/* Row Label/Counter */}
                                                            <div className="hidden lg:flex flex-shrink-0 w-8 h-8 items-center justify-center rounded-xl bg-slate-50 text-[10px] font-black text-slate-400 border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                                                                {index + 1}
                                                            </div>

                                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-5 w-full">
                                                                {/* Item Selection */}
                                                                <div className="md:col-span-4 lg:col-span-5">
                                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Pilih Item / Bahan</label>
                                                                    <div className="relative">
                                                                        <select
                                                                            className={`w-full pl-5 pr-10 py-4 bg-slate-50 rounded-2xl border-2 transition-all font-bold text-slate-800 appearance-none focus:bg-white focus:ring-4 focus:ring-indigo-50/50 ${!recipe.ingredientId && !recipe.subMenuItemId ? 'border-rose-200' : 'border-transparent focus:border-indigo-500'}`}
                                                                            value={recipe.ingredientId ? `ing-${recipe.ingredientId}` : (recipe.subMenuItemId ? `sub-${recipe.subMenuItemId}` : '')}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                const newRecipes = [...recipeIngredients];
                                                                                if (val.startsWith('ing-')) {
                                                                                    const id = Number(val.replace('ing-', ''));
                                                                                    newRecipes[index] = { ingredientId: id, quantity: recipe.quantity, unit: ingredients.find(i => i.id === id)?.unit || '' };
                                                                                } else if (val.startsWith('sub-')) {
                                                                                    const id = Number(val.replace('sub-', ''));
                                                                                    newRecipes[index] = { subMenuItemId: id, quantity: recipe.quantity, unit: 'Portion' };
                                                                                }
                                                                                setRecipeIngredients(newRecipes);
                                                                            }}
                                                                        >
                                                                            <option value="">-- Pilih --</option>
                                                                            <optgroup label="📦 Bahan Baku (Inventory)">
                                                                                {ingredients.map(i => <option key={i.id} value={`ing-${i.id}`}>{i.name}</option>)}
                                                                            </optgroup>
                                                                            <optgroup label="🍳 Intermediate (Sub-Menu)">
                                                                                {menuItems.filter(m => m.id !== selectedMenu.id).map(m => <option key={m.id} value={`sub-${m.id}`}>{m.name}</option>)}
                                                                            </optgroup>
                                                                        </select>
                                                                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 scale-75 pointer-events-none" />
                                                                    </div>
                                                                </div>

                                                                {/* Quantity & Unit Row */}
                                                                <div className="md:col-span-4 lg:col-span-4 flex items-end gap-2">
                                                                    <div className="flex-1">
                                                                        <InputField
                                                                            label="Kuantitas"
                                                                            type="number"
                                                                            value={recipe.quantity === 0 ? '' : recipe.quantity}
                                                                            savedValue={originalRecipeIngredients[index]?.quantity}
                                                                            onChange={val => {
                                                                                const newRecipes = [...recipeIngredients];
                                                                                newRecipes[index].quantity = Number(val);
                                                                                setRecipeIngredients(newRecipes);
                                                                            }}
                                                                            placeholder="0"
                                                                            isEditing={!!originalRecipeIngredients[index]}
                                                                            className="!py-4"
                                                                        />
                                                                    </div>
                                                                    <div className="w-24 flex-shrink-0">
                                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Unit</label>
                                                                        <select
                                                                            className="w-full px-4 py-4 bg-slate-50 rounded-2xl border-2 border-transparent transition-all font-black text-indigo-600 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 appearance-none text-center"
                                                                            value={recipe.unit}
                                                                            onChange={(e) => {
                                                                                const newRecipes = [...recipeIngredients];
                                                                                newRecipes[index].unit = e.target.value;
                                                                                setRecipeIngredients(newRecipes);
                                                                            }}
                                                                        >
                                                                            {['Gram', 'Kg', 'Ml', 'Liter', 'Pcs', 'Pack', 'Butir', 'Portion'].map(u => <option key={u} value={u}>{u}</option>)}
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {/* Row Cost Insight */}
                                                                <div className="md:col-span-3 lg:col-span-2 flex flex-col justify-end">
                                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Row Cost</label>
                                                                    <div className="px-5 py-4 bg-indigo-50/50 rounded-2xl font-black text-indigo-600 shadow-inner flex items-center h-[60px] text-sm overflow-hidden whitespace-nowrap">
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
                                                                <div className="md:col-span-1 lg:col-span-1 flex items-end justify-center pb-2">
                                                                    <button
                                                                        onClick={() => setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index))}
                                                                        className="p-4 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all active:scale-90"
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
                                                    const ing = ingredients.find(i => i.id === curr.ingredientId);
                                                    const sub = menuItems.find(m => m.id === curr.subMenuItemId);
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
                                            <div className="flex items-end gap-1.5 md:gap-2">
                                                <p className={`text-lg md:text-2xl font-black leading-none ${(() => {
                                                    const cost = recipeIngredients.reduce((acc, curr) => {
                                                        const ing = ingredients.find(i => i.id === curr.ingredientId);
                                                        const sub = menuItems.find(m => m.id === curr.subMenuItemId);
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
                                                            const ing = ingredients.find(i => i.id === curr.ingredientId);
                                                            const sub = menuItems.find(m => m.id === curr.subMenuItemId);
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
                                                                const ing = ingredients.find(i => i.id === curr.ingredientId);
                                                                const sub = menuItems.find(m => m.id === curr.subMenuItemId);
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
                                                            Current: Rp {menuItems.find(m => m.id === selectedMenu?.id)?.price.toLocaleString()}
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
                                                    className="flex-[2] bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 md:py-5 rounded-2xl md:rounded-[2rem] font-black shadow-[0_20px_40px_-8px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-2 md:gap-3 active:scale-[0.98] group text-xs md:text-base uppercase tracking-widest md:tracking-normal"
                                                >
                                                    <Save className="w-5 h-5 md:w-6 md:h-6 group-hover:animate-bounce" />
                                                    <span>Simpan Formula</span>
                                                </button>
                                                <button
                                                    onClick={() => setShowRecipeModal(false)}
                                                    className="flex-1 bg-white hover:bg-slate-50 text-slate-600 py-4 md:py-5 rounded-2xl md:rounded-[2rem] font-black border border-slate-200 transition-all active:scale-[0.98] text-xs md:text-base uppercase tracking-widest md:tracking-normal"
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
                {/* Category Management Modal */}
                {
                    showCategoryModal && (
                        <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-end sm:items-center justify-center overscroll-contain">
                            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowCategoryModal(false)} />
                            <div className="relative bg-white rounded-t-[3rem] sm:rounded-[3rem] w-full max-w-lg p-6 sm:p-10 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900">{editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}</h2>
                                        <p className="text-slate-500 font-medium text-xs md:text-sm">Atur pengelompokan menu dan target produksi.</p>
                                    </div>
                                    <button onClick={() => setShowCategoryModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-90 shadow-sm border border-slate-100 group">
                                        <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                                    </button>
                                </div>

                                <form onSubmit={handleCategoryAction} className="space-y-6">
                                    <InputField
                                        label="Nama Kategori"
                                        value={newCategory.name}
                                        onChange={val => setNewCategory({ ...newCategory, name: val })}
                                        placeholder="Contoh: Merchandise"
                                        required
                                    />

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Default Target Produksi</label>
                                        <input
                                            list="stations"
                                            className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 focus:outline-none transition-all shadow-sm"
                                            value={newCategory.productionTarget}
                                            onChange={e => setNewCategory({ ...newCategory, productionTarget: e.target.value })}
                                            placeholder="Pilih atau Ketik Station"
                                        />
                                        <datalist id="stations">
                                            <option value="KDS">Kitchen (KDS)</option>
                                            <option value="BDS">Bartender (BDS)</option>
                                            <option value="NONE">Direct / Instan (Ready)</option>
                                        </datalist>
                                    </div>

                                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <input
                                            type="checkbox"
                                            id="isActiveCat"
                                            checked={newCategory.isActive}
                                            onChange={e => setNewCategory({ ...newCategory, isActive: e.target.checked })}
                                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <label htmlFor="isActiveCat" className="text-sm font-bold text-slate-700 select-none">Kategori Aktif (Tampilkan di POS)</label>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black shadow-lg shadow-indigo-100 transition-all mt-4 flex items-center justify-center gap-3 active:scale-95"
                                    >
                                        <Save className="w-5 h-5" />
                                        SIMPAN KATEGORI
                                    </button>
                                </form>
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
}
