"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle2, Wallet, Clock, Info, X, LogOut, PackageSearch, ChevronRight, ChevronLeft, ShieldAlert } from "lucide-react";
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
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Info, 2: Input Cash, 3: Stock Report
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [stockReports, setStockReports] = useState<Record<string, string>>({}); // { "type:id": physicalQty }
    const [stockNotes, setStockNotes] = useState<Record<string, string>>({}); // { "type:id": note }

    const isCashier = ['ADMIN', 'OWNER', 'KASIR', 'CASHIER'].includes(user?.role?.toUpperCase() || '');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    useBodyScrollLock(isOpen);

    useEffect(() => {
        if (isOpen) {
            fetchActiveShift();
            fetchInventoryItems();
            setStep(1);
            setCashPhysical("");
            setNote("");
            setStockReports({});
            setStockNotes({});
        }
    }, [isOpen]);

    const fetchInventoryItems = async () => {
        try {
            const [ingRes, menuRes] = await Promise.all([
                axios.get(`${API_URL}/inventory/ingredients`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                axios.get(`${API_URL}/cafe/menu`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);

            const ingredients = ingRes.data
                .filter((item: any) => item.isActive !== false)
                .map((i: any) => ({ ...i, reportingType: 'INGREDIENT', compositeId: `INGREDIENT:${i.id}` }));

            // Only show menu items that have stock tracking enabled (stockQuantity > 0 or has a value)
            const menuItems = menuRes.data
                .filter((item: any) => item.isActive !== false && (Number(item.stockQuantity) > 0 || item.categoryId === 1 /* optional: filter by category if needed */))
                .map((m: any) => ({ ...m, reportingType: 'MENU_ITEM', compositeId: `MENU_ITEM:${m.id}`, unit: m.unit || 'pcs' }));

            setInventoryItems([...ingredients, ...menuItems]);
        } catch (err) {
            console.error("Failed to fetch inventory items", err);
        }
    };

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
            const formattedStockReports = Object.entries(stockReports)
                .filter(([_, qty]) => qty !== "")
                .map(([compositeId, qty]) => {
                    const [type, id] = compositeId.split(':');
                    return {
                        ingredientId: type === 'INGREDIENT' ? parseInt(id) : undefined,
                        menuItemId: type === 'MENU_ITEM' ? parseInt(id) : undefined,
                        physicalStock: parseFloat(qty),
                        note: stockNotes[compositeId] || ""
                    };
                });

            const res = await axios.post(`${API_URL}/finance/shifts/end`, {
                cashPhysical: isCashier ? parseFloat(cashPhysical) : 0,
                note: note || "Shift closed",
                stockReports: formattedStockReports
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
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-[100]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-[1.25rem] flex items-center justify-center">
                            {isCashier ? <Wallet className="w-5 h-5 text-indigo-600" /> : <LogOut className="w-5 h-5 text-indigo-600" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 leading-tight">
                                {isCashier ? "Handover Shift" : "Akhiri Shift"}
                            </h2>
                            <p className="text-sm text-slate-500 font-medium">
                                {isCashier ? "Rekonsiliasi uang & stok harian" : "Pelaporan stok & sisa tugas operasional"}
                            </p>
                        </div>
                    </div>
                    {/* Tutup modal tanpa simpan apapun */}
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors group"
                        title="Batalkan & Tutup"
                    >
                        <X className="w-5 h-5 text-slate-400 group-hover:text-rose-500 transition-colors" />
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
                        {!isCashier && step === 1 ? (
                            <div className="space-y-8 py-4 text-center">
                                <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto text-indigo-600 animate-bounce">
                                    <LogOut className="w-10 h-10" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-slate-900">Selesaikan Tugas?</h3>
                                    <p className="text-sm text-slate-500 font-medium px-4">
                                        Anda akan mengakhiri sesi tugas hari ini. Pastikan tidak ada pesanan yang masih menggantung.
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
                                        className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all"
                                        onClick={handleEndShift}
                                        disabled={loading}
                                    >
                                        {loading ? "Memproses..." : "Selesaikan Shift"}
                                        {!loading && <LogOut className="w-4 h-4 ml-2 inline" />}
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
                                    onClick={() => setStep(isCashier ? 2 : 3)}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all"
                                >
                                    Lanjut
                                </button>
                            </div>
                        ) : step === 2 ? (
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
                                        className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all"
                                        onClick={() => setStep(3)}
                                    >
                                        Lanjut ke Stok
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex items-start gap-4">
                                    <PackageSearch className="w-5 h-5 text-indigo-600 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-indigo-900 leading-tight">Laporan Stok Fisik</p>
                                        <p className="text-[10px] text-indigo-700 mt-1 font-medium italic">Masukkan jumlah sisa barang di gudang/bar saat ini.</p>
                                    </div>
                                </div>

                                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                    {inventoryItems.map((item) => {
                                        const systemStock = Number(item.stockQuantity || 0);
                                        const physicalInput = stockReports[item.compositeId];
                                        const physicalStock = physicalInput !== "" && physicalInput !== undefined ? Number(physicalInput) : null;
                                        const discrepancy = physicalStock !== null ? physicalStock - systemStock : 0;
                                        const unitPrice = Number(item.costPrice || item.price || 0);
                                        const lossValue = discrepancy < 0 ? Math.abs(discrepancy) * unitPrice : 0;

                                        return (
                                            <div key={item.compositeId} className="p-5 bg-slate-50 border border-slate-100 rounded-3xl space-y-4 shadow-sm hover:border-slate-300 transition-all">
                                                <div className="flex items-center justify-between gap-6">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className={`text-[10px] font-black px-2 py-1 rounded-md text-white shadow-sm ${item.reportingType === 'INGREDIENT' ? 'bg-indigo-500' : 'bg-amber-500'}`}>
                                                                {item.reportingType === 'INGREDIENT' ? 'STOCK' : 'RETAIL'}
                                                            </span>
                                                            <p className="text-base font-black text-slate-900 truncate uppercase tracking-tight">{item.name}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Sesuai Sistem:</p>
                                                            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-lg text-[11px] font-black">{systemStock} {item.unit}</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-32 shrink-0">
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                className="w-full bg-white border-2 border-slate-200 rounded-2xl py-3 px-4 text-right font-black text-indigo-600 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none text-lg transition-all"
                                                                placeholder="0"
                                                                value={stockReports[item.compositeId] || ""}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (parseFloat(val) < 0) return;
                                                                    setStockReports({ ...stockReports, [item.compositeId]: val });
                                                                }}
                                                            />
                                                            {physicalStock !== null && (
                                                                <div className="absolute -top-3 -right-3 w-7 h-7 bg-indigo-600 border-4 border-white shadow-lg rounded-full flex items-center justify-center text-xs text-white animate-in zoom-in-0 duration-300">
                                                                    ✓
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {physicalStock !== null && (
                                                    <div className="pt-2 animate-in slide-in-from-top-2 duration-300">
                                                        <div className="relative">
                                                            <textarea
                                                                className="w-full bg-white border-2 border-slate-200 rounded-2xl py-3 px-4 text-sm font-medium text-slate-600 focus:border-indigo-600 outline-none min-h-[50px] transition-all"
                                                                placeholder={`Catatan untuk ${item.name} (opsional)...`}
                                                                value={stockNotes[item.compositeId] || ""}
                                                                onChange={(e) => setStockNotes({ ...stockNotes, [item.compositeId]: e.target.value })}
                                                            />
                                                        </div>

                                                        {discrepancy !== 0 && (
                                                            <div className={`mt-3 px-4 py-3 rounded-2xl flex items-center justify-between text-[11px] font-black uppercase tracking-widest ${discrepancy < 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-2 h-2 rounded-full ${discrepancy < 0 ? 'bg-rose-500' : 'bg-emerald-500'} animate-pulse`} />
                                                                    <span>
                                                                        {discrepancy < 0 ? `KURANG ${Math.abs(discrepancy)} ${item.unit}` : `LEBIH ${discrepancy} ${item.unit}`}
                                                                    </span>
                                                                </div>
                                                                {lossValue > 0 && (
                                                                    <span className="bg-rose-600 text-white px-3 py-1 rounded-xl shadow-md shadow-rose-600/20">
                                                                        SELISIH HARGA: Rp {lossValue.toLocaleString()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Summary Footer for Stock Step */}
                                    {Object.values(stockReports).some(v => v !== "") && (
                                        <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] text-white space-y-4 shadow-xl shadow-slate-900/20 animate-in zoom-in-95 duration-300">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-500/20 rounded-xl">
                                                    <ShieldAlert className="w-5 h-5 text-indigo-400" />
                                                </div>
                                                <h4 className="font-black text-sm uppercase tracking-widest">Ringkasan Laporan Stok</h4>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                                    <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Total Missing</p>
                                                    <p className="text-xl font-black text-rose-400">
                                                        {inventoryItems.reduce((acc, item) => {
                                                            const pStock = parseFloat(stockReports[item.compositeId] || "");
                                                            if (isNaN(pStock)) return acc;
                                                            const sStock = item.reportingType === 'INGREDIENT' ? parseFloat(item.stockQuantity || "0") : parseFloat(item.stockQuantity || "0");
                                                            return acc + (pStock < sStock ? 1 : 0);
                                                        }, 0)} Items
                                                    </p>
                                                </div>
                                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-right">
                                                    <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Lost Value</p>
                                                    <p className="text-xl font-black text-white">
                                                        Rp {inventoryItems.reduce((acc, item) => {
                                                            const pStock = parseFloat(stockReports[item.compositeId] || "");
                                                            if (isNaN(pStock)) return acc;
                                                            const sStock = parseFloat(item.stockQuantity || "0");
                                                            const diff = pStock - sStock;
                                                            const unitPrice = item.reportingType === 'INGREDIENT' ? Number(item.costPrice || 0) : Number(item.price || 0);
                                                            return acc + (diff < 0 ? Math.abs(diff) * unitPrice : 0);
                                                        }, 0).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-indigo-600/20 rounded-2xl text-center text-xs text-slate-300 font-medium">
                                                * Pastikan data stok fisik yang diinput sudah benar sesuai hitungan gudang.
                                            </div>
                                        </div>
                                    )}

                                    {inventoryItems.length === 0 && (
                                        <div className="py-10 text-center opacity-50">
                                            <p className="text-xs font-bold italic">Tidak ada item inventori.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setStep(isCashier ? 2 : 1)}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all"
                                    >
                                        Kembali
                                    </button>
                                    <button
                                        className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
                                        onClick={handleEndShift}
                                        disabled={loading}
                                    >
                                        {loading ? "Memproses..." : "Selesaikan & Logout"}
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
