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
    PlusCircle,
    Gift,
    Star,
    LayoutDashboard,
    PackageSearch,
    TrendingDown,
    ArrowDownCircle,
    Ticket
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
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/fetcher';
// import { API_URL } from '@/utils/urlUtils';

const formatDateIndonesia = (dateStr: string) => {
    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const d = date.getDate();
    const m = months[date.getMonth()];
    const y = date.getFullYear();
    return `${d} ${m} ${y}`;
};

import { formatRupiah as fmt } from '@/utils/formatUtils';
const fmtK = fmt;

/**
 * AI Helper: Calculate Operational Health Score
 */
const getOperationalHealth = (report: any) => {
    if (!report) return { score: 0, factors: [] };
    let score = 100;
    const factors = [];

    // Factor 1: Cash Discrepancies
    const totalDiscrepancy = report.shifts?.reduce((acc: number, s: any) => acc + Math.abs(Number(s.discrepancy || 0)), 0) || 0;
    const totalRevenue = Number(report.businessDay?.totalRevenue || 1);
    const discrepancyRatio = totalDiscrepancy / totalRevenue;
    
    if (discrepancyRatio > 0.05) {
        score -= 30;
        factors.push("Selisih kas tinggi (>5%)");
    } else if (discrepancyRatio > 0.01) {
        score -= 10;
        factors.push("Ada selisih kas minor");
    }

    // Factor 2: Void/Cancel Items
    const voidCount = report.transactions?.filter((t: any) => t.status === 'CANCELLED').length || 0;
    if (voidCount > 5) {
        score -= 15;
        factors.push("Banyak pembatalan transaksi");
    }

    // Factor 3: Session Utilization vs Labor (Heuristic)
    const shiftCount = report.shifts?.length || 1;
    if (totalRevenue / shiftCount < 500000) {
        score -= 10;
        factors.push("Efisiensi pendapatan per shift rendah");
    }

    return { 
        score: Math.max(0, score), 
        factors,
        level: score > 85 ? 'Excellent' : score > 70 ? 'Good' : score > 50 ? 'Warning' : 'Critical'
    };
};

/**
 * AI Helper: Detect Anomaly in Payments
 */
const detectAnomalies = (transactions: any[]) => {
    const anomalies = [];
    if (!transactions) return [];

    // Check for "Rounding" abuse
    const highRounding = transactions.filter(t => Math.abs(Number(t.roundingAmount || 0)) > 500);
    if (highRounding.length > 0) {
        anomalies.push(`${highRounding.length} transaksi dengan pembulatan > Rp 500`);
    }

    // Check for unusual payment methods (e.g. 100% Debt)
    const debtTx = transactions.filter(t => t.status === 'DEBT');
    if (debtTx.length > 3) {
        anomalies.push(`Deteksi ${debtTx.length} transaksi Piutang (Debt) ganda`);
    }

    return anomalies;
};

