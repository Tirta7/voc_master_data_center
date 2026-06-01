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
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white h-full shadow-xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-slate-200">
                {/* Submission Overlay for Double Click Safety */}
                {isSubmitting && (
                    <div className="absolute inset-0 z-[120] bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="text-slate-900 font-bold uppercase tracking-widest text-[10px]">Memproses Antrean...</p>
                    </div>
                )}
                <div className="p-6 border-b border-indigo-500/10 flex justify-between items-center bg-slate-900 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">Antrean {type === 'CAFE' ? 'Cafe' : 'Billiard'}</h2>
                            <p className="text-[10px] font-bold text-indigo-300/60 uppercase tracking-wider mt-0.5">{entries.length} Antrean Aktif</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain p-6 custom-scrollbar bg-white">
                    {!isFormOpen ? (
                        <button
                            onClick={() => setIsFormOpen(true)}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs tracking-wider active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-6 shadow-md shadow-indigo-100"
                        >
                            <Plus className="w-4 h-4" />
                            TAMBAH ANTREAN
                        </button>
                    ) : (
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6 animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Form Antrean</h3>
                                <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Nama Customer</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.customerName}
                                        onChange={e => setForm({ ...form, customerName: e.target.value })}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="Ketik nama..."
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">No. HP</label>
                                        <input
                                            type="text"
                                            value={form.phoneNumber}
                                            onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="0812..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Meja Target</label>
                                        <div className="relative">
                                            <select
                                                value={form.targetTableId}
                                                onChange={e => setForm({ ...form, targetTableId: e.target.value })}
                                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:border-indigo-500 outline-none transition-all appearance-none"
                                            >
                                                <option value="">Semua</option>
                                                {tables.map(t => (
                                                    <option key={t.id} value={t.id}>{t.tableName}</option>
                                                ))}
                                            </select>
                                            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 rotate-90 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs tracking-wider transition-all mt-2 shadow-sm">
                                    SIMPAN ANTREAN
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="space-y-3">
                        {entries.filter(e => e.status === 'PENDING').length === 0 && !loading && (
                            <div className="text-center py-12 px-6">
                                <p className="text-slate-400 font-medium text-sm">Belum ada antrean aktif.</p>
                            </div>
                        )}

                        {entries.filter(e => e.status === 'PENDING').map((entry) => {
                            const isFresh = (new Date().getTime() - new Date(entry.createdAt).getTime()) < 120000; // 2 minutes

                            return (
                                <div key={entry.id} className={`p-4 rounded-xl border transition-all group relative overflow-hidden ${!entry.handledById
                                    ? 'bg-white border-indigo-200 shadow-[0_0_15px_rgba(79,70,229,0.1)]'
                                    : 'bg-slate-50 border-slate-200 grayscale-[0.5] opacity-90'
                                    }`}>

                                    {!entry.handledById && isFresh && (
                                        <div className="absolute top-0 right-0 px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black uppercase tracking-widest rounded-bl-lg animate-pulse z-10">
                                            BURUAN!
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-sm border uppercase shadow-sm transition-transform duration-300 ${!entry.handledById ? 'bg-indigo-600 border-indigo-700 scale-110' : 'bg-slate-400 border-slate-500'}`}>
                                                {entry.customerName.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm leading-tight">{entry.customerName}</h4>
                                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">{entry.phoneNumber || 'NO PHONE'}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCancel(entry.id)}
                                            disabled={!!(entry.handledById && entry.handledById !== user?.id)}
                                            className={`p-1.5 transition-all rounded-lg border border-transparent ${entry.handledById && entry.handledById !== user?.id
                                                ? 'text-slate-200 cursor-not-allowed'
                                                : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100'
                                                }`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-2 mb-3">
                                        {entry.handledByName && (
                                            <div className={`px-2 py-1.5 rounded-lg border flex items-center gap-2 ${entry.handledById === user?.id ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'}`}>
                                                <div className={`p-1 rounded-md ${entry.handledById === user?.id ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-400'}`}>
                                                    {entry.handledById === user?.id ? <UserIcon className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-tight ${entry.handledById !== user?.id ? 'line-through' : ''}`}>
                                                    {entry.handledById === user?.id ? 'Anda sedang menghandle' : `Dihandle oleh ${entry.handledByName}`}
                                                </span>
                                            </div>
                                        )}

                                        {entry.targetTable && (
                                            <div className="px-2 py-1.5 bg-amber-50 rounded-lg border border-amber-100 flex items-center gap-2">
                                                <div className="p-1 bg-amber-500 rounded-md text-white">
                                                    <AlertCircle className="w-2.5 h-2.5" />
                                                </div>
                                                <span className="text-[10px] font-black text-amber-700 uppercase tracking-tight">Menunggu Meja {entry.targetTable.tableName}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                                        <p className="flex-1 text-[10px] font-medium text-slate-400 tabular-nums">
                                            Jam: {new Date(entry.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <div className="flex gap-2">
                                            {!entry.targetTableId && (
                                                entry.handledById === user?.id ? (
                                                    <button
                                                        onClick={() => handleUnkeep(entry.id)}
                                                        className="px-3 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-black rounded-lg border border-rose-100 hover:bg-rose-100 transition-all uppercase tracking-tighter"
                                                    >
                                                        LEPAS
                                                    </button>
                                                ) : !entry.handledById ? (
                                                    <button
                                                        onClick={() => handleKeep(entry.id)}
                                                        className={`px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-lg border border-indigo-700 hover:bg-indigo-700 transition-all uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-90 ${isFresh ? 'animate-bounce' : ''}`}
                                                    >
                                                        SIKAT!
                                                    </button>
                                                ) : (
                                                    <div className="px-3 py-1.5 bg-slate-100 text-slate-300 text-[10px] font-black rounded-lg border border-slate-200 cursor-not-allowed uppercase tracking-tighter">
                                                        TAKEN
                                                    </div>
                                                )
                                            )}

                                            {entry.targetTableId ? (
                                                <>
                                                    <button
                                                        onClick={() => handleUnassign(entry.id)}
                                                        disabled={!!(entry.handledById && entry.handledById !== user?.id)}
                                                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${entry.handledById && entry.handledById !== user?.id
                                                            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50'
                                                            : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'
                                                            }`}
                                                    >
                                                        LEPAS
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedEntryForAssignment(entry)}
                                                        disabled={!!(entry.handledById && entry.handledById !== user?.id)}
                                                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${entry.handledById && entry.handledById !== user?.id
                                                            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50'
                                                            : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                                                            }`}
                                                    >
                                                        GANTI MEJA
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setSelectedEntryForAssignment(entry)}
                                                    disabled={!!(entry.handledById && entry.handledById !== user?.id)}
                                                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm ${entry.handledById && entry.handledById !== user?.id
                                                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                                                        }`}
                                                >
                                                    <Clock className="w-3 h-3" />
                                                    TUGASKAN MEJA
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] text-center">
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
