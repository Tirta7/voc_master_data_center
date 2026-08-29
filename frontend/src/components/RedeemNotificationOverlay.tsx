'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { useRealtimeData } from '@/context/RealtimeDataContext';
import { useAuth } from '@/context/AuthContext';
import { socket } from '@/lib/socket';


export default function RedeemNotificationOverlay() {
    const { redeemQueue, dismissRedeem } = useRealtimeData();
    const { terminalId: currentTerminalId, user } = useAuth();

    // Only undismissed requests for this terminal
    const activeRedeem = redeemQueue.find(r => 
        !r.dismissed && 
        (!r.terminalId || !currentTerminalId || r.terminalId === currentTerminalId)
    );

    const isAuthorized = ['ADMIN', 'CASHIER', 'KASIR', 'OWNER', 'SUPERADMIN'].includes(user?.role?.toUpperCase() || '');

    if (!activeRedeem || !isAuthorized) return null;

    const handleDismiss = () => {
        dismissRedeem(activeRedeem.token);
        // Tell display to close the QR screen (reset to catalog)
        socket.emit('redeem_reset', { token: activeRedeem.token, memberId: activeRedeem.memberId });
    };

    const handleConfirm = async () => {
        try {
            const res = await axios.post(`/loyalty/redeem/confirm`, { 
                redeemToken: activeRedeem.token
            });
            alert(`Redeem Berhasil! ${res.data.itemName} untuk ${res.data.memberName}`);
            // Remove from queue entirely on success
            dismissRedeem(activeRedeem.token);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Gagal konfirmasi redeem.');
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 "
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="w-full max-w-lg bg-[#111827] border border-white/10 rounded-[3rem] p-8 sm:p-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] relative overflow-hidden"
                >
                    {/* Premium Accents */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-indigo-500 to-purple-600" />
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
                    
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-500/20">
                                <Gift className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Loyalty Redemption</p>
                                <h4 className="text-2xl font-black text-white italic tracking-tighter">REQ: {activeRedeem.terminalId || 'TRM-X'}</h4>
                            </div>
                        </div>
                        <button onClick={handleDismiss} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-6 sm:p-8 mb-8 space-y-6">
                        <div className="relative">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Customer Profile</p>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-2xl font-black text-white uppercase tracking-tight">{activeRedeem.memberName}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Reward Item</p>
                                <p className="text-sm font-black text-indigo-400 uppercase tracking-tight line-clamp-1">{activeRedeem.itemName}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Point Burn</p>
                                <p className="text-xl font-black text-amber-500 italic">-{activeRedeem.pointCost} <span className="text-[10px] font-bold not-italic">PTS</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={handleDismiss}
                            className="flex-1 py-5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all border border-white/5"
                        >
                            Tutup (Simpan ke Antrian)
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-[1.5] py-5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-indigo-500/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            <CheckCircle2 className="w-5 h-5" />
                            Konfirmasi Sekarang
                        </button>
                    </div>
                    
                    <p className="text-center mt-6 text-[9px] font-medium text-slate-600 uppercase tracking-[0.2em]">
                        Permintaan ini akan tersimpan di menu <span className="text-slate-400 font-black">Scan Penukaran</span> jika ditutup
                    </p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
