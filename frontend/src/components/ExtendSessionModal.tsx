'use client';

import React, { useState, useEffect } from 'react';
import { X, Clock, PlusCircle, Check, Info, AlertCircle, Timer } from 'lucide-react';
import axios from 'axios';
import InputField from '@/components/ui/InputField';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

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

    // Re-fetch packages whenever modal opens OR the table type changes (PS vs Billiard)
    useEffect(() => {
        if (isOpen) {
            fetchPackages(tableCategory, stationType);
            fetchSettings();
            setSelectedPackageId(null);
            setIsCustomMode(false);
            setDuration(60);
            setConflictState(null);
        }
    }, [isOpen, tableCategory, stationType]);

    const fetchPackages = async (cat?: string, sType?: string) => {
        try {
            const res = await axios.get(`/billiard/packages`);
            // Only show fixed packages for prepaid extension
            const fixedPkgs = res.data.filter((p: any) => p.type === 'fixed');

            // ── Filter EXACT berdasarkan kategori meja ──────────────────────────
            // Tentukan kategori target secara tepat:
            //   PS_REGULAR → hanya tampil paket PS_REGULAR
            //   PS_VIP     → hanya tampil paket PS_VIP
            //   VIP        → hanya tampil paket VIP
            //   REGULAR    → hanya tampil paket REGULAR (default)
            //
            // Jika cat tidak diisi tapi stationType = PLAYSTATION, fallback ke PS_REGULAR.
            // Jika cat tidak diisi dan billiard, fallback ke REGULAR.
            let targetCategory: string;
            if (cat === 'PS_VIP') {
                targetCategory = 'PS_VIP';
            } else if (cat === 'PS_REGULAR' || sType === 'PLAYSTATION') {
                targetCategory = 'PS_REGULAR';
            } else if (cat === 'VIP') {
                targetCategory = 'VIP';
            } else {
                targetCategory = 'REGULAR';
            }

            console.log(`[ExtendModal] fetchPackages: cat=${cat}, sType=${sType}, targetCategory=${targetCategory}`);

            const filtered = fixedPkgs.filter((p: any) => {
                const pkgCat: string = (p.tableCategory || 'REGULAR').trim().toUpperCase();
                return pkgCat === targetCategory;
            });

            console.log(`[ExtendModal] Filtered packages (${filtered.length}):`, filtered.map((p: any) => `${p.name} [${p.tableCategory}]`));
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
        const config = tableCategory === 'VIP'
            ? globalSettings?.customDurationPricingVip
            : tableCategory === 'PS_VIP'
            ? globalSettings?.customDurationPricingPsVip
            : tableCategory === 'PS_REGULAR'
            ? globalSettings?.customDurationPricingPsRegular
            : globalSettings?.customDurationPricingRegular;

        if (!config || !config.timeSlots || config.timeSlots.length === 0) {
            return { rate: 50000, slotLabel: null, hasConfig: false };
        }

        const now = new Date();
        const timeVal = now.getHours() * 60 + now.getMinutes();

        for (const slot of config.timeSlots) {
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

        // No active slot found
        return { rate: 0, slotLabel: null, hasConfig: true };
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
            <div className="bg-white w-full h-full sm:max-w-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden overscroll-contain animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 border-t sm:border border-slate-100 flex flex-col sm:max-h-[90vh] relative">
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
                <div className="p-6 sm:p-8 flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
                    <div className="flex justify-between items-center mb-8 sticky top-0 bg-white z-10 pb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                                <PlusCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tambah Waktu</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Kumulatif Billing (Add-on)</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Pilih Paket Perpanjangan
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                            className={`relative p-5 rounded-2xl border-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${!isAffordable
                                                ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200'
                                                : selectedPackageId === pkg.id
                                                    ? 'border-rose-500 bg-rose-50 ring-4 ring-rose-50'
                                                    : 'border-slate-100 bg-white hover:border-slate-200'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-lg font-black text-slate-800">{pkg.name}</span>
                                                {selectedPackageId === pkg.id && (
                                                    <div className="p-1 bg-rose-500 text-white rounded-full">
                                                        <Check className="w-3 h-3" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                <span className={`text-sm font-bold ${!isAffordable ? 'text-slate-500' : 'text-rose-600'}`}>{pkg.durationMinutes} Menit</span>
                                                <span className="text-sm font-black text-slate-700">Rp {pkgPrice.toLocaleString()}</span>
                                            </div>
                                            {!isAffordable && (
                                                <div className="mt-2 text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1">
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
                                    className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${isCustomMode
                                        ? 'border-slate-400 bg-slate-50'
                                        : 'border-slate-200 hover:border-rose-300 hover:bg-rose-50/30'
                                        }`}
                                >
                                    <Clock className="w-5 h-5 text-slate-400" />
                                    <span className="font-bold text-slate-600">Custom Menit</span>
                                </button>
                            </div>
                        </div>

                        {isCustomMode && (
                            <div className="animate-in slide-in-from-top-2 space-y-3">
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
                                    suffix={<Timer className="w-4 h-4" />}
                                    required
                                />

                                {/* Pricing info panel */}
                                {hasNoActiveSlot ? (
                                    <div className="flex items-start gap-2 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                                        <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                                        <p className="text-[11px] font-bold text-rose-600 leading-relaxed">
                                            Tidak ada slot harga yang aktif untuk jam ini. Hubungi admin untuk mengatur Slot Waktu di Pengaturan Harga.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                Estimasi Biaya
                                                {slotLabel && <span className="normal-case font-bold text-slate-400 ml-1">· Slot {slotLabel}</span>}
                                                {!hasConfig && <span className="normal-case font-bold text-amber-500 ml-1">· Tarif Dasar</span>}
                                            </p>
                                            <p className="text-base font-black text-rose-600 mt-0.5">
                                                Rp {estimatedCustomPrice.toLocaleString()}
                                                <span className="text-xs font-bold text-slate-400 ml-1">
                                                    ({duration} menit × Rp {customRate.toLocaleString()}/jam)
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {conflictState && (
                    <div className="mt-6 p-6 bg-amber-50 rounded-3xl border-2 border-amber-200 animate-in zoom-in-95 duration-200 shadow-xl mx-6 mb-6">
                        <div className="flex items-center gap-3 mb-4 text-amber-700">
                            <AlertCircle className="w-6 h-6" />
                            <h3 className="text-lg font-black tracking-tight">{conflictState.message}</h3>
                        </div>

                        <p className="text-sm font-bold text-amber-600 mb-4 uppercase tracking-tight">
                            Pindahkan antrean ke meja rekomendasi?
                        </p>

                        <div className="space-y-2 mb-6">
                            {conflictState.recommendations.map((rec: any) => (
                                <div key={rec.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-100 shadow-sm hover:border-indigo-300 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-xs">
                                            {rec.tableName}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-700 uppercase">
                                                {rec.status === 'available' ? 'Meja Kosong' : `Sisa ${rec.remainingMinutes} Menit`}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">{rec.status}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => conflictState.waitingId && handleReRoute(conflictState.waitingId, rec.id, rec.tableName)}
                                        className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100 uppercase"
                                    >
                                        PINDAHKAN KE SINI
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
                            className="w-full py-3 bg-white border-2 border-amber-200 text-amber-700 text-xs font-black rounded-2xl hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
                        >
                            TETAP TAMBAH WAKTU (ABAIKAN ANTREAN)
                        </button>
                    </div>
                )}

                <div className="flex flex-col gap-4 mt-8">
                    <button
                        onClick={() => handleExtend(false)}
                        disabled={loading || (!selectedPackageId && !isCustomMode) || (isCustomMode && (!duration || hasNoActiveSlot)) || !!conflictState || !isBalanceSufficient}
                        className={`w-full ${conflictState ? 'hidden' : 'bg-rose-500 hover:bg-rose-600'} disabled:opacity-50 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-rose-100 active:scale-[0.98] transition-all flex items-center justify-center gap-3`}
                    >
                        {loading ? (
                            <span className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <>
                                <Clock className="w-6 h-6" />
                                KONFIRMASI TAMBAH WAKTU
                            </>
                        )}
                    </button>

                    {!isBalanceSufficient && (
                        <div className="flex items-start gap-2 p-4 bg-rose-50 border border-rose-200 rounded-2xl animate-pulse">
                            <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-[11px] font-black text-rose-600 uppercase tracking-widest leading-none mb-1">Saldo Tidak Cukup</p>
                                <p className="text-[10px] font-bold text-rose-500 leading-tight">
                                    Saldo membership saat ini (Rp {Number(member?.balance).toLocaleString()}) tidak mencukupi untuk total tagihan termasuk perpanjangan ini.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExtendSessionModal;
