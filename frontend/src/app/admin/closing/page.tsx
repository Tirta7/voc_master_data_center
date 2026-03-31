'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { LogOut, Save, Calculator, AlertCircle, ShieldOff, Image as ImageIcon, X, UploadCloud, ArrowRight, CheckCircle2 } from 'lucide-react';
import InputField from '@/components/ui/InputField';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/components/ui/AlertProvider';
import DenominationWizard from './components/DenominationWizard';
import ClosingStockForm from './components/ClosingStockForm';
import ShiftSummaryCard from './components/ShiftSummaryCard';

const fmt = (n: number | undefined | null) => {
    if (n === undefined || n === null || isNaN(n)) return 'Rp 0';
    return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
};

interface ActiveShift {
    id: number;
    startTime: string;
    startedBy: string;
    cashStart: number;
    cashSystem: number;
    cashRevenue: number;
    nonCashRevenue: number;
    totalExpenses: number;
    stockReportStatus?: Record<string, string>;
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

    // New states for Evidence Upload
    const [attachmentUrl, setAttachmentUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post('/reports/closing-upload', formData);
            setAttachmentUrl(res.data.url);
            showAlert('Berhasil', 'Foto bukti berhasil diunggah.', { variant: 'success' });
        } catch (error) {
            console.error('Upload failed', error);
            showAlert('Gagal', 'Terjadi kesalahan saat mengunggah foto.', { variant: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const handleCloseShift = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeShift) return;

        const diff = closingCash - activeShift.cashSystem;
        const confirmMsg = diff === 0 
            ? 'Konfirmasi tutup toko dan akhiri shift?' 
            : `PERHATIAN: Ada selisih kas sebesar ${fmt(diff)}. Tetap simpan dan tutup toko?`;
        
        if (!window.confirm(confirmMsg)) return;

        setSubmitting(true);
        try {
            const res = await axios.patch(`/reports/shifts/${activeShift.id}/close`, {
                endedBy,
                closingCash,
                remarks,
                stockReports,
                attachmentUrl // Pass attachmentUrl to backend
            });
            setClosedShiftData(res.data);
            setSubmitting(false);
            setIsSuccess(true);
        } catch (error: any) {
            setSubmitting(false);
            showAlert('Gagal', error.response?.data?.message || 'Gagal menutup shift. Pastikan semua data terisi.', { variant: 'error' });
            console.error(error);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center group">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4 mx-auto" />
                <p className="text-slate-500 font-bold tracking-tight">Memeriksa Shift Aktif...</p>
            </div>
        </div>
    );

    if (!activeShift && !isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="bg-white p-10 rounded-3xl shadow-2xl shadow-slate-200/50 text-center max-w-md border border-slate-100">
                    <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 transform rotate-3">
                        <AlertCircle className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Tidak Ada Shift Aktif</h1>
                    <p className="text-slate-500 mb-8 font-medium">Anda harus memulai shift baru dari dashboard atau menu pengaturan sebelum bisa melakukan closing.</p>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-[0.98]"
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/30 p-4 lg:p-10">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Progress Indicator */}
                <div className="flex items-center gap-6 mb-8 px-4">
                    <div className="flex-1 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${step === 'STOCK' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-emerald-500 text-white'}`}>
                            {step === 'STOCK' ? '1' : <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <span className={`text-xs font-black tracking-widest uppercase ${step === 'STOCK' ? 'text-indigo-600' : 'text-slate-400'}`}>Stok</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                    <div className="flex-1 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${step === 'FINANCE' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-200 text-slate-400'}`}>
                            2
                        </div>
                        <span className={`text-xs font-black tracking-widest uppercase ${step === 'FINANCE' ? 'text-indigo-600' : 'text-slate-400'}`}>Keuangan</span>
                    </div>
                </div>

                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-200">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500/10 rounded-full -ml-10 -mb-10 blur-2xl" />
                    <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                                    <LogOut className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div>
                                    <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em]">Business Day</span>
                                    <h1 className="text-3xl font-black tracking-tight">Tutup Toko</h1>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <div className="bg-white/5 backdrop-blur-sm px-4 py-2 rounded-xl text-xs font-bold border border-white/10">
                                    🕒 {new Date(activeShift!.startTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                </div>
                                <div className="bg-white/5 backdrop-blur-sm px-4 py-2 rounded-xl text-xs font-bold border border-white/10">
                                    👤 {activeShift!.startedBy}
                                </div>
                            </div>
                        </div>
                        <div className="bg-indigo-600/20 backdrop-blur-md px-8 py-6 rounded-[2rem] border border-white/10 text-right">
                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Ekspektasi Kas Sistem</p>
                            <p className="text-3xl font-black tracking-tighter text-indigo-400">{fmt(activeShift!.cashSystem)}</p>
                        </div>
                    </div>

                    {/* Department Progress Bar */}
                    <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-4 items-center">
                        <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Status Laporan Stok:</p>
                        <div className="flex gap-3">
                            {['KITCHEN', 'BAR'].map(dept => {
                                const status = activeShift!.stockReportStatus?.[dept] || 'PENDING';
                                return (
                                    <div key={dept} className={`px-4 py-2 rounded-xl border flex items-center gap-2 transition-all ${
                                        status === 'DONE' 
                                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse'
                                    }`}>
                                        <div className={`w-2 h-2 rounded-full ${status === 'DONE' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-rose-400'}`} />
                                        <span className="text-[10px] font-black tracking-widest uppercase">{dept}: {status}</span>
                                        {status === 'DONE' && <CheckCircle2 className="w-3 h-3" />}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[9px] text-white/30 font-bold ml-auto">*Shift tidak bisa ditutup jika departemen masih PENDING</p>
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
                                    unit: '-'
                                }));
                                setStockReports(mappedReports as any);
                                setStep('FINANCE');
                            }} 
                        />
                    </div>
                ) : (
                    <>
                        {/* Revenue Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kas Awal</p>
                                <p className="text-lg font-black text-slate-800 tracking-tight">{fmt(activeShift!.cashStart)}</p>
                            </div>
                            <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100/50 shadow-xl shadow-emerald-100/20 group hover:bg-emerald-50 transition-colors">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Penjualan Tunai</p>
                                <p className="text-lg font-black text-emerald-700 tracking-tight">+{fmt(activeShift!.cashRevenue)}</p>
                            </div>
                            <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50 shadow-xl shadow-blue-100/20">
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Pendapatan QRIS/Debit</p>
                                <p className="text-lg font-black text-blue-700 tracking-tight">{fmt(activeShift!.nonCashRevenue)}</p>
                            </div>
                            <div className="bg-rose-50/50 p-6 rounded-[2rem] border border-rose-100/50 shadow-xl shadow-rose-100/20">
                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Pengeluaran (Petty Cash)</p>
                                <p className="text-lg font-black text-rose-700 tracking-tight">-{fmt(activeShift!.totalExpenses)}</p>
                            </div>
                        </div>

                        {/* Main Interaction Area */}
                        <div className="flex flex-col lg:flex-row gap-8 items-start">
                            <div className={`w-full ${showWizard ? 'lg:w-1/2' : 'max-w-2xl mx-auto'} transition-all duration-500`}>
                                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
                                    
                                    {/* Discrepancy Indicator Badge */}
                                    {closingCash > 0 && (
                                        <div className={`absolute top-8 right-8 px-5 py-2.5 rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase shadow-lg z-10 animate-in fade-in slide-in-from-top-4 duration-500 ${
                                            closingCash === activeShift!.cashSystem 
                                            ? 'bg-emerald-500 text-white shadow-emerald-200' 
                                            : 'bg-rose-500 text-white shadow-rose-200'
                                        }`}>
                                            {closingCash === activeShift!.cashSystem ? (
                                                <span className="flex items-center gap-2 small-caps">Balanced <CheckCircle2 className="w-3 h-3"/></span>
                                            ) : (
                                                <span className="flex items-center gap-2">Selisih: {fmt(closingCash - activeShift!.cashSystem)} <AlertCircle className="w-3 h-3"/></span>
                                            )}
                                        </div>
                                    )}

                                    <form onSubmit={handleCloseShift} className="p-10 space-y-8">
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Konfirmasi Kas Akhir</h2>
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowWizard(!showWizard)}
                                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                                                        showWizard 
                                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    <Calculator className="w-4 h-4" />
                                                    {showWizard ? 'Sembunyikan' : 'Kalkulator Kas'}
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <InputField
                                                    label="Nama Petugas"
                                                    value={endedBy}
                                                    onChange={val => setEndedBy(val)}
                                                    placeholder="Nama lengkap"
                                                    required
                                                />
                                                <InputField
                                                    label="Kas Fisik di Laci"
                                                    type="number"
                                                    value={closingCash === 0 ? '' : closingCash}
                                                    onChange={val => setClosingCash(Number(val))}
                                                    placeholder="0"
                                                    required
                                                    suffix={<span className="font-bold text-slate-300">Rp</span>}
                                                />
                                            </div>

                                            {/* Evidence Photo Upload */}
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Foto Bukti Kas / Struk EDC</label>
                                                <div className="relative group">
                                                    {attachmentUrl ? (
                                                        <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-100 shadow-lg">
                                                            <img 
                                                                src={`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}${attachmentUrl}`} 
                                                                alt="Evidence" 
                                                                className="w-full h-48 object-cover"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    target.src = 'https://placehold.co/600x400/indigo/white?text=Gambar+Tersimpan';
                                                                }}
                                                            />
                                                            <button 
                                                                type="button"
                                                                onClick={() => setAttachmentUrl('')}
                                                                className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black transition-colors"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => fileInputRef.current?.click()}
                                                            disabled={uploading}
                                                            className="w-full h-32 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
                                                        >
                                                            {uploading ? (
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Mengunggah...</span>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                                        <UploadCloud className="w-5 h-5" />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="text-xs font-black text-slate-600 uppercase tracking-widest">Unggah Foto Bukti</p>
                                                                        <p className="text-[10px] text-slate-400 font-bold mt-1">Struk Debit, Settlement QRIS, atau Kas di Laci</p>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                    <input 
                                                        type="file" 
                                                        ref={fileInputRef}
                                                        onChange={handleFileUpload}
                                                        className="hidden" 
                                                        accept="image/*"
                                                    />
                                                </div>
                                            </div>

                                            <InputField
                                                label="Catatan (Optional)"
                                                type="textarea"
                                                value={remarks}
                                                onChange={val => setRemarks(val)}
                                                placeholder="Sebutkan jika ada kendala atau catatan khusus..."
                                                rows={2}
                                            />
                                        </div>

                                        <div className="flex gap-4 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => setStep('STOCK')}
                                                className="px-8 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-[0.98]"
                                            >
                                                Kembali
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={submitting || uploading}
                                                className={`flex-1 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black py-5 rounded-[2rem] transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-[0.98] ${submitting || uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <Save className="w-5 h-5" />
                                                {submitting ? 'Memproses Closing...' : 'Akhiri Shift & Simpan'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>

                            {showWizard && (
                                <div className="w-full lg:w-1/2 flex-shrink-0 animate-in slide-in-from-right-8 duration-500">
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

