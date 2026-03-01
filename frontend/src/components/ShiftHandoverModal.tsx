"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle2, Wallet, Clock, Info, X, LogOut } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface ShiftHandoverModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userId: number;
}

const ShiftHandoverModal: React.FC<ShiftHandoverModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    userId
}) => {
    const { showToast } = useToast();
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [activeShift, setActiveShift] = useState<any>(null);
    const [cashPhysical, setCashPhysical] = useState<string>("");
    const [note, setNote] = useState("");
    const [step, setStep] = useState<1 | 2>(1); // 1: Info, 2: Input

    const isCashier = ['ADMIN', 'OWNER', 'KASIR', 'CASHIER'].includes(user?.role?.toUpperCase() || '');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    useBodyScrollLock(isOpen);

    useEffect(() => {
        if (isOpen) {
            fetchActiveShift();
            setStep(1);
            setCashPhysical("");
            setNote("");
        }
    }, [isOpen]);

    const fetchActiveShift = async () => {
        try {
            const res = await axios.get(`${API_URL}/finance/shifts/active`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setActiveShift(res.data);
        } catch (err) {
            console.error("Failed to fetch active shift", err);
        }
    };

    const formatDisplay = (value: string) => {
        if (!value) return "";
        const numeric = value.replace(/\D/g, "");
        return Number(numeric).toLocaleString('id-ID');
    };

    const handleCashChange = (val: string) => {
        const numeric = val.replace(/\D/g, "");
        setCashPhysical(numeric);
    };

    const handleEndShift = async () => {
        if (isCashier && !cashPhysical) {
            showToast("Input Diperlukan", "Silakan masukkan jumlah uang fisik di laci.", "warning");
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/finance/shifts/end`, {
                cashPhysical: isCashier ? parseFloat(cashPhysical) : 0,
                note: isCashier ? note : "Auto-closed by non-cashier role"
            }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (isCashier) {
                showToast("Shift Ditutup", `Shift berhasil ditutup. Selisih: Rp ${res.data.discrepancy.toLocaleString()}`, "info");
            } else {
                showToast("Shift Selesai", "Shift Anda telah berhasil diakhiri.", "info");
            }

            // Always logout after shift end to return to login screen
            setTimeout(() => {
                logout();
            }, 1500); // Small delay to let toast be visible

            onSuccess();
            onClose();
        } catch (err: any) {
            showToast("Gagal Menutup Shift", err.response?.data?.message || "Terjadi kesalahan", "warning");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 pb-4 flex items-center justify-between border-b">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-xl">
                            {isCashier ? <Wallet className="w-5 h-5 text-indigo-600" /> : <LogOut className="w-5 h-5 text-indigo-600" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 leading-tight">
                                {isCashier ? "Handover Shift" : "Akhiri Tugas"}
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">
                                {isCashier ? "Rekonsiliasi uang laci" : "Konfirmasi selesai shift"}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {!activeShift ? (
                    <div className="p-10 text-center space-y-4">
                        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle className="w-8 h-8 text-amber-500" />
                        </div>
                        <p className="font-bold text-slate-800">Tidak ada shift aktif yang ditemukan.</p>
                        <button onClick={onClose} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl transition-all">Tutup</button>
                    </div>
                ) : (
                    <div className="p-6 space-y-6 overflow-y-auto overscroll-contain max-h-[calc(100vh-120px)]">
                        {!isCashier ? (
                            <div className="space-y-8 py-4 text-center">
                                <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto text-indigo-600 animate-bounce">
                                    <LogOut className="w-10 h-10" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-slate-900">Selesaikan Shift?</h3>
                                    <p className="text-sm text-slate-500 font-medium px-4">
                                        Anda akan mengakhiri sesi tugas hari ini. Pastikan semua pesanan Anda telah diproses.
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
                                        onClick={handleEndShift}
                                        disabled={loading}
                                    >
                                        {loading ? "Memproses..." : "Ya, Akhiri Shift"}
                                    </button>
                                </div>
                            </div>
                        ) : step === 1 ? (
                            <div className="space-y-6">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Nama Shift</span>
                                        <span className="font-bold text-indigo-600">{activeShift?.shiftName || 'Custom/Manual'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Mulai Shift</span>
                                        <span className="font-bold text-slate-900">{new Date(activeShift?.startTime).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Modal Awal</span>
                                        <span className="font-bold text-slate-900">Rp {Number(activeShift?.cashStart).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-emerald-600 font-medium">Top-up Membership (+)</span>
                                        <span className="font-bold text-emerald-600">Rp {Number(activeShift?.totalTopUp || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                                        <span className="text-slate-500">Uang yang Seharusnya</span>
                                        <span className="font-bold text-indigo-600">Rp {Number(activeShift?.cashSystem).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                    <Info className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                                    <p className="text-xs text-indigo-900 leading-relaxed font-medium">
                                        Anda wajib menghitung uang fisik di laci (tunai) dan membandingkannya dengan data sistem.
                                        Sistem menghitung: <span className="font-black">Modal + Tunai Masuk - Pengeluaran Kas</span>.
                                    </p>
                                </div>

                                <button
                                    onClick={() => setStep(2)}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all"
                                >
                                    Mulai Rekonsiliasi
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Uang Fisik di Laci</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 font-black text-xl text-slate-900 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none"
                                            placeholder="0"
                                            value={formatDisplay(cashPhysical)}
                                            onChange={(e) => handleCashChange(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold px-1 italic">Input jumlah tunai murni (titik ditambahkan otomatis).</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Catatan</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-4 font-bold text-slate-900 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none"
                                        placeholder="Misal: Selisih karena pembulatan..."
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                    />
                                </div>

                                {cashPhysical && (
                                    <div className={`p-5 rounded-3xl border-2 flex items-center justify-between transition-all ${Math.abs(parseFloat(cashPhysical) - Number(activeShift.cashSystem)) < 1
                                        ? 'bg-green-50 border-green-100'
                                        : 'bg-rose-50 border-rose-100'
                                        }`}>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Status Keuangan</p>
                                            <p className={`text-lg font-black ${Math.abs(parseFloat(cashPhysical) - Number(activeShift.cashSystem)) < 1 ? 'text-green-600' : 'text-rose-600'
                                                }`}>
                                                {Math.abs(parseFloat(cashPhysical) - Number(activeShift.cashSystem)) < 1
                                                    ? "COCOK (MATCH)"
                                                    : `SELISIH Rp ${(parseFloat(cashPhysical) - Number(activeShift.cashSystem)).toLocaleString()} (${parseFloat(cashPhysical) > Number(activeShift.cashSystem) ? 'LEBIH' : 'KURANG'})`
                                                }
                                            </p>
                                        </div>
                                        {Math.abs(parseFloat(cashPhysical) - Number(activeShift.cashSystem)) < 1 ? (
                                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                                        ) : (
                                            <AlertCircle className="w-8 h-8 text-rose-500" />
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all"
                                    >
                                        Kembali
                                    </button>
                                    <button
                                        className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
                                        onClick={handleEndShift}
                                        disabled={loading}
                                    >
                                        {loading ? "Memproses..." : "Tutup Shift"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShiftHandoverModal;
