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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                ...(actionFilter && { action: actionFilter }),
                ...(userSearch && { user: userSearch }),
                ...(dateRange.start && { start: dateRange.start }),
                ...(dateRange.end && { end: dateRange.end }),
            });
            const response = await axios.get(`${API_URL}/reports/audit-logs?${params.toString()}`);
            setLogs(response.data.items);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    }, [page, actionFilter, userSearch, dateRange]);

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const response = await axios.get(`${API_URL}/reports/audit-stats`);
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        // MQTT
        const mqttUnsub = subscribe('billiard/audit/update', () => {
            fetchStats();
            fetchLogs();
        });

        // WebSocket
        const onAuditUpdate = () => {
            fetchStats();
            fetchLogs();
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
        <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-10">
            <header className="mb-8 lg:mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <History className="w-8 lg:w-10 h-8 lg:h-10 text-indigo-600" />
                        Audit Trail
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm lg:text-base">Monitoring aktivitas sistem dan audit keamanan real-time.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => { fetchStats(); fetchLogs(); }}
                        className="flex-1 md:flex-none bg-white text-slate-700 border border-slate-200 px-4 lg:px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    {hasPermission('AUDIT_EXPORT') && (
                        <button className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-5 lg:px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100 text-sm">
                            <ArrowUpRight className="w-4 h-4" />
                            Export Audit
                        </button>
                    )}
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8 lg:mb-10">
                <KpiCard
                    title="Aktivitas Hari Ini"
                    value={stats?.totalToday.toLocaleString() || '0'}
                    subtitle="Total log terekam"
                    icon={<Activity className="w-5 h-5" />}
                    color="indigo"
                    loading={statsLoading}
                />
                <KpiCard
                    title="Tindakan Kritis"
                    value={stats?.criticalToday.toLocaleString() || '0'}
                    subtitle="Pembatalan & Perubahan"
                    icon={<AlertTriangle className="w-5 h-5" />}
                    color="rose"
                    loading={statsLoading}
                />
                <KpiCard
                    title="User Teraktif"
                    value={stats?.topUser.user || '—'}
                    subtitle={`${stats?.topUser.count || 0} aktivitas hari ini`}
                    icon={<UserCircle className="w-5 h-5" />}
                    color="amber"
                    loading={statsLoading}
                />
                <KpiCard
                    title="Database Health"
                    value="Secure"
                    subtitle="Integritas Log Terjamin"
                    icon={<Database className="w-5 h-5" />}
                    color="emerald"
                    loading={statsLoading}
                />
            </div>

            <div className="bg-white rounded-2xl lg:rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                {/* Advanced Filter Bar */}
                <div className="p-4 lg:p-8 border-b border-slate-50 bg-slate-50/30">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Cari admin atau detail..."
                                className="w-full pl-14 pr-6 py-3.5 bg-white rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-semibold text-slate-700 transition-all text-sm lg:text-base"
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="w-full sm:w-48 relative">
                                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <select
                                    className="w-full pl-11 pr-4 py-3.5 bg-white rounded-2xl border border-slate-200 font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none text-xs lg:text-sm"
                                    value={actionFilter}
                                    onChange={(e) => setActionFilter(e.target.value)}
                                >
                                    <option value="">Semua Aktivitas</option>
                                    <option value="START_SESSION">Start Session</option>
                                    <option value="STOP_SESSION">Stop Session</option>
                                    <option value="CANCEL_REQUESTED">Batal Pesanan (Minta)</option>
                                    <option value="CANCEL_CONFIRMED">DELETE ORDER DISETUJUI</option>
                                    <option value="CANCEL_REJECTED">DELETE ORDER DITOLAK</option>
                                    <option value="PRICE_CHANGE">Ubah Harga Menu</option>
                                    <option value="STOCK_ADJUSTMENT">Stok Manual</option>
                                    <option value="BILLIARD_PRICE_OVERRIDE">Ubah Harga Billiard</option>
                                    <option value="PAYMENT_COMPLETE">Payment Complete</option>
                                    <option value="VOID_TRANSACTION">Void Transaction</option>
                                    <option value="EXTEND_SESSION">Extend Session</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between sm:justify-start gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-3.5 group focus-within:ring-2 focus-within:ring-indigo-500/20">
                                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        className="bg-transparent text-[10px] lg:text-[11px] font-bold text-slate-600 outline-none w-[90px] lg:w-[110px]"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    />
                                    <span className="text-slate-300">→</span>
                                    <input
                                        type="date"
                                        className="bg-transparent text-[10px] lg:text-[11px] font-bold text-slate-600 outline-none w-[90px] lg:w-[110px]"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
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
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-20 text-center">Icon</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aktivitas</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin / User</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail & Object</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Waktu Terekam</th>
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
                                                <td className="p-6">
                                                    <div className="w-12 h-12 mx-auto bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        {getActionIcon(log.action)}
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-tight ${getActionColor(log.action)} inline-block`}>
                                                        {getActionLabel(log.action)}
                                                    </span>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                            <UserCircle className="w-4 h-4 text-slate-400" />
                                                        </div>
                                                        <span className="font-bold text-slate-700">{log.user}</span>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <p className="text-sm text-slate-600 font-medium max-w-md line-clamp-2 mb-2">{log.details}</p>
                                                    <div className="flex gap-2">
                                                        {log.tableId && (
                                                            <span className="text-[9px] font-black px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md border border-amber-100 shadow-sm">AREA #{log.tableId}</span>
                                                        )}
                                                        {log.invoiceNumber && (
                                                            <span className="text-[9px] font-black px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100 shadow-sm">INV: {log.invoiceNumber}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-6 text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-xs font-black text-slate-800 tracking-tight">
                                                            {new Date(log.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
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
