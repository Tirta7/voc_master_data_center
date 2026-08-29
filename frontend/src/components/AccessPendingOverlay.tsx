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
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden overscroll-contain font-sans animate-in fade-in duration-300">
            {/* Darker, smooth backdrop */}
            <div className="absolute inset-0 bg-black/40 " />

            <div className="w-full max-w-[400px] relative z-10 flex flex-col items-center justify-end sm:justify-center h-full sm:h-auto">
                
                {/* Main Content Card - Premium Clean iOS Sheet (Light) */}
                <div className="w-full bg-[#f9f9fb]/95  sm:rounded-[36px] rounded-[36px] sm:rounded-b-[36px] rounded-b-none p-8 pb-[calc(2rem+env(safe-area-inset-bottom,20px))] sm:pb-8 text-center shadow-[0_-8px_40px_rgba(0,0,0,0.15)] border-t border-black/[0.04] relative overflow-hidden animate-in slide-in-from-bottom-[100%] duration-500 ease-out">
                    
                    {/* iOS drag handle indicator */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-black/15 rounded-full sm:hidden" />

                    {/* Status Animation Area */}
                    <div className="mt-4 mb-6 flex justify-center">
                        {status === 'PENDING' && (
                            <div className="w-20 h-20 flex items-center justify-center relative">
                                <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <Loader2 className="w-8 h-8 text-white animate-spin" strokeWidth={2.5} />
                                </div>
                            </div>
                        )}
                        {status === 'APPROVED' && (
                            <div className="w-20 h-20 flex items-center justify-center">
                                <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-in zoom-in duration-300">
                                    <ShieldCheck className="w-8 h-8 text-white" strokeWidth={2.5} />
                                </div>
                            </div>
                        )}
                        {status === 'DENIED' && (
                            <div className="w-20 h-20 flex items-center justify-center">
                                <div className="w-16 h-16 bg-gradient-to-tr from-rose-500 to-rose-400 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 animate-in zoom-in duration-300">
                                    <XCircle className="w-8 h-8 text-white" strokeWidth={2.5} />
                                </div>
                            </div>
                        )}
                    </div>

                    {status === 'PENDING' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-1.5">Verifikasi Akses</h2>
                                <p className="text-slate-500 text-[14px] font-normal leading-relaxed max-w-[280px] mx-auto">
                                    Login memerlukan persetujuan.<br/>Silakan hubungi Admin.
                                </p>
                            </div>

                            {/* Minimalist Info List */}
                            <div className="bg-white/60  rounded-3xl p-5 shadow-sm border border-black/[0.03]">
                                <div className="flex justify-between items-center border-b border-black/[0.04] pb-3 mb-3">
                                    <span className="text-[13px] text-slate-400 font-medium">Pegawai</span>
                                    <span className="text-[15px] font-semibold text-slate-700">{pendingAccessData.employeeName}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[13px] text-slate-400 font-medium">Waktu</span>
                                    <span className="text-[15px] font-semibold text-slate-700 tracking-tight">{formattedTime}</span>
                                </div>
                            </div>

                            {/* Refined Shift Warning */}
                            {pendingAccessData.isOutOfShift ? (
                                <div className="bg-rose-50 rounded-2xl p-4 flex items-start gap-3 text-left border border-rose-100">
                                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" strokeWidth={2} />
                                    <div>
                                        <h3 className="text-rose-600 font-semibold text-[13px] mb-0.5">Luar Jam Kerja</h3>
                                        <p className="text-rose-500/80 text-[12px] leading-tight font-medium">
                                            Shift: {pendingAccessData.shiftName || 'Belum Diatur'} ({pendingAccessData.shiftTimeRange || '--:--'})
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-emerald-50 rounded-2xl p-4 flex items-center gap-3 text-left border border-emerald-100">
                                    <ShieldAlert className="w-5 h-5 text-emerald-500 shrink-0" strokeWidth={2} />
                                    <div>
                                        <h3 className="text-emerald-600 font-semibold text-[13px] mb-0.5">Sesuai Jadwal</h3>
                                        <p className="text-emerald-500/80 text-[12px] leading-tight font-medium">
                                            Shift aktif: {pendingAccessData.shiftTimeRange}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {status === 'APPROVED' && (
                        <div className="py-8">
                            <h2 className="text-2xl font-semibold text-emerald-500 tracking-tight mb-2">Akses Diberikan</h2>
                            <p className="text-slate-500 text-[15px] font-normal">Sistem sedang memuat ruang kerja Anda...</p>
                        </div>
                    )}

                    {status === 'DENIED' && (
                        <div className="py-8 space-y-8">
                            <div>
                                <h2 className="text-2xl font-semibold text-rose-500 tracking-tight mb-2">Akses Ditolak</h2>
                                <p className="text-slate-500 text-[15px] font-normal">Permintaan login tidak disetujui.</p>
                            </div>
                            <button
                                onClick={cancelPendingAccess}
                                className="bg-slate-800 hover:bg-slate-900 text-white font-semibold py-4 rounded-2xl w-full transition-all active:scale-95 text-[15px] shadow-md shadow-slate-200"
                            >
                                Kembali
                            </button>
                        </div>
                    )}

                    {status === 'PENDING' && (
                        <button
                            onClick={cancelPendingAccess}
                            className="mt-6 text-rose-500 hover:text-rose-600 font-semibold transition-colors text-[14px] w-full py-2 active:opacity-70"
                        >
                            Batalkan Permintaan
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccessPendingOverlay;
