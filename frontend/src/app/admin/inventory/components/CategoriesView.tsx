import React from 'react';
import { Filter, Edit2, Trash2, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Category } from '../types';

export function CategoriesView({ data, onEdit, onDelete, onAdd }: {
    data: Category[],
    onEdit: (cat: Category) => void,
    onDelete: (id: number) => void,
    onAdd: () => void
}) {
    const { hasPermission } = useAuth();
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200">
                    <Filter className="w-10 h-10" />
                </div>
                <h3 className="text-slate-900 font-black text-xl mb-2">Belum Ada Kategori</h3>
                <p className="text-slate-500 font-medium mb-8 max-w-xs">Buat kategori produk untuk mengelompokkan menu dan mengatur target produksi.</p>
                {hasPermission('INV_UPDATE') && (
                    <button onClick={onAdd} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-lg">TAMBAH KATEGORI PERTAMA</button>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 md:p-10 space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">Manajemen Kategori</h2>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse md:hidden" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">Total {data.length} Kategori Terdaftar</p>
                    </div>
                </div>
                {hasPermission('INV_UPDATE') && (
                    <button onClick={onAdd} className="bg-indigo-600 text-white px-6 py-4 md:py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 w-full md:w-auto">
                        <Plus className="w-5 h-5 md:w-4 md:h-4" />
                        <span className="uppercase tracking-widest">Tambah Kategori</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.map((cat) => (
                    <div key={cat.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Filter className="w-6 h-6" />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onEdit(cat)}
                                    className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm border border-transparent hover:border-indigo-100"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onDelete(cat.id)}
                                    className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm border border-transparent hover:border-rose-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{cat.name}</h3>
                        <div className="mt-auto space-y-3">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-1">
                                <span className="text-slate-400">Target</span>
                                <span className={`px-2 py-1 rounded-md ${cat.productionTarget === 'KDS' ? 'bg-amber-100 text-amber-600' : cat.productionTarget === 'BDS' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                    {cat.productionTarget || 'NONE'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-1">
                                <span className="text-slate-400">Status</span>
                                <span className={cat.isActive ? 'text-emerald-500' : 'text-rose-500'}>{cat.isActive ? 'AKTIF' : 'NONAKTIF'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
