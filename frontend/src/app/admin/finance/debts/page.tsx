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
    Hash,
    MessageSquare,
    Send
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/components/ui/AlertProvider';

// import { API_URL } from '@/utils/urlUtils';

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtK = (n: number) => fmt(n);

export default function DebtsPage() {
    const { hasPermission } = useAuth();
    const router = useRouter();
    const { showAlert, showConfirm } = useAlert();
    const [debts, setDebts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingWa, setSendingWa] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchDebts();
    }, []);

    const fetchDebts = async () => {
        try {
            const res = await axios.get(`/transactions/debt`);
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

    const sendReminder = async (debt: any) => {
        const phone = debt.customerPhone || debt.member?.phone;
        if (!phone) {
            showAlert('Nomor HP Kosong', 'Gagal mengirim pengingat karena nomor HP pelanggan tidak terdaftar.', { variant: 'error' });
            return;
        }

        const remaining = Math.max(0, Number(debt.grandTotal) - Number(debt.paidAmount || 0));
        const message = `Halo ${debt.customerName || debt.member?.name || 'Pelanggan'},\n\nKami dari *Billiard & Cafe* ingin menginfokan bahwa terdapat tagihan pending dengan No. Invoice *${debt.invoiceNumber}* sebesar *Rp ${remaining.toLocaleString('id-ID')}*.\n\nMohon untuk segera melakukan pelunasan. Terima kasih! 🙏`;

        setSendingWa(debt.id);
        try {
            await axios.post(`/whatsapp/send`, {
                target: phone,
                message: message
            });
            
            showAlert('Berhasil', 'Pengingat WhatsApp telah dikirim.', { variant: 'success' });
        } catch (err) {
            console.error('Failed to send WA', err);
            showAlert('Gagal', 'Terjadi kesalahan saat mengirim pesan WhatsApp. Pastikan layanan WA aktif.', { variant: 'error' });
        } finally {
            setSendingWa(null);
        }
    };

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
        <div className="min-h-screen bg-slate-50/50 pb-20">
            <div className="p-4 lg:p-10 max-w-7xl mx-auto space-y-8">

                {/* ── Hero Header ────────────────────────────────────────── */}
                <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 lg:p-12 text-white shadow-2xl shadow-slate-200">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full -ml-24 -mb-24 blur-3xl" />
                    
                    <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10">
                                    <BaggageClaim className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <span className="block text-white/40 text-[9px] font-black uppercase tracking-[0.3em] leading-none mb-1">Audit & Control</span>
                                    <span className="block text-indigo-400 text-[10px] font-black uppercase tracking-widest leading-none">Debt Monitoring</span>
                                </div>
                            </div>
                            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter mb-2 italic">Piutang & Bon</h1>
                            <p className="text-white/40 text-sm font-semibold max-w-md">Monitor tagihan "Bayar Nanti" secara real-time dengan sistem pencatatan otomatis.</p>
                            
                            <div className="flex flex-wrap gap-3 mt-6">
                                <div className="bg-white/5 backdrop-blur-md px-5 py-2.5 rounded-full text-[10px] font-black border border-white/5 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    {filteredDebts.length} TAGIHAN AKTIF
                                </div>
                                <div className="bg-white/5 backdrop-blur-md px-5 py-2.5 rounded-full text-[10px] font-black border border-white/5 text-indigo-300">
                                    💰 SISA: {fmtK(totalSisa)}
                                </div>
                            </div>
                        </div>

                        <div className="w-full lg:w-96 group">
                            <div className="relative">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Cari invoice, pelanggan, atau nominal..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-6 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] font-bold text-white text-sm placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-indigo-500/50 transition-all duration-300 shadow-xl shadow-black/20"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Stat Cards ─────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Total Piutang', value: totalPiutang, sub: 'Akumulasi Semua Bon', icon: <Wallet className="w-5 h-5"/>, color: 'indigo' },
                        { label: 'Terbayar', value: totalTerbayar, sub: 'Dana Berhasil Masuk', icon: <TrendingUp className="w-5 h-5"/>, color: 'emerald' },
                        { label: 'Sisa Tagihan', value: totalSisa, sub: 'Menunggu Pelunasan', icon: <Clock className="w-5 h-5"/>, color: 'rose' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/40 group hover:border-indigo-100 transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl bg-${s.color}-50 text-${s.color}-600 flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}>
                                    {s.icon}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{s.label}</p>
                                    <p className={`text-2xl font-black text-${s.color}-600 tracking-tighter leading-none mb-1`}>{fmtK(s.value)}</p>
                                    <p className="text-[9px] font-bold text-slate-300 italic uppercase">{s.sub}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="dashed-line opacity-20"></div>

                {/* ── Content ────────────────────────────────────────────── */}
                {loading ? (
                    <div className="py-24 text-center">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                        <p className="font-black text-indigo-600 uppercase tracking-widest text-[10px]">Sinkronisasi Data Finansial...</p>
                    </div>
                ) : filteredDebts.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 p-24 text-center">
                        <SearchX className="w-16 h-16 text-slate-100 mx-auto mb-8" />
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Semua Tagihan Beres!</h3>
                        <p className="text-slate-400 max-w-sm mx-auto font-medium">Tidak ada transaksi bertipe "Bayar Nanti" yang perlu ditagih saat ini.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
                        {filteredDebts.map((debt) => {
                            const isPartial = Number(debt.paidAmount) > 0;
                            const remaining = Math.max(0, Number(debt.grandTotal) - Number(debt.paidAmount || 0));
                            const payProgress = Math.min(100, (Number(debt.paidAmount) / Number(debt.grandTotal)) * 100);

                            return (
                                <div key={debt.id} className="bg-white rounded-[2.2rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden flex flex-col group hover:shadow-2xl hover:shadow-indigo-100/50 hover:-translate-y-1 transition-all duration-500">
                                    <div className="p-8 pb-6 flex justify-between items-start">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${isPartial ? 'bg-indigo-500 animate-pulse' : 'bg-rose-500'}`} />
                                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isPartial ? 'text-indigo-600' : 'text-rose-600'}`}>
                                                    {isPartial ? 'Cicilan Aktif' : 'Belum Terbayar'}
                                                </span>
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">{debt.invoiceNumber}</h3>
                                        </div>
                                        <div className="bg-slate-100 text-slate-500 px-3.5 py-1.5 rounded-full text-[8px] font-black tracking-widest uppercase border border-slate-200/50">
                                            HOLD BILL
                                        </div>
                                    </div>

                                    <div className="px-8 pb-8 flex-1 space-y-7">
                                        {/* Progress Pelunasan */}
                                        <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                                            <div className="flex justify-between items-end mb-2.5 relative z-10">
                                                <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Pelunasan</span>
                                                <span className="text-sm font-black text-indigo-600">{Math.round(payProgress)}%</span>
                                            </div>
                                            <div className="h-2.5 bg-white rounded-full overflow-hidden border border-slate-100 shadow-inner relative z-10">
                                                <div 
                                                    className="h-full bg-indigo-600 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(79,70,229,0.4)]" 
                                                    style={{ width: `${payProgress}%` }} 
                                                />
                                            </div>
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="px-1">
                                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Pelanggan</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black uppercase">
                                                        {(debt.customerName || 'U').charAt(0)}
                                                    </div>
                                                    <p className="text-xs font-black text-slate-800 truncate">{debt.customerName || 'UMUM'}</p>
                                                </div>
                                            </div>
                                            <div className="px-1 text-right">
                                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Tanggal Invoice</p>
                                                <p className="text-xs font-black text-slate-800">{new Date(debt.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                            </div>
                                        </div>

                                        <div className="bg-slate-900 rounded-3xl p-5 space-y-3 shadow-lg shadow-slate-200">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                                                <span className="uppercase tracking-widest">Total Tagihan</span>
                                                <span className="text-slate-100">{fmt(Number(debt.grandTotal)).replace('Rp ', '')}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-bold text-emerald-400">
                                                <span className="uppercase tracking-widest">Sukses Terbayar</span>
                                                <span>-{fmt(Number(debt.paidAmount || 0)).replace('Rp ', '')}</span>
                                            </div>
                                            <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                                                <span className="text-[11px] font-black text-white uppercase tracking-widest">Sisa Piutang</span>
                                                <span className="text-xl font-black text-rose-400">{fmt(remaining)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 pt-0 mt-auto">
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => router.push(`/billing?transactionId=${debt.id}`)}
                                                className="flex-1 bg-slate-900 hover:bg-black text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-slate-200 active:scale-[0.97] flex items-center justify-center gap-2"
                                            >
                                                <CreditCard className="w-4 h-4 text-indigo-400" /> Lunasi
                                            </button>
                                            <button
                                                onClick={() => sendReminder(debt)}
                                                disabled={sendingWa === debt.id}
                                                className={`flex-1 ${sendingWa === debt.id ? 'bg-slate-50 text-slate-300' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700'} py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.97] flex items-center justify-center gap-2 border border-emerald-100/50`}
                                            >
                                                {sendingWa === debt.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <MessageSquare className="w-4 h-4" />
                                                )}
                                                WhatsApp
                                            </button>
                                        </div>
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

