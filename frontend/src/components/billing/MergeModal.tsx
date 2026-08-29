import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface MergeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMerge: (targetTableId: number) => void;
    sourceTableId: number;
    tableType: 'billiard' | 'cafe';
}

export default function MergeModal({ isOpen, onClose, onMerge, sourceTableId, tableType }: MergeModalProps) {
    const [tables, setTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    useBodyScrollLock(isOpen);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            const endpoint = tableType === 'cafe' ? '/cafe-table' : '/billiard/tables';
            axios.get(endpoint)
                .then(res => setTables(res.data))
                .catch(err => console.error('Failed to fetch tables', err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, tableType]);

    if (!isOpen) return null;

    const filteredTables = tables.filter(t => 
        t.id !== sourceTableId && // Exclude current table
        (t.tableName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         t.activeTransaction?.customerName?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 z-[70] bg-slate-900/60  flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">Gabung Billing (Merge)</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Pilih Meja Target</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Cari meja atau nama pelanggan..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-48 opacity-50">
                            <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat Meja...</p>
                        </div>
                    ) : filteredTables.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 opacity-50 grayscale">
                            <AlertCircle className="w-10 h-10 text-slate-400 mb-3" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tidak ada meja lain</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {filteredTables.map(t => {
                                const hasActiveTx = !!t.activeTransaction;
                                const customerName = t.activeTransaction?.customerName || t.activeTransaction?.member?.name || 'Tamu Baru';
                                
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => onMerge(t.id)}
                                        className={`p-4 rounded-2xl border text-left transition-all group relative overflow-hidden flex flex-col justify-between h-36
                                            ${hasActiveTx 
                                                ? 'bg-white border-indigo-100 hover:border-indigo-400 hover:shadow-lg shadow-sm' 
                                                : 'bg-slate-50 border-transparent hover:bg-slate-100 opacity-60'}`}
                                    >
                                        <div className="flex justify-between items-start w-full">
                                            <span className="text-sm font-black text-slate-900">Meja {t.tableName}</span>
                                            {hasActiveTx && (
                                                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 rounded-md flex items-center gap-1 shadow-sm">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    Aktif
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-3 w-full space-y-1">
                                            {hasActiveTx ? (
                                                <>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pelanggan</span>
                                                        <span className="text-xs font-black text-indigo-600 truncate">{customerName}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px] pt-1 border-t border-slate-50 mt-1">
                                                        <span className="font-bold text-slate-400">{t.activeTransaction?.orderItems?.length || 0} Item</span>
                                                        <span className="font-black text-emerald-600">Rp {Number(t.grandTotal || 0).toLocaleString('id-ID')}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                                                    <span className="text-xs font-bold text-slate-400">Meja Tersedia</span>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
