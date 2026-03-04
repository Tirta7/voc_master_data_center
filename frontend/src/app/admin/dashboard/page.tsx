'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
    ShoppingBag, TrendingUp, DollarSign, AlertTriangle,
    BarChart3, Package, Users, Clock, Layers, Star,
    ArrowUp, ArrowDown, Minus, Eye, FileText, RefreshCw,
    CheckCircle, XCircle, Activity, LayoutDashboard, Lock
} from 'lucide-react';
import { useMqtt } from '@/context/MqttContext';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ─── Formatters ────────────────────────────────────────────────────────────────
const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtK = (n: number) => n >= 1_000_000 ? `Rp ${(n / 1_000_000).toFixed(1)}Jt` : n >= 1_000 ? `Rp ${(n / 1_000).toFixed(0)}K` : fmt(n);
const pct = (a: number, b: number) => b === 0 ? '0%' : `${((a / b) * 100).toFixed(1)}%`;
const now = () => new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// ─── Types ─────────────────────────────────────────────────────────────────────
interface SummaryData {
    totalOmzet: number;
    totalBilliard?: number;
    billiardOmzet?: number; // fallback for backend naming legacy
    totalCafe?: number;
    cafeOmzet?: number; // fallback for backend naming legacy
    topUpOmzet?: number;
    totalTopUp?: number; // fallback for backend naming legacy
    taxServiceRevenue?: number;
    transactionCount: number;
    unpaidAmount?: number;
    paymentMethods?: Record<string, number>;
}
interface Ingredient { id: number; name: string; stockQuantity: number; minStockLevel: number; unit: string; }
interface Finance { totalIn: number; totalOut: number; netProfit: number; }
interface ItemPerf { id: number; name: string; category: string; price: number; totalQty: number; totalRevenue: number; }
interface ItemsPerf {
    all: ItemPerf[]; topItems: ItemPerf[]; slowItems: ItemPerf[];
    totalMenuItems: number; activeItems: number; unsoldItems: number;
}
interface DetailedRevenue {
    hourly: { hour: number; billiard: number; cafe: number; topup: number; total: number; count: number }[];
    paymentMethods: Record<string, number>;
    summary: SummaryData;
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({ title, value, sub, icon, grad, ring }: {
    title: string; value: string; sub: string;
    icon: React.ReactNode; grad: string; ring: string;
}) {
    return (
        <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${grad}`}>
            <div className="relative z-10">
                <div className={`w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-3 border border-white/20`}>{icon}</div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">{title}</p>
                <p className="text-2xl font-black leading-none mb-1">{value}</p>
                <p className="text-[11px] text-white/70 font-semibold">{sub}</p>
            </div>
            <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full ${ring} blur-2xl opacity-40`} />
        </div>
    );
}

function SectionHeader({ icon, title, badge }: { icon: React.ReactNode; title: string; badge?: string }) {
    return (
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                <span className="text-indigo-500">{icon}</span> {title}
            </h2>
            {badge && <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{badge}</span>}
        </div>
    );
}

// stock bar
function StockBar({ qty, min }: { qty: number; min: number }) {
    const max = Math.max(qty, min * 2, 1);
    const widthPct = Math.min((qty / max) * 100, 100);
    const isOk = qty > min;
    const isCritical = qty <= min * 0.5;
    return (
        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
            <div className={`h-1.5 rounded-full transition-all ${isCritical ? 'bg-rose-500' : isOk ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${widthPct}%` }} />
        </div>
    );
}

