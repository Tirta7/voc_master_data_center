'use client';

import React, { useState } from 'react';
import { AlertTriangle, ChevronRight, X, CreditCard, BellRing } from 'lucide-react';
import { useRealtimeData } from '@/context/RealtimeDataContext';
import { formatRupiah as fmt } from '@/utils/formatUtils';
import { useRouter } from 'next/navigation';

export function InstallmentNotificationBanner() {
    const { 
        upcomingInstallmentCount, 
        upcomingInstallmentTotal, 
        expiringItemsCount,
        isBannerDismissed,
        setIsBannerDismissed 
    } = useRealtimeData();
    const router = useRouter();

    if (isBannerDismissed) return null;
    if (upcomingInstallmentCount === 0 && expiringItemsCount === 0) return null;

    const hasBoth = upcomingInstallmentCount > 0 && expiringItemsCount > 0;

    return (
        <div className="relative group px-4 lg:px-10 mt-6 animate-in slide-in-from-top-4 duration-700">
            <div className={`relative overflow-hidden bg-white rounded-[2.5rem] p-1.5 shadow-2xl ${hasBoth ? 'shadow-amber-200/40 border-amber-100' : 'shadow-rose-200/40 border-rose-100'} border flex flex-col md:flex-row items-center gap-4 md:gap-6 pr-6`}>
                {/* Visual Accent */}
                <div className={`absolute top-0 left-0 w-2 h-full ${hasBoth ? 'bg-amber-500' : 'bg-rose-500'}`} />
                <div className={`absolute -right-10 -top-10 w-40 h-40 ${hasBoth ? 'bg-amber-50' : 'bg-rose-50'} rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none`} />

                <div className="flex items-center gap-4 pl-6 py-4 flex-1 relative z-10">
                    <div className={`w-14 h-14 ${hasBoth ? 'bg-amber-500' : 'bg-rose-500'} text-white rounded-2xl flex items-center justify-center shadow-lg ${hasBoth ? 'shadow-amber-200' : 'shadow-rose-200'} shrink-0 animate-bounce group-hover:scale-110 transition-transform`}>
                        <BellRing className="w-7 h-7" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 ${hasBoth ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'} text-[9px] font-black uppercase tracking-widest rounded-md`}>Peringatan Kontrol Stok</span>
                            <div className={`w-1.5 h-1.5 rounded-full ${hasBoth ? 'bg-amber-500' : 'bg-rose-500'} animate-pulse`} />
                        </div>
                        <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                            {hasBoth ? (
                                <>Perhatian! Ada <span className="text-rose-600">{upcomingInstallmentCount} Tagihan</span> & <span className="text-amber-600">{expiringItemsCount} Barang Expired</span></>
                            ) : upcomingInstallmentCount > 0 ? (
                                <>Ada <span className="text-rose-600">{upcomingInstallmentCount} Tagihan Supplier</span> Jatuh Tempo Segera!</>
                            ) : (
                                <>Ada <span className="text-amber-600">{expiringItemsCount} Bahan Baku</span> Memasuki Masa Expired!</>
                            )}
                        </h4>
                        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wide mt-1">
                            {upcomingInstallmentCount > 0 && `Total Tagihan: ${fmt(upcomingInstallmentTotal)}`}
                            {upcomingInstallmentCount > 0 && expiringItemsCount > 0 && ' • '}
                            {expiringItemsCount > 0 && `Segera cek gudang untuk memproses ${expiringItemsCount} barang yang akan kadaluwarsa.`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto px-6 md:px-0 pb-4 md:pb-0 relative z-10">
                    <button 
                        onClick={() => router.push(upcomingInstallmentCount > 0 ? '/admin/inventory?tab=purchase-history&filter=unpaid' : '/admin/inventory?tab=stock')}
                        className="flex-1 md:flex-none px-8 py-4 bg-slate-900 text-white rounded-[1.25rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-indigo-600 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:scale-95 whitespace-nowrap"
                    >
                        <CreditCard className="w-4 h-4" />
                        Detail {upcomingInstallmentCount > 0 ? 'Pembayaran' : 'Stok'}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    
                    <button 
                        onClick={() => setIsBannerDismissed(true)}
                        className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 hover:text-slate-600 transition-all active:scale-90 border border-slate-100"
                        title="Sembunyikan Sementara"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
