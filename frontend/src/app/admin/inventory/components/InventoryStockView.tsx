import React, { useState } from 'react';
import { Box, Database, AlertTriangle, Zap, Edit2, Trash2, Plus, Minus, X, Save, Info, ChefHat, Package, MoreHorizontal, Utensils, Cookie, Wind, Filter, Truck, Calendar } from 'lucide-react';
import dayjs from 'dayjs';
import { useAuth } from '@/context/AuthContext';
import { Ingredient, MenuItem } from '../types';
import InputField from '@/components/ui/InputField';
import { formatRupiah as fmt, formatNumber as fn } from '@/utils/formatUtils';
import { ReceiveStockModal } from './ReceiveStockModal';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

export function InventoryStockView({ data, menuItems, onUpdateStock, onEdit, onDelete }: {
    data: Ingredient[],
    menuItems: MenuItem[],
    onUpdateStock: (id: number, quantity: number, type: 'add' | 'subtract', reason: string) => void,
    onEdit: (ing: Ingredient) => void,
    onDelete: (id: number) => void
}) {
    const { hasPermission } = useAuth();
    const { data: suppliers } = useSWR<any[]>('/inventory/suppliers', fetcher);
    const [showAdjModal, setShowAdjModal] = useState(false);
    const [showReceiveModal, setShowReceiveModal] = useState(false);
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

    const openReceive = (item: Ingredient) => {
        setSelectedItem(item);
        setShowReceiveModal(true);
    };

    const handleConfirmAdjustment = () => {
        if (!selectedItem || !adjQty || !adjReason) return;
        onUpdateStock(selectedItem.id, Number(adjQty), adjType, adjReason);
        setShowAdjModal(false);
    };

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

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
                    <Box className="w-10 h-10 text-slate-200" />
                </div>
                <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] mb-1">Database Kosong</p>
                <p className="text-slate-300 font-medium text-xs">Belum ada bahan baku yang terdaftar di kategori ini.</p>
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
                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 rounded-tl-[2rem]">Bahan Baku</th>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Kategori</th>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Dept</th>
                            <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">HPP / Unit</th>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Status & Level Stok</th>
                            <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 rounded-tr-[2rem]">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.map((item) => (
                            <tr key={item.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-110 transition-all duration-500">
                                                            {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <Database className="w-7 h-7 text-slate-200" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <p className="font-black text-slate-900 text-sm uppercase tracking-wider group-hover:text-indigo-600 transition-colors">{item.name}</p>
                                                                {(item.isHighValue || item.isMandatoryReporting) && (
                                                                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-sm border ${
                                                                        item.auditFrequency === 'DAILY' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                                        item.auditFrequency === 'WEEKLY' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                                                        'bg-slate-900 text-white border-slate-800'
                                                                    }`}>
                                                                        {item.auditFrequency || 'SHIFT'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1.5">
                                                                {item.expiryDate && (
                                                                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${
                                                                        dayjs(item.expiryDate).isBefore(dayjs().add(7, 'day')) 
                                                                            ? 'bg-rose-50 text-rose-600 border-rose-100' 
                                                                            : 'bg-slate-50 text-slate-500 border-slate-100'
                                                                    }`}>
                                                                        <Calendar className="w-3 h-3" />
                                                                        <span className="text-[9px] font-black uppercase tracking-tighter">Exp: {dayjs(item.expiryDate).format('DD MMM YY')}</span>
                                                                    </div>
                                                                )}
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Yield: {item.yieldPercentage}%</p>
                                                                
                                                                {/* "Used In" Section */}
                                                                {menuItems.filter(m => m.recipes?.some(r => r.ingredientId === item.id)).length > 0 && (
                                                                    <div className="flex flex-wrap items-center gap-1">
                                                                        <span className="text-[8px] font-black text-indigo-400/60 uppercase tracking-widest">Linked:</span>
                                                                        {menuItems
                                                                            .filter(m => m.recipes?.some(r => r.ingredientId === item.id))
                                                                            .slice(0, 2)
                                                                            .map(m => (
                                                                                <span key={m.id} className="text-[8px] font-black bg-indigo-50/30 text-indigo-500 px-1.5 py-0.5 rounded border border-indigo-100/30 uppercase leading-none" title={m.name}>
                                                                                    {m.name}
                                                                                </span>
                                                                            ))
                                                                        }
                                                                        {menuItems.filter(m => m.recipes?.some(r => r.ingredientId === item.id)).length > 2 && (
                                                                            <span className="text-[8px] font-black text-slate-300">+{menuItems.filter(m => m.recipes?.some(r => r.ingredientId === item.id)).length - 2}</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                                            {getCategoryIcon(item.category || '')}
                                        </div>
                                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                            {item.category || 'Raw Material'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2" title={item.department}>
                                        {deptIcons[item.department || 'CASHIER']}
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{item.department}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <p className="font-black text-slate-900 text-sm">{fmt(item.costPrice || 0)}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Per {item.unit}</p>
                                </td>
                                <td className="px-6 py-5 min-w-[240px]">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group-hover:border-indigo-100 transition-all">
                                        <div className="flex justify-between items-center mb-2">
                                            <div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className={`text-xl font-black ${Number(item.stockQuantity) <= Number(item.minStockLevel) ? 'text-rose-600' : 'text-slate-900'}`}>
                                                        {Number(item.stockQuantity || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.unit}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {Number(item.stockQuantity) <= Number(item.minStockLevel) ? (
                                                    <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 uppercase tracking-tighter flex items-center gap-1 justify-end animate-pulse">
                                                        <AlertTriangle className="w-3 h-3" /> KRITIS
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-tighter flex items-center gap-1 justify-end">
                                                        <Zap className="w-3 h-3 fill-emerald-600" /> AMAN
                                                    </span>
                                                )}
                                                <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest">Min: {Number(item.minStockLevel || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</p>
                                            </div>
                                        </div>
                                        <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            {(() => {
                                                const percentage = Math.min((Number(item.stockQuantity) / (Number(item.minStockLevel || 1) * 2)) * 100, 100);
                                                let bgColor = 'bg-emerald-500';
                                                if (Number(item.stockQuantity) <= Number(item.minStockLevel)) bgColor = 'bg-rose-500';
                                                else if (Number(percentage) < 50) bgColor = 'bg-amber-500';

                                                return (
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-lg ${bgColor}`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex items-center justify-end gap-2 px-1">
                                        <div className="flex gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-100 mr-2">
                                            {hasPermission('INVENTORY_STOCK_IN') && (
                                                <button 
                                                    onClick={() => openAdjustment(item, 'add')} 
                                                    className="w-9 h-9 border border-indigo-100 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all active:scale-90 flex items-center justify-center shadow-sm"
                                                    title="Tambah Stok"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            )}
                                            {hasPermission('INVENTORY_STOCK_OUT') && (
                                                <button 
                                                    onClick={() => openAdjustment(item, 'subtract')} 
                                                    className="w-9 h-9 border border-amber-100 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all active:scale-90 flex items-center justify-center shadow-sm"
                                                    title="Kurangi Stok"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                            )}
                                            {hasPermission('INVENTORY_RECEIVE') && (
                                                <button 
                                                    onClick={() => openReceive(item)} 
                                                    className="w-9 h-9 border border-emerald-100 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all active:scale-90 flex items-center justify-center shadow-sm"
                                                    title="Terima Barang"
                                                >
                                                    <Truck className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        {hasPermission('INV_EDIT_ITEM') && (
                                            <button onClick={() => onEdit(item)} className="p-2.5 bg-white text-slate-400 rounded-xl border border-slate-100 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-90 shadow-sm" title="Edit"><Edit2 className="w-4 h-4" /></button>
                                        )}
                                        {hasPermission('INV_DELETE_ITEM') && (
                                            <button onClick={() => onDelete(item.id)} className="p-2.5 bg-white text-slate-300 rounded-xl border border-slate-100 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all active:scale-90 shadow-sm" title="Hapus"><Trash2 className="w-4 h-4" /></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile View - Cards Layout (Compact & Proportional) */}
            <div className="lg:hidden grid grid-cols-2 gap-3 p-3">
                {data.map((item) => (
                    <div key={item.id} className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm hover:shadow-md relative overflow-hidden flex flex-col group transition-all">
                        <div className="flex flex-col gap-2 mb-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 flex-shrink-0 shadow-inner overflow-hidden">
                                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <Database className="w-5 h-5 text-slate-300" />}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    {deptIcons[item.department || 'CASHIER']}
                                    {(item.isHighValue || item.isMandatoryReporting) && (
                                        <span className="text-[6px] font-black bg-slate-900 text-white px-1 py-0.5 rounded uppercase tracking-tighter">
                                            {item.auditFrequency || 'SHIFT'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-tight leading-tight line-clamp-2">{item.name}</h3>
                                <div className="flex items-center flex-wrap gap-1 mt-1">
                                    <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[8px] font-black rounded-md uppercase tracking-wider">{item.category || 'Inventory'}</span>
                                    <span className="text-[8px] font-black text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded-md">{fmt(item.costPrice || 0)}/{item.unit}</span>
                                </div>
                            </div>
                        </div>

                        {/* Stock Progress Bar */}
                        <div className="mb-3 flex flex-col gap-1.5 relative z-10 bg-slate-50 p-2 rounded-xl border border-slate-100/50">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Sisa Stok</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-sm font-black tracking-tight ${Number(item.stockQuantity) <= Number(item.minStockLevel) ? 'text-rose-600' : 'text-slate-900'}`}>
                                            {Number(item.stockQuantity || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">{item.unit}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md ${Number(item.stockQuantity) <= Number(item.minStockLevel) ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {Number(item.stockQuantity) <= Number(item.minStockLevel) ? 'CRITICAL' : 'SECURE'}
                                    </span>
                                </div>
                            </div>
                            <div className="relative w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                                {(() => {
                                    const percentage = Math.min((Number(item.stockQuantity) / (Number(item.minStockLevel || 1) * 2)) * 100, 100);
                                    let bgColor = 'bg-emerald-500';
                                    if (Number(item.stockQuantity) <= Number(item.minStockLevel)) bgColor = 'bg-rose-500';
                                    else if (Number(percentage) < 50) bgColor = 'bg-amber-500';
                                    return <div className={`h-full rounded-full transition-all duration-1000 ${bgColor}`} style={{ width: `${percentage}%` }} />;
                                })()}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5 mt-auto relative z-10">
                            {hasPermission('INVENTORY_RECEIVE') && (
                                <button onClick={() => openReceive(item)} className="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-[9px] flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm border border-emerald-200/50 uppercase tracking-wide">
                                    <Truck size={12} /> Restock
                                </button>
                            )}
                            <div className="grid grid-cols-2 gap-1.5">
                                {hasPermission('INVENTORY_STOCK_IN') && (
                                    <button onClick={() => openAdjustment(item, 'add')} className="py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/50 font-bold text-[8px] flex items-center justify-center gap-1 shadow-sm active:scale-95 uppercase tracking-wide transition-all"><Plus size={10} /> Tambah</button>
                                )}
                                {hasPermission('INVENTORY_STOCK_OUT') && (
                                    <button onClick={() => openAdjustment(item, 'subtract')} className="py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/50 font-bold text-[8px] flex items-center justify-center gap-1 shadow-sm active:scale-95 uppercase tracking-wide transition-all"><Minus size={10} /> Kurang</button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                                {hasPermission('INV_EDIT_ITEM') && (
                                    <button onClick={() => onEdit(item)} className="py-1.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 text-slate-500 font-bold text-[8px] flex items-center justify-center gap-1 active:scale-95 uppercase tracking-wider transition-all shadow-sm">
                                        <Edit2 size={10} /> Edit
                                    </button>
                                )}
                                {hasPermission('INV_DELETE_ITEM') && (
                                    <button onClick={() => onDelete(item.id)} className="py-1.5 rounded-lg border border-slate-100 bg-white hover:bg-rose-50 hover:border-rose-100 text-rose-500 font-bold text-[8px] flex items-center justify-center gap-1 active:scale-95 uppercase tracking-wider transition-all shadow-sm">
                                        <Trash2 size={10} /> Hapus
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Adjustment Modal - Premium Redesign */}
            {showAdjModal && selectedItem && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 pb-24">
                    <div className="absolute inset-0 bg-slate-900/60  animate-in fade-in" onClick={() => setShowAdjModal(false)} />
                    <div className="relative bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-12 duration-500">
                        <div className="p-10 pb-6 text-center">
                            <div className={`w-24 h-24 mx-auto mb-8 rounded-[2rem] flex items-center justify-center shadow-2xl ${adjType === 'add' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-100' : 'bg-amber-50 text-amber-600 shadow-amber-100'}`}>
                                {adjType === 'add' ? <Plus className="w-10 h-10" /> : <Minus className="w-10 h-10" />}
                            </div>
                            
                            <h3 className="text-3xl font-black text-slate-900 uppercase leading-none mb-3 tracking-tighter">Penyesuaian Stok</h3>
                            <div className="flex items-center justify-center gap-2 mb-10">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Produk:</span>
                                <span className="text-sm font-black text-slate-600 uppercase tracking-tight">{selectedItem.name}</span>
                            </div>

                            <div className="space-y-6 text-left capitalize">
                                <InputField
                                    label={`Jumlah Tambahan (${selectedItem.unit})`}
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
                                className={`flex-[2] py-5 rounded-[1.5rem] font-black text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em] text-xs ${adjType === 'add' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'}`}
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

            {showReceiveModal && selectedItem && (
                <ReceiveStockModal 
                    ingredient={selectedItem}
                    suppliers={suppliers || []}
                    onClose={() => setShowReceiveModal(false)}
                    onSuccess={() => {
                        // Success handling already done inside modal (mutate)
                    }}
                />
            )}
        </div>
    );
}
