import React, { useState } from 'react';
import { Box, Database, AlertTriangle, Zap, Edit2, Trash2, Plus, Minus, X, Save, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Ingredient, MenuItem } from '../types';
import InputField from '@/components/ui/InputField';

export function InventoryStockView({ data, menuItems, onUpdateStock, onEdit, onDelete }: {
    data: Ingredient[],
    menuItems: MenuItem[],
    onUpdateStock: (id: number, quantity: number, type: 'add' | 'subtract', reason: string) => void,
    onEdit: (ing: Ingredient) => void,
    onDelete: (id: number) => void
}) {
    const { hasPermission } = useAuth();
    const [showAdjModal, setShowAdjModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Ingredient | null>(null);
    const [adjType, setAdjType] = useState<'add' | 'subtract'>('add');
    const [adjQty, setAdjQty] = useState('');
    const [adjReason, setAdjReason] = useState('');

    const openAdjustment = (item: Ingredient, type: 'add' | 'subtract') => {
        setSelectedItem(item);
        setAdjType(type);
        setAdjQty('');
        setAdjReason('');
        setShowAdjModal(true);
    };

    const handleConfirmAdjustment = () => {
        if (!selectedItem || !adjQty || !adjReason) return;
        onUpdateStock(selectedItem.id, Number(adjQty), adjType, adjReason);
        setShowAdjModal(false);
    };

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
                            <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-48">Aksi</th>
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
                                                <button onClick={() => openAdjustment(item, 'add')} className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center border border-emerald-100 shadow-sm active:scale-90" title="Tambah Stok"><Plus className="w-4 h-4" /></button>
                                                <button onClick={() => openAdjustment(item, 'subtract')} className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center border border-amber-100 shadow-sm active:scale-90" title="Kurangi Stok"><Minus className="w-4 h-4" /></button>
                                                <div className="w-[1px] h-6 bg-slate-100 mx-1" />
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

            {/* Mobile View - Cards Layout (Premium Redesign) */}
            <div className="md:hidden w-full space-y-4 px-4 py-8">
                {data.map((item) => (
                    <div key={item.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 relative overflow-hidden active:bg-slate-50 transition-all border-l-4" 
                        style={{ borderLeftColor: Number(item.stockQuantity) <= Number(item.minStockLevel) ? '#f43f5e' : '#10b981' }}>
                        
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 flex-shrink-0 shadow-inner overflow-hidden">
                                {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <Database className="w-7 h-7" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-black text-slate-900 leading-tight uppercase tracking-tight text-sm">{item.name}</h3>
                                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider ${Number(item.stockQuantity) <= Number(item.minStockLevel) ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {Number(item.stockQuantity) <= Number(item.minStockLevel) ? 'Kritis' : 'Aman'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-md uppercase tracking-wider">{item.category || 'Inventory'}</span>
                                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Rp {Number(item.costPrice).toLocaleString()}/{item.unit}</span>
                                </div>
                            </div>
                        </div>

                        {/* Stock Progress Bar */}
                        <div className="mb-5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <div className="flex justify-between items-end mb-2">
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-2xl font-black ${Number(item.stockQuantity) <= Number(item.minStockLevel) ? 'text-rose-600' : 'text-slate-900'}`}>
                                        {Number(item.stockQuantity).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.unit}</span>
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Min: {item.minStockLevel} {item.unit}</p>
                            </div>
                            <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                {(() => {
                                    const percentage = Math.min((Number(item.stockQuantity) / (Number(item.minStockLevel || 1) * 2)) * 100, 100);
                                    let bgColor = 'bg-emerald-500';
                                    if (Number(item.stockQuantity) <= Number(item.minStockLevel)) bgColor = 'bg-rose-500';
                                    else if (Number(percentage) < 50) bgColor = 'bg-amber-500';
                                    return <div className={`h-full rounded-full transition-all duration-1000 ${bgColor}`} style={{ width: `${percentage}%` }} />;
                                })()}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                             {hasPermission('INV_UPDATE') && (
                                <>
                                    <button onClick={() => openAdjustment(item, 'add')} className="h-12 rounded-xl bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 active:scale-95 uppercase tracking-widest transition-all"><Plus size={14} /> Tambah</button>
                                    <button onClick={() => openAdjustment(item, 'subtract')} className="h-12 rounded-xl bg-amber-500 text-white font-black text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-amber-100 active:scale-95 uppercase tracking-widest transition-all"><Minus size={14} /> Kurang</button>
                                    <button onClick={() => onEdit(item)} className="h-12 rounded-xl bg-slate-100 text-slate-600 font-black text-[10px] flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest transition-all">
                                        <Edit2 size={14} /> Detail
                                    </button>
                                    <button onClick={() => onDelete(item.id)} className="h-12 rounded-xl bg-rose-50 text-rose-600 font-black text-[10px] flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest transition-all">
                                        <Trash2 size={14} /> Hapus
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Adjustment Modal - Premium Redesign */}
            {showAdjModal && selectedItem && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 sm:pb-24">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowAdjModal(false)} />
                    <div className="relative bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                        <div className="p-8 pb-4">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-4 rounded-2xl ${adjType === 'add' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {adjType === 'add' ? <Plus className="w-6 h-6" /> : <Minus className="w-6 h-6" />}
                                </div>
                                <button onClick={() => setShowAdjModal(false)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase leading-none mb-2">Penyesuaian Stok</h3>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">{selectedItem.name}</p>

                            <div className="space-y-6">
                                <InputField
                                    label={`Jumlah (${selectedItem.unit})`}
                                    type="number"
                                    value={adjQty}
                                    onChange={setAdjQty}
                                    placeholder="0"
                                    required
                                    autoFocus
                                />

                                <InputField
                                    label="Alasan Perubahan"
                                    type="textarea"
                                    value={adjReason}
                                    onChange={setAdjReason}
                                    placeholder="Contoh: Stok Opname, Barang Rusak, Salah Input, dll"
                                    required
                                    rows={2}
                                />

                                <div className="bg-slate-50 p-4 rounded-2xl flex items-start gap-4 border border-slate-100">
                                    <Info className="w-4 h-4 text-indigo-500 mt-0.5" />
                                    <div className="text-[10px] leading-relaxed text-slate-500 font-bold uppercase tracking-tight">
                                        Perubahan ini akan dicatat dalam audit trail sistem untuk keperluan rekonsiliasi stok.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 pt-4">
                            <button
                                onClick={handleConfirmAdjustment}
                                disabled={!adjQty || !adjReason}
                                className={`w-full py-5 rounded-[1.5rem] font-black text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em] text-xs ${adjType === 'add' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'}`}
                            >
                                <div className="flex items-center justify-center gap-3">
                                    <Save className="w-5 h-5" />
                                    KONFIRMASI {adjType === 'add' ? 'TAMBAH' : 'KURANGI'}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
