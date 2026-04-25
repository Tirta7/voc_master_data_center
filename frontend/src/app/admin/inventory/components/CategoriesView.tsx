import React from 'react';
import { Filter, Edit2, Trash2, Plus, Utensils, Zap, Cookie, Wind, Package, Database, Info, Monitor, Power } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Category } from '../types';

export function CategoriesView({ data, onEdit, onDelete, onAdd, onToggleActive, togglingIds }: {
    data: Category[],
    onEdit: (cat: Category) => void,
    onDelete: (id: number) => void,
    onAdd: () => void,
    onToggleActive: (cat: Category) => void,
    togglingIds?: Set<number>
}) {
    const { hasPermission } = useAuth();

    const getCategoryIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('makan')) return <Utensils className="w-6 h-6" />;
        if (n.includes('minum') || n.includes('bar')) return <Zap className="w-6 h-6" />;
        if (n.includes('snack')) return <Cookie className="w-6 h-6" />;
        if (n.includes('rokok')) return <Wind className="w-6 h-6" />;
        if (n.includes('store')) return <Package className="w-6 h-6" />;
        if (n.includes('bahan') || n.includes('raw')) return <Database className="w-6 h-6" />;
        return <Filter className="w-6 h-6" />;
    };

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-8 border border-slate-100 shadow-inner">
                    <Filter className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-slate-900 font-black text-2xl uppercase tracking-tighter mb-3">Database Kategori Kosong</h3>
                <p className="text-slate-400 font-medium mb-10 max-w-sm mx-auto text-sm">Gunakan kategori untuk mengelompokkan produk Anda agar pelaporan stok dan target produksi (KDS/BDS) menjadi lebih akurat.</p>
                {hasPermission('INV_UPDATE') && (
                    <button onClick={onAdd} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black shadow-2xl shadow-slate-200 hover:scale-105 transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center gap-3">
                        <Plus className="w-5 h-5" />
                        Tambah Kategori Pertama
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 md:p-10 space-y-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-110" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-7 bg-indigo-600 rounded-full" />
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none">Manajemen Kategori</h2>
                    </div>
                    <div className="flex items-center gap-2 px-1">
                        <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">{data.length} Kategori Terdaftar</p>
                    </div>
                </div>
                {hasPermission('INV_UPDATE') && (
                    <button onClick={onAdd} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-4 shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95 relative z-10 uppercase tracking-widest">
                        <Plus className="w-5 h-5" />
                        Tambah Kategori
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data.map((cat) => (
                    <div key={cat.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group flex flex-col relative overflow-hidden">
                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-slate-50/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="flex justify-between items-start mb-10 relative z-10">
                            <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-xl group-hover:shadow-indigo-100 group-hover:rotate-6 transition-all duration-500 border border-slate-100">
                                {getCategoryIcon(cat.name)}
                            </div>
                                <button
                                    disabled={togglingIds?.has(cat.id)}
                                    onClick={() => onToggleActive(cat)}
                                    className={`p-3 border rounded-xl transition-all active:scale-90 ${cat.isActive === false ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'} ${togglingIds?.has(cat.id) ? 'opacity-50 cursor-not-allowed animate-pulse' : ''}`}
                                    title={cat.isActive === false ? "Aktifkan Kategori" : "Non-aktifkan Kategori"}
                                >
                                    <Power className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onEdit(cat)}
                                    className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-lg transition-all active:scale-90"
                                    title="Edit Kategori"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onDelete(cat.id)}
                                    className="p-3 bg-white border border-slate-100 rounded-xl text-slate-300 hover:text-rose-600 hover:border-rose-100 hover:shadow-lg transition-all active:scale-90"
                                    title="Hapus Kategori"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                        </div>

                        <div className="mb-8 relative z-10">
                            <h3 className="text-2xl font-black text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors uppercase tracking-tight leading-none">{cat.name}</h3>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${cat.isActive ? 'bg-emerald-500' : 'bg-slate-300 animate-pulse'}`} />
                                <span className={`text-[9px] font-black uppercase tracking-widest ${cat.isActive ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    {cat.isActive ? 'Status: Aktif' : 'Status: Non-Aktif'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-auto pt-6 border-t border-slate-50 space-y-4 relative z-10">
                            <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100/50">
                                <div className="flex items-center gap-2">
                                    <Monitor className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Produksi</span>
                                </div>
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter shadow-sm border ${
                                    cat.productionTarget === 'KDS' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                                    cat.productionTarget === 'BDS' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 
                                    cat.productionTarget === 'JASA' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                                    'bg-white text-slate-400 border-slate-200'
                                }`}>
                                    {cat.productionTarget || 'NONE'}
                                </span>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100/50">
                                <div className="flex items-center gap-2">
                                    <Database className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Berlaku Untuk</span>
                                </div>
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter shadow-sm border ${
                                    cat.type === 'INGREDIENT' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                                    cat.type === 'BOTH' ? 'bg-violet-100 text-violet-700 border-violet-200' :
                                    'bg-blue-100 text-blue-700 border-blue-200'
                                }`}>
                                    {cat.type === 'INGREDIENT' ? 'Bahan Baku' : cat.type === 'BOTH' ? 'Menu & Bahan' : 'Menu / Produk'}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 px-1">
                                <Info className="w-3.5 h-3.5 text-slate-300" />
                                <p className="text-[9px] font-bold text-slate-400 uppercase italic leading-tight">
                                    Mempengaruhi alur KDS/BDS di sistem Kasir.
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
