"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    AlertCircle, 
    CheckCircle2, 
    Wallet, 
    Clock, 
    Info, 
    X, 
    LogOut, 
    PackageSearch, 
    ChevronRight, 
    ChevronLeft, 
    ShieldAlert, 
    ArrowRight,
    Loader2,
    Check,
    Timer,
    AlertTriangle,
    CheckSquare,
    TrendingUp,
    History,
    Zap,
    Scale,
    Layers,
    ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
    const [deptPendingItems, setDeptPendingItems] = useState<Record<string, any>>({});

    const userRole = user?.role?.toUpperCase() || '';
    const isAdminOrCashier = ['ADMIN', 'OWNER', 'KASIR', 'CASHIER'].some(r => userRole.includes(r));
    
    const getUserDepartment = (role: string): string => {
        const r = role?.toUpperCase() || '';
        if (['ADMIN', 'OWNER', 'KASIR', 'CASHIER'].some(key => r.includes(key))) return 'CASHIER';
        if (['KITCHEN', 'COOK', 'CHEF'].some(key => r.includes(key))) return 'KITCHEN';
        if (['BAR', 'BARTENDER'].some(key => r.includes(key))) return 'BAR';
        if (['WAITER', 'PELAYAN'].some(key => r.includes(key))) return 'WAITER';
        return 'STAFF';
    };

    const currentUserDept = getUserDepartment(user?.role || '');

    useBodyScrollLock(isOpen);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const shiftRes = await axios.get(`/finance/shifts/active`);
            const currentShift = shiftRes.data;
            setActiveShift(currentShift);

            const [ingRes, menuRes] = await Promise.all([
                axios.get(`/inventory/ingredients`),
                axios.get(`/cafe/menu`)
            ]);

            // Filter mandatory-only items:
            const ingredients = (ingRes.data || [])
                .filter((item: any) => {
                    if (item.isActive === false) return false;
                    const isMandatory = item.isHighValue || item.isMandatoryReporting;
                    if (!isMandatory) return false;

                    const isMyDept = item.department === currentUserDept;
                    const isGlobalWatch = isAdminOrCashier; 
                    return isMyDept || isGlobalWatch;
                })
                .map((i: any) => ({ ...i, reportingType: 'INGREDIENT', compositeId: `INGREDIENT:${i.id}` }));

            const menuItems = (menuRes.data || [])
                .filter((item: any) => {
                    if (item.isActive === false) return false;
                    const isMandatory = item.isHighValue || item.isMandatoryReporting;
                    if (!isMandatory) return false;

                    const isMyDept = item.department === currentUserDept;
                    const isGlobalWatch = isAdminOrCashier;
                    return isMyDept || isGlobalWatch;
                })
                .map((m: any) => ({ ...m, reportingType: 'MENU_ITEM', compositeId: `MENU_ITEM:${m.id}`, unit: m.unit || 'pcs' }));

            setInventoryItems([...ingredients, ...menuItems]);

            if (isAdminOrCashier && currentShift) {
                const depts = ['KITCHEN', 'BAR', 'CASHIER'].filter(d => d !== currentUserDept);
                const pendingData: any = {};
                for (const dept of depts) {
                    try {
                        const res = await axios.get(`/finance/shifts/${currentShift.id}/pending-stock/${dept}`);
                        pendingData[dept] = res.data;
                    } catch (e) {
                        console.error(`Status pending ${dept} gagal dimuat`, e);
                    }
                }
                setDeptPendingItems(pendingData);
            }

            setStep(1);
            setCashPhysical("");
            setNote("");
        } catch (err) {
            console.error("Gagal memuat data handover", err);
            showToast("Error", "Gagal memuat data shift aktif", "warning");
        } finally {
            setLoading(false);
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
        if (isAdminOrCashier && step === 2 && !cashPhysical) {
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

            // Finalize and close the shift
            await axios.post(`/finance/shifts/end`, {
                cashPhysical: isAdminOrCashier ? parseFloat(cashPhysical) : 0,
                note: note || (isAdminOrCashier ? "Shift closed" : "Department report submitted & shift ended"),
                stockReports: formattedStockReports
            });

            showToast(
                isAdminOrCashier ? "Shift Berhasil Diakhiri" : "Laporan Berhasil", 
                "Sesi Anda telah ditutup. Aplikasi akan logout otomatis.", 
                "success"
            );

            // Wait a bit for the toast, then logout immediately
            setTimeout(() => {
                logout();
            }, 800);
        } catch (err: any) {
            showToast("Gagal Mengirim Laporan", err.response?.data?.message || "Terjadi kesalahan", "warning");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const renderStepper = () => {
        const steps = [
            { id: 1, label: 'Overview', icon: <History className="w-5 h-5" /> },
            { id: 2, label: 'Keuangan', icon: <Wallet className="w-5 h-5" />, hide: !isAdminOrCashier },
            { id: 3, label: 'Inventory Audit', icon: <PackageSearch className="w-5 h-5" /> }
        ].filter(s => !s.hide);

        return (
            <div className="flex items-center justify-between px-12 mb-10 relative">
                <div className="absolute top-1/2 left-24 right-24 h-0.5 bg-slate-100 -translate-y-1/2 -z-10" />
                {steps.map((s, idx) => {
                    const isActive = step === s.id;
                    const isCompleted = step > s.id;
                    return (
                        <div key={s.id} className="flex flex-col items-center gap-3 group">
                            <motion.div 
                                initial={false}
                                animate={{
                                    scale: isActive ? 1.2 : 1,
                                    backgroundColor: isActive ? '#4f46e5' : isCompleted ? '#10b981' : '#ffffff',
                                    borderColor: isActive ? '#e0e7ff' : isCompleted ? '#d1fae5' : '#f1f5f9',
                                    color: isActive || isCompleted ? '#ffffff' : '#94a3b8'
                                }}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center border-4 transition-all`}
                            >
                                {isCompleted ? <Check className="w-6 h-6" /> : s.icon}
                            </motion.div>
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                                {s.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 transition-all">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-[3rem] w-full max-w-5xl overflow-hidden relative border border-slate-200 flex flex-col max-h-[92vh]"
            >
                {/* Premium Glow Header */}
                <div className="px-10 py-8 border-b border-slate-100/50 flex justify-between items-center bg-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl -mr-32 -mt-32 rounded-full pointer-events-none" />
                    
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl flex items-center justify-center rotate-3 border border-indigo-500/30">
                            <LogOut className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mb-1">Final Process</p>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                                {isAdminOrCashier ? "Handover & Settlement" : "Penyelesaian Tugas"}
                            </h2>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose} 
                        className="w-12 h-12 flex items-center justify-center hover:bg-rose-50 rounded-2xl transition-all group relative z-10"
                    >
                        <X className="w-6 h-6 text-slate-400 group-hover:text-rose-500 group-hover:rotate-90 transition-all duration-300" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-10 py-8">
                    <AnimatePresence mode="wait">
                        {loading && !activeShift ? (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-24 gap-6"
                            >
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                                    <Zap className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-black text-slate-900 uppercase tracking-tight">Syncing Database...</p>
                                    <p className="text-sm font-bold text-slate-400">Menarik data pelaporan untuk departemen {currentUserDept}</p>
                                </div>
                            </motion.div>
                        ) : !activeShift ? (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-24 text-center space-y-8"
                            >
                                <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-rose-500 border border-rose-100">
                                    <AlertTriangle className="w-12 h-12" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-2xl font-black text-slate-900 uppercase">Shift Not Active</h3>
                                    <p className="text-base text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">Sesi ini mungkin sudah ditutup atau cache browser Anda sudah lama.</p>
                                </div>
                                <button onClick={onClose} className="px-10 py-5 bg-slate-900 text-white font-black rounded-2xl active:scale-95 transition-all border border-slate-800">CLOSE APPLICATION</button>
                            </motion.div>
                        ) : (
                            <div key="handover-content">
                                {renderStepper()}

                                <AnimatePresence mode="wait">
                                    {/* Step 1: Summary Info */}
                                    {step === 1 && (
                                        <motion.div 
                                            key="step1"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="space-y-8"
                                        >
                                             {isAdminOrCashier && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="p-8 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/50 rounded-[2.5rem] group transition-all">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center"><Wallet className="w-4 h-4" /></div>
                                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Modal Operasional</p>
                                                        </div>
                                                        <p className="text-3xl font-black text-indigo-950">Rp {Number(activeShift?.cashStart || 0).toLocaleString()}</p>
                                                    </div>
                                                    <div className="p-8 bg-gradient-to-br from-emerald-50 to-white border border-emerald-100/50 rounded-[2.5rem] group transition-all">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
                                                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Tunai Real-time</p>
                                                        </div>
                                                        <p className="text-3xl font-black text-emerald-950">Rp {Number(activeShift?.cashRevenue || 0).toLocaleString()}</p>
                                                    </div>

                                                    <div className="p-8 bg-gradient-to-br from-rose-50 to-white border border-rose-100/50 rounded-[2.5rem] group transition-all">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center"><AlertCircle className="w-4 h-4" /></div>
                                                            <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Total Pengeluaran</p>
                                                        </div>
                                                        <p className="text-3xl font-black text-rose-950">Rp {Number(activeShift?.totalExpenses || 0).toLocaleString()}</p>
                                                    </div>

                                                    {/* New: Payment Method Breakdown */}
                                                    <div className="md:col-span-3 p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem]">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                                            <Layers className="w-3 h-3 text-indigo-500" /> Rincian Pendapatan Shift (Real-time)
                                                        </p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                            {(() => {
                                                                const paymentMethods = activeShift?.paymentMethods || {};
                                                                const totalRev = Object.values(paymentMethods).reduce((sum: number, val: any) => sum + Number(val || 0), 0) as number;
                                                                
                                                                return Object.entries(paymentMethods)
                                                                    .filter(([_, amount]) => Number(amount) > 0 || _ === 'CASH')
                                                                    .sort(([a], [b]) => a === 'CASH' ? -1 : b === 'CASH' ? 1 : 0)
                                                                    .map(([method, amount], i) => (
                                                                        <div key={i} className="p-4 rounded-2xl bg-white border-2 border-slate-100 hover:border-indigo-100 transition-colors shadow-sm">
                                                                            <div className="flex justify-between items-center mb-2">
                                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{method}</span>
                                                                                <span className="text-[10px] font-bold text-indigo-400">
                                                                                    {totalRev > 0 ? ((Number(amount) / totalRev) * 100).toFixed(0) : '0'}%
                                                                                </span>
                                                                            </div>
                                                                            <p className={`text-lg font-black ${method === 'CASH' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                                                Rp {Number(amount).toLocaleString()}
                                                                            </p>
                                                                            <div className="mt-3 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                                                                                <div 
                                                                                    className={`h-full ${method === 'CASH' ? 'bg-emerald-500' : 'bg-indigo-600'} rounded-full transition-all duration-1000`} 
                                                                                    style={{ width: `${totalRev > 0 ? (Number(amount) / totalRev) * 100 : 0}%` }} 
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ));
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden border border-slate-800">
                                                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 blur-[100px] -mr-40 -mt-40 pointer-events-none" />
                                                <div className="relative space-y-6">
                                                     <div className="flex justify-between items-center">
                                                        <span className="text-xs font-black text-indigo-300 uppercase tracking-[0.3em]">
                                                            {isAdminOrCashier ? "Estimated Cash Registry balance" : "Operational Performance Summary"}
                                                        </span>
                                                        <div className="px-4 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" /> Live Analysis
                                                        </div>
                                                    </div>
                                                    <div className="flex items-baseline gap-4">
                                                        {isAdminOrCashier ? (
                                                            <>
                                                                <p className="text-5xl font-black tracking-tight">Rp {Number(activeShift?.cashSystem).toLocaleString()}</p>
                                                                <span className="text-indigo-400 font-bold text-sm tracking-widest uppercase">system book</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <p className="text-5xl font-black tracking-tight">{activeShift.salesCount || 0}</p>
                                                                <span className="text-indigo-400 font-bold text-sm tracking-widest uppercase">Total Orders Served</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="pt-8 mt-8 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-8">
                                                        <div>
                                                            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1 leading-none">Clock In</p>
                                                            <p className="text-sm font-black">{new Date(activeShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1 leading-none">Officer</p>
                                                            <p className="text-sm font-black uppercase flex items-center gap-2 truncate whitespace-nowrap"><ShieldCheck className="w-4 h-4 text-indigo-400" /> {user?.name}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1 leading-none">Active Sales</p>
                                                            <p className="text-sm font-black">{activeShift.salesCount || 0} Orders</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1 leading-none">Dept</p>
                                                            <p className="text-sm font-black uppercase">{currentUserDept}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                             <div className="p-8 rounded-[2.5rem] bg-amber-50/50 border-2 border-dashed border-amber-200 flex gap-6 items-center">
                                                <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center shrink-0 border border-amber-400">
                                                    <AlertTriangle className="w-7 h-7" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-amber-900 uppercase mb-1">Attention Required</h4>
                                                    <p className="text-xs text-amber-700/80 font-bold leading-relaxed">
                                                        {isAdminOrCashier 
                                                            ? "Pastikan semua transaksi telah berstatus PAID. Setiap selisih stok (Waste/Loss) harus dilaporkan dengan alasan yang jelas di langkah Audit Inventory."
                                                            : "Pastikan semua pesanan di meja penugasan Anda telah terkirim. Jika ada stok yang hilang atau pecah, silakan laporkan pada langkah Audit Inventory berikutnya."
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => setStep(isAdminOrCashier ? 2 : 3)}
                                                className="group w-full bg-slate-900 hover:bg-black text-white font-black py-6 rounded-[2.5rem] active:scale-[0.98] transition-all flex items-center justify-center gap-4"
                                            >
                                                <span className="text-lg uppercase tracking-widest">Lanjutkan Rekonsiliasi</span>
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                            </button>
                                        </motion.div>
                                    )}

                                    {/* Step 2: Cash Input (Digital Vault Style) */}
                                    {step === 2 && (
                                        <motion.div 
                                            key="step2"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-10"
                                        >
                                            <div className="text-center space-y-4">
                                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full border border-indigo-100">
                                                    <Wallet className="w-4 h-4 text-indigo-600" />
                                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Cash Reconciliation</span>
                                                </div>
                                                <h3 className="text-4xl font-black text-slate-950 tracking-tight">Hitung Brankas Kasir</h3>
                                                <p className="text-sm text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">Masukkan total uang tunai (kertas & koin) yang ditemukan secara fisik di dalam laci kasir.</p>
                                            </div>

                                            <div className="relative max-w-2xl mx-auto">
                                                <div className="absolute inset-x-0 -top-10 -bottom-10 bg-indigo-500/5 blur-[80px] rounded-[4rem] pointer-events-none" />
                                                <div className="relative bg-white border-2 border-slate-100 rounded-[3rem] p-10 flex flex-col items-center gap-6 focus-within:border-indigo-600 transition-all duration-500">
                                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] leading-none mb-2">Total Physical Cash in Drawer</p>
                                                    <div className="flex items-center justify-center gap-4 w-full">
                                                        <span className="text-4xl font-black text-slate-200">Rp</span>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            className="bg-transparent border-none p-0 text-7xl font-black text-slate-900 focus:ring-0 w-full text-center placeholder:text-slate-100 tracking-tighter"
                                                            placeholder="0"
                                                            value={formatDisplay(cashPhysical)}
                                                            onChange={(e) => handleCashChange(e.target.value)}
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="max-w-xl mx-auto space-y-4">
                                                <div className="flex items-center gap-3 px-2">
                                                    <Info className="w-4 h-4 text-slate-400" />
                                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Catatan Selisih (Optional)</label>
                                                </div>
                                                <textarea
                                                    rows={1}
                                                    className="w-full bg-slate-50 border-2 border-slate-100/50 rounded-3xl py-5 px-8 font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all placeholder:text-slate-200 resize-none min-h-[80px]"
                                                    placeholder="Tuliskan alasan jika ditemukan selisih (misal: Salah input kembalian)..."
                                                    value={note}
                                                    onChange={(e) => setNote(e.target.value)}
                                                />
                                            </div>

                                            {cashPhysical && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`max-w-2xl mx-auto p-8 rounded-[3rem] border-2 flex items-center justify-between transition-all duration-700 ${Math.abs(parseFloat(cashPhysical) - Number(activeShift.cashSystem)) < 500
                                                        ? 'bg-emerald-50 border-emerald-100'
                                                        : 'bg-rose-50 border-rose-100'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-6">
                                                        <div className={`w-16 h-16 rounded-[1.75rem] flex items-center justify-center border-2 ${
                                                            Math.abs(parseFloat(cashPhysical) - Number(activeShift.cashSystem)) < 500 ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-500 text-white border-rose-400'
                                                        }`}>
                                                            {Math.abs(parseFloat(cashPhysical) - Number(activeShift.cashSystem)) < 500 ? <CheckCircle2 className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.3em] mb-1 leading-none">Reconciliation status</p>
                                                            <p className="text-2xl font-black tracking-tight text-slate-900">
                                                                {Math.abs(parseFloat(cashPhysical) - Number(activeShift.cashSystem)) < 500
                                                                    ? "Balance Verified"
                                                                    : `Selisih Rp ${(parseFloat(cashPhysical) - Number(activeShift.cashSystem)).toLocaleString()}`
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
                                                        Math.abs(parseFloat(cashPhysical) - Number(activeShift.cashSystem)) < 500 ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-500'
                                                    }`}>
                                                        {parseFloat(cashPhysical) > Number(activeShift.cashSystem) ? 'surplus' : parseFloat(cashPhysical) < Number(activeShift.cashSystem) ? 'deficit' : 'balanced'}
                                                    </div>
                                                </motion.div>
                                            )}

                                            <div className="flex gap-4 max-w-2xl mx-auto">
                                                <button
                                                    onClick={() => setStep(1)}
                                                    className="w-20 h-20 border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 rounded-3xl flex items-center justify-center transition-all active:scale-95"
                                                >
                                                    <ChevronLeft className="w-8 h-8" />
                                                </button>
                                                <button
                                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xl rounded-[2.5rem] active:scale-[0.98] transition-all flex items-center justify-center gap-4"
                                                    onClick={() => setStep(3)}
                                                >
                                                    Finalize Inventory Audit <ArrowRight className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Step 3: Stock Audit Redesign (Premium Grid & Detail) */}
                                    {step === 3 && (
                                        <motion.div 
                                            key="step3"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-8"
                                        >
                                            <div className="flex items-end justify-between px-2">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Critical Audit (HVI)</h3>
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider pl-3.5">Departemen: <span className="text-indigo-600">{currentUserDept}</span></p>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Items To Audit</span>
                                                    <p className="text-sm font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{inventoryItems.filter(i => i.department === currentUserDept).length} Mandatory Items</p>
                                                </div>
                                            </div>

                                            {/* Dept Oversight Info Cards (Modernized) */}
                                            {isAdminOrCashier && (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    {['KITCHEN', 'BAR', 'CASHIER'].map(dept => {
                                                        const isCurrent = dept === currentUserDept;
                                                        const status = activeShift?.stockReportStatus?.[dept] || (isCurrent ? 'IN_PROGRESS' : 'PENDING');
                                                        const isDone = status === 'DONE';
                                                        
                                                        return (
                                                            <div key={dept} className={`p-5 rounded-[2.5rem] border transition-all ${
                                                                isDone ? 'bg-emerald-50/50 border-emerald-100' : 
                                                                isCurrent ? 'bg-indigo-50/50 border-indigo-200 ring-4 ring-indigo-500/5' :
                                                                'bg-slate-50/50 border-slate-100'
                                                            }`}>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className={`p-2 rounded-xl ${isDone ? 'bg-emerald-100 text-emerald-600' : isCurrent ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                                        {dept === 'KITCHEN' ? <CheckCircle2 className="w-4 h-4" /> : dept === 'BAR' ? <Zap className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                                                                    </div>
                                                                    {isDone ? <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" /> : isCurrent ? <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse ring-4 ring-indigo-500/20" /> : <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />}
                                                                </div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{dept}</p>
                                                                <p className={`text-xs font-black ${isDone ? 'text-emerald-700' : isCurrent ? 'text-indigo-700' : 'text-slate-600'}`}>
                                                                    {isDone ? 'VERIFIED' : isCurrent ? 'CURRENT TASK' : 'AWAITING'}
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <div className="space-y-10 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar pb-10">
                                                {/* My Items Grid */}
                                                <div className="space-y-6">
                                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] pl-1">Daily Mandatory Log</p>
                                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                                        {inventoryItems.filter(i => i.department === currentUserDept).map((item) => {
                                                            const systemStock = Number(item.stockQuantity || 0);
                                                            const physicalInput = stockReports[item.compositeId];
                                                            const physicalStock = physicalInput !== "" && physicalInput !== undefined ? Number(physicalInput) : null;
                                                            const discrepancy = physicalStock !== null ? physicalStock - systemStock : 0;
                                                            const isHighValue = !!item.isHighValue;

                                                            return (
                                                                <motion.div 
                                                                    key={item.compositeId} 
                                                                    whileHover={{ y: -4 }}
                                                                    className={`p-1 rounded-[2.5rem] bg-gradient-to-br transition-all duration-500 relative border ${
                                                                        physicalStock !== null ? 'from-indigo-600 to-violet-700 border-indigo-400' : 'from-slate-100 to-slate-200 border-slate-100'
                                                                    }`}
                                                                >
                                                                    <div className="bg-white rounded-[2.4rem] p-7 space-y-4">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isHighValue ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-400'}`}>
                                                                                    {item.reportingType === 'INGREDIENT' ? <Scale className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                                                                                </div>
                                                                                <div>
                                                                                    <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm leading-tight">{item.name}</h4>
                                                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{item.reportingType === 'INGREDIENT' ? 'Raw Audit' : 'Menu Item Audit'}</span>
                                                                                </div>
                                                                            </div>
                                                                            {isHighValue && <div className="px-2 py-1 bg-rose-950 text-white rounded-lg text-[7px] font-black uppercase tracking-widest animate-pulse border border-rose-800">High Value</div>}
                                                                        </div>

                                                                        <div className="grid grid-cols-3 gap-3">
                                                                            <div className="col-span-1 bg-slate-50/70 p-4 rounded-3xl border border-slate-100 text-center">
                                                                                <p className="text-[7px] font-black text-slate-400 uppercase mb-1 leading-none">System</p>
                                                                                <p className="text-xl font-black text-slate-900 leading-none">{systemStock}</p>
                                                                                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase leading-none">{item.unit}</p>
                                                                            </div>
                                                                            <div className="col-span-2 relative group-focus-within:scale-[1.02] transition-transform">
                                                                                <input
                                                                                    type="number"
                                                                                    className="w-full bg-slate-900 border border-slate-800 rounded-3xl py-6 px-4 text-center font-black text-white focus:ring-4 focus:ring-indigo-500/20 transition-all text-2xl placeholder:text-slate-800"
                                                                                    placeholder="0"
                                                                                    value={stockReports[item.compositeId] || ""}
                                                                                    onChange={(e) => setStockReports({...stockReports, [item.compositeId]: e.target.value})}
                                                                                />
                                                                                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Physical Input</span>
                                                                            </div>
                                                                        </div>

                                                                        {physicalStock !== null && (
                                                                            <motion.div 
                                                                                initial={{ opacity: 0, height: 0 }} 
                                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                                className="pt-2"
                                                                            >
                                                                                <div className="flex gap-2 mb-3">
                                                                                    <div className={`p-4 rounded-2xl flex-1 flex flex-col items-center justify-center transition-all ${discrepancy === 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
                                                                                        <p className={`text-[8px] font-black uppercase mb-1 ${discrepancy === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>Difference</p>
                                                                                        <p className={`text-xl font-black ${discrepancy === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{discrepancy > 0 ? '+' : ''}{discrepancy}</p>
                                                                                    </div>
                                                                                    <div className={`p-4 rounded-2xl flex-1 flex flex-col items-center justify-center border ${discrepancy === 0 ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-900 border-slate-800 text-white'}`}>
                                                                                        <p className="text-[8px] font-black uppercase mb-1 opacity-70">Status</p>
                                                                                        <p className="text-xs font-black uppercase tracking-tight">{discrepancy === 0 ? 'Perfect' : 'Discrepancy'}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <textarea 
                                                                                    className={`w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-[11px] font-bold text-slate-600 focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all min-h-[60px] resize-none`}
                                                                                    placeholder="Wajib berikan catatan jika stok tidak cocok..."
                                                                                    value={stockNotes[item.compositeId] || ""}
                                                                                    onChange={(e) => setStockNotes({...stockNotes, [item.compositeId]: e.target.value})}
                                                                                />
                                                                            </motion.div>
                                                                        )}
                                                                    </div>
                                                                </motion.div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Admin Watchlist (Premium Detail) */}
                                                {isAdminOrCashier && inventoryItems.filter(i => i.department !== currentUserDept).length > 0 && (
                                                    <div className="space-y-6 pt-6 animate-in fade-in duration-1000">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1.5 h-4 bg-rose-500 rounded-full" />
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">External Dept Oversight</p>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {inventoryItems.filter(i => i.department !== currentUserDept).map((item) => {
                                                                const deptStatus = activeShift?.stockReportStatus?.[item.department] || 'PENDING';
                                                                const isDone = deptStatus === 'DONE';
                                                                
                                                                return (
                                                                    <div key={item.compositeId} className={`p-6 rounded-[2.5rem] border-2 transition-all flex items-center justify-between group ${
                                                                        isDone ? 'bg-emerald-50/30 border-emerald-100/50 grayscale opacity-70' : 'bg-white border-slate-100'
                                                                    }`}>
                                                                        <div className="flex items-center gap-4">
                                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-300 group-hover:scale-110'}`}>
                                                                                {isDone ? <CheckSquare className="w-6 h-6" /> : <Timer className="w-6 h-6 animate-pulse" />}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.name}</p>
                                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.department}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border border-white/20 ${
                                                                            isDone ? 'bg-emerald-600 text-white' : 'bg-rose-950 text-white'
                                                                        }`}>
                                                                            {isDone ? 'Reported' : 'Pending'}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Bar */}
                                            <div className="flex gap-4 pt-10 sticky bottom-0 bg-white pb-4 border-t border-slate-200">
                                                <button
                                                    onClick={() => setStep(isAdminOrCashier ? 2 : 1)}
                                                    className="w-20 h-20 border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 rounded-3xl flex items-center justify-center transition-all active:scale-95"
                                                >
                                                    <ChevronLeft className="w-8 h-8" />
                                                </button>
                                                <button
                                                    className="flex-1 bg-slate-950 hover:bg-black text-white font-black text-lg rounded-[2.5rem] active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50 relative overflow-hidden group"
                                                    onClick={handleEndShift}
                                                    disabled={loading}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    {loading ? <Loader2 className="w-6 h-6 animate-spin relative z-10" /> : (
                                                        <div className="flex items-center gap-4 relative z-10">
                                                            <span className="uppercase tracking-[0.25em] text-sm font-black">
                                                                {isAdminOrCashier ? "Finalize & Conclude Shift" : "Submit Department Report"}
                                                            </span>
                                                            {isAdminOrCashier ? <LogOut className="w-5 h-5 opacity-60" /> : <PackageSearch className="w-5 h-5 opacity-60" />}
                                                        </div>
                                                    )}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default ShiftHandoverModal;
