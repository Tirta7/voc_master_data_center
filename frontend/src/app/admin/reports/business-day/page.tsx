"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Calendar,
    Clock,
    DollarSign,
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    Search,
    TrendingUp,
    Filter,
    CalendarDays,
    CreditCard,
    Smartphone,
    Download,
    Printer,
    User,
    Eye,
    Receipt,
    Wallet,
    Menu,
    X,
    Utensils,
    PieChart as PieIcon,
    Flame,
    LayoutDashboard
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { ShieldOff, Loader2 } from 'lucide-react';
import TransactionReprintModal from '@/components/TransactionReprintModal';
import { useRealtimeData } from '@/context/RealtimeDataContext';

export default function BusinessDayDashboard() {
    const [businessDays, setBusinessDays] = useState<any[]>([]);
    const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [loadingReport, setLoadingReport] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [exporting, setExporting] = useState(false);
    const [reprintTxId, setReprintTxId] = useState<number | null>(null);
    const [showSidebar, setShowSidebar] = useState(false);
    const [settings, setSettings] = useState<any>(null);
    const { hasPermission, loading: authLoading } = useAuth();
    const { shiftEventCount } = useRealtimeData();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    useEffect(() => {
        fetchBusinessDays();
        fetchSettings();
    }, []);

    // Re-fetch report data when a shift event occurs
    useEffect(() => {
        if (selectedDayId && shiftEventCount > 0) {
            handleSelectDay(selectedDayId);
        }
    }, [shiftEventCount]);

    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${API_URL}/settings`);
            setSettings(res.data);
        } catch (err) {
            console.error("Failed to fetch settings", err);
        }
    };

    const fetchBusinessDays = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/finance/shifts/business-day/list`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setBusinessDays(res.data);
            if (res.data.length > 0 && !selectedDayId) {
                handleSelectDay(res.data[0].id);
            }
        } catch (err) {
            console.error("Failed to fetch business days", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectDay = async (id: number) => {
        setSelectedDayId(id);
        setShowSidebar(false);
        setLoadingReport(true);
        try {
            const res = await axios.get(`${API_URL}/finance/shifts/report/${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setReport(res.data);
        } catch (err) {
            console.error("Failed to fetch report", err);
        } finally {
            setLoadingReport(false);
        }
    };

    const handleExportPDF = () => {
        setExporting(true);
        window.print();
        setTimeout(() => setExporting(false), 2000);
    };

    const sortedDays = [...businessDays].sort((a, b) => b.id - a.id);
    const selectedDay = businessDays.find(d => d.id === selectedDayId);

    const filteredDays = businessDays.filter((day: any) =>
        day.date.includes(searchQuery)
    );

    const getBreakdownShifts = () => {
        if (!report || !report.shifts) return [];
        return report.shifts.filter((s: any) => {
            // Include ALL open shifts (regardless of role) so admins can see who is blocking closure
            if (!s.endTime) return true;
            // For closed shifts: only show KASIR/CASHIER (waiter revenue is already zeroed on backend)
            const role = (s.userRole || '').toUpperCase();
            return role.includes('KASIR') || role.includes('CASHIER');
        });
    };

    const breakdownShifts = getBreakdownShifts();

    const getMethodStats = () => {
        if (!report || !report.shifts) return {};
        const stats: any = {};
        // Use ALL shifts for financial stats, not just KASIR
        report.shifts.forEach((s: any) => {
            Object.entries(s.paymentMethods || {}).forEach(([method, amount]) => {
                stats[method] = (stats[method] || 0) + Number(amount);
            });
        });
        return stats;
    };

    const methodStats = getMethodStats();

    if (!hasPermission('BUSINESS_DAY_VIEW') && !authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-8 bg-slate-50">
                <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mb-6 border-2 border-rose-100">
                    <ShieldOff className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Akses Terbatas</h2>
                <p className="text-slate-500 max-w-sm font-medium">Anda tidak memiliki izin untuk melihat laporan operasional.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-slate-100 overflow-hidden font-sans">
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    body { background: white !important; }
                    .flex-1 { overflow: visible !important; height: auto !important; }
                    .h-screen { height: auto !important; }
                }
            `}</style>

            {/* Mobile Header */}
            <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between no-print z-[60]">
                <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 hover:bg-slate-100 rounded-xl">
                    <Menu className="w-6 h-6 text-slate-600" />
                </button>
                <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reports</p>
                    <p className="text-sm font-black text-slate-900 tracking-tight">{selectedDay?.date || 'Pilih Hari'}</p>
                </div>
                <button onClick={handleExportPDF} className="p-2 hover:bg-slate-100 rounded-xl">
                    <Download className="w-5 h-5 text-indigo-600" />
                </button>
            </header>

            {/* Left Panel Sidebar */}
            <div className={`
                fixed inset-0 lg:relative z-[100] lg:z-0 lg:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 no-print transition-transform duration-300
                ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between lg:block">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 leading-tight tracking-tighter">Operational</h1>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Daily History & Logs</p>
                    </div>
                    <button onClick={() => setShowSidebar(false)} className="lg:hidden p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari Tanggal..."
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-slate-900 focus:border-indigo-600 transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                    {loading ? (
                        Array(5).fill(0).map((_, i) => (
                            <div key={i} className="h-20 bg-slate-50 animate-pulse rounded-2xl m-2" />
                        ))
                    ) : filteredDays.map((day: any) => (
                        <button
                            key={day.id}
                            onClick={() => handleSelectDay(day.id)}
                            className={`w-full text-left p-4 rounded-2xl transition-all duration-300 group
                                ${selectedDayId === day.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                    : 'bg-white border-2 border-slate-50 hover:bg-indigo-50/30 text-slate-600'
                                }
                            `}
                        >
                            <div className="flex items-center justify-between font-black">
                                <div className="flex items-center gap-3">
                                    <CalendarDays className={`w-4 h-4 ${selectedDayId === day.id ? 'text-white' : 'text-indigo-600'}`} />
                                    <span className="tracking-tight">{day.date}</span>
                                </div>
                                {day.isClosed ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Clock className="w-4 h-4 text-amber-400" />}
                            </div>
                            <div className={`mt-2 text-[10px] font-black uppercase tracking-[0.2em] ${selectedDayId === day.id ? 'text-indigo-100/60' : 'text-slate-400'}`}>
                                Rp <span className={selectedDayId === day.id ? 'text-white' : 'text-slate-900'}>{Number(day.totalRevenue).toLocaleString()}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Panel Main Content */}
            <main className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-12 print:p-0">
                {loadingReport ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="font-bold uppercase tracking-widest text-[10px] mt-6">Sedang Menyiapkan Laporan...</p>
                    </div>
                ) : report ? (
                    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
                            <div className="flex items-center gap-4">
                                <div className="w-14 lg:w-16 h-14 lg:h-16 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center shadow-md">
                                    <Calendar className="w-7 lg:w-8 h-7 lg:h-8 text-indigo-600" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-3xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">
                                            {new Date(report.businessDay.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </h2>
                                        <div className={`px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-widest border-2 ${report.businessDay.isClosed ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600 animate-pulse'}`}>
                                            {report.businessDay.isClosed ? 'Closed' : 'Operational'}
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                        Business Day Report • ID: {report.businessDay.id} • Cut-off: {settings?.businessDayOffset || '00:00'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 no-print">
                                <button onClick={handleExportPDF} className="hidden sm:flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:border-indigo-600 transition-all shadow-sm">
                                    <Printer className="w-4 h-4" /> Cetak / PDF
                                </button>
                                {!report.businessDay.isClosed && hasPermission('BUSINESS_DAY_CLOSE') && (
                                    <button
                                        onClick={async () => {
                                            if (confirm("ANDA YAKIN? Laporan hari ini akan dikunci.")) {
                                                try {
                                                    await axios.post(`${API_URL}/finance/shifts/business-day/${report.businessDay.id}/close`, {}, {
                                                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                                                    });
                                                    alert("Laporan Berhasil Dikunci!");
                                                    fetchBusinessDays();
                                                } catch (err: any) {
                                                    const msg = err.response?.data?.message || "Gagal menutup buku harian.";
                                                    alert(`GAGAL: ${msg}`);
                                                }
                                            }
                                        }}
                                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg active:scale-95"
                                    >
                                        Tutup Buku
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Top Metrics Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                            {[
                                { label: 'Total Revenue', value: Number(report.summary.totalRevenue), icon: DollarSign, color: 'indigo', trend: report.summary.transactionCount + ' Tx' },
                                { label: 'Billiard Income', value: Number(report.summary.billiardRevenue || 0), icon: LayoutDashboard, color: 'sky', trend: 'Revenue Source' },
                                { label: 'Cafe Income', value: Number(report.summary.cafeRevenue || 0), icon: Utensils, color: 'orange', trend: 'Revenue Source' },
                                {
                                    label: 'Cash Entry',
                                    value: (report.transactions || []).reduce((sum: number, tx: any) => {
                                        const cashVal = (Array.isArray(tx.paymentDetails) ? tx.paymentDetails : [tx.paymentDetails]).reduce((pSum: number, p: any) => {
                                            return p?.method?.toUpperCase() === 'CASH' ? pSum + Number(p.amount || 0) : pSum;
                                        }, 0);
                                        return sum + cashVal;
                                    }, 0),
                                    icon: Wallet, color: 'emerald', trend: 'Bankable'
                                },
                                { label: 'Top-up Member', value: Number(report.summary.topUpRevenue || 0), icon: CreditCard, color: 'emerald', trend: 'Balance Intake' },
                            ].map((card, i) => (
                                <div key={i} className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm group hover:-translate-y-1 transition-all">
                                    <div className="flex items-center gap-2 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <card.icon className={`w-3 h-3 text-${card.color}-500`} />
                                        {card.label}
                                    </div>
                                    <h3 className={`text-2xl font-black tracking-tight text-slate-900`}>
                                        Rp {card.value.toLocaleString()}
                                    </h3>
                                    <div className="mt-3 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded w-fit">{card.trend}</div>
                                </div>
                            ))}
                        </div>

                        {/* Middle Row: Revenue Source & Best Sellers */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Revenue Source Chart */}
                            <div className="bg-white rounded-3xl border-2 border-slate-100 p-6 lg:p-8 shadow-sm">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-6">
                                    <PieIcon className="w-5 h-5 text-indigo-600" />
                                    Revenue Source Distribution
                                </h3>
                                <div className="h-64 mt-4" style={{ minHeight: '256px' }}>
                                    <ResponsiveContainer width="99%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Billiard', value: Number(report.summary.billiardRevenue || 0) },
                                                    { name: 'Cafe', value: Number(report.summary.cafeRevenue || 0) },
                                                    { name: 'Top-up', value: Number(report.summary.topUpRevenue || 0) }
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                <Cell fill="#0EA5E9" />
                                                <Cell fill="#F97316" />
                                                <Cell fill="#10B981" />
                                            </Pie>
                                            <RechartsTooltip
                                                formatter={(value: any) => `Rp ${Number(value).toLocaleString()}`}
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Best Selling Items Day */}
                            <div className="bg-white rounded-3xl border-2 border-slate-100 p-6 lg:p-8 shadow-sm">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-6">
                                    <Flame className="w-5 h-5 text-rose-500" />
                                    Top Selling Menu (Today)
                                </h3>
                                <div className="space-y-4">
                                    {(report.summary.topItems || []).length > 0 ? (
                                        report.summary.topItems.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-xs text-slate-400 border border-slate-100">
                                                        {idx + 1}
                                                    </div>
                                                    <span className="font-bold text-slate-700 uppercase text-xs">{item.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-indigo-600">{item.qty}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Porsi</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-48 text-slate-300">
                                            <Utensils className="w-12 h-12 opacity-20 mb-3" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Belum ada data cafe</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Payment Distribution */}
                        <div className="bg-white rounded-3xl border-2 border-slate-100 p-6 lg:p-8 shadow-sm">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-6">
                                <Smartphone className="w-5 h-5 text-indigo-600" />
                                Payment Method Distribution
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {Object.entries(methodStats).map(([method, amount]: [string, any], i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-indigo-100 transition-colors">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase">{method}</span>
                                            <span className="text-[10px] font-bold text-indigo-400">{(Number(amount) / Number(report.summary.totalRevenue) * 100).toFixed(0)}%</span>
                                        </div>
                                        <p className="text-lg font-black text-slate-900">Rp {amount.toLocaleString()}</p>
                                        <div className="mt-3 h-1 w-full bg-white rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(Number(amount) / Number(report.summary.totalRevenue) * 100)}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Invoices Table/Cards */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <Receipt className="w-5 h-5 text-indigo-600" />
                                Invoices Detailed
                            </h3>

                            {/* Desktop View Table */}
                            <div className="hidden md:block bg-white rounded-3xl border-2 border-slate-100 overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoices</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer / Table</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Items Detail</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payments</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                                            <th className="px-6 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {report.transactions.map((tx: any) => (
                                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-black text-slate-900 leading-none">#{tx.invoiceNumber || tx.id}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                                                        {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {tx.type}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                                            {tx.customerName || 'Tamu Umum'}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                            {tx.table?.name || tx.cafeTable?.name || tx.sessionType || 'Area Cafe'}
                                                        </span>
                                                        {tx.createdBy && (
                                                            <div className="mt-1 text-[8px] font-black text-indigo-500 uppercase flex items-center gap-1">
                                                                <div className="w-1 h-1 rounded-full bg-indigo-400" />
                                                                [{tx.createdBy.name}({tx.createdBy.role?.name?.toLowerCase() || 'user'})]
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-0.5 max-w-[200px]">
                                                        {tx.orderItems?.length > 0 ? (
                                                            <>
                                                                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">
                                                                    {tx.orderItems.length} Order(s)
                                                                </p>
                                                                <p className="text-[10px] font-medium text-slate-500 truncate italic">
                                                                    {tx.orderItems.map((oi: any) => oi.menuItem?.name || oi.customName).join(", ")}
                                                                </p>
                                                            </>
                                                        ) : (
                                                            <span className="text-[9px] font-black text-slate-300 uppercase italic">Billiard Only</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {(Array.isArray(tx.paymentDetails) ? tx.paymentDetails : [tx.paymentDetails]).map((p: any, idx: number) => {
                                                            const method = p?.method?.toUpperCase() || 'CASH';
                                                            const displayMethod = method === 'MEMBER' ? 'MEMBERSHIP' : method;
                                                            let badgeClass = "bg-slate-100 text-slate-600 border-slate-200"; // Default

                                                            if (method.includes('CASH')) badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                                            else if (method.includes('MEMBER')) badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                                            else if (method.includes('BCA')) badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
                                                            else if (method.includes('QRIS')) badgeClass = "bg-purple-50 text-purple-700 border-purple-200";
                                                            else if (method.includes('MANDIRI')) badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                                                            else if (method.includes('DEBIT') || method.includes('BANK')) badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200";

                                                            return (
                                                                <span key={idx} className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${badgeClass}`}>
                                                                    {displayMethod}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-slate-900">Rp {Number(tx.grandTotal).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => setReprintTxId(tx.id)} className="p-2 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="md:hidden space-y-4">
                                {report.transactions.map((tx: any) => (
                                    <div key={tx.id} className="bg-white p-5 rounded-[2rem] border-2 border-slate-100 shadow-sm active:scale-[0.98] transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                    <p className="text-sm font-black text-slate-900 leading-none">#{tx.invoiceNumber || tx.id}</p>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                                    {new Date(tx.createdAt).toLocaleTimeString()} • {tx.type}
                                                </p>
                                            </div>
                                            <button onClick={() => setReprintTxId(tx.id)} className="p-2 bg-slate-50 rounded-xl text-slate-400">
                                                <Printer className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Customer</p>
                                                <p className="text-xs font-black text-slate-800 truncate uppercase leading-tight">{tx.customerName || 'Tamu Umum'}</p>
                                                {tx.createdBy && (
                                                    <p className="text-[7px] font-black text-indigo-500 uppercase mt-1 flex items-center gap-1">
                                                        [{tx.createdBy.name}({tx.createdBy.role?.name?.toLowerCase() || 'user'})]
                                                    </p>
                                                )}
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-right">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Area / Table</p>
                                                <p className="text-xs font-black text-slate-800 truncate uppercase">{tx.table?.name || tx.cafeTable?.name || tx.sessionType || 'Area Cafe'}</p>
                                            </div>
                                        </div>

                                        {tx.orderItems?.length > 0 && (
                                            <div className="bg-indigo-50/30 rounded-2xl border border-indigo-100/30 p-4 mb-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-400" />
                                                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{tx.orderItems.length} Order Item(s)</p>
                                                </div>
                                                <p className="text-[10px] font-medium text-slate-500 italic leading-relaxed">
                                                    {tx.orderItems.map((oi: any) => oi.menuItem?.name || oi.customName).join(", ")}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {(Array.isArray(tx.paymentDetails) ? tx.paymentDetails : [tx.paymentDetails]).map((p: any, idx: number) => (
                                                <span key={idx} className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-wider">
                                                    {p?.method}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="pt-4 border-t border-slate-50 flex justify-between items-end">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Transaction</p>
                                            <p className="text-xl font-black text-indigo-600 leading-none tracking-tight">Rp {Number(tx.grandTotal).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Shift Performance Summary */}
                        <div className="space-y-6 pt-8 border-t border-slate-200">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <Clock className="w-5 h-5 text-indigo-600" />
                                Session Breakdowns
                            </h3>
                            <div className="grid grid-cols-1 gap-6">
                                {breakdownShifts.map((shift: any, idx: number) => (
                                    <div key={idx} className={`bg-white rounded-3xl border-2 p-6 lg:p-8 shadow-sm ${shift.isWaiter ? 'border-amber-100 bg-amber-50/20' : 'border-slate-100'}`}>
                                        {/* Waiter notice */}
                                        {shift.isWaiter && (
                                            <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-2xl">
                                                <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded uppercase tracking-widest">WAITER</span>
                                                <span className="text-[10px] font-bold text-amber-700">Shift hadir – pendapatan Rp 0 (dicatat ke shift Kasir yang bertugas)</span>
                                            </div>
                                        )}
                                        <div className="flex flex-col lg:flex-row gap-8">
                                            {/* Left: User Info */}
                                            <div className="flex flex-col items-center lg:items-start gap-4 shrink-0 lg:w-1/4 pb-6 lg:pb-0 lg:border-r lg:border-slate-100 mr-2">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center font-black text-white text-2xl shadow-lg shadow-slate-200">
                                                        {shift.userName.charAt(0)}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h4 className="text-lg font-black text-slate-900 tracking-tight">{shift.userName}</h4>
                                                        <div className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded uppercase tracking-widest">{shift.shiftName}</div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex flex-col gap-2 w-full pr-4">
                                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                                                        <div className="flex items-center gap-2"><Clock className="w-3 h-3" /> Start</div>
                                                        <span className={shift.latenessMinutes > 0 ? 'text-rose-500 font-black' : ''}>
                                                            {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            {shift.latenessMinutes > 0 && ` (${shift.latenessMinutes}m late)`}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                                                        <div className="flex items-center gap-2"><Clock className="w-3 h-3" /> End</div>
                                                        <span className={shift.overtimeMinutes > 0 ? 'text-emerald-500 font-black' : ''}>
                                                            {shift.endTime ? new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ACTIVE'}
                                                            {shift.overtimeMinutes > 0 && ` (+${shift.overtimeMinutes}m OT)`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Metrics & Items */}
                                            <div className="flex-1 space-y-8">
                                                {/* Metrics Row */}
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                                    {[
                                                        { label: 'Billiard', val: shift.billiardRevenue || 0, color: 'sky' },
                                                        { label: 'Cafe', val: shift.cafeRevenue || 0, color: 'orange' },
                                                        {
                                                            label: 'Cash', val: Object.entries(shift.paymentMethods || {}).reduce((sum: number, [m, v]) =>
                                                                m.toUpperCase() === 'CASH' ? sum + Number(v) : sum, 0), color: 'emerald'
                                                        },
                                                        { label: 'Top-up', val: shift.topUpRevenue || 0, color: 'emerald' },
                                                        { label: 'Diff', val: shift.discrepancy, color: shift.discrepancy === 0 ? 'emerald' : 'rose' }
                                                    ].map((s, i) => (
                                                        <div key={i} className="space-y-1">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                                                            <p className={`text-xl font-black tracking-tighter ${s.color === 'rose' ? 'text-rose-600' : s.color === 'emerald' ? 'text-emerald-600' : s.color === 'sky' ? 'text-sky-600' : s.color === 'orange' ? 'text-orange-600' : 'text-slate-900'}`}>
                                                                Rp {s.val.toLocaleString()}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Shift Details: Payment & Top Items */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-50">
                                                    {/* Payment Breakdown */}
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Payment Methods</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {Object.entries(shift.paymentMethods || {}).map(([m, val]: [string, any], i) => (
                                                                <div key={i} className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                                                                    <span className="text-[9px] font-black text-slate-500 uppercase">{m}</span>
                                                                    <span className="text-xs font-black text-slate-900">Rp {val.toLocaleString()}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Shift Top Items */}
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                            <Flame className="w-3 h-3 text-rose-500" /> Best Sellers
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(shift.topItems || []).map((item: any, i: number) => (
                                                                <div key={i} className="px-2 py-1 bg-rose-50 rounded-lg border border-rose-100 flex items-center gap-2">
                                                                    <span className="text-[9px] font-bold text-rose-600 uppercase truncate max-w-[100px]">{item.name}</span>
                                                                    <span className="text-[10px] font-black text-rose-700">{item.qty}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Close Business Logic for Admins */}
                        {
                            !report.businessDay.isClosed && hasPermission('BUSINESS_DAY_CLOSE') && (
                                <div className="p-8 lg:p-12 bg-slate-900 rounded-[2.5rem] lg:rounded-[4rem] text-white shadow-2xl shadow-indigo-200/20 relative overflow-hidden active:scale-[0.99] transition-all">
                                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 sm:text-center md:text-left">
                                        <div className="space-y-3">
                                            <h3 className="text-2xl lg:text-4xl font-black tracking-tight flex items-center gap-3 sm:justify-center md:justify-start">
                                                <Printer className="w-8 h-8 opacity-40 shrink-0" />
                                                Tutup Buku Harian
                                            </h3>
                                            <p className="text-slate-400 font-medium max-w-lg lg:text-lg">
                                                Proses ini akan mengunci seluruh laporan hari ini secara permanen. Pastikan saldo fisik telah sesuai.
                                            </p>
                                        </div>
                                        <button
                                            className="w-full md:w-auto bg-indigo-600 px-8 lg:px-12 py-5 lg:py-6 rounded-[1.5rem] lg:rounded-[2rem] font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 animate-pulse"
                                            onClick={async () => {
                                                if (confirm("ANDA YAKIN? Laporan hari ini akan dikunci.")) {
                                                    try {
                                                        await axios.post(`${API_URL}/finance/shifts/business-day/${report.businessDay.id}/close`, {}, {
                                                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                                                        });
                                                        alert("Laporan Berhasil Dikunci!");
                                                        fetchBusinessDays();
                                                    } catch (err: any) {
                                                        const msg = err.response?.data?.message || "Gagal menutup buku harian.";
                                                        alert(`GAGAL: ${msg}`);
                                                    }
                                                }
                                            }}
                                        >
                                            Konfirmasi Close
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )
                        }
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-6">
                        <Calendar className="w-20 lg:w-32 h-20 lg:h-32 opacity-10" />
                        <p className="text-xs font-black uppercase tracking-[0.4em]">Pilih tanggal di panel kiri</p>
                    </div>
                )}
            </main>

            <TransactionReprintModal
                isOpen={!!reprintTxId}
                onClose={() => setReprintTxId(null)}
                transactionId={reprintTxId}
            />
        </div>
    );
}
