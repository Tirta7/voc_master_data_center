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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                {filteredHistory.map((entry) => (
                    <div key={entry.id} className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-300 group relative flex flex-col overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${
                            entry.paymentStatus === 'PAID' ? 'bg-emerald-400' : 
                            entry.paymentStatus === 'PARTIAL' ? 'bg-amber-400' : 'bg-rose-400'
                        }`} />
                        
                        <div className="p-4 flex flex-col flex-1 pl-5">
                            {/* Header: Identity */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1 min-w-0 pr-2">
                                    <h3 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-tight leading-none mb-1.5 truncate group-hover:text-indigo-600 transition-colors">
                                        {entry.ingredient?.name || 'Bahan Dihapus'}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-1">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{dayjs(entry.createdAt).format('DD MMM YYYY')}</span>
                                        <span className="text-[8px] font-black text-white bg-indigo-600 px-1.5 py-0.5 rounded uppercase tracking-widest">{dayjs(entry.createdAt).format('HH:mm')}</span>
                                        {entry.invoiceNumber && (
                                            <span className="text-[8px] font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded uppercase truncate max-w-[80px]">
                                                #{entry.invoiceNumber}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                    <Truck className="w-4 h-4 md:w-5 md:h-5" />
                                </div>
                            </div>

                            {/* Middle: Stats */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Volume</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xs md:text-sm font-black text-slate-900">{fn(entry.quantity)}</span>
                                        <span className="text-[8px] font-black text-slate-400 uppercase">{entry.unit}</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                                    <span className="text-xs md:text-sm font-black text-slate-900">{fmt(entry.totalCost)}</span>
                                </div>
                            </div>

                            {/* Payment Matrix */}
                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100/80">
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                        entry.paymentStatus === 'PAID' ? 'bg-emerald-500' : 
                                        entry.paymentStatus === 'PARTIAL' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500 animate-pulse'
                                    }`} />
                                    <span className={`text-[8px] font-black uppercase tracking-widest ${
                                        entry.paymentStatus === 'PAID' ? 'text-emerald-600' : 
                                        entry.paymentStatus === 'PARTIAL' ? 'text-amber-600' : 'text-rose-600'
                                    }`}>
                                        {entry.paymentStatus === 'PAID' ? 'LUNAS' : entry.paymentStatus === 'PARTIAL' ? 'CICILAN' : 'TEMPO'}
                                    </span>
                                </div>
                                {entry.paymentStatus !== 'PAID' && (
                                    <span className="text-[8px] font-bold text-rose-500 uppercase tracking-tight">
                                        Sisa: {fmt(Number(entry.totalCost) - Number(entry.paidAmount))}
                                    </span>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-2 mt-3 relative z-10">
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
                                        className="py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-black text-[8px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                                    >
                                        <CreditCard size={10} /> Bayar
                                    </button>
                                )}
                                <button 
                                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                                    className={`py-2 rounded-lg font-black text-[8px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border ${
                                        expandedId === entry.id ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-100'
                                    } ${Number(entry.paidAmount) >= Number(entry.totalCost) ? 'col-span-2' : ''}`}
                                >
                                    Detail <ChevronDown size={10} className={`transition-transform duration-300 ${expandedId === entry.id ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                        </div>

                            {/* Sub-Sections: Payment Form */}
                            {payingId === entry.id && (
                                <div className="mt-4 p-4 md:p-6 bg-indigo-50/40 rounded-2xl md:rounded-[2rem] border-2 border-dashed border-indigo-100 animate-in zoom-in-95 duration-500 col-span-1 md:col-span-2 lg:col-span-3">
                                    <div className="flex items-center gap-3 mb-4 md:mb-6">
                                        <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
                                            <CreditCard size={14} className="md:w-[18px] md:h-[18px]" />
                                        </div>
                                        <h4 className="text-xs md:text-sm font-black text-indigo-900 uppercase tracking-widest">Pencatatan Pembayaran</h4>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
                                        <div className="lg:col-span-4">
                                            <InputField 
                                                label={`Nominal (Sisa: ${fmt(Number(entry.totalCost) - Number(entry.paidAmount))})`}
                                                type="number"
                                                value={payAmount}
                                                onChange={setPayAmount}
                                                placeholder="0"
                                                className="!bg-white shadow-sm !h-12 md:!h-14"
                                            />
                                        </div>
                                        <div className="lg:col-span-5">
                                            <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Metode Pembayaran</label>
                                            <div className="flex flex-wrap gap-2">
                                                {paymentMethods.map((m: string) => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => setPayMethod(m)}
                                                        className={`px-4 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black transition-all ${payMethod === m
                                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
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
                                                className="w-full h-12 md:h-14 mt-4 lg:mt-0 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-200 hover:scale-105 transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
                                            >
                                                Konfirmasi Bayar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sub-Sections: History Detail */}
                            {expandedId === entry.id && (
                                <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 animate-in slide-in-from-top-4 duration-500 col-span-1 md:col-span-2 lg:col-span-3">
                                    <div className="p-4 md:p-6 bg-slate-50/50 rounded-2xl md:rounded-[2rem] border border-slate-100">
                                        <div className="flex items-center gap-3 mb-4 md:mb-6">
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-white text-indigo-500 rounded-xl flex items-center justify-center shadow-sm border border-slate-100 shrink-0">
                                                <FileText size={14} className="md:w-[18px] md:h-[18px]" />
                                            </div>
                                            <h4 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest">Informasi Pengadaan</h4>
                                        </div>
                                        <div className="space-y-3 md:space-y-4">
                                            <div className="flex justify-between items-center py-3 border-b border-slate-200/50">
                                                <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Jatuh Tempo</span>
                                                <span className={`text-[9px] md:text-xs font-black px-2 py-1 rounded-md md:rounded-lg ${entry.dueDate && dayjs(entry.dueDate).isBefore(dayjs()) && entry.paymentStatus !== 'PAID' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-700'}`}>
                                                    {entry.dueDate ? dayjs(entry.dueDate).format('DD MMM YYYY') : '-'}
                                                </span>
                                            </div>
                                            <div className="pt-2 md:pt-3">
                                                <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Catatan Admin</span>
                                                <div className="p-3 md:p-4 bg-white rounded-xl md:rounded-2xl border border-slate-100 italic text-slate-500 text-[9px] md:text-xs font-bold leading-relaxed shadow-sm">
                                                    "{entry.notes || 'No administrative notes recorded.'}"
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 md:p-6 bg-white rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-3 mb-4 md:mb-6">
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner border border-emerald-100/50 shrink-0">
                                                <HistoryIcon size={14} className="md:w-[18px] md:h-[18px]" />
                                            </div>
                                            <h4 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest">Payment Ledger</h4>
                                        </div>
                                        <div className="space-y-2 md:space-y-3 max-h-[200px] md:max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                            {entry.payments && entry.payments.length > 0 ? (
                                                entry.payments.map((p: any, idx: number) => (
                                                    <div key={idx} className="group/item bg-slate-50/50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-transparent hover:border-emerald-100 hover:bg-emerald-50/30 transition-all flex justify-between items-center">
                                                        <div className="flex items-center gap-3 md:gap-4">
                                                            <div className="w-6 h-6 md:w-8 md:h-8 bg-white text-emerald-500 rounded-lg flex items-center justify-center shadow-sm text-[9px] md:text-[10px] font-black shrink-0">
                                                                {idx + 1}
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] md:text-xs font-black text-slate-800">{fmt(p.amount)}</p>
                                                                <div className="flex items-center gap-1.5 mt-0.5 md:mt-1">
                                                                    <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">{dayjs(p.paymentDate).format('DD/MM/YYYY HH:mm')}</span>
                                                                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                                    <span className="text-[7px] md:text-[8px] font-bold text-emerald-600 uppercase tracking-wider">{p.paymentMethod}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-emerald-400 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex items-center justify-center py-6 md:py-8 text-slate-300 text-[9px] md:text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-xl md:rounded-2xl">
                                                    Belum ada riwayat cicilan
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                    </div>
                ))}
            </div>
        </div>
    );
}
