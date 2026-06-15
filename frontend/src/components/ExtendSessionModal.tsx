'use client';

import React, { useState, useEffect } from 'react';
import { X, Clock, PlusCircle, Check, Info, AlertCircle, Timer } from 'lucide-react';
import axios from 'axios';
import InputField from '@/components/ui/InputField';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { getBusinessDayCode } from '@/utils/dateUtils';

interface ExtendSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableId: number | null;
    tableCategory?: string; // 'REGULAR' | 'VIP' | 'PS_REGULAR' | 'PS_VIP'
    stationType?: 'BILLIARD' | 'PLAYSTATION';
    onExtended: () => void;
}


const ExtendSessionModal: React.FC<ExtendSessionModalProps> = ({ isOpen, onClose, tableId, tableCategory, stationType, onExtended }) => {
    useBodyScrollLock(isOpen);
    const [packages, setPackages] = useState<any[]>([]);
    const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
    const [duration, setDuration] = useState<number>(60);
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [globalSettings, setGlobalSettings] = useState<any>(null);
    const { user } = useAuth();
    const [conflictState, setConflictState] = useState<{
        conflict: boolean;
        message: string;
        bookedByName?: string;
        waitingId?: number;
        recommendations: any[];
    } | null>(null);

    const [tableData, setTableData] = useState<any>(null);

    // Re-fetch packages whenever modal opens OR the table type changes
    useEffect(() => {
        if (isOpen) {
            fetchSettings();
            setSelectedPackageId(null);
            setIsCustomMode(false);
            setDuration(60);
            setConflictState(null);
        }
    }, [isOpen]);

    // Fetch packages after tableData is loaded
    useEffect(() => {
        if (isOpen && tableData) {
            fetchPackages(tableData.categoryId);
        }
    }, [isOpen, tableData]);

    const fetchPackages = async (categoryId?: number) => {
        try {
            const res = await axios.get(`/billiard/packages`);
            // Only show fixed packages for prepaid extension
            const fixedPkgs = res.data.filter((p: any) => p.type === 'fixed');

            const todayCode = getBusinessDayCode(globalSettings?.businessDayOffset);
            const filtered = fixedPkgs.filter((p: any) => {
                const categoryMatch = p.categoryId === categoryId;
                const hasValidDays = Array.isArray(p.validDays) && p.validDays.length > 0;
                const dayMatch = !hasValidDays || p.validDays.includes(todayCode);
                return categoryMatch && dayMatch;
            });

            console.log(`[ExtendModal] Filtered packages (${filtered.length}):`, filtered.map((p: any) => `${p.name}`));
            setPackages(filtered);
        } catch (error) {
            console.error(error);
        }
    };


    const fetchSettings = async () => {
        try {
            const res = await axios.get(`/settings`);
            setGlobalSettings(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const getCurrentPrice = (pkg: any) => {
        const now = new Date();
        const timeVal = now.getHours() * 60 + now.getMinutes();

        if (pkg.timeSlots && pkg.timeSlots.length > 0) {
            for (const slot of pkg.timeSlots) {
                const [sH, sM] = slot.start.split(':').map(Number);
                const [eH, eM] = slot.end.split(':').map(Number);
                const startVal = sH * 60 + sM;
                const endVal = eH * 60 + eM;

                let isMatch = false;
                if (endVal < startVal) { // Crossover
                    if (timeVal >= startVal || timeVal < endVal) isMatch = true;
                } else {
                    if (timeVal >= startVal && timeVal < endVal) isMatch = true;
                }

                if (isMatch) return Number(slot.price);
            }
            return Number(pkg.timeSlots[0].price);
        }
        return Number(pkg.price);
    };

    // Calculate active rate from customDurationPricing based on current time & table category
    const getCustomActiveRate = (): { rate: number; slotLabel: string | null; hasConfig: boolean } => {
        const dynamicConfigs = globalSettings?.customPricingDynamic || [];
        const config = dynamicConfigs.find((c: any) => c.categoryId === tableData?.categoryId);

        // Fallback for legacy configs if dynamic not found
        let activeConfig = config;
        if (!activeConfig) {
            const catName = tableCategory?.toUpperCase() || '';
            if (catName.includes('VIP') && !catName.includes('PS')) activeConfig = globalSettings?.customDurationPricingVip;
            else if (catName.includes('PS VIP')) activeConfig = globalSettings?.customDurationPricingPsVip;
            else if (catName.includes('PS')) activeConfig = globalSettings?.customDurationPricingPsRegular;
            else activeConfig = globalSettings?.customDurationPricingRegular;
        }

        if (!activeConfig || !activeConfig.timeSlots || activeConfig.timeSlots.length === 0) {
            return { rate: Number(activeConfig?.basePrice || 0), slotLabel: null, hasConfig: !!activeConfig };
        }

        const now = new Date();
        const timeVal = now.getHours() * 60 + now.getMinutes();
        const currentDayCode = getBusinessDayCode(globalSettings?.businessDayOffset);

        for (const slot of activeConfig.timeSlots) {
            // ✅ NEW: Cek validDays
            if (Array.isArray(slot.validDays) && slot.validDays.length > 0) {
                if (!slot.validDays.includes(currentDayCode)) continue;
            }

            const [sH, sM] = slot.start.split(':').map(Number);
            const [eH, eM] = slot.end.split(':').map(Number);
            const startVal = sH * 60 + sM;
            const endVal = eH * 60 + eM;

            let isMatch = false;
            if (endVal < startVal) {
                if (timeVal >= startVal || timeVal < endVal) isMatch = true;
            } else {
                if (timeVal >= startVal && timeVal < endVal) isMatch = true;
            }

            if (isMatch) {
                return {
                    rate: Number(slot.price),
                    slotLabel: `${slot.start} – ${slot.end}`,
                    hasConfig: true
                };
            }
        }
        return { rate: Number(activeConfig.basePrice || 0), slotLabel: 'Harga Dasar', hasConfig: true };
    };

    const handleReRoute = async (waitingId: number, newTableId: number, newTableName: string) => {
        if (!confirm(`Konfirmasi: Pindahkan antrean ${conflictState?.bookedByName} ke Meja ${newTableName}?`)) return;

        try {
            await axios.patch(`/waiting-list/${waitingId}/assign`, { tableId: newTableId });
            alert(`Berhasil! Antrean ${conflictState?.bookedByName} dipindahkan ke Meja ${newTableName}.`);
            // Clear conflict state so they can proceed with extension
            setConflictState(null);
        } catch (error) {
            console.error('Failed to re-route:', error);
            alert('Gagal memindahkan antrean.');
        }
    };

    const [member, setMember] = useState<any>(null);
    const [existingGrandTotal, setExistingGrandTotal] = useState<number>(0);
    const [existingPaidAmount, setExistingPaidAmount] = useState<number>(0);

    useEffect(() => {
        if (isOpen && tableId) {
            fetchTableData();
        }
    }, [isOpen, tableId]);

    const fetchTableData = async () => {
        try {
            const res = await axios.get(`/billiard/tables/${tableId}`);
            const table = res.data;
            setTableData(table);
            if (table.activeTransaction) {
                setExistingGrandTotal(Number(table.grandTotal || 0));
                setExistingPaidAmount(Number(table.activeTransaction.paidAmount || 0));
                if (table.activeTransaction.member) {
                    setMember(table.activeTransaction.member);
                }
            }
        } catch (error) {
            console.error('Failed to fetch table data:', error);
        }
    };


    if (!isOpen) return null;

    const { rate: customRate, slotLabel, hasConfig } = getCustomActiveRate();
    const estimatedCustomPrice = duration > 0 ? Math.round((duration / 60) * customRate) : 0;
    const hasNoActiveSlot = hasConfig && customRate === 0;

    const unpaidAmount = Math.max(0, existingGrandTotal - existingPaidAmount);
    const usableBalance = member ? Math.max(0, Number(member.balance) - unpaidAmount) : Infinity;

    const isBalanceSufficient = (() => {
        const extensionCost = isCustomMode ? estimatedCustomPrice : getCurrentPrice(packages.find(p => p.id === selectedPackageId) || { price: 0 });
        return usableBalance >= extensionCost;
    })();

    const handleExtend = async (ignore: boolean) => {
        if (!tableId || loading) return;
        setLoading(true);
        try {
            const res = await axios.post(`/billiard/tables/${tableId}/extend`, {
                duration: isCustomMode ? Number(duration) : undefined,
                packageId: !isCustomMode ? selectedPackageId : undefined,
                userId: user?.id,
                ignoreConflict: ignore
            });

            if (res.data?.conflict && !ignore) {
                setConflictState(res.data);
                setLoading(false);
                return;
            }

            onExtended();
            onClose();
            setConflictState(null);
        } catch (error: any) {
            console.error('Failed to extend session:', error);
            alert(error.response?.data?.message || 'Gagal menambah waktu bermain.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-h-[92vh] sm:h-auto rounded-t-[2rem] sm:rounded-[2.5rem] sm:max-w-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] overflow-hidden overscroll-contain animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 flex flex-col relative">
                
                {/* Drag Indicator for Mobile */}
                <div className="w-full flex justify-center pt-3 pb-2 sm:hidden absolute top-0 z-20 bg-gradient-to-b from-white via-white to-transparent">
                    <div className="w-12 h-1.5 bg-slate-200/80 rounded-full" />
                </div>

                {/* Full-screen Loading Overlay for Safety */}
                {loading && (
                    <div className="absolute inset-0 z-[160] bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                        <div className="w-16 h-16 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin shadow-xl" />
                        <div className="flex flex-col items-center animate-pulse">
                            <p className="text-slate-900 font-black uppercase tracking-widest text-base">Menambah Waktu...</p>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">Sinkronisasi IOT Device</p>
                        </div>
                    </div>
                )}
                
                <div className="p-5 pt-10 sm:pt-8 sm:p-8 flex-1 overflow-y-auto overscroll-contain custom-scrollbar bg-slate-50/50">
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex gap-3 sm:gap-4">
                            <div className="p-3 sm:p-3.5 bg-white border border-rose-100 rounded-xl sm:rounded-2xl text-rose-500 shadow-sm shadow-rose-100/50 shrink-0">
                                <PlusCircle className="w-6 h-6 sm:w-7 sm:h-7" />
                            </div>
                            <div className="pt-1">
                                <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-none mb-1 sm:mb-1.5">Tambah Waktu</h2>
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kumulatif Billing (Add-on)</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 sm:p-2.5 bg-white border border-slate-100 hover:bg-slate-50 hover:text-slate-600 rounded-lg sm:rounded-xl transition-all text-slate-400 shadow-sm active:scale-95 shrink-0">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-6 sm:space-y-8">
                        <div>
                            <label className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 sm:mb-4 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Pilih Paket Perpanjangan
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {packages.map((pkg) => {
                                    const pkgPrice = getCurrentPrice(pkg);
                                    const isAffordable = usableBalance >= pkgPrice;

                                    return (
                                        <button
                                            key={pkg.id}
                                            disabled={!isAffordable}
                                            onClick={() => {
                                                setSelectedPackageId(pkg.id);
                                                setIsCustomMode(false);
                                            }}
                                            className={`relative p-4 sm:p-5 rounded-2xl border-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${!isAffordable
                                                ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200'
                                                : selectedPackageId === pkg.id
                                                    ? 'border-rose-500 bg-rose-50 ring-4 ring-rose-50'
                                                    : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm hover:shadow-md'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-base sm:text-lg font-black text-slate-800">{pkg.name}</span>
                                                {selectedPackageId === pkg.id && (
                                                    <div className="p-1 bg-rose-500 text-white rounded-full shadow-sm shadow-rose-200">
                                                        <Check className="w-3 h-3" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                <span className={`text-xs sm:text-sm font-bold ${!isAffordable ? 'text-slate-500' : 'text-rose-600'}`}>{pkg.durationMinutes} Menit</span>
                                                <span className="text-xs sm:text-sm font-black text-slate-700">Rp {pkgPrice.toLocaleString()}</span>
                                            </div>
                                            {!isAffordable && (
                                                <div className="mt-2 text-[9px] sm:text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" /> Saldo Tidak Cukup
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={() => {
                                        setIsCustomMode(true);
                                        setSelectedPackageId(null);
                                    }}
                                    className={`p-4 sm:p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${isCustomMode
                                        ? 'border-rose-400 bg-rose-50 ring-4 ring-rose-50'
                                        : 'border-slate-300 bg-white hover:border-rose-300 hover:bg-rose-50/30 text-slate-400 hover:text-rose-500'
                                        }`}
                                >
                                    <Clock className={`w-5 h-5 ${isCustomMode ? 'text-rose-500' : 'text-slate-400'}`} />
                                    <span className={`font-black uppercase tracking-widest text-[10px] sm:text-xs ${isCustomMode ? 'text-rose-600' : 'text-slate-500'}`}>Custom Menit</span>
                                </button>
                            </div>
                        </div>

                        {isCustomMode && (
                            <div className="animate-in slide-in-from-top-2 space-y-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
                                <InputField
                                    label="Input menit..."
                                    type="number"
                                    value={duration}
                                    onChange={(val) => {
                                        const newDuration = val || 0;
                                        const newPrice = Math.round((newDuration / 60) * customRate);
                                        if (member && newPrice > usableBalance && customRate > 0) {
                                            // Auto-cap the duration to the max affordable minutes
                                            const maxDur = Math.floor((usableBalance / customRate) * 60);
                                            setDuration(Math.max(0, maxDur));
                                        } else {
                                            setDuration(newDuration);
                                        }
                                    }}
                                    placeholder="Input menit..."
                                    suffix={<Timer className="w-4 h-4 text-slate-400" />}
                                    required
                                />

                                {/* Pricing info panel */}
                                {hasNoActiveSlot ? (
                                    <div className="flex items-start gap-2 p-3 sm:p-4 bg-rose-50 border border-rose-200 rounded-xl">
                                        <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                                        <p className="text-[10px] sm:text-[11px] font-bold text-rose-600 leading-relaxed">
                                            Tidak ada slot harga yang aktif untuk jam ini. Hubungi admin untuk mengatur Slot Waktu di Pengaturan Harga.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 bg-slate-50 border border-slate-100 rounded-xl">
                                        <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                                            <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Estimasi Biaya
                                                {slotLabel && <span className="normal-case font-bold text-indigo-400 ml-1">· Slot {slotLabel}</span>}
                                                {!hasConfig && <span className="normal-case font-bold text-amber-500 ml-1">· Tarif Dasar</span>}
                                            </p>
                                            <p className="text-sm sm:text-base font-black text-indigo-600 mt-0.5">
                                                Rp {estimatedCustomPrice.toLocaleString()}
                                                <span className="text-[10px] sm:text-xs font-bold text-slate-400 ml-1.5">
                                                    ({duration}m × Rp {customRate.toLocaleString()}/j)
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!isBalanceSufficient && (
                            <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl animate-pulse">
                                <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[11px] font-black text-rose-600 uppercase tracking-widest leading-none mb-1.5">Saldo Tidak Cukup</p>
                                    <p className="text-[10px] font-bold text-rose-500/80 leading-relaxed">
                                        Saldo membership saat ini (Rp {Number(member?.balance).toLocaleString()}) tidak mencukupi untuk total tagihan termasuk perpanjangan ini.
                                    </p>
                                </div>
                            </div>
                        )}

                        {conflictState && (
                            <div className="p-5 sm:p-6 bg-amber-50 rounded-2xl border border-amber-200 animate-in zoom-in-95 duration-200 shadow-lg">
                                <div className="flex items-center gap-3 mb-4 text-amber-700">
                                    <AlertCircle className="w-6 h-6 shrink-0" />
                                    <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">{conflictState.message}</h3>
                                </div>

                                <p className="text-[10px] sm:text-xs font-black text-amber-600/80 mb-3 uppercase tracking-widest">
                                    Pindahkan antrean ke meja rekomendasi?
                                </p>

                                <div className="space-y-2 mb-5">
                                    {conflictState.recommendations.map((rec: any) => (
                                        <div key={rec.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-xs sm:text-sm">
                                                    {rec.tableName}
                                                </div>
                                                <div>
                                                    <p className="text-xs sm:text-sm font-black text-slate-700 uppercase leading-none mb-1">
                                                        {rec.status === 'available' ? 'Meja Kosong' : `Sisa ${rec.remainingMinutes} Menit`}
                                                    </p>
                                                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">{rec.status}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => conflictState.waitingId && handleReRoute(conflictState.waitingId, rec.id, rec.tableName)}
                                                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 text-white text-[9px] sm:text-[10px] font-black rounded-lg sm:rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 uppercase"
                                            >
                                                PINDAHKAN
                                            </button>
                                        </div>
                                    ))}
                                    {conflictState.recommendations.length === 0 && (
                                        <p className="text-xs font-bold text-rose-500 italic text-center py-2 animate-pulse">
                                            Tidak ada meja alternatif yang tersedia saat ini!
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleExtend(true)}
                                    className="w-full py-3 bg-white border border-amber-200 text-amber-700 text-[10px] sm:text-xs font-black rounded-xl hover:bg-amber-100 transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    TETAP TAMBAH WAKTU (ABAIKAN ANTREAN)
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sticky Footer */}
                <div 
                    className="p-4 sm:p-6 bg-white border-t border-slate-100 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] relative z-20"
                    style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)' }}
                >
                    <button
                        onClick={() => handleExtend(false)}
                        disabled={loading || (!selectedPackageId && !isCustomMode) || (isCustomMode && (!duration || hasNoActiveSlot)) || !!conflictState || !isBalanceSufficient}
                        className={`w-full ${conflictState ? 'hidden' : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700'} disabled:opacity-50 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 text-white py-3.5 sm:py-5 rounded-xl sm:rounded-2xl font-black text-sm sm:text-lg tracking-widest shadow-lg shadow-rose-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 sm:gap-3`}
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <>
                                <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                                KONFIRMASI TAMBAH WAKTU
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ExtendSessionModal;
