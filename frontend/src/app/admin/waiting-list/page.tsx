'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users,
    Clock,
    UserPlus,
    Trash2,
    CheckCircle,
    AlertCircle,
    Search,
    Filter,
    ArrowLeft,
    RefreshCw,
    X,
    Activity,
    ChevronRight,
    Star,
    Monitor,
    LayoutDashboard
} from 'lucide-react';
import Link from 'next/link';
import { useAlert } from '@/components/ui/AlertProvider';
import TableSelectionModal from '@/components/TableSelectionModal';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useMqtt } from '@/context/MqttContext';

// import { API_URL } from '@/utils/urlUtils';

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
    handledById?: number;
    handledByName?: string;
    createdAt: string;
}

export default function WaitingListPage() {
    const [entries, setEntries] = useState<WaitingListEntry[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedEntryForAssignment, setSelectedEntryForAssignment] = useState<WaitingListEntry | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [form, setForm] = useState({
        customerName: '',
        phoneNumber: '',
        targetTableId: '',
        note: ''
    });

    const { showAlert, showConfirm } = useAlert();
    const { user } = useAuth();
    const { subscribe } = useMqtt();
    useBodyScrollLock(isFormOpen);

    useEffect(() => {
        fetchData();

        const unsubs = [
            subscribe('billiard/waiting-list/update', () => fetchEntries()),
            subscribe('billiard/tables/update', () => fetchTables()),
        ];

        return () => unsubs.forEach(u => u());
    }, [subscribe]);

    const fetchData = async (silent = false) => {
        if (!silent) setLoading(true);
        await Promise.all([fetchEntries(), fetchTables()]);
        if (!silent) setLoading(false);
    };

    const fetchEntries = async () => {
        try {
            const res = await axios.get(`/waiting-list`);
            setEntries(res.data);
        } catch (error) {
            console.error('Failed to fetch waiting list:', error);
        }
    };

    const fetchTables = async () => {
        try {
            const res = await axios.get(`/billiard/tables`);
            setTables(res.data);
        } catch (error) {
            console.error('Failed to fetch tables:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`/waiting-list`, {
                ...form,
                targetTableId: form.targetTableId ? Number(form.targetTableId) : undefined
            });
            setForm({ customerName: '', phoneNumber: '', targetTableId: '', note: '' });
            setIsFormOpen(false);
            fetchEntries();
            showAlert('Berhasil', 'Antrean ditambahkan!', { variant: 'success' });
        } catch (error) {
            showAlert('Gagal', 'Gagal menambahkan antrean.', { variant: 'error' });
        }
    };

    const handleCancel = async (id: number) => {
        const confirmResult = await showConfirm('Batalkan Antrean?', 'Yakin ingin membatalkan antrean ini?');
        if (!confirmResult) return;
        try {
            await axios.delete(`/waiting-list/${id}`);
            fetchEntries();
        } catch (error) {
            showAlert('Gagal', 'Gagal membatalkan antrean.', { variant: 'error' });
        }
    };

    const handleAssign = async (waitingId: number, tableId: number) => {
        try {
            await axios.patch(`/waiting-list/${waitingId}/assign`, { tableId });
            fetchEntries();
            setSelectedEntryForAssignment(null);
            showAlert('Berhasil', 'Antrean berhasil ditugaskan ke meja.', { variant: 'success' });
        } catch (error) {
            showAlert('Gagal', 'Gagal menugaskan meja.', { variant: 'error' });
        }
    };

    const filteredEntries = entries.filter((e: WaitingListEntry) =>
        e.status === 'PENDING' &&
        (e.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.phoneNumber?.includes(searchTerm))
    );

    return (
        <div className="min-h-screen bg-white p-4 md:p-8">
            {/* Hero Header */}
            <header className="mb-10 max-w-7xl mx-auto mt-4">
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-indigo-200">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12" />

                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <Link href="/admin/dashboard" className="p-3 bg-white/10 border border-white/20 rounded-2xl text-white hover:bg-white/20 backdrop-blur-sm transition-all shadow-md">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Queue Management System</span>
                                </div>
                                <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Antrean Operasional</h1>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex items-center gap-1.5 text-emerald-300 text-[10px] font-black uppercase tracking-widest bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-500/30">
                                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                        Live Monitoring
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="relative w-full sm:w-[300px]">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                                <input
                                    type="text"
                                    placeholder="Cari nama atau no. hp..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-sm font-medium text-white placeholder:text-white/50 focus:bg-white/20 outline-none transition-all backdrop-blur-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button
                                    onClick={() => fetchData()}
                                    className="p-3 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 backdrop-blur-sm transition-all shadow-md"
                                    title="Refresh Data"
                                >
                                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                                <button
                                    onClick={() => setIsFormOpen(true)}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl font-black text-sm tracking-wider active:scale-95 transition-all shadow-xl"
                                >
                                    <UserPlus className="w-5 h-5" />
                                    ADD QUEUE
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Stats Sidebar - Flat Style */}
                <div className="xl:col-span-3 space-y-6">
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Statistics</h3>
                            <Activity className="w-4 h-4 text-slate-300" />
                        </div>

                        <div className="space-y-6">
                            <div>
                                <div className="flex items-end justify-between mb-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waiting</p>
                                    <p className="text-3xl font-black text-indigo-600 tabular-nums">{entries.filter(e => e.status === 'PENDING').length}</p>
                                </div>
                                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-600 transition-all duration-700 shadow-[0_0_8px_rgba(79,70,229,0.3)]" style={{ width: `${Math.min(100, (entries.filter(e => e.status === 'PENDING').length / 10) * 100)}%` }} />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-end justify-between mb-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Checked In</p>
                                    <p className="text-3xl font-black text-emerald-600 tabular-nums">{entries.filter(e => e.status === 'CHECKED_IN').length}</p>
                                </div>
                                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]" style={{ width: '100%' }} />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-200">
                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Monitor className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Operator</p>
                                    <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{user?.name || 'System'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                            <Star className="w-4 h-4 text-slate-400" />
                        </div>
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Operational Insight</h3>
                        <p className="text-xs font-medium text-slate-600 leading-relaxed">System monitoring is active. All interactions are logged for performance audit.</p>
                    </div>
                </div>

                {/* Main Queue List */}
                <div className="xl:col-span-9">
                    {filteredEntries.length === 0 ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Floor Overview</h3>
                                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                                        Monitoring Active
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-4 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Ready</div>
                                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> Active</div>
                                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Checkout</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {tables
                                    .sort((a, b) => a.tableName.localeCompare(b.tableName, undefined, { numeric: true, sensitivity: 'base' }))
                                    .map((table) => {
                                        const isAvailable = table.status === 'available';
                                        const isWaitingPayment = table.status === 'waiting_payment';
                                        const isWarning = table.status === 'warning';
                                        const isVip = table.category?.toUpperCase().includes('VIP');
                                        const isCafe = table.category?.toUpperCase() === 'CAFE';

                                        return (
                                            <div
                                                key={table.id}
                                                className={`p-4 rounded-xl border transition-all hover:bg-slate-50 hover:shadow-md ${isAvailable
                                                    ? isVip ? 'bg-amber-50/20 border-amber-100 shadow-sm' : isCafe ? 'bg-rose-50/20 border-rose-100 shadow-sm' : 'bg-white border-slate-200 shadow-sm'
                                                    : 'bg-slate-50 border-slate-200 opacity-80'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className={`p-2 rounded-lg ${isAvailable ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                                                        {table.category === 'VIP' ? <Star className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                                                    </div>
                                                    {isAvailable ? (
                                                        <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 tracking-wider">READY</span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-500 tabular-nums">{table.remainingMinutes || 0}m</span>
                                                    )}
                                                </div>

                                                <div className="space-y-0.5">
                                                    <h4 className="text-sm font-bold text-slate-900 truncate">{table.tableName}</h4>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{table.category}</p>
                                                </div>

                                                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                                    <p className="text-[10px] font-medium text-slate-500 truncate max-w-[100px]">
                                                        {isAvailable ? 'Available' : (table.activeTransaction?.customerName || 'In Use')}
                                                    </p>
                                                    {!isAvailable && (
                                                        <div className="w-8 h-1 bg-slate-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full bg-slate-900 opacity-20`}
                                                                style={{ width: `${Math.max(10, 100 - (table.remainingMinutes || 0))}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredEntries.map((entry: WaitingListEntry, idx: number) => {
                                const waitTimeMs = new Date().getTime() - new Date(entry.createdAt).getTime();
                                const waitTimeMinutes = Math.floor(waitTimeMs / 60000);

                                return (
                                    <div key={entry.id} className="bg-white p-6 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all duration-300 group">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                                                    <span className="font-bold text-xl text-slate-400 uppercase">{entry.customerName.charAt(0)}</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-medium text-slate-500 font-mono mt-1">{entry.phoneNumber || 'NO PHONE'}</p>
                                                    {entry.handledByName && (
                                                        <div className="mt-2 flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100 w-fit">
                                                            <Activity className="w-2.5 h-2.5" />
                                                            <span className="text-[9px] font-black uppercase tracking-tight">Dihandle oleh {entry.handledByName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleCancel(entry.id)}
                                                className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-white transition-all rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                    <Clock className="w-2.5 h-2.5" /> Wait Time
                                                </div>
                                                <p className="text-xs font-bold text-slate-700 tabular-nums">{waitTimeMinutes} Minutes</p>
                                            </div>
                                            <div className={`p-3 rounded-lg border ${entry.targetTable ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                                                <div className="text-[8px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 text-slate-400">
                                                    <LayoutDashboard className="w-2.5 h-2.5" /> Preference
                                                </div>
                                                <p className={`text-xs font-bold truncate ${entry.targetTable ? 'text-amber-700' : 'text-slate-500'}`}>
                                                    {entry.targetTable?.tableName || 'System Match'}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setSelectedEntryForAssignment(entry)}
                                            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2"
                                        >
                                            ASSIGN TABLE
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Flat Form Overlay */}
            {isFormOpen && (
                <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsFormOpen(false)} />
                    <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-600">
                                    <UserPlus className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 tracking-tight">New Queue Entry</h2>
                            </div>
                            <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Customer Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.customerName}
                                        onChange={e => setForm({ ...form, customerName: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                        placeholder="Enter guest name..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Phone (Optional)</label>
                                        <input
                                            type="text"
                                            value={form.phoneNumber}
                                            onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                            placeholder="08xxxxxxxxxx"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Target Table</label>
                                        <div className="relative">
                                            <select
                                                value={form.targetTableId}
                                                onChange={e => setForm({ ...form, targetTableId: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none"
                                            >
                                                <option value="">Auto Selector</option>
                                                {tables.map((t: any) => (
                                                    <option key={t.id} value={t.id}>{t.tableName}</option>
                                                ))}
                                            </select>
                                            <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Internal Notes</label>
                                    <textarea
                                        value={form.note}
                                        onChange={e => setForm({ ...form, note: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none min-h-[80px]"
                                        placeholder="Customer preferences or specific instructions..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="flex-1 py-2.5 bg-white text-slate-500 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 border border-slate-200 transition-all"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-2.5 bg-slate-900 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 shadow-sm transition-all"
                                >
                                    SUBMIT QUEUE
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <TableSelectionModal
                isOpen={!!selectedEntryForAssignment}
                onClose={() => setSelectedEntryForAssignment(null)}
                tables={tables}
                customerName={selectedEntryForAssignment?.customerName || ''}
                targetTableId={selectedEntryForAssignment?.targetTableId}
                onSelect={(tableId) => selectedEntryForAssignment && handleAssign(selectedEntryForAssignment.id, tableId)}
            />

            <style jsx>{`
                @keyframes loading-slide {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(300%); }
                }
                .animate-loading-slide {
                    animation: loading-slide 3s infinite linear;
                }
                :global(.custom-scrollbar::-webkit-scrollbar) {
                    width: 6px;
                }
                :global(.custom-scrollbar::-webkit-scrollbar-track) {
                    background: transparent;
                }
                :global(.custom-scrollbar::-webkit-scrollbar-thumb) {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                :global(.custom-scrollbar::-webkit-scrollbar-thumb:hover) {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
}
