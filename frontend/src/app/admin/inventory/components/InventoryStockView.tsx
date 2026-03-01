import React from 'react';
import { Box, Database, AlertTriangle, Zap, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Ingredient, MenuItem } from '../types';

export function InventoryStockView({ data, menuItems, onUpdateStock, onEdit, onDelete }: {
    data: Ingredient[],
    menuItems: MenuItem[],
    onUpdateStock: (id: number, quantity: number, type: 'add' | 'subtract') => void,
    onEdit: (ing: Ingredient) => void,
    onDelete: (id: number) => void
}) {
    const { hasPermission } = useAuth();
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <Box className="w-16 h-16 text-slate-200 mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm italic">Belum ada bahan baku terdaftar</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Desktop Table - Strictly Hidden on Mobile */}
            <div className="hidden md:block overflow-x-auto w-full">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-16">No</th>
                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bahan Baku</th>
                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Kategori</th>
                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">HPP / Satuan</th>
                            <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status & Level Stok</th>
                            <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-40">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.map((item, index) => (
                            <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="px-8 py-5">
                                    <span className="text-xs font-black text-slate-300 group-hover:text-indigo-400 transition-colors">#{index + 1}</span>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400 group-hover:scale-110 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                            {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-xl" /> : <Database className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{item.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Yield: {item.yieldPercentage}% • {item.description ? item.description.substring(0, 20) + '...' : 'Tanpa deskripsi'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg uppercase tracking-wider">{item.category || 'Raw'}</span>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex flex-col">
                                        <p className="text-xs font-black text-slate-900">Rp {Number(item.costPrice).toLocaleString()}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">per {item.unit}</p>
                                    </div>
                                </td>
                                <td className="px-8 py-5 min-w-[220px]">
                                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm group-hover:border-indigo-100 transition-all">
                                        <div className="flex justify-between items-end mb-2">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock Level</p>
                                                <div className="flex items-baseline gap-1">
                                                    <span className={`text-xl font-black ${Number(item.stockQuantity) <= Number(item.minStockLevel) ? 'text-rose-600' : 'text-slate-900'}`}>
                                                        {Number(item.stockQuantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.unit}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {Number(item.stockQuantity) <= Number(item.minStockLevel) ? (
                                                    <span className="text-[9px] font-black text-rose-600 animate-pulse uppercase tracking-tighter flex items-center gap-1 justify-end">
                                                        <AlertTriangle className="w-3 h-3" /> KRITIS
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter flex items-center gap-1 justify-end">
                                                        <Zap className="w-3 h-3 fill-emerald-600" /> AMAN
                                                    </span>
                                                )}
                                                <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Min: {item.minStockLevel}</p>
                                            </div>
                                        </div>
                                        <div className="relative w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                                            {(() => {
                                                const percentage = Math.min((Number(item.stockQuantity) / (Number(item.minStockLevel || 1) * 2)) * 100, 100);
                                                let bgColor = 'bg-emerald-500';
                                                if (Number(item.stockQuantity) <= Number(item.minStockLevel)) bgColor = 'bg-rose-500';
                                                else if (Number(percentage) < 50) bgColor = 'bg-amber-500';

                                                return (
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.05)] ${bgColor}`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex justify-end items-center gap-2">
                                        {hasPermission('INV_UPDATE') && (
                                            <>
                                                <button onClick={() => onEdit(item)} className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-center border border-slate-100"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => onDelete(item.id)} className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center justify-center border border-slate-100"><Trash2 className="w-4 h-4" /></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile View - Cards Layout */}
            <div className="md:hidden w-full space-y-4 px-3 py-10">
                {data.map((item) => (
                    <div key={item.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 relative overflow-hidden active:bg-slate-50 transition-colors mx-3">
                        <div className={`absolute top-0 right-0 w-1.5 h-full ${Number(item.stockQuantity) <= Number(item.minStockLevel) ? 'bg-rose-500' : 'bg-emerald-500'}`} />

                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 flex-shrink-0">
                                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-2xl" /> : <Database className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 leading-tight uppercase tracking-tight">{item.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-md uppercase tracking-wider">{item.category || 'Raw'}</span>
                                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Rp {Number(item.costPrice).toLocaleString()}/{item.unit}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Stok Sisa</p>
                                <div className="flex items-baseline gap-1">
                                    <p className={`text-xl font-black ${Number(item.stockQuantity) <= Number(item.minStockLevel) ? 'text-rose-600' : 'text-slate-900'}`}>
                                        {Number(item.stockQuantity).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                    </p>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.unit}</span>
                                </div>
                            </div>
                            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                {Number(item.stockQuantity) <= Number(item.minStockLevel) ? (
                                    <span className="text-[10px] font-black text-rose-600 flex items-center gap-1 uppercase">
                                        <AlertTriangle className="w-3.5 h-3.5" /> Kritis
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1 uppercase">
                                        <Zap className="w-3.5 h-3.5 fill-emerald-600" /> Aman
                                    </span>
                                )}
                                <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">Min: {item.minStockLevel}</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {hasPermission('INV_UPDATE') && (
                                <>
                                    <button onClick={() => onEdit(item)} className="flex-1 h-12 rounded-2xl bg-indigo-50 text-indigo-600 font-black text-xs flex items-center justify-center gap-2 shadow-sm uppercase tracking-widest active:scale-95 transition-all">
                                        <Edit2 className="w-4 h-4" /> Edit
                                    </button>
                                    <button onClick={() => onDelete(item.id)} className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm active:scale-95 transition-all">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
