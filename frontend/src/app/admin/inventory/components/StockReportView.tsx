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
    PieChart
} from 'lucide-react';
import { Ingredient, MenuItem } from '../types';
import { getConversionFactor } from '@/utils/inventoryUtils';

// import { API_URL } from '@/utils/urlUtils';

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
                return acc + ((Number(recipe.quantity) * Number(ing.costPrice) * factor) / yieldFactor);
            }
            const sub = menuItems.find(m => m.id === recipe.subMenuItemId);
            if (sub) {
                const factor = getConversionFactor(recipe.unit, 'Portion');
                return acc + (Number(recipe.quantity) * (Number(sub.price) * 0.7) * factor);
            }
            return acc;
        }, 0);
    };

    const processedData = reportData.map(item => {
        let unitFoodCost = 0;
        let totalCogs = 0;
        let profit = 0;
        
        if (item.type === 'ingredient') {
            unitFoodCost = item.price;
            totalCogs = unitFoodCost * item.totalSold;
            profit = 0; // Ingredients don't have direct revenue in this report
        } else {
            unitFoodCost = getItemFoodCost(item.originalId || item.id);
            totalCogs = unitFoodCost * item.totalSold;
            profit = item.totalRevenue - totalCogs;
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
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm col-span-1">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                            <ShoppingCart className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Terjual</p>
                            <p className="text-2xl font-black text-slate-900">{totalSold}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm col-span-1">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Omzet</p>
                            <p className="text-2xl font-black text-slate-900">Rp {totalRevenue.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-xl shadow-slate-200 col-span-1">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total COGS</p>
                            <p className="text-2xl font-black text-white">Rp {totalCogs.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-indigo-600 p-6 rounded-[2rem] border border-indigo-500 shadow-xl shadow-indigo-200 col-span-1">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Gross Profit</p>
                            <p className="text-2xl font-black text-white">Rp {totalProfit.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm col-span-1">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stok Menipis</p>
                            <p className="text-2xl font-black text-slate-900">{reportData.filter(i => i.isLowStock).length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Cari produk atau SKU..."
                        className="w-full pl-14 pr-6 py-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-100 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 outline-none transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={fetchReport}
                        className="p-4 bg-slate-50 text-slate-500 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 border border-transparent hover:border-indigo-100 transition-all active:scale-90"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-slate-200 uppercase tracking-widest text-xs">
                        <Download className="w-5 h-5" />
                        Export Data
                    </button>
                </div>
            </div>

            {/* Table (Hidden on Mobile) */}
            <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Produk</th>
                                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Terjual</th>
                                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Sisa Stok</th>
                                <th className="px-6 py-6 text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] text-center">Selisih</th>
                                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Revenue</th>
                                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">COGS</th>
                                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Profit & Loss</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-40">
                                            <RefreshCw className="w-10 h-10 animate-spin text-indigo-600" />
                                            <p className="font-bold text-slate-600">Memuat Laporan Stok...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-40">
                                            <Package className="w-10 h-10 text-slate-400" />
                                            <p className="font-bold text-slate-600">Tidak ada data stok ditemukan</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                                    <Package className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{item.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{item.sku || 'NO-SKU'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className="inline-flex px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-black border border-emerald-100">
                                                {item.totalSold} <span className="ml-1 text-[10px] opacity-70 uppercase tracking-widest">{item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className={`inline-flex px-4 py-2 rounded-xl font-black border ${item.isLowStock ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                                {item.currentStock} <span className="ml-1 text-[10px] opacity-70 uppercase tracking-widest">{item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className={`inline-flex px-4 py-2 rounded-xl font-black border ${item.totalDiscrepancy > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'text-slate-400 border-transparent'}`}>
                                                {item.totalDiscrepancy > 0 ? `-${item.totalDiscrepancy}` : '0'} <span className="ml-1 text-[10px] opacity-70 uppercase tracking-widest">{item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <p className="font-black text-slate-900">Rp {item.totalRevenue.toLocaleString()}</p>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <p className="font-bold text-rose-600">Rp {item.totalCogs.toLocaleString()}</p>
                                        </td>
                                        <td className="px-6 py-6 text-right flex flex-col items-end justify-center">
                                            <p className="font-black text-emerald-600">Rp {item.profit.toLocaleString()}</p>
                                            {item.totalLostValue > 0 && (
                                                <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                                                    Rugi: Rp {item.totalLostValue.toLocaleString()}
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View (Visible only on Mobile) */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-3 opacity-40">
                        <RefreshCw className="w-10 h-10 animate-spin text-indigo-600" />
                        <p className="font-black text-slate-600 uppercase tracking-widest text-xs">Memuat Laporan...</p>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="py-20 flex flex-col items-center gap-3 opacity-40">
                        <Package className="w-10 h-10 text-slate-400" />
                        <p className="font-bold text-slate-600">Data tidak ditemukan</p>
                    </div>
                ) : (
                    filteredData.map((item) => (
                        <div key={item.id} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm active:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4 mb-5">
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
                                    <Package className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 leading-tight uppercase tracking-tight">{item.name}</h3>
                                    <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">{item.sku || 'NO-SKU'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Penggunaan/Terjual</p>
                                    <p className="text-xl font-black text-slate-900">{item.totalSold} <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{item.unit}</span></p>
                                </div>
                                <div className={`${item.isLowStock ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'} p-4 rounded-2xl border`}>
                                    <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-70">Sisa Stok</p>
                                    <p className="text-xl font-black">{item.currentStock} <span className="text-[10px] opacity-70 font-black uppercase tracking-widest">{item.unit}</span></p>
                                </div>
                                <div className={`p-4 rounded-2xl border ${item.totalDiscrepancy > 0 ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50/50 border-slate-100 text-slate-400'}`}>
                                    <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-70">Selisih Fisik</p>
                                    <p className="text-xl font-black">{item.totalDiscrepancy > 0 ? `-${item.totalDiscrepancy}` : '0'} <span className="text-[10px] opacity-70 font-black uppercase tracking-widest">{item.unit}</span></p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-100 col-span-2 lg:col-span-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenue</p>
                                        <p className="text-sm font-black text-slate-900">Rp {item.totalRevenue.toLocaleString()}</p>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">COGS</p>
                                        <p className="text-sm font-black text-rose-600">Rp {item.totalCogs.toLocaleString()}</p>
                                    </div>
                                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Gross Profit</p>
                                        <p className="text-base font-black text-emerald-600">Rp {item.profit.toLocaleString()}</p>
                                    </div>
                                    {item.totalLostValue > 0 && (
                                        <div className="mt-2 bg-rose-50 p-2 rounded-xl flex justify-between items-center border border-rose-100">
                                            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Kerugian Fisik</p>
                                            <p className="text-sm font-black text-rose-600">- Rp {item.totalLostValue.toLocaleString()}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