// Performance bar (relative to max in the list)
function PerfBar({ value, max, color }: { value: number; max: number; color: string }) {
    const w = max === 0 ? 0 : Math.min((value / max) * 100, 100);
    return (
        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-0.5">
            <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${w}%` }} />
        </div>
    );
}

// Payment method badge colors
function methodColor(m: string): string {
    const s = m.toLowerCase();
    if (s === 'member' || s === 'membership') return 'bg-violet-500';
    if (s.includes('qris') || s.includes('qr')) return 'bg-purple-500';
    if (s.includes('cash') || s.includes('tunai')) return 'bg-emerald-500';
    if (s.includes('debit') || s.includes('bank') || s.includes('card')) return 'bg-sky-500';
    if (s.includes('transfer')) return 'bg-blue-500';
    if (s.includes('sho') || s.includes('pay')) return 'bg-orange-500';
    if (s.includes('ovo') || s.includes('gopay') || s.includes('dana') || s.includes('linkaja')) return 'bg-indigo-500';
    return 'bg-slate-500';
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
    const { hasPermission } = useAuth();
    const router = useRouter();
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [stock, setStock] = useState<Ingredient[]>([]);
    const [allStock, setAllStock] = useState<Ingredient[]>([]);
    const [finance, setFinance] = useState<Finance | null>(null);
    const [itemsPerf, setItemsPerf] = useState<ItemsPerf | null>(null);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [detailedRevenue, setDetailedRevenue] = useState<DetailedRevenue | null>(null);

    // Filter states
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}T00:00`;
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        d.setHours(23, 59, 0, 0);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}T23:59`;
    });

    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [tab, setTab] = useState<'overview' | 'items' | 'stock' | 'finance' | 'hourly'>('overview');
    const [stockView, setStockView] = useState<'critical' | 'all'>('critical');
    const printRef = useRef<HTMLDivElement>(null);

    const { subscribe } = useMqtt();

    const fetchAll = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const [s, cs, allS, fin, perf, exp, set, det] = await Promise.all([
                axios.get(`${API_URL}/reports/summary/daily`, config),
                axios.get(`${API_URL}/reports/inventory/health`, config),
                axios.get(`${API_URL}/inventory/ingredients`, config),
                axios.get(`${API_URL}/finance/profit?start=${startDate}&end=${endDate}`, config),
                axios.get(`${API_URL}/reports/items-performance`, config),
                axios.get(`${API_URL}/finance/expenses`, config),
                axios.get(`${API_URL}/settings`, config),
                axios.get(`${API_URL}/reports/detailed?start=${startDate}&end=${endDate}`, config),
            ]);
            setSummary(s.data);
            setStock(cs.data);
            setAllStock(allS.data);
            setFinance(fin.data);
            setItemsPerf(perf.data);
            setExpenses(exp.data || []);
            setSettings(set.data);
            setDetailedRevenue(det.data);
        } catch (e) { console.error(e); }
        finally {
            if (!silent) setLoading(false);
            setInitialLoading(false); // always clear initial loading
        }
    };

    useEffect(() => {
        fetchAll();

        const handleUpdate = () => fetchAll(true); // silent=true: no spinner on background MQTT refresh

        // MQTT Listeners for real-time dashboard refresh
        const unsubs = [
            subscribe('billiard/tables/update', handleUpdate),
            subscribe('billiard/order/update', handleUpdate),
            subscribe('billiard/finance/transaction', handleUpdate),
            subscribe('billiard/inventory/update', handleUpdate),
        ];

        return () => unsubs.forEach(u => u());
    }, [subscribe, startDate, endDate]);

    const handlePrint = () => {
        window.open(`/admin/dashboard/report?start=${startDate}&end=${endDate}`, '_blank');
    };

    if (initialLoading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500 font-semibold text-sm animate-pulse">Memuat data dashboard...</p>
            </div>
        </div>
    );

    // Use summary from detailedRevenue if available (it follows the date range)
    const activeSummary = detailedRevenue?.summary || summary;
    const totalRevenue = Number(activeSummary?.totalOmzet || 0);

    const activeBilliard = Number(activeSummary?.totalBilliard ?? activeSummary?.billiardOmzet ?? 0);
    const activeCafe = Number(activeSummary?.totalCafe ?? activeSummary?.cafeOmzet ?? 0);
    const activeTopup = Number(activeSummary?.totalTopUp ?? activeSummary?.topUpOmzet ?? 0);
    const activeTaxService = Number(activeSummary?.taxServiceRevenue ?? 0);

    const billiardPct = pct(activeBilliard, totalRevenue);
    const cafePct = pct(activeCafe, totalRevenue);
    const topupPct = pct(activeTopup, totalRevenue);
    const taxServicePct = pct(activeTaxService, totalRevenue);
    const criticalCount = stock.length;
    const maxItemQty = Math.max(...(itemsPerf?.topItems || []).map(i => i.totalQty), 1);
    const maxItemRev = Math.max(...(itemsPerf?.topItems || []).map(i => i.totalRevenue), 1);

    const payMethodsRaw = activeSummary?.paymentMethods || detailedRevenue?.paymentMethods || {};
    // Separate cash methods (real income) from member balance (non-cash)
    const cashPayMethods = Object.entries(payMethodsRaw)
        .filter(([m]) => !['MEMBER', 'MEMBERSHIP'].includes(m.toUpperCase()))
        .sort((a, b) => (b[1] as number) - (a[1] as number));
    const memberPayMethods = Object.entries(payMethodsRaw)
        .filter(([m]) => ['MEMBER', 'MEMBERSHIP'].includes(m.toUpperCase()))
        .sort((a, b) => (b[1] as number) - (a[1] as number));
    const payMethods = [...cashPayMethods, ...memberPayMethods];
    const totalCashPaid = cashPayMethods.reduce((s: number, [, v]: any) => s + Number(v), 0);
    const totalMemberPaid = memberPayMethods.reduce((s: number, [, v]: any) => s + Number(v), 0);
    const totalPaid = totalCashPaid + totalMemberPaid;

    const expenseTotal = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const todayExp = expenses
        .filter((e: any) => {
            const d = new Date(e.date || e.createdAt);
            const t = new Date(); t.setHours(0, 0, 0, 0);
            return d >= t;
        })
        .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

    // grouped by category
    const expByCategory: Record<string, number> = {};
    expenses.forEach((e: any) => {
        expByCategory[e.category || 'Lain-lain'] = (expByCategory[e.category || 'Lain-lain'] || 0) + Number(e.amount || 0);
    });

    const tabs = [
        { id: 'overview', label: '📊 Overview' },
        ...(hasPermission('DASHBOARD_CHART_VIEW') ? [{ id: 'hourly', label: '🕒 Hourly Revenue' } as const] : []),
        { id: 'items', label: '🍽️ Menu Performance' },
        { id: 'stock', label: '📦 Inventori' },
        { id: 'finance', label: '💰 Keuangan' },
    ] as const;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* ── Top bar ── */}
            {/* Hero Header */}
            <div className="max-w-7xl mx-auto px-6 py-6 pt-8 pb-0">
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 rounded-3xl p-8 lg:p-10 text-white shadow-2xl shadow-indigo-200 w-full mb-4">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12" />
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                                </div>
                                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Owner Dashboard</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight flex items-center gap-3">
                                Ringkasan Operasional
                            </h1>
                            <p className="text-white/60 mt-1.5 font-semibold text-sm">{now()} · {activeSummary?.transactionCount || 0} transaksi dalam filter</p>
                        </div>

                        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-3 py-2 w-full sm:w-auto overflow-hidden">
                                <input
                                    type="datetime-local"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-transparent text-[10px] md:text-xs font-bold text-white outline-none w-[130px] md:w-[140px] [&::-webkit-calendar-picker-indicator]:filter-white focus:outline-none"
                                />
                                <span className="text-white/50 text-xs">→</span>
                                <input
                                    type="datetime-local"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-transparent text-[10px] md:text-xs font-bold text-white outline-none w-[130px] md:w-[140px] [&::-webkit-calendar-picker-indicator]:filter-white focus:outline-none"
                                />
                            </div>

                            <button onClick={() => fetchAll()} title="Apply Filter" className="flex items-center justify-center p-3 sm:py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl font-bold transition-all shadow-md active:scale-95 w-full sm:w-auto">
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            {hasPermission('REPORT_EXPORT') && (
                                <button onClick={handlePrint} className="flex flex-1 sm:flex-none justify-center items-center gap-2 bg-white text-indigo-600 px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl font-black transition-all shadow-xl active:scale-95 text-sm hover:bg-indigo-50 w-full sm:w-auto">
                                    <FileText className="w-5 h-5" /> Export PDF
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8" ref={printRef}>

                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {hasPermission('DASHBOARD_STATS_VIEW') ? (
                        <>
                            <KpiCard title="Total Omzet (Periode)" value={fmtK(totalRevenue)}
                                sub={`${activeSummary?.transactionCount || 0} Transaksi`}
                                icon={<DollarSign className="w-5 h-5" />}
                                grad="bg-gradient-to-br from-indigo-600 to-violet-600" ring="bg-violet-400" />
                            <KpiCard title="Laba Bersih (Est.)" value={fmtK(finance?.netProfit || 0)}
                                sub={`Biaya: ${fmtK(finance?.totalOut || 0)}`}
                                icon={<TrendingUp className="w-5 h-5" />}
                                grad="bg-gradient-to-br from-emerald-500 to-teal-600" ring="bg-emerald-300" />
                            <KpiCard title="Piutang Belum Lunas" value={fmtK(Number(summary?.unpaidAmount || 0))}
                                sub="Perlu ditagih"
                                icon={<AlertTriangle className="w-5 h-5" />}
                                grad="bg-gradient-to-br from-rose-500 to-pink-600" ring="bg-rose-300" />
                        </>
                    ) : (
                        <div className="col-span-1 sm:col-span-2 lg:col-span-3 bg-white/50 border border-slate-200 border-dashed rounded-2xl flex items-center justify-center p-10 text-slate-400 font-bold italic text-sm">
                            <Lock className="w-4 h-4 mr-2" /> Detail Finansial Terbatas
                        </div>
                    )}
                    <KpiCard title="Stok Kritis" value={`${criticalCount} Item`}
                        sub={`${allStock.length} Total bahan`}
                        icon={<Package className="w-5 h-5" />}
                        grad={criticalCount > 0 ? "bg-gradient-to-br from-amber-500 to-orange-500" : "bg-gradient-to-br from-slate-500 to-slate-600"}
                        ring="bg-amber-300" />
                </div>

                {/* ── Revenue Breakdown ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Billiard vs Cafe split */}
                    {hasPermission('DASHBOARD_CHART_VIEW') && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <SectionHeader icon={<BarChart3 className="w-4 h-4" />} title="Sumber Pendapatan" />
                            <div className="space-y-4 mt-2">
                                {[
                                    { label: 'Billiard', amount: activeBilliard, pctStr: billiardPct, color: 'bg-indigo-500' },
                                    { label: 'Café / F&B', amount: activeCafe, pctStr: cafePct, color: 'bg-amber-400' },
                                    { label: 'Top-up Member', amount: activeTopup, pctStr: topupPct, color: 'bg-emerald-400' },
                                    { label: 'Taxes & Service', amount: activeTaxService, pctStr: taxServicePct, color: 'bg-slate-400' },
                                ].map(({ label, amount, pctStr, color }) => (
                                    <div key={label}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="text-sm font-bold text-slate-700">{label}</span>
                                            <div className="text-right">
                                                <span className="text-sm font-black text-slate-800">{fmtK(amount)}</span>
                                                <span className="text-[10px] text-slate-400 ml-1.5">{pctStr}</span>
                                            </div>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full">
                                            <div className={`h-2 rounded-full ${color}`} style={{ width: pctStr }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Quick stats */}
                            <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Avg/Transaksi', value: activeSummary?.transactionCount ? fmtK(totalRevenue / activeSummary.transactionCount) : '—' },
                                    { label: 'Total Masuk', value: fmtK(finance?.totalIn || 0) },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                                        <p className="text-sm font-black text-slate-800">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Payment methods */}
                    {hasPermission('DASHBOARD_STATS_VIEW') && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <SectionHeader icon={<Activity className="w-4 h-4" />} title="Metode Pembayaran" />
                            {payMethods.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">Belum ada pembayaran hari ini</div>
                            ) : (
                                <div className="space-y-3">
                                    {cashPayMethods.length > 0 && (
                                        <>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Kas Fisik Diterima</p>
                                            {cashPayMethods.map(([method, amount]) => (
                                                <div key={method} className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${methodColor(method)}`} />
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-baseline">
                                                            <span className="text-xs font-bold text-slate-700 uppercase">{method}</span>
                                                            <span className="text-xs font-black text-slate-800">{fmtK(amount)}</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1">
                                                            <div className={`h-1.5 rounded-full ${methodColor(method)}`} style={{ width: pct(amount, totalCashPaid) }} />
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 w-10 text-right">{pct(amount, totalCashPaid)}</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {memberPayMethods.length > 0 && (
                                        <>
                                            {cashPayMethods.length > 0 && <div className="border-t border-slate-100 pt-2 mt-1" />}
                                            <p className="text-[8px] font-black text-violet-400 uppercase tracking-widest mb-1">Saldo Member (non-kas)</p>
                                            {memberPayMethods.map(([method, amount]) => (
                                                <div key={method} className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-violet-400" />
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-baseline">
                                                            <span className="text-xs font-bold text-violet-700 uppercase">💜 {method === 'MEMBER' ? 'MEMBERSHIP' : method}</span>
                                                            <span className="text-xs font-black text-violet-700">{fmtK(amount)}</span>
                                                        </div>
                                                        <p className="text-[8px] text-violet-400 mt-0.5">Dipotong dari saldo member · bukan kas fisik</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase">Total Kas Diterima</span>
                                        <span className="text-sm font-black text-emerald-700">{fmtK(totalCashPaid)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quick actions */}
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-4">Akses Cepat</p>
                            <div className="space-y-2.5">
                                {[
                                    { label: '📒 Buku Kas', path: '/admin/finance/ledger' },
                                    { label: '💸 Catat Pengeluaran', path: '/admin/finance/expenses' },
                                    { label: '📦 Inventori Bahan', path: '/admin/inventory' },
                                    { label: '⚙️ Pengaturan', path: '/admin/settings' },
                                    { label: '🔒 Tutup Toko', path: '/admin/closing', red: true },
                                ].map(({ label, path, red }) => (
                                    <button key={path} onClick={() => router.push(path)}
                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${red ? 'bg-rose-500/80 hover:bg-rose-500' : 'bg-white/10 hover:bg-white/20 border border-white/10'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
                    </div>
                </div>

                {/* ── Tab Panel ── */}
                <div>
                    {/* Tabs */}
                    <div className="flex gap-2 mb-5 overflow-x-auto whitespace-nowrap scrollbar-hide pb-1">
                        {tabs.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${tab === t.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Hourly Revenue Tab ── */}
                    {tab === 'hourly' && detailedRevenue && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <SectionHeader icon={<Clock className="w-4 h-4" />} title="Breakdown Pendapatan per Jam" badge="Detail Waktu" />
                                <div className="space-y-1.5 mt-4">
                                    <div className="grid grid-cols-6 gap-2 px-4 py-2 bg-slate-50 rounded-lg mb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        <div className="col-span-1 text-right">Billiard</div>
                                        <div className="col-span-1 text-right">Cafe</div>
                                        <div className="col-span-1 text-right">Topup</div>
                                        <div className="col-span-2 text-right">Total</div>
                                    </div>
                                    {detailedRevenue.hourly.map((h) => (
                                        <div key={h.hour} className={`grid grid-cols-6 gap-2 px-4 py-3 rounded-xl border transition-all ${h.total > 0 ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-50/50 border-transparent opacity-40'}`}>
                                            <div className="col-span-1 flex items-center gap-2">
                                                <span className={`w-8 text-center py-1 rounded-lg text-[11px] font-black ${h.total > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                    {h.hour.toString().padStart(2, '0')}
                                                </span>
                                            </div>
                                            <div className="col-span-1 text-right">
                                                <p className="text-xs font-bold text-slate-700">{h.billiard > 0 ? fmt(h.billiard) : '—'}</p>
                                            </div>
                                            <div className="col-span-1 text-right">
                                                <p className="text-xs font-bold text-slate-700">{h.cafe > 0 ? fmt(h.cafe) : '—'}</p>
                                            </div>
                                            <div className="col-span-1 text-right">
                                                <p className="text-xs font-bold text-slate-700">{h.topup > 0 ? fmt(h.topup) : '—'}</p>
                                            </div>
                                            <div className="col-span-2 text-right">
                                                <p className="text-sm font-black text-indigo-600">{h.total > 0 ? fmtK(h.total) : '—'}</p>
                                            </div>
                                            {h.total > 0 && (
                                                <div className="col-span-6 mt-3">
                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full flex overflow-hidden">
                                                        <div className="bg-indigo-500 h-full transition-all" style={{ width: pct(h.billiard, h.total) }} title="Billiard" />
                                                        <div className="bg-amber-400 h-full transition-all" style={{ width: pct(h.cafe, h.total) }} title="Cafe" />
                                                        <div className="bg-emerald-400 h-full transition-all" style={{ width: pct(h.topup, h.total) }} title="Topup" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Overview Tab ── */}
                    {tab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top sellers preview */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <SectionHeader icon={<Star className="w-4 h-4" />} title="Top Menu (30 Hari)" badge="Terlaris" />
                                {(itemsPerf?.topItems || []).length === 0 ? (
                                    <p className="text-slate-400 text-sm text-center py-6">Belum ada data penjualan</p>
                                ) : (
                                    <div className="space-y-3">
                                        {(itemsPerf?.topItems || []).slice(0, 5).map((item, i) => (
                                            <div key={item.id} className="flex items-center gap-3">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white ${['bg-amber-400', 'bg-slate-400', 'bg-orange-400', 'bg-indigo-400', 'bg-violet-400'][i] || 'bg-slate-300'}`}>{i + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline">
                                                        <span className="text-xs font-bold text-slate-800 truncate">{item.name}</span>
                                                        <span className="text-xs font-black text-indigo-600 ml-2 flex-shrink-0">{item.totalQty}×</span>
                                                    </div>
                                                    <PerfBar value={item.totalQty} max={maxItemQty} color="bg-indigo-400" />
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-bold w-14 text-right">{fmtK(item.totalRevenue)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Critical stock preview */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <SectionHeader icon={<AlertTriangle className="w-4 h-4" />} title="Stok Kritis" />
                                    {criticalCount > 0 && (
                                        <span className="bg-rose-50 text-rose-600 text-[10px] font-black px-2.5 py-1 rounded-full">{criticalCount} kritis</span>
                                    )}
                                </div>
                                {criticalCount === 0 ? (
                                    <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-4">
                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                        <p className="text-sm font-bold text-emerald-700">Semua stok aman ✓</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {stock.slice(0, 5).map(ing => (
                                            <div key={ing.id} className="flex items-center justify-between bg-rose-50 rounded-xl px-4 py-3">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">{ing.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">Min: {ing.minStockLevel} {ing.unit}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-rose-600">{ing.stockQuantity} <span className="text-xs font-medium">{ing.unit}</span></p>
                                                    <p className="text-[9px] text-rose-400">Sisa {pct(ing.stockQuantity, ing.minStockLevel)} min</p>
                                                </div>
                                            </div>
                                        ))}
                                        {stock.length > 5 && (
                                            <button onClick={() => setTab('stock')} className="w-full text-xs text-indigo-600 font-bold py-2 text-center hover:underline">
                                                +{stock.length - 5} lagi →
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Menu Performance Tab ── */}
                    {tab === 'items' && itemsPerf && (
                        <div className="space-y-6">
                            {/* Summary chips */}
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: 'Total Menu', value: itemsPerf.totalMenuItems, color: 'text-slate-800', bg: 'bg-white', border: 'border-slate-200' },
                                    { label: 'Menu Aktif (30hr)', value: itemsPerf.activeItems, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                                    { label: 'Tidak Terjual', value: itemsPerf.unsoldItems, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
                                ].map(({ label, value, color, bg, border }) => (
                                    <div key={label} className={`${bg} border ${border} rounded-2xl p-5 text-center shadow-sm`}>
                                        <p className="text-3xl font-black mb-1 ${color}">{value}</p>
                                        <p className={`text-xs font-bold ${color} opacity-70`}>{label}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Top 8 terlaris */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                    <SectionHeader icon={<Star className="w-4 h-4" />} title="🏆 Menu Terlaris (30 Hari)" badge={`Top ${itemsPerf.topItems.length}`} />
                                    <div className="space-y-3">
                                        {itemsPerf.topItems.map((item, i) => (
                                            <div key={item.id} className="flex items-start gap-3 group">
                                                <div className={`w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-[11px] font-black text-white ${[
                                                    'bg-yellow-400', 'bg-slate-400', 'bg-orange-400', 'bg-indigo-400',
                                                    'bg-violet-400', 'bg-sky-400', 'bg-rose-400', 'bg-teal-400'
                                                ][i]}`}>{i + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline gap-2 mb-0.5">
                                                        <span className="text-xs font-bold text-slate-800 truncate">{item.name}</span>
                                                        <span className="text-[10px] text-slate-400 flex-shrink-0">{item.category}</span>
                                                    </div>
                                                    <div className="flex gap-4 text-[10px] text-slate-500 mb-1">
                                                        <span className="text-indigo-600 font-black">{item.totalQty}× terjual</span>
                                                        <span className="font-bold text-slate-600">{fmtK(item.totalRevenue)}</span>
                                                    </div>
                                                    <PerfBar value={item.totalQty} max={maxItemQty} color="bg-gradient-to-r from-indigo-400 to-violet-400" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Slow movers */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                    <SectionHeader icon={<ArrowDown className="w-4 h-4" />} title="⚠️ Menu Kurang Laku / Tidak Terjual" />
                                    {itemsPerf.slowItems.length === 0 ? (
                                        <p className="text-slate-400 text-sm text-center py-8">Semua menu terjual dalam 30 hari terakhir</p>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {itemsPerf.slowItems.map((item) => (
                                                <div key={item.id} className={`flex items-center justify-between px-4 py-3 rounded-xl ${item.totalQty === 0 ? 'bg-rose-50 border border-rose-100' : 'bg-amber-50 border border-amber-100'}`}>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800">{item.name}</p>
                                                        <p className="text-[9px] text-slate-400 mt-0.5">{item.category} · Rp {item.price.toLocaleString('id-ID')}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        {item.totalQty === 0 ? (
                                                            <span className="inline-flex items-center gap-1 text-rose-600 text-[10px] font-black bg-rose-100 px-2 py-0.5 rounded-full">
                                                                <XCircle className="w-3 h-3" /> Belum Terjual
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-700 text-xs font-black">{item.totalQty}×</span>
                                                        )}
                                                        <p className="text-[10px] text-slate-400 mt-0.5">{fmtK(item.totalRevenue)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* All items ranked table */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <SectionHeader icon={<Layers className="w-4 h-4" />} title="Semua Menu — Ranking Penjualan 30 Hari" badge={`${itemsPerf.all.length} Item`} />
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100">
                                                {['#', 'Nama Menu', 'Kategori', 'Harga', 'Qty Terjual', 'Revenue', 'Tren'].map((h, i) => (
                                                    <th key={h} className={`py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest ${i >= 3 ? 'text-right' : 'text-left'} px-2`}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itemsPerf.all.map((item, i) => (
                                                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                    <td className="py-2 px-2 text-slate-400 font-bold">{i + 1}</td>
                                                    <td className="py-2 px-2 font-bold text-slate-800">{item.name}</td>
                                                    <td className="py-2 px-2 text-slate-500">{item.category || '—'}</td>
                                                    <td className="py-2 px-2 text-right text-slate-600">{fmt(item.price)}</td>
                                                    <td className="py-2 px-2 text-right font-black text-indigo-600">{item.totalQty > 0 ? `${item.totalQty}×` : <span className="text-rose-400">—</span>}</td>
                                                    <td className="py-2 px-2 text-right font-bold text-slate-700">{item.totalRevenue > 0 ? fmtK(item.totalRevenue) : '—'}</td>
                                                    <td className="py-2 px-2 text-right">
                                                        <div className="flex items-center justify-end">
                                                            <div className="w-16 h-1 bg-slate-100 rounded-full">
                                                                <div className={`h-1 rounded-full ${item.totalQty === 0 ? 'bg-slate-200' : 'bg-emerald-400'}`}
                                                                    style={{ width: `${Math.min((item.totalQty / maxItemQty) * 100, 100)}%` }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Stock / Inventori Tab ── */}
                    {tab === 'stock' && (
                        <div className="space-y-5">
                            {/* Toggle critical / all */}
                            <div className="flex gap-2">
                                {(['critical', 'all'] as const).map(v => (
                                    <button key={v} onClick={() => setStockView(v)}
                                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${stockView === v ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}>
                                        {v === 'critical' ? `🔴 Stok Kritis (${stock.length})` : `📦 Semua Bahan (${allStock.length})`}
                                    </button>
                                ))}
                            </div>

                            {stockView === 'critical' && (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                    <SectionHeader icon={<AlertTriangle className="w-4 h-4" />} title="Bahan dengan Stok Kritis" badge={`${stock.length} Item`} />
                                    {stock.length === 0 ? (
                                        <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-5">
                                            <CheckCircle className="w-6 h-6 text-emerald-500" />
                                            <div>
                                                <p className="font-bold text-emerald-800">Semua stok dalam kondisi aman</p>
                                                <p className="text-xs text-emerald-600 mt-0.5">Tidak ada bahan di bawah minimum stok</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {stock.map(ing => (
                                                <div key={ing.id} className="flex items-center justify-between bg-rose-50 border border-rose-100 rounded-xl p-4">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-slate-800">{ing.name}</p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">Min. stok: {ing.minStockLevel} {ing.unit}</p>
                                                        <StockBar qty={ing.stockQuantity} min={ing.minStockLevel} />
                                                    </div>
                                                    <div className="text-right ml-4">
                                                        <p className="text-base font-black text-rose-600">{ing.stockQuantity}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{ing.unit}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {stockView === 'all' && (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                    <SectionHeader icon={<Package className="w-4 h-4" />} title="Semua Bahan / Inventori" badge={`${allStock.length} Bahan`} />
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-100">
                                                    {['Nama Bahan', 'Stok Saat Ini', 'Min. Stok', 'Satuan', 'Status', 'Level'].map((h, i) => (
                                                        <th key={h} className={`py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 ${i >= 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {allStock.map(ing => {
                                                    const isCrit = Number(ing.stockQuantity) <= Number(ing.minStockLevel);
                                                    const isLow = Number(ing.stockQuantity) <= Number(ing.minStockLevel) * 1.5;
                                                    return (
                                                        <tr key={ing.id} className="border-b border-slate-50 hover:bg-slate-50">
                                                            <td className="py-2.5 px-3 font-bold text-slate-800">{ing.name}</td>
                                                            <td className={`py-2.5 px-3 text-right font-black ${isCrit ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-600'}`}>{ing.stockQuantity}</td>
                                                            <td className="py-2.5 px-3 text-right text-slate-500">{ing.minStockLevel}</td>
                                                            <td className="py-2.5 px-3 text-right text-slate-400">{ing.unit}</td>
                                                            <td className="py-2.5 px-3 text-right">
                                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${isCrit ? 'bg-rose-100 text-rose-600' : isLow ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                                    {isCrit ? 'Kritis' : isLow ? 'Perhatian' : 'Aman'}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <StockBar qty={Number(ing.stockQuantity)} min={Number(ing.minStockLevel)} />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Finance Tab ── */}
                    {tab === 'finance' && (
                        <div className="space-y-6">
                            {/* Summary row */}
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: 'Total Pemasukan', value: fmtK(finance?.totalIn || 0), color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <ArrowUp className="w-4 h-4 text-emerald-600" /> },
                                    { label: 'Total Pengeluaran', value: fmtK(finance?.totalOut || 0), color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', icon: <ArrowDown className="w-4 h-4 text-rose-600" /> },
                                    { label: 'Laba Bersih', value: fmtK(finance?.netProfit || 0), color: `${(finance?.netProfit || 0) >= 0 ? 'text-indigo-700' : 'text-rose-700'}`, bg: `${(finance?.netProfit || 0) >= 0 ? 'bg-indigo-50' : 'bg-rose-50'}`, border: 'border-indigo-200', icon: <Minus className="w-4 h-4 text-indigo-600" /> },
                                ].map(({ label, value, color, bg, border, icon }) => (
                                    <div key={label} className={`${bg} border ${border} rounded-2xl p-5`}>
                                        <div className="flex items-center gap-2 mb-2">{icon}<p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p></div>
                                        <p className={`text-2xl font-black ${color}`}>{value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Pengeluaran by category */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                    <SectionHeader icon={<ArrowDown className="w-4 h-4" />} title="Pengeluaran per Kategori" badge={`Hari Ini: ${fmtK(todayExp)}`} />
                                    {Object.keys(expByCategory).length === 0 ? (
                                        <p className="text-slate-400 text-sm text-center py-8">Belum ada pengeluaran tercatat</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {Object.entries(expByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                                                <div key={cat}>
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <span className="text-xs font-bold text-slate-700">{cat}</span>
                                                        <span className="text-xs font-black text-slate-800">{fmtK(amt)}</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full">
                                                        <div className="h-1.5 bg-rose-400 rounded-full" style={{ width: pct(amt, expenseTotal) }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Piutang */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                    <SectionHeader icon={<Users className="w-4 h-4" />} title="Piutang & Unpaid" badge={`${fmtK(Number(summary?.unpaidAmount || 0))}`} />
                                    {Number(summary?.unpaidAmount || 0) === 0 ? (
                                        <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-4">
                                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                                            <p className="text-sm font-bold text-emerald-700">Tidak ada piutang hari ini ✓</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                                                <p className="text-xs text-rose-600 font-bold mb-1">Total Belum Dibayar</p>
                                                <p className="text-2xl font-black text-rose-700">{fmt(Number(summary?.unpaidAmount || 0))}</p>
                                            </div>
                                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                                                <p className="text-xs text-amber-700 font-bold">⚠️ Perlu tindak lanjut</p>
                                                <p className="text-xs text-amber-600 mt-1">Periksa Buku Kas untuk detail transaksi yang belum lunas.</p>
                                                <button onClick={() => router.push('/admin/finance/ledger')} className="mt-2 text-xs font-black text-amber-700 hover:underline">Buka Buku Kas →</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recent expenses */}
                            {expenses.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                    <SectionHeader icon={<Clock className="w-4 h-4" />} title="Riwayat Pengeluaran Terbaru" badge={`${expenses.length} Entri`} />
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-100">
                                                    {['Tanggal', 'Kategori', 'Deskripsi', 'Jumlah', 'Dicatat oleh'].map((h, i) => (
                                                        <th key={h} className={`py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {expenses.slice(0, 10).map((exp: any) => (
                                                    <tr key={exp.id} className="border-b border-slate-50 hover:bg-slate-50">
                                                        <td className="py-2 px-2 text-slate-400">{new Date(exp.date || exp.createdAt).toLocaleDateString('id-ID')}</td>
                                                        <td className="py-2 px-2">
                                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase">{exp.category}</span>
                                                        </td>
                                                        <td className="py-2 px-2 text-slate-700 font-medium">{exp.description}</td>
                                                        <td className="py-2 px-2 text-right font-black text-rose-600">{fmt(Number(exp.amount || 0))}</td>
                                                        <td className="py-2 px-2 text-right text-slate-400">{exp.recordedBy || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
