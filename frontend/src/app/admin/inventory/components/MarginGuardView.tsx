'use client';

import React, { useState } from 'react';
import {
    ShieldCheck,
    AlertTriangle,
    TrendingUp,
    DollarSign,
    ChevronRight,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Info,
    AlertCircle,
    Zap
} from 'lucide-react';
import { MenuItem, Ingredient } from '../types';
import { getConversionFactor } from '@/utils/inventoryUtils';
import { formatRupiah as fmt, formatNumber as fn } from '@/utils/formatUtils';
interface MarginGuardViewProps {
    menuItems: MenuItem[];
    ingredients: Ingredient[];
}

export const MarginGuardView: React.FC<MarginGuardViewProps> = ({ menuItems, ingredients }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [healthFilter, setHealthFilter] = useState<'all' | 'premium' | 'healthy' | 'at-risk'>('all');

    // Financial Analytics Logic
    const analytics = menuItems.map(item => {
        // Calculate dynamic HPP from recipes using the passed ingredients prop
        const recipeHpp = (item.recipes || []).reduce((acc, recipe) => {
            // Find ingredient in the full list for accurate data
            const ing = ingredients.find(i => i.id === recipe.ingredientId);
            if (ing) {
                const factor = getConversionFactor(recipe.unit, ing.unit);
                const yieldFactor = (ing.yieldPercentage || 100) / 100;
                return acc + ((Number(recipe.quantity) * Number(ing.costPrice || 0) * factor) / yieldFactor);
            }
            
            // Handle sub-recipes (intermediate items)
            const sub = menuItems.find(m => m.id === recipe.subMenuItemId);
            if (sub) {
                const subHpp = Number(sub.productFinance?.baseHpp || (sub.price * 0.5));
                return acc + (Number(recipe.quantity) * subHpp);
            }
            return acc;
        }, 0);

        // Fallback to manual baseHpp if no recipes are defined
        const hpp = recipeHpp > 0 ? recipeHpp : Number(item.productFinance?.baseHpp || 0);

        const price = Number(item.price || 0);
        const margin = price > 0 ? ((price - hpp) / price) * 100 : 0;
        const threshold = Number(item.productFinance?.maxHppThreshold || 35);
        const hppPercent = price > 0 ? (hpp / price) * 100 : 0;

        let health: 'premium' | 'healthy' | 'at-risk' = 'healthy';
        if (margin > 60) health = 'premium'; // Above 60% margin is premium
        else if (hppPercent > threshold) health = 'at-risk'; // Exceeds HPP threshold

        const isUnderperforming = hppPercent > threshold;

        return {
            ...item,
            hpp,
            price,
            margin,
            hppPercent,
            health,
            isUnderperforming
        };
    });

    const filteredItems = analytics.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesHealth = healthFilter === 'all' || item.health === healthFilter;
        return matchesSearch && matchesHealth;
    });

    // Portfolio Metrics
    const avgMargin = analytics.length > 0
        ? analytics.reduce((acc, curr) => acc + curr.margin, 0) / analytics.length
        : 0;

    const atRiskCount = analytics.filter(i => i.health === 'at-risk').length;
    const premiumCount = analytics.filter(i => i.health === 'premium').length;

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header Analytics Cards - Premium Neo-Minimalist */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-8">
                {/* Avg Portfolio Margin Card */}
                <div className="relative group bg-white p-4 md:p-10 rounded-2xl md:rounded-[3.5rem] border border-slate-100 shadow-sm md:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] hover:-translate-y-2 overflow-hidden flex flex-col justify-between">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl transition-transform duration-1000 group-hover:scale-125" />
                    <div className="relative z-10 flex-1 flex flex-col">
                        <div className="flex justify-between items-start md:items-center mb-4 md:mb-10">
                            <div className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-[1.75rem] flex items-center justify-center bg-indigo-600 text-white shadow-lg md:shadow-xl shadow-indigo-100 group-hover:rotate-12 transition-transform duration-500 shrink-0">
                                <TrendingUp className="w-5 h-5 md:w-8 md:h-8" />
                            </div>
                            <div className="flex flex-col items-end md:items-center">
                                <span className="text-emerald-500 font-black text-[8px] md:text-xs flex items-center bg-emerald-50 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-full border border-emerald-100/50 mt-1 md:mt-0 uppercase">
                                    <ArrowUpRight className="w-2 h-2 md:w-3.5 md:h-3.5 mr-0.5 md:mr-1" />
                                    Portfolio
                                </span>
                            </div>
                        </div>
                        <div className="mt-auto">
                            <p className="text-[8px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest md:tracking-[0.3em] mb-1 md:mb-3 leading-none px-1">Avg. Margin</p>
                            <h3 className="text-3xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none mb-3 md:mb-6">{fn(avgMargin)}%</h3>
                            <div className="h-1.5 md:h-2 w-full bg-slate-50 rounded-full overflow-hidden mb-2 border border-slate-100/50">
                                 <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${avgMargin}%` }} />
                            </div>
                            <p className="text-[7px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tight px-1 line-clamp-2 md:line-clamp-none">Kesehatan profitabilitas menu terukur.</p>
                        </div>
                    </div>
                </div>

                {/* Risky Items Card */}
                <div className="relative group bg-white p-4 md:p-10 rounded-2xl md:rounded-[3.5rem] border border-rose-100 shadow-sm md:shadow-[0_20px_50px_-15px_rgba(225,29,72,0.05)] transition-all duration-500 hover:shadow-[0_40px_80px_-20px_rgba(225,29,72,0.1)] hover:-translate-y-2 overflow-hidden flex flex-col justify-between">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-rose-50/50 rounded-full blur-3xl transition-transform duration-1000 group-hover:scale-125" />
                    <div className="relative z-10 flex-1 flex flex-col">
                        <div className="flex justify-between items-start md:items-center mb-4 md:mb-10">
                            <div className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-[1.75rem] flex items-center justify-center bg-rose-500 text-white shadow-lg md:shadow-xl shadow-rose-100 group-hover:-rotate-12 transition-transform duration-500 shrink-0">
                                <AlertTriangle className="w-5 h-5 md:w-8 md:h-8" />
                            </div>
                            <div className="px-2 py-1 md:px-4 md:py-1.5 bg-rose-100 rounded-md md:rounded-full text-[8px] md:text-[10px] font-black text-rose-600 uppercase border border-rose-200 mt-1 md:mt-0">Kritis</div>
                        </div>
                        <div className="mt-auto">
                            <p className="text-[8px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest md:tracking-[0.3em] mb-1 md:mb-3 leading-none px-1">Risky Products</p>
                            <h3 className="text-3xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none mb-3 md:mb-6">{atRiskCount}</h3>
                            <div className="flex gap-1 md:gap-1.5">
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <div key={i} className={`h-1 md:h-1.5 flex-1 rounded-full ${i < atRiskCount ? 'bg-rose-500' : 'bg-slate-50'}`} />
                                ))}
                            </div>
                            <p className="text-[7px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-2 md:mt-4 px-1 line-clamp-2 md:line-clamp-none">Produk dengan HPP melampaui batas aman.</p>
                        </div>
                    </div>
                </div>

                {/* Premium Items Card (Dark Mode Look) */}
                <div className="col-span-2 md:col-span-1 relative group bg-slate-900 p-4 md:p-10 rounded-2xl md:rounded-[3.5rem] shadow-md md:shadow-[0_30px_70px_-15px_rgba(15,23,42,0.3)] transition-all duration-500 hover:shadow-[0_50px_100px_-20px_rgba(15,23,42,0.4)] hover:-translate-y-2 overflow-hidden border border-slate-800 flex flex-col justify-between">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl transition-transform duration-1000 group-hover:scale-125" />
                    <div className="relative z-10 flex-1 flex flex-col">
                        <div className="flex justify-between items-start md:items-center mb-4 md:mb-10">
                            <div className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-[1.75rem] flex items-center justify-center bg-gradient-to-br from-indigo-400 to-indigo-600 text-white shadow-lg md:shadow-xl shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-500 shrink-0">
                                <ShieldCheck className="w-5 h-5 md:w-8 md:h-8" />
                            </div>
                            <div className="px-2 py-1 md:px-4 md:py-1.5 bg-indigo-500/20 rounded-md md:rounded-full text-[8px] md:text-[10px] font-black text-indigo-300 uppercase border border-indigo-500/30 mt-1 md:mt-0">Premium</div>
                        </div>
                        <div className="mt-auto">
                            <p className="text-[8px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest md:tracking-[0.3em] mb-1 md:mb-3 leading-none px-1">Cash Cow Portfolio</p>
                            <h3 className="text-3xl md:text-6xl font-black text-white tracking-tighter leading-none mb-3 md:mb-6">{premiumCount}</h3>
                            <div className="h-1 md:h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex gap-0.5 md:gap-1">
                                 {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className={`h-full flex-1 ${i < premiumCount ? 'bg-indigo-400' : 'bg-transparent'}`} />
                                ))}
                            </div>
                            <p className="text-[7px] md:text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-2 md:mt-4 px-1 line-clamp-2 md:line-clamp-none">Produk dengan efisiensi biaya tertinggi.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Strategic Filters Section */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -ml-32 -mt-32 opacity-50" />
                
                <div className="relative z-10 flex-1 w-full">
                    <div className="flex items-center gap-3 mb-4 px-1">
                        <Filter className="w-4 h-4 text-indigo-600" />
                        <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Guard Analysis Filters</h5>
                    </div>
                    <div className="relative group w-full max-w-xl">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-all" />
                        <input
                            type="text"
                            placeholder="Cari performa menu dari database..."
                            className="w-full pl-16 pr-8 py-5 bg-slate-50/50 hover:bg-slate-50 rounded-[2rem] border-2 border-transparent focus:border-indigo-100 focus:bg-white focus:ring-[10px] focus:ring-indigo-500/5 font-bold text-slate-800 outline-none transition-all text-sm h-16"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2.5 p-2 bg-slate-50 rounded-[2.25rem] border border-slate-100/50 relative z-10">
                    {[
                        { id: 'all', label: 'SEMUA PRODUK', icon: <DollarSign className="w-4 h-4" /> },
                        { id: 'premium', label: 'PREMIUM', color: 'bg-indigo-600', text: 'text-indigo-600' },
                        { id: 'healthy', label: 'SEHAT', color: 'bg-amber-500', text: 'text-amber-500' },
                        { id: 'at-risk', label: 'AT-RISK', color: 'bg-rose-500', text: 'text-rose-500' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setHealthFilter(f.id as any)}
                            className={`px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 whitespace-nowrap active:scale-95 ${healthFilter === f.id 
                                ? 'bg-white text-slate-900 shadow-xl shadow-slate-200/50 border border-slate-100' 
                                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                        >
                            {f.color && <div className={`w-2 h-2 rounded-full ${f.color}`} />}
                            {f.icon && <span className={healthFilter === f.id ? 'text-indigo-600' : 'text-slate-300'}>{f.icon}</span>}
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Premium Analytical Grid (Desktop) */}
            <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredItems.map(item => (
                    <div key={item.id} className={`group bg-white rounded-[3rem] border border-slate-100 p-8 shadow-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 relative overflow-hidden flex flex-col ${item.isUnderperforming ? 'ring-2 ring-rose-500/10 border-rose-100 bg-rose-50/10' : ''}`}>
                        
                        {/* Status Glow */}
                        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-10 transition-opacity group-hover:opacity-30 ${item.health === 'premium' ? 'bg-indigo-500' : item.health === 'healthy' ? 'bg-amber-500' : 'bg-rose-500'}`} />

                        <div className="flex items-start justify-between mb-10 relative z-10">
                            <div className="flex items-center gap-5">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-inner border transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${item.health === 'premium' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : item.health === 'healthy' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                    {item.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 leading-none mb-1 group-hover:text-indigo-600 transition-colors uppercase tracking-tighter text-lg">{item.name}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.category?.name || 'GENERIC ITEM'}</span>
                                        <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                    </div>
                                </div>
                            </div>
                            {item.isUnderperforming && (
                                <div className="p-2.5 bg-rose-100 rounded-xl text-rose-600 shadow-sm border border-rose-200/50 animate-bounce">
                                    <AlertTriangle className="w-4 h-4" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-6 relative z-10 flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100/50 flex flex-col justify-center">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Calculated COGS</p>
                                    <p className="font-black text-slate-900 text-base">{fmt(item.hpp)}</p>
                                </div>
                                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100/50 flex flex-col justify-center">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Current Price</p>
                                    <p className="font-black text-slate-900 text-base">{fmt(item.price)}</p>
                                </div>
                            </div>

                            <div className="space-y-3 p-1">
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Profitability Index</span>
                                        <span className={`text-2xl font-black ${item.health === 'premium' ? 'text-indigo-600' : item.health === 'healthy' ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {fn(item.margin)}%
                                        </span>
                                    </div>
                                    <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center ${item.health === 'premium' ? 'border-indigo-100 text-indigo-600' : item.health === 'healthy' ? 'border-amber-100 text-amber-600' : 'border-rose-100 text-rose-600'}`}>
                                        <span className="text-[10px] font-black">{Math.round(item.margin)}</span>
                                    </div>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 flex p-0.5">
                                    <div
                                        className={`h-full rounded-full shadow-inner transition-all duration-1000 ${item.health === 'premium' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' : item.health === 'healthy' ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-rose-500 to-rose-600'}`}
                                        style={{ width: `${Math.max(5, Math.min(100, item.margin))}%` }}
                                    />
                                </div>
                            </div>

                            {item.isUnderperforming ? (
                                <div className="mt-auto p-4 bg-rose-50 border border-rose-100 rounded-[1.5rem] flex gap-4 items-start">
                                    <div className="p-2 bg-rose-500 text-white rounded-lg shadow-lg shadow-rose-200">
                                        <AlertCircle className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-wide mb-1">HPP Guard Warning</p>
                                        <p className="text-[9px] font-bold text-rose-800 leading-tight">
                                            HPP real ({fn(item.hppPercent)}%) melampaui limit sistem ({item.productFinance?.maxHppThreshold}%).
                                        </p>
                                    </div>
                                </div>
                            ) : item.health === 'premium' ? (
                                <div className="mt-auto p-4 bg-indigo-50 border border-indigo-100 rounded-[1.5rem] flex gap-4 items-start">
                                    <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-lg shadow-indigo-200">
                                        <TrendingUp className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wide mb-1">Optimal Performance</p>
                                        <p className="text-[9px] font-bold text-indigo-800 leading-tight">
                                            Kontribusi laba bersih sangat tinggi. Fokus pada konsistensi kualitas.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-auto p-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] flex gap-4 items-start">
                                    <div className="p-2 bg-slate-400 text-white rounded-lg">
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-wide mb-1">Stable Performance</p>
                                        <p className="text-[9px] font-bold text-slate-600 leading-tight">
                                            Margin dalam batas toleransi. Pantau harga bahan baku secara berkala.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Mobile Analytical Grid (Compact 2-Column) */}
            <div className="lg:hidden grid grid-cols-2 gap-3 p-3 bg-slate-50/30">
                {filteredItems.map(item => (
                    <div key={item.id} className={`group bg-white rounded-2xl border p-3 shadow-sm flex flex-col relative overflow-hidden ${item.isUnderperforming ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100'}`}>
                        <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shadow-inner border shrink-0 ${item.health === 'premium' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : item.health === 'healthy' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                    {item.name.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-black text-slate-900 leading-tight uppercase tracking-tight text-[11px] line-clamp-2 mb-0.5">{item.name}</h4>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate block">{item.category?.name || 'GENERIC'}</span>
                                </div>
                            </div>
                            {item.isUnderperforming && (
                                <div className="shrink-0 p-1 bg-rose-100 rounded text-rose-600 border border-rose-200/50">
                                    <AlertTriangle className="w-3 h-3" />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col">
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">COGS</span>
                                <span className="text-[9px] font-black text-slate-900">{fmt(item.hpp)}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col items-end">
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Price</span>
                                <span className="text-[9px] font-black text-slate-900">{fmt(item.price)}</span>
                            </div>
                        </div>

                        <div className="mt-auto flex flex-col">
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Margin</span>
                                <span className={`text-[11px] font-black ${item.health === 'premium' ? 'text-indigo-600' : item.health === 'healthy' ? 'text-amber-600' : 'text-rose-600'}`}>
                                    {fn(item.margin)}%
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                                <div
                                    className={`h-full rounded-full ${item.health === 'premium' ? 'bg-indigo-500' : item.health === 'healthy' ? 'bg-amber-500' : 'bg-rose-500'}`}
                                    style={{ width: `${Math.max(5, Math.min(100, item.margin))}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* AI Strategic Advisory Page Footer - Deep Dark Premium */}
            <div className="p-12 md:p-16 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 rounded-[4rem] text-white relative overflow-hidden shadow-[0_40px_100px_-30px_rgba(0,0,0,0.5)] border border-slate-800">
                <div className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none rotate-12 flex gap-4">
                    <ShieldCheck className="w-64 h-64" />
                    <DollarSign className="w-48 h-48 -mt-20" />
                </div>
                
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-indigo-500/10 rounded-full mb-10 border border-indigo-500/20 ">
                            <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">AI FINANCIAL GOVERNANCE</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black mb-8 tracking-tighter leading-[1.1]">
                            Optimalkan Profit Margin Berdasarkan <span className="text-indigo-400 underline decoration-indigo-500/50 underline-offset-8">Data Real-Time.</span>
                        </h2>
                        <p className="text-slate-400 font-medium leading-relaxed mb-10 text-lg max-w-xl">
                            Margin Guard secara otomatis membandingkan harga beli bahan baku terakhir dengan harga jual produk Anda. Lakukan penyesuaian resep atau harga saat status berubah menjadi <span className="text-rose-400 font-black">🔴 At-Risk</span>.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <button className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black flex items-center gap-3 hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-500/30 transition-all hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-xs">
                                Review High-HPP Items
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            <button className="px-10 py-5 bg-white/5 text-white rounded-[2rem] font-black flex items-center gap-3 hover:bg-white/10 transition-all border border-white/10 uppercase tracking-widest text-xs">
                                <Info className="w-5 h-5 text-indigo-400" />
                                Learn More
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
