'use client';

import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { LogOut, Loader2, CheckCircle2, AlertTriangle, Timer, ScanLine } from 'lucide-react';
import { socket } from '@/lib/socket';
import { useRotatingQrToken, QR_ROTATE_MS } from '@/lib/hooks/useRotatingQrToken';

/** Thin bar that drains while the current QR is on screen; restarts on every rotation. */
export function QrLifeBar({ issuedAt, color = 'bg-indigo-500' }: { issuedAt: number; color?: string }) {
    return (
        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <motion.div
                key={issuedAt}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: QR_ROTATE_MS / 1000, ease: 'linear' }}
                className={`h-full ${color}`}
            />
        </div>
    );
}

interface ScanResult {
    success: boolean;
    mode?: 'CHECKIN' | 'CHECKOUT';
    time?: string;
    isApproved?: boolean;
    workDurationMinutes?: number;
    overtimeMinutes?: number;
    message?: string;
}

interface Props {
    isOpen: boolean;
    userName?: string;
    /** Called after successful checkout (after the confirmation animation) or when skipped */
    onDone: () => void;
}

const fmtDuration = (mins?: number) => {
    if (mins == null) return '--';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h} jam ${m} mnt` : `${m} mnt`;
};

export default function CheckoutQrModal({ isOpen, userName, onDone }: Props) {
    const [result, setResult] = useState<ScanResult | null>(null);
    const { token, issuedAt, clear, refresh } = useRotatingQrToken('CHECKOUT', isOpen && !result);

    // Listen for kiosk result
    useEffect(() => {
        if (!isOpen) return;
        const onScan = (p: ScanResult) => {
            if (p?.mode && p.mode !== 'CHECKOUT') return;
            setResult(p);
            if (navigator.vibrate) navigator.vibrate(p?.success ? [80, 40, 80] : 300);
            if (p?.success) {
                clear();
                // User must manually click "Tutup & Logout" to screenshot the receipt
            } else {
                setTimeout(() => { setResult(null); refresh(); }, 3500);
            }
        };
        socket.on('qr_scan_result', onScan);
        return () => { socket.off('qr_scan_result', onScan); };
    }, [isOpen, onDone, clear, refresh]);

    useEffect(() => { if (!isOpen) setResult(null); }, [isOpen]);

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[10050] bg-[#F2F2F7] flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {/* Header */}
            <div className="relative flex items-center justify-center px-5 py-3.5 bg-white border-b border-slate-100">
                <span className="text-[17px] font-semibold text-slate-900 tracking-tight">Akhiri Kehadiran</span>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-10">
                <AnimatePresence mode="wait">
                    {result ? (
                        <motion.div
                            key="result"
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                            className={`w-full max-w-sm rounded-[28px] p-8 text-center shadow-2xl ${result.success
                                ? 'bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 shadow-indigo-200'
                                : 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-200'}`}
                        >
                            <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
                                className="mx-auto w-24 h-24 rounded-full bg-white/20 ring-8 ring-white/10 flex items-center justify-center mb-5"
                            >
                                {result.success
                                    ? <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.2} />
                                    : <AlertTriangle className="w-12 h-12 text-white" strokeWidth={2.2} />}
                            </motion.div>
                            <h3 className="text-2xl font-black text-white tracking-tight">
                                {result.success ? 'Check-out Berhasil!' : 'Check-out Gagal'}
                            </h3>
                            {result.success ? (
                                <>
                                    <p className="text-white/90 text-sm font-medium mt-2">
                                        Terima kasih atas kerja kerasnya, {userName?.split(' ')[0]} 🙏
                                    </p>
                                    <div className="mt-5 grid grid-cols-2 gap-2">
                                        <div className="bg-white/15 rounded-2xl py-3">
                                            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Jam Keluar</p>
                                            <p className="text-white text-lg font-black tabular-nums mt-0.5">
                                                {result.time ? new Date(result.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                            </p>
                                        </div>
                                        <div className="bg-white/15 rounded-2xl py-3">
                                            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Durasi Kerja</p>
                                            <p className="text-white text-lg font-black mt-0.5">{fmtDuration(result.workDurationMinutes)}</p>
                                        </div>
                                    </div>
                                    {!!result.overtimeMinutes && (
                                        <p className="mt-3 text-[11px] font-bold text-amber-200 uppercase tracking-wider">
                                            ⏱ Lembur {fmtDuration(result.overtimeMinutes)}
                                        </p>
                                    )}
                                    {result.isApproved === false && (
                                        <p className="mt-2 text-[11px] font-bold text-white/80 uppercase tracking-wider">⏳ Menunggu verifikasi admin</p>
                                    )}
                                    <button
                                        onClick={onDone}
                                        className="mt-6 w-full py-4 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Tutup & Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="text-white/90 text-sm font-medium mt-2">{result.message}</p>
                                    <p className="mt-5 text-white/70 text-xs">QR baru akan dibuat otomatis, silakan scan ulang.</p>
                                </>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div key="qr" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center w-full max-w-sm">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-100 text-rose-600 mb-4">
                                <ScanLine className="w-4 h-4" />
                                <span className="text-[11px] font-black uppercase tracking-widest">QR Check-out</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight text-center">Scan untuk Pulang</h3>
                            <p className="text-sm text-slate-500 text-center mt-1.5">
                                Shift sudah ditutup. Tunjukkan QR ini ke kamera Kiosk untuk mencatat jam pulang.
                            </p>

                            <div className="mt-8 p-7 bg-white rounded-3xl shadow-xl border-4 border-rose-50">
                                {token ? (
                                    <QRCodeSVG value={token} size={240} />
                                ) : (
                                    <div className="w-[240px] h-[240px] bg-slate-100 rounded-2xl flex items-center justify-center animate-pulse">
                                        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                                    </div>
                                )}
                            </div>

                            <div className="mt-5 w-[240px] space-y-2">
                                <QrLifeBar issuedAt={issuedAt} color="bg-rose-500" />
                                <div className="flex items-center justify-center gap-1.5 text-slate-400">
                                    <Timer className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                        QR berganti tiap detik · screenshot tidak berlaku
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={onDone}
                                className="mt-10 flex items-center gap-2 text-[13px] font-semibold text-slate-400 hover:text-rose-500 active:opacity-60 transition-colors"
                            >
                                <LogOut className="w-4 h-4" /> Lewati &amp; keluar tanpa check-out
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>,
        document.body
    );
}

const PENDING_KEY = 'pendingCheckoutQr';

/** Trigger the checkout QR from anywhere (persisted so it survives reloads). */
export function openCheckoutQr() {
    sessionStorage.setItem(PENDING_KEY, '1');
    window.dispatchEvent(new Event('openCheckoutQr'));
}

/** Mounted once in LayoutContent. */
export function CheckoutQrHost({ userName, onLogout }: { userName?: string; onLogout: () => void }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (sessionStorage.getItem(PENDING_KEY)) setOpen(true);
        const h = () => setOpen(true);
        window.addEventListener('openCheckoutQr', h);
        return () => window.removeEventListener('openCheckoutQr', h);
    }, []);

    const done = useCallback(() => {
        sessionStorage.removeItem(PENDING_KEY);
        setOpen(false);
        onLogout();
    }, [onLogout]);

    return <CheckoutQrModal isOpen={open} userName={userName} onDone={done} />;
}
