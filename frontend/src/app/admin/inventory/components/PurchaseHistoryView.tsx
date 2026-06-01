import React, { useState } from 'react';
import { Truck, Calendar, ArrowRight, User as UserIcon, Tag, DollarSign, FileText, CreditCard, ChevronDown, CheckCircle2, Clock, History as HistoryIcon } from 'lucide-react';
import useSWR from 'swr';
import axios from 'axios';
import { fetcher } from '@/lib/fetcher';
import { formatRupiah as fmt, formatNumber as fn } from '@/utils/formatUtils';
import dayjs from 'dayjs';
import { useRealtimeData } from '@/context/RealtimeDataContext';
import InputField from '@/components/ui/InputField';

export function PurchaseHistoryView({ filter }: { filter?: string }) {
    const { refetchFinancialHealth } = useRealtimeData();
    const { data: history, isLoading, mutate } = useSWR<any[]>('/inventory/stock-in', fetcher);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [payingId, setPayingId] = useState<number | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState('CASH');
    const [selectedEntryForPay, setSelectedEntryForPay] = useState<any>(null);
    const { data: settings } = useSWR<any>('/settings', fetcher);
    const paymentMethods = settings?.availablePaymentMethods || ['CASH'];

    const handlePay = async (stockInId: number) => {
        if (!payAmount || Number(payAmount) <= 0) return;
        try {
            await axios.post(`/inventory/stock-in/${stockInId}/pay`, {
                amount: Number(payAmount),
                paymentMethod: payMethod,
                notes: 'Pelunasan/Cicilan manual dari Riwayat'
            });
            alert('Pembayaran berhasil dicatat!');
            setPayingId(null);
            setPayAmount('');
            mutate();
            refetchFinancialHealth();
        } catch (error) {
            alert('Gagal mencatat pembayaran');
        }
    };

    const filteredHistory = (history || []).filter(entry => {
        if (filter === 'unpaid') {
            return entry.paymentStatus === 'UNPAID' || entry.paymentStatus === 'PARTIAL';
        }
        return true;
    });

    if (isLoading) return <div className="p-10 text-center font-black text-slate-400 animate-pulse uppercase tracking-[0.3em] text-xs">Menganalisis riwayat pengadaan...</div>;

    if (!filteredHistory || filteredHistory.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6 text-slate-200 border border-slate-100 shadow-inner">
                    <Truck className="w-12 h-12" />
                </div>
                <p className="font-black text-slate-300 uppercase tracking-widest text-xs">
                    {filter === 'unpaid' ? 'Semua tagihan sudah lunas!' : 'Belum ada riwayat pembelian'}
                </p>
            </div>
        );
    }

    return (
        <div className="p-8 lg:p-12 space-y-12">
            <div className="relative">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-3">
                    Riwayat Pengadaan <span className="text-indigo-600">Stock In</span>
                </h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] ml-1">Log masuknya bahan baku dari supplier & vendor</p>
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            </div>

            <div className="space-y-8">
                {filteredHistory.map((entry) => (
                    <div key={entry.id} className="bg-white/60 backdrop-blur-md rounded-[3rem] border border-slate-200/60 shadow-[0_15px_40px_rgba(0,0,0,0.02)] overflow-hidden hover:shadow-2xl hover:shadow-indigo-100/30 transition-all duration-500 group relative">
                        <div className={`absolute top-0 left-0 w-2 h-full ${
                            entry.paymentStatus === 'PAID' ? 'bg-emerald-400' : 
                            entry.paymentStatus === 'PARTIAL' ? 'bg-amber-400' : 'bg-rose-400'
                        }`} />
                        
                        <div className="p-8 lg:p-10">
                            <div className="flex flex-col xl:flex-row items-start xl:items-center gap-10 lg:gap-14">
                                {/* Left Section: Identity */}
                                <div className="flex items-center gap-6 shrink-0">
                                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300 border border-slate-100 shrink-0 group-hover:scale-105 group-hover:-rotate-3 transition-all duration-500 shadow-inner">
                                        <Calendar className="w-9 h-9" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{dayjs(entry.createdAt).format('DD MMM YYYY')}</span>
                                            <span className="text-[10px] font-black text-white bg-indigo-600 px-2 py-0.5 rounded uppercase tracking-widest shadow-lg shadow-indigo-100">{dayjs(entry.createdAt).format('HH:mm')}</span>
                                            {entry.invoiceNumber && (
                                                <span className="text-[9px] font-black text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 uppercase">
                                                    #{entry.invoiceNumber}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-3 leading-none group-hover:text-indigo-600 transition-colors">{entry.ingredient?.name || 'Bahan Dihapus'}</h3>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                <Truck className="w-3.5 h-3.5 text-indigo-500" />
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{entry.supplier?.name || 'Direct Purchase'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{entry.receivedBy?.name || 'Admin'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Middle Section: Stats */}
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-14 flex-1 w-full xl:w-auto xl:border-x xl:border-slate-100/80 xl:px-14">
                                    <div className="text-left">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Incoming Volume</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter">{fn(entry.quantity)}</span>
                                            <span className="text-xs font-black text-slate-400 uppercase">{entry.unit}</span>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Payment Matrix</p>
                                        <div className="space-y-3">
                                            <div className={`inline-flex px-4 py-2 rounded-xl text-[10px] font-black uppercase items-center gap-2 border ${
                                                entry.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                entry.paymentStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${
                                                    entry.paymentStatus === 'PAID' ? 'bg-emerald-500' : 
                                                    entry.paymentStatus === 'PARTIAL' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500 animate-pulse'
                                                }`} />
                                                {entry.paymentStatus === 'PAID' ? 'Fully Paid' : entry.paymentStatus === 'PARTIAL' ? 'Installments' : 'Due/Tempo'}
                                            </div>
                                            <p className="text-[11px] font-black text-slate-900 block tracking-tight">
                                                {fmt(entry.paidAmount)} <span className="text-slate-300 mx-1">/</span> <span className="text-slate-400 font-bold">{fmt(entry.totalCost)}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="hidden lg:block">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Remaining Balance</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-2xl font-black ${Number(entry.totalCost) - Number(entry.paidAmount) > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>
                                                {fmt(Number(entry.totalCost) - Number(entry.paidAmount))}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Section: Actions */}
                                <div className="flex flex-row xl:flex-col items-center gap-3 w-full xl:w-[200px] shrink-0">
                                    {Number(entry.paidAmount) < Number(entry.totalCost) && (
                                        <button 
                                            onClick={() => {
                                                if (payingId === entry.id) {
                                                    setPayingId(null);
                                                    setSelectedEntryForPay(null);
                                                } else {
                                                    setPayingId(entry.id);
                                                    setSelectedEntryForPay(entry);
                                                    setPayAmount((Number(entry.totalCost) - Number(entry.paidAmount)).toString());
                                                }
                                            }}
                                            className="flex-1 xl:w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-3"
                                        >
                                            <CreditCard size={14} />
                                            Record Pay
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                                        className={`flex-1 xl:w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border ${
                                            expandedId === entry.id ? 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-lg shadow-indigo-100/50' : 'bg-white text-slate-400 hover:bg-slate-50 border-slate-100'
                                        }`}
                                    >
                                        View Details
                                        <ChevronDown size={14} className={`transition-transform duration-500 ${expandedId === entry.id ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Sub-Sections: Payment Form */}
                            {payingId === entry.id && (
                                <div className="mt-12 p-10 bg-indigo-50/40 rounded-[2.5rem] border-2 border-dashed border-indigo-100 animate-in zoom-in-95 duration-500">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-[1rem] flex items-center justify-center shadow-xl shadow-indigo-200">
                                            <CreditCard size={18} />
                                        </div>
                                        <h4 className="text-base font-black text-indigo-900 uppercase tracking-widest">Pencatatan Pembayaran Lanjutan</h4>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                        <div className="lg:col-span-4">
                                            <InputField 
                                                label={`Nominal (Sisa: ${fmt(Number(entry.totalCost) - Number(entry.paidAmount))})`}
                                                type="number"
                                                value={payAmount}
                                                onChange={setPayAmount}
                                                placeholder="0"
                                                className="!bg-white shadow-sm !h-16"
                                            />
                                        </div>
                                        <div className="lg:col-span-5">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Metode Pembayaran</label>
                                            <div className="flex flex-wrap gap-2">
                                                {paymentMethods.map((m: string) => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => setPayMethod(m)}
                                                        className={`px-6 py-3 rounded-xl text-[10px] font-black transition-all ${payMethod === m
                                                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-105'
                                                            : 'bg-white text-slate-400 border border-slate-200 hover:border-indigo-200'
                                                        }`}
                                                    >
                                                        {m}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="lg:col-span-3 flex items-center">
                                            <button 
                                                onClick={() => handlePay(entry.id)}
                                                disabled={!payAmount || Number(payAmount) <= 0 || Number(payAmount) > (Number(entry.totalCost) - Number(entry.paidAmount))}
                                                className="w-full h-16 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 hover:scale-105 transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
                                            >
                                                Post Transaction
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sub-Sections: History Detail */}
                            {expandedId === entry.id && (
                                <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-top-10 duration-700">
                                    <div className="p-10 bg-slate-50/50 rounded-[3rem] border border-slate-100">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-10 h-10 bg-white text-indigo-500 rounded-[1rem] flex items-center justify-center shadow-sm border border-slate-100">
                                                <FileText size={18} />
                                            </div>
                                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Informasi Pengadaan</h4>
                                        </div>
                                        <div className="space-y-5">
                                            <div className="flex justify-between items-center py-4 border-b border-slate-200/50">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Jatuh Tempo</span>
                                                <span className={`text-xs font-black px-3 py-1 rounded-lg ${entry.dueDate && dayjs(entry.dueDate).isBefore(dayjs()) && entry.paymentStatus !== 'PAID' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-700'}`}>
                                                    {entry.dueDate ? dayjs(entry.dueDate).format('DD MMMM YYYY') : '-'}
                                                </span>
                                            </div>
                                            <div className="pt-4">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Catatan Admin</span>
                                                <div className="p-5 bg-white rounded-2xl border border-slate-100 italic text-slate-500 text-xs font-bold leading-relaxed shadow-sm">
                                                    "{entry.notes || 'No administrative notes recorded.'}"
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-10 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-[1rem] flex items-center justify-center shadow-inner border border-emerald-100/50">
                                                <HistoryIcon size={18} />
                                            </div>
                                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Payment Ledger (Audit)</h4>
                                        </div>
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {entry.payments && entry.payments.length > 0 ? (
                                                entry.payments.map((p: any, idx: number) => (
                                                    <div key={idx} className="group/item bg-slate-50/50 p-5 rounded-2xl border border-transparent hover:border-emerald-100 hover:bg-emerald-50/30 transition-all flex justify-between items-center">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-10 h-10 bg-white text-emerald-500 rounded-xl flex items-center justify-center shadow-sm text-xs font-black">
                                                                {idx + 1}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-slate-900 leading-none mb-1.5">{fmt(p.amount)}</p>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight flex items-center gap-2">
                                                                    <Clock size={10} /> {dayjs(p.paidAt).format('DD/MM/YY HH:mm')} <span className="text-slate-200">|</span> <Tag size={10} /> {p.paymentMethod}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <CheckCircle2 size={16} className="text-emerald-400 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-14 text-center opacity-40">
                                                    <CreditCard size={40} className="mx-auto text-slate-200 mb-4" />
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Zero transaction records</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
