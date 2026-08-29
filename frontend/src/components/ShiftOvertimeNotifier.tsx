'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Clock, AlertTriangle, CheckSquare, Square, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './ui/ToastProvider';

export default function ShiftOvertimeNotifier() {
    const { user, activeShift } = useAuth();
    const [settings, setSettings] = useState<any>(null);
    const [isOvertime, setIsOvertime] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [ignored, setIgnored] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const { showToast } = useToast();
    const [timeLeftStr, setTimeLeftStr] = useState<string>('');

    // Fetch settings to get shift schedules
    useEffect(() => {
        if (!activeShift) return;

        const fetchSettings = async () => {
            try {
                const res = await axios.get('/settings');
                setSettings(res.data);
            } catch (err) {
                console.error("Failed to fetch settings for overtime notifier", err);
            }
        };
        fetchSettings();
    }, [activeShift]);

    // Check overtime logic
    const checkOvertime = useCallback(() => {
        if (!activeShift || !settings || !settings.availableShifts) return;

        const currentShiftName = activeShift.shiftName;
        if (!currentShiftName || currentShiftName === 'CUSTOM') return;

        const shiftConfig = settings.availableShifts.find((s: any) => s.name === currentShiftName);
        if (!shiftConfig || !shiftConfig.endTime) return;

        const now = new Date();
        const [h, m] = shiftConfig.endTime.split(':').map(Number);
        
        // Use activeShift.startTime to determine the correct date context
        const scheduledEnd = new Date(activeShift.startTime);
        scheduledEnd.setHours(h, m, 0, 0);

        // Adjust for cross-midnight (e.g. start at 17:00, end at 02:00)
        if (scheduledEnd < new Date(activeShift.startTime)) {
            scheduledEnd.setDate(scheduledEnd.getDate() + 1);
        }

        const isTimeExceeded = now >= scheduledEnd;
        
        // PRE-NOTIFICATION WARNING LOGIC
        const warningMinutes = settings.shiftEndingWarningMinutes ? Number(settings.shiftEndingWarningMinutes) : 0;
        if (warningMinutes > 0 && !isTimeExceeded) {
            const warningThreshold = new Date(scheduledEnd.getTime() - warningMinutes * 60 * 1000);
            if (now >= warningThreshold) {
                const warningKey = `shift_warning_${activeShift.id}_${currentShiftName}`;
                if (!localStorage.getItem(warningKey)) {
                    showToast(
                        "Persiapan Akhir Shift",
                        `${warningMinutes} menit lagi jam operasional ${currentShiftName} akan berakhir. Harap bersiap untuk End Shift.`,
                        "warning"
                    );
                    localStorage.setItem(warningKey, "true");
                }
            }
        }
        
        if (isTimeExceeded) {
            setIsOvertime(true);
            
            // Check preferences in local storage
            const prefKey = `overtime_prefs_${activeShift.id}`;
            const prefsStr = localStorage.getItem(prefKey);
            let prefs = { ignored: false, snoozedUntil: null as number | null };
            
            if (prefsStr) {
                try {
                    prefs = JSON.parse(prefsStr);
                } catch (e) {}
            }

            setIgnored(prefs.ignored);

            if (!prefs.ignored) {
                const isSnoozing = prefs.snoozedUntil && now.getTime() < prefs.snoozedUntil;
                if (!isSnoozing) {
                    // Only show if not currently showing
                    setShowModal(prev => prev ? true : true);
                }
            }
        } else {
            setIsOvertime(false);
            setShowModal(false);
        }
    }, [activeShift, settings]);

    // Timer loop
    useEffect(() => {
        // Run immediately
        checkOvertime();
        
        // Check overtime more frequently (every 10s instead of 60s)
        const interval = setInterval(checkOvertime, 10000);
        return () => clearInterval(interval);
    }, [checkOvertime]);

    // Countdown timer for snooze
    useEffect(() => {
        if (!isOvertime || showModal || ignored) {
            setTimeLeftStr('');
            return;
        }

        const updateTimer = () => {
            if (!activeShift) return;
            const prefKey = `overtime_prefs_${activeShift.id}`;
            const prefsStr = localStorage.getItem(prefKey);
            if (prefsStr) {
                try {
                    const prefs = JSON.parse(prefsStr);
                    if (prefs.snoozedUntil) {
                        const diff = prefs.snoozedUntil - Date.now();
                        if (diff > 0) {
                            const minutes = Math.floor(diff / 60000);
                            const seconds = Math.floor((diff % 60000) / 1000);
                            setTimeLeftStr(`dalam ${minutes}:${seconds.toString().padStart(2, '0')}`);
                        } else {
                            setTimeLeftStr('');
                        }
                    } else {
                        setTimeLeftStr('');
                    }
                } catch (e) {}
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [isOvertime, showModal, ignored, activeShift]);

    const handleLanjutkanShift = () => {
        if (!activeShift) return;

        const prefKey = `overtime_prefs_${activeShift.id}`;
        
        if (dontShowAgain) {
            localStorage.setItem(prefKey, JSON.stringify({ ignored: true, snoozedUntil: null }));
            setIgnored(true);
        } else {
            // Snooze for 5 minutes
            const snoozeTime = Date.now() + 5 * 60 * 1000;
            localStorage.setItem(prefKey, JSON.stringify({ ignored: false, snoozedUntil: snoozeTime }));
        }
        
        setShowModal(false);
    };

    const handleEndShift = () => {
        setShowModal(false);
        window.dispatchEvent(new CustomEvent('openShiftHandover'));
    };

    if (!activeShift) return null;

    return (
        <>
            {/* Floating Badge (Visible when overtime but modal is hidden) */}
            <AnimatePresence>
                {isOvertime && !showModal && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="fixed bottom-6 right-4 lg:top-24 lg:bottom-auto z-[90] lg:right-8 bg-amber-500/10 border border-amber-500/30 shadow-lg  px-3 py-2 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-amber-500/20 transition-colors"
                        onClick={() => {
                            if (!ignored) setShowModal(true);
                        }}
                    >
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest flex items-center gap-1.5">
                            Shift Lanjutan 
                            {timeLeftStr && <span className="font-mono bg-amber-500 text-white px-1.5 py-0.5 rounded-md ml-1 tracking-normal">{timeLeftStr}</span>}
                            <Clock className="w-3 h-3" />
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Overtime Warning Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 "
                            onClick={() => {}} // Do not close on backdrop click
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-3xl w-full max-w-md shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            <div className="bg-amber-500 p-6 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                                    <AlertTriangle className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight uppercase">Waktu Shift Habis</h3>
                                <p className="text-amber-100 text-sm mt-1 font-medium">Jam {activeShift.shiftName} telah berakhir.</p>
                            </div>

                            <div className="p-8 space-y-6">
                                <p className="text-center text-slate-600 text-sm leading-relaxed">
                                    Sistem mendeteksi bahwa waktu shift Anda sudah melewati batas jadwal operasional. Harap perhatikan agar Anda tidak lupa menutup shift (End Shift).
                                </p>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleEndShift}
                                        className="w-full bg-slate-900 hover:bg-black text-white px-6 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 flex justify-center items-center gap-2"
                                    >
                                        <AlertCircle className="w-4 h-4 text-rose-500" />
                                        End Shift Sekarang
                                    </button>
                                    
                                    <button
                                        onClick={handleLanjutkanShift}
                                        className="w-full bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-6 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-sm active:scale-95"
                                    >
                                        Lanjutkan Shift
                                    </button>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <button 
                                        type="button"
                                        onClick={() => setDontShowAgain(!dontShowAgain)}
                                        className="flex items-center gap-3 w-full group"
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
                                            ${dontShowAgain ? 'bg-amber-500 border-amber-500' : 'border-slate-300 group-hover:border-amber-400'}`}
                                        >
                                            {dontShowAgain && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-700">
                                            Jangan tampilkan lagi pada shift ini
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
