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
        <div className="fixed inset-0 bg-[#0F172A] z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden overscroll-contain">
            {/* Animated Background */}
            <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-rose-600/10 rounded-full blur-[120px] animate-pulse delay-700" />

            <div className="w-full max-w-[400px] relative z-10 flex flex-col items-center">
                
                {/* Main Content Card */}
                <div className="w-full bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] p-8 sm:p-10 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />

                    {/* Status Icon Compact */}
                    <div className="mb-6 mx-auto relative flex justify-center">
                        {status === 'PENDING' && (
                            <div className="relative">
                                <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center animate-pulse">
                                    <Clock className="w-10 h-10 text-indigo-400" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/40 animate-bounce">
                                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                                </div>
                            </div>
                        )}
                        {status === 'APPROVED' && (
                            <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/40 scale-110 transition-transform">
                                <ShieldCheck className="w-10 h-10 text-white" />
                            </div>
                        )}
                        {status === 'DENIED' && (
                            <div className="w-20 h-20 bg-rose-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-rose-500/40 scale-110 transition-transform">
                                <XCircle className="w-10 h-10 text-white" />
                            </div>
                        )}
                    </div>

                    {status === 'PENDING' && (
                        <>
                            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter mb-2 uppercase">Verifikasi Akses</h2>
                            <p className="text-slate-400 text-xs sm:text-sm font-medium mb-8 leading-relaxed">
                                Permintaan login Anda sedang dalam antrean. <br />
                                <span className="text-indigo-400">Silakan hubungi Kasir / Admin.</span>
                            </p>

                            {/* Info Stack */}
                            <div className="flex flex-col gap-3 mb-8">
                                <div className="bg-white/[0.03] rounded-2xl p-4 flex items-center gap-4 text-left transition-colors hover:bg-white/[0.05]">
                                    <div className="w-11 h-11 bg-white/[0.05] rounded-xl flex items-center justify-center shrink-0">
                                        <UserCheck className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Identitas Pegawai</p>
                                        <p className="text-base sm:text-lg font-black text-white truncate">{pendingAccessData.employeeName}</p>
                                    </div>
                                </div>

                                <div className="bg-white/[0.03] rounded-2xl p-4 flex items-center gap-4 text-left transition-colors hover:bg-white/[0.05]">
                                    <div className="w-11 h-11 bg-white/[0.05] rounded-xl flex items-center justify-center shrink-0">
                                        <Clock className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Waktu Sistem Saat Ini</p>
                                        <p className="text-base sm:text-lg font-black text-white tracking-tight">{formattedTime}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Shift Warning */}
                            {pendingAccessData.isOutOfShift ? (
                                <div className="bg-rose-500/[0.05] rounded-2xl p-5 mb-8 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-5 text-center">
                                    <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center shrink-0">
                                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-rose-500 font-black text-sm mb-1 uppercase tracking-wider">Login Luar Jam Kerja</h3>
                                        <p className="text-rose-400/80 font-bold text-[11px] mb-1">
                                            Shift Anda: <span className="text-rose-400">{pendingAccessData.shiftName || 'Belum Diatur'}</span> ({pendingAccessData.shiftTimeRange || '--:--'})
                                        </p>
                                        <p className="text-[10px] text-rose-400/50 max-w-[250px] mx-auto italic font-medium leading-tight">
                                            Aktivitas ini direkam dan butuh persetujuan khusus Admin.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-emerald-500/[0.05] rounded-2xl p-5 mb-8 flex flex-col items-center gap-3 text-center">
                                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
                                        <ShieldAlert className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-emerald-500 font-black text-sm mb-1 uppercase tracking-wider">Shift Terdeteksi</h3>
                                        <p className="text-emerald-400 font-bold text-xs">
                                            Sesuai Jadwal ({pendingAccessData.shiftTimeRange})
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {status === 'APPROVED' && (
                        <div className="py-6 animate-in zoom-in-95 duration-500">
                            <h2 className="text-3xl font-black text-emerald-400 tracking-tighter mb-3 uppercase">Diizinkan</h2>
                            <p className="text-slate-400 text-sm font-medium mb-8">Selamat bekerja! Sistem sedang menginisialisasi lingkungan kerja.</p>
                            <div className="flex items-center justify-center gap-3 text-emerald-500 font-black text-xs uppercase tracking-widest">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Memuat...</span>
                            </div>
                        </div>
                    )}

                    {status === 'DENIED' && (
                        <div className="py-6 animate-in zoom-in-95 duration-500">
                            <h2 className="text-3xl font-black text-rose-500 tracking-tighter mb-3 uppercase">Ditolak</h2>
                            <p className="text-slate-400 text-sm font-medium mb-10">Maaf, permintaan akses tidak disetujui.</p>
                            <button
                                onClick={cancelPendingAccess}
                                className="bg-white/5 hover:bg-white/10 text-white font-black px-6 py-4 rounded-2xl flex items-center justify-center gap-2 w-full transition-all active:scale-95 text-xs uppercase tracking-widest"
                            >
                                <ChevronRight className="w-4 h-4 rotate-180" />
                                Kembali Login
                            </button>
                        </div>
                    )}

                    {status === 'PENDING' && (
                        <button
                            onClick={cancelPendingAccess}
                            className="text-slate-500 hover:text-white font-black transition-colors uppercase tracking-[0.15em] text-[10px] w-full pt-2"
                        >
                            Batalkan Permintaan
                        </button>
                    )}
                </div>

                {/* Footer system status */}
                <div className="mt-8 flex items-center justify-center gap-6 opacity-40">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
                        <span className="text-white text-[9px] font-black tracking-widest uppercase">Encryption Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccessPendingOverlay;
