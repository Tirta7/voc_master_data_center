'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { LogOut, Save, Calculator, AlertCircle, CheckCircle2, ShieldOff } from 'lucide-react';
import InputField from '@/components/ui/InputField';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/components/ui/AlertProvider';
import DenominationWizard from './components/DenominationWizard';
import ClosingStockForm from './components/ClosingStockForm';
import ShiftSummaryCard from './components/ShiftSummaryCard';
// import { API_URL } from '@/utils/urlUtils';

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

interface ActiveShift {
    id: number;
    startTime: string;
    startedBy: string;
    openingCash: number;
    cashSystem: number;
}

interface StockReport {
    itemId: number;
    type: 'INGREDIENT' | 'MENU_ITEM';
    name: string;
    systemStock: number;
    physicalStock: number;
    discrepancy: number;
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
    const [showWizard, setShowWizard] = useState(false);
    const [stockReports, setStockReports] = useState<StockReport[]>([]);
    const [step, setStep] = useState<'STOCK' | 'FINANCE'>('STOCK');
    const [closedShiftData, setClosedShiftData] = useState<any>(null);

    useEffect(() => {
        const fetchActiveShift = async () => {
            try {
                const res = await axios.get(`/reports/shifts/active`);
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
            const res = await axios.patch(`/reports/shifts/${activeShift.id}/close`, {
                endedBy,
                closingCash,
                remarks,
                stockReports
            });
            setClosedShiftData(res.data);
            setSubmitting(false);
            setIsSuccess(true);
            // setTimeout(() => router.push('/admin/dashboard'), 3000); // Remove auto-redirect to allow viewing summary
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

    if (isSuccess && closedShiftData) {
        return (
            <div className="min-h-screen bg-slate-50 p-4 lg:p-10 flex items-center justify-center">
                <ShiftSummaryCard 
                    performance={closedShiftData.performanceSummary}
                    onBack={() => router.push('/admin/dashboard')}
                />
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
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Progress Indicator */}
                <div className="flex items-center justify-center gap-4 mb-2">
                    <div className={`h-2 flex-1 rounded-full transition-all duration-500 ${step === 'STOCK' || step === 'FINANCE' ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                    <div className={`h-2 flex-1 rounded-full transition-all duration-500 ${step === 'FINANCE' ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                </div>

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
                                🕒 Mulai: {new Date(activeShift!.startTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                            <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                💰 Kas Awal: {fmt(activeShift!.openingCash)}
                            </div>
                        </div>
                    </div>
                </div>

                {step === 'STOCK' ? (
                    <div className="max-w-xl mx-auto w-full">
                        <ClosingStockForm 
                            onApply={(reports) => {
                                const mappedReports = reports.map(r => ({
                                    ingredientId: r.type === 'INGREDIENT' ? r.itemId : undefined,
                                    menuItemId: r.type === 'MENU_ITEM' ? r.itemId : undefined,
                                    physicalStock: r.physicalStock,
                                    systemStock: r.systemStock,
                                    itemName: r.name,
                                    unit: '-' // will be handled by backend usually
                                }));
                                setStockReports(mappedReports as any);
                                setStep('FINANCE');
                            }} 
                        />
                    </div>
                ) : (
                    <>
                        {/* Reconciliation Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kas Awal (Modal)</p>
                                <p className="text-xl font-black text-slate-800 tracking-tighter">{fmt(activeShift!.openingCash)}</p>
                            </div>
                            <div className="bg-indigo-600 p-6 rounded-3xl border border-indigo-500 shadow-xl shadow-indigo-100 text-white">
                                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Ekspektasi Kas (Sistem)</p>
                                <p className="text-xl font-black tracking-tighter">{fmt(activeShift!.cashSystem)}</p>
                            </div>
                        </div>

                        {/* Main Form & Wizard Toggle */}
                        <div className="flex flex-col lg:flex-row gap-6 items-start">
                            <div className={`w-full ${showWizard ? 'lg:w-1/2' : 'max-w-2xl mx-auto'} transition-all duration-500`}>
                                <div className="bg-white rounded-3xl shadow-xl shadow-slate-100/60 border border-slate-100 overflow-hidden relative">
                                    {/* Discrepancy Indicator Badge */}
                                    {closingCash > 0 && (
                                        <div className={`absolute top-6 right-6 px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase shadow-lg ${
                                            closingCash === activeShift!.cashSystem 
                                            ? 'bg-emerald-500 text-white shadow-emerald-200' 
                                            : 'bg-rose-500 text-white shadow-rose-200'
                                        }`}>
                                            {closingCash === activeShift!.cashSystem ? 'Balanced' : `Selisih: ${fmt(closingCash - activeShift!.cashSystem)}`}
                                        </div>
                                    )}

                                    <form onSubmit={handleCloseShift} className="p-8 space-y-6">
                                        <div className="space-y-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <h2 className="text-lg font-black text-slate-800 tracking-tight">Formulir Closing</h2>
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowWizard(!showWizard)}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                                        showWizard 
                                                        ? 'bg-indigo-50 text-indigo-600' 
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    <Calculator className="w-4 h-4" />
                                                    {showWizard ? 'Tutup Kalkulator' : 'Gunakan Kalkulator Kas'}
                                                </button>
                                            </div>

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

                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setStep('STOCK')}
                                                className="px-6 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all"
                                            >
                                                Kembali
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className={`flex-1 bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 active:scale-[0.98] ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <Save className="w-5 h-5" />
                                                {submitting ? 'Memproses...' : 'Simpan & Tutup Toko'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>

                            {showWizard && (
                                <div className="w-full lg:w-1/2 flex-shrink-0">
                                    <DenominationWizard 
                                        currentTotal={activeShift!.cashSystem}
                                        onApply={(total) => {
                                            setClosingCash(total);
                                            setShowWizard(false);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

