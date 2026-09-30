import React, { useState } from 'react';
import { ChefHat, Edit2, Trash2, ArrowRight, Power, Zap, Package, Utensils, Cookie, Wind, Filter, Database, AlertTriangle, Plus, Minus, Save, Info, X } from 'lucide-react';
import InputField from '@/components/ui/InputField';
import { useAuth } from '@/context/AuthContext';
import { MenuItem, Ingredient } from '../types';
import { getConversionFactor } from '@/utils/inventoryUtils';
import { formatRupiah as fmt, formatNumber as fn } from '@/utils/formatUtils';

export function RecipesView({ 
    data, 
    ingredients, 
    availability = {},
    onManageRecipe, 
    onEdit, 
    onDelete, 
    onToggleActive, 
    showInactive,
    sortByEmpty,
    togglingIds,
    onUpdateStock
}: {
    data: MenuItem[],
    ingredients: Ingredient[],
    availability?: Record<string, number>,
    onManageRecipe: (menu: MenuItem) => void,
    onEdit: (menu: MenuItem) => void,
    onDelete: (id: number) => void,
    onToggleActive: (menu: MenuItem) => void,
    showInactive?: boolean,
    sortByEmpty?: boolean,
    togglingIds?: Set<number>,
    onUpdateStock?: (id: number, quantity: number, type: 'add' | 'subtract', reason: string) => void
}) {
    const { hasPermission } = useAuth();
    
    const [showAdjModal, setShowAdjModal] = useState(false);
    const [selectedIng, setSelectedIng] = useState<Ingredient | null>(null);
    const [adjQty, setAdjQty] = useState('');
    const [adjReason, setAdjReason] = useState('');

    const openRestock = (ing: Ingredient) => {
        setSelectedIng(ing);
        setAdjQty('');
        setAdjReason('');
        setShowAdjModal(true);
    };

    const handleConfirmAdjustment = () => {
        if (!selectedIng || !adjQty || !adjReason || !onUpdateStock) return;
        onUpdateStock(selectedIng.id, Number(adjQty), 'add', adjReason);
        setShowAdjModal(false);
    };
    
    // Filter data if showInactive is false
    let visibleData = showInactive ? data : data.filter(m => m.isActive !== false);

    if (sortByEmpty) {
        visibleData = [...visibleData].sort((a, b) => {
            const getIsCritical = (menu: MenuItem) => {
                if ((availability[menu.id] || 0) <= (menu.minStockLevel || 0) && (menu.recipes?.length || 0) > 0) {
                    const criticalIngs = (menu.recipes || []).filter((re: any) => {
                        const ing = ingredients.find(i => i.id === re.ingredientId);
                        const currentStock = ing ? Number(ing.stockQuantity) : 0;
                        if (currentStock < Number(re.quantity)) return true; // Empty
                        if (ing && currentStock <= Number(ing.minStockLevel)) return true; // Critical
                        const maxPortions = Math.floor(currentStock / Number(re.quantity));
                        if (maxPortions <= (menu.minStockLevel || 0) && maxPortions === (availability[menu.id] || 0)) return true; // Bottleneck
                        return false;
                    });
                    if (criticalIngs.length > 0) return true;
                }
                return false;
            };

            const aCrit = getIsCritical(a);
            const bCrit = getIsCritical(b);

            if (aCrit && !bCrit) return -1;
            if (!aCrit && bCrit) return 1;
            return 0;
        });
    }

    const getCategoryIcon = (name: string) => {
        const n = name?.toLowerCase() || '';
        if (n.includes('makan')) return <Utensils className="w-4 h-4 text-amber-500" />;
        if (n.includes('minum') || n.includes('bar')) return <Zap className="w-4 h-4 text-indigo-500" />;
        if (n.includes('snack')) return <Cookie className="w-4 h-4 text-amber-600" />;
        if (n.includes('rokok')) return <Wind className="w-4 h-4 text-slate-400" />;
        if (n.includes('store')) return <Package className="w-4 h-4 text-emerald-500" />;
        if (n.includes('bahan') || n.includes('raw')) return <Database className="w-4 h-4 text-slate-400" />;
        return <Filter className="w-4 h-4 text-slate-300" />;
    };

    const deptIcons: Record<string, React.ReactNode> = {
        'KITCHEN': <ChefHat className="w-4 h-4 text-amber-500" />,
        'BAR': <Zap className="w-4 h-4 text-indigo-500" />,
        'CASHIER': <Package className="w-4 h-4 text-emerald-500" />
    };

    if (visibleData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
                    <ChefHat className="w-10 h-10 text-slate-200" />
                </div>
                <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] mb-1">Database Kosong</p>
                <p className="text-slate-300 font-medium text-xs">Belum ada menu yang terdaftar di kategori ini.</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 rounded-tl-[2rem]">Info Produk</th>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Kategori</th>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Dept</th>
                            <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Harga Jual</th>
                            <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">HPP (Cost)</th>
                            <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Margin</th>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                            <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 rounded-tr-[2rem]">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {visibleData.map((menu) => {
                            const foodCost = (menu.recipes || []).reduce((acc, recipe) => {
                                const ing = ingredients.find(i => i.id === recipe.ingredientId);
                                if (ing) {
                                    const factor = getConversionFactor(recipe.unit, ing.unit);
                                    const yieldFactor = (ing.yieldPercentage || 100) / 100;
                                    return acc + ((Number(recipe.quantity) * Number(ing.costPrice) * factor) / yieldFactor);
                                }
                                const sub = data.find(m => m.id === recipe.subMenuItemId);
                                if (sub) {
                                    const factor = getConversionFactor(recipe.unit, 'Portion');
                                    return acc + (Number(recipe.quantity) * (Number(sub.price) * 0.7) * factor);
                                }
                                return acc;
                            }, 0);

                            const profit = Number(menu.price) - foodCost;
                            const margin = menu.price > 0 ? (profit / Number(menu.price)) * 100 : 0;

                            return (
                                <tr key={menu.id} className={`group hover:bg-slate-50/80 transition-all duration-300 ${menu.isActive === false ? 'opacity-50' : ''}`}>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-110 transition-transform duration-500">
                                                {menu.imageUrl ? <img src={menu.imageUrl} alt={menu.name} className="w-full h-full object-cover" /> : <ChefHat className="w-6 h-6 text-slate-200" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black text-slate-900 text-sm uppercase tracking-wider">{menu.name}</p>
                                                    {((typeof menu.category === 'object' ? (menu.category as any)?.name : menu.category)?.toUpperCase() === 'STORE' || menu.isMandatoryReporting) && (menu.recipes?.length || 0) === 0 && (
                                                        <div className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-100 animate-pulse">
                                                            <AlertTriangle className="w-3 h-3" />
                                                            <span className="text-[8px] font-black uppercase tracking-tighter">No Recipe</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400 tracking-tighter">SKU: {menu.sku || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                                                {getCategoryIcon(typeof menu.category === 'object' ? (menu.category as any)?.name : (menu.category || ''))}
                                            </div>
                                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                                {typeof menu.category === 'object' ? (menu.category as any)?.name : (menu.category || 'Uncategorized')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2" title={menu.department}>
                                            {deptIcons[menu.department || 'CASHIER']}
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{menu.department}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right font-black text-slate-700 text-sm">
                                        {fmt(menu.price)}
                                    </td>
                                    <td className="px-6 py-5 text-right font-black text-indigo-600 text-sm">
                                        {fmt(foodCost)}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`text-[11px] font-black ${margin > 35 ? 'text-emerald-600' : margin > 20 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                {fn(margin, 1)}%
                                            </span>
                                            <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${margin > 35 ? 'bg-emerald-500' : margin > 20 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                    style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col items-start gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight flex items-center justify-center gap-1.5 w-fit ${menu.isActive === false ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                    <div className={`w-1 h-1 rounded-full ${menu.isActive === false ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                                                    {menu.isActive === false ? 'Inactive' : 'Active'}
                                                </div>
                                                
                                                {menu.isActive !== false && (
                                                    <div className="flex flex-col items-start gap-1">
                                                        <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                                            (availability[menu.id] || 0) <= (menu.minStockLevel || 0) ? 'bg-rose-600 text-white border-rose-700 animate-pulse' : 'bg-slate-900 text-white border-slate-800 shadow-sm'
                                                        }`}>
                                                            STK: {availability[menu.id] || 0}
                                                        </div>
                                                        {((availability[menu.id] || 0) <= (menu.minStockLevel || 0) && (menu.recipes?.length || 0) > 0) && (
                                                            <div className="text-[8px] text-rose-500 font-bold max-w-[120px] leading-tight flex flex-col gap-0.5 mt-1">
                                                                {(() => {
                                                                    const criticalIngs = (menu.recipes || []).filter((re: any) => {
                                                                        const ing = ingredients.find(i => i.id === re.ingredientId);
                                                                        const currentStock = ing ? Number(ing.stockQuantity) : 0;
                                                                        if (currentStock < Number(re.quantity)) return true;
                                                                        if (ing && currentStock <= Number(ing.minStockLevel)) return true;
                                                                        const maxPortions = Math.floor(currentStock / Number(re.quantity));
                                                                        if (maxPortions <= (menu.minStockLevel || 0) && maxPortions === (availability[menu.id] || 0)) return true;
                                                                        return false;
                                                                    });
                                                                    
                                                                    if (criticalIngs.length === 0) return null;
                                                                    
                                                                    return (
                                                                        <>
                                                                            <span className="opacity-80">{(availability[menu.id] || 0) <= 0 ? 'Kosong:' : 'Kritis:'}</span>
                                                                            {criticalIngs.map((re: any, idx: number) => {
                                                                                const ing = ingredients.find(i => i.id === re.ingredientId);
                                                                                return (
                                                                                    <button 
                                                                                        key={idx}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            if (ing) openRestock(ing);
                                                                                        }}
                                                                                        className="text-left text-rose-600 hover:text-rose-800 hover:underline hover:bg-rose-50 px-1 py-0.5 rounded transition-colors whitespace-normal break-words"
                                                                                        title={`Restock ${ing?.name || 'Bahan'}`}
                                                                                    >
                                                                                        - {ing?.name || 'Bahan'}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {(menu.isHighValue || menu.isMandatoryReporting) && (
                                                <span className="text-[8px] font-black text-amber-500 uppercase px-1.5 py-0.5 bg-amber-50 rounded border border-amber-100/50">
                                                    {menu.auditFrequency || 'SHIFT'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2 px-1">
                                            {hasPermission('INV_TOGGLE_MENU') && (
                                                <button 
                                                    disabled={togglingIds?.has(menu.id)}
                                                    onClick={(e) => { e.stopPropagation(); onToggleActive(menu); }}
                                                    className={`p-2.5 border rounded-xl transition-all active:scale-90 shadow-sm ${menu.isActive === false ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white' : 'bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-600 hover:text-white'} ${togglingIds?.has(menu.id) ? 'opacity-50 cursor-not-allowed animate-pulse' : ''}`}
                                                    title={menu.isActive === false ? "Aktifkan Menu" : "Non-aktifkan Menu"}
                                                >
                                                    <Power className="w-4 h-4" />
                                                </button>
                                            )}
                                            {hasPermission('INV_RECIPE') && (
                                                <button 
                                                    onClick={() => onManageRecipe(menu)}
                                                    className={`p-2.5 rounded-xl transition-all active:scale-90 border shadow-sm relative ${
                                                        ((typeof menu.category === 'object' ? (menu.category as any)?.name : menu.category)?.toUpperCase() === 'STORE') && (menu.recipes?.length || 0) === 0
                                                        ? 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700 animate-bounce'
                                                        : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white'
                                                    }`}
                                                    title={((typeof menu.category === 'object' ? (menu.category as any)?.name : menu.category)?.toUpperCase() === 'STORE') && (menu.recipes?.length || 0) === 0 ? "⚠️ SEGERA HUBUNGKAN RESEP" : "Atur Formula Resep"}
                                                >
                                                    <Zap className="w-4 h-4" />
                                                    {((typeof menu.category === 'object' ? (menu.category as any)?.name : menu.category)?.toUpperCase() === 'STORE') && (menu.recipes?.length || 0) === 0 && (
                                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                                                            <div className="w-2 h-2 bg-rose-600 rounded-full animate-ping" />
                                                        </div>
                                                    )}
                                                </button>
                                            )}
                                            {hasPermission('INV_EDIT_MENU') && (
                                                <button 
                                                    onClick={() => onEdit(menu)}
                                                    className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all active:scale-90 border border-slate-100 shadow-sm"
                                                    title="Edit Detail"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            {hasPermission('INV_DELETE_MENU') && (
                                                <button 
                                                    onClick={() => onDelete(menu.id)}
                                                    className="p-2.5 bg-white text-slate-300 rounded-xl hover:bg-rose-600 hover:text-white transition-all active:scale-90 border border-slate-100 shadow-sm"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile View - Cards Layout (Compact & Proportional) */}
            <div className="lg:hidden grid grid-cols-2 gap-3 p-3">
                {visibleData.map((menu) => {
                     const foodCost = (menu.recipes || []).reduce((acc, recipe) => {
                        const ing = ingredients.find(i => i.id === recipe.ingredientId);
                        if (ing) {
                            const factor = getConversionFactor(recipe.unit, ing.unit);
                            const yieldFactor = (ing.yieldPercentage || 100) / 100;
                            return acc + ((Number(recipe.quantity) * Number(ing.costPrice) * factor) / yieldFactor);
                        }
                        return acc;
                    }, 0);
                    const margin = menu.price > 0 ? ((Number(menu.price) - foodCost) / Number(menu.price)) * 100 : 0;

                    return (
                        <div key={menu.id} className={`bg-white rounded-2xl border border-slate-100 p-3 shadow-sm relative overflow-hidden flex flex-col group transition-all ${menu.isActive === false ? 'opacity-60 bg-slate-50' : ''}`}>
                            
                            <div className="flex flex-col gap-2 mb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 flex-shrink-0 shadow-inner overflow-hidden group-hover:scale-105 transition-transform duration-500">
                                        {menu.imageUrl ? (
                                            <img src={menu.imageUrl} alt={menu.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <ChefHat className="w-5 h-5 text-slate-300" />
                                        )}
                                    </div>
                                    <div className={`shrink-0 px-1.5 py-0.5 rounded-md text-[6px] font-black uppercase tracking-widest ${menu.isActive === false ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {menu.isActive === false ? 'OFFLINE' : 'ONLINE'}
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-tight leading-tight line-clamp-2">{menu.name}</h3>
                                    <div className="flex items-center flex-wrap gap-1 mt-1">
                                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black rounded-md uppercase tracking-wider">
                                            {typeof menu.category === 'object' ? (menu.category as any)?.name : (menu.category || 'Menu')}
                                        </span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">SKU: {menu.sku || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-3 bg-slate-50 p-2 rounded-xl border border-slate-100/50">
                                <div>
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Selling Price</p>
                                    <p className="font-black text-slate-900 text-[10px]">{fmt(menu.price)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Margin</p>
                                    <p className={`font-black text-[10px] ${margin > 35 ? 'text-emerald-600' : 'text-amber-600'}`}>{fn(margin, 1)}%</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 mt-auto">
                                {hasPermission('INV_TOGGLE_MENU') && (
                                    <button 
                                        disabled={togglingIds?.has(menu.id)}
                                        onClick={() => onToggleActive(menu)} 
                                        className={`py-1.5 rounded-lg border flex items-center justify-center transition-all active:scale-90 ${menu.isActive === false ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'} ${togglingIds?.has(menu.id) ? 'opacity-50 animate-pulse' : ''}`}
                                        title={menu.isActive === false ? "Aktifkan" : "Non-aktifkan"}
                                    >
                                        <Power className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {hasPermission('INV_EDIT_MENU') && (
                                    <button onClick={() => onEdit(menu)} className="py-1.5 rounded-lg border border-slate-100 bg-white text-slate-400 font-black flex items-center justify-center active:bg-slate-50 transition-all shadow-sm">
                                        <Edit2 size={12} />
                                    </button>
                                )}
                                {hasPermission('INV_RECIPE') && (
                                    <button onClick={() => onManageRecipe(menu)} className="py-1.5 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center shadow-md shadow-indigo-100 active:scale-95 transition-all">
                                        <Zap size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Restock Modal inline */}
            {showAdjModal && selectedIng && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 pb-24">
                    <div className="absolute inset-0 bg-slate-900/60 animate-in fade-in" onClick={() => setShowAdjModal(false)} />
                    <div className="relative bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-12 duration-500">
                        <div className="p-10 pb-6 text-center">
                            <div className="w-24 h-24 mx-auto mb-8 rounded-[2rem] flex items-center justify-center shadow-2xl bg-emerald-50 text-emerald-600 shadow-emerald-100">
                                <Plus className="w-10 h-10" />
                            </div>
                            
                            <h3 className="text-3xl font-black text-slate-900 uppercase leading-none mb-3 tracking-tighter">Penyesuaian Stok</h3>
                            <div className="flex items-center justify-center gap-2 mb-10">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Produk:</span>
                                <span className="text-sm font-black text-slate-600 uppercase tracking-tight">{selectedIng.name}</span>
                            </div>

                            <div className="space-y-6 text-left capitalize">
                                <InputField
                                    label={`Jumlah Tambahan (${selectedIng.unit})`}
                                    type="number"
                                    value={adjQty}
                                    onChange={setAdjQty}
                                    placeholder="Masukkan kuantitas..."
                                    required
                                    autoFocus
                                    step="any"
                                    className="premium-input-xl"
                                />

                                <InputField
                                    label="Alasan Perubahan"
                                    type="textarea"
                                    value={adjReason}
                                    onChange={setAdjReason}
                                    placeholder="Berikan alasan perubahan stok (misal: Barang baru masuk)"
                                    required
                                    rows={3}
                                />
                            </div>

                            <div className="mt-8 bg-indigo-50/50 p-5 rounded-[1.5rem] flex items-start gap-4 border border-indigo-100/50">
                                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-100">
                                    <Info className="w-4 h-4" />
                                </div>
                                <p className="text-[10px] leading-relaxed text-indigo-700 font-bold uppercase tracking-tight text-left">
                                    Catatan: Setiap perubahan stok akan direkam secara permanen dalam audit log sistem.
                                </p>
                            </div>
                        </div>

                        <div className="p-10 pt-4 flex gap-4">
                            <button
                                onClick={() => setShowAdjModal(false)}
                                className="flex-1 py-5 rounded-[1.5rem] font-black text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all active:scale-95 uppercase tracking-[0.2em] text-xs"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirmAdjustment}
                                disabled={!adjQty || !adjReason}
                                className="flex-[2] py-5 rounded-[1.5rem] font-black text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em] text-xs bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                            >
                                <div className="flex items-center justify-center gap-3">
                                    <Save className="w-4 h-4" />
                                    KONFIRMASI
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
