'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    History,
    Search,
    Filter,
    Trash2,
    PlayCircle,
    StopCircle,
    CreditCard,
    UserCircle,
    Clock,
    ShieldAlert,
    Calendar,
    Activity,
    AlertTriangle,
    PlusCircle,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    ArrowUpRight,
    Database,
    Fingerprint,
    ShieldOff,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMqtt } from '@/context/MqttContext';
import { socket } from '@/lib/socket';
// import { API_URL } from '@/utils/urlUtils';

interface AuditLog {
    id: number;
    action: string;
    user: string;
    details: string;
    tableId?: number;
    invoiceNumber?: string;
    createdAt: string;
}

interface AuditStats {
    totalToday: number;
    criticalToday: number;
    topUser: { user: string; count: number };
    distribution: { action: string; count: number }[];
}

export default function AuditPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const { hasPermission } = useAuth();
    const { subscribe } = useMqtt();

    // Filters & Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [actionFilter, setActionFilter] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [isBusinessDayMode, setIsBusinessDayMode] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    const fetchLogs = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                ...(actionFilter && { action: actionFilter }),
                ...(userSearch && { user: userSearch }),
                ...(dateRange.start && { start: dateRange.start }),
                ...(dateRange.end && { end: dateRange.end }),
            });
            const response = await axios.get(`/reports/audit-logs?${params.toString()}`);
            setLogs(response.data.items);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [page, actionFilter, userSearch, dateRange]);

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const response = await axios.get(`/reports/audit-stats`);
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get('/settings');
                setSettings(res.data);
            } catch (err) {
                console.error('Failed to fetch settings for Audit:', err);
            }
        };
        fetchSettings();
        fetchStats();
    }, []);

    // Sync dates when Business Day Mode is active
    useEffect(() => {
        if (!settings) return;

        if (isBusinessDayMode) {
            const offsetStr = settings.businessDayOffset || '04:00';
            const [h, m] = offsetStr.split(':').map(Number);
            
            const now = new Date();
            const dStart = new Date(now);
            if (now.getHours() < h) dStart.setDate(dStart.getDate() - 1);
            dStart.setHours(h, m, 0, 0);

            const dEnd = new Date(dStart);
            dEnd.setDate(dEnd.getDate() + 1);
            dEnd.setMinutes(dEnd.getMinutes() - 1); // 1 min before next day

            const fmt = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const HH = String(d.getHours()).padStart(2, '0');
                const MM = String(d.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${HH}:${MM}:00`;
            };

            setDateRange({
                start: fmt(dStart),
                end: fmt(dEnd)
            });
        } else {
            // CALENDAR MODE: Strictly 00:00 - 23:59 of today
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            
            setDateRange({
                start: `${year}-${month}-${day}T00:00:00`,
                end: `${year}-${month}-${day}T23:59:59`
            });
        }
    }, [isBusinessDayMode, settings]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        // MQTT
        const mqttUnsub = subscribe('billiard/audit/update', () => {
            fetchStats();
            fetchLogs(true); // silent: don't show spinner on background sync
        });

        // WebSocket
        const onAuditUpdate = () => {
            fetchStats();
            fetchLogs(true); // silent: don't show spinner on background sync
        };
        socket.on('auditUpdate', onAuditUpdate);

        return () => {
            if (mqttUnsub) mqttUnsub();
            socket.off('auditUpdate', onAuditUpdate);
        };
    }, [subscribe, fetchLogs]);

    const getActionIcon = (action: string) => {
        const a = action.toUpperCase();
        if (a === 'CANCEL_CONFIRMED') return <CheckCircle className="w-5 h-5 text-emerald-500" />;
        if (a === 'CANCEL_REJECTED') return <AlertCircle className="w-5 h-5 text-rose-500" />;
        if (a.includes('CANCEL')) return <Trash2 className="w-5 h-5 text-rose-500" />;
        if (a.includes('START') || a.includes('OPEN')) return <PlayCircle className="w-5 h-5 text-emerald-500" />;
        if (a.includes('STOP') || a.includes('CLOSE')) return <StopCircle className="w-5 h-5 text-amber-500" />;
        if (a.includes('PAYMENT')) return <CreditCard className="w-5 h-5 text-indigo-500" />;
        if (a.includes('DELETE')) return <Trash2 className="w-5 h-5 text-rose-600" />;
        if (a.includes('EDIT') || a.includes('UPDATE') || a.includes('PRICE_CHANGE')) return <Activity className="w-5 h-5 text-blue-500" />;
        if (a.includes('STOCK')) return <Database className="w-5 h-5 text-orange-500" />;
        if (a.includes('PRICE_OVERRIDE')) return <AlertTriangle className="w-5 h-5 text-amber-600" />;
        if (a === 'ADD_MENU') return <PlusCircle className="w-5 h-5 text-indigo-500" />;
        return <Fingerprint className="w-5 h-5 text-slate-400" />;
    };

    const getActionColor = (action: string) => {
        const a = action.toUpperCase();
        if (a === 'CANCEL_CONFIRMED') return 'bg-emerald-50 border-emerald-100 text-emerald-700';
        if (a === 'CANCEL_REJECTED') return 'bg-rose-50 border-rose-100 text-rose-700';
        if (a.includes('CANCEL') || a.includes('DELETE')) return 'bg-rose-50 border-rose-100 text-rose-700';
        if (a.includes('START') || a.includes('OPEN')) return 'bg-emerald-50 border-emerald-100 text-emerald-700';
        if (a.includes('PAYMENT')) return 'bg-indigo-50 border-indigo-100 text-indigo-700';
        if (a.includes('STOP') || a.includes('CLOSE')) return 'bg-amber-50 border-amber-100 text-amber-700';
        if (a.includes('STOCK') || a.includes('PRICE_CHANGE') || a.includes('OVERRIDE')) return 'bg-orange-50 border-orange-100 text-orange-700';
        if (a === 'ADD_MENU') return 'bg-indigo-50 border-indigo-100 text-indigo-700';
        return 'bg-slate-50 border-slate-100 text-slate-700';
    };

    const getActionLabel = (action: string) => {
        const a = action.toUpperCase();
        if (a === 'CANCEL_CONFIRMED') return 'DELETE ORDER DISETUJUI';
        if (a === 'CANCEL_REJECTED') return 'DELETE ORDER DITOLAK';
        return action.replace(/_/g, ' ');
    };

    if (!hasPermission('AUDIT_VIEW')) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10 text-center">
                <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mb-6 border-2 border-rose-100 shadow-xl shadow-rose-100/50">
                    <ShieldOff className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter uppercase">Akses Terbatas</h2>
                <p className="text-slate-500 max-w-md font-medium leading-relaxed">
                    Maaf, akun Anda tidak memiliki izin untuk melihat log audit sistem.
                    Silakan hubungi Administrator untuk mendapatkan akses.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/40">
            <div className="p-4 lg:p-10 max-w-7xl mx-auto space-y-8">

                {/* ── Hero Header ── */}
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-indigo-800 rounded-3xl p-8 lg:p-10 text-white shadow-2xl shadow-slate-300">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full -ml-12 -mb-12" />
                    <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <History className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Security & Monitoring</span>
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-black tracking-tight leading-none">Audit Trail</h1>
                            <p className="text-white/60 text-[11px] font-semibold mt-1">Monitoring keamanan real-time</p>
                            <div className="flex flex-wrap gap-3 mt-5">
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                    📋 {stats?.totalToday || 0} Aktivitas Hari Ini
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                    ⚠️ {stats?.criticalToday || 0} Kritis
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            {/* Business Day Toggle */}
                            <div 
                                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-1.5 hover:bg-white/20 transition-all cursor-pointer group/toggle" 
                                onClick={() => setIsBusinessDayMode(!isBusinessDayMode)}
                            >
                                <div className="flex flex-col items-start pr-2 border-r border-white/10">
                                    <span className="text-[7px] font-black text-white/40 uppercase tracking-widest leading-none">Logic Mode</span>
                                    <span className="text-[9px] font-black text-white uppercase italic tracking-tighter">
                                        {isBusinessDayMode ? 'Business Day' : 'Calendar'}
                                    </span>
                                </div>
                                <div className={`w-8 h-5 rounded-full p-1 transition-all duration-500 flex items-center ${isBusinessDayMode ? 'bg-emerald-500' : 'bg-white/20'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full shadow-lg transform transition-all duration-500 ${isBusinessDayMode ? 'translate-x-3' : 'translate-x-0'}`} />
                                </div>
                            </div>
                            
                            <button onClick={() => { fetchStats(); fetchLogs(); }}
                                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl font-black flex items-center justify-center gap-2 transition-all text-[11px] border border-white/20">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sync
                            </button>
                            {hasPermission('AUDIT_EXPORT') && (
                                <button className="bg-white text-slate-800 px-5 py-2.5 rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 text-[11px] hover:shadow-xl">
                                    <ArrowUpRight className="w-4 h-4" /> Export
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    { [
                        { label: 'Aktivitas Hari Ini', value: statsLoading ? '...' : (stats?.totalToday.toLocaleString() || '0'), icon: '📋', gradient: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-700' },
                        { label: 'Tindakan Kritis', value: statsLoading ? '...' : (stats?.criticalToday.toLocaleString() || '0'), icon: '⚠️', gradient: 'from-rose-500 to-rose-600', light: 'bg-rose-50', text: 'text-rose-700' },
                        { label: 'User Teraktif', value: statsLoading ? '...' : (stats?.topUser.user || '—'), icon: '👤', gradient: 'from-amber-500 to-orange-500', light: 'bg-amber-50', text: 'text-amber-700' },
                        { label: 'Security Status', value: 'Secure', icon: '🛡️', gradient: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-2xl p-4 lg:p-5 border border-slate-100 shadow-md hover:shadow-lg transition-all">
                            <div className="flex items-start justify-between mb-2">
                                <div className={`w-8 h-8 ${s.light} rounded-xl flex items-center justify-center text-base`}>{s.icon}</div>
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{s.label}</p>
                            <p className={`text-lg lg:text-xl font-black ${s.text} leading-tight truncate`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Advanced Filter Bar */}
                    <div className="p-4 lg:p-5 border-b border-slate-50 bg-slate-50/30">
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Cari user atau detail..."
                                    className="w-full pl-11 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all text-sm"
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="w-full sm:w-44 relative">
                                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                    <select
                                        className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none text-xs"
                                        value={actionFilter}
                                        onChange={(e) => setActionFilter(e.target.value)}
                                    >
                                        <option value="">Semua Aktivitas</option>
                                        <option value="START_SESSION">Start Session</option>
                                        <option value="STOP_SESSION">Stop Session</option>
                                        <option value="CANCEL_REQUESTED">Batal Pesanan (Minta)</option>
                                        <option value="CANCEL_CONFIRMED">DELETE ORDER DISETUJUI</option>
                                        <option value="CANCEL_REJECTED">DELETE ORDER DITOLAK</option>
                                         <option value="ADD_MENU">Tambah Menu</option>
                                         <option value="PRICE_CHANGE">Ubah Harga Menu</option>
                                        <option value="STOCK_ADJUSTMENT">Stok Manual</option>
                                        <option value="BILLIARD_PRICE_OVERRIDE">Ubah Harga Billiard</option>
                                        <option value="PAYMENT_COMPLETE">Payment Complete</option>
                                        <option value="VOID_TRANSACTION">Void Transaction</option>
                                        <option value="EXTEND_SESSION">Extend Session</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-indigo-500/20">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            className="bg-transparent text-[11px] font-bold text-slate-600 outline-none w-[100px]"
                                            value={dateRange.start.includes('T') ? dateRange.start.split('T')[0] : dateRange.start}
                                            onChange={(e) => {
                                                setDateRange({ ...dateRange, start: e.target.value });
                                                if (isBusinessDayMode) setIsBusinessDayMode(false);
                                            }}
                                        />
                                        <span className="text-slate-300">→</span>
                                        <input
                                            type="date"
                                            className="bg-transparent text-[11px] font-bold text-slate-600 outline-none w-[100px]"
                                            value={dateRange.end.includes('T') ? dateRange.end.split('T')[0] : dateRange.end}
                                            onChange={(e) => {
                                                setDateRange({ ...dateRange, end: e.target.value });
                                                if (isBusinessDayMode) setIsBusinessDayMode(false);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-20 lg:p-24 text-center">
                            <div className="w-10 lg:w-12 h-10 lg:h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="font-black text-indigo-600 uppercase tracking-widest text-[10px] lg:text-xs">Mensinkronisasi Aktivitas...</p>
                        </div>
                    ) : (
                        <div className="">
                            {/* Desktop Table View */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-left border-b border-slate-100">
                                            <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16 text-center italic">Act</th>
                                            <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</th>
                                            <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrator</th>
                                            <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail Informasi</th>
                                            <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Waktu</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-20 text-center">
                                                    <ShieldAlert className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                    <p className="text-slate-400 font-bold">Tidak ada log aktivitas sesuai kriteria</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            logs.map((log) => (
                                                <tr key={log.id} className="group hover:bg-slate-50/80 transition-all">
                                                    <td className="px-5 py-4">
                                                        <div className="w-9 h-9 mx-auto bg-white rounded-lg border border-slate-100 flex items-center justify-center font-bold shadow-sm">
                                                            {getActionIcon(log.action)}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-tighter ${getActionColor(log.action)} inline-block`}>
                                                            {getActionLabel(log.action)}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black text-slate-800">{log.user}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <p className="text-[11px] text-slate-600 font-bold leading-tight line-clamp-1 mb-1">{log.details}</p>
                                                        <div className="flex gap-2">
                                                            {log.tableId && (
                                                                <span className="text-[8px] font-black px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100">AREA #{log.tableId}</span>
                                                            )}
                                                            {log.invoiceNumber && (
                                                                <span className="text-[8px] font-black px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100 uppercase tracking-tighter">INV: {log.invoiceNumber}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-right whitespace-nowrap">
                                                        <span className="text-[10px] font-black text-slate-800 tracking-tight block">
                                                            {new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-slate-400">
                                                            {new Date(log.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="lg:hidden p-4 space-y-4">
                                {logs.length === 0 ? (
                                    <div className="py-20 text-center">
                                        <ShieldAlert className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold">Tidak ada log aktivitas sesuai kriteria</p>
                                    </div>
                                ) : (
                                    logs.map((log) => (
                                        <div key={log.id} className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                                                        {getActionIcon(log.action)}
                                                    </div>
                                                    <div>
                                                        <span className={`px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-tight ${getActionColor(log.action)}`}>
                                                            {getActionLabel(log.action)}
                                                        </span>
                                                        <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-slate-400">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(log.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} • {new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full">
                                                    <UserCircle className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-[11px] font-bold text-slate-700">{log.user}</span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-600 font-medium leading-relaxed mb-4">{log.details}</p>
                                            {(log.tableId || log.invoiceNumber) && (
                                                <div className="flex gap-2 pt-3 border-t border-slate-50">
                                                    {log.tableId && (
                                                        <span className="text-[9px] font-black px-2 py-1 bg-amber-50 text-amber-600 rounded-md border border-amber-100 uppercase tracking-widest">Table {log.tableId}</span>
                                                    )}
                                                    {log.invoiceNumber && (
                                                        <span className="text-[9px] font-black px-2 py-1 bg-blue-50 text-blue-600 rounded-md border border-blue-100 uppercase tracking-widest">#{log.invoiceNumber}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="p-4 lg:p-6 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between bg-slate-50/20 gap-4">
                        <p className="text-xs font-bold text-slate-400">
                            Menampilkan <span className="text-slate-900 font-black">{logs.length}</span> aktivitas per halaman
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all font-bold"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-1 px-4 text-sm">
                                <span className="font-black text-indigo-600">{page}</span>
                                <span className="text-slate-300 font-bold">/</span>
                                <span className="font-bold text-slate-500">{totalPages}</span>
                            </div>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all font-bold"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ title, value, subtitle, icon, color, loading }: { title: string, value: string, subtitle: string, icon: React.ReactNode, color: string, loading: boolean }) {
    const colors: any = {
        indigo: 'bg-indigo-600 shadow-indigo-100 ring-indigo-400',
        rose: 'bg-rose-500 shadow-rose-100 ring-rose-300',
        amber: 'bg-amber-500 shadow-amber-100 ring-amber-300',
        emerald: 'bg-emerald-500 shadow-emerald-100 ring-emerald-300',
    };

    return (
        <div className={`relative overflow-hidden rounded-2xl lg:rounded-[2rem] p-5 lg:p-6 text-white shadow-xl ${colors[color] || 'bg-slate-700'}`}>
            <div className="relative z-10">
                <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-xl bg-white/10 flex items-center justify-center mb-3 lg:mb-4 border border-white/20 backdrop-blur-md">
                    {icon}
                </div>
                {loading ? (
                    <div className="space-y-2">
                        <div className="h-2 w-16 bg-white/20 rounded animate-pulse" />
                        <div className="h-6 w-24 bg-white/20 rounded animate-pulse" />
                        <div className="h-2 w-32 bg-white/20 rounded animate-pulse" />
                    </div>
                ) : (
                    <>
                        <p className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-0.5 lg:mb-1">{title}</p>
                        <h4 className="text-xl lg:text-3xl font-black leading-none mb-1 tracking-tighter">{value}</h4>
                        <p className="text-[10px] lg:text-[11px] text-white/70 font-bold">{subtitle}</p>
                    </>
                )}
            </div>
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full ${colors[color].split(' ')[2]} blur-3xl opacity-30`} />
        </div>
    );
}