export default function BusinessDayDashboard() {
    const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
    
    // SWR Data Fetching
    const { data: businessDays, mutate: mutateList } = useSWR<any[]>('/finance/shifts/business-day/list', fetcher);
    const { data: settings } = useSWR<any>('/settings', fetcher);
    const { data: report, mutate: mutateReport } = useSWR<any>(selectedDayId ? `/finance/shifts/report/${selectedDayId}` : null, fetcher);

    const isLoadingReport = !report && selectedDayId !== null;
    const isLoadingList = !businessDays;

    const [searchQuery, setSearchQuery] = useState('');
    const [exporting, setExporting] = useState(false);
    const [reprintTxId, setReprintTxId] = useState<number | null>(null);
    const [showSidebar, setShowSidebar] = useState(false);
    const [activeTab, setActiveTab] = useState<'ALL' | 'BILLIARD' | 'CAFE' | 'TOPUP' | 'MEMBER'>('ALL');
    const [isMounted, setIsMounted] = useState(false);
    const { hasPermission, loading: authLoading } = useAuth();
    const { shiftEventCount } = useRealtimeData();

    const [showStockModal, setShowStockModal] = useState(false);
    const [currentStockReport, setCurrentStockReport] = useState<any[]>([]);
    const [modalUser, setModalUser] = useState("");
    const [sendingWa, setSendingWa] = useState(false);
    const [showCustomRangeModal, setShowCustomRangeModal] = useState(false);
    const [rangeForm, setRangeForm] = useState({
        startDate: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endDate: new Date().toISOString().split('T')[0],
        endTime: '03:00'
    });

    const [auditingDayId, setAuditingDayId] = useState<number | null>(null);


    useEffect(() => {
        setIsMounted(true);
        // Initial fetch is handled by SWR
        if (businessDays && businessDays.length > 0 && !selectedDayId) {
            setSelectedDayId(businessDays[0].id);
        }
    }, [businessDays, selectedDayId]);

    // Re-fetch report data when a shift event occurs
    useEffect(() => {
        if (selectedDayId && shiftEventCount > 0) {
            mutate(`/finance/shifts/report/${selectedDayId}`);
        }
    }, [shiftEventCount, selectedDayId]);

    const fetchSettings = () => mutate('/settings');
    const fetchBusinessDays = () => mutateList();

    const handleSelectDay = (id: number) => {
        setSelectedDayId(id);
        setShowSidebar(false);
    };

    const handleExportPDF = () => {
        if (!selectedDayId) {
            alert('Pilih hari terlebih dahulu sebelum mencetak.');
            return;
        }
        window.open(`/admin/reports/business-day/print?id=${selectedDayId}`, '_blank');
    };

    const handleSendToWhatsApp = async () => {
        if (!settings?.ownerPhone) {
            alert("Nomor WhatsApp Owner belum disetting. Silakan ke menu Pengaturan.");
            return;
        }

        if (!report?.businessDay) {
            alert("Data laporan belum dimuat.");
            return;
        }

        const dateStr = new Date(report.businessDay.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        if (!confirm(`Kirim laporan PDF untuk hari bisnis ${dateStr} ke ${settings.ownerPhone}?`)) return;
        
        setSendingWa(true);
        try {
            await axios.post(`/reports/whatsapp-manual`, { 
                phone: settings.ownerPhone,
                start: report.businessDay.startTime,
                end: report.businessDay.endTime || new Date().toISOString()
            });
            alert("Laporan berhasil dikirim ke WhatsApp Owner!");
        } catch (err: any) {
            console.error("Failed to send WhatsApp report", err);
            const msg = err.response?.data?.message || err.message;
            if (msg === 'STATUS_DISCONNECTED') {
                alert("WhatsApp Gateway belum CONNECTED. Silakan hubungkan WhatsApp di menu Pengaturan.");
            } else {
                alert("Gagal mengirim laporan: " + msg);
            }
        } finally {
            setSendingWa(false);
        }
    };

    const handleSendCustomRangeWhatsApp = async () => {
        if (!settings?.ownerPhone) {
            alert("Nomor WhatsApp Owner belum disetting.");
            return;
        }

        const start = new Date(`${rangeForm.startDate}T${rangeForm.startTime}`);
        const end = new Date(`${rangeForm.endDate}T${rangeForm.endTime}`);
        
        // If end time is earlier than start time on same day, assume next day
        if (end <= start && rangeForm.startDate === rangeForm.endDate) {
            end.setDate(end.getDate() + 1);
        }

        if (!confirm(`Kirim laporan kustom (${rangeForm.startDate} ${rangeForm.startTime} - ${end.toLocaleDateString()} ${rangeForm.endTime}) ke ${settings.ownerPhone}?`)) return;

        setSendingWa(true);
        try {
            await axios.post(`/reports/whatsapp-manual`, { 
                phone: settings.ownerPhone,
                start: start.toISOString(),
                end: end.toISOString()
            });
            alert("Laporan kustom berhasil dikirim ke WhatsApp Owner!");
            setShowCustomRangeModal(false);
        } catch (err: any) {
            console.error("Failed to send custom report", err);
            const msg = err.response?.data?.message || err.message;
            if (msg === 'STATUS_DISCONNECTED') {
                alert("WhatsApp Gateway belum CONNECTED. Silakan hubungkan WhatsApp di menu Pengaturan.");
            } else {
                alert("Gagal mengirim laporan: " + msg);
            }
        } finally {
            setSendingWa(false);
        }
    };

    const toggleAudit = async (id: number, currentStatus: boolean) => {
        setAuditingDayId(id);
        try {
            await axios.post(`/finance/shifts/business-day/${id}/audit`, { isAudited: !currentStatus });
            
            // Revalidate SWR cache
            mutateList();
            mutateReport();
        } catch (error) {
            console.error('Audit toggle failed:', error);
            alert('Gagal mengubah status audit');
        } finally {
            setAuditingDayId(null);
        }
    };

    const sortedDays = [...(businessDays || [])].sort((a, b) => b.id - a.id);
    const selectedDay = (businessDays || []).find(d => d.id === selectedDayId);

    const filteredDays = sortedDays.filter((day: any) =>
        day.date.includes(searchQuery)
    );

    // Grouping logic for Sidebar
    const groupedByMonth = filteredDays.reduce((acc: any, day: any) => {
        const date = new Date(day.date);
        const monthGroup = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        if (!acc[monthGroup]) acc[monthGroup] = [];
        acc[monthGroup].push(day);
        return acc;
    }, {});

    const health = getOperationalHealth(report);
    const anomalies = detectAnomalies(report?.transactions || []);

    const getBreakdownShifts = () => {
        if (!report || !report.shifts) return [];
        return report.shifts.filter((s: any) => {
            const role = (s.userRole || '').toUpperCase();
            // Include Cashiers, Admins, Managers, Owners, and anyone marked as Waiter (for the notice)
            return role.includes('KASIR') || 
                   role.includes('CASHIER') || 
                   role.includes('ADMIN') || 
                   role.includes('MANAGER') || 
                   role.includes('OWNER') ||
                   s.isWaiter;
        });
    };

    const breakdownShifts = getBreakdownShifts();

    const getMethodStats = () => {
        if (!report) return {};
        // Use global summary payment methods if available (more accurate as it includes non-shift tx)
        if (report.summary && report.summary.paymentMethods) {
            const stats: any = {};
            Object.entries(report.summary.paymentMethods).forEach(([method, amount]) => {
                const upperMethod = method.toUpperCase();
                stats[upperMethod] = (stats[upperMethod] || 0) + Number(amount);
            });
            return stats;
        }
        if (!report.shifts) return {};
        const stats: any = {};
        report.shifts.forEach((s: any) => {
            Object.entries(s.paymentMethods || {}).forEach(([method, amount]) => {
                const upperMethod = method.toUpperCase();
                stats[upperMethod] = (stats[upperMethod] || 0) + Number(amount);
            });
        });
        return stats;
    };

    const methodStats = getMethodStats();

    const getFilteredTransactions = () => {
        if (!report || !report.transactions) return [];
        return report.transactions.filter((tx: any) => {
            if (activeTab === 'ALL') return true;
            if (activeTab === 'BILLIARD') return tx.type === 'BILLIARD';
            if (activeTab === 'CAFE') return tx.type === 'CAFE' || (tx.type === 'BILLIARD' && tx.cafeTotal > 0);
            if (activeTab === 'TOPUP') return tx.type === 'TOPUP';
            if (activeTab === 'MEMBER') {
                const hasMemberPayment = (Array.isArray(tx.paymentDetails) ? tx.paymentDetails : [tx.paymentDetails])
                    .some((p: any) => p?.method?.toUpperCase() === 'MEMBER');
                return hasMemberPayment || tx.type === 'TOPUP';
            }
            return true;
        });
    };

    const filteredTransactions = getFilteredTransactions();

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
        <div className="fixed inset-0 flex flex-col lg:flex-row bg-slate-100 overflow-hidden font-sans">
            <style jsx global>{`
                @media print {
                    @page { size: A4; margin: 1cm; }
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    body { background: white !important; color: black !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .flex-1 { overflow: visible !important; height: auto !important; }
                    .h-screen { height: auto !important; overflow: visible !important; }
                    
                    /* Typography & Layout */
                    h1, h2, h3, h4 { page-break-after: avoid; }
                    table { page-break-inside: auto; border-collapse: collapse !important; width: 100% !important; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                    
                    /* Grayscale Optimization */
                    .bg-white { background: white !important; border-color: #e2e8f0 !important; }
                    .bg-slate-50, .bg-slate-100 { background: #f8fafc !important; }
                    .text-indigo-600, .text-indigo-500 { color: #334155 !important; }
                    .border-2 { border-width: 1px !important; }
                    .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl, .shadow-2xl { shadow: none !important; }
                    
                    /* Grid Fix */
                    .grid { display: block !important; }
                    .grid-cols-2, .grid-cols-4, .grid-cols-5 { display: flex !important; flex-wrap: wrap !important; gap: 0.5rem !important; }
                    .grid-cols-2 > div, .grid-cols-4 > div, .grid-cols-5 > div { flex: 1 1 20% !important; min-width: 150px !important; margin-bottom: 0.5rem !important; }
                }
                .print-only { display: none; }
            `}</style>

            {/* Mobile Header */}
            <header className="lg:hidden bg-white border-b border-slate-200 px-4 pt-[calc(1rem+env(safe-area-inset-top,20px))] pb-4 flex items-center justify-between no-print z-[60] shrink-0 shadow-sm relative">
                <div className="w-10 shrink-0"></div> {/* Spacer for the floating global sidebar menu */}
                <button onClick={() => setShowSidebar(true)} className="flex-1 text-center flex flex-col items-center justify-center active:scale-95 transition-all group">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1 group-hover:text-indigo-500 transition-colors"><Calendar className="w-3 h-3"/> Reports</p>
                    <p className="text-sm font-black text-indigo-600 tracking-tight flex items-center justify-center gap-1 bg-indigo-50 px-3 py-1 rounded-full mt-1 border border-indigo-100 shadow-sm">{selectedDay?.date || 'Pilih Hari'}</p>
                </button>
                <button onClick={handleExportPDF} className="p-2 hover:bg-indigo-100 rounded-xl bg-slate-50 border border-slate-200 text-indigo-600 shadow-sm shrink-0">
                    <Download className="w-5 h-5" />
                </button>
            </header>

            {/* Left Panel Sidebar */}
            <div className={`
                fixed inset-0 lg:relative z-[100] lg:z-0 lg:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 no-print transition-transform duration-300
                ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6 pt-16 lg:pt-6 border-b border-slate-100 flex items-center justify-between lg:block relative">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 leading-tight tracking-tighter">Operational</h1>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Daily History & Logs</p>
                    </div>
                    <button onClick={() => setShowSidebar(false)} className="lg:hidden p-2 hover:bg-slate-100 rounded-xl text-slate-400 bg-slate-50 border border-slate-200 shadow-sm">
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

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
                    {isLoadingList ? (
                        Array(5).fill(0).map((_, i) => (
                            <div key={i} className="h-20 bg-slate-50 animate-pulse rounded-2xl m-2" />
                        ))
                    ) : (
                        Object.entries(groupedByMonth).map(([month, days]: [string, any]) => (
                            <div key={month} className="space-y-2">
                                <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 flex items-center gap-3">
                                    <div className="h-px bg-slate-100 flex-1" />
                                    {month}
                                    <div className="h-px bg-slate-100 flex-1" />
                                </h3>
                                {days.map((day: any) => (
                                    <button
                                        key={day.id}
                                        onClick={() => handleSelectDay(day.id)}
                                        className={`w-full text-left p-4 rounded-2xl transition-all duration-300 group
                                            ${selectedDayId === day.id
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                : 'bg-white border-2 border-slate-50 hover:bg-white hover:border-indigo-100 hover:shadow-md text-slate-600'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center justify-between font-black">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${selectedDayId === day.id ? 'bg-white/20' : 'bg-indigo-50 group-hover:bg-indigo-600'}`}>
                                                    <CalendarDays className={`w-3.5 h-3.5 ${selectedDayId === day.id ? 'text-white' : 'text-indigo-600 group-hover:text-white'}`} />
                                                </div>
                                                <span className="tracking-tight text-sm">{formatDateIndonesia(day.date)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {day.isAudited && (
                                                    <div className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-sm border border-indigo-200" title="Audited">
                                                        <ShieldOff className="w-3 h-3" strokeWidth={3} />
                                                    </div>
                                                )}
                                                {day.isClosed ? (
                                                    <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                                                        <CheckCircle2 className="w-3 h-3" strokeWidth={3} />
                                                    </div>
                                                ) : (
                                                    <div className="w-5 h-5 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center animate-pulse">
                                                        <Clock className="w-3 h-3" strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`mt-3 pt-3 border-t ${selectedDayId === day.id ? 'border-indigo-500/30' : 'border-slate-50'} flex items-center justify-between text-[8px] font-black uppercase tracking-[0.1em] ${selectedDayId === day.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                                            <div className="flex items-center gap-1.5 grayscale opacity-70">
                                                <Clock className="w-2 h-2" />
                                                {new Date(day.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {day.endTime ? new Date(day.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ACTIVE'}
                                            </div>
                                            <div className={`px-2 py-0.5 rounded ${selectedDayId === day.id ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-900 border border-slate-100 font-bold'}`}>
                                                GROSS RP {Number(day.totalRevenue).toLocaleString()}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Panel Main Content */}
            <main className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-12 print:p-0">
                {isLoadingReport ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="font-bold uppercase tracking-widest text-[10px] mt-6">Sedang Menyiapkan Laporan...</p>
                    </div>
                ) : report ? (
                    <>

                        {/* Print Header (Only visible in Print) */}
                        <div className="print-only mb-8 border-b-4 border-slate-900 pb-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">VOC BILLIARD & CAFE</h1>
                                    <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Official Business Operations Report</p>
                                    <div className="mt-4 flex gap-6 text-xs font-black uppercase text-slate-800">
                                        <div>
                                            <p className="text-slate-400">Date Range</p>
                                            <p className="text-lg">{new Date(report.businessDay.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400">Report ID</p>
                                            <p className="text-lg">#{report.businessDay.id}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="bg-slate-900 text-white px-4 py-2 rounded-lg inline-block text-[10px] font-black uppercase tracking-widest mb-2">
                                        INTERNAL RECORD
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generated On</p>
                                    <p className="text-xs font-black">{new Date().toLocaleString('id-ID')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

                            {/* Header Section */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
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
                                            {report.businessDay.isAudited && (
                                                <div className="px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-widest border-2 bg-indigo-50 border-indigo-100 text-indigo-600 shadow-sm flex items-center gap-1.5">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Audited
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                            Business Day Report • ID: {report.businessDay.id} • Cut-off: {settings?.businessDayOffset || '00:00'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 no-print">
                                    <button 
                                        onClick={() => setShowCustomRangeModal(true)}
                                        className="flex items-center gap-2 px-5 py-3 bg-indigo-50 border-2 border-indigo-100 text-indigo-600 rounded-xl font-bold text-sm hover:border-indigo-500 transition-all shadow-sm"
                                    >
                                        <Clock className="w-4 h-4" /> Kustom WA
                                    </button>
                                    <button 
                                        onClick={handleSendToWhatsApp} 
                                        disabled={sendingWa}
                                        className="flex items-center gap-2 px-5 py-3 bg-emerald-50 border-2 border-emerald-100 text-emerald-600 rounded-xl font-bold text-sm hover:border-emerald-500 transition-all shadow-sm disabled:opacity-50"
                                    >
                                        {sendingWa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />} 
                                        {sendingWa ? 'Mengirim...' : 'Kirim ke WA'}
                                    </button>
                                    <button onClick={handleExportPDF} className="hidden sm:flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:border-indigo-600 transition-all shadow-sm">
                                        <Printer className="w-4 h-4" /> Cetak / PDF
                                    </button>

                                    <button 
                                        onClick={() => toggleAudit(report.businessDay.id, report.businessDay.isAudited)}
                                        disabled={auditingDayId === report.businessDay.id}
                                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-sm border-2 ${
                                            report.businessDay.isAudited 
                                            ? 'bg-amber-50 border-amber-100 text-amber-600 hover:border-amber-500' 
                                            : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:border-indigo-500'
                                        }`}
                                    >
                                        {auditingDayId === report.businessDay.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : report.businessDay.isAudited ? (
                                            <AlertCircle className="w-4 h-4" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4" />
                                        )}
                                        {report.businessDay.isAudited ? 'Unmark Audit' : 'Mark as Audited'}
                                    </button>
                                </div>
                            </div>

                            {/* AI OPERATIONAL ANALYSIS */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
                                <div className={`col-span-1 p-6 rounded-3xl border-2 flex flex-col justify-between shadow-sm ${
                                    health.level === 'Excellent' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' :
                                    health.level === 'Good' ? 'bg-blue-50 border-blue-100 text-blue-900' :
                                    health.level === 'Warning' ? 'bg-amber-50 border-amber-100 text-amber-900' :
                                    health.level === 'Critical' ? 'bg-red-50 border-red-100 text-red-900' :
                                    'bg-slate-50 border-slate-100 text-slate-900'
                                }`}>
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-2 bg-white/50 rounded-lg">
                                                <Flame className="w-5 h-5" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Health Score</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-5xl font-black tracking-tighter">{health.score}%</h3>
                                            <span className="font-bold text-sm uppercase">{health.level}</span>
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            {health.factors.length > 0 ? health.factors.map((f, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs font-medium opacity-80">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                                    {f}
                                                </div>
                                            )) : (
                                                <div className="flex items-center gap-2 text-xs font-medium opacity-80">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Operasional sangat optimal
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="mt-6 text-[10px] font-bold uppercase tracking-wider opacity-50 italic text-pretty">
                                        * Analisis AI berdasarkan data transaksi & disiplin kasir
                                    </p>
                                </div>

                                <div className="col-span-2 p-6 bg-white border-2 border-slate-100 rounded-3xl shadow-sm space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                                <TrendingUp className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 uppercase tracking-tight">Anomali & Insight</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deteksi Otomatis Sistem</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {anomalies.length > 0 ? anomalies.map((a, i) => (
                                            <div key={i} className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                                                <AlertCircle className="text-amber-600 w-5 h-5 shrink-0" />
                                                <p className="text-xs font-bold text-amber-900">{a}</p>
                                            </div>
                                        )) : (
                                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 col-span-2">
                                                <CheckCircle2 className="text-emerald-600 w-5 h-5 shrink-0" />
                                                <p className="text-xs font-bold text-emerald-900">Tidak ditemukan anomali pembayaran yang signifikan.</p>
                                            </div>
                                        )}
                                        
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3 col-span-2">
                                            <PackageSearch className="text-slate-600 w-5 h-5 shrink-0" />
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Prediksi Closing</p>
                                                <p className="text-xs font-bold text-slate-700">
                                                    {Number(report.businessDay.totalRevenue) > 5000000 
                                                        ? "Traffic tinggi terdeteksi. Pastikan stok bahan baku cafe segera diisi ulang untuk shift berikutnya." 
                                                        : "Traffic moderat. Fokus pada maintenance meja billiard dan kebersihan area."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Top Metrics Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                                {[
                                    { label: 'Total Revenue', value: Number(report.summary.totalRevenue), icon: DollarSign, color: 'indigo', trend: report.summary.transactionCount + ' Tx' },
                                    { label: 'Billiard', value: Number(report.summary.billiardRevenue || 0), icon: LayoutDashboard, color: 'sky', trend: 'Revenue Source' },
                                    { label: 'PlayStation', value: Number(report.summary.playstationRevenue || 0), icon: LayoutDashboard, color: 'indigo', trend: 'Revenue Source' },
                                    { label: 'Cafe', value: Number(report.summary.cafeRevenue || 0), icon: Utensils, color: 'orange', trend: 'Revenue Source' },
                                    {
                                        label: 'Cash Entry',
                                        value: Number(methodStats?.['CASH'] || 0),
                                        icon: Wallet, color: 'emerald', trend: 'Bankable'
                                    },
                                    { label: 'Top-up Member', value: Number(report.summary.topUpRevenue || 0), icon: CreditCard, color: 'emerald', trend: 'Balance Intake' },
                                    { label: 'Pts Issued', value: Number(report.summary.totalAwardedPoints || 0), icon: Star, color: 'amber', trend: 'Loyalty Growth', unit: 'Pts' },
                                    { label: 'Pts Redeemed', value: Number(report.summary.totalPointsRedeemed || 0), icon: Gift, color: 'rose', trend: 'Reward Usage', unit: 'Pts' },
                                    { label: 'Promo / Vcr', value: Number(report.summary.totalDiscount || 0), icon: Ticket, color: 'fuchsia', trend: 'Subsidized Value' },
                                    { label: 'Tax & Service', value: Number(report.summary.totalVat || 0) + Number(report.summary.totalService || 0), icon: Receipt, color: 'indigo', trend: 'Gov & Fixed' },
                                    { label: 'Rounding', value: Number(report.summary.totalRounding || 0), icon: ArrowDownCircle, color: 'slate', trend: 'Adjustments' },
                                    { label: 'Total Expense', value: Number(report.summary.totalExpenses || 0), icon: ArrowDownCircle, color: 'rose', trend: 'Operational Cost' },
                                    { label: 'Net Profit', value: Number(report.summary.netProfit || 0), icon: TrendingUp, color: 'emerald', trend: 'Final Take-home' },
                                ].map((card, i) => (

                                    <div key={i} className="bg-white p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm group hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 relative overflow-hidden flex flex-col justify-between items-start text-left">
                                        <div className={`absolute -top-4 -right-4 w-12 h-12 md:w-16 md:h-16 bg-${card.color}-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform`} />
                                        
                                        <div className="w-full flex flex-col items-start">
                                            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4 text-[8px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none truncate w-full">
                                                <div className={`shrink-0 w-8 h-8 md:w-8 md:h-8 rounded-lg md:rounded-xl bg-${card.color}-50 flex items-center justify-center shadow-sm`}>
                                                    <card.icon className={`w-4 h-4 text-${card.color}-600`} />
                                                </div>
                                                <span className="truncate w-full">{card.label}</span>
                                            </div>
                                            <h3 className={`text-lg md:text-3xl font-black tracking-tighter text-slate-900 truncate w-full`}>
                                                {card.unit === 'Pts' ? (
                                                    <>
                                                        <span className="hidden md:inline text-sm font-bold text-slate-300 mr-1.5">Pts</span>
                                                        {card.value.toLocaleString()}
                                                    </>
                                                ) : (
                                                    fmtK(card.value).replace('Rp ', 'Rp')
                                                )}
                                            </h3>
                                        </div>

                                        <div className="mt-2 md:mt-4 flex items-center justify-center md:justify-between border-t border-slate-50 pt-2 md:pt-4 w-full">
                                            <div className="text-[6px] md:text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-1.5 md:px-3 py-0.5 md:py-1 rounded-full flex items-center gap-1 md:gap-2 w-fit max-w-full truncate">
                                                <div className={`hidden md:block w-1.5 h-1.5 shrink-0 rounded-full bg-${card.color}-400`} />
                                                <span className="truncate">{card.trend}</span>
                                            </div>
                                        </div>
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
                                        {isMounted && (
                                            <ResponsiveContainer width="99%" height={256}>
                                                <PieChart>
                                                    <Pie
                                                        data={[
                                                            { name: 'Billiard', value: Number(report.summary.billiardRevenue || 0) },
                                                            { name: 'PlayStation', value: Number(report.summary.playstationRevenue || 0) },
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
                                                        <Cell fill="#6366F1" />
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
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 md:gap-6">
                                    {/* Best Selling Items Day */}
                                    <div className="bg-white rounded-[1.25rem] md:rounded-3xl border-2 border-slate-100 p-3 md:p-6 lg:p-8 shadow-sm">
                                        <h3 className="text-xs md:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 md:gap-3 mb-3 md:mb-6 font-display truncate">
                                            <Flame className="w-3.5 h-3.5 md:w-5 md:h-5 text-rose-500 shrink-0" />
                                            <span className="truncate">Top Menu</span>
                                        </h3>
                                        <div className="space-y-2 md:space-y-4">
                                            {(report.summary.topItems || []).length > 0 ? (
                                                report.summary.topItems.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex flex-col xl:flex-row xl:items-center justify-between p-2 md:p-3 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 gap-1 xl:gap-0">
                                                        <div className="flex items-center gap-2 md:gap-3">
                                                            <div className="w-5 h-5 md:w-8 md:h-8 rounded-md md:rounded-lg bg-white flex items-center justify-center font-black text-[9px] md:text-xs text-slate-400 border border-slate-100 shrink-0">
                                                                {idx + 1}
                                                            </div>
                                                            <span className="font-bold text-slate-700 uppercase text-[9px] md:text-xs truncate w-full max-w-[80px] sm:max-w-[150px]">{item.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 md:gap-2 self-start xl:self-auto pl-7 md:pl-11 xl:pl-0">
                                                            <span className="text-[10px] md:text-xs font-black text-indigo-600">{item.qty}</span>
                                                            <span className="text-[7px] md:text-[10px] font-bold text-slate-400 uppercase">Porsi</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-24 md:h-48 text-slate-300">
                                                    <Utensils className="w-6 h-6 md:w-12 md:h-12 opacity-20 mb-2 md:mb-3" />
                                                    <p className="text-[7px] md:text-[10px] font-black uppercase tracking-widest text-center">Belum ada<br/>cafe</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Top Waiters Day */}
                                    <div className="bg-white rounded-[1.25rem] md:rounded-3xl border-2 border-slate-100 p-3 md:p-6 lg:p-8 shadow-sm">
                                        <h3 className="text-xs md:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 md:gap-3 mb-3 md:mb-6 font-display truncate">
                                            <User className="w-3.5 h-3.5 md:w-5 md:h-5 text-indigo-600 shrink-0" />
                                            <span className="truncate">Top Pelayan</span>
                                        </h3>
                                        <div className="space-y-2 md:space-y-4">
                                            {(report.summary.topWaiters || []).length > 0 ? (
                                                report.summary.topWaiters.map((waiter: any, idx: number) => (
                                                    <div key={idx} className="flex flex-col xl:flex-row xl:items-center justify-between p-2 md:p-3 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 gap-1 xl:gap-0">
                                                        <div className="flex items-center gap-2 md:gap-3">
                                                            <div className="w-5 h-5 md:w-8 md:h-8 rounded-md md:rounded-lg bg-white flex items-center justify-center font-black text-[9px] md:text-xs text-slate-400 border border-slate-100 shrink-0">
                                                                {idx + 1}
                                                            </div>
                                                            <div className="truncate">
                                                                <p className="text-[9px] md:text-xs font-black text-slate-900 uppercase truncate w-full max-w-[80px] sm:max-w-full">{waiter.name}</p>
                                                                <p className="text-[6px] md:text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate">{waiter.transactionCount} Tx</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-[9px] md:text-xs font-black text-slate-900 self-start xl:self-auto pl-7 md:pl-11 xl:pl-0 truncate">{fmtK(waiter.totalSales).replace('Rp ', 'Rp')}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-24 md:h-48 text-slate-300">
                                                    <User className="w-6 h-6 md:w-12 md:h-12 opacity-20 mb-2 md:mb-3" />
                                                    <p className="text-[7px] md:text-[10px] font-black uppercase tracking-widest text-center">Belum ada<br/>pelayan</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stock Reconciliation Summary (Daily) */}
                            {(report.summary.stockAudit || []).length > 0 && (
                                <div className="bg-white rounded-3xl border-2 border-slate-100 p-6 lg:p-8 shadow-sm">
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-6">
                                        <PackageSearch className="w-5 h-5 text-indigo-600" />
                                        Daily Stock Reconciliation Summary
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                                        {report.summary.stockAudit.map((item: any, idx: number) => {
                                            const disc = Number(item.discrepancy || 0);
                                            return (
                                                <div key={idx} className={`p-4 rounded-2xl border-2 transition-all group ${disc === 0 ? 'bg-emerald-50/30 border-emerald-50 opacity-60 hover:opacity-100' : disc < 0 ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.department || 'STOCK'}</span>
                                                        {disc !== 0 && <AlertCircle className={`w-3 h-3 ${disc < 0 ? 'text-rose-500' : 'text-amber-500'}`} />}
                                                    </div>
                                                    <h4 className="text-xs font-black text-slate-900 uppercase truncate mb-1">{item.name}</h4>
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-lg font-black ${disc === 0 ? 'text-emerald-600' : disc < 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                                                            {disc > 0 ? '+' : ''}{disc}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 mb-1">{item.unit}</span>
                                                    </div>
                                                    <div className="mt-2 h-1 w-full bg-white/50 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${disc === 0 ? 'bg-emerald-400' : disc < 0 ? 'bg-rose-400' : 'bg-amber-400'}`} style={{ width: disc === 0 ? '100%' : '50%' }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {report.summary.stockAudit.length > 0 && report.summary.stockAudit.every((i: any) => i.discrepancy === 0) && (
                                        <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Akurasi Stok 100% Untuk Hari Ini</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Payment Distribution */}
                            <div className="bg-white rounded-3xl border-2 border-slate-100 p-6 lg:p-8 shadow-sm">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-6">
                                    <Smartphone className="w-5 h-5 text-indigo-600" />
                                    Payment Method Distribution
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                                    {Object.entries(methodStats).map(([method, amount]: [string, any], i) => (
                                        <div key={i} className={`p-3 md:p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-indigo-100 transition-colors flex flex-col justify-between ${method === 'CASH' ? 'col-span-2 row-span-2' : ''}`}>
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase truncate">
                                                        {method} {method === 'CASH' ? '(Omset Bersih)' : ''}
                                                    </span>
                                                    <span className="text-[9px] md:text-[10px] font-bold text-indigo-400">{(Number(amount) / Number(report.summary.totalRevenue) * 100).toFixed(0)}%</span>
                                                </div>
                                                <p className="text-sm md:text-xl font-black text-slate-900 truncate">Rp {Number(amount).toLocaleString()}</p>
                                            </div>

                                            {method === 'CASH' && (
                                                <div className="mt-4 mb-2 flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
                                                    <div>
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Uang Diterima</p>
                                                        <p className="text-sm font-black text-emerald-600">Rp {Number(report.summary.totalTenderedCash || amount).toLocaleString()}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Kembalian</p>
                                                        <p className="text-sm font-black text-rose-500">Rp {Number(report.summary.totalChangeMoney || 0).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="h-1 w-full bg-white rounded-full overflow-hidden mt-auto">
                                                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(Number(amount) / Number(report.summary.totalRevenue) * 100)}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Loyalty & Redemption Section */}
                            <div className="bg-white rounded-3xl border-2 border-slate-100 p-6 lg:p-8 shadow-sm">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 font-display">
                                        <Gift className="w-5 h-5 text-rose-500" />
                                        Detail Penukaran Point Reward
                                    </h3>
                                    <div className="px-4 py-2 bg-rose-50 rounded-2xl border border-rose-100 flex items-center gap-3">
                                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Total Poin Tertukar</span>
                                        <span className="text-lg font-black text-rose-600">{(report.summary.totalPointsRedeemed || 0).toLocaleString()} Poin</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {(report.summary.redemptionBreakdown || []).length > 0 ? (
                                        report.summary.redemptionBreakdown.map((item: any, idx: number) => (
                                            <div key={idx} className="p-5 rounded-[2.5rem] bg-slate-50 border-2 border-slate-100 group hover:border-rose-200 transition-all flex flex-col justify-between shadow-sm hover:shadow-md">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="space-y-1.5">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">Reward Item</p>
                                                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight line-clamp-1">{item.name}</h4>
                                                    </div>
                                                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center font-black text-rose-500 shadow-sm shrink-0">
                                                        <span className="text-xs leading-none">{item.count}</span>
                                                        <span className="text-[8px] uppercase opacity-50">QTY</span>
                                                    </div>
                                                </div>
                                                <div className="pt-4 border-t border-slate-200/50 flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Burn Value</span>
                                                    </div>
                                                    <span className="text-sm font-black text-slate-900">{(item.points || 0).toLocaleString()} <span className="text-[10px] text-slate-400">Pts</span></span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-300">
                                            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                                                <Gift className="w-10 h-10 opacity-20" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 text-center">
                                                Tidak ada penukaran poin<br />untuk periode ini
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Invoices Table/Cards */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 shrink-0">
                                    <Receipt className="w-5 h-5 text-indigo-600" />
                                    Invoices Detailed
                                    <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-black ml-2 uppercase tracking-widest">{filteredTransactions.length} items</span>
                                </h3>

                                {/* Category Tabs */}
                                <div className="flex p-1.5 bg-white border-2 border-slate-100 rounded-2xl gap-1 overflow-x-auto no-scrollbar">
                                    {(['ALL', 'BILLIARD', 'CAFE', 'TOPUP', 'MEMBER'] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0
                                                ${activeTab === tab
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}
                                            `}
                                        >
                                            {tab === 'ALL' ? 'Semua' :
                                                tab === 'BILLIARD' ? 'Billiard' :
                                                    tab === 'CAFE' ? 'Cafe' :
                                                        tab === 'TOPUP' ? 'Top-up' : 'Member Transs.'}
                                        </button>
                                    ))}
                                </div>
                            </div>

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
                                        {filteredTransactions.map((tx: any) => (
                                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-5 align-top">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${tx.type === 'TOPUP' ? 'bg-emerald-500' : tx.type === 'BILLIARD' ? 'bg-indigo-500' : 'bg-orange-500'}`} />
                                                        <p className="text-sm font-black text-slate-900 leading-none">#{tx.invoiceNumber || tx.id}</p>
                                                    </div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <span className={`inline-block mt-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${tx.type === 'TOPUP' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        tx.type === 'BILLIARD' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                            'bg-orange-50 text-orange-600 border-orange-100'
                                                        }`}>
                                                        {tx.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 align-top">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                                                            {tx.customerName || 'Tamu Umum'}
                                                            {tx.member && <CheckCircle2 className="w-3 h-3 text-indigo-500" />}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 bg-slate-50 px-1.5 py-0.5 rounded w-fit italic">
                                                            {tx.table?.tableName || tx.cafeTable?.tableName || tx.sessionType || 'Area Cafe'}
                                                        </span>
                                                        {tx.createdBy && (
                                                            <div className="mt-2 text-[8px] font-black text-slate-400 uppercase flex items-center gap-1 bg-white border border-slate-100 rounded-md px-1.5 py-1 w-fit shadow-sm">
                                                                <User className="w-2 h-2 text-indigo-500" />
                                                                {tx.createdBy.name} <span className="text-slate-300">({tx.createdBy.role?.name?.toLowerCase() || 'user'})</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 align-top">
                                                    <div className="space-y-3 max-w-[280px]">
                                                        {/* Billiard Details */}
                                                        {tx.startTime && (
                                                            <div className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/50">
                                                                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                                                    <LayoutDashboard className="w-2.5 h-2.5" /> Session Detail
                                                                </p>
                                                                <div className="flex items-center justify-between font-bold text-[9px] text-indigo-800">
                                                                    <span>{new Date(tx.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {tx.endTime ? new Date(tx.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'NOW'}</span>
                                                                    <span className="bg-white px-1 rounded">{tx.sessionDuration || '-'}</span>
                                                                </div>
                                                                {/* Detailed Segments Breakdown */}
                                                                {Array.isArray(tx.billingDetails) && tx.billingDetails.length > 0 && (
                                                                    <div className="mt-1.5 pt-1.5 border-t border-indigo-100/50 space-y-0.5">
                                                                        {tx.billingDetails.map((seg: any, sidx: number) => (
                                                                            <div key={sidx} className="flex justify-between text-[7px] font-bold text-indigo-400 uppercase tracking-tighter">
                                                                                <span>• {seg.title || 'Segment'} ({seg.duration}m)</span>
                                                                                <span>Rp{Number(seg.subtotal || seg.amount || 0).toLocaleString()}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* F&B Details */}
                                                        {tx.orderItems?.filter((oi: any) => oi.status?.toUpperCase() !== 'CANCELLED' && oi.status?.toUpperCase() !== 'CANCEL_REQUESTED').length > 0 && (
                                                            <div className="bg-amber-50/50 p-2 rounded-xl border border-amber-100/50">
                                                                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                                    <Utensils className="w-2.5 h-2.5" /> Orders ({tx.orderItems.filter((oi: any) => oi.status?.toUpperCase() !== 'CANCELLED' && oi.status?.toUpperCase() !== 'CANCEL_REQUESTED').length})
                                                                </p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {tx.orderItems
                                                                        .filter((oi: any) => oi.status?.toUpperCase() !== 'CANCELLED' && oi.status?.toUpperCase() !== 'CANCEL_REQUESTED')
                                                                        .map((oi: any, idx: number) => (
                                                                        <span key={idx} className="text-[8px] font-black bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-tighter">
                                                                            {Number(oi.quantity)}x {oi.menuItem?.name || oi.customName}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {tx.type === 'TOPUP' && (
                                                            <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/50">
                                                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                                                                    <PlusCircle className="w-2.5 h-2.5" /> Wallet Addition
                                                                </p>
                                                            </div>
                                                        )}

                                                        {!tx.startTime && (!tx.orderItems || tx.orderItems.filter((oi: any) => oi.status?.toUpperCase() !== 'CANCELLED' && oi.status?.toUpperCase() !== 'CANCEL_REQUESTED').length === 0) && tx.type !== 'TOPUP' && (
                                                            <span className="text-[9px] font-black text-slate-300 uppercase italic">No specifics recorded</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 align-top">
                                                    <div className="flex flex-col gap-2 min-w-[180px]">
                                                        {/* Payment Methods */}
                                                        <div className="flex flex-wrap gap-1">
                                                            {(Array.isArray(tx.paymentDetails) ? tx.paymentDetails : (tx.paymentDetails ? [tx.paymentDetails] : [])).map((p: any, idx: number) => {
                                                                const method = (p?.method || 'UNKNOWN').toUpperCase();
                                                                const isMember = method === 'MEMBER' || method === 'MEMBERSHIP';
                                                                const displayMethod = isMember ? 'MEMBERSHIP' : method;
                                                                let badgeClass = "bg-slate-100 text-slate-600 border-slate-200";

                                                                if (isMember) badgeClass = "bg-violet-100 text-violet-700 border-violet-200 ring-1 ring-violet-300";
                                                                else if (method === 'CASH') badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                                                else if (method.includes('BCA')) badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
                                                                else if (method.includes('QRIS')) badgeClass = "bg-purple-50 text-purple-700 border-purple-200";
                                                                else if (method.includes('MANDIRI')) badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                                                                else if (method.includes('DEBIT') || method.includes('BANK') || method.includes('TRANSFER')) badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
                                                                else if (method === 'UNKNOWN') badgeClass = "bg-slate-50 text-slate-400 border-slate-200 opacity-60";

                                                                return (
                                                                    <span key={idx} className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border flex items-center gap-1 ${badgeClass}`}>
                                                                        {isMember && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />}
                                                                        {displayMethod}
                                                                        {Number(p?.amount) > 0 && <span className="opacity-60 font-bold border-l pl-1 border-current ml-1">Rp {Number(p.amount).toLocaleString()}</span>}
                                                                    </span>
                                                                );
                                                            })}
                                                            {(!tx.paymentDetails || (Array.isArray(tx.paymentDetails) && tx.paymentDetails.length === 0)) && tx.status === 'PAID' && (
                                                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase border bg-slate-50 text-slate-400 border-slate-200">Recorded</span>
                                                            )}
                                                        </div>

                                                        {/* Cost Breakdown separator */}
                                                        <div className="border-t border-slate-100 pt-1.5 space-y-1">
                                                            {Number(tx.discountAmount) > 0 && (
                                                                <div className="text-[8px] font-black text-rose-500 uppercase flex justify-between items-center">
                                                                    <span className="text-slate-400">Potongan</span>
                                                                    <span className="text-rose-500">- Rp {Number(tx.discountAmount).toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                            {Number(tx.serviceChargeAmount) > 0 && (
                                                                <div className="text-[8px] font-black text-slate-400 uppercase flex justify-between items-center">
                                                                    <span>Service</span>
                                                                    <span>Rp {Number(tx.serviceChargeAmount).toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                            {Number(tx.vatAmount) > 0 && (
                                                                <div className="text-[8px] font-black text-slate-400 uppercase flex justify-between items-center">
                                                                    <span>PPN</span>
                                                                    <span>Rp {Number(tx.vatAmount).toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                            {Number(tx.roundingAmount) !== 0 && (
                                                                <div className="text-[8px] font-black text-slate-400 uppercase flex justify-between items-center bg-slate-50/50 px-1 rounded">
                                                                    <span>Pembulatan</span>
                                                                    <span>{Number(tx.roundingAmount) > 0 ? '+' : ''} Rp {Number(tx.roundingAmount).toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 align-top text-right">
                                                    <p className="text-sm font-black text-slate-900 leading-none">Rp {Number(tx.grandTotal).toLocaleString()}</p>
                                                    <span className={`inline-block mt-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${tx.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                        {tx.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 align-top text-right">
                                                    <button onClick={() => setReprintTxId(tx.id)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all border border-slate-100 shadow-sm active:scale-90">
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="md:hidden space-y-3">
                                {filteredTransactions.map((tx: any) => (
                                    <div key={tx.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col gap-3 active:scale-[0.99] transition-all">
                                        <div className={`absolute top-0 left-0 w-full h-1 ${tx.status === 'PAID' ? 'bg-emerald-500' : tx.status === 'CANCELLED' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                        
                                        <div className="flex justify-between items-start mt-1">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${tx.type === 'TOPUP' ? 'bg-emerald-500' : tx.type === 'BILLIARD' ? 'bg-indigo-500' : 'bg-orange-500'}`} />
                                                    <p className="text-xs font-black text-slate-900 leading-none">#{tx.invoiceNumber || tx.id}</p>
                                                </div>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {tx.type}</p>
                                            </div>
                                            <button onClick={() => setReprintTxId(tx.id)} className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 border border-slate-100 shadow-sm transition-colors">
                                                <Printer className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex flex-col justify-center">
                                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Customer</p>
                                                <p className="text-[10px] font-black text-slate-800 truncate uppercase leading-tight">{tx.customerName || 'Tamu Umum'}</p>
                                                {tx.createdBy && <p className="text-[7px] font-bold text-slate-400 truncate mt-0.5">Staff: {tx.createdBy.name}</p>}
                                            </div>
                                            <div className="flex-1 bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex flex-col justify-center text-right">
                                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Area / Table</p>
                                                <p className="text-[10px] font-black text-slate-800 truncate uppercase leading-tight">{tx.table?.tableName || tx.cafeTable?.tableName || tx.sessionType || 'Area Cafe'}</p>
                                                {tx.startTime && (
                                                    <p className="text-[7px] font-bold text-indigo-500 truncate mt-0.5">
                                                        {new Date(tx.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {tx.endTime ? new Date(tx.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'NOW'}
                                                        {tx.sessionDuration && <span className="text-slate-400 font-black ml-1">({tx.sessionDuration})</span>}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Breakdowns */}
                                        <div className="flex flex-col gap-2">
                                            {/* Billiard Segment Details */}
                                            {tx.type === 'BILLIARD' && Array.isArray(tx.billingDetails) && tx.billingDetails.length > 0 && (
                                                <div className="px-1 space-y-1">
                                                    <p className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1 flex items-center gap-1"><LayoutDashboard className="w-2.5 h-2.5"/> Session Details</p>
                                                    {tx.billingDetails.map((seg: any, sidx: number) => (
                                                        <div key={sidx} className="flex justify-between items-center text-[8px] font-bold text-slate-500 uppercase bg-slate-50/50 px-2 py-1 rounded">
                                                            <span className="truncate mr-2">• {seg.title || 'Segment'} {seg.duration ? `(${seg.duration}m)` : ''}</span>
                                                            <span className="shrink-0 text-slate-700">Rp{Number(seg.subtotal || seg.amount || 0).toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Cafe Order Details */}
                                            {tx.orderItems?.filter((oi: any) => oi.status?.toUpperCase() !== 'CANCELLED' && oi.status?.toUpperCase() !== 'CANCEL_REQUESTED').length > 0 && (
                                                <div className="px-1 space-y-1">
                                                    <p className="text-[8px] font-black text-orange-500 uppercase tracking-[0.2em] mb-1 flex items-center gap-1 mt-1"><Utensils className="w-2.5 h-2.5"/> Cafe Orders</p>
                                                    {tx.orderItems
                                                        .filter((oi: any) => oi.status?.toUpperCase() !== 'CANCELLED' && oi.status?.toUpperCase() !== 'CANCEL_REQUESTED')
                                                        .map((oi: any, idx: number) => {
                                                            const itemPrice = Number(oi.price || oi.priceAtOrder || 0);
                                                            const itemTotal = Number(oi.total) || (Number(oi.quantity || 1) * itemPrice);
                                                            return (
                                                                <div key={idx} className="flex justify-between items-center text-[8px] font-bold text-slate-500 uppercase bg-slate-50/50 px-2 py-1 rounded">
                                                                    <span className="truncate mr-2">{Number(oi.quantity)}x {oi.menuItem?.name || oi.customName}</span>
                                                                    {itemTotal > 0 ? <span className="shrink-0 text-slate-700">Rp{itemTotal.toLocaleString()}</span> : null}
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 bg-indigo-50/30 p-2.5 rounded-xl border border-indigo-50 mt-1">
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-600">
                                                    <span>Bill</span>
                                                    <span>Rp{Number(tx.billiardTotal || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-600">
                                                    <span>Cafe</span>
                                                    <span>Rp{Number(tx.cafeTotal || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-600">
                                                    <span>Disc</span>
                                                    <span className="text-rose-500">-Rp{Number(tx.discountAmount || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1 border-l border-indigo-100/50 pl-2">
                                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-600">
                                                    <span>SC</span>
                                                    <span>Rp{Number(tx.serviceChargeAmount || tx.serviceCharge || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-600">
                                                    <span>PPN</span>
                                                    <span>Rp{Number(tx.vatAmount || tx.taxAmount || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-600">
                                                    <span>Bulat</span>
                                                    <span>Rp{Number(tx.roundingAmount || tx.rounding || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-end pt-3 border-t border-slate-100">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex flex-wrap gap-1">
                                                    {(Array.isArray(tx.paymentDetails) ? tx.paymentDetails : (tx.paymentDetails ? [tx.paymentDetails] : [])).map((p: any, idx: number) => {
                                                        const method = (p?.method || 'UNKNOWN').toUpperCase();
                                                        return (
                                                            <span key={idx} className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider text-white shadow-sm flex items-center gap-1 ${method === 'MEMBER' || method === 'MEMBERSHIP' ? 'bg-violet-600' : 'bg-slate-900'}`}>
                                                                {method === 'MEMBER' ? 'MEMBER' : method}
                                                                {Number(p?.amount) > 0 && <span className="border-l border-white/20 pl-1 opacity-80">{fmtK(p.amount)}</span>}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-[8px] font-black uppercase tracking-widest ${tx.status === 'PAID' ? 'text-emerald-500' : tx.status === 'CANCELLED' ? 'text-rose-500' : 'text-amber-500'}`}>{tx.status}</p>
                                                    {Number(tx.changeAmount) > 0 && <p className="text-[7px] font-bold text-slate-400">Kembali {fmtK(tx.changeAmount)}</p>}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Grand Total</p>
                                                <p className="text-sm font-black text-slate-900 leading-none">{fmtK(tx.grandTotal || 0)}</p>
                                            </div>
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
                                    <div key={idx} className={`bg-white rounded-3xl border-2 p-6 lg:p-8 shadow-sm ${
                                        shift.isEmergencyCover
                                            ? 'border-orange-200 bg-orange-50/10'
                                            : shift.isWaiter
                                            ? 'border-amber-100 bg-amber-50/20'
                                            : 'border-slate-100'
                                    }`}>
                                        {/* Emergency Cover Notice */}
                                        {shift.isEmergencyCover && (
                                            <div className="mb-4 flex flex-col gap-1.5 px-3 py-3 bg-orange-50 border border-orange-200 rounded-2xl">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-orange-500 text-white text-[9px] font-black rounded uppercase tracking-widest flex items-center gap-1">
                                                        ⚡ COVER DARURAT
                                                    </span>
                                                    <span className="text-[10px] font-black text-orange-700 uppercase tracking-widest">
                                                        Shift Tambahan di Luar Jadwal
                                                    </span>
                                                </div>
                                                {shift.coverNote && (
                                                    <p className="text-[10px] font-semibold text-orange-600 pl-1 leading-relaxed">
                                                        📝 {shift.coverNote}
                                                    </p>
                                                )}
                                                <p className="text-[9px] font-bold text-orange-500/80 pl-1">
                                                    ℹ️ Data shift ini TERPISAH dan akurat. Uang yang diterima selama periode ini tercatat khusus di shift ini, tidak tergabung dengan shift sebelumnya.
                                                </p>
                                            </div>
                                        )}

                                        {/* Waiter notice */}
                                        {shift.isWaiter && (
                                            <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-2xl">
                                                <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded uppercase tracking-widest">WAITER</span>
                                                <span className="text-[10px] font-bold text-amber-700">Shift hadir – pendapatan Rp 0 (dicatat ke shift Kasir yang bertugas)</span>
                                            </div>
                                        )}

                                        {/* Handover Transactions Notice */}
                                        {shift.handoverTransactions && shift.handoverTransactions.length > 0 && (
                                            <div className="mb-4 px-3 py-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded uppercase tracking-widest">⚠️ HANDOVER</span>
                                                    <span className="text-[10px] font-black text-rose-700">
                                                        {shift.handoverTransactions.length} Meja Belum Dibayar Saat Shift Ditutup
                                                    </span>
                                                </div>
                                                <p className="text-[9px] font-semibold text-rose-500 pl-1">
                                                    Meja-meja berikut masih aktif/belum dibayar ketika shift ini berakhir. Pembayarannya akan dikreditkan ke shift yang menerima bayaran (shift berikutnya).
                                                </p>
                                                <div className="space-y-1 pl-1">
                                                    {shift.handoverTransactions.map((ht: any, hi: number) => (
                                                        <div key={hi} className="flex items-center justify-between bg-white border border-rose-100 rounded-xl px-2.5 py-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                                                <span className="text-[9px] font-black text-rose-700 uppercase">{ht.tableName}</span>
                                                                <span className="text-[8px] font-bold text-rose-400 font-mono">#{ht.invoiceNumber}</span>
                                                            </div>
                                                            <span className="text-[9px] font-black text-rose-800">Rp {Number(ht.grandTotal).toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-[8px] font-bold text-rose-400/70 pl-1 italic">
                                                    Total estimasi yang di-handover: Rp {shift.handoverTransactions.reduce((s: number, h: any) => s + Number(h.grandTotal), 0).toLocaleString()}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex flex-col lg:flex-row gap-8">
                                            {/* Left: User Info */}
                                            <div className="flex flex-col items-center lg:items-start gap-4 shrink-0 lg:w-1/4 pb-6 lg:pb-0 lg:border-r lg:border-slate-100 mr-2">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center font-black text-white text-2xl shadow-lg ${
                                                        shift.isEmergencyCover
                                                            ? 'bg-orange-500 shadow-orange-200'
                                                            : shift.isWaiter
                                                            ? 'bg-amber-500 shadow-amber-200'
                                                            : 'bg-slate-900 shadow-slate-200'
                                                    }`}>
                                                        {shift.userName.charAt(0)}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h4 className="text-lg font-black text-slate-900 tracking-tight">{shift.userName}</h4>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-widest ${
                                                                shift.isEmergencyCover
                                                                    ? 'bg-orange-100 text-orange-700'
                                                                    : 'bg-indigo-50 text-indigo-600'
                                                            }`}>{shift.shiftName || '—'}</div>
                                                            <div className={`px-2 py-0.5 text-[8px] font-black rounded uppercase tracking-widest border ${!shift.endTime ? 'bg-amber-500 text-white border-amber-600 animate-pulse' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                                {!shift.endTime ? 'OPEN' : 'CLOSED'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex flex-col gap-2 w-full pr-4">
                                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                                                        <div className="flex items-center gap-2"><Clock className="w-3 h-3" /> Start</div>
                                                        <span className={shift.latenessMinutes > 0 ? 'text-rose-500 font-black' : ''}>
                                                            {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            {shift.latenessMinutes > 0 && ` (${shift.latenessMinutes}m terlambat)`}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                                                        <div className="flex items-center gap-2"><Clock className="w-3 h-3" /> End</div>
                                                        <span className={shift.overtimeMinutes > 0 ? 'text-emerald-500 font-black' : ''}>
                                                            {shift.endTime ? new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ACTIVE'}
                                                            {shift.overtimeMinutes > 0 && ` (+${shift.overtimeMinutes}m OT)`}
                                                        </span>
                                                    </div>
                                                    {/* Shift Note */}
                                                    {shift.note && (
                                                        <div className="mt-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Catatan Shift</p>
                                                            <p className="text-[9px] font-semibold text-slate-600 leading-relaxed">{shift.note}</p>
                                                        </div>
                                                    )}
                                                    {shift.attachmentUrl && (
                                                        <div className="pt-2">
                                                            <a
                                                                href={shift.attachmentUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center justify-center gap-2 w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200"
                                                            >
                                                                <Eye className="w-3 h-3 text-emerald-400" />
                                                                Lihat Bukti Closing
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Right: Metrics & Items */}
                                            <div className="flex-1 space-y-8">
                                                {/* Metrics Row */}
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                    {[
                                                        {
                                                            label: 'Modal Awal',
                                                            sub: 'Kas di laci saat mulai shift',
                                                            val: shift.cashStart || 0,
                                                            color: 'indigo'
                                                        },
                                                        {
                                                            label: 'Billiard',
                                                            sub: 'Total tagihan meja billiard yang DIBAYAR di shift ini',
                                                            val: shift.billiardRevenue || 0,
                                                            color: 'sky'
                                                        },
                                                        {
                                                            label: 'Cafe',
                                                            sub: 'Total F&B yang DIBAYAR di shift ini',
                                                            val: shift.cafeRevenue || 0,
                                                            color: 'orange'
                                                        },
                                                        {
                                                            label: 'Cash Sales',
                                                            sub: 'Total uang tunai yang masuk ke laci',
                                                            val: shift.cashRevenue || 0,
                                                            color: 'emerald'
                                                        },
                                                        {
                                                            label: 'Non-Cash',
                                                            sub: 'QRIS / Transfer / Debit yang masuk',
                                                            val: shift.nonCashRevenue || 0,
                                                            color: 'indigo'
                                                        },
                                                        {
                                                            label: 'Expenses',
                                                            sub: 'Pengeluaran kas yang dicatat selama shift',
                                                            val: shift.totalExpenses || 0,
                                                            color: 'rose'
                                                        },
                                                        {
                                                            label: 'Top-up',
                                                            sub: 'Pengisian saldo member',
                                                            val: shift.topUpRevenue || 0,
                                                            color: 'emerald'
                                                        },
                                                        {
                                                            label: 'Rounding',
                                                            sub: 'Pembulatan total tagihan',
                                                            val: shift.roundingAmount || 0,
                                                            color: 'slate'
                                                        },
                                                        {
                                                            label: 'Diff / Selisih',
                                                            sub: shift.discrepancy === 0
                                                                ? '✅ Kas fisik sesuai sistem'
                                                                : shift.discrepancy > 0
                                                                ? '⬆️ Kas fisik LEBIH dari sistem'
                                                                : '⬇️ Kas fisik KURANG dari sistem',
                                                            val: shift.discrepancy,
                                                            color: shift.discrepancy === 0 ? 'emerald' : 'rose'
                                                        }
                                                    ].map((s, i) => (
                                                        <div key={i} className="space-y-0.5">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                                                            <p className={`text-xl font-black tracking-tighter ${
                                                                s.color === 'rose' ? 'text-rose-600'
                                                                : s.color === 'emerald' ? 'text-emerald-600'
                                                                : s.color === 'sky' ? 'text-sky-600'
                                                                : s.color === 'orange' ? 'text-orange-600'
                                                                : 'text-slate-900'
                                                            }`}>
                                                                {s.val < 0 ? '-' : ''}Rp {Math.abs(s.val).toLocaleString()}
                                                            </p>
                                                            <p className="text-[8px] font-semibold text-slate-300 leading-tight">{s.sub}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Shift Details: Payment, Packages, Tables, Items & Waiter Performance */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                                                    {/* Payment Breakdown */}
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Payment Methods</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {Object.entries(shift.paymentMethods || {}).map(([m, val]: [string, any], i) => (
                                                                <div key={i} className={`px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-1 ${m === 'CASH' ? 'w-full sm:w-[calc(50%-0.25rem)]' : 'w-full sm:w-auto'}`}>
                                                                    <div className="flex items-center gap-3 justify-between w-full">
                                                                        <span className="text-[9px] font-black text-slate-500 uppercase">{m} {m === 'CASH' && '(Omset Bersih)'}</span>
                                                                        <span className="text-xs font-black text-slate-900">Rp {Number(val).toLocaleString()}</span>
                                                                    </div>
                                                                    {m === 'CASH' && (
                                                                        <div className="mt-1 pt-1 border-t border-slate-200 flex justify-between gap-2 text-[8px] font-bold">
                                                                            <span className="text-emerald-600">Terima: Rp {Number(shift.totalTenderedCash || val).toLocaleString()}</span>
                                                                            <span className="text-rose-500">Kembali: Rp {Number(shift.totalChangeMoney || 0).toLocaleString()}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {Object.keys(shift.paymentMethods || {}).length === 0 && <span className="text-[10px] text-slate-400 italic">—</span>}
                                                        </div>
                                                    </div>

                                                    {/* Popular Packages */}
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                            <LayoutDashboard className="w-3 h-3 text-indigo-500" /> Popular Packages
                                                        </p>
                                                        {(shift.topPackages || []).length > 0 ? (
                                                            <div className="space-y-1.5">
                                                                {shift.topPackages.map((pkg: any, i: number) => (
                                                                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
                                                                        <span className="text-[9px] font-bold text-indigo-700 truncate max-w-[55%]">{pkg.name}</span>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <span className="text-[10px] font-black text-indigo-800">{pkg.count}x</span>
                                                                            <span className="text-[9px] text-indigo-500 font-bold">Rp {Number(pkg.revenue || 0).toLocaleString()}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : <span className="text-[10px] text-slate-400 italic">—</span>}
                                                    </div>

                                                    {/* Table Performance */}
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                            <LayoutDashboard className="w-3 h-3 text-violet-500" /> Table Performance
                                                        </p>
                                                        {(shift.tablePerformance || []).length > 0 ? (
                                                            <div className="space-y-1.5">
                                                                {shift.tablePerformance.map((tp: any, i: number) => (
                                                                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-violet-50 rounded-xl border border-violet-100">
                                                                        <span className="text-[9px] font-bold text-violet-700">{tp.name}</span>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <span className="text-[9px] text-violet-500 font-bold">{tp.sessions} sesi</span>
                                                                            <span className="text-[10px] font-black text-violet-800">Rp {Number(tp.revenue || 0).toLocaleString()}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : <span className="text-[10px] text-slate-400 italic">—</span>}
                                                    </div>

                                                    {/* Cafe Items Sold (with notes) */}
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                            <Flame className="w-3 h-3 text-rose-500" /> Cafe Items Sold
                                                        </p>
                                                        {(shift.topItems || []).length > 0 ? (
                                                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                                                {(Object.entries(
                                                                    (shift.topItems || []).reduce((acc: any, it: any) => {
                                                                        const cat = it.category || 'Lainnya';
                                                                        if (!acc[cat]) acc[cat] = [];
                                                                        acc[cat].push(it);
                                                                        return acc;
                                                                    }, {})
                                                                ) as [string, any[]][]).map(([category, items], ci: number) => (
                                                                    <div key={ci} className="space-y-1">
                                                                        <p className="text-[7px] font-black text-rose-400 uppercase tracking-tighter pl-1">{category}</p>
                                                                        {items.map((item, i: number) => (
                                                                            <div key={i} className="px-3 py-1.5 bg-rose-50 rounded-xl border border-rose-100">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="text-[9px] font-bold text-rose-700 truncate max-w-[70%]">{item.name}</span>
                                                                                    <span className="text-[10px] font-black text-rose-800 shrink-0">{item.qty}x</span>
                                                                                </div>
                                                                                {item.notes && item.notes.length > 0 && (
                                                                                    <p className="text-[8px] text-rose-400/80 mt-0.5 italic truncate">
                                                                                        {Array.from(new Set(item.notes as string[])).join(' • ')}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : <span className="text-[10px] text-slate-400 italic">—</span>}
                                                    </div>

                                                    {/* Waiter/Staff Account Performance */}
                                                    {(shift.waiterPerformance || []).length > 0 && (
                                                        <div className="md:col-span-2 pt-4 border-t border-slate-100">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                <User className="w-3 h-3 text-amber-500" /> Account Activity — Waiter/Staff Sales in Shift
                                                            </p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {shift.waiterPerformance.map((wp: any, wi: number) => (
                                                                    <div key={wi} className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 space-y-3">
                                                                        <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                                                                            <span className="text-xs font-black text-amber-800">{wp.name}</span>
                                                                            <span className="text-xs font-black text-slate-900">Rp {Number(wp.revenue || 0).toLocaleString()}</span>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-3">
                                                                            <div>
                                                                                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Packages</p>
                                                                                {Object.values(wp.packageCounts || {}).length > 0
                                                                                    ? (Object.values(wp.packageCounts) as any[]).slice(0, 3).map((p, pi: number) => (
                                                                                        <div key={pi} className="flex justify-between text-[9px]">
                                                                                            <span className="text-slate-600 truncate max-w-[70%]">{p.name}</span>
                                                                                            <span className="font-black text-indigo-600">{p.count}x</span>
                                                                                        </div>
                                                                                    ))
                                                                                    : <span className="text-[9px] text-slate-400">—</span>}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Items Per Kategori</p>
                                                                                {Object.values(wp.itemCounts || {}).length > 0 ? (
                                                                                    <div className="space-y-2">
                                                                                        {(Object.entries(
                                                                                            (Object.values(wp.itemCounts) as any[]).reduce((acc: any, it: any) => {
                                                                                                const cat = it.category || 'Lainnya';
                                                                                                if (!acc[cat]) acc[cat] = [];
                                                                                                acc[cat].push(it);
                                                                                                return acc;
                                                                                            }, {})
                                                                                        ) as [string, any[]][]).map(([category, items], ci: number) => (
                                                                                            <div key={ci} className="space-y-0.5">
                                                                                                <p className="text-[7px] font-black text-amber-500/70 uppercase tracking-tighter">{category}</p>
                                                                                                {items.map((it, ii: number) => (
                                                                                                    <div key={ii} className="flex justify-between text-[9px] border-b border-amber-100/30 pb-0.5 last:border-0">
                                                                                                        <span className="text-slate-600 truncate max-w-[75%]">{it.name}</span>
                                                                                                        <span className="font-black text-amber-600">{it.qty}x</span>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-[9px] text-slate-400">—</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex justify-between text-[9px] font-bold text-slate-500 pt-1 border-t border-amber-100">
                                                                            <span>Billiard: Rp {Number(wp.billiardRevenue || 0).toLocaleString()}</span>
                                                                            <span>Cafe: Rp {Number(wp.cafeRevenue || 0).toLocaleString()}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Stock Audit Discrepancy Summary */}
                                                    {(shift.stockReports || []).length > 0 && (
                                                        <div className="md:col-span-2 pt-4 border-t border-slate-100">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                <PackageSearch className="w-3 h-3 text-indigo-500" /> Stock Audit Performance — Reported Discrepancies
                                                            </p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                                {shift.stockReports.map((sr: any, sri: number) => {
                                                                    const disc = Number(sr.discrepancy || 0);
                                                                    if (disc === 0) return null;
                                                                    return (
                                                                        <div key={sri} className={`px-3 py-2 rounded-xl border flex flex-col justify-center ${disc < 0 ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
                                                                            <div className="flex justify-between items-start gap-2">
                                                                                <span className={`text-[9px] font-black truncate ${disc < 0 ? 'text-rose-700' : 'text-amber-700'}`}>{sr.itemName}</span>
                                                                                <span className={`text-[10px] font-black shrink-0 ${disc < 0 ? 'text-rose-800' : 'text-amber-800'}`}>{disc > 0 ? '+' : ''}{disc}</span>
                                                                            </div>
                                                                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{sr.department || 'STOCK'} • {sr.unit}</p>
                                                                        </div>
                                                                    );
                                                                })}
                                                                {shift.stockReports.every((sr: any) => Number(sr.discrepancy || 0) === 0) && (
                                                                    <div className="col-span-full px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Semua Stok Akurat (No Discrepancy)</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* View Stock Report Button */}
                                                    <div className="md:col-span-2 pt-2">
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const res = await axios.get(`/finance/shifts/${shift.shiftId}/stock-reports`);
                                                                    if (res.data.length === 0) {
                                                                        alert("Tidak ada laporan stok untuk shift ini (Staff mungkin tidak melaporkan stock / staff Waiter)");
                                                                        return;
                                                                    }
                                                                    setCurrentStockReport(res.data);
                                                                    setModalUser(shift.userName);
                                                                    setShowStockModal(true);
                                                                } catch (err) {
                                                                    alert("Gagal mengambil laporan stok.");
                                                                }
                                                            }}
                                                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                                                        >
                                                            <PackageSearch className="w-3 h-3" /> Lihat Laporan Stok
                                                        </button>
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
                                                        await axios.post(`/finance/shifts/business-day/${report.businessDay.id}/close`, {});
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
                        {/* Print Only Summary Table */}
                        <div className="print-only mt-10">
                            <h3 className="text-lg font-black text-slate-900 border-b-2 border-slate-900 pb-2 mb-4 uppercase tracking-tighter">Ringkasan Loyalty & Point Reward</h3>
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Statistik Poin</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between border-b border-slate-100 pb-1">
                                            <span className="text-xs font-bold text-slate-600">Total Poin Diterbitkan</span>
                                            <span className="text-xs font-black text-slate-900">{(report.summary.totalAwardedPoints || 0).toLocaleString()} Pts</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-100 pb-1">
                                            <span className="text-xs font-bold text-slate-600">Total Poin Ditukarkan</span>
                                            <span className="text-xs font-black text-rose-600">-{(report.summary.totalPointsRedeemed || 0).toLocaleString()} Pts</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Item Reward Tertukar</p>
                                    <div className="space-y-1">
                                        {(report.summary.redemptionBreakdown || []).map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between text-[10px]">
                                                <span className="text-slate-600 font-bold">{item.count}x {item.name}</span>
                                                <span className="text-slate-900 font-black">{(item.points || 0).toLocaleString()} Pts</span>
                                            </div>
                                        ))}
                                        {(report.summary.redemptionBreakdown || []).length === 0 && <p className="text-[10px] text-slate-300 italic">Tidak ada penukaran</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Audit Signature Section (Only visible in Print) */}
                        <div className="print-only mt-20 pt-10 border-t-2 border-slate-900">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-16 text-center">Audit & Authorization Verification</p>
                            <div className="flex justify-between gap-12 px-10">
                                <div className="flex-1 space-y-20 text-center">
                                    <div className="h-px bg-slate-400 w-full mx-auto" />
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase">Prepared By</p>
                                        <p className="text-[9px] font-bold text-slate-500 mt-1 italic uppercase">Active Cashier / Manager</p>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-20 text-center">
                                    <div className="h-px bg-slate-400 w-full mx-auto" />
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase">Verified By</p>
                                        <p className="text-[9px] font-bold text-slate-500 mt-1 italic uppercase">Operational Supervisor</p>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-20 text-center">
                                    <div className="h-px bg-slate-400 w-full mx-auto" />
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase">Approved By</p>
                                        <p className="text-[9px] font-bold text-slate-500 mt-1 italic uppercase">General Manager / Owner</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-24 text-center border-t border-slate-100 pt-6">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">SYSTEM POWERED BY VOC_CENTER_ENGINEERING • {new Date().getFullYear()}</p>
                            </div>
                        </div>
                    </>
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

            {/* Stock Report Modal */}
            {showStockModal && (
                <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="absolute inset-0 bg-slate-900/80  animate-in fade-in duration-300" onClick={() => setShowStockModal(false)} />
                    <div className="relative bg-white w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
                        <div className="p-6 sm:p-8 pt-4 pb-4 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0">
                            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden shrink-0 self-center" />
                            <div className="flex justify-between items-center w-full">
                                <div>
                                    <h3 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-3">
                                        <PackageSearch className="w-5 sm:w-6 h-5 sm:h-6 text-amber-500" />
                                        Laporan Stok Shift
                                    </h3>
                                    <p className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">Oleh: {modalUser}</p>
                                </div>
                                <button onClick={() => setShowStockModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all shrink-0">
                                    <X className="w-5 sm:w-6 h-5 sm:h-6" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto overflow-x-auto p-6 sm:p-8 custom-scrollbar">
                            <table className="w-full text-left min-w-[500px]">
                                <thead>
                                    <tr className="border-b-2 border-slate-100">
                                        <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name</th>
                                        <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">System</th>
                                        <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Physical</th>
                                        <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Diff</th>
                                        <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Lost Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(
                                        currentStockReport.reduce((acc: Record<string, any[]>, r) => {
                                            const dept = r.department || 'LAINNYA';
                                            if (!acc[dept]) acc[dept] = [];
                                            acc[dept].push(r);
                                            return acc;
                                        }, {})
                                    ).map(([dept, items], groupIdx) => (
                                        <React.Fragment key={dept}>
                                            <tr className="bg-slate-50/50">
                                                <td colSpan={5} className="py-2 px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-y border-slate-100 italic">
                                                    DEPARTEMEN: {dept}
                                                </td>
                                            </tr>
                                            {items.map((r, i) => (
                                                <tr key={i} className="border-b border-slate-50 group hover:bg-slate-50 transition-all">
                                                    <td className="py-4 pl-4 font-black text-slate-900 uppercase text-xs">
                                                        <div className="flex items-center gap-2">
                                                            {r.itemName}
                                                            {(r.isHighValue || (r as any).isHighValue) && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 text-center font-bold text-slate-400 text-xs">{r.systemStock} {r.unit}</td>
                                                    <td className="py-4 text-center font-black text-slate-900 text-sm">{r.physicalStock} {r.unit}</td>
                                                    <td className={`py-4 text-right font-black text-sm ${r.discrepancy < 0 ? 'text-rose-500' : r.discrepancy > 0 ? 'text-indigo-500' : 'text-emerald-500'}`}>
                                                        {r.discrepancy > 0 ? `+${r.discrepancy}` : r.discrepancy}
                                                    </td>
                                                    <td className="py-4 text-right pr-4 font-black text-rose-500 text-xs">
                                                        {Number(r.lostValue) > 0 ? `Rp ${Number(r.lostValue).toLocaleString()}` : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                                {currentStockReport.some(r => Number(r.lostValue) > 0) && (
                                    <tfoot>
                                        <tr className="bg-rose-50/50">
                                            <td colSpan={4} className="py-4 px-4 text-right text-[10px] font-black text-rose-400 uppercase tracking-widest">Total Kerugian Stok</td>
                                            <td className="py-4 text-right pr-4 font-black text-rose-600 text-sm">
                                                Rp {currentStockReport.reduce((acc, curr) => acc + Number(curr.lostValue || 0), 0).toLocaleString()}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                        <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-100 pb-[calc(1.5rem+env(safe-area-inset-bottom,20px))] sm:pb-8 shrink-0">
                            <button
                                onClick={() => setShowStockModal(false)}
                                className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-800 transition-all shadow-sm"
                            >
                                Tutup Laporan
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Custom Range WhatsApp Modal */}
            {showCustomRangeModal && (
                <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="absolute inset-0 bg-slate-900/80  animate-in fade-in duration-300" onClick={() => setShowCustomRangeModal(false)} />
                    <div className="relative bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 max-h-[85vh] flex flex-col">
                        <div className="p-6 sm:p-10 pt-4 sm:pt-10 flex-1 overflow-y-auto no-scrollbar pb-[calc(2rem+env(safe-area-inset-bottom,20px))] sm:pb-10">
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden shrink-0" />
                            <div className="flex items-center gap-4 sm:gap-5 mb-8 sm:mb-10">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-600 rounded-[1rem] sm:rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100 shrink-0">
                                    <Clock className="w-6 h-6 sm:w-8 sm:h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight uppercase italic">Laporan Kustom</h3>
                                    <p className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mt-1">Pilih Rentang Jam & Tanggal Bebas</p>
                                </div>
                            </div>

                            <div className="space-y-10">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Mulai Tanggal</label>
                                        <input 
                                            type="date"
                                            value={rangeForm.startDate}
                                            onChange={(e) => setRangeForm({ ...rangeForm, startDate: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:border-indigo-600 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Jam Mulai</label>
                                        <input 
                                            type="time"
                                            value={rangeForm.startTime}
                                            onChange={(e) => setRangeForm({ ...rangeForm, startTime: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:border-indigo-600 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Selesai Tanggal</label>
                                        <input 
                                            type="date"
                                            value={rangeForm.endDate}
                                            onChange={(e) => setRangeForm({ ...rangeForm, endDate: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:border-indigo-600 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Jam Selesai</label>
                                        <input 
                                            type="time"
                                            value={rangeForm.endTime}
                                            onChange={(e) => setRangeForm({ ...rangeForm, endTime: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:border-indigo-600 transition-all"
                                        />
                                    </div>
                                </div>
                                                         <div className="flex gap-4 mt-10">
                                    <button 
                                        onClick={() => setShowCustomRangeModal(false)}
                                        className="flex-1 py-4 sm:py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        onClick={handleSendCustomRangeWhatsApp}
                                        disabled={sendingWa}
                                        className="flex-[2] py-4 sm:py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 sm:gap-3 shadow-lg shadow-indigo-200"
                                    >
                                        {sendingWa ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />}
                                        {sendingWa ? 'Mengirim...' : 'Kirim Laporan'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
