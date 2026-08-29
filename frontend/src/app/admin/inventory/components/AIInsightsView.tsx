'use client';

import React from 'react';
import {
    Brain,
    TrendingUp,
    AlertTriangle,
    Clock,
    Calendar,
    ChevronRight,
    Zap,
    Target,
    PieChart,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    DollarSign,
    Package
} from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatRupiah as fmt, formatCompact as fmtK } from '@/utils/formatUtils';
import dayjs from 'dayjs';

import { Ingredient, MenuItem } from "../types";

export function AIInsightsView({
  ingredients,
  menuItems,
}: {
  ingredients: Ingredient[];
  menuItems: MenuItem[];
}) {
    const { data: wastePredictions, isLoading: loadingWaste } = useSWR<any[]>('/ai/predict-waste', fetcher, { refreshInterval: 5000 });
    const { data: menuMatrix, isLoading: loadingMatrix } = useSWR<any>('/ai/menu-matrix', fetcher, { refreshInterval: 5000 });
    const { data: anomalies, isLoading: loadingAnomalies } = useSWR<any[]>('/ai/waste-anomalies', fetcher, { refreshInterval: 5000 });
    const { data: smartSuggestion } = useSWR<any>('/ai/smart-suggestion', fetcher, { refreshInterval: 5000 });
    const { data: stats } = useSWR<any>('/inventory/stats', fetcher, { refreshInterval: 5000 });
    const { data: activeShift } = useSWR<any>('/finance/shifts/active', fetcher, { refreshInterval: 5000 });

    if (loadingWaste || loadingMatrix) {
        return (
            <div className="p-8 space-y-8">
                <div className="h-48 bg-slate-100 rounded-[2.5rem] animate-pulse" />
                <div className="grid grid-cols-2 gap-8">
                    <div className="h-96 bg-slate-100 rounded-[2.5rem] animate-pulse" />
                    <div className="h-96 bg-slate-100 rounded-[2.5rem] animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-10 bg-slate-50/50">
            {/* Header / Hero */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Brain className="w-6 h-6" />
                        </div>
                        <span className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.3em]">Neural Analytics v2.0</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">AI Insights & Predictions</h2>
                    <p className="text-slate-500 font-medium text-sm mt-1">Deep Learning for Inventory Optimization & Revenue Shield</p>
                </div>

                <div className="flex gap-4 p-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="px-6 py-3 border-r border-slate-100 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Asset Value</p>
                        <p className="text-xl font-black text-emerald-600">{fmtK(stats?.totalAssetValue || 0)}</p>
                    </div>
                    <div className="px-6 py-3 border-r border-slate-100 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock Alerts</p>
                        <p className="text-xl font-black text-rose-600">{stats?.lowStockCount || 0}</p>
                    </div>
                    <div className="px-6 py-3 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expiring</p>
                        <div className="flex items-center gap-2 justify-center">
                            <p className={`text-xl font-black ${stats?.expiringSoon?.length > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-700'}`}>
                                {stats?.expiringSoon?.length || 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expiry Alert Section (Urgent) */}
            {stats?.expiringSoon?.length > 0 && (
                <div className="bg-gradient-to-r from-rose-50 to-amber-50 rounded-[2.5rem] border border-rose-100 p-8 shadow-xl shadow-rose-100/20">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
                            <Clock className="w-6 h-6 animate-spin-slow" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Perhatian: Bahan Mendekati Kadaluarsa</h3>
                            <p className="text-xs font-bold text-rose-600 uppercase tracking-widest">Gunakan bahan-bahan ini segera untuk menghindari kerugian</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {stats.expiringSoon.map((item: any, i: number) => (
                            <div key={i} className="bg-white p-6 rounded-[2rem] border border-rose-100 shadow-sm flex items-center justify-between group hover:border-rose-300 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 uppercase tracking-wider text-sm">{item.name}</p>
                                        <p className="text-[10px] font-bold text-rose-500 uppercase">{dayjs(item.expiryDate).format('DD MMM YYYY')}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="px-3 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">
                                        {item.daysLeft <= 0 ? 'BASI' : `${item.daysLeft} HARI`}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Prediction Section: Holiday Risk */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center border border-rose-100 shadow-sm">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 uppercase tracking-tight">Waste Risk Predictions</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Upcoming Closure / Holidays Analysis</p>
                                </div>
                            </div>
                            <div className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                Critical Alert
                            </div>
                        </div>

                        {wastePredictions && wastePredictions.length > 0 ? (
                            <div className="space-y-4">
                                {wastePredictions.map((wp: any, i: number) => (
                                    <div key={i} className="group p-6 bg-slate-50 hover:bg-white hover:ring-2 hover:ring-rose-200/50 rounded-3xl border border-slate-100/50 transition-all duration-300">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-inner group-hover:scale-110 transition-transform">
                                                    <Package className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 uppercase tracking-wider">{wp.name}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                                            <Clock className="w-3 h-3" /> Ends in {wp.daysUntilClosure} days
                                                        </span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{wp.reason}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-rose-600 leading-none">-{wp.potentialWaste}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Valuation: {fmt(wp.valuation)}</p>
                                            </div>
                                        </div>
                                        <div className="mt-5 flex items-center gap-4">
                                            <div className="flex-1 h-2 bg-white rounded-full overflow-hidden border border-slate-100 shadow-inner">
                                                <div className="h-full bg-rose-500 rounded-full" style={{ width: '75%' }} />
                                            </div>
                                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest shrink-0">HIGH RISK</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                                    <Zap className="w-8 h-8" />
                                </div>
                                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] mb-1">Optimized State</p>
                                <p className="text-slate-300 font-medium text-xs">AI tidak mendeteksi risiko waste dalam periode 7 hari ke depan.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Anomaly Detection */}
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/40 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                        <div className="relative">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-white/10">
                                    <Activity className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-black uppercase tracking-tight">Anomaly Detector</h3>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Real-time Pattern Monitor</p>
                                </div>
                            </div>

                            {anomalies && anomalies.length > 0 ? (
                                <div className="space-y-5">
                                    {anomalies.map((a: any, i: number) => (
                                        <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                            <div className="w-10 h-10 bg-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center shrink-0">
                                                <TrendingUp className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-black uppercase tracking-wider">{a.itemName}</p>
                                                <p className="text-[9px] font-medium text-slate-400 mt-1 uppercase leading-relaxed">
                                                    Pola waste tidak wajar terdeteksi pada {new Date(a.date).toLocaleDateString()}. Estimasi: {fmt(a.valuation)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 text-center opacity-40">
                                    <p className="text-[10px] font-black uppercase tracking-widest">System Stable</p>
                                    <p className="text-[9px] mt-1 uppercase">No suspicious fluctuations</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Advice Card */}
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-200/50">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center ">
                                <Target className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="font-black uppercase tracking-tight">Smart Suggestion</h3>
                        </div>
                        <p className="text-sm font-semibold leading-relaxed text-indigo-100">
                            "{smartSuggestion?.message || "Menganalisis pola inventaris untuk memberikan saran optimasi terbaik..."}"
                        </p>
                        <button className="w-full mt-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all active:scale-95 flex items-center justify-center gap-2">
                            {smartSuggestion?.action === 'BOOST_SALES' ? 'Buka Promo Manager' :
                                smartSuggestion?.action === 'OPTIMIZE_EXPIRY' ? 'Cek Stok Kadaluarsa' :
                                    'Optimasi Sekarang'} <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Menu Matrix Section */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-xl shadow-slate-200/30">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 mb-12">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm">
                                <PieChart className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 uppercase tracking-tight">Menu Engineering Matrix</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">30-Day Sales & Profit Performance</p>
                            </div>
                        </div>
                        <p className="text-slate-500 font-medium text-sm max-w-xl">
                            Analisis otomatis mengkategorikan menu Anda berdasarkan popularitas dan margin kontribusi untuk menentukan strategi harga dan porsi.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        {[
                            { label: 'STARS', sub: 'High sales, High profit', color: 'bg-emerald-500' },
                            { label: 'PLOWHORSES', sub: 'High sales, Low profit', color: 'bg-indigo-500' },
                            { label: 'PUZZLES', sub: 'Low sales, High profit', color: 'bg-amber-500' },
                            { label: 'DOGS', sub: 'Low sales, Low profit', color: 'bg-rose-500' },
                        ].map((cat, i) => (
                            <div key={i} className="px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 w-44">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                                    <p className="text-[10px] font-black text-slate-900 tracking-widest">{cat.label}</p>
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{cat.sub}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    {menuMatrix?.matrix?.slice(0, 8).map((m: any, i: number) => (
                        <div key={i} className="group p-3 md:p-6 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-100 hover:bg-white hover:ring-2 hover:ring-indigo-100 transition-all duration-300 flex flex-col">
                            <div className="flex flex-col md:flex-row justify-between items-start mb-3 md:mb-6 gap-2">
                                <div className={`px-2 py-1 rounded-lg text-[6px] md:text-[8px] font-black uppercase tracking-widest text-white shadow-sm self-start ${m.matrixCategory === 'STARS' ? 'bg-emerald-500' :
                                        m.matrixCategory === 'PLOWHORSES' ? 'bg-indigo-500' :
                                            m.matrixCategory === 'PUZZLES' ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}>
                                    {m.matrixCategory}
                                </div>
                                <div className="text-left md:text-right">
                                    <p className="text-[6px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">Avg Margin</p>
                                    <p className="text-[10px] md:text-xs font-black text-slate-700">{fmt(m.margin)}</p>
                                </div>
                            </div>
                            <h4 className="text-[10px] md:text-sm font-black text-slate-900 uppercase tracking-tight line-clamp-2 mb-2 flex-1">{m.name}</h4>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-auto border-t border-slate-200/50 md:border-none pt-2 md:pt-0">
                                <div>
                                    <p className="text-[6px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Sold</p>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] md:text-sm font-black text-slate-700">{m.qty}</span>
                                    </div>
                                </div>
                                <div className="hidden md:block h-8 w-px bg-slate-200" />
                                <div>
                                    <p className="text-[6px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Profit</p>
                                    <span className="text-[10px] md:text-sm font-black text-indigo-600">{fmtK(m.totalProfit)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

