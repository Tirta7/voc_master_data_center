'use client';

import React from 'react';
import { 
    Trophy, 
    TrendingUp, 
    Coffee, 
    Dices, 
    Wallet, 
    ChevronRight, 
    Star,
    LayoutDashboard
} from 'lucide-react';

interface ShiftSummaryCardProps {
    performance: any;
    onBack: () => void;
}

export default function ShiftSummaryCard({ performance, onBack }: ShiftSummaryCardProps) {
    const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

    return (
        <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-700 max-w-2xl mx-auto">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-white relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Trophy className="w-32 h-32 rotate-12" />
                </div>
                <div className="relative">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                        <Star className="w-3 h-3 fill-current" />
                        Shift Summary
                    </div>
                    <h1 className="text-3xl font-black tracking-tight mb-2">Kerja Bagus!</h1>
                    <p className="text-emerald-50 text-sm font-medium opacity-80">Berikut adalah ringkasan performa shift Anda hari ini.</p>
                </div>
            </div>

            <div className="p-8 space-y-8">
                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 group hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-300">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Dices className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Billiard</p>
                        <p className="text-xl font-black text-slate-800">{fmt(performance.billiardRevenue)}</p>
                    </div>

                    <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 group hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-300">
                        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Coffee className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cafe & Store</p>
                        <p className="text-xl font-black text-slate-800">{fmt(performance.cafeRevenue)}</p>
                    </div>

                    <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 group hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-300">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Top-up Member</p>
                        <p className="text-xl font-black text-slate-800">{fmt(performance.topupRevenue)}</p>
                    </div>

                    <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 group hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-300">
                        <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Transaksi</p>
                        <p className="text-xl font-black text-slate-800">{performance.totalTransactions} Tx</p>
                    </div>
                </div>

                {/* Lists Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    {/* Top Items */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Produk Terlaris</h3>
                        </div>
                        <div className="space-y-3">
                            {performance.topItems.slice(0, 4).map((item: any, i: number) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-black text-slate-300 w-4">{i + 1}</span>
                                        <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-600 transition-colors uppercase">{item.name}</span>
                                    </div>
                                    <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg">{item.count} Qty</span>
                                </div>
                            ))}
                            {performance.topItems.length === 0 && <p className="text-xs text-slate-400 italic">Belum ada penjualan item.</p>}
                        </div>
                    </div>

                    {/* Top Packages */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Paket Populer</h3>
                        </div>
                        <div className="space-y-3">
                            {performance.topPackages.slice(0, 4).map((pkg: any, i: number) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-black text-slate-300 w-4">{i + 1}</span>
                                        <span className="text-sm font-bold text-slate-600 group-hover:text-emerald-600 transition-colors uppercase">{pkg.name}</span>
                                    </div>
                                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg">{pkg.count}x</span>
                                </div>
                            ))}
                            {performance.topPackages.length === 0 && <p className="text-xs text-slate-400 italic">Belum ada penyewaan meja.</p>}
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="pt-6 border-t border-slate-100">
                    <button 
                        onClick={onBack}
                        className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-[2rem] shadow-xl shadow-slate-200 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                    >
                        <LayoutDashboard className="w-5 h-5 text-emerald-400" />
                        Selesai & Kembali ke Utama
                        <ChevronRight className="w-5 h-5 opacity-30" />
                    </button>
                    <p className="text-center text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-[0.2em]">Mandiri Billiard • Performance Management</p>
                </div>
            </div>
        </div>
    );
}
