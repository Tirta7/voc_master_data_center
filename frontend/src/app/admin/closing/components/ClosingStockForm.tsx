'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
// import { API_URL } from '@/utils/urlUtils';

interface MandatoryItem {
    id: number;
    name: string;
    unit: string;
    stockQuantity: number;
    type: 'INGREDIENT' | 'MENU_ITEM';
}

interface StockReport {
    itemId: number;
    type: 'INGREDIENT' | 'MENU_ITEM';
    name: string;
    systemStock: number;
    physicalStock: number;
    discrepancy: number;
}

interface ClosingStockFormProps {
    onApply: (reports: StockReport[]) => void;
}

export default function ClosingStockForm({ onApply }: ClosingStockFormProps) {
    const [items, setItems] = useState<MandatoryItem[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchItems = async () => {
            try {
                const res = await axios.get(`/inventory/mandatory-reporting`);
                setItems(res.data);
                // Initialize counts with 0 or empty
                const initialCounts: Record<string, number> = {};
                res.data.forEach((item: MandatoryItem) => {
                    const key = `${item.type}-${item.id}`;
                    initialCounts[key] = 0;
                });
                setCounts(initialCounts);
            } catch (error) {
                console.error('Failed to fetch mandatory items', error);
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, []);

    const handleInputChange = (key: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setCounts(prev => ({ ...prev, [key]: numValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const reports: StockReport[] = items.map(item => {
            const key = `${item.type}-${item.id}`;
            const physical = counts[key] || 0;
            return {
                itemId: item.id,
                type: item.type,
                name: item.name,
                systemStock: Number(item.stockQuantity),
                physicalStock: physical,
                discrepancy: physical - Number(item.stockQuantity)
            };
        });
        onApply(reports);
    };

    if (loading) return (
        <div className="p-8 text-center text-indigo-600 font-bold animate-pulse bg-white rounded-3xl shadow-xl">
            Memuat Daftar Stok Wajib...
        </div>
    );

    if (items.length === 0) {
        return (
            <div className="p-8 text-center bg-white rounded-3xl shadow-xl border border-slate-100">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-lg font-black text-slate-800">Semua Stok Aman</h3>
                <p className="text-slate-500 text-sm mt-2">Tidak ada item yang perlu pelaporan manual pada shift ini.</p>
                <button 
                    onClick={() => onApply([])}
                    className="mt-6 px-8 py-3 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg hover:bg-emerald-700 transition-all"
                >
                    Lanjutkan Closing
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-indigo-600 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <Package className="w-6 h-6" />
                    <h2 className="text-xl font-black tracking-tight">Pelaporan Stok Fisik</h2>
                </div>
                <p className="text-indigo-100 text-xs font-medium">Mohon hitung sisa stok di rak/lemari secara akurat.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {items.map(item => {
                        const key = `${item.type}-${item.id}`;
                        const physical = counts[key] || 0;
                        const diff = physical - Number(item.stockQuantity);
                        
                        return (
                            <div key={key} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-100 transition-all group">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-400" />
                                        <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                                    </div>
                                    <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">
                                        {item.unit}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 items-center">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Sistem</p>
                                        <p className="text-sm font-bold text-slate-600">{Number(item.stockQuantity).toLocaleString()} {item.unit}</p>
                                    </div>
                                    
                                    <div className="relative">
                                        <input 
                                            type="number"
                                            step="any"
                                            value={counts[key] === 0 ? '' : counts[key]}
                                            onChange={(e) => handleInputChange(key, e.target.value)}
                                            placeholder="Fisik"
                                            className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-black focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                {counts[key] > 0 && diff !== 0 && (
                                    <div className={`mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black ${diff > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                        <AlertTriangle className="w-3 h-3" />
                                        <span>Selisih: {diff.toLocaleString()} {item.unit} ({diff > 0 ? 'Kelebihan' : 'Kekurangan'})</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <button 
                        type="submit"
                        className="w-full bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        Konfirmasi & Lanjutkan
                    </button>
                    
                    <button 
                        type="button"
                        onClick={() => window.location.reload()}
                        className="w-full mt-3 text-slate-400 hover:text-slate-600 text-xs font-black flex items-center justify-center gap-2 transition-all"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Refresh Daftar
                    </button>
                </div>
            </form>
        </div>
    );
}
