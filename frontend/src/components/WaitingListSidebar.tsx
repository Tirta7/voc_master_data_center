'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, UserPlus, Clock, CheckCircle, Trash2, AlertCircle, Plus, ChevronRight, User as UserIcon, ShieldCheck, ShieldAlert, Lock } from 'lucide-react';
import { useAlert } from '@/components/ui/AlertProvider';
import { useAuth } from '@/context/AuthContext';
import { useMqtt } from '@/context/MqttContext';
import TableSelectionModal from './TableSelectionModal';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useRealtimeData } from '@/context/RealtimeDataContext';

interface WaitingListEntry {
    id: number;
    customerName: string;
    phoneNumber?: string;
    note?: string;
    status: 'PENDING' | 'CHECKED_IN' | 'CANCELLED';
    targetTableId?: number;
    targetTable?: {
        tableName: string;
    };
    assignedTableId?: number;
    assignedTable?: {
        tableName: string;
    };
    estimatedWaitMinutes?: number;
    handledById?: number;
    handledByName?: string;
    createdAt: string;
}

interface WaitingListSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    tables: any[];
    type?: 'BILLIARD' | 'CAFE';
}

const WaitingListSidebar: React.FC<WaitingListSidebarProps> = ({ isOpen, onClose, tables, type = 'BILLIARD' }) => {
    const { showAlert, showConfirm } = useAlert();
    const { user } = useAuth();
    const { waitingList: globalWaitingList, refetchWaitingList, loadingBilliard: loading } = useRealtimeData();
    
    const entries = React.useMemo(() => {
        return (globalWaitingList as any[]).filter(e => e.type === type);
    }, [globalWaitingList, type]);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedEntryForAssignment, setSelectedEntryForAssignment] = useState<any | null>(null);
    const [form, setForm] = useState({
        customerName: '',
        phoneNumber: '',
        targetTableId: '',
        note: ''
    });

    useBodyScrollLock(isOpen);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await axios.post(`/waiting-list`, {
                ...form,
                type,
                targetTableId: form.targetTableId ? Number(form.targetTableId) : undefined
            });
            setForm({ customerName: '', phoneNumber: '', targetTableId: '', note: '' });
            setIsFormOpen(false);
            refetchWaitingList();
            showAlert('Berhasil', 'Antrean ditambahkan!', { variant: 'success' });
        } catch (error) {
            showAlert('Gagal', 'Gagal menambahkan antrean.', { variant: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = async (id: number) => {
        const confirm = await showConfirm('Batalkan Antrean?', 'Yakin ingin membatalkan antrean ini?');
        if (!confirm) return;
        try {
            await axios.delete(`/waiting-list/${id}`);
            refetchWaitingList();
        } catch (error) {
            showAlert('Gagal', 'Gagal membatalkan antrean.', { variant: 'error' });
        }
    };

    const handleAssign = async (waitingId: number, tableId: number) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await axios.patch(`/waiting-list/${waitingId}/assign`, { tableId });
            refetchWaitingList();
            setSelectedEntryForAssignment(null);
            showAlert('Berhasil', 'Antrean berhasil ditugaskan ke meja.', { variant: 'success' });
        } catch (error) {
            showAlert('Gagal', 'Gagal menugaskan meja.', { variant: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUnassign = async (waitingId: number) => {
        const confirm = await showConfirm('Lepas Meja?', 'Yakin ingin melepas penugasan meja dari antrean ini?');
        if (!confirm) return;
        try {
            await axios.patch(`/waiting-list/${waitingId}/unassign`, {});
            refetchWaitingList();
            showAlert('Berhasil', 'Meja berhasil dilepas.', { variant: 'success' });
        } catch (error) {
            showAlert('Gagal', 'Gagal melepas meja.', { variant: 'error' });
        }
    };

    const handleKeep = async (id: number) => {
        try {
            await axios.patch(`/waiting-list/${id}/handle`, {});
            refetchWaitingList();
        } catch (error: any) {
            showAlert('Gagal', error.response?.data?.message || 'Gagal mengekeep antrean.', { variant: 'error' });
        }
    };

    const handleUnkeep = async (id: number) => {
        try {
            await axios.patch(`/waiting-list/${id}/unhandle`, {});
            refetchWaitingList();
        } catch (error: any) {
            showAlert('Gagal', error.response?.data?.message || 'Gagal melepas antrean.', { variant: 'error' });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex justify-end">
            <div className="absolute inset-0 bg-slate-900/60  animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative w-[85vw] sm:w-[400px] max-w-full bg-white h-[100dvh] shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-slate-200">
                {/* Submission Overlay for Double Click Safety */}
                {isSubmitting && (
                    <div className="absolute inset-0 z-[120] bg-white/80  flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="text-indigo-600 font-black uppercase tracking-widest text-[10px]">Memproses...</p>
                    </div>
                )}
                
                {/* Header - Clean White Aesthetic */}
                <div 
                    className="px-5 pb-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 shadow-sm z-10 relative"
                    style={{ paddingTop: 'max(env(safe-area-inset-top), 32px)' }}
                >
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
                            <Clock className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base md:text-xl font-black text-slate-800 tracking-tight leading-none truncate mb-1">Antrean {type === 'CAFE' ? 'Cafe' : 'Billiard'}</h2>
                            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{entries.length} Antrean Aktif</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-slate-500 hover:text-slate-700 active:scale-90 shrink-0">
                        <X className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 custom-scrollbar bg-slate-50 relative z-0">
                    {!isFormOpen ? (
                        <button
                            onClick={() => setIsFormOpen(true)}
                            className="w-full py-3.5 md:py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-6 shadow-lg shadow-indigo-600/20 border border-indigo-500"
                        >
                            <Plus className="w-4 h-4 shrink-0" />
                            Tambah Antrean
                        </button>
                    ) : (
                        <div className="bg-white p-5 rounded-xl border border-slate-200 mb-6 shadow-sm animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                                    <UserPlus className="w-4 h-4 text-indigo-500" /> Form Antrean
                                </h3>
                                <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-rose-500 p-1 bg-slate-50 rounded-lg"><X className="w-4 h-4" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nama Customer</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.customerName}
                                        onChange={e => setForm({ ...form, customerName: e.target.value })}
                                        className="w-full p-3 md:p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition-all"
                                        placeholder="Ketik nama pelanggan..."
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">No. HP (Opsional)</label>
                                        <input
                                            type="text"
                                            value={form.phoneNumber}
                                            onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
                                            className="w-full p-3 md:p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition-all"
                                            placeholder="0812..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Meja Target</label>
                                        <div className="relative">
                                            <select
                                                value={form.targetTableId}
                                                onChange={e => setForm({ ...form, targetTableId: e.target.value })}
                                                className="w-full p-3 md:p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">Sembarang Meja</option>
                                                {tables.map(t => (
                                                    <option key={t.id} value={t.id}>{t.tableName}</option>
                                                ))}
                                            </select>
                                            <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all mt-4 shadow-sm active:scale-[0.98]">
                                    SIMPAN ANTREAN
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="space-y-3 md:space-y-4">
                        {entries.filter(e => e.status === 'PENDING').length === 0 && !loading && (
                            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                    <Clock className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-sm font-black text-slate-700 mb-1">Antrean Kosong</h3>
                                <p className="text-slate-400 font-medium text-xs">Belum ada pelanggan dalam daftar tunggu saat ini.</p>
                            </div>
                        )}

                        {entries.filter(e => e.status === 'PENDING').map((entry) => {
                            const isFresh = (new Date().getTime() - new Date(entry.createdAt).getTime()) < 120000; // 2 minutes

                            return (
                                <div key={entry.id} className={`p-4 md:p-5 rounded-2xl border transition-all group relative overflow-hidden ${!entry.handledById
                                    ? 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                                    : 'bg-slate-100 border-slate-200 opacity-80'
                                    }`}>

                                    {!entry.handledById && isFresh && (
                                        <div className="absolute top-0 right-0 px-3 py-1 bg-rose-500 text-white text-[8px] font-black uppercase tracking-widest rounded-bl-xl animate-pulse z-10 shadow-sm">
                                            BARU
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black text-white text-base uppercase shadow-sm transition-transform duration-300 shrink-0 ${!entry.handledById ? 'bg-indigo-600 shadow-indigo-200' : 'bg-slate-400'}`}>
                                                {entry.customerName.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-black text-slate-800 text-sm md:text-base leading-tight truncate">{entry.customerName}</h4>
                                                <p className="text-[10px] md:text-xs text-slate-500 font-bold tracking-wider mt-0.5 truncate">{entry.phoneNumber || 'NO PHONE'}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCancel(entry.id)}
                                            disabled={!!(entry.handledById && entry.handledById !== user?.id)}
                                            className={`p-2 transition-all rounded-xl border border-transparent shrink-0 ${entry.handledById && entry.handledById !== user?.id
                                                ? 'text-slate-300 cursor-not-allowed'
                                                : 'bg-rose-50 text-rose-500 hover:text-white hover:bg-rose-500'
                                                }`}
                                            title="Batalkan Antrean"
                                        >
                                            <Trash2 className="w-4 h-4 md:w-4 md:h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        {entry.handledByName && (
                                            <div className={`px-2.5 py-2 rounded-xl border flex items-center gap-2 ${entry.handledById === user?.id ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-200 border-slate-300 text-slate-500'}`}>
                                                <div className={`p-1.5 rounded-lg shrink-0 ${entry.handledById === user?.id ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'}`}>
                                                    {entry.handledById === user?.id ? <UserIcon className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                                </div>
                                                <span className={`text-[10px] md:text-xs font-black uppercase tracking-tight truncate ${entry.handledById !== user?.id ? 'line-through opacity-80' : ''}`}>
                                                    {entry.handledById === user?.id ? 'Anda sedang menghandle' : `Dihandle oleh ${entry.handledByName}`}
                                                </span>
                                            </div>
                                        )}

                                        {entry.targetTable && (
                                            <div className="px-2.5 py-2 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-2">
                                                <div className="p-1.5 bg-amber-500 rounded-lg text-white shrink-0">
                                                    <AlertCircle className="w-3 h-3" />
                                                </div>
                                                <span className="text-[10px] md:text-xs font-black text-amber-700 uppercase tracking-tight truncate">Menunggu Meja {entry.targetTable.tableName}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 border-t border-slate-100">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                                            <Clock className="w-3 h-3" />
                                            {new Date(entry.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            {!entry.targetTableId && (
                                                entry.handledById === user?.id ? (
                                                    <button
                                                        onClick={() => handleUnkeep(entry.id)}
                                                        className="flex-1 sm:flex-none px-4 py-2 bg-rose-50 text-rose-600 text-[10px] font-black rounded-xl border border-rose-100 hover:bg-rose-100 transition-all uppercase tracking-widest"
                                                    >
                                                        LEPAS
                                                    </button>
                                                ) : !entry.handledById ? (
                                                    <button
                                                        onClick={() => handleKeep(entry.id)}
                                                        className={`flex-1 sm:flex-none px-5 py-2 bg-slate-900 text-white text-[10px] font-black rounded-xl border border-slate-800 hover:bg-black transition-all uppercase tracking-widest shadow-md active:scale-95 ${isFresh ? 'animate-bounce' : ''}`}
                                                    >
                                                        SIKAT!
                                                    </button>
                                                ) : (
                                                    <div className="flex-1 sm:flex-none px-4 py-2 bg-slate-200 text-slate-400 text-[10px] font-black rounded-xl border border-slate-300 cursor-not-allowed uppercase tracking-widest text-center">
                                                        TAKEN
                                                    </div>
                                                )
                                            )}

                                            {entry.targetTableId ? (
                                                <>
                                                    <button
                                                        onClick={() => handleUnassign(entry.id)}
                                                        disabled={!!(entry.handledById && entry.handledById !== user?.id)}
                                                        className={`flex-1 sm:flex-none px-3 py-2 text-[10px] font-black rounded-xl border transition-all uppercase tracking-widest ${entry.handledById && entry.handledById !== user?.id
                                                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                                            : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'
                                                            }`}
                                                    >
                                                        LEPAS
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedEntryForAssignment(entry)}
                                                        disabled={!!(entry.handledById && entry.handledById !== user?.id)}
                                                        className={`flex-[2] sm:flex-none px-4 py-2 text-[10px] font-black rounded-xl border transition-all uppercase tracking-widest ${entry.handledById && entry.handledById !== user?.id
                                                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                                            : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 shadow-sm'
                                                            }`}
                                                    >
                                                        GANTI MEJA
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setSelectedEntryForAssignment(entry)}
                                                    disabled={!!(entry.handledById && entry.handledById !== user?.id)}
                                                    className={`flex-[2] sm:flex-none px-4 py-2 text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest ${entry.handledById && entry.handledById !== user?.id
                                                        ? 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed'
                                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 active:scale-95'
                                                        }`}
                                                >
                                                    <Clock className="w-3.5 h-3.5" />
                                                    TUGASKAN
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 md:p-5 border-t border-slate-200 bg-white shrink-0">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] text-center">
                        VOC QUEUE SYSTEM
                    </p>
                </div>
            </div>

            <TableSelectionModal
                isOpen={!!selectedEntryForAssignment}
                onClose={() => setSelectedEntryForAssignment(null)}
                tables={tables}
                customerName={selectedEntryForAssignment?.customerName || ''}
                targetTableId={selectedEntryForAssignment?.targetTableId}
                onSelect={(tableId) => selectedEntryForAssignment && handleAssign(selectedEntryForAssignment.id, tableId)}
            />
        </div>
    );
};

export default WaitingListSidebar;
