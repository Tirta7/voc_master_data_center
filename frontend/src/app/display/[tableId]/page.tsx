'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRealtimeData } from '@/context/RealtimeDataContext';
import { Timer, Coffee, CreditCard, ChevronRight, Zap, Trophy, Percent } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
// import { getApiUrl } from '@/utils/urlUtils';
// const API_URL = getApiUrl();

export default function CustomerFacingDisplay() {
    const { tableId } = useParams();
    const { billiardTables, cafeTables, settings } = useRealtimeData();
    const [table, setTable] = useState<any>(null);

    // Find the specific table from the realtime data
    useEffect(() => {
        const tId = Number(tableId);
        const found = [...billiardTables, ...cafeTables].find(t => t.id === tId);
        if (found) {
            setTable(found);
        }
    }, [billiardTables, cafeTables, tableId]);

    if (!table) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-10 text-white text-center">
                <Zap className="w-16 h-16 text-indigo-500 animate-pulse mb-4" />
                <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">VOC System Billiard & Cafe</h1>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Menunggu Koneksi Meja...</p>
            </div>
        );
    }

    const tx = table.activeTransaction;
    const isAvailable = table.status?.toLowerCase() === 'available';

    // If table is available, show promotional screen
    if (isAvailable || !tx) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex flex-col relative overflow-hidden">
                {/* Background Decorations */}
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full"></div>

                <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-10 text-center">
                    <h1 className="text-6xl font-black text-white tracking-tighter uppercase mb-12">
                        Welcome to <span className="text-indigo-500">VOC System</span>
                    </h1>

                    {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] group hover:bg-white/10 transition-all">
                            <div className="w-20 h-20 bg-indigo-500 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-indigo-500/20">
                                <Trophy className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Play & Win</h3>
                            <p className="text-slate-400 text-sm font-medium">Main billiard dan dapatkan Scratch Card berhadiah langsung setiap transaksi tertentu!</p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] group hover:bg-white/10 transition-all">
                            <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-emerald-500/20">
                                <Percent className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Happy Hour</h3>
                            <p className="text-slate-400 text-sm font-medium">Paket spesial mulai dari jam 10 pagi. Diskon F&B hingga 20% khusus untuk Member!</p>
                        </div>
                    </div> */}

                    <div className="mt-16">
                        <p className="text-white font-black text-2xl uppercase tracking-[0.5em] opacity-30">BILLIARD & LOUNGE</p>
                    </div>
                </div>

                <div className="p-8 border-t border-white/5 bg-white/5 backdrop-blur-md flex justify-between items-center relative z-10">
                    <div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Meja Anda</p>
                        <p className="text-white text-3xl font-black tracking-tight uppercase">{table.tableName}</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white/10 px-6 py-3 rounded-2xl border border-white/5">
                        <div className="text-right">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-0.5">Sekarang</p>
                            <p className="text-white font-black text-lg">{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="w-[1px] h-8 bg-white/10"></div>
                        <div className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Active Transaction View
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row overflow-hidden">
            {/* Left Side: Order Details */}
            <div className="flex-1 p-8 lg:p-12 overflow-y-auto">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white shadow-xl shadow-slate-200/50 rounded-2xl flex items-center justify-center text-indigo-600">
                            <Zap className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 leading-none">VOC System</h2>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Order Details</p>
                        </div>
                    </div>
                    <div className="bg-indigo-600 px-6 py-3 rounded-2xl shadow-xl shadow-indigo-200">
                        <p className="text-white/60 text-[8px] font-black uppercase tracking-widest leading-none">Table</p>
                        <p className="text-white text-2xl font-black tracking-tighter uppercase leading-none mt-1">{table.tableName}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Billiard Status */}
                    {Number(tx.billiardTotal) > 0 && (
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                                        <Timer className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">Durasi Billiard</p>
                                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none px-py-1">{tx.fareName || 'Open Table'}</h3>
                                        <p className="text-lg font-black text-indigo-600 mt-2">{tx.sessionDuration || '00:00:00'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Biaya</p>
                                    <p className="text-xl font-black text-slate-900 leading-none">Rp {Number(tx.billiardTotal).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* F&B Items */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-2">Cafe & Lounge Orders</h4>
                        {(tx.orderItems || []).filter((i: any) => i.status?.toUpperCase() !== 'CANCELLED' && i.status?.toUpperCase() !== 'CANCEL_REQUESTED').map((item: any, idx: number) => (
                            <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-50 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                <div className="flex gap-4 items-center">
                                    <div className="w-10 h-10 bg-slate-100/50 text-slate-400 rounded-xl flex items-center justify-center">
                                        <Coffee className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 uppercase tracking-tight leading-none">{item.menuItem?.name || 'Cafe Item'}</p>
                                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
                                            {item.quantity} x Rp {Number(item.priceAtOrder).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <p className="font-black text-slate-900">Rp {Number(item.priceAtOrder * item.quantity).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>

                    {/* Summary Mobile-Only Footer */}
                    <div className="lg:hidden mt-10 pt-10 border-t border-slate-200 space-y-4">
                        <div className="flex justify-between items-center text-slate-400 font-black text-xs uppercase tracking-widest">
                            <span>Subtotal</span>
                            <span>Rp {Number(tx.grandTotal).toLocaleString()}</span>
                        </div>
                        <div className="bg-indigo-600 p-8 rounded-[2.5rem] flex justify-between items-center shadow-2xl shadow-indigo-200">
                            <div className="text-white">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Bill</p>
                                <p className="text-3xl font-black tracking-tighter leading-none mt-1">Rp {Number(tx.grandTotal).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Total & Extra Info */}
            <div className="w-full lg:w-[450px] bg-white border-l border-slate-100 p-8 lg:p-12 flex flex-col shadow-2xl shadow-slate-200">
                <div className="flex-1">
                    <div className="mb-10 text-center lg:text-left">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Ringkasan Tagihan</p>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                                <span className="text-slate-400 text-sm font-bold uppercase tracking-tight">Main Billiard</span>
                                <span className="text-slate-900 font-black">Rp {Number(tx.billiardTotal || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                                <span className="text-slate-400 text-sm font-bold uppercase tracking-tight">Food & Drinks</span>
                                <span className="text-slate-900 font-black">Rp {Number(tx.cafeTotal || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                                <span className="text-slate-400 text-sm font-bold uppercase tracking-tight">Tax & Services</span>
                                <span className="text-slate-900 font-black">Rp {Number((tx.vatAmount || 0) + (tx.serviceChargeAmount || 0)).toLocaleString()}</span>
                            </div>
                            {Number(tx.discountAmount || 0) > 0 && (
                                <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                                    <span className="text-rose-500 text-sm font-black uppercase tracking-tight">Privilege Discount</span>
                                    <span className="text-rose-500 font-black">-Rp {Number(tx.discountAmount).toLocaleString()}</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-12 bg-slate-950 p-10 rounded-[3rem] text-white relative overflow-hidden shadow-2xl shadow-slate-200 group">
                            {/* Decorative Elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px] -translate-y-1/2 translate-x-1/2"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 blur-[50px] translate-y-1/2 -translate-x-1/2"></div>

                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400/80 mb-2">Grand Total</p>
                                <h1 className="text-5xl font-black tracking-tighter leading-none mb-1 ring-offset-slate-900">
                                    <span className="text-xl mr-2 opacity-30">Rp</span>
                                    {Number(tx.grandTotal).toLocaleString()}
                                </h1>
                                {Number(tx.paidAmount || 0) > 0 && (
                                    <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mt-4 flex items-center gap-2">
                                        <Zap className="w-3 h-3 fill-emerald-400" /> Sudah Terbayar Rp {Number(tx.paidAmount).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* QRIS / Promo Placeholder */}
                    <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100 flex flex-col items-center justify-center text-center">
                        <CreditCard className="w-10 h-10 text-indigo-600 mb-4" />
                        <h4 className="text-indigo-900 font-black uppercase tracking-tight mb-2">Siap Bayar?</h4>
                        <p className="text-indigo-400 text-xs font-medium mb-6 leading-relaxed">Infokan ke kasir jika Anda ingin membayar menggunakan <span className="font-bold">QRIS, Debit, atau Membership.</span></p>

                        <div className="bg-white p-4 rounded-3xl shadow-xl shadow-indigo-100">
                            <QRCodeSVG
                                value={`/transactions/${tx.id}/pay-qris`}
                                size={120}
                                level="H"
                            />
                        </div>
                        <p className="text-[9px] text-indigo-300 font-black uppercase tracking-[0.2em] mt-6">Scan QR Member for Points</p>
                    </div>
                </div>

                <div className="mt-10 pt-10 border-t border-slate-50 flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-600 fill-indigo-600" />
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">VOC System Billiard & Cafe</span>
                </div>
            </div>
        </div>
    );
}
