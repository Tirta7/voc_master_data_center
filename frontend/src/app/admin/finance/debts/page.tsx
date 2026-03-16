'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
    Search,
    CreditCard,
    User,
    Calendar,
    ChevronRight,
    Loader2,
    ArrowUpRight,
    ArrowDownLeft,
    Wallet,
    TrendingUp,
    Clock,
    Utensils,
    BaggageClaim,
    MoreHorizontal,
    ShieldOff,
    SearchX,
    Hash
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtK = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1000000000) return `Rp ${(n / 1000000000).toFixed(abs % 1000000000 === 0 ? 0 : 1)}B`;
    if (abs >= 1000000) return `Rp ${(n / 1000000).toFixed(abs % 1000000 === 0 ? 0 : 1)}M`;
    if (abs >= 1000) return `Rp ${(n / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}K`;
    return fmt(n);
};

export default function DebtsPage() {
    const { hasPermission } = useAuth();
    const router = useRouter();
    const [debts, setDebts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchDebts();
    }, []);

    const fetchDebts = async () => {
        try {
            const res = await axios.get(`${API_URL}/transactions/debt`);
            setDebts(res.data);
        } catch (err) {
            console.error('Failed to load debts', err);
        } finally {
            setLoading(false);
        }
    };

    const totalPiutang = debts.reduce((sum, d) => sum + Number(d.grandTotal), 0);
    const totalTerbayar = debts.reduce((sum, d) => sum + Number(d.paidAmount || 0), 0);
    const totalSisa = totalPiutang - totalTerbayar;

    const filteredDebts = debts.filter(debt =>
        debt.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (debt.customerName && debt.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (!hasPermission('FIN_DEBTS')) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6 border-2 border-rose-100 shadow-xl shadow-rose-100/50">
                    <ShieldOff className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase">Akses Terbatas</h2>
                <p className="text-slate-500 max-w-sm font-medium">Anda tidak memiliki izin untuk mengelola data piutang / bon.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/40 pb-20">
            <div className="p-4 lg:p-10 max-w-7xl mx-auto space-y-8">

                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-800 via-indigo-700 to-slate-900 rounded-3xl p-8 lg:p-10 text-white shadow-2xl shadow-indigo-200">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12" />
                    <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <BaggageClaim className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Debt Monitoring</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Piutang & Bon</h1>
                            <p className="text-white/60 text-sm font-semibold mt-1">Monitor tagihan "Bayar Nanti" yang belum terlunasi secara real-time</p>
                            <div className="flex flex-wrap gap-3 mt-5">
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                    📅 {filteredDebts.length} Tagihan Aktif
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                    💰 Sisa: {fmtK(totalSisa)}
                                </div>
                            </div>
                        </div>

                        <div className="w-full lg:w-80">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                                <input
                                    type="text"
                                    placeholder="Cari invoice / pelanggan..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/20 backdrop-blur-sm border border-white/20 rounded-2xl font-bold text-white text-sm placeholder:text-white/50 focus:outline-none focus:bg-white/30"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { label: 'TOTAL PIUTANG', value: fmtK(totalPiutang), icon: '💳', gradient: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-700' },
                        { label: 'TERBAYAR', value: fmtK(totalTerbayar), icon: '📈', gradient: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700' },
                        { label: 'SISA TAGIHAN', value: fmtK(totalSisa), icon: '⏱️', gradient: 'from-rose-500 to-rose-600', light: 'bg-rose-50', text: 'text-rose-700' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-3xl p-5 lg:p-6 border border-slate-100 shadow-lg shadow-slate-100/60 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`w-10 h-10 ${s.light} rounded-2xl flex items-center justify-center text-lg`}>{s.icon}</div>
                                <div className={`h-1 w-8 rounded-full bg-gradient-to-r ${s.gradient}`} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                            <p className={`text-xl font-black ${s.text} leading-tight`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="font-black text-indigo-600 uppercase tracking-widest text-[10px]">Sinkronisasi Piutang...</p>
                    </div>
                ) : filteredDebts.length === 0 ? (
                    <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-20 text-center">
                        <SearchX className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-slate-900 mb-2">Semua Tagihan Beres!</h3>
                        <p className="text-slate-400 max-w-sm mx-auto font-medium">Tidak ada transaksi bertipe "Bayar Nanti" yang perlu ditagih.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 lg:gap-8">
                        {filteredDebts.map((debt) => {
                            const isPartial = Number(debt.paidAmount) > 0;
                            const remaining = Math.max(0, Number(debt.grandTotal) - Number(debt.paidAmount || 0));
                            const payProgress = Math.min(100, (Number(debt.paidAmount) / Number(debt.grandTotal)) * 100);

                            return (
                                <div key={debt.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col group hover:scale-[1.02] transition-all duration-300">
                                    <div className="p-6 lg:p-8 flex justify-between items-start border-b border-slate-50">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full animate-pulse ${isPartial ? 'bg-indigo-500' : 'bg-rose-500'}`} />
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${isPartial ? 'text-indigo-600' : 'text-rose-600'}`}>
                                                    {isPartial ? 'CICILAN AKTIF' : 'BELUM TERBAYAR'}
                                                </span>
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">{debt.invoiceNumber}</h3>
                                        </div>
                                        <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[8px] font-black tracking-widest uppercase">
                                            HOLD BILL
                                        </div>
                                    </div>

                                    <div className="p-6 lg:p-8 flex-1 space-y-6">
                                        <div>
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">Pelunasan</span>
                                                <span className="text-xs font-black text-indigo-600">{Math.round(payProgress)}%</span>
                                            </div>
                                            <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                                                <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${payProgress}%` }} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Pelanggan</p>
                                                <p className="text-xs font-black text-slate-800 truncate">{debt.customerName || 'UMUM'}</p>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-right">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanggal</p>
                                                <p className="text-xs font-black text-slate-800">{new Date(debt.createdAt).toLocaleDateString('id-ID')}</p>
                                            </div>
                                        </div>

                                        <div className="bg-indigo-50/30 rounded-2xl border border-indigo-100/50 p-4 space-y-2">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                                                <span>Total Bill</span>
                                                <span>{fmt(Number(debt.grandTotal)).replace('Rp ', '')}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-bold text-emerald-600">
                                                <span>Sudah Bayar</span>
                                                <span>-{fmt(Number(debt.paidAmount || 0)).replace('Rp ', '')}</span>
                                            </div>
                                            <div className="pt-2 border-t border-indigo-100 flex justify-between items-center">
                                                <span className="text-[10px] font-black text-slate-900 uppercase">Sisa Piutang</span>
                                                <span className="text-base font-black text-rose-500">{fmt(remaining)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 lg:p-8 bg-slate-50 border-t border-slate-100">
                                        <button
                                            onClick={() => router.push(`/billing?transactionId=${debt.id}`)}
                                            className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-slate-200 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <CreditCard className="w-4 h-4" /> Lunasi Tagihan
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

