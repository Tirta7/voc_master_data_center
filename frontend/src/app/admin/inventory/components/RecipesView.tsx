import React from 'react';
import { ChefHat, Edit2, Trash2, ArrowRight, TrendingUp, DollarSign, Power } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MenuItem, Ingredient } from '../types';
import { getConversionFactor } from '@/utils/inventoryUtils';

export function RecipesView({ data, ingredients, onManageRecipe, onEdit, onDelete, onToggleActive }: {
    data: MenuItem[],
    ingredients: Ingredient[],
    onManageRecipe: (menu: MenuItem) => void,
    onEdit: (menu: MenuItem) => void,
    onDelete: (id: number) => void,
    onToggleActive: (menu: MenuItem) => void
}) {
    const { hasPermission } = useAuth();
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <ChefHat className="w-16 h-16 text-slate-200 mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm italic">Belum ada menu terdaftar</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 p-4 md:p-8">
            {data.map((menu) => {
                // Calculate Food Cost
                const foodCost = (menu.recipes || []).reduce((acc, recipe) => {
                    const ing = ingredients.find(i => i.id === recipe.ingredientId);
                    if (ing) {
                        const factor = getConversionFactor(recipe.unit, ing.unit);
                        const yieldFactor = (ing.yieldPercentage || 100) / 100;
                        return acc + ((Number(recipe.quantity) * Number(ing.costPrice) * factor) / yieldFactor);
                    }
                    // Handle sub-recipes if needed (using 70% of price as placeholder if cost unknown)
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
                    <div key={menu.id} className={`bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-100 p-5 md:p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col relative overflow-hidden ${menu.isActive === false ? 'grayscale-[0.8] opacity-75' : ''}`}>
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        {menu.isActive === false && (
                            <div className="absolute inset-0 bg-slate-900/5 z-10 pointer-events-none flex items-center justify-center">
                                <div className="bg-rose-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg -rotate-12 border-2 border-white">Terdiskoneksi / Non-Aktif</div>
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-6">
                            <div className="flex gap-2">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 shadow-inner border border-slate-100 group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                                    {menu.imageUrl ? <img src={menu.imageUrl} alt={menu.name} className="w-full h-full object-cover" /> : <ChefHat className="w-8 h-8" />}
                                </div>
                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                    {hasPermission('INV_RECIPE') && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onToggleActive(menu); }}
                                                className={`p-1.5 bg-white shadow-sm border border-slate-100 rounded-lg transition-all active:scale-90 ${menu.isActive === false ? 'text-emerald-500 hover:text-emerald-600 hover:border-emerald-100' : 'text-rose-400 hover:text-rose-600 hover:border-rose-100'}`}
                                                title={menu.isActive === false ? "Aktifkan Menu" : "Non-aktifkan Menu"}
                                            >
                                                <Power className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); onEdit(menu); }} className="p-1.5 bg-white shadow-sm border border-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all active:scale-90"><Edit2 className="w-3.5 h-3.5" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); onDelete(menu.id); }} className="p-1.5 bg-white shadow-sm border border-slate-100 rounded-lg text-slate-400 hover:text-rose-600 hover:border-rose-100 transition-all active:scale-90"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${menu.isActive === false ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white'}`}>{menu.category?.name || 'Uncategorized'}</span>
                            </div>
                        </div>
                        <div className="mb-4">
                            <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-widest">{menu.name}</h3>
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-bold text-slate-400">Harga Jual</p>
                                <p className="text-sm font-black text-indigo-600">Rp {menu.price.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Food Cost & Margin Info */}
                        <div className="bg-slate-50/50 rounded-2xl p-4 mb-6 border border-slate-100 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <DollarSign className="w-3 h-3 text-emerald-500" /> Food Cost (HPP)
                                </span>
                                <span className="text-xs font-black text-slate-700">Rp {foodCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3 text-indigo-500" /> Profit Margin
                                </span>
                                <span className={`text-xs font-black ${margin > 50 ? 'text-emerald-600' : margin > 30 ? 'text-indigo-600' : 'text-amber-600'}`}>
                                    {margin.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${margin > 50 ? 'bg-emerald-500' : margin > 30 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                                    style={{ width: `${Math.min(margin, 100)}%` }}
                                />
                            </div>
                        </div>

                        {hasPermission('INV_RECIPE') && (
                            <button
                                onClick={() => onManageRecipe(menu)}
                                className="w-full bg-slate-900 text-white border border-slate-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 hover:border-indigo-600 transition-all flex items-center justify-center gap-3 mt-auto shadow-lg shadow-slate-100 active:scale-[0.98]"
                            >
                                Atur Formula <ArrowRight size={16} />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
