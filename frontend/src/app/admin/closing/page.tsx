'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { LogOut, Save, Calculator, AlertCircle, CheckCircle2, ShieldOff } from 'lucide-react';
import InputField from '@/components/ui/InputField';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/components/ui/AlertProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ActiveShift {
    id: number;
    startTime: string;
    startedBy: string;
    openingCash: number;
}

export default function ShiftClosing() {
    const { hasPermission } = useAuth();
    const { showAlert } = useAlert();
    const router = useRouter();
    const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
    const [closingCash, setClosingCash] = useState<number>(0);
    const [endedBy, setEndedBy] = useState('');
    const [remarks, setRemarks] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const fetchActiveShift = async () => {
            try {
                const res = await axios.get(`${API_URL}/reports/shifts/active`);
                setActiveShift(res.data);
            } catch (error) {
                console.error('Failed to fetch active shift', error);
            } finally {
                setLoading(false);
            }
        };

        fetchActiveShift();
    }, []);

    const handleCloseShift = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeShift) return;

        setSubmitting(true);
        try {
            await axios.patch(`${API_URL}/reports/shifts/${activeShift.id}/close`, {
                endedBy,
                closingCash,
                remarks
            });
            setSubmitting(false);
            setIsSuccess(true);
            setTimeout(() => router.push('/admin/dashboard'), 3000);
        } catch (error: any) {
            setSubmitting(false);
            showAlert('Gagal', error.response?.data?.message || 'Gagal menutup shift. Pastikan semua data terisi.', { variant: 'error' });
            console.error(error);
        }
    };

    if (loading) return <div className="p-8 text-center text-indigo-600 font-bold animate-pulse">Memeriksa Shift Aktif...</div>;

    if (!activeShift && !isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 text-center max-w-md">
                    <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-4">Tidak Ada Shift Aktif</h1>
                    <p className="text-slate-500 mb-8">Anda harus memulai shift baru dari dashboard atau menu pengaturan sebelum bisa melakukan closing.</p>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                    >
                        Kembali ke Dashboard
                    </button>
                </div>
            </div>
        )
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-emerald-500 p-6">
                <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md animate-bounce-slow">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-2">Shift Berhasil Ditutup</h1>
                    <p className="text-slate-500 mb-6">Laporan closing telah disimpan. Mengalihkan ke dashboard...</p>
                </div>
            </div>
        )
    }

    if (!hasPermission('SETTING_OPERATION')) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-10 text-center">
                <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mb-6 border-2 border-rose-100 shadow-xl shadow-rose-100/50">
                    <ShieldOff className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter uppercase">Akses Terbatas</h2>
                <p className="text-slate-500 max-w-md font-medium leading-relaxed">
                    Maaf, akun Anda tidak memiliki izin untuk melakukan closing shift / toko.
                    Silakan hubungi Administrator untuk mendapatkan akses.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-emerald-50/40 p-4 lg:p-10">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 rounded-3xl p-8 text-white shadow-2xl shadow-emerald-200">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full -ml-10 -mb-10" />
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                <LogOut className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Business Day</span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight">Tutup Toko</h1>
                        <p className="text-white/60 text-sm font-semibold mt-1">Rekonsiliasi Kas & Akhiri Sesi Kerja</p>
                        <div className="flex flex-wrap gap-3 mt-5">
                            <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                ðŸ• Mulai: {new Date(activeShift!.startTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                            <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                ðŸ’° Kas Awal: Rp {Number(activeShift!.openingCash).toLocaleString('id-ID')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-100/60 border border-slate-100 overflow-hidden">

                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200/60 m-8 mb-0">

                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Shift Dimulai</p>
                            <p className="font-bold text-slate-700 text-sm">
                                {new Date(activeShift!.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kas Awal</p>
                            <p className="font-bold text-slate-700">Rp {Number(activeShift!.openingCash).toLocaleString()}</p>
                        </div>
                    </div>

                    <form onSubmit={handleCloseShift} className="p-8 space-y-6">

                        <div className="space-y-5">
                            <InputField
                                label="Nama Petugas Closing"
                                value={endedBy}
                                onChange={val => setEndedBy(val)}
                                placeholder="Contoh: Budi (Manager)"
                                required
                            />

                            <InputField
                                label="Total Kas di Laci (Fisik)"
                                type="number"
                                value={closingCash === 0 ? '' : closingCash}
                                onChange={val => setClosingCash(Number(val))}
                                placeholder="0"
                                required
                                suffix={<><span className="font-bold text-slate-400 mr-2">Rp</span><Calculator className="w-5 h-5 text-slate-300" /></>}
                            />

                            <InputField
                                label="Catatan Tambahan (Remarks)"
                                type="textarea"
                                value={remarks}
                                onChange={val => setRemarks(val)}
                                placeholder="Sebutkan jika ada selisih kas atau insiden lainnya..."
                                rows={3}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className={`w-full bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 active:scale-[0.98] ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Save className="w-5 h-5" />
                            {submitting ? 'Memproses...' : 'Simpan & Tutup Toko'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

