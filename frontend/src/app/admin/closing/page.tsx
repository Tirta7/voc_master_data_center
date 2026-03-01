'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { LogOut, Save, Calculator, AlertCircle, CheckCircle2, ShieldOff } from 'lucide-react';
import InputField from '@/components/ui/InputField';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ActiveShift {
    id: number;
    startTime: string;
    startedBy: string;
    openingCash: number;
}

export default function ShiftClosing() {
    const { hasPermission } = useAuth();
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
            setIsSuccess(true);
            setTimeout(() => router.push('/admin/dashboard'), 3000);
        } catch (error) {
            alert('Gagal menutup shift. Pastikan semua data terisi.');
            console.error(error);
        } finally {
            setSubmitting(false);
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
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 flex items-center justify-center">
            <div className="max-w-2xl w-full">
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100">
                    <div className="bg-indigo-600 p-8 text-white relative">
                        <div className="relative z-10">
                            <h1 className="text-2xl font-black mb-1">Tutup Toko (Closing)</h1>
                            <p className="opacity-80 font-medium">Rekonsiliasi Kas & Akhiri Sesi Kerja</p>
                        </div>
                        <LogOut className="absolute top-8 right-8 w-12 h-12 opacity-10" />
                    </div>

                    <form onSubmit={handleCloseShift} className="p-8 md:p-10 space-y-8">
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-200/60">
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

                        <div className="space-y-6">
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
                            className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-[0.98] ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
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
