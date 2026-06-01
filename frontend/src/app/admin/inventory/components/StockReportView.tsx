'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    TrendingUp,
    Package,
    ShoppingCart,
    DollarSign,
    AlertTriangle,
    RefreshCw,
    Search,
    Download,
    BarChart3,
    PieChart,
    ShieldCheck,
    Clock,
    ShieldAlert,
    CalendarCheck
} from 'lucide-react';
import { Ingredient, MenuItem } from '../types';
import { getConversionFactor } from '@/utils/inventoryUtils';
import { formatRupiah as fmt, formatNumber as fn } from '@/utils/formatUtils';
// import { API_URL } from '@/utils/urlUtils';

function AuditStatusBadge({ item }: { item: any }) {
    if (!item.isHighValue) return <span className="text-slate-200">—</span>;

    const last = item.lastAuditAt ? new Date(item.lastAuditAt) : null;
    const now = new Date();
    let isOverdue = !last;

    if (last) {
        if (item.auditFrequency === 'DAILY') {
            isOverdue = last.toDateString() !== now.toDateString();
        } else if (item.auditFrequency === 'WEEKLY') {
            isOverdue = (now.getTime() - last.getTime()) > 7 * 24 * 3600 * 1000;
        } else {
            // SHIFT or others: > 8 hours is considered overdue for this visualization
            isOverdue = (now.getTime() - last.getTime()) > 8 * 3600 * 1000;
        }
    }

    return (
        <div className="flex flex-col items-center gap-2">
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${isOverdue ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                {isOverdue ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span className="text-[10px] font-black uppercase tracking-widest">{isOverdue ? 'Overdue' : 'Verified'}</span>
            </div>
            <div className="flex flex-col items-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">{item.auditFrequency || 'SHIFT'} CHECK</span>
                {last && (
                    <span className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {last.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} {last.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>
        </div>
    );
}

export function StockReportView({ ingredients, menuItems }: { ingredients: Ingredient[], menuItems: MenuItem[] }) {
    const [reportData, setReportData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchReport = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/reports/store-stock`);
            setReportData(response.data);
        } catch (error) {
            console.error('Failed to fetch stock report:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    const getItemFoodCost = (itemId: number) => {
        const menu = menuItems.find(m => m.id === itemId);
        if (!menu) return 0;

        return (menu.recipes || []).reduce((acc, recipe) => {
            const ing = ingredients.find(i => i.id === recipe.ingredientId);
            if (ing) {
                const factor = getConversionFactor(recipe.unit, ing.unit);
                const yieldFactor = (ing.yieldPercentage || 100) / 100;
                return acc + ((Number(recipe.quantity) * Number(ing.costPrice || 0) * factor) / yieldFactor);
            }
            const sub = menuItems.find(m => m.id === recipe.subMenuItemId);
            if (sub) {
                const subHpp = Number(sub.productFinance?.baseHpp || (sub.price * 0.7));
                return acc + (Number(recipe.quantity) * subHpp);
            }
            return acc;
        }, 0);
    };

    const processedData = reportData.map(item => {
        let unitFoodCost = 0;
        let totalCogs = 0;
        let profit = 0;

        if (item.type === 'ingredient') {
            unitFoodCost = item.price || 0;
            totalCogs = unitFoodCost * item.totalSold;
            // For ingredients, "revenue" is usually 0, so profit is just -lostValue
            profit = -(item.totalLostValue || 0);
        } else {
            unitFoodCost = getItemFoodCost(item.originalId || item.id);
            totalCogs = unitFoodCost * item.totalSold;
            // Net profit includes deducting the value of lost items
            profit = item.totalRevenue - totalCogs - (item.totalLostValue || 0);
        }

        return {
            ...item,
            unitFoodCost,
            totalCogs,
            profit
        };
    });

    const filteredData = processedData.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalRevenue = processedData.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalSold = processedData.reduce((sum, item) => sum + item.totalSold, 0);
    const totalCogs = processedData.reduce((sum, item) => sum + item.totalCogs, 0);
    const totalProfit = totalRevenue - totalCogs;

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header Stats - Premium Glassmorphism Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group">
                    <div className="flex flex-col gap-6">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-110 transition-transform">
                            <ShoppingCart className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Unit Terjual</p>
                            <p className="text-3xl font-black text-slate-900 tracking-tighter">{totalSold}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group">
                    <div className="flex flex-col gap-6">
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Revenue</p>
                            <p className="text-3xl font-black text-slate-900 tracking-tighter">{fmt(totalRevenue)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl shadow-slate-200 transition-all hover:shadow-indigo-500/10 hover:-translate-y-1 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
                    <div className="flex flex-col gap-6 relative z-10">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white shadow-inner group-hover:rotate-6 transition-transform">
                            <BarChart3 className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Estimated COGS</p>
                            <p className="text-3xl font-black text-white tracking-tighter">{fmt(totalCogs)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-indigo-600 p-8 rounded-[2.5rem] border border-indigo-500 shadow-2xl shadow-indigo-100 transition-all hover:scale-105 group relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20" />
                    <div className="flex flex-col gap-6 relative z-10">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-xl shadow-indigo-700/20 group-hover:scale-110 transition-transform">
                            <PieChart className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.2em] mb-1">Gross Profit</p>
                            <p className="text-3xl font-black text-white tracking-tighter">{fmt(totalProfit)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:bg-slate-50/30 group">
                    <div className="flex flex-col gap-6">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-110">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Compliance Rate (HVI)</p>
                            <p className="text-3xl font-black text-slate-900 tracking-tighter">
                                {(() => {
                                    const hviItems = processedData.filter(i => i.isHighValue);
                                    if (hviItems.length === 0) return '100%';
                                    const audited = hviItems.filter(i => {
                                        if (!i.lastAuditAt) return false;
                                        const last = new Date(i.lastAuditAt);
                                        const now = new Date();
                                        if (i.auditFrequency === 'DAILY') return last.toDateString() === now.toDateString();
                                        if (i.auditFrequency === 'WEEKLY') return (now.getTime() - last.getTime()) < 7 * 24 * 3600 * 1000;
                                        return true; // SHIFT is harder to track globally, assume verified if lastAuditAt exists
                                    });
                                    return `${Math.round((audited.length / hviItems.length) * 100)}%`;
                                })()}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-rose-100 shadow-sm transition-all hover:bg-rose-50/30 group">
                    <div className="flex flex-col gap-6">
                        <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 shadow-inner group-hover:animate-pulse">
                            <AlertTriangle className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Low Stock Monitoring</p>
                            <p className="text-3xl font-black text-slate-900 tracking-tighter">{reportData.filter(i => i.isLowStock).length} Item</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions Bar - Premium Layout */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />

                <div className="relative z-10 w-full lg:max-w-xl">
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-all font-black" />
                        <input
                            type="text"
                            placeholder="Cari inventory atau SKU produk..."
                            className="w-full pl-16 pr-8 py-5 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-100 focus:bg-white focus:ring-[12px] focus:ring-indigo-500/5 font-bold text-slate-800 outline-none transition-all text-sm h-16"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full lg:w-auto relative z-10 bg-slate-50 p-2 rounded-[2rem] border border-slate-100/50">
                    <button
                        onClick={fetchReport}
                        className="p-5 bg-white text-slate-500 rounded-2xl hover:text-indigo-600 border border-slate-100 hover:border-indigo-100 transition-all active:scale-95 shadow-sm group"
                        title="Refresh Report Data"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} />
                    </button>
                    <button className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-indigo-600 transition-all active:scale-95 shadow-xl shadow-slate-200 uppercase tracking-[0.2em] text-[10px] h-16">
                        <Download className="w-5 h-5" />
                        Export Master File
                    </button>
                </div>
            </div>

            {/* Premium Table View */}
            <div className="hidden lg:block bg-white rounded-[3.5rem] border border-slate-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100/50">
                                <th className="px-10 py-8 text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black">Entity Details</th>
                                <th className="px-8 py-8 text-[10px] text-slate-400 uppercase tracking-[0.3em] text-center font-black">Sales/Usage</th>
                                <th className="px-8 py-8 text-[10px] text-slate-400 uppercase tracking-[0.3em] text-center font-black">Health Check</th>
                                <th className="px-8 py-8 text-[10px] text-indigo-400 uppercase tracking-[0.3em] text-center font-black">Audit Status</th>
                                <th className="px-8 py-8 text-[10px] text-rose-400 uppercase tracking-[0.3em] text-center font-black">Variance</th>
                                <th className="px-8 py-8 text-[10px] text-slate-400 uppercase tracking-[0.3em] text-right font-black">Gross Revenue</th>
                                <th className="px-8 py-8 text-[10px] text-slate-400 uppercase tracking-[0.3em] text-right font-black">Profit/Loss</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-10 py-32 text-center">
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="relative">
                                                <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                                                <RefreshCw className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-indigo-200" />
                                            </div>
                                            <p className="font-black text-slate-400 uppercase tracking-[0.3em] text-xs">Generating Intelligent Report...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-10 py-32 text-center">
                                        <div className="flex flex-col items-center gap-6 opacity-40">
                                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200">
                                                <Package className="w-10 h-10 text-slate-300" />
                                            </div>
                                            <p className="font-black text-slate-500 uppercase tracking-widest">No matching analytics found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-all group border-b border-transparent hover:border-slate-100/50">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-5">
                                                <div className="w-16 h-16 bg-slate-100 border border-slate-200/50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner group-hover:shadow-indigo-200 group-hover:rotate-3">
                                                    <Package className="w-8 h-8" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-base leading-none mb-2">{item.name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{item.sku || 'N/A SKU'}</span>
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${item.type === 'ingredient' ? 'text-amber-500' : 'text-indigo-500'}`}>• {item.type}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8 text-center">
                                            <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-2xl font-black border border-emerald-100 shadow-sm">
                                                <span className="text-lg">{item.totalSold}</span>
                                                <span className="text-[10px] opacity-70 uppercase tracking-[0.2em]">{item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8 text-center">
                                            <div className={`inline-flex flex-col items-center gap-1 px-6 py-3 rounded-2xl font-black border transition-all ${item.isLowStock ? 'bg-rose-50 text-rose-600 border-rose-100 shadow-lg shadow-rose-100 animate-pulse-slow' : 'bg-slate-50 text-slate-600 border-slate-100 shadow-sm'}`}>
                                                <span className="text-lg">{item.currentStock}</span>
                                                <span className="text-[9px] opacity-70 uppercase tracking-[0.2em]">{item.unit} Sisa</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8 text-center">
                                            <AuditStatusBadge item={item} />
                                        </td>
                                        <td className="px-8 py-8 text-center font-black">
                                            {item.totalDiscrepancy > 0 ? (
                                                <div className="flex flex-col items-center">
                                                    <span className={item.isSurplus ? 'text-emerald-500 text-base' : 'text-rose-500 text-base'}>
                                                        {item.isSurplus ? '+' : '-'}{item.totalDiscrepancy}
                                                    </span>
                                                    <span className={`text-[9px] uppercase tracking-widest px-2 rounded-full border ${item.isSurplus ? 'text-emerald-400 bg-emerald-50 border-emerald-100' : 'text-rose-400 bg-rose-50 border-rose-100'}`}>
                                                        {item.isSurplus ? 'Surplus' : 'Discrepancy'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-200">—</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-8 text-right">
                                            <div className="flex flex-col items-center">
                                                <p className="font-black text-slate-900 text-base">{fmt(item.totalRevenue)}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gross Invoicing</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8 text-right">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <p className={`font-black text-lg ${item.profit < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>{fmt(item.profit)}</p>
                                                <div className="flex gap-2">
                                                    {item.totalCogs > 0 && (
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">COGS: {fmt(item.totalCogs)}</span>
                                                    )}
                                                    {item.totalLostValue > 0 && (
                                                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded border border-rose-100">Shrink: {fmt(item.totalLostValue)}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Adaptive Analytics Grid */}
            <div className="lg:hidden space-y-6">
                {loading ? (
                    <div className="py-32 flex flex-col items-center gap-6">
                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">Processing Data...</p>
                    </div>
                ) : (
                    filteredData.map((item) => (
                        <div key={item.id} className="bg-white rounded-[3rem] border border-slate-100 p-8 shadow-sm active:bg-slate-50/50 transition-all relative overflow-hidden">
                            {item.isLowStock && <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -mr-16 -mt-16" />}

                            <div className="flex items-center gap-5 mb-8">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 bg-slate-50 shadow-inner ${item.isLowStock ? 'border-rose-200 text-rose-500 shadow-rose-100' : ''}`}>
                                    <Package className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 leading-tight uppercase tracking-tight text-lg">{item.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">{item.sku || 'NO SKU'}</span>
                                        <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'ingredient' ? 'bg-amber-400' : 'bg-indigo-400'}`} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100 shadow-sm h-full flex flex-col justify-center">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Usage Index</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xl font-black text-slate-900">{item.totalSold}</p>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.unit}</span>
                                    </div>
                                </div>
                                <div className={`p-5 rounded-2xl border shadow-sm h-full flex flex-col justify-center ${item.isLowStock ? 'bg-rose-50/80 text-rose-600 border-rose-100 animate-pulse-slow' : 'bg-indigo-50/80 text-indigo-700 border-indigo-100'}`}>
                                    <p className="text-[8px] font-black uppercase tracking-widest mb-2 opacity-60">Physical Stock</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xl font-black">{item.currentStock}</p>
                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{item.unit}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/30 p-8 rounded-[2rem] border border-slate-100 space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <p className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Gross Revenue</p>
                                    <p className="font-black text-slate-900">{fmt(item.totalRevenue)}</p>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <p className="font-black text-slate-400 uppercase tracking-widest text-[9px]">Cost of Sales</p>
                                    <p className="font-black text-rose-600">{fmt(item.totalCogs)}</p>
                                </div>
                                <div className="pt-4 border-t border-slate-200/50 flex justify-between items-center">
                                    <p className="font-black text-indigo-500 uppercase tracking-widest text-[10px]">Net Earnings</p>
                                    <p className={`text-xl font-black ${item.profit < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                        {fmt(item.profit)}
                                    </p>
                                </div>
                                {item.totalLostValue > 0 && (
                                    <div className="mt-4 bg-rose-50 p-4 rounded-xl flex justify-between items-center border border-rose-100/50">
                                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Inventory Loss</p>
                                        <p className="text-sm font-black text-rose-600">-{fmt(item.totalLostValue)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
