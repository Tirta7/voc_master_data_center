'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { socket } from '@/lib/socket';
import { Clock, ShieldAlert, Loader2, XCircle, ChevronRight, UserCheck, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

const AccessPendingOverlay = () => {
    const { pendingAccessData, cancelPendingAccess, login } = useAuth();
    useBodyScrollLock(true);
    const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'DENIED'>('PENDING');
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        // Listen for approval
        const handleApproval = (data: any) => {
            if (data.requestId === pendingAccessData.requestId || (data.userId && data.userId === pendingAccessData.userId)) {
                setStatus('APPROVED');
                // Automatically login after a small delay to show success
                setTimeout(() => {
                    login(data.access_token, data.user);
                }, 500);
            }
        };

        socket.on('access_approved', handleApproval);
        socket.on('access_approved_global', handleApproval);

        socket.on('access_denied', (data) => {
            if (data.requestId === pendingAccessData.requestId || (data.userId && data.userId === pendingAccessData.userId)) {
                setStatus('DENIED');
            }
        });
        socket.on('access_denied_global', (data) => {
            if (data.requestId === pendingAccessData.requestId || (data.userId && data.userId === pendingAccessData.userId)) {
                setStatus('DENIED');
            }
        });

        return () => {
            clearInterval(timer);
            socket.off('access_approved', handleApproval);
            socket.off('access_approved_global', handleApproval);
            socket.off('access_denied');
            socket.off('access_denied_global');
        };
    }, [pendingAccessData, login]);

    const formattedTime = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return (
        <div className="fixed inset-0 bg-[#0F172A] z-[9999] flex items-center justify-center p-6 overflow-hidden overscroll-contain">
            {/* Animated Background */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-600/10 rounded-full blur-[120px] animate-pulse delay-700" />

            <div className="w-full max-w-2xl relative z-10 flex flex-col items-center">
                {/* Status Icon */}
                <div className="mb-10 relative">
                    {status === 'PENDING' && (
                        <div className="relative">
                            <div className="w-32 h-32 bg-indigo-600/20 rounded-[2.5rem] flex items-center justify-center border border-indigo-500/30 animate-pulse">
                                <Clock className="w-16 h-16 text-indigo-400" />
                            </div>
                            <div className="absolute -top-4 -right-4 w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/40 animate-bounce">
                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                            </div>
                        </div>
                    )}
                    {status === 'APPROVED' && (
                        <div className="w-32 h-32 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/40 scale-110 transition-transform">
                            <ShieldCheck className="w-16 h-16 text-white" />
                        </div>
                    )}
                    {status === 'DENIED' && (
                        <div className="w-32 h-32 bg-rose-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-rose-500/40 scale-110 transition-transform">
                            <XCircle className="w-16 h-16 text-white" />
                        </div>
                    )}
                </div>

                {/* Main Content Card */}
                <div className="w-full bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />

                    {status === 'PENDING' && (
                        <>
                            <h2 className="text-4xl font-black text-white tracking-tighter mb-4">VERIFIKASI AKSES</h2>
                            <p className="text-slate-400 text-lg font-medium mb-10">
                                Permintaan login Anda sedang dalam antrean persetujuan. <br />
                                <span className="text-indigo-400">Silakan hubungi Kasir atau Admin untuk kononfirmasi.</span>
                            </p>

                            {/* Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                                <div className="bg-slate-900/50 rounded-3xl p-6 border border-white/5 text-left group hover:border-indigo-500/30 transition-colors">
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Identitas Pegawai</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                                            <UserCheck className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <p className="text-xl font-black text-white">{pendingAccessData.employeeName}</p>
                                    </div>
                                </div>

                                <div className="bg-slate-900/50 rounded-3xl p-6 border border-white/5 text-left group hover:border-indigo-500/30 transition-colors">
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Waktu Sistem Saat Ini</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <p className="text-xl font-black text-white tracking-tight">{formattedTime}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Shift Warning */}
                            {pendingAccessData.isOutOfShift ? (
                                <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-8 mb-10 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-5">
                                    <div className="w-14 h-14 bg-rose-500/20 rounded-2xl flex items-center justify-center border border-rose-500/30">
                                        <AlertTriangle className="w-8 h-8 text-rose-500" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-rose-500 font-black text-xl mb-1 uppercase tracking-tight">Login Luar Jam Kerja</h3>
                                        <p className="text-rose-400/80 font-bold">
                                            Shift Anda: <span className="text-rose-500">{pendingAccessData.shiftName || 'Belum Diatur'}</span> ({pendingAccessData.shiftTimeRange || '--:--'})
                                        </p>
                                        <p className="text-xs text-rose-400/60 mt-2 max-w-sm mx-auto italic font-medium">
                                            Aktivitas login di luar jam kerja direkam sebagai kebijakan audit sistem dan memerlukan persetujuan khusus Admin.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-8 mb-10 flex flex-col items-center gap-4">
                                    <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                                        <ShieldAlert className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-emerald-500 font-black text-xl mb-1 uppercase tracking-tight">Shift Terdeteksi</h3>
                                        <p className="text-emerald-400 font-bold">
                                            Menunggu Persetujuan Masuk ({pendingAccessData.shiftTimeRange})
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {status === 'APPROVED' && (
                        <div className="py-10 animate-in zoom-in-95 duration-500">
                            <h2 className="text-5xl font-black text-emerald-400 tracking-tighter mb-4">AKSES DIIZINKAN</h2>
                            <p className="text-slate-300 text-xl font-medium mb-8">Selamat bekerja! Sistem sedang menginisialisasi lingkungan kerja Anda.</p>
                            <div className="flex items-center justify-center gap-3 text-emerald-500 font-black text-lg">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span>
                                    {pendingAccessData?.roleName?.toUpperCase() === 'WAITER' ? 'MEMUAT PENUGASAN WAITER...' : 'MEMUAT DASHBOARD...'}
                                </span>
                            </div>
                        </div>
                    )}

                    {status === 'DENIED' && (
                        <div className="py-10 animate-in zoom-in-95 duration-500">
                            <h2 className="text-5xl font-black text-rose-500 tracking-tighter mb-4">AKSES DITOLAK</h2>
                            <p className="text-slate-300 text-xl font-medium mb-12">Maaf, permintaan akses Anda tidak disetujui untuk saat ini.</p>
                            <button
                                onClick={cancelPendingAccess}
                                className="bg-white/10 hover:bg-white/20 text-white font-black px-10 py-5 rounded-[2rem] flex items-center gap-3 mx-auto transition-all active:scale-95 border border-white/10 shadow-xl"
                            >
                                <ChevronRight className="w-6 h-6 rotate-180" />
                                KEMBALI KE LOGIN
                            </button>
                        </div>
                    )}

                    {status === 'PENDING' && (
                        <button
                            onClick={cancelPendingAccess}
                            className="text-slate-500 hover:text-white font-black transition-colors uppercase tracking-[0.2em] text-xs flex items-center gap-2 mx-auto"
                        >
                            Batalkan Permintaan
                        </button>
                    )}
                </div>

                {/* Footer system status */}
                <div className="mt-12 flex items-center gap-8 opacity-40">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]" />
                        <span className="text-white text-xs font-black tracking-widest uppercase">Encryption Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_10px_#6366f1]" />
                        <span className="text-white text-xs font-black tracking-widest uppercase">Gateway Node-7</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccessPendingOverlay;
