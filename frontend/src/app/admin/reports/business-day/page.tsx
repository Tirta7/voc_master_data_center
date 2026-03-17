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
    PackageSearch
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

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtK = (n: number) => fmt(n);

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

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    useEffect(() => {
        setIsMounted(true);
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
            await axios.post(`${API_URL}/reports/whatsapp-manual`, { 
                phone: settings.ownerPhone,
                start: report.businessDay.startTime,
                end: report.businessDay.endTime || new Date().toISOString()
            }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
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
            await axios.post(`${API_URL}/reports/whatsapp-manual`, { 
                phone: settings.ownerPhone,
                start: start.toISOString(),
                end: end.toISOString()
            }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
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

    const sortedDays = [...businessDays].sort((a, b) => b.id - a.id);
    const selectedDay = businessDays.find(d => d.id === selectedDayId);

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

    const getBreakdownShifts = () => {
        if (!report || !report.shifts) return [];
        return report.shifts.filter((s: any) => {
            const role = (s.userRole || '').toUpperCase();
            return role.includes('KASIR') || role.includes('CASHIER');
        });
    };

    const breakdownShifts = getBreakdownShifts();

    const getMethodStats = () => {
        if (!report) return {};
        // Use global summary payment methods if available (more accurate as it includes non-shift tx)
        if (report.summary && report.summary.paymentMethods) {
            return report.summary.paymentMethods;
        }
        if (!report.shifts) return {};
        const stats: any = {};
        report.shifts.forEach((s: any) => {
            Object.entries(s.paymentMethods || {}).forEach(([method, amount]) => {
                stats[method] = (stats[method] || 0) + Number(amount);
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
        <div className="flex flex-col lg:flex-row h-screen bg-slate-100 overflow-hidden font-sans">
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

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
                    {loading ? (
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
                                        <div className={`mt-3 pt-3 border-t ${selectedDayId === day.id ? 'border-indigo-500/30' : 'border-slate-50'} flex items-center justify-between text-[8px] font-black uppercase tracking-[0.1em] ${selectedDayId === day.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                                            <div className="flex items-center gap-1.5 grayscale opacity-70">
                                                <Clock className="w-2 h-2" />
                                                {new Date(day.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {day.endTime ? new Date(day.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ACTIVE'}
                                            </div>
                                            <div className={`px-2 py-0.5 rounded ${selectedDayId === day.id ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-900 border border-slate-100 font-bold'}`}>
                                                RP {Number(day.totalRevenue).toLocaleString()}
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
                {loadingReport ? (
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { label: 'Total Revenue', value: Number(report.summary.totalRevenue), icon: DollarSign, color: 'indigo', trend: report.summary.transactionCount + ' Tx' },
                                    { label: 'Billiard Income', value: Number(report.summary.billiardRevenue || 0), icon: LayoutDashboard, color: 'sky', trend: 'Revenue Source' },
                                    { label: 'Cafe Income', value: Number(report.summary.cafeRevenue || 0), icon: Utensils, color: 'orange', trend: 'Revenue Source' },
                                    {
                                        label: 'Cash Entry',
                                        value: Number(methodStats?.['CASH'] || 0),
                                        icon: Wallet, color: 'emerald', trend: 'Bankable'
                                    },
                                    { label: 'Top-up Member', value: Number(report.summary.topUpRevenue || 0), icon: CreditCard, color: 'emerald', trend: 'Balance Intake' },
                                    { label: 'Points Issued', value: Number(report.summary.totalAwardedPoints || 0), icon: Star, color: 'amber', trend: 'Loyalty Growth', unit: 'Pts' },
                                    { label: 'Points Redeemed', value: Number(report.summary.totalPointsRedeemed || 0), icon: Gift, color: 'rose', trend: 'Reward Usage', unit: 'Pts' },
                                    { label: 'Taxes & Service', value: Number(report.summary.totalVat || 0) + Number(report.summary.totalService || 0), icon: Receipt, color: 'indigo', trend: 'Gov & Fixed' },
                                ].map((card, i) => (
                                    <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 relative overflow-hidden">
                                        <div className={`absolute -top-4 -right-4 w-16 h-16 bg-${card.color}-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform`} />
                                        <div className="flex items-center gap-3 mb-4 text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                            <div className={`w-8 h-8 rounded-xl bg-${card.color}-50 flex items-center justify-center shadow-sm`}>
                                                <card.icon className={`w-4 h-4 text-${card.color}-600`} />
                                            </div>
                                            {card.label}
                                        </div>
                                        <h3 className={`text-3xl font-black tracking-tighter text-slate-900`}>
                                            {card.unit === 'Pts' ? (
                                                <>
                                                    <span className="text-sm font-bold text-slate-300 mr-1.5">Pts</span>
                                                    {card.value.toLocaleString()}
                                                </>
                                            ) : (
                                                fmtK(card.value)
                                            )}
                                        </h3>
                                        <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-4">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full bg-${card.color}-400`} />
                                                {card.trend}
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
                                        )}
                                    </div>
                                </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Best Selling Items Day */}
                                        <div className="bg-white rounded-3xl border-2 border-slate-100 p-6 lg:p-8 shadow-sm">
                                            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-6 font-display">
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
                                                                <span className="font-bold text-slate-700 uppercase text-xs truncate max-w-[150px]">{item.name}</span>
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

                                        {/* Top Waiters Day */}
                                        <div className="bg-white rounded-3xl border-2 border-slate-100 p-6 lg:p-8 shadow-sm">
                                            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-6 font-display">
                                                <User className="w-5 h-5 text-indigo-600" />
                                                Rank Pelayan (Today)
                                            </h3>
                                            <div className="space-y-4">
                                                {(report.summary.topWaiters || []).length > 0 ? (
                                                    report.summary.topWaiters.map((waiter: any, idx: number) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-xs text-slate-400 border border-slate-100">
                                                                    {idx + 1}
                                                                </div>
                                                                <span className="font-bold text-slate-700 uppercase text-xs">{waiter.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-black text-emerald-600">{waiter.count}</span>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Transaksi</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-48 text-slate-300">
                                                        <User className="w-12 h-12 opacity-20 mb-3" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest">Belum ada data transaksi</p>
                                                    </div>
                                                )}
                                            </div>
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
                                                                                <span>@Rp{Number(seg.ratePerHour || 0).toLocaleString()}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* F&B Details */}
                                                        {tx.orderItems?.length > 0 && (
                                                            <div className="bg-amber-50/50 p-2 rounded-xl border border-amber-100/50">
                                                                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                                    <Utensils className="w-2.5 h-2.5" /> Orders ({tx.orderItems.length})
                                                                </p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {tx.orderItems.map((oi: any, idx: number) => (
                                                                        <span key={idx} className="text-[8px] font-black bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-tighter">
                                                                            {oi.quantity}x {oi.menuItem?.name || oi.customName}
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

                                                        {!tx.startTime && (!tx.orderItems || tx.orderItems.length === 0) && tx.type !== 'TOPUP' && (
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

                            <div className="md:hidden space-y-4">
                                {filteredTransactions.map((tx: any) => (
                                    <div key={tx.id} className="bg-white p-5 rounded-[2rem] border-2 border-slate-100 shadow-sm active:scale-[0.98] transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${tx.type === 'TOPUP' ? 'bg-emerald-500' : tx.type === 'BILLIARD' ? 'bg-indigo-500' : 'bg-orange-500'}`} />
                                                    <p className="text-sm font-black text-slate-900 leading-none">#{tx.invoiceNumber || tx.id}</p>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                                    {new Date(tx.createdAt).toLocaleTimeString()} • {tx.type}
                                                </p>
                                            </div>
                                            <button onClick={() => setReprintTxId(tx.id)} className="p-2 bg-slate-50 rounded-xl text-slate-400 border border-slate-100 shadow-sm">
                                                <Printer className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Customer</p>
                                                <p className="text-xs font-black text-slate-800 truncate uppercase leading-tight">{tx.customerName || 'Tamu Umum'}</p>
                                                {tx.createdBy && (
                                                    <p className="text-[7px] font-black text-slate-400 uppercase mt-1 flex items-center gap-1">
                                                        By: {tx.createdBy.name}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-right">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Area / Table</p>
                                                <p className="text-xs font-black text-slate-800 truncate uppercase">{tx.table?.tableName || tx.cafeTable?.tableName || tx.sessionType || 'Area Cafe'}</p>
                                            </div>
                                        </div>

                                        {/* Mobile Specific Details */}
                                        <div className="space-y-3 mb-4">
                                            {tx.startTime && (
                                                <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50">
                                                    <p className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Session Duration</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black text-indigo-900">{new Date(tx.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {tx.endTime ? new Date(tx.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'NOW'}</span>
                                                        <span className="text-[10px] font-black bg-white px-2 rounded-lg border border-indigo-100 text-indigo-600">{tx.sessionDuration || '-'}</span>
                                                    </div>
                                                    {/* Mobile Detailed Segments Breakdown */}
                                                    {Array.isArray(tx.billingDetails) && tx.billingDetails.length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-indigo-100/30 space-y-1">
                                                            {tx.billingDetails.map((seg: any, sidx: number) => (
                                                                <div key={sidx} className="flex justify-between text-[8px] font-bold text-indigo-400/80 uppercase">
                                                                    <span>• {seg.title || 'Segment'}</span>
                                                                    <span>Rp{Number(seg.subtotal || 0).toLocaleString()}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {tx.orderItems?.length > 0 && (
                                                <div className="bg-amber-50/50 rounded-2xl border border-amber-100/50 p-3">
                                                    <p className="text-[8px] font-black text-amber-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-1">
                                                        <Utensils className="w-2.5 h-2.5" /> Order Items ({tx.orderItems.length})
                                                    </p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {tx.orderItems.map((oi: any, idx: number) => (
                                                            <span key={idx} className="text-[8px] font-black bg-white text-slate-500 px-1.5 py-1 rounded-lg border border-slate-100 uppercase tracking-tighter">
                                                                {oi.quantity}x {oi.menuItem?.name || oi.customName}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {(Array.isArray(tx.paymentDetails) ? tx.paymentDetails : (tx.paymentDetails ? [tx.paymentDetails] : [])).map((p: any, idx: number) => {
                                                const method = (p?.method || 'UNKNOWN').toUpperCase();
                                                const isMember = method === 'MEMBER' || method === 'MEMBERSHIP';
                                                return (
                                                    <span key={idx} className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${isMember
                                                        ? 'bg-violet-600 text-white shadow-violet-200'
                                                        : 'bg-slate-900 text-white shadow-slate-200'
                                                        }`}>
                                                        {isMember ? 'MEMBERSHIP' : method}
                                                        {Number(p?.amount) > 0 && <span className="opacity-40 border-l pl-1">Rp {Number(p.amount).toLocaleString()}</span>}
                                                    </span>
                                                );
                                            })}
                                        </div>

                                        <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                                            <div>
                                                {Number(tx.discountAmount) > 0 && (
                                                    <p className="text-[8px] font-black text-rose-500 uppercase bg-rose-50 px-1 rounded flex items-center gap-1 mb-1">
                                                        Disc: -Rp {Number(tx.discountAmount).toLocaleString()}
                                                    </p>
                                                )}
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Transaction</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-slate-900 leading-none tracking-tight">Rp {Number(tx.grandTotal).toLocaleString()}</p>
                                                <p className={`text-[8px] font-black uppercase mt-1 ${tx.status === 'PAID' ? 'text-emerald-500' : 'text-rose-500'}`}>{tx.status}</p>
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
                                                        <div className="flex items-center gap-2">
                                                            <div className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded uppercase tracking-widest">{shift.shiftName}</div>
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
                                                        { label: 'Rounding', val: shift.roundingAmount || 0, color: 'slate' },
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

                                                {/* Shift Details: Payment, Packages, Tables, Items & Waiter Performance */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                                                    {/* Payment Breakdown */}
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Payment Methods</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {Object.entries(shift.paymentMethods || {}).map(([m, val]: [string, any], i) => (
                                                                <div key={i} className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                                                                    <span className="text-[9px] font-black text-slate-500 uppercase">{m}</span>
                                                                    <span className="text-xs font-black text-slate-900">Rp {Number(val).toLocaleString()}</span>
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
                                                                {shift.topItems.map((item: any, i: number) => (
                                                                    <div key={i} className="px-3 py-2 bg-rose-50 rounded-xl border border-rose-100">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[9px] font-bold text-rose-700 truncate max-w-[65%]">{item.name}</span>
                                                                            <span className="text-[10px] font-black text-rose-800 shrink-0">{item.qty}x</span>
                                                                        </div>
                                                                        {item.notes && item.notes.length > 0 && (
                                                                            <p className="text-[8px] text-rose-400 mt-0.5 italic truncate">
                                                                                {Array.from(new Set(item.notes as string[])).join(' • ')}
                                                                            </p>
                                                                        )}
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
                                                                                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Items</p>
                                                                                {Object.values(wp.itemCounts || {}).length > 0
                                                                                    ? (Object.values(wp.itemCounts) as any[]).slice(0, 3).map((it, ii: number) => (
                                                                                        <div key={ii} className="flex justify-between text-[9px]">
                                                                                            <span className="text-slate-600 truncate max-w-[70%]">{it.name}</span>
                                                                                            <span className="font-black text-amber-600">{it.qty}x</span>
                                                                                        </div>
                                                                                    ))
                                                                                    : <span className="text-[9px] text-slate-400">—</span>}
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

                                                    {/* View Stock Report Button */}
                                                    <div className="md:col-span-2 pt-2">
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const res = await axios.get(`${API_URL}/finance/shifts/${shift.shiftId}/stock-reports`, {
                                                                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                                                                    });
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
                )
                }
            </main>

            <TransactionReprintModal
                isOpen={!!reprintTxId}
                onClose={() => setReprintTxId(null)}
                transactionId={reprintTxId}
            />

            {/* Stock Report Modal */}
            {showStockModal && (
                <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowStockModal(false)} />
                    <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                                    <PackageSearch className="w-6 h-6 text-amber-500" />
                                    Laporan Stok Shift
                                </h3>
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">Oleh: {modalUser}</p>
                            </div>
                            <button onClick={() => setShowStockModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <table className="w-full text-left">
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
                                    {currentStockReport.map((r, i) => (
                                        <tr key={i} className="border-b border-slate-50 group hover:bg-slate-50 transition-all">
                                            <td className="py-4 font-black text-slate-900 uppercase text-xs">{r.itemName}</td>
                                            <td className="py-4 text-center font-bold text-slate-400 text-xs">{r.systemStock}</td>
                                            <td className="py-4 text-center font-black text-slate-900 text-sm">{r.physicalStock}</td>
                                            <td className={`py-4 text-right font-black text-sm ${r.discrepancy < 0 ? 'text-rose-500' : r.discrepancy > 0 ? 'text-indigo-500' : 'text-emerald-500'}`}>
                                                {r.discrepancy > 0 ? `+${r.discrepancy}` : r.discrepancy}
                                            </td>
                                            <td className="py-4 text-right font-black text-rose-500 text-xs">
                                                {Number(r.lostValue) > 0 ? `Rp ${Number(r.lostValue).toLocaleString()}` : '—'}
                                            </td>
                                        </tr>
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
                        <div className="p-8 bg-slate-50 border-t border-slate-100">
                            <button
                                onClick={() => setShowStockModal(false)}
                                className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-800 transition-all"
                            >
                                Tutup Laporan
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Custom Range WhatsApp Modal */}
            {showCustomRangeModal && (
                <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowCustomRangeModal(false)} />
                    <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                        <div className="p-10">
                            <div className="flex items-center gap-5 mb-10">
                                <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                                    <Clock className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Laporan Kustom</h3>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Pilih Rentang Jam & Tanggal Bebas</p>
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

                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setShowCustomRangeModal(false)}
                                        className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        onClick={handleSendCustomRangeWhatsApp}
                                        disabled={sendingWa}
                                        className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {sendingWa ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
                                        {sendingWa ? 'Mengirim...' : 'Kirim Ke WhatsApp'}
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
