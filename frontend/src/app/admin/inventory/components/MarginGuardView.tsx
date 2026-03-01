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
    AlertCircle
} from 'lucide-react';
import { MenuItem } from '../types';
import { getConversionFactor } from '@/utils/inventoryUtils';
interface MarginGuardViewProps {
    menuItems: MenuItem[];
}

export const MarginGuardView: React.FC<MarginGuardViewProps> = ({ menuItems }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [healthFilter, setHealthFilter] = useState<'all' | 'premium' | 'healthy' | 'at-risk'>('all');

    // Financial Analytics Logic
    const analytics = menuItems.map(item => {
        // Calculate dynamic HPP from recipes
        const recipeHpp = (item.recipes || []).reduce((acc, recipe) => {
            const ing = (recipe as any).ingredient; // In relation
            if (ing) {
                const factor = getConversionFactor(recipe.unit, ing.unit);
                const yieldFactor = (ing.yieldPercentage || 100) / 100;
                return acc + ((Number(recipe.quantity) * Number(ing.costPrice) * factor) / yieldFactor);
            }
            return acc;
        }, 0);

        // Fallback to manual baseHpp if no recipes
        const hpp = recipeHpp > 0 ? recipeHpp : Number(item.productFinance?.baseHpp || 0);

        const price = Number(item.price || 0);
        const margin = price > 0 ? ((price - hpp) / price) * 100 : 0;
        const threshold = Number(item.productFinance?.maxHppThreshold || 35);
        const hppPercent = price > 0 ? (hpp / price) * 100 : 0;

        let health: 'premium' | 'healthy' | 'at-risk' = 'healthy';
        if (margin > 70) health = 'premium';
        else if (margin < 40) health = 'at-risk';

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

    const atRiskCount = analytics.filter(i => i.health === 'at-risk' || i.isUnderperforming).length;
    const premiumCount = analytics.filter(i => i.health === 'premium').length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Avg Portfolio Margin Card */}
                <div className="relative group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.1)] transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] hover:-translate-y-2 overflow-hidden active:scale-[0.98]">
                    <div className="absolute -right-12 -top-12 w-48 h-48 bg-gradient-to-br from-indigo-600/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="absolute bottom-0 left-0 w-0 group-hover:w-full h-1.5 bg-indigo-600 transition-all duration-500 ease-out" />
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-indigo-600/10 text-indigo-600 shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                <TrendingUp className="w-7 h-7" />
                            </div>
                            <span className="text-emerald-500 font-black text-xs flex items-center bg-emerald-50 px-3 py-1.5 rounded-full shadow-sm">
                                <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                                +2%
                            </span>
                        </div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">Avg. Portfolio Margin</p>
                        <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none mb-4">{Math.round(avgMargin)}%</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Kesehatan profitabilitas menu sangat baik.</p>
                    </div>
                </div>

                {/* Risky Items Card */}
                <div className="relative group bg-white p-8 rounded-[2.5rem] border border-rose-100 shadow-[0_10px_40px_-20px_rgba(225,29,72,0.1)] transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(225,29,72,0.15)] hover:-translate-y-2 overflow-hidden active:scale-[0.98]">
                    <div className="absolute -right-12 -top-12 w-48 h-48 bg-gradient-to-br from-rose-600/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="absolute bottom-0 left-0 w-0 group-hover:w-full h-1.5 bg-rose-600 transition-all duration-500 ease-out" />
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-rose-600/10 text-rose-600 shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                <AlertCircle className="w-7 h-7" />
                            </div>
                            <div className="px-3 py-1.5 bg-rose-100 rounded-full text-[10px] font-black text-rose-600 uppercase shadow-sm">Perlu Review</div>
                        </div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">Risky Items (At-Risk)</p>
                        <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none mb-4">{atRiskCount}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Item dengan margin rendah / HPP tinggi.</p>
                    </div>
                </div>

                {/* Premium Items Card (Dark Style) */}
                <div className="relative group bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] transition-all duration-500 hover:shadow-[0_30px_70px_-10px_rgba(0,0,0,0.5)] hover:-translate-y-2 overflow-hidden active:scale-[0.98]">
                    <div className="absolute -right-12 -top-12 w-48 h-48 bg-gradient-to-br from-indigo-500/20 to-transparent blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="absolute bottom-0 left-0 w-0 group-hover:w-full h-1.5 bg-indigo-500 transition-all duration-500 ease-out" />
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/10 text-indigo-400 shadow-sm group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 border border-white/5">
                                <ShieldCheck className="w-7 h-7" />
                            </div>
                            <div className="px-3 py-1.5 bg-indigo-500/20 rounded-full text-[10px] font-black text-indigo-300 uppercase shadow-sm border border-indigo-500/30">Margin High</div>
                        </div>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 leading-none">Premium Items (Cash Cows)</p>
                        <h3 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none mb-4">{premiumCount}</h3>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Daftar penyumbang profit terbesar.</p>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 p-4 rounded-3xl">
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Cari performa menu..."
                        className="w-full pl-12 pr-6 py-3 bg-white rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 outline-none transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                    {[
                        { id: 'all', label: 'Semua Status' },
                        { id: 'premium', label: '🟢 Premium' },
                        { id: 'healthy', label: '🟡 Sehat' },
                        { id: 'at-risk', label: '🔴 At-Risk' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setHealthFilter(f.id as any)}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${healthFilter === f.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Financial Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map(item => (
                    <div key={item.id} className={`bg-white rounded-[2rem] border-2 p-6 transition-all hover:shadow-lg relative overflow-hidden ${item.isUnderperforming ? 'border-rose-100' : 'border-slate-50 hover:border-indigo-100'}`}>
                        {item.isUnderperforming && (
                            <div className="absolute top-4 right-4 animate-bounce">
                                <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-4 mb-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold ${item.health === 'premium' ? 'bg-indigo-50 text-indigo-600' : item.health === 'healthy' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                                {item.name.charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-black text-slate-900 leading-none mb-1">{item.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.category?.name || 'Uncategorized'}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50 rounded-2xl">
                                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">HPP (COGS)</p>
                                    <p className="font-bold text-slate-900 text-sm">Rp {Math.round(item.hpp).toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl">
                                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Harga Jual</p>
                                    <p className="font-bold text-slate-900 text-sm">Rp {item.price.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Margin Keuntungan</span>
                                    <span className={`text-sm font-black ${item.health === 'premium' ? 'text-indigo-600' : item.health === 'healthy' ? 'text-amber-600' : 'text-rose-600'}`}>
                                        {Math.round(item.margin)}%
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${item.health === 'premium' ? 'bg-indigo-500' : item.health === 'healthy' ? 'bg-amber-500' : 'bg-rose-500'}`}
                                        style={{ width: `${Math.min(100, item.margin)}%` }}
                                    />
                                </div>
                            </div>

                            {item.isUnderperforming && (
                                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                                    <div className="flex items-center gap-2 mb-1">
                                        <AlertCircle className="w-3 h-3 text-rose-600" />
                                        <p className="text-[9px] font-black text-rose-600 uppercase">HPP Constraint Violation</p>
                                    </div>
                                    <p className="text-[8px] font-bold text-rose-800 leading-tight">
                                        HPP ({Math.round(item.hppPercent)}%) melebihi ambang batas ({item.productFinance?.maxHppThreshold}%). Keuntungan tergerus biaya bahan baku.
                                    </p>
                                </div>
                            )}

                            {item.health === 'premium' && (
                                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                                    <div className="flex items-center gap-2 mb-1">
                                        <ShieldCheck className="w-3 h-3 text-indigo-600" />
                                        <p className="text-[9px] font-black text-indigo-600 uppercase">Cash Cow Item</p>
                                    </div>
                                    <p className="text-[8px] font-bold text-indigo-800 leading-tight">
                                        Item ini memiliki margin yang sangat sehat. Pertahankan atau tingkatkan pemasaran pada item ini.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {filteredItems.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <Filter className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Tidak ada data ditemukan</h3>
                        <p className="text-slate-400 font-medium">Coba gunakan filter atau kata kunci pencarian lain.</p>
                    </div>
                )}
            </div>

            {/* Proactive Tip */}
            <div className="p-10 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[3rem] text-white relative overflow-hidden shadow-2xl shadow-indigo-100">
                <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                    <ShieldCheck className="w-40 h-40" />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 rounded-full mb-6 border border-indigo-500/30">
                        <Info className="w-4 h-4 text-indigo-300" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Tips Optimasi Margin</span>
                    </div>
                    <h2 className="text-3xl font-black mb-4">Meningkatkan Keuntungan Tanpa Menaikkan Harga.</h2>
                    <p className="text-indigo-200/80 font-medium leading-relaxed mb-8">
                        Item dengan status <span className="text-rose-400">🔴 At-Risk</span> biasanya disebabkan oleh inefisiensi resep atau kenaikan harga supplier. Tinjau kembali formula resep Anda di tab Recipes untuk melihat detail breakdown biaya bahan.
                    </p>
                    <button className="px-8 py-4 bg-white text-indigo-950 rounded-2xl font-black flex items-center gap-3 hover:translate-x-2 transition-all">
                        Review Resep Bermasalah
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
