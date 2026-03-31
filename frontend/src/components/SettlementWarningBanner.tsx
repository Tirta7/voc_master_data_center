'use client';

import React from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export default function SettlementWarningBanner() {
    const router = useRouter();
    const pathname = usePathname();
    
    // Polling setiap 60 detik untuk status settlement
    const { data: status } = useSWR('/finance/shifts/business-day/settlement-status', fetcher, {
        refreshInterval: 60000,
        revalidateOnFocus: true
    });

    // Jangan tampilkan jika:
    // 1. Fitur disable
    // 2. Tidak stale
    // 3. Sedang di halaman login atau display
    const isPublicPage = pathname === '/login' || pathname?.startsWith('/display');
    if (!status?.isStale || !status?.autoSettlementEnabled || isPublicPage) return null;

    // Jika sedang di halaman closing, mungkin tidak perlu banner yang mengganggu
    if (pathname === '/admin/closing') return null;

    const isReadyToSettle = status.canAutoSettle;

    return (
        <div className={`w-full ${isReadyToSettle ? 'bg-rose-600' : 'bg-amber-500'} text-white px-6 py-3 flex items-center justify-between shadow-lg sticky top-0 z-[110] animate-in slide-in-from-top duration-500`}>
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                    {isReadyToSettle ? <AlertCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                </div>
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 leading-none mb-1">
                        Settlement Day Terlewati
                    </h4>
                    <p className="text-sm font-black leading-tight">
                        {isReadyToSettle 
                            ? `Business Day ${status.businessDayDate} belum ditutup! Segera lakukan penutupan.` 
                            : `Waktu operasional sudah lewat, tapi masih ada meja aktif. Tutup hari setelah meja kosong.`}
                    </p>
                </div>
            </div>

            <button 
                onClick={() => router.push('/admin/closing')}
                className="bg-white text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 transition-all active:scale-95 shrink-0 shadow-sm"
            >
                {isReadyToSettle ? 'Tutup Sekarang' : 'Cek Status'}
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}
