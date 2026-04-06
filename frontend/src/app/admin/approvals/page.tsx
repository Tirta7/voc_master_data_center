'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    ShieldCheck, Clock, CheckCircle, XCircle, RefreshCw,
    Banknote, Trash2, Lock, Package, FileEdit, Filter,
    Calendar, ChevronLeft, ChevronRight, Check, X, Zap,
    Info, User, Layers, ChevronDown, AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatRupiah as fmt } from '@/utils/formatUtils';
import { socket } from '@/lib/socket';

// ── Constants ─────────────────────────────────────────────────────────────────
const MODULE_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    EXPENSE:      { label: 'Expense',     color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-200', icon: <Banknote className="w-4 h-4" /> },
    WASTE:        { label: 'Limbah',      color: 'text-rose-700',   bg: 'bg-rose-50',    border: 'border-rose-200',   icon: <Trash2   className="w-4 h-4" /> },
    CLOSING:      { label: 'Closing',     color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200',  icon: <Lock     className="w-4 h-4" /> },
    STOCK_UPDATE: { label: 'Stok',        color: 'text-teal-700',   bg: 'bg-teal-50',    border: 'border-teal-200',   icon: <Package  className="w-4 h-4" /> },
    DATA_EDIT:    { label: 'Data Edit',   color: 'text-violet-700', bg: 'bg-violet-50',  border: 'border-violet-200', icon: <FileEdit className="w-4 h-4" /> },
};

function toLocalDT(d: Date) {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ── Mini components ───────────────────────────────────────────────────────────
function StepBadges({ req }: { req: any }) {
    return (
        <div className="flex items-center gap-1">
            {(req.requiredLevels as number[]).map((lvl, i) => {
                const done     = req.currentLevel > lvl || req.status === 'APPROVED';
                const active   = req.currentLevel === lvl && req.status === 'PENDING';
                const rejected = req.status === 'REJECTED' && req.currentLevel === lvl;
                return (
                    <React.Fragment key={i}>
                        {i > 0 && <div className={`h-px w-3 ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
                        <div title={`Lvl ${lvl}`} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border transition-all
                            ${done     ? 'bg-emerald-500 border-emerald-500 text-white' :
                              rejected ? 'bg-rose-500 border-rose-500 text-white' :
                              active   ? 'bg-white border-amber-400 text-amber-600 ring-2 ring-amber-100' :
                                         'bg-white border-slate-200 text-slate-300'}`}>
                            {done ? <Check className="w-2.5 h-2.5" /> : rejected ? <X className="w-2.5 h-2.5" /> : lvl}
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
}

function ValueDisplay({ req }: { req: any }) {
    const m = req.metadata || {};
    if (req.moduleType === 'EXPENSE')      return <span className="font-black text-slate-900">{fmt(m.amount || 0)}</span>;
    if (req.moduleType === 'WASTE') {
        return (
            <div className="flex flex-col items-end">
                <span className="font-extrabold text-[11px] text-rose-600">{fmt(m.valuation || 0)}</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{m.quantity ?? '-'} {m.unit || ''}</span>
            </div>
        );
    }
    if (req.moduleType === 'STOCK_UPDATE') return (
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${m.type === 'add' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {m.type === 'add' ? '+' : '-'}{m.quantity} {m.unit || ''}
        </span>
    );
    if (req.moduleType === 'CLOSING')      return (
        <span className={`font-black ${Number(m.discrepancy) === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {fmt(m.discrepancy || 0)}
        </span>
    );

    if (req.moduleType === 'DATA_EDIT') {
        const changes = m.changes || {};
        const keys = Object.keys(changes);
        const labels = m.fieldLabels || {};

        if (keys.length === 1) {
            const k = keys[0];
            const { old: ov, new: nv } = changes[k];
            const label = labels[k] || k;
            const isPrice = k.toLowerCase().includes('price') || k.toLowerCase().includes('cost');
            const isStock = k.toLowerCase().includes('stock') || k.toLowerCase().includes('quantity');
            
            const renderOld = isPrice ? fmt(ov) : (isStock ? Math.round(Number(ov)) : ov);
            const renderNew = isPrice ? fmt(nv) : (isStock ? Math.round(Number(nv)) : nv);

            return (
                <span className="font-extrabold text-indigo-700 text-[11px] tracking-tight">
                    {label}: {renderOld} → {renderNew}
                </span>
            );
        }

        if (keys.length > 1) {
            return <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">{keys.length} PERUBAHAN</span>;
        }

        // Fallback for older records or if no actual changes were found
        const p = m.payload || {};
        const entries = Object.entries(p).filter(([k,v]) => v !== null && typeof v !== 'object' && !['id','createdAt','updatedAt','deletedAt','sku'].includes(k));
        if (entries.length > 0) {
            return <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">{entries.length} DATA</span>;
        }
    }

    return <span className="text-slate-400 text-xs">—</span>;
}

function MetaCard({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
    return (
        <div className={`rounded-xl p-3 border shadow-sm ${highlight ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'}`}>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
            <p className="text-xs font-bold text-slate-800 break-words">{value}</p>
        </div>
    );
}

function MetadataDetail({ req }: { req: any }) {
    const m = req.metadata || {};
    const type = req.moduleType;

    if (type === 'EXPENSE') return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <MetaCard label="Nama Item" value={m.itemName || m.name || '—'} highlight />
            <MetaCard label="Jumlah" value={fmt(m.amount || 0)} highlight />
            <MetaCard label="Kategori" value={m.category || '—'} />
            <MetaCard label="Supplier / Toko" value={m.supplier || m.store || '—'} />
            <MetaCard label="Qty" value={m.quantity ? `${m.quantity} ${m.unit || ''}` : '—'} />
            <MetaCard label="Harga Satuan" value={m.pricePerUnit ? fmt(m.pricePerUnit) : '—'} />
            {m.reason && <div className="col-span-full bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-[8px] font-black uppercase tracking-widest text-amber-500 mb-0.5">Alasan</p>
                <p className="text-xs font-bold text-amber-800 italic">"{m.reason}"</p>
            </div>}
        </div>
    );

    if (type === 'WASTE') return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <MetaCard label="Item" value={m.itemName || m.name || '—'} highlight />
                <MetaCard label="Kerugian (Valuasi)" value={
                    <span className="text-rose-600 font-extrabold">{fmt(m.valuation || 0)}</span>
                } highlight />
                <MetaCard label="Jumlah Dibuang" value={`${m.quantity ?? '—'} ${m.unit || ''}`} />
                <MetaCard label="Tipe Limbah" value={m.wasteType || m.category || '—'} />
                <MetaCard label="Lokasi" value={m.location || '—'} />
            </div>
            {m.reason && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                    <p className="text-[8px] font-black uppercase tracking-widest text-rose-500 mb-0.5">Alasan Limbah</p>
                    <div className="flex items-start gap-2">
                        <Zap className="w-3 h-3 text-rose-400 mt-0.5" />
                        <p className="text-xs font-bold text-rose-800 italic">"{m.reason}"</p>
                    </div>
                </div>
            )}
        </div>
    );

    if (type === 'STOCK_UPDATE') return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <MetaCard label="Item" value={m.itemName || m.name || '—'} highlight />
            <MetaCard label="Tipe" value={
                <span className={`font-black ${m.type === 'add' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.type === 'add' ? '▲ Tambah Stok' : '▼ Kurangi Stok'}
                </span>
            } highlight />
            <MetaCard label="Jumlah" value={`${m.quantity ?? '—'} ${m.unit || ''}`} />
            <MetaCard label="Stok Sebelum" value={m.stockBefore != null ? `${m.stockBefore} ${m.unit || ''}` : '—'} />
            <MetaCard label="Stok Sesudah" value={m.stockAfter != null ? `${m.stockAfter} ${m.unit || ''}` : '—'} />
            <MetaCard label="Kategori" value={m.category || '—'} />
            {m.reason && <div className="col-span-full bg-teal-50 border border-teal-200 rounded-xl p-3">
                <p className="text-[8px] font-black uppercase tracking-widest text-teal-500 mb-0.5">Keterangan</p>
                <p className="text-xs font-bold text-teal-800 italic">"{m.reason}"</p>
            </div>}
        </div>
    );

    if (type === 'CLOSING') return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <MetaCard label="Shift" value={m.shiftId ? `Shift #${m.shiftId}` : (m.shift || '—')} highlight />
            <MetaCard label="Total Revenue" value={fmt(m.totalRevenue || m.revenue || 0)} highlight />
            <MetaCard label="Kas Fisik" value={fmt(m.cashAmount || m.actualCash || 0)} />
            <MetaCard label="Selisih" value={
                <span className={Number(m.discrepancy) === 0 ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>
                    {Number(m.discrepancy) === 0 ? '✓ Sesuai' : fmt(m.discrepancy || 0)}
                </span>
            } />
            <MetaCard label="Waiter" value={m.waiterName || m.cashier || '—'} />
            <MetaCard label="Jam Tutup" value={m.closedAt ? new Date(m.closedAt).toLocaleString('id-ID') : '—'} />
        </div>
    );

    if (type === 'DATA_EDIT') return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <MetaCard label="Jenis Entitas" value={
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">{m.entityType || '—'}</span>
                } highlight />
                <MetaCard label="Nama Item" value={m.itemName || m.name || '—'} highlight />
                {/* Financial Impact Analysis */}
                {(m.changes?.stockQuantity || m.changes?.stock) && m.price > 0 && (
                    <MetaCard label={m.entityType === 'INGREDIENT' ? 'Impact Valuasi' : 'Potensi Omzet'} value={
                        (() => {
                            const change = m.changes.stockQuantity || m.changes.stock;
                            const diff = Number(change.new) - Number(change.old);
                            const impact = diff * Number(m.price);
                            return (
                                <span className={`font-black ${impact >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {impact >= 0 ? '+' : ''}{fmt(impact)}
                                </span>
                            );
                        })()
                    } highlight />
                )}
            </div>

            {m.changes && Object.keys(m.changes).length > 0 && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-3 flex items-center gap-1.5">
                        <Zap className="w-3 h-3" /> Detil Perubahan Data
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.entries(m.changes as Record<string, {old: any, new: any}>).map(([k, v]) => {
                            const isP = k.toLowerCase().includes('price') || k.toLowerCase().includes('cost');
                            const isS = k.toLowerCase().includes('stock') || k.toLowerCase().includes('quantity');
                            const label = m.fieldLabels?.[k] || k;

                            const renderO = isP ? fmt(v.old) : (isS ? Math.round(Number(v.old)) : String(v.old));
                            const renderN = isP ? fmt(v.new) : (isS ? Math.round(Number(v.new)) : String(v.new));

                            return (
                                <div key={k} className="bg-white border border-indigo-100 rounded-xl p-3 flex flex-col gap-1 shadow-sm">
                                    <span className="text-[8px] font-black uppercase text-indigo-400 tracking-tighter">{label}</span>
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="text-[10px] font-medium text-slate-400 line-through shrink-0">{renderO}</span>
                                        <ChevronRight className="w-3 h-3 text-indigo-300" />
                                        <span className="text-xs font-black text-indigo-700 truncate">{renderN}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {m.payload && typeof m.payload === 'object' && (
                <div className="col-span-full mt-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Profil Lengkap (Data Baru)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {Object.entries(m.payload)
                            .filter(([, v], index, arr) => {
                                const k = (Object.keys(m.payload)[index]);
                                return typeof v !== 'object' && v !== null && !['id','createdAt','updatedAt','deletedAt','sku'].includes(k);
                            })
                            .map(([k, v]) => (
                                <MetaCard key={k} label={m.fieldLabels?.[k] || k} value={
                                    (k.toLowerCase().includes('price') || k.toLowerCase().includes('cost')) 
                                        ? fmt(v as number) 
                                        : ((k.toLowerCase().includes('stock') || k.toLowerCase().includes('quantity')) ? Math.round(Number(v)) : String(v))
                                } />
                            ))}
                    </div>
                </div>
            )}
        </div>
    );

    // Fallback — filter out nested objects to avoid [object Object]
    const safeEntries = Object.entries(m).filter(([, v]) => v !== null && typeof v !== 'object');
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {safeEntries.map(([k, v]) => (
                <MetaCard key={k} label={k} value={
                    typeof v === 'number' && (k.toLowerCase().includes('amount') || k.toLowerCase().includes('cash') || k.toLowerCase().includes('discrepancy') || k.toLowerCase().includes('revenue'))
                        ? fmt(v as number)
                        : String(v)
                } />
            ))}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ApprovalCenterPage() {
    const { user, hasPermission } = useAuth();
    const userLevel: number = user?.approvalLevel || 0;

    // Filters
    const [filterStatus, setFilterStatus] = useState<'PENDING'|'APPROVED'|'REJECTED'>('PENDING');
    const [filterModule, setFilterModule] = useState('');
    const [dateRange, setDateRange]       = useState({ start: '', end: '' });
    const [isBusinessDayMode, setIsBusinessDayMode] = useState(false);
    const [settings, setSettings]         = useState<any>(null);
    const [roles, setRoles]               = useState<any[]>([]);
    const [maxLevel, setMaxLevel]         = useState<number>(0);

    // Pagination
    const PAGE_SIZE = 15;
    const [page, setPage] = useState(1);

    // Data
    const [requests, setRequests]   = useState<any[]>([]);
    const [loading, setLoading]     = useState(true);
    const [stats, setStats]         = useState({ pending: 0, approved: 0, rejected: 0, myActions: 0 });

    // Detail expand + actions
    const [expandedId, setExpandedId]   = useState<number|null>(null);
    const [processingId, setProcessingId] = useState<number|null>(null);
    const [noteMap, setNoteMap]           = useState<Record<number,string>>({});

    const fetchRequests = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const params = new URLSearchParams({ status: filterStatus });
            if (filterModule)        params.set('moduleType', filterModule);
            if (dateRange.start)     params.set('startDate', new Date(dateRange.start).toISOString());
            if (dateRange.end)       params.set('endDate',   new Date(dateRange.end).toISOString());
            const res = await axios.get(`/approval?${params}`);
            setRequests(res.data);
        } catch {}
        finally { if (!silent) setLoading(false); }
    }, [filterStatus, filterModule, dateRange.start, dateRange.end]);

    const fetchStats = useCallback(async () => {
        try {
            const res = await axios.get('/approval/stats');
            setStats(res.data);
        } catch (err) {
            console.error('Failed to fetch stats', err);
        }
    }, [user?.id]);

    // Business Day mode sync (same pattern as Audit page)
    useEffect(() => {
        const fetchSettings = async () => {
            try { const res = await axios.get('/settings'); setSettings(res.data); }
            catch {}
        };
        const fetchRoles = async () => {
            try { 
                const [rNodes, rMax] = await Promise.all([
                    axios.get('/users/roles'),
                    axios.get('/users/roles/max-level')
                ]);
                setRoles(rNodes.data);
                setMaxLevel(rMax.data);
            }
            catch {}
        };
        fetchSettings();
        fetchRoles();
    }, []);

    const getRoleNameByLevel = (lvl: number) => {
        // Find role that has this level. If multiple, map and join or pick first.
        const matches = roles.filter(r => r.approvalLevel === lvl);
        if (matches.length === 0) return `Level ${lvl}`;
        return matches.map(m => m.name).join(' / ');
    };

    useEffect(() => {
        if (!settings) return;
        if (isBusinessDayMode) {
            const [h, m] = (settings.businessDayOffset || '04:00').split(':').map(Number);
            const now = new Date();
            const dStart = new Date(now);
            if (now.getHours() < h) dStart.setDate(dStart.getDate() - 1);
            dStart.setHours(h, m, 0, 0);
            const dEnd = new Date(dStart);
            dEnd.setDate(dEnd.getDate() + 1);
            dEnd.setMinutes(dEnd.getMinutes() - 1);
            setDateRange({ start: toLocalDT(dStart), end: toLocalDT(dEnd) });
        } else {
            const now = new Date();
            const y = now.getFullYear(), mo = String(now.getMonth()+1).padStart(2,'0'), d = String(now.getDate()).padStart(2,'0');
            setDateRange({ start: `${y}-${mo}-${d}T00:00:00`, end: `${y}-${mo}-${d}T23:59:59` });
        }
    }, [isBusinessDayMode, settings]);

    // Real-time Socket Sync
    useEffect(() => {
        const handleSync = () => {
            fetchRequests(true);
            fetchStats();
        };

        const handleConfigSync = async () => {
            // Refetch settings, roles and data 
            try {
                const [sRes, rNodes, rMax] = await Promise.all([
                    axios.get('/settings'),
                    axios.get('/users/roles'),
                    axios.get('/users/roles/max-level')
                ]);
                setSettings(sRes.data);
                setRoles(rNodes.data);
                setMaxLevel(rMax.data);
                fetchRequests(true);
                fetchStats();
            } catch (err) {
                console.error('Socket sync refetch failed', err);
            }
        };

        // Debounce sync to prevent request storm (429)
        let syncTimer: NodeJS.Timeout;
        const debouncedSync = (isConfig = false) => {
            clearTimeout(syncTimer);
            syncTimer = setTimeout(() => {
                if (isConfig) handleConfigSync();
                else handleSync();
            }, 500);
        };

        socket.on('loyalty_updated', (data: any) => {
            if (data.type === 'SETTINGS_UPDATE') debouncedSync(true);
        });
        socket.on('role_updated', () => debouncedSync(true));
        socket.on('approval_request_created', () => debouncedSync());
        socket.on('approval_request_updated', () => debouncedSync());

        return () => {
            clearTimeout(syncTimer);
            socket.off('loyalty_updated');
            socket.off('role_updated');
            socket.off('approval_request_created');
            socket.off('approval_request_updated');
        };
    }, [fetchRequests, fetchStats, setSettings, setRoles, setMaxLevel]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);
    useEffect(() => { fetchStats(); },   [fetchStats]);

    const handleApproval = async (requestId: number, action: 'APPROVE'|'REJECT') => {
        setProcessingId(requestId);
        try {
            await axios.post(`/approval/${requestId}/${action.toLowerCase()}`, { note: noteMap[requestId] || '' });
            setExpandedId(null);
            fetchRequests(true);
            fetchStats();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Gagal memproses permintaan');
        } finally { setProcessingId(null); }
    };

    const handleBypass = async (requestId: number) => {
        if (!confirm(`Bypass Otoritas Tertinggi (Level ${maxLevel}): Peringatan! Anda akan menyetujui permintaan ini secara langsung dan melompati alur verifikasi di bawah Anda. Lanjutkan?`)) return;
        setProcessingId(requestId);
        try {
            await axios.post(`/approval/${requestId}/bypass`, { note: noteMap[requestId] || '' });
            setExpandedId(null);
            fetchRequests(true);
            fetchStats();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Gagal memproses bypass');
        } finally { setProcessingId(null); }
    };

    if (!hasPermission('APPROVAL_VIEW')) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10 text-center">
            <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mb-6 border-2 border-rose-100 shadow-xl shadow-rose-100/50">
                <ShieldCheck className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter uppercase">Akses Terbatas</h2>
        </div>
    );

    const paged = requests.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
    const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/40">
            <div className="p-4 lg:p-10 max-w-7xl mx-auto space-y-8">

                {/* ── Hero Header ──────────────────────────────────────────── */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 rounded-3xl p-8 lg:p-10 text-white shadow-2xl shadow-indigo-200">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full -ml-12 -mb-12" />

                    <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <ShieldCheck className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Governance &amp; Control</span>
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-black tracking-tight leading-none">Approval Center</h1>
                            <p className="text-white/60 text-[11px] font-semibold mt-1">Verifikasi hirarkis untuk operasional &amp; finansial</p>
                            <div className="flex flex-wrap gap-3 mt-5">
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                    ⏳ {stats.pending} Menunggu
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                    ✅ {stats.approved} Disetujui
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                    🎯 {stats.myActions} Aksi Saya
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            {/* Business Day Toggle — same pattern as Audit page */}
                            <div
                                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-1.5 hover:bg-white/20 transition-all cursor-pointer"
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

                            <button onClick={() => { fetchRequests(); fetchStats(); }}
                                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl font-black flex items-center justify-center gap-2 transition-all text-[11px] border border-white/20">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sync
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── KPI Cards ─────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Menunggu',    value: stats.pending,   icon: '⏳', light: 'bg-amber-50',   text: 'text-amber-700'   },
                        { label: 'Disetujui',   value: stats.approved,  icon: '✅', light: 'bg-emerald-50', text: 'text-emerald-700' },
                        { label: 'Ditolak',     value: stats.rejected,  icon: '❌', light: 'bg-rose-50',    text: 'text-rose-700'    },
                        { label: 'Aksi Saya',   value: stats.myActions, icon: '🎯', light: 'bg-indigo-50',  text: 'text-indigo-700'  },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-2xl p-4 lg:p-5 border border-slate-100 shadow-md hover:shadow-lg transition-all">
                            <div className="flex items-start justify-between mb-2">
                                <div className={`w-8 h-8 ${s.light} rounded-xl flex items-center justify-center text-base`}>{s.icon}</div>
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{s.label}</p>
                            <p className={`text-xl lg:text-2xl font-black ${s.text} leading-tight`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* ── Table Card ────────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

                    {/* Filter Bar */}
                    <div className="p-4 lg:p-5 border-b border-slate-50 bg-slate-50/30">
                        <div className="flex flex-col lg:flex-row gap-3">
                            {/* Status tabs */}
                            <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-xl w-fit">
                                {(['PENDING','APPROVED','REJECTED'] as const).map(s => (
                                    <button key={s} onClick={() => { setFilterStatus(s); setPage(1); }}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                            filterStatus === s
                                                ? s === 'PENDING'  ? 'bg-amber-500 text-white shadow-md'
                                                : s === 'APPROVED' ? 'bg-emerald-600 text-white shadow-md'
                                                                   : 'bg-rose-600 text-white shadow-md'
                                                : 'text-slate-400 hover:text-slate-700'
                                        }`}>{s}</button>
                                ))}
                            </div>

                            {/* Module filter */}
                            <div className="relative w-44">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                <select value={filterModule} onChange={e => { setFilterModule(e.target.value); setPage(1); }}
                                    className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none text-xs">
                                    <option value="">Semua Modul</option>
                                    {Object.entries(MODULE_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Date range — same structure as Audit page */}
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <input type="datetime-local" value={dateRange.start}
                                    onChange={e => { setDateRange(p => ({...p, start: e.target.value})); setIsBusinessDayMode(false); }}
                                    className="bg-transparent text-[11px] font-bold text-slate-600 outline-none w-[135px]" />
                                <span className="text-slate-300">→</span>
                                <input type="datetime-local" value={dateRange.end}
                                    onChange={e => { setDateRange(p => ({...p, end: e.target.value})); setIsBusinessDayMode(false); }}
                                    className="bg-transparent text-[11px] font-bold text-slate-600 outline-none w-[135px]" />
                            </div>

                            <div className="ml-auto text-[11px] font-bold text-slate-400 self-center">
                                {requests.length} permintaan
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="p-16 text-center">
                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                            <p className="font-black text-indigo-600 uppercase tracking-widest text-xs">Memuat data...</p>
                        </div>
                    ) : (
                        <div>
                            {/* Desktop Table */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100 text-left">
                                            {['#','Modul','Deskripsi / Detail','Nilai','Requester','Progress','Tanggal',''].map((h,i) => (
                                                <th key={i} className={`px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest ${i===7?'text-right':''}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {paged.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="p-20 text-center">
                                                    <ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                    <p className="text-slate-400 font-bold">Tidak ada permintaan {filterStatus.toLowerCase()}</p>
                                                </td>
                                            </tr>
                                        ) : paged.map((req: any) => {
                                            const meta    = MODULE_META[req.moduleType] || MODULE_META['DATA_EDIT'];
                                            const isExp   = expandedId === req.id;
                                            const isMax   = userLevel === maxLevel && maxLevel > 0;
                                            // Super can be highest level, have the specific permission, OR be the 'PENGAWAS' role
                                            const isSuper = isMax || hasPermission('APPROVAL_OVERRIDE') || user?.role?.toUpperCase() === 'PENGAWAS';
                                            const canAct  = (isSuper || userLevel === (req.nextRequiredLevel || 0)) && filterStatus === 'PENDING';
                                            const isProc  = processingId === req.id;

                                            return (
                                                <React.Fragment key={req.id}>
                                                    <tr className={`group transition-all cursor-pointer ${isExp ? 'bg-indigo-50/40' : 'hover:bg-slate-50/80'}`}
                                                        onClick={() => setExpandedId(isExp ? null : req.id)}>

                                                        {/* ID */}
                                                        <td className="px-5 py-4">
                                                            <span className="text-[10px] font-black text-slate-300">#{req.id}</span>
                                                        </td>

                                                        {/* Module */}
                                                        <td className="px-5 py-4">
                                                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded-lg border ${meta.bg} ${meta.color} ${meta.border}`}>
                                                                {meta.icon} {meta.label}
                                                            </span>
                                                        </td>

                                                        {/* Description */}
                                                        <td className="px-5 py-4 max-w-[220px]">
                                                            <p className="text-sm font-bold text-slate-800 line-clamp-1">
                                                                {req.metadata?.itemName || req.metadata?.name || req.metadata?.description || req.moduleType}
                                                            </p>
                                                            {req.metadata?.entityType && (
                                                                <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">{req.metadata.entityType}</p>
                                                            )}
                                                            {req.metadata?.category && !req.metadata?.entityType && (
                                                                <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">{req.metadata.category}</p>
                                                            )}
                                                            {req.metadata?.reason && (
                                                                <p className="text-[9px] text-amber-600 italic mt-0.5 line-clamp-1">"{req.metadata.reason}"</p>
                                                            )}
                                                            {req.metadata?.supplier && (
                                                                <p className="text-[9px] text-indigo-500 font-bold mt-0.5">{req.metadata.supplier}</p>
                                                            )}
                                                        </td>

                                                        {/* Value */}
                                                        <td className="px-5 py-4 text-sm">
                                                            <ValueDisplay req={req} />
                                                        </td>

                                                        {/* Requester */}
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-700">{req.requestedBy?.name || 'System'}</span>
                                                            </div>
                                                        </td>

                                                        {/* Progress */}
                                                        <td className="px-5 py-4">
                                                            <StepBadges req={req} />
                                                        </td>

                                                        {/* Date */}
                                                        <td className="px-5 py-4 whitespace-nowrap">
                                                            <span className="text-[11px] font-black text-slate-700 block">
                                                                {new Date(req.createdAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-400">
                                                                {new Date(req.createdAt).toLocaleDateString('id-ID',{day:'2-digit',month:'short'})}
                                                            </span>
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                            {filterStatus === 'PENDING' ? (
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button disabled={!canAct || !!processingId}
                                                                        onClick={() => handleApproval(req.id,'REJECT')}
                                                                        className="px-3 py-1.5 rounded-lg text-[10px] font-black border border-rose-200 text-rose-500 hover:bg-rose-50 disabled:opacity-30 transition-all active:scale-95">
                                                                        Tolak
                                                                    </button>
                                                                    <button disabled={!canAct || !!processingId}
                                                                        onClick={() => handleApproval(req.id,'APPROVE')}
                                                                        className="px-3 py-1.5 rounded-lg text-[10px] font-black bg-slate-900 text-white hover:bg-black disabled:opacity-30 transition-all active:scale-95 flex items-center gap-1">
                                                                        {isProc ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                                        {canAct ? 'Setuju' : 'Terkunci'}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg
                                                                    ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                                    {req.status === 'APPROVED' ? '✓ Disetujui' : '✕ Ditolak'}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>

                                                    {/* Expanded Detail Row */}
                                                    {isExp && (
                                                        <tr>
                                                            <td colSpan={8} className="bg-indigo-50/30 border-b border-indigo-100/50 px-6 py-5">
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                                                    {/* Metadata detail */}
                                                                    <div className="md:col-span-2 space-y-4">
                                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                                                            <Info className="w-3 h-3" /> Detail {MODULE_META[req.moduleType]?.label || 'Metadata'}
                                                                        </p>
                                                                        <MetadataDetail req={req} />

                                                                        {/* History Timeline */}
                                                                        {req.history?.length > 0 && (
                                                                            <div className="mt-6">
                                                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5">
                                                                                    <Zap className="w-3 h-3" /> Riwayat Tindakan
                                                                                </p>
                                                                                <div className="relative space-y-0">
                                                                                    <div className="absolute left-[9px] top-2 bottom-2 w-px bg-slate-100" />
                                                                                    {req.history.map((h: any) => (
                                                                                        <div key={h.id} className="relative flex items-start gap-3 pb-3">
                                                                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10 mt-0.5 border-2
                                                                                                ${h.action === 'APPROVE' ? 'bg-emerald-500 border-emerald-500 text-white' :
                                                                                                  h.action === 'REJECT'  ? 'bg-rose-500 border-rose-500 text-white' :
                                                                                                  h.action === 'BYPASS'  ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-200' :
                                                                                                                            'bg-blue-500 border-blue-500 text-white'}`}>
                                                                                                {h.action === 'APPROVE' ? <Check className="w-2.5 h-2.5" /> : h.action === 'REJECT' ? <X className="w-2.5 h-2.5" /> : h.action === 'BYPASS' ? <Zap className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
                                                                                            </div>
                                                                                            <div className="flex-1 bg-white rounded-xl border border-slate-100 px-3 py-2 shadow-sm">
                                                                                                <div className="flex items-center justify-between flex-wrap gap-1">
                                                                                                    <span className="text-[11px] font-black text-slate-800">{h.user?.name || `User #${h.userId}`}</span>
                                                                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full
                                                                                                        ${h.action === 'APPROVE' ? 'bg-emerald-100 text-emerald-700' : h.action === 'REJECT' ? 'bg-rose-100 text-rose-700' : h.action === 'BYPASS' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                                                        {h.action === 'APPROVE' ? '✓ Disetujui' : h.action === 'REJECT' ? '✕ Ditolak' : h.action === 'BYPASS' ? '⚡ BYPASS' : h.action}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{getRoleNameByLevel(h.level)}</span>
                                                                                                    <span className="text-[9px] text-slate-200">|</span>
                                                                                                    <span className="text-[9px] text-slate-400">{new Date(h.createdAt).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                                                                                                </div>
                                                                                                {h.note && (
                                                                                                    <div className="mt-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">
                                                                                                        <p className="text-[9px] font-bold text-amber-700 italic">"{h.note}"</p>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Workflow + action */}
                                                                    <div className="flex flex-col gap-4">
                                                                        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                                                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                                                                                <Layers className="w-3 h-3" /> Approval Flow
                                                                            </p>
                                                                            <div className="relative space-y-3">
                                                                                <div className="absolute left-[9px] top-2 bottom-2 w-px bg-slate-100" />
                                                                                {req.requiredLevels?.map((lvl: number, i: number) => {
                                                                                    const done     = req.currentLevel > lvl || req.status === 'APPROVED';
                                                                                    const active   = req.currentLevel === lvl && req.status === 'PENDING';
                                                                                    const rejected = req.status === 'REJECTED' && active;
                                                                                    const hist     = req.history?.find((h: any) => h.level === lvl);
                                                                                    return (
                                                                                        <div key={i} className="relative flex items-start gap-3">
                                                                                            <div className={`w-5 h-5 rounded-full border-2 z-10 flex items-center justify-center shrink-0 text-[8px] font-black mt-0.5
                                                                                                ${done ? 'bg-emerald-500 border-emerald-500 text-white' : rejected ? 'bg-rose-500 border-rose-500 text-white' : active ? 'bg-white border-amber-400 text-amber-600 ring-2 ring-amber-100' : 'bg-white border-slate-200 text-slate-300'}`}>
                                                                                                {done ? <Check className="w-2.5 h-2.5" /> : rejected ? <X className="w-2.5 h-2.5" /> : lvl}
                                                                                            </div>
                                                                                            <div>
                                                                                                <p className={`text-[10px] font-black uppercase ${active ? 'text-slate-900 shadow-sm shadow-amber-500/10' : 'text-slate-400'}`}>
                                                                                                    {getRoleNameByLevel(lvl)}
                                                                                                </p>
                                                                                                {done && hist && <p className="text-[9px] text-emerald-600 font-bold">{hist.user?.name}</p>}
                                                                                                {active && !rejected && <p className="text-[9px] text-amber-500 font-bold animate-pulse">Menunggu…</p>}
                                                                                                {rejected && <p className="text-[9px] text-rose-500 font-bold">Ditolak</p>}
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>

                                                                        {filterStatus === 'PENDING' && (
                                                                            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col gap-3">
                                                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Catatan</p>
                                                                                <textarea rows={2} placeholder="Tambahkan catatan..."
                                                                                    value={noteMap[req.id] || ''}
                                                                                    onChange={e => setNoteMap(p => ({...p, [req.id]: e.target.value}))}
                                                                                    className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none resize-none focus:border-indigo-300" />
                                                                                  <div className="flex flex-col gap-2">
                                                                                    <div className="flex gap-2">
                                                                                        <button disabled={!canAct || !!processingId} onClick={() => handleApproval(req.id,'REJECT')}
                                                                                            className="flex-1 py-2.5 rounded-xl text-[10px] font-black border-2 border-rose-200 text-rose-500 hover:bg-rose-50 disabled:opacity-30 transition-all active:scale-95">Tolak</button>
                                                                                        <button disabled={!canAct || !!processingId} onClick={() => handleApproval(req.id,'APPROVE')}
                                                                                            className="flex-[2] py-2.5 rounded-xl text-[10px] font-black bg-slate-900 text-white hover:bg-black disabled:opacity-30 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5">
                                                                                            {isProc ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                                                                            {canAct ? 'Verifikasi & Setuju' : 'Terkunci'}
                                                                                        </button>
                                                                                    </div>
                                                                                    {isSuper && filterStatus === 'PENDING' && (
                                                                                        <button disabled={!!processingId} onClick={() => handleBypass(req.id)}
                                                                                            className="w-full py-2.5 rounded-xl text-[10px] font-black bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-indigo-200 hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-1.5">
                                                                                            <Zap className="w-3.5 h-3.5" /> Bypass &amp; Approve All (Shortcut)
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="lg:hidden p-4 space-y-3">
                                {paged.length === 0 ? (
                                    <div className="py-20 text-center">
                                        <ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold">Tidak ada data</p>
                                    </div>
                                ) : paged.map((req: any) => {
                                    const meta   = MODULE_META[req.moduleType] || MODULE_META['DATA_EDIT'];
                                    const isMax  = userLevel === maxLevel && maxLevel > 0;
                                    const isSuper = isMax || hasPermission('APPROVAL_OVERRIDE') || user?.role?.toUpperCase() === 'PENGAWAS';
                                    const canAct = (isSuper || userLevel === (req.nextRequiredLevel || 0)) && filterStatus === 'PENDING';
                                    const isProc = processingId === req.id;
                                    return (
                                        <div key={req.id} className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-sm">
                                            <div className="flex items-start justify-between mb-3">
                                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded-lg border ${meta.bg} ${meta.color} ${meta.border}`}>
                                                    {meta.icon} {meta.label}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    {new Date(req.createdAt).toLocaleDateString('id-ID',{day:'2-digit',month:'short'})}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-slate-800 mb-1">
                                                {req.metadata?.itemName || req.metadata?.name || req.metadata?.description || req.moduleType}
                                            </p>
                                            <div className="flex items-center gap-2 mb-3">
                                                <User className="w-3 h-3 text-slate-400" />
                                                <span className="text-xs font-bold text-slate-500">{req.requestedBy?.name || 'System'}</span>
                                                <span className="ml-auto text-sm"><ValueDisplay req={req} /></span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <StepBadges req={req} />
                                                {filterStatus === 'PENDING' && (
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleApproval(req.id,'REJECT')} disabled={!canAct || !!processingId}
                                                                className="flex-1 px-3 py-1.5 rounded-lg text-[10px] font-black border border-rose-200 text-rose-500 disabled:opacity-30 transition-all active:scale-95">Tolak</button>
                                                            <button onClick={() => handleApproval(req.id,'APPROVE')} disabled={!canAct || !!processingId}
                                                                className="flex-[2] px-3 py-1.5 rounded-lg text-[10px] font-black bg-slate-900 text-white flex items-center justify-center gap-1 disabled:opacity-30 transition-all active:scale-95">
                                                                {isProc ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                                {canAct ? 'Setuju' : 'Terkunci'}
                                                            </button>
                                                        </div>
                                                        {isSuper && (
                                                            <button onClick={() => handleBypass(req.id)} disabled={!!processingId}
                                                                className="w-full py-2 rounded-lg text-[10px] font-black bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg flex items-center justify-center gap-1 px-4">
                                                                <Zap className="w-3 h-3" /> Bypass & Approve All
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Pagination — same as Audit page */}
                    <div className="p-4 lg:p-6 border-t border-slate-50 flex flex-col sm:sm:row items-center justify-between bg-slate-50/20 gap-4">
                        <p className="text-xs font-bold text-slate-400">
                            Menampilkan <span className="text-slate-900 font-black">{paged.length}</span> dari <span className="text-slate-900 font-black">{requests.length}</span> permintaan
                        </p>
                        <div className="flex items-center gap-2">
                            <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p-1))}
                                className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-1 px-4 text-sm">
                                <span className="font-black text-indigo-600">{page}</span>
                                <span className="text-slate-300 font-bold">/</span>
                                <span className="font-bold text-slate-500">{totalPages}</span>
                            </div>
                            <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))}
                                className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
