import React from 'react';
import { Truck, Calendar, ArrowRight, User as UserIcon, Tag, DollarSign, FileText } from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatRupiah as fmt, formatNumber as fn } from '@/utils/formatUtils';
import dayjs from 'dayjs';

export function PurchaseHistoryView() {
    const { data: history, isLoading } = useSWR<any[]>('/inventory/stock-in', fetcher);

    if (isLoading) return <div className="p-10 text-center font-black text-slate-400 animate-pulse uppercase tracking-[0.3em] text-xs">Menganalisis riwayat pengadaan...</div>;

    if (!history || history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6 text-slate-200 border border-slate-100 shadow-inner">
                    <Truck className="w-12 h-12" />
                </div>
                <p className="font-black text-slate-300 uppercase tracking-widest text-xs">Belum ada riwayat pembelian</p>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-10">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none mb-2">Riwayat Pengadaan (Stock In)</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Log masuknya bahan baku dari supplier & vendor</p>
            </div>

            <div className="space-y-4">
                {history.map((entry) => (
                    <div key={entry.id} className="bg-white rounded-[2rem] border border-slate-100 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-xl hover:shadow-slate-200/20 transition-all group border-l-8 border-l-emerald-500">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100 shrink-0 group-hover:scale-110 transition-transform">
                                <Calendar className="w-8 h-8" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dayjs(entry.createdAt).format('DD MMM YYYY')}</span>
                                    <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-widest">{dayjs(entry.createdAt).format('HH:mm')}</span>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{entry.ingredient?.name || 'Bahan Dihapus'}</h3>
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-1.5">
                                        <Truck className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-[11px] font-bold text-slate-600 uppercase">{entry.supplier?.name || 'Direct Purchase'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-[11px] font-bold text-slate-600 uppercase">{entry.receivedBy?.name || 'Admin'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-start md:items-center gap-8 w-full md:w-auto md:border-l md:border-slate-100 md:pl-8">
                            <div className="text-left md:text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kuantitas</p>
                                <div className="flex items-baseline gap-1 justify-end">
                                    <span className="text-xl font-black text-slate-900">{fn(entry.quantity)}</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase">{entry.unit}</span>
                                </div>
                            </div>
                            <div className="text-left md:text-right min-w-[140px]">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Biaya</p>
                                <p className="text-xl font-black text-emerald-600 leading-none">{fmt(entry.totalCost)}</p>
                                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">@{fmt(entry.purchasePrice)}</p>
                            </div>
                        </div>

                        {entry.notes && (
                            <div className="w-full md:w-48 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-3">
                                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                <p className="text-[10px] font-medium text-slate-500 leading-tight italic truncate" title={entry.notes}>
                                    "{entry.notes}"
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
