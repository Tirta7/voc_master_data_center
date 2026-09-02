'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { User, Tag, Clock, PlayCircle, X, Check, Gamepad2, ArrowRight, Timer, Info, ChevronDown, ChevronRight, Minus, Plus, QrCode, AlertCircle } from 'lucide-react';
import InputField from '@/components/ui/InputField';
import QRScanner from './QRScanner';
import { useMqtt } from '@/context/MqttContext';
import { useMemo } from 'react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { getBusinessDayCode } from '@/utils/dateUtils';

interface StartSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (type: 'prepaid' | 'open', duration?: number, customerName?: string, packageId?: number, customPriceSettings?: { basePrice: number, timeSlots: any[] }, promoId?: number, memberId?: number, voucherCode?: string) => void;
    table: any;
}

const StartSessionModal: React.FC<StartSessionModalProps> = ({ isOpen, onClose, onStart, table }) => {
    useBodyScrollLock(isOpen);
    const [activeTab, setActiveTab] = useState<'playtime' | 'duration' | 'promo'>('playtime');
    const [customerName, setCustomerName] = useState('');
    const [packages, setPackages] = useState<any[]>([]);
    const [promos, setPromos] = useState<any[]>([]);
    const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
    const [selectedPromoId, setSelectedPromoId] = useState<number | null>(null);
    const [customDuration, setCustomDuration] = useState<number>(60);
    const [isCustomDurationMode, setIsCustomDurationMode] = useState(false);
    const [globalSettings, setGlobalSettings] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Voucher state
    const [voucherCode, setVoucherCode] = useState('');
    const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
    const [validatedVoucher, setValidatedVoucher] = useState<any>(null);
    const [voucherError, setVoucherError] = useState('');
    const [voucherEffect, setVoucherEffect] = useState<any>(null);
    const [promoSubMode, setPromoSubMode] = useState<'bundling' | 'voucher'>('bundling');

    // Popup states
    const [showVoucherPrompt, setShowVoucherPrompt] = useState(false);

    // Member State
    const [isScanning, setIsScanning] = useState(false);
    const [member, setMember] = useState<any>(null);

    const getCustomActiveRateInfo = () => {
        if (!globalSettings) return { price: 0, source: 'Default' };

        const dynamicConfigs = globalSettings.customPricingDynamic || [];
        const config = dynamicConfigs.find((c: any) => c.categoryId === table.categoryId);

        // Fallback for legacy configs if dynamic not found
        let activeConfig = config;
        if (!activeConfig) {
            const catName = (table.categoryRelation?.name || table.category || '').toUpperCase();
            if (catName.includes('VIP') && !catName.includes('PS')) activeConfig = globalSettings.customDurationPricingVip;
            else if (catName.includes('PS VIP')) activeConfig = globalSettings.customDurationPricingPsVip;
            else if (catName.includes('PS')) activeConfig = globalSettings.customDurationPricingPsRegular;
            else activeConfig = globalSettings.customDurationPricingRegular;
        }

        if (!activeConfig) return { price: 0, source: 'Default' };

        const now = new Date();
        const timeVal = now.getHours() * 60 + now.getMinutes();
        const currentDayCode = getBusinessDayCode(globalSettings?.businessDayOffset);

        if (activeConfig.timeSlots && activeConfig.timeSlots.length > 0) {
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
                if (endVal < startVal) { // Crossover
                    if (timeVal >= startVal || timeVal < endVal) isMatch = true;
                } else {
                    if (timeVal >= startVal && timeVal < endVal) isMatch = true;
                }

                if (isMatch) return { price: Number(slot.price), source: `Slot (${slot.start}-${slot.end})` };
            }
        }

        return { price: Number(activeConfig.basePrice || 0), source: 'Harga Dasar' };
    };

    const customRateInfo = getCustomActiveRateInfo();
    const currentCustomRate = customRateInfo.price;

    const { subscribe } = useMqtt();
    const memberRef = useRef<any>(null);
    useEffect(() => { memberRef.current = member; }, [member]);

    useEffect(() => {
        return subscribe('billiard/member/+/balance', (data: { memberId: number, balance: number }) => {
            if (memberRef.current && memberRef.current.id === data.memberId) {
                setMember((prev: any) => ({ ...prev, balance: data.balance }));
            }
        });
    }, [subscribe]);

    useEffect(() => {
        if (isOpen) {
            fetchPackages();
            fetchPromos();
            fetchGlobalSettings();
            setCustomerName(table?.bookedByName || '');
            setActiveTab('playtime');
            setSelectedPackageId(null);
            setSelectedPromoId(null);
            setIsCustomDurationMode(false);
            setCustomDuration(60);
            setMember(null);
            setIsLoading(false);
            setVoucherCode('');
            setValidatedVoucher(null);
            setVoucherError('');
            setVoucherEffect(null);
            setPromoSubMode('bundling');
            setShowVoucherPrompt(true);
        }
    }, [isOpen]);

    const fetchPackages = async () => {
        try {
            const res = await axios.get(`/billiard/packages`);
            setPackages(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchPromos = async () => {
        try {
            // Updated to fetch relevant promos for starting session
            const res = await axios.get(`/admin/promos`);
            // Only show bundle/package promos that are active AND have billiard duration
            const activePromos = res.data.filter((p: any) =>
                p.isActive &&
                (p.type === 'PACKAGE' || p.type === 'BUNDLE') &&
                (Number(p.ruleJson?.requireBilliardMinutes || 0) > 0)
            );
            setPromos(activePromos);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchGlobalSettings = async () => {
        try {
            const res = await axios.get(`/settings`);
            setGlobalSettings(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const getActiveSlotInfo = (pkg: any) => {
        const now = new Date();
        const timeVal = now.getHours() * 60 + now.getMinutes();
        const currentDayCode = getBusinessDayCode(globalSettings?.businessDayOffset);
        
        let targetSlot = null;

        if (pkg.timeSlots && pkg.timeSlots.length > 0) {
            for (const slot of pkg.timeSlots) {
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
                    targetSlot = slot;
                    break;
                }
            }
            if (!targetSlot) targetSlot = pkg.timeSlots[0];
        }

        const price = targetSlot ? Number(targetSlot.price) : Number(pkg.price);
        const discountPercentage = targetSlot ? Number(targetSlot.discountPercentage || 0) : Number(pkg.discountPercentage || 0);
        const discountNominal = targetSlot ? Number(targetSlot.discountNominal || 0) : Number(pkg.discountNominal || 0);

        return { price, discountPercentage, discountNominal };
    };

    const isPlaytime = activeTab === 'playtime';
    const isPromo = activeTab === 'promo';

    const estimatedCost = useMemo(() => {
        let baseAmount = 0;
        if (activeTab === 'playtime') {
            const pkg = packages.find(p => p.id === selectedPackageId);
            if (pkg) {
                const info = getActiveSlotInfo(pkg);
                baseAmount = info.price;
                if (info.discountPercentage > 0) baseAmount -= (baseAmount * info.discountPercentage / 100);
            } else {
                baseAmount = currentCustomRate;
            }
        } else if (activeTab === 'duration') {
            const pkg = packages.find(p => p.id === selectedPackageId);
            if (pkg) {
                const info = getActiveSlotInfo(pkg);
                baseAmount = info.price;
                if (info.discountPercentage > 0) baseAmount -= (baseAmount * info.discountPercentage / 100);
                else if (info.discountNominal > 0) baseAmount = Math.max(0, baseAmount - info.discountNominal);
            }
            else if (isCustomDurationMode) baseAmount = (customDuration / 60) * currentCustomRate;
        } else if (activeTab === 'promo') {
            const promo = promos.find(p => p.id === selectedPromoId);
            baseAmount = Number(promo?.ruleJson?.fixedPrice || 0);
        }

        if (baseAmount <= 0) return 0;

        // Apply Member Tier Discount if applicable
        let discountAmount = 0;
        if (member?.tier?.discountConfig) {
            const cfg = member.tier.discountConfig;
            // Simplified check: only apply billiard package discount to the session base amount
            const billiardDiscPercent = Number(cfg.billiardPackage || 0) / 100;

            // Note: In real app, we check active hours. For estimation, we'll assume active if within tier hours.
            const now = new Date();
            const [startH, startM] = (member.tier.activeStartTime || '00:00').split(':').map(Number);
            const [endH, endM] = (member.tier.activeEndTime || '23:59').split(':').map(Number);
            const currentMins = now.getHours() * 60 + now.getMinutes();
            const startMins = startH * 60 + startM;
            const endMins = endH * 60 + endM;

            const isInsideActiveHours = startMins <= endMins
                ? (currentMins >= startMins && currentMins <= endMins)
                : (currentMins >= startMins || currentMins <= endMins);

            if (isInsideActiveHours) {
                discountAmount = Math.round(baseAmount * billiardDiscPercent);
            }
        }

        const discountedAmount = Math.max(0, baseAmount - discountAmount);

        // Apply SC and VAT
        const scPercent = Number(globalSettings?.serviceChargePercentage || 0) / 100;
        const vatPercent = Number(globalSettings?.ppnPercentage || 0) / 100;

        const serviceCharge = Math.round(discountedAmount * scPercent);
        const vat = Math.round((discountedAmount + serviceCharge) * vatPercent);
        const rawTotal = discountedAmount + serviceCharge + vat;

        // Rounding
        const kelipatan = Math.max(1, Number(globalSettings?.roundingKelipatan || 1));
        const grandTotal = Math.ceil(rawTotal / kelipatan) * kelipatan;

        return grandTotal;
    }, [activeTab, selectedPackageId, packages, isCustomDurationMode, customDuration, currentCustomRate, selectedPromoId, promos, member, globalSettings]);

    const isBalanceSufficient = useMemo(() => {
        if (!member) return true;

        const bal = Number(member.balance || 0);

        // If Open Table (Playtime) -> Require at least 1 hour of balance as safety buffer
        if (activeTab === 'playtime') {
            const pkg = packages.find(p => p.id === selectedPackageId);
            let hourlyRate = currentCustomRate;
            if (pkg) {
                const info = getActiveSlotInfo(pkg);
                hourlyRate = info.price;
                if (info.discountPercentage > 0) hourlyRate -= (hourlyRate * info.discountPercentage / 100);
            }
            const minBalanceRequired = hourlyRate; // 1 hour at current rate
            return bal >= minBalanceRequired;
        }

        // If Duration/Promo -> Must cover the estimated cost
        return bal >= estimatedCost;
    }, [member, activeTab, selectedPackageId, packages, currentCustomRate, estimatedCost]);

    if (!isOpen || !table) return null;

    const tableCategory = table?.categoryRelation?.name || table?.category || 'REGULAR';
    const isVIP = tableCategory.toUpperCase().includes('VIP');

    // ✅ Filter by: tipe, kategori, dan hari berlaku paket
    const todayCode = getBusinessDayCode(globalSettings?.businessDayOffset);
    const filteredPackages = packages.filter(pkg => {
        const typeMatch = activeTab === 'playtime' ? pkg.type === 'hourly' : pkg.type === 'fixed';
        const categoryMatch = pkg.categoryId === table?.categoryId;
        // validDays null/kosong = berlaku setiap hari (backward compatible)
        const hasValidDays = Array.isArray(pkg.validDays) && pkg.validDays.length > 0;
        const dayMatch = !hasValidDays || pkg.validDays.includes(todayCode);
        return typeMatch && categoryMatch && dayMatch;
    });


    const handleScanSuccess = async (decodedText: string) => {
        let memberCode = decodedText;
        let version: number | undefined;

        // 1. Check if it's a Signed Token (New secure format: payload.signature)
        if (decodedText.includes('.')) {
            memberCode = decodedText;
            version = undefined; // Version is inside the token, backend will extract it
        }
        // 2. Check if it's Legacy JSON
        else if (decodedText.startsWith('{')) {
            try {
                const data = JSON.parse(decodedText);
                if (data.type === 'MEMBERSHIP' && data.code) {
                    memberCode = data.code;
                    version = data.v;
                }
            } catch (e) {
                // Not valid JSON, use raw text
            }
        }

        try {
            const url = version !== undefined
                ? `/members/scan/${encodeURIComponent(memberCode)}?v=${version}`
                : `/members/scan/${encodeURIComponent(memberCode)}`;

            const res = await axios.get(url);
            const memberData = res.data;
            setMember(memberData);
            setCustomerName(memberData.name);
            setIsScanning(false);
        } catch (err: any) {
            console.error('Scan Error:', err);
            const errorMessage = err.response?.data?.message || 'Gagal memproses QR Code. Silakan coba lagi.';

            if (err.response?.status === 403) {
                alert(errorMessage);
            } else if (err.response?.status === 404) {
                alert('Member tidak ditemukan atau QR Code tidak terdaftar.');
            } else {
                alert(errorMessage);
            }
        }
    };

    const proceedSessionStart = async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const activeVoucherCode = validatedVoucher ? validatedVoucher.code : undefined;

            if (activeTab === 'playtime') {
                await onStart('open', undefined, customerName, selectedPackageId || undefined, undefined, undefined, member?.id, activeVoucherCode);
            } else if (activeTab === 'duration') {
                const duration = isCustomDurationMode
                    ? customDuration
                    : (packages.find(p => p.id === selectedPackageId)?.durationMinutes || 60);

                await onStart('prepaid', duration, customerName, selectedPackageId || undefined, undefined, undefined, member?.id, activeVoucherCode);
            } else {
                // Promo Tab
                if (promoSubMode === 'voucher') {
                    // Voucher kode: mode open, voucher diproses di backend
                    await onStart('open', undefined, customerName, undefined, undefined, undefined, member?.id, activeVoucherCode);
                } else {
                    await onStart('prepaid', undefined, customerName, undefined, undefined, selectedPromoId || undefined, member?.id, undefined);
                }
            }
            setIsLoading(false);
        } catch (error) {
            console.error('Failed to start session:', error);
            setIsLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (isLoading) return;
        await proceedSessionStart();
    };

    const handleValidateVoucher = async () => {
        if (!voucherCode.trim()) return;
        setIsValidatingVoucher(true);
        setVoucherError('');
        setValidatedVoucher(null);
        setVoucherEffect(null);
        try {
            const res = await axios.post('/vouchers/validate', {
                code: voucherCode.toUpperCase().trim(),
                transactionSubtotal: 0,
                memberId: member?.id,
                tableStartTime: new Date().toISOString(),
                usageContext: 'SESSION_START',
            });
            setValidatedVoucher(res.data.voucher);
            setVoucherEffect(res.data.effect);
        } catch (err: any) {
            const errorMsg = err.response?.data?.message;
            const finalMsg = Array.isArray(errorMsg) ? errorMsg.join('\n') : (errorMsg || 'Voucher tidak valid.');
            setVoucherError(finalMsg);
        } finally {
            setIsValidatingVoucher(false);
        }
    };

    const handlePackageSelect = (pkg: any) => {
        setSelectedPackageId(pkg.id);
        setIsCustomDurationMode(false);
    };

    const handlePromoSelect = (promo: any) => {
        setSelectedPromoId(promo.id);
    };

    const hasUncheckedVoucher = voucherCode.trim() !== '' && !validatedVoucher;

    const canConfirm = customerName &&
        !(isPlaytime && !selectedPackageId) &&
        !(activeTab === 'duration' && !selectedPackageId && !isCustomDurationMode) &&
        !(isPromo && promoSubMode === 'bundling' && !selectedPromoId) &&
        !(isPromo && promoSubMode === 'voucher') &&
        !hasUncheckedVoucher &&
        isBalanceSufficient && !isLoading;

    // Color tokens
    const getAccent = () => {
        if (isPlaytime) return { bg: 'bg-indigo-600', hover: 'hover:bg-indigo-700', ring: 'ring-indigo-100', badge: 'bg-indigo-100 text-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-600', shadow: 'shadow-indigo-200', icon: <Clock className="w-5 h-5" /> };
        if (activeTab === 'duration') return { bg: 'bg-amber-500', hover: 'hover:bg-amber-600', ring: 'ring-amber-100', badge: 'bg-amber-100 text-amber-600', light: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-600', shadow: 'shadow-amber-200', icon: <Timer className="w-5 h-5" /> };
        return { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', ring: 'ring-emerald-100', badge: 'bg-emerald-100 text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-600', shadow: 'shadow-emerald-200', icon: <Tag className="w-5 h-5" /> };
    };

    const accent = getAccent();

    return (
        /* ─── BACKDROP ──────────────────────────────────────────────────────────── */
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/70  animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <style jsx global>{`
                .custom-touch-scroll {
                    -webkit-overflow-scrolling: touch;
                }
            `}</style>
            {/*
             * Mobile  → full-width bottom-sheet, slides up, max-height 93dvh
             * Desktop → centered dialog, max 960 px, 85vh
             */}
            <div className={`
                relative w-full bg-white flex flex-col
                rounded-t-[2rem] sm:rounded-[2rem]
                max-h-[85dvh] sm:max-h-[85vh]
                sm:max-w-6xl sm:mx-4
                overflow-hidden
                animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300
                shadow-[0_-8px_40px_rgba(0,0,0,0.2)] sm:shadow-2xl
                ${showVoucherPrompt ? 'hidden' : ''}
            `}>
                {/* Full-screen Loading Overlay for Safety (Waiters Phone Lag Protection) */}
                {isLoading && (
                    <div className="absolute inset-0 z-[9000] bg-white/60  flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                        <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin shadow-xl" />
                        <div className="flex flex-col items-center animate-pulse">
                            <p className="text-slate-900 font-black uppercase tracking-widest text-base">Inisialisasi Sesi...</p>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">Mohon tunggu sejenak</p>
                        </div>
                    </div>
                )}

                {/* ─── HANDLE (mobile only) ─────────────────────────────────────── */}
                <div className="sm:hidden w-10 h-1 bg-slate-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />

                {/* ─── SCROLLABLE BODY ──────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden overscroll-contain">

                    {/* ══════════ LEFT PANEL ══════════ */}
                    <div className="
                        md:w-[350px] lg:w-[400px] shrink-0
                        bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100
                        flex flex-col
                        px-4 pt-4 pb-4 md:py-8 md:px-8
                        gap-3 md:gap-4 overflow-y-auto md:overflow-visible overscroll-contain custom-touch-scroll
                    ">
                        {/* Close button row – visible on all sizes */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Gamepad2 className="w-4 h-4" />
                                <span className="text-[11px] font-bold uppercase tracking-widest">Sesi Baru</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Table name */}
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">{table.tableName}</h2>
                            <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-widest ${isVIP ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                <Tag className="w-3 h-3" />
                                {tableCategory} TABLE
                            </span>
                        </div>

                        {/* Elegant Customer Input / Member Card 1 */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Nama Pelanggan <span className="text-rose-400">*</span>
                            </label>

                            {member ? (
                                /* Card 1: Member Identified */
                                <div className="relative group transition-all duration-500 animate-in zoom-in-95 -translate-y-1">
                                    <div className="flex flex-col gap-3 p-4 bg-white border-2 border-indigo-500 rounded-[2rem] shadow-xl shadow-indigo-500/15 ring-4 ring-indigo-500/5 relative z-10 overflow-hidden">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 flex-shrink-0">
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <input
                                                    type="text"
                                                    value={customerName}
                                                    onChange={(e) => setCustomerName(e.target.value)}
                                                    className="w-full bg-transparent border-none outline-none font-black text-slate-900 text-lg p-0 uppercase placeholder:text-slate-300"
                                                    placeholder="Nama Pelanggan..."
                                                />
                                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">
                                                    MEMBER: {member.name.toUpperCase()} ({member.tier?.name || 'REGULAR'})
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => { setMember(null); setCustomerName(''); }}
                                                className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 hover:bg-indigo-100 flex items-center justify-center border border-indigo-100 transition-all shrink-0"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* Mobile-only balance row */}
                                        <div className="md:hidden flex items-center justify-between pt-3 border-t border-indigo-50">
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Saldo Anda</p>
                                                <p className="text-sm font-black text-indigo-600">Rp {Number(member.balance).toLocaleString('id-ID')}</p>
                                            </div>
                                            {!isBalanceSufficient && (
                                                <div className="px-3 py-1 bg-rose-500 text-white rounded-full text-[8px] font-black uppercase shadow-lg shadow-rose-200">
                                                    {activeTab === 'playtime' ? 'Saldo < 1 Jam' : 'Saldo Kurang'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Checkmark Badge */}
                                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl z-20 border-4 border-white animate-in zoom-in duration-500 delay-200">
                                        <Check className="w-4 h-4" strokeWidth={5} />
                                    </div>
                                </div>
                            ) : (
                                /* Default Input */
                                <div className={`
                                    group relative rounded-3xl transition-all duration-300
                                    ${customerName ? 'shadow-lg shadow-indigo-50' : 'shadow-sm shadow-slate-200/50'}
                                    focus-within:shadow-xl focus-within:shadow-indigo-500/15 focus-within:-translate-y-1
                                `}>
                                    {/* Animated Running Border for Empty/Standby State */}
                                    {!customerName && (
                                        <div className="absolute -inset-[2px] rounded-[calc(1.5rem+2px)] overflow-hidden pointer-events-none group-focus-within:opacity-0 transition-opacity duration-300">
                                            <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,transparent_270deg,#f43f5e_360deg)] animate-[spin_2s_linear_infinite] opacity-100" />
                                        </div>
                                    )}

                                    {/* Inner Container */}
                                    <div className={`
                                        relative flex items-center gap-4 p-4 rounded-3xl transition-all duration-300 border-2 bg-white
                                        ${customerName ? 'border-indigo-200' : 'border-transparent'}
                                        group-focus-within:border-indigo-500 group-focus-within:ring-4 group-focus-within:ring-indigo-500/5
                                    `}>
                                        <div className={`
                                            w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300
                                            ${customerName ? 'bg-indigo-600 text-white shadow-lg rotate-0' : 'bg-slate-50 text-rose-400 -rotate-3 border border-rose-100'}
                                            group-focus-within:bg-indigo-600 group-focus-within:text-white group-focus-within:rotate-0 group-focus-within:border-transparent
                                        `}>
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={customerName}
                                                onChange={(e) => {
                                                    setCustomerName(e.target.value);
                                                    if (member && e.target.value !== member.name) setMember(null);
                                                }}
                                                placeholder="Ketik nama tamu..."
                                                className="w-full bg-transparent border-none outline-none font-black text-slate-800 placeholder:text-slate-300 placeholder:font-bold text-lg p-0 uppercase"
                                                autoFocus
                                            />
                                            <p className={`text-[9px] font-bold uppercase tracking-tight mt-0.5 transition-colors ${customerName ? 'text-slate-400' : 'text-rose-400'}`}>
                                                {customerName ? 'Tamu sudah terdaftar' : 'Input wajib diisi'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => setIsScanning(true)}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isScanning ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-indigo-600 hover:bg-indigo-100 shadow-sm border border-indigo-50'} group-focus-within:bg-indigo-50`}
                                                title="Scan QR Member"
                                                type="button"
                                            >
                                                <QrCode className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mode Tabs */}
                        <div className="mt-2 md:mt-3">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Pilih Mode</label>
                            <div className="grid grid-cols-3 gap-3 md:gap-4">
                            {/* PLAYTIME */}
                            <div className="relative group rounded-xl">
                                {!isPlaytime && (
                                    <div className="absolute -inset-[2px] rounded-[calc(0.75rem+2px)] overflow-hidden pointer-events-none opacity-80">
                                        <div className="absolute inset-[-150%] bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,transparent_270deg,#6366f1_360deg)] animate-[spin_2.5s_linear_infinite]" />
                                    </div>
                                )}
                                <button
                                    onClick={() => { setActiveTab('playtime'); setSelectedPackageId(null); setSelectedPromoId(null); }}
                                    className={`relative w-full py-2 px-1 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-1 ${isPlaytime
                                        ? 'bg-gradient-to-b from-white to-indigo-50/50 border-indigo-500 text-indigo-700 shadow-xl shadow-indigo-500/15 ring-4 ring-indigo-500/5 -translate-y-1'
                                        : 'bg-slate-50 border-transparent text-indigo-400 hover:bg-white'}`}
                                >
                                    <Clock className="w-4 h-4" />
                                    <span className="text-[9px] font-black uppercase">PLAYTIME</span>
                                </button>
                            </div>

                            {/* DURATION */}
                            <div className="relative group rounded-xl">
                                {activeTab !== 'duration' && (
                                    <div className="absolute -inset-[2px] rounded-[calc(0.75rem+2px)] overflow-hidden pointer-events-none opacity-80">
                                        <div className="absolute inset-[-150%] bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,transparent_270deg,#f59e0b_360deg)] animate-[spin_2.5s_linear_infinite]" />
                                    </div>
                                )}
                                <button
                                    onClick={() => { setActiveTab('duration'); setSelectedPackageId(null); setSelectedPromoId(null); }}
                                    className={`relative w-full py-2 px-1 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-1 ${activeTab === 'duration'
                                        ? 'bg-gradient-to-b from-white to-amber-50/50 border-amber-500 text-amber-700 shadow-xl shadow-amber-500/15 ring-4 ring-amber-500/5 -translate-y-1'
                                        : 'bg-slate-50 border-transparent text-amber-500 hover:bg-white'}`}
                                >
                                    <Timer className="w-4 h-4" />
                                    <span className="text-[9px] font-black uppercase">DURATION</span>
                                </button>
                            </div>

                            {/* PROMO */}
                            <div className="relative group rounded-xl">
                                {!isPromo && (
                                    <div className="absolute -inset-[2px] rounded-[calc(0.75rem+2px)] overflow-hidden pointer-events-none opacity-80">
                                        <div className="absolute inset-[-150%] bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,transparent_270deg,#10b981_360deg)] animate-[spin_2.5s_linear_infinite]" />
                                    </div>
                                )}
                                <button
                                    onClick={() => { setActiveTab('promo'); setSelectedPackageId(null); setSelectedPromoId(null); }}
                                    className={`relative w-full py-2 px-1 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-1 ${isPromo
                                        ? 'bg-gradient-to-b from-white to-emerald-50/50 border-emerald-500 text-emerald-700 shadow-xl shadow-emerald-500/15 ring-4 ring-emerald-500/5 -translate-y-1'
                                        : 'bg-slate-50 border-transparent text-emerald-500 hover:bg-white'}`}
                                >
                                    <Tag className="w-4 h-4" />
                                    <span className="text-[9px] font-black uppercase">PROMO</span>
                                </button>
                            </div>
                        </div> {/* Close grid */}
                        <p className="text-[9px] text-slate-400 text-center font-medium mt-3 px-1 leading-relaxed">
                            {isPlaytime
                                ? 'Open Bill — bayar nanti sesuai durasi main.'
                                : isPromo
                                    ? promoSubMode === 'voucher' ? 'Voucher Kode — diskon/gratis sesuai tipe.' : 'Paket Bundling — durasi billiard + menu cafe.'
                                    : 'Prepaid — waktu habis otomatis mati.'}
                        </p>
                    </div>

                        {/* Info card (hidden on mobile to save space) */}
                        <div className="hidden md:block mt-auto p-4 rounded-2xl border bg-indigo-50 border-indigo-100">
                            <div className="flex gap-3">
                                <div className={`p-2 rounded-lg h-fit ${isPlaytime ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {isPlaytime ? <PlayCircle className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
                                </div>
                                <div>
                                    <p className={`font-bold text-sm ${isPlaytime ? 'text-indigo-900' : 'text-amber-900'}`}>
                                        {isPlaytime ? 'Mode Open Table' : 'Mode Paket Durasi'}
                                    </p>
                                    <p className={`text-xs opacity-80 mt-0.5 leading-relaxed ${isPlaytime ? 'text-indigo-800' : 'text-amber-800'}`}>
                                        {isPlaytime
                                            ? 'Tagihan dihitung per menit saat sesi distop.'
                                            : 'Lampu meja akan mati otomatis setelah durasi habis.'}
                                    </p>
                                </div>
                            </div>

                            {/* Card 2: Detailed Member Profile (Visible on all devices) */}
                            {member && (
                                <div className="hidden md:block mt-2 p-5 rounded-[1.5rem] bg-indigo-600 text-white shadow-[0_15px_35px_rgba(79,70,229,0.2)] animate-in slide-in-from-top-4 duration-500 relative overflow-hidden group border-2 border-indigo-400/50">
                                    {/* Subtle QR Watermark */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                        <QrCode className="w-[140%] h-[140%] rotate-12 scale-150" strokeWidth={1} />
                                    </div>

                                    <div className="relative z-10 flex flex-col gap-4">
                                        <div className="flex justify-between items-start">
                                            <div className="px-3.5 py-1.5 bg-white/20  rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-white/40 shadow-sm">
                                                {member.tier?.name || 'MEMBER'}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-black text-indigo-200 uppercase tracking-widest mb-0.5">ID MEMBER</p>
                                                <p className="font-mono text-xs font-black tracking-wider text-indigo-100">{member.memberCode}</p>
                                            </div>
                                        </div>

                                        <h4 className="text-2xl font-black uppercase tracking-tight leading-none mb-1 text-white truncate drop-shadow-sm">{member.name}</h4>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div className="bg-white/10  px-4 py-3 rounded-2xl border border-white/10 shadow-inner flex flex-col justify-center">
                                                <p className="text-[8px] font-black text-indigo-100 uppercase tracking-widest mb-1 opacity-70">SALDO</p>
                                                {(() => {
                                                    const balStr = `Rp ${Number(member.balance).toLocaleString('id-ID', { minimumFractionDigits: 0 })}`;
                                                    const fontSize = balStr.length > 14 ? 'text-sm' : balStr.length > 11 ? 'text-base' : 'text-lg';
                                                    return (
                                                        <p className={`${fontSize} font-black tracking-tight leading-none text-white whitespace-nowrap tabular-nums drop-shadow-sm`}>
                                                            {balStr}
                                                        </p>
                                                    );
                                                })()}
                                            </div>
                                            <div className="bg-white/10  px-4 py-3 rounded-2xl border border-white/10 shadow-inner">
                                                <p className="text-[8px] font-black text-indigo-100 uppercase tracking-widest mb-1 opacity-70">EXPIRY</p>
                                                <p className="text-sm font-black tracking-tight leading-none text-white/90">
                                                    {member.expiryDate ? new Date(member.expiryDate).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Selamanya'}
                                                </p>
                                            </div>
                                        </div>

                                        {!isBalanceSufficient && (
                                            <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-center gap-2 animate-pulse">
                                                <AlertCircle className="w-3.5 h-3.5 text-rose-100" />
                                                <div className="flex flex-col">
                                                    <p className="text-[9px] font-bold text-rose-100 uppercase tracking-tight">
                                                        {activeTab === 'playtime'
                                                            ? `Saldo Minimal Rp ${currentCustomRate.toLocaleString()} (1 Jam)`
                                                            : 'Saldo Tidak Cukup Untuk Paket Ini'}
                                                    </p>
                                                    <p className="text-[7px] font-black text-rose-200/60 uppercase">Top-up saldo terlebih dahulu</p>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => {
                                                setMember(null);
                                                setCustomerName('');
                                            }}
                                            className="mt-1 w-full py-3.5 bg-white text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 active:scale-[0.97] transition-all shadow-xl shadow-indigo-900/5"
                                        >
                                            HAPUS MEMBERSHIP
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ══════════ RIGHT PANEL ══════════ */}
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Scrollable package area */}
                        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-8 md:py-8 custom-touch-scroll">
                            <h3 className="text-base md:text-lg font-black text-slate-800 mb-0.5">
                                {isPlaytime ? 'Pilih Paket Open' : isPromo ? (promoSubMode === 'voucher' ? '🎟️ Klaim Kode Voucher' : 'Pilih Paket Promo Bundling') : 'Pilih Paket Durasi'}
                            </h3>

                            {/* PROMO: Sub-mode toggle */}
                            {isPromo && (
                                <div className="flex gap-2 mb-5 mt-2">
                                    <button
                                        onClick={() => { setPromoSubMode('bundling'); setValidatedVoucher(null); setVoucherCode(''); setVoucherError(''); }}
                                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${promoSubMode === 'bundling' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                                    >
                                        📦 Paket Bundling
                                    </button>
                                    <button
                                        onClick={() => { setPromoSubMode('voucher'); setSelectedPromoId(null); }}
                                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${promoSubMode === 'voucher' ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-100' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                                    >
                                        🎟️ Kode Voucher
                                    </button>
                                </div>
                            )}

                            {/* PROMO VOUCHER MODE: Input + Validation Card */}
                            {isPromo && promoSubMode === 'voucher' && (
                                <div className="space-y-4 mb-6">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={voucherCode}
                                            onChange={(e) => {
                                                setVoucherCode(e.target.value.toUpperCase());
                                                setValidatedVoucher(null);
                                                setVoucherError('');
                                            }}
                                            onKeyDown={(e) => e.key === 'Enter' && handleValidateVoucher()}
                                            placeholder="Contoh: GRATIS2JAM"
                                            className="flex-1 bg-white border-2 border-violet-200 rounded-2xl px-4 py-3 font-black text-slate-900 text-sm placeholder:font-normal placeholder:text-slate-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all tracking-widest uppercase"
                                        />
                                        <button
                                            onClick={handleValidateVoucher}
                                            disabled={!voucherCode.trim() || isValidatingVoucher}
                                            className="px-5 py-3 bg-violet-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-200 whitespace-nowrap"
                                        >
                                            {isValidatingVoucher ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : '✓ Cek'}
                                        </button>
                                    </div>

                                    {/* Error State */}
                                    {voucherError && (
                                        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl animate-in slide-in-from-top-2 duration-200">
                                            <span className="text-rose-500 text-lg">❌</span>
                                            <div>
                                                <p className="font-black text-rose-700 text-sm">Voucher Tidak Valid</p>
                                                <p className="text-rose-600 text-xs mt-0.5">{voucherError}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Success Card */}
                                    {validatedVoucher && !voucherError && (
                                        <div className="p-5 bg-gradient-to-br from-violet-50 to-emerald-50 border-2 border-violet-200 rounded-2xl animate-in slide-in-from-top-2 duration-300 shadow-lg shadow-violet-50">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg">
                                                        <Check className="w-4 h-4" strokeWidth={3} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Voucher Valid!</p>
                                                        <p className="font-black text-slate-900 text-sm leading-tight">{validatedVoucher.name}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => { setValidatedVoucher(null); setVoucherCode(''); setVoucherEffect(null); }}
                                                    className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 flex items-center justify-center"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {/* Effect Summary */}
                                            <div className="space-y-2">
                                                {validatedVoucher.type === 'FREE_BILLIARD_MINUTES' && voucherEffect && (
                                                    <div className="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-xl border border-violet-100">
                                                        <span className="text-lg">⏱️</span>
                                                        <div>
                                                            <p className="text-[10px] font-black text-violet-700 uppercase tracking-wider">Gratis Bermain</p>
                                                            <p className="text-sm font-black text-slate-800">{voucherEffect.freeBilliardMinutes} Menit ({Number((voucherEffect.freeBilliardMinutes / 60).toFixed(1))} Jam)</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {validatedVoucher.type === 'SPECIAL_PRICE' && (
                                                    <div className="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-xl border border-violet-100">
                                                        <span className="text-lg">💰</span>
                                                        <div>
                                                            <p className="text-[10px] font-black text-violet-700 uppercase tracking-wider">Harga Spesial</p>
                                                            <p className="text-sm font-black text-slate-800">Total hanya Rp {Number(validatedVoucher.discountValue).toLocaleString('id-ID')} berapapun durasi</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {validatedVoucher.type === 'FREE_ITEM' && (
                                                    <div className="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-xl border border-violet-100">
                                                        <span className="text-lg">🎁</span>
                                                        <div>
                                                            <p className="text-[10px] font-black text-violet-700 uppercase tracking-wider">Gratis Item</p>
                                                            <p className="text-sm font-black text-slate-800">{validatedVoucher.freeMenuItem?.name || validatedVoucher.name || 'Item F&B'}</p>
                                                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Auto-add ke pesanan (Rp 0)</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {(validatedVoucher.type === 'DISCOUNT_PERCENT' || validatedVoucher.type === 'DISCOUNT_FIXED') && voucherEffect && (
                                                    <div className="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-xl border border-violet-100">
                                                        <span className="text-lg">🏷️</span>
                                                        <div>
                                                            <p className="text-[10px] font-black text-violet-700 uppercase tracking-wider">Diskon Diterapkan</p>
                                                            <p className="text-sm font-black text-slate-800">
                                                                {validatedVoucher.type === 'DISCOUNT_PERCENT'
                                                                    ? `${validatedVoucher.discountValue}% off (maks Rp ${Number(validatedVoucher.maxDiscountAmount).toLocaleString('id-ID')})`
                                                                    : `Potongan Rp ${Number(validatedVoucher.discountValue).toLocaleString('id-ID')}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {validatedVoucher.usageLimit && (
                                                    <p className="text-[9px] text-slate-400 font-medium text-center">
                                                        Sisa Kuota: {validatedVoucher.usageLimit - validatedVoucher.usageCount} dari {validatedVoucher.usageLimit}
                                                    </p>
                                                )}
                                                {validatedVoucher.type !== 'FREE_BILLIARD_MINUTES' && (
                                                    <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                                                        <p className="text-[10px] text-indigo-700 font-medium leading-relaxed">
                                                            💡 <b>Tips:</b> Ingin bermain dengan <b>Paket Durasi</b>? <br/>
                                                            Klik tab <span className="font-bold">DURATION</span> di sebelah kiri sebelum menekan tombol Mulai. Voucher Anda akan tetap terpasang!
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <p className="text-slate-400 text-xs mb-5">
                                {isPromo && promoSubMode === 'voucher'
                                    ? 'Masukkan kode voucher yang diberikan kepada pelanggan.'
                                    : isPromo
                                        ? promos.length > 0 ? `${promos.length} promo tersedia.` : 'Tidak ada promo aktif.'
                                        : filteredPackages.length > 0
                                            ? `${filteredPackages.length} paket tersedia untuk kategori meja ini.`
                                            : 'Tidak ada paket yang sesuai kriteria.'}
                            </p>

                            {/* Package Grid — 1 col on mobile, 2 on tablet and desktop */}
                            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${isPromo && promoSubMode === 'voucher' ? 'hidden' : ''}`}>
                                {isPromo ? (
                                    promos.map((promo) => {
                                        const selected = selectedPromoId === promo.id;
                                        return (
                                            <button
                                                key={promo.id}
                                                onClick={() => handlePromoSelect(promo)}
                                                className={`group relative p-3 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${selected
                                                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-50'
                                                    : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
                                                        <Tag className="w-3.5 h-3.5" />
                                                    </div>

                                                    <div className="flex flex-col items-end gap-1">
                                                        {promo.ruleJson?.badge ? (
                                                            <span className="bg-rose-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest shadow-sm shrink-0">
                                                                {promo.ruleJson.badge}
                                                            </span>
                                                        ) : (
                                                            promo.type === 'BUNDLE' && (
                                                                <span className="bg-amber-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest shadow-sm shrink-0">SPECIAL BUNDLE</span>
                                                            )
                                                        )}
                                                        {selected && (
                                                            <div className="p-0.5 rounded-full bg-emerald-600 text-white">
                                                                <Check className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                    </div>

                                                </div>

                                                <h4 className="font-black text-sm text-slate-800 mb-0.5 leading-tight">{promo.name}</h4>
                                                <div>
                                                    <p className="text-sm font-bold text-emerald-600">
                                                        Rp {Number(promo.ruleJson.fixedPrice || 0).toLocaleString()}
                                                    </p>
                                                    <p className="text-[9px] text-slate-500 mt-1 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> {promo.ruleJson.requireBilliardMinutes} Menit
                                                    </p>
                                                    {promo.ruleJson.requireMenuItems?.length > 0 && (
                                                        <div className="mt-1.5 pt-1.5 border-t border-emerald-100/50">
                                                            <p className="text-[8px] font-bold text-emerald-800 uppercase tracking-wider mb-0.5">Termasuk Menu:</p>
                                                            <ul className="space-y-0.5">
                                                                {promo.ruleJson.requireMenuItems.map((item: any, i: number) => (
                                                                    <li key={i} className="text-[8px] text-slate-600 flex justify-between">
                                                                        <span className="truncate pr-1">• {item.name || `Item #${item.id}`}</span>
                                                                        <span className="font-bold shrink-0">x{item.quantity}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })
                                ) : (
                                    filteredPackages.map((pkg) => {
                                        const selected = selectedPackageId === pkg.id;
                                        
                                        const info = getActiveSlotInfo(pkg);
                                        const originalPrice = info.price;
                                        let finalPrice = originalPrice;
                                        let hasDiscount = false;
                                        let discountBadge = '';
                                        
                                        if (info.discountPercentage > 0) {
                                            finalPrice = originalPrice - (originalPrice * info.discountPercentage / 100);
                                            hasDiscount = true;
                                            discountBadge = `${info.discountPercentage}% OFF`;
                                        } else if (info.discountNominal > 0) {
                                            if (!isPlaytime) {
                                                finalPrice = Math.max(0, originalPrice - info.discountNominal);
                                            }
                                            hasDiscount = true;
                                            discountBadge = `-Rp ${info.discountNominal.toLocaleString()}`;
                                        }

                                        return (
                                            <button
                                                key={pkg.id}
                                                onClick={() => handlePackageSelect(pkg)}
                                                className={`group relative p-3 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${selected
                                                    ? isPlaytime
                                                        ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-50'
                                                        : 'border-amber-500 bg-amber-50 ring-2 ring-amber-50'
                                                    : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className={`p-1.5 rounded-lg ${isPlaytime ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                                                        {isPlaytime ? <Clock className="w-3.5 h-3.5" /> : <Timer className="w-3.5 h-3.5" />}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        {hasDiscount && (
                                                            <span className="bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest shadow-sm">
                                                                {discountBadge}
                                                            </span>
                                                        )}
                                                        {selected && (
                                                            <div className={`p-0.5 rounded-full ${isPlaytime ? 'bg-indigo-600' : 'bg-amber-500'} text-white`}>
                                                                <Check className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <h4 className="font-black text-sm text-slate-800 mb-0.5 leading-tight">{pkg.name}</h4>

                                                {isPlaytime ? (
                                                    <div>
                                                        <p className="text-sm font-bold text-indigo-600">
                                                            {hasDiscount && (info.discountPercentage > 0) && (
                                                                <span className="text-[10px] line-through text-slate-400 mr-1">Rp {originalPrice.toLocaleString()}</span>
                                                            )}
                                                            Rp {finalPrice.toLocaleString()}
                                                            <span className="text-[10px] text-indigo-400 font-medium"> / Jam</span>
                                                        </p>
                                                        {pkg.timeSlots && pkg.timeSlots.length > 0 && (
                                                            <div className="mt-1.5 pt-1.5 border-t border-indigo-100/50 flex flex-wrap gap-1">
                                                                {pkg.timeSlots.map((slot: any, i: number) => (
                                                                    <span key={i} className="text-[8px] bg-white border border-indigo-100 text-indigo-500 px-1 py-0.5 rounded">
                                                                        {slot.start}–{slot.end}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-xs font-bold text-amber-600">{pkg.durationMinutes} Menit</span>
                                                            <span className="text-[10px] text-slate-400 font-medium">Fixed</span>
                                                        </div>
                                                        <p className="text-base font-black text-slate-800 mt-0.5">
                                                            {hasDiscount && (
                                                                <span className="text-[10px] line-through text-slate-400 mr-1.5">Rp {originalPrice.toLocaleString()}</span>
                                                            )}
                                                            Rp {finalPrice.toLocaleString()}
                                                        </p>
                                                        {pkg.timeSlots && pkg.timeSlots.length > 0 && (
                                                            <div className="mt-1.5 pt-1.5 border-t border-amber-100/50 space-y-0.5">
                                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                                    <Info className="w-2.5 h-2.5" /> Tarif Waktu
                                                                </p>
                                                                {pkg.timeSlots.map((slot: any, i: number) => (
                                                                    <div key={i} className="flex justify-between text-[9px] text-slate-500">
                                                                        <span>{slot.start}–{slot.end}</span>
                                                                        <span className="font-bold text-slate-700">Rp {Number(slot.price).toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })
                                )}

                                {/* Custom Duration Card */}
                                {activeTab === 'duration' && (
                                    <button
                                        onClick={() => { setIsCustomDurationMode(true); setSelectedPackageId(null); }}
                                        className={`group p-4 rounded-2xl border-2 border-dashed transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-2 min-h-[120px] ${isCustomDurationMode
                                            ? 'border-slate-400 bg-slate-50'
                                            : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-amber-300'}`}
                                    >
                                        <div className={`p-2.5 rounded-full transition-colors ${isCustomDurationMode ? 'bg-slate-200 text-slate-500' : 'bg-white text-slate-300 group-hover:text-amber-500 shadow-sm'}`}>
                                            <Timer className="w-5 h-5" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-black text-slate-700 text-sm">Custom Durasi</p>
                                            <p className="text-xs text-slate-400 mt-0.5">Input menit manual</p>
                                        </div>
                                    </button>
                                )}
                            </div>

                            {/* Custom Duration Input */}
                            {isCustomDurationMode && activeTab === 'duration' && (
                                <div className="mt-4 animate-in slide-in-from-bottom-2 space-y-4">
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center">
                                        <h4 className="font-bold text-slate-500 uppercase tracking-widest text-[10px] mb-4">Set Durasi Manual</h4>
                                        <div className="flex items-center justify-center gap-4 mb-4">
                                            <button
                                                onClick={() => setCustomDuration(Math.max(15, customDuration - 15))}
                                                className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 text-slate-400 hover:text-indigo-600 font-bold text-xl transition-all"
                                            >−</button>
                                            <InputField
                                                label=""
                                                type="number"
                                                value={customDuration}
                                                onChange={(val) => setCustomDuration(Math.max(0, val || 0))}
                                                className="w-28 text-3xl font-black text-center"
                                                suffix={<span className="text-[10px] font-bold text-slate-400">MIN</span>}
                                            />
                                            <button
                                                onClick={() => setCustomDuration(customDuration + 15)}
                                                className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 text-slate-400 hover:text-indigo-600 font-bold text-xl transition-all"
                                            >+</button>
                                        </div>

                                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mt-2">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest leading-none">Tarif Berlaku ({tableCategory})</p>
                                                <span className="text-[10px] font-black text-amber-500 bg-amber-100 px-1.5 py-0.5 rounded uppercase">{customRateInfo.source}</span>
                                            </div>
                                            <p className="text-xl font-black text-amber-600 tracking-tight">
                                                Rp {currentCustomRate.toLocaleString()} <span className="text-[10px] font-bold text-amber-400">/ JAM</span>
                                            </p>
                                            <div className="mt-3 pt-3 border-t border-amber-200/50">
                                                <p className="text-xs font-bold text-amber-700">Estimasi Total: Rp {((customDuration / 60) * currentCustomRate).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ─── STICKY FOOTER / CONFIRM BUTTON ──────────────────── */}
                        <div className="shrink-0 px-5 py-4 md:px-8 md:py-6 border-t border-slate-100 bg-white">
                            <button
                                disabled={!canConfirm}
                                onClick={handleConfirm}
                                className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] ${!canConfirm
                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                                    : isPlaytime
                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-indigo-300'
                                        : isPromo
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 hover:shadow-emerald-300'
                                            : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200 hover:shadow-amber-300'
                                    }`}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span className="uppercase tracking-widest">Memproses...</span>
                                    </>
                                ) : (
                                    <>
                                        {hasUncheckedVoucher ? (activeTab === 'promo' ? 'KLIK TOMBOL CEK VOUCHER' : 'CEK VOUCHER DI TAB PROMO DULU') :
                                         isPlaytime ? (validatedVoucher ? 'MULAI OPEN TABLE + VOUCHER' : 'MULAI OPEN TABLE') : 
                                         isPromo ? (promoSubMode === 'voucher' ? 'PILIH TAB PLAYTIME / DURATION' : 'MULAI PROMO BUNDLING') : 
                                         (validatedVoucher ? 'MULAI PAKET + VOUCHER' : 'MULAI PAKET')}
                                        {canConfirm && <ArrowRight className="w-5 h-5" />}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isScanning && (
                <QRScanner
                    onScanSuccess={handleScanSuccess}
                    onClose={() => setIsScanning(false)}
                />
            )}

            {showVoucherPrompt && (
                <div className="fixed inset-0 z-[150] bg-slate-900/70  flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl shadow-indigo-900/20 animate-in zoom-in-95 duration-300 flex flex-col items-center relative overflow-hidden border border-slate-100">
                        
                        {/* Decorative Background Blur */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

                        {/* Top Icon */}
                        <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-indigo-50 rounded-[1.25rem] flex items-center justify-center shadow-inner mb-4 relative border border-violet-100/50">
                            <Tag className="w-8 h-8 text-violet-600" />
                            {/* Sparkles / details */}
                            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
                            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full" />
                        </div>

                        <h3 className="text-xl font-black text-slate-800 text-center tracking-tight leading-tight mb-2">
                            Punya Kode Voucher?
                        </h3>
                        <p className="text-xs text-slate-500 text-center font-medium mb-6 leading-relaxed max-w-[280px]">
                            Masukkan kode voucher pelanggan di bawah ini untuk mengklaim promo sebelum sesi dimulai.
                        </p>
                        
                        {!validatedVoucher ? (
                            <div className="w-full space-y-4 relative z-10">
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={voucherCode}
                                        onChange={(e) => {
                                            setVoucherCode(e.target.value.toUpperCase());
                                            setVoucherError('');
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleValidateVoucher()}
                                        placeholder="KETIK KODE..."
                                        className="w-full bg-slate-50/50 border-2 border-slate-200 rounded-2xl pl-11 pr-4 py-3 font-black text-slate-900 text-base placeholder:font-bold placeholder:text-slate-300 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 outline-none transition-all tracking-widest uppercase"
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors">
                                        <Tag className="w-5 h-5" />
                                    </div>
                                </div>

                                {voucherError && (
                                    <div className="flex items-center justify-center gap-2 text-rose-500 bg-rose-50 py-3 px-4 rounded-xl animate-in slide-in-from-top-1 border border-rose-100">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <p className="text-xs font-bold text-center leading-tight">{voucherError}</p>
                                    </div>
                                )}

                                <button
                                    onClick={handleValidateVoucher}
                                    disabled={!voucherCode.trim() || isValidatingVoucher}
                                    className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:from-violet-700 hover:to-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-violet-200 flex justify-center items-center gap-2"
                                >
                                    {isValidatingVoucher ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Mengecek...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-5 h-5" />
                                            <span>Validasi Voucher</span>
                                        </>
                                    )}
                                </button>
                                
                                <div className="pt-2">
                                    <button 
                                        onClick={() => setShowVoucherPrompt(false)}
                                        className="group w-full flex items-center justify-center gap-2 py-3 bg-violet-50/80 border border-violet-100 text-violet-600 font-black rounded-xl hover:bg-violet-100 hover:text-violet-700 text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
                                    >
                                        <span>Lewati, Tidak Ada Voucher</span>
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full relative z-10 animate-in zoom-in-95 duration-300">
                                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-3xl border-2 border-emerald-100 flex flex-col items-center gap-4 text-center relative overflow-hidden">
                                    
                                    {/* Success Icon */}
                                    <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                                        <Check className="w-5 h-5" strokeWidth={4} />
                                    </div>
                                    
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Voucher Diterapkan!</p>
                                        <p className="text-lg font-black text-slate-800 leading-tight">{validatedVoucher.name}</p>
                                    </div>
                                    
                                    <div className="bg-white/80 backdrop-blur w-full p-4 rounded-2xl border border-emerald-100/50 shadow-sm mt-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5 mb-1.5">
                                            <Info className="w-3.5 h-3.5 text-emerald-500" /> Instruksi Kasir
                                        </p>
                                        <p className="text-emerald-700 font-bold text-xs leading-relaxed">
                                            {validatedVoucher.type === 'FREE_BILLIARD_MINUTES' 
                                                ? 'Tunjukkan notifikasi Gratis Bermain ini ke pelanggan sekarang saat buka meja.'
                                                : 'Voucher akan memotong tagihan. Ingatkan pelanggan untuk pembayaran nanti.'}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="mt-5">
                                    <button 
                                        onClick={() => setShowVoucherPrompt(false)}
                                        className="w-full py-3.5 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 text-xs uppercase tracking-widest shadow-xl shadow-slate-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                    >
                                        Lanjut Isi Data <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StartSessionModal;
