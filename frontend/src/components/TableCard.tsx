'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Coffee,
    Power,
    ChevronDown,
    ChevronUp,
    Play,
    Square,
    CreditCard,
    Lightbulb,
    Utensils,
    Timer,
    Wrench,
    Receipt,
    Clock,
    Loader2,
    X,
    Ban,
    AlertCircle,
    AlertTriangle,
    XCircle,
    CheckCircle2,
    ArrowLeftRight,
    ArrowLeftRight as MoveIcon,
    Trash2,
    ChevronRight,
    Circle,
    Wallet,
    WifiOff
} from 'lucide-react';
import TableInvoicePreviewModal from './TableInvoicePreviewModal';
import TableOrderDetailsModal from './TableOrderDetailsModal';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/components/ui/AlertProvider'; // 🛠️ Fix: Add missing import

// ... (TableStatus enum and TableProps interface remain unchanged)
export enum TableStatus {
    AVAILABLE = 'available',
    IN_USE = 'in_use',
    WARNING = 'warning',
    WAITING_PAYMENT = 'waiting_payment',
    MAINTENANCE = 'maintenance',
}

interface TableProps {
    table: {
        id: number;
        tableName: string;
        status: TableStatus;
        isLightOn: boolean;
        sessionType?: 'prepaid' | 'open';
        startTime?: string;
        endTime?: string;
        remainingMinutes?: number;
        grandTotal?: number;
        isOffline?: boolean;
        isBooked?: boolean;
        bookedByName?: string;
        activeTransaction?: {
            customerName?: string;
            fareName?: string;
            billiardTotal?: number;
            cafeTotal?: number;
            billingDetails?: Array<{
                slot?: string;
                title?: string;
                name?: string; // Fallback
                duration?: number;
                subtotal?: number;
                price?: number; // Fallback
                ratePerHour?: number;
            }>;
            orderItems?: Array<{
                id: number;
                quantity: number;
                status: string;
                station?: string;
                isPaid?: boolean;
                menuItem: {
                    name: string;
                }
            }>;
            paidAmount?: number;
        };
    };
    onToggleLight: (id: number, isOn: boolean) => void;
    onStartSession: (id: number) => void;
    onStopSession: (id: number) => void;
    onBilling: (id: number) => void;
    onExtend: (id: number) => void;
    onMove?: (id: number) => void;
    onOrder: (id: number) => void;
    onCancelItem?: (item: any) => void;
    onForceReset?: (id: number) => void;
}

// ═══════════════════════════════════════════════════════════════
// 2026 Elegant Flat Design — State-based Color System
// ═══════════════════════════════════════════════════════════════
const stateThemes = {
    [TableStatus.AVAILABLE]: {
        card: 'bg-white border-slate-200/80',
        headerBg: '',
        accent: 'text-emerald-600',
        accentBg: 'bg-emerald-50',
        dot: 'bg-emerald-500',
        label: 'AVAILABLE',
        labelStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    },
    [TableStatus.IN_USE]: {
        card: 'bg-slate-900 border-slate-700/50',
        headerBg: '',
        accent: 'text-sky-400',
        accentBg: 'bg-sky-500/10',
        dot: 'bg-sky-400',
        label: 'IN USE',
        labelStyle: 'bg-sky-500/15 text-sky-300 border-sky-500/20',
    },
    [TableStatus.WARNING]: {
        card: 'bg-amber-950 border-amber-700/40',
        headerBg: '',
        accent: 'text-amber-400',
        accentBg: 'bg-amber-500/10',
        dot: 'bg-amber-400',
        label: 'ENDING',
        labelStyle: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    },
    [TableStatus.WAITING_PAYMENT]: {
        card: 'bg-violet-950 border-violet-700/40',
        headerBg: '',
        accent: 'text-violet-400',
        accentBg: 'bg-violet-500/10',
        dot: 'bg-violet-400',
        label: 'BILLING',
        labelStyle: 'bg-violet-500/15 text-violet-300 border-violet-500/20',
    },
    [TableStatus.MAINTENANCE]: {
        card: 'bg-slate-100 border-slate-200',
        headerBg: '',
        accent: 'text-slate-400',
        accentBg: 'bg-slate-100',
        dot: 'bg-slate-400',
        label: 'MAINT.',
        labelStyle: 'bg-slate-100 text-slate-500 border-slate-200',
    },
};

const TableCard: React.FC<TableProps> = ({ table, onToggleLight, onStartSession, onStopSession, onBilling, onExtend, onMove, onOrder, onCancelItem, onForceReset }) => {
    const router = useRouter();
    const { hasPermission } = useAuth();
    const { showConfirm } = useAlert(); // 🛡️ Access alert context
    const [timeLeft, setTimeLeft] = useState<string>('--:--');
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [currentTotal, setCurrentTotal] = useState<number>(0);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);

    useEffect(() => {
        setIsOffline(!!table.isOffline);
    }, [table.isOffline]);

    // Sticky Total: Memory for grandTotal to prevent 0-flickering
    useEffect(() => {
        const total = Number(table.grandTotal || 0);
        if (total > 0 && !isNaN(total)) {
            setCurrentTotal(total);
        }
    }, [table.grandTotal]);

    useEffect(() => {
        if (table.status === TableStatus.IN_USE || table.status === TableStatus.WARNING) {
            const updateTimerAndPrice = () => {
                const now = new Date().getTime();

                // Timer Logic
                if (table.sessionType === 'prepaid' && table.endTime) {
                    const end = new Date(table.endTime).getTime();
                    const diff = Math.max(0, end - now);
                    const hours = Math.floor(diff / 3600000);
                    const mins = Math.floor((diff % 3600000) / 60000);
                    const secs = Math.floor((diff % 60000) / 1000);
                    setTimeLeft(`${hours > 0 ? hours + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
                } else if (table.startTime) {
                    const start = new Date(table.startTime).getTime();
                    const diff = now - start;
                    const hours = Math.floor(diff / 3600000);
                    const mins = Math.floor((diff % 3600000) / 60000);
                    const secs = Math.floor((diff % 60000) / 1000);
                    setTimeLeft(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);

                    // Real-time Pricing Logic (Client Side Estimate)
                }
            };

            updateTimerAndPrice();
            const interval = setInterval(updateTimerAndPrice, 1000);
            return () => clearInterval(interval);
        } else {
            setTimeLeft('--:--');
        }
    }, [table.status, table.endTime, table.startTime, table.sessionType, table.activeTransaction, table.grandTotal]);

    const theme = stateThemes[table.status] || stateThemes[TableStatus.MAINTENANCE];
    const isDark = [TableStatus.IN_USE, TableStatus.WARNING, TableStatus.WAITING_PAYMENT].includes(table.status);
    const activeOrderItems = table.activeTransaction?.orderItems?.filter(i => i.status?.toUpperCase() !== 'CANCELLED') || [];
    const hasOrders = activeOrderItems.length > 0;
    const orderCount = activeOrderItems.reduce((acc, item) => acc + item.quantity, 0) || 0;

    // Strict Null-Check logic (Frontend Guard)
    let member = (table.activeTransaction as any)?.member;
    // If both the transaction and the table say there is no member, IGNORE any lingering global member object
    if (!(table.activeTransaction as any)?.memberId && !(table as any).memberId) {
        member = null;
    }
    const isMember = !!member;
    const tierName = member?.tier?.name?.toUpperCase() || 'MEMBER';

    // Balance Guard Logic
    const [balanceState, setBalanceState] = useState<'NORMAL' | 'LOW' | 'URGENT'>('NORMAL');
    const [effectiveBalance, setEffectiveBalance] = useState<number>(0);

    useEffect(() => {
        if (table.status === TableStatus.AVAILABLE) {
            setCurrentTotal(0);
            setTimeLeft('--:--');
        }
    }, [table.status]);

    useEffect(() => {
        if (isMember && (table.status === TableStatus.IN_USE || table.status === TableStatus.WARNING)) {
            const bill = Number(table.grandTotal || 0);
            const paid = Number(table.activeTransaction?.paidAmount || 0);
            const bal = Number(member.balance || 0);

            // Effective debt is the unpaid portion
            const unpaid = Math.max(0, bill - paid);
            const remaining = bal - unpaid;

            setEffectiveBalance(remaining);

            // Thresholds:
            // URGENT: < 5,000 (roughly < 6 mins at 50k/hr)
            // LOW: < 15,000 (roughly < 18 mins at 50k/hr)
            if (remaining < 5000) {
                setBalanceState('URGENT');
            } else if (remaining < 15000) {
                setBalanceState('LOW');
            } else {
                setBalanceState('NORMAL');
            }
        } else {
            setBalanceState('NORMAL');
        }
    }, [isMember, member?.balance, table.grandTotal, table.activeTransaction?.paidAmount, table.status]);

    // ═══════════════════════════════════════════════════════════════
    // MAINTENANCE STATE — Simple, muted card
    // ═══════════════════════════════════════════════════════════════
    if (table.status === TableStatus.MAINTENANCE) {
        return (
            <div className="relative bg-slate-50 rounded-2xl overflow-hidden border border-slate-200/80 h-full min-h-[200px] flex flex-col items-center justify-center opacity-60">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)',
                        color: '#94a3b8'
                    }}
                ></div>
                <div className="z-10 text-center p-6">
                    <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center mx-auto mb-3">
                        <Wrench className="w-5 h-5 text-slate-400" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-500 mb-1.5">{table.tableName}</h3>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-500 uppercase tracking-wider">
                        <Circle className="w-1.5 h-1.5 fill-current" />
                        Maintenance
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // MAIN CARD — All active states
    // ═══════════════════════════════════════════════════════════════
    return (
        <div className={`
            relative group rounded-2xl transition-all duration-300 overflow-hidden border 
            ${theme.card}
            ${isOffline ? 'opacity-70' : ''} 
            flex flex-col h-full
            ${table.status === TableStatus.AVAILABLE ? 'hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5' : ''}
            ${table.status === TableStatus.IN_USE ? 'shadow-lg shadow-slate-900/20' : ''}
            ${table.status === TableStatus.WARNING ? 'shadow-lg shadow-amber-900/20' : ''}
            ${table.status === TableStatus.WAITING_PAYMENT ? 'shadow-lg shadow-violet-900/20' : ''}
        `}>

            {/* ─── Header ─── */}
            <div className={`px-4 py-3 flex justify-between items-center ${isDark ? 'border-b border-white/[0.06]' : 'border-b border-slate-100'}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${theme.dot} ${table.status === TableStatus.IN_USE ? 'animate-pulse' :
                        table.status === TableStatus.WARNING ? 'animate-pulse' :
                            table.status === TableStatus.WAITING_PAYMENT ? 'animate-pulse' : ''
                        }`}></div>
                    <span className={`text-sm font-extrabold tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {table.tableName}
                    </span>
                    {isMember && isDark && (
                        <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm text-white/80 px-2 py-0.5 rounded-full text-[8px] font-bold border border-white/10 shrink-0 tracking-wider">
                            <CreditCard className="w-2.5 h-2.5" />
                            {tierName}
                        </div>
                    )}
                    {table.isBooked && (
                        <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[8px] font-bold border border-amber-200 animate-pulse shrink-0">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {table.bookedByName}
                        </div>
                    )}
                </div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 border ${isOffline ? 'bg-slate-200 text-slate-500 border-slate-300' : theme.labelStyle}`}>
                    {isOffline ? <WifiOff className="w-3 h-3" /> : <Circle className="w-1.5 h-1.5 fill-current" />}
                    {isOffline ? 'OFFLINE' : (table.status === TableStatus.WARNING
                        ? (parseInt(timeLeft.split(':')[0] || '0') === 0 && parseInt(timeLeft.split(':')[1] || '0') < 5 ? 'URGENT' : 'ENDING')
                        : table.status === TableStatus.WAITING_PAYMENT ? 'BILLING'
                            : theme.label)}
                </div>
            </div>

            {/* ─── Balance Alerts ─── */}
            {(balanceState !== 'NORMAL' || (table.status === TableStatus.WAITING_PAYMENT && isMember && effectiveBalance <= 5000)) && (
                <div className={`px-4 py-1.5 flex flex-wrap gap-1.5 ${isDark ? 'border-b border-white/[0.06]' : 'border-b border-slate-100'}`}>
                    {balanceState === 'URGENT' && (
                        <div className="bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 text-[8px] font-bold border border-rose-500/20 animate-pulse">
                            <AlertCircle className="w-2.5 h-2.5" />
                            SALDO KRITIS
                        </div>
                    )}
                    {balanceState === 'LOW' && (
                        <div className="bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 text-[8px] font-bold border border-amber-500/20">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            SALDO TIPIS
                        </div>
                    )}
                    {table.status === TableStatus.WAITING_PAYMENT && isMember && effectiveBalance <= 5000 && (
                        <div className="bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 text-[8px] font-bold border border-rose-500/20">
                            <XCircle className="w-2.5 h-2.5" />
                            SALDO HABIS
                        </div>
                    )}
                </div>
            )}

            {/* ─── Body ─── */}
            <div className="px-4 py-3 flex-1 flex flex-col gap-2.5">
                {table.status === TableStatus.AVAILABLE ? (
                    /* ──── Available State: Clean billiard icon ──── */
                    <div className="flex-1 flex flex-col items-center justify-center py-6">
                        {/* SVG Billiard Table Top-View Icon */}
                        <div className="relative mb-3">
                            <svg width="64" height="40" viewBox="0 0 64 40" fill="none" className="opacity-20">
                                <rect x="2" y="2" width="60" height="36" rx="4" stroke="#94a3b8" strokeWidth="2.5" fill="none" />
                                <circle cx="6" cy="6" r="2" fill="#94a3b8" />
                                <circle cx="58" cy="6" r="2" fill="#94a3b8" />
                                <circle cx="6" cy="34" r="2" fill="#94a3b8" />
                                <circle cx="58" cy="34" r="2" fill="#94a3b8" />
                                <circle cx="32" cy="6" r="2" fill="#94a3b8" />
                                <circle cx="32" cy="34" r="2" fill="#94a3b8" />
                                <line x1="16" y1="20" x2="48" y2="20" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="3 3" />
                            </svg>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
                            Ready
                        </span>
                    </div>
                ) : (
                    <>
                        {/* ──── Customer Info ──── */}
                        <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 ${isMember ? 'bg-white/15 text-white border border-white/10' :
                                isDark ? 'bg-white/10 text-white/70 border border-white/5' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}>
                                {(table.activeTransaction?.customerName || 'T').charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1 leading-tight">
                                <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                    {table.activeTransaction?.customerName || 'Tamu'}
                                </p>
                                {isMember && <p className="text-[8px] font-bold text-sky-400/70 uppercase tracking-[0.15em] leading-none mt-0.5">{tierName}</p>}
                                <div className={`text-[9px] line-clamp-1 leading-tight mt-0.5 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                                    {table.activeTransaction?.billingDetails && table.activeTransaction.billingDetails.length > 0 ? (
                                        table.activeTransaction.billingDetails.map((b, i) => {
                                            const rawDuration = (b as any).duration || 0;

                                            let totalMins = 0;
                                            if (typeof rawDuration === 'string') {
                                                if (rawDuration.includes(':')) {
                                                    const parts = rawDuration.split(':').map(val => parseInt(val, 10) || 0);
                                                    if (parts.length >= 2) {
                                                        // Handle HH:MM:SS or HH:MM
                                                        totalMins = (parts[0] * 60) + parts[1];
                                                    }
                                                } else {
                                                    totalMins = parseFloat(rawDuration) || 0;
                                                }
                                            } else {
                                                totalMins = Number(rawDuration) || 0;
                                            }

                                            const h = Math.floor(totalMins / 60);
                                            const m = Math.round(totalMins % 60);
                                            const durationStr = `${h}h${m}m`;

                                            return (
                                                <span key={i}>
                                                    {i > 0 && " · "}
                                                    <span className={`font-semibold ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{b.name || b.title || b.slot || 'Sesi'}</span>
                                                    <span className="ml-0.5 opacity-60">({durationStr})</span>
                                                </span>
                                            );
                                        })
                                    ) : (
                                        <span>{table.activeTransaction?.fareName || '-'}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ──── Stats: Duration & Bill ──── */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className={`px-3 py-2.5 rounded-xl ${isDark ? 'bg-white/[0.06] border border-white/[0.06]' : 'bg-slate-50 border border-slate-100'
                                }`}>
                                <p className={`text-[9px] font-semibold uppercase mb-1 flex items-center gap-1 ${isDark ? 'text-white/40' : 'text-slate-400'
                                    }`}>
                                    <Timer className="w-3 h-3" /> Durasi
                                </p>
                                <p className={`text-lg font-extrabold tabular-nums tracking-tight leading-none ${table.status === TableStatus.WARNING ? 'text-amber-400' :
                                    isDark ? 'text-white' : 'text-slate-800'
                                    }`}>
                                    {timeLeft}
                                </p>
                            </div>
                            <div className={`px-3 py-2.5 rounded-xl ${isDark ? 'bg-white/[0.06] border border-white/[0.06]' : 'bg-slate-50 border border-slate-100'
                                }`}>
                                <p className={`text-[9px] font-semibold uppercase mb-1 flex items-center gap-1 ${isDark ? 'text-white/40' : 'text-slate-400'
                                    }`}>
                                    <Wallet className="w-3 h-3" /> Tagihan
                                </p>
                                <p className={`text-lg font-extrabold tabular-nums tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-800'
                                    }`}>
                                    {(() => {
                                        const baseTotal = Math.max(Number(table.grandTotal || 0), currentTotal);
                                        const paid = Number(table.activeTransaction?.paidAmount || 0);
                                        const remaining = Math.max(0, baseTotal - paid);
                                        return isNaN(remaining) ? '0' : remaining.toLocaleString();
                                    })()}
                                </p>
                            </div>
                        </div>

                        {/* ──── Orders Badge ──── */}
                        {hasOrders && (
                            <button
                                onClick={() => setIsDetailsOpen(true)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all group/order ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06]' : 'bg-slate-50 hover:bg-slate-100 border border-slate-100'
                                    }`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <Utensils className={`w-3 h-3 shrink-0 ${isDark ? 'text-amber-400/60' : 'text-amber-500'}`} />
                                    <span className={`text-[10px] font-bold truncate ${isDark ? 'text-white/60' : 'text-slate-600'}`}>{orderCount} Menu</span>
                                    {(() => {
                                        const items = table.activeTransaction?.orderItems || [];
                                        const kdsItems = items.filter(i => i.station === 'KDS' && !['CANCEL_REQUESTED', 'CANCELLED'].includes(i.status?.toUpperCase()));
                                        const bdsItems = items.filter(i => i.station === 'BDS' && !['CANCEL_REQUESTED', 'CANCELLED'].includes(i.status?.toUpperCase()));

                                        if (kdsItems.length === 0 && bdsItems.length === 0) return null;

                                        const kdsRemaining = kdsItems.filter(i => !['DONE', 'SERVED', 'COMPLETED'].includes(i.status?.toUpperCase())).length;
                                        const bdsRemaining = bdsItems.filter(i => !['DONE', 'SERVED', 'COMPLETED'].includes(i.status?.toUpperCase())).length;

                                        const kdsStatus = kdsItems.length > 0 ? (kdsRemaining === 0 ? 'READY' : `${kdsRemaining} LEFT`) : null;
                                        const bdsStatus = bdsItems.length > 0 ? (bdsRemaining === 0 ? 'READY' : `${bdsRemaining} LEFT`) : null;

                                        return (
                                            <div className="flex gap-1 ml-1 overflow-x-auto no-scrollbar">
                                                {kdsStatus && (
                                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${kdsStatus === 'READY'
                                                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 animate-pulse'
                                                        : isDark ? 'text-white/40 bg-white/5 border-white/10' : 'text-slate-400 bg-slate-50 border-slate-100'
                                                        }`}>
                                                        KDS: {kdsStatus}
                                                    </span>
                                                )}
                                                {bdsStatus && (
                                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${bdsStatus === 'READY'
                                                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 animate-pulse'
                                                        : isDark ? 'text-white/40 bg-white/5 border-white/10' : 'text-slate-400 bg-slate-50 border-slate-100'
                                                        }`}>
                                                        BDS: {bdsStatus}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <ChevronRight className={`w-3 h-3 shrink-0 transition-transform group-hover/order:translate-x-0.5 ${isDark ? 'text-white/20' : 'text-slate-300'}`} />
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════
                ACTION BAR — Proportional, consistent buttons
            ═══════════════════════════════════════════════════════ */}
            <div className={`p-3 pt-0 mt-auto ${isDark ? '' : ''}`}>
                {table.status === TableStatus.AVAILABLE ? (
                    /* ── Available: Single full-width start button ── */
                    hasPermission('BILLIARD_START') && (
                        <button
                            onClick={async () => {
                                if (table.isOffline) {
                                    const proceed = await showConfirm(
                                        "Meja Sedang Offline",
                                        "Alat meja ini sedang tidak terhubung. Apakah Anda yakin ingin memaksakan MULAI sesi di sistem?",
                                        { confirmLabel: 'YA, LANJUTKAN', cancelLabel: 'BATAL' }
                                    );
                                    if (!proceed) return;
                                }
                                onStartSession(table.id);
                            }}
                            className={`w-full ${table.isOffline ? 'bg-slate-600 hover:bg-slate-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white py-2.5 rounded-xl font-bold text-xs shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2`}
                        >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            MULAI
                        </button>
                    )
                ) : table.status === TableStatus.WAITING_PAYMENT ? (
                    /* ── Billing: Payment actions ── */
                    <div className="space-y-1.5">
                        {selectedItemIds.length > 0 ? (
                            <button
                                onClick={() => {
                                    router.push(`/billing?tableId=${table.id}&type=billiard&selectedItems=${selectedItemIds.join(',')}`);
                                }}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <CreditCard className="w-3.5 h-3.5" />
                                BAYAR CICIL ({selectedItemIds.length})
                            </button>
                        ) : (
                            <div className="grid grid-cols-4 gap-1.5">
                                    {hasPermission('BILLIARD_PAY') && (
                                        (() => {
                                            const baseTotal = Math.max(Number(table.grandTotal || 0), currentTotal);
                                            const paid = Number(table.activeTransaction?.paidAmount || 0);
                                            const unpaid = Math.max(0, baseTotal - paid);

                                            if (unpaid <= 1 && (table.activeTransaction?.paidAmount ?? 0) > 0) {
                                                return (
                                                    <button
                                                        onClick={() => onBilling(table.id)}
                                                        className="col-span-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-[10px] active:scale-[0.97] transition-all flex items-center justify-center gap-1.5 animate-pulse"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        <span className="truncate">LUNAS</span>
                                                    </button>
                                                );
                                            }

                                            return (
                                                <button
                                                    onClick={() => onBilling(table.id)}
                                                    className="col-span-2 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl font-bold text-[10px] active:scale-[0.97] transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    <CreditCard className="w-3.5 h-3.5" />
                                                    BAYAR
                                                </button>
                                            );
                                        })()
                                    )}
                                    {hasPermission('BILLIARD_EXTEND') && (
                                        <button
                                            onClick={() => onExtend(table.id)}
                                            className="bg-white/10 hover:bg-white/15 text-white/80 border border-white/10 py-2.5 rounded-xl font-bold text-[10px] active:scale-[0.97] transition-all flex items-center justify-center"
                                            title="Tambah Waktu"
                                        >
                                            <Clock className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    {hasPermission('BILLIARD_PREVIEW') && (
                                        <button
                                            onClick={() => setIsPreviewOpen(true)}
                                            className="bg-white/10 hover:bg-white/15 text-white/60 border border-white/10 py-2.5 rounded-xl flex items-center justify-center transition-all active:scale-[0.97]"
                                            title="Lihat Nota"
                                        >
                                            <Receipt className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── In Use / Warning: Full action bar ── */
                    <div className="space-y-1.5">
                        {selectedItemIds.length > 0 ? (
                            <button
                                onClick={() => {
                                    router.push(`/billing?tableId=${table.id}&type=billiard&selectedItems=${selectedItemIds.join(',')}`);
                                }}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl font-bold text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <CreditCard className="w-3.5 h-3.5" />
                                BAYAR CICIL ({selectedItemIds.length})
                            </button>
                        ) : (
                            <button
                                onClick={() => onExtend(table.id)}
                                className={`w-full py-2.5 rounded-xl font-bold text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${table.status === TableStatus.WARNING
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                                    : isDark
                                        ? 'bg-white/[0.08] hover:bg-white/[0.12] text-white/80 border border-white/[0.08]'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                                    }`}
                            >
                                <Clock className="w-3.5 h-3.5" />
                                TAMBAH WAKTU
                            </button>
                        )}
                        {/* Action icon row */}
                        {/* Action icon row: Compact 6-column Grid */}
                        <div className="grid grid-cols-6 gap-1">
                            {hasPermission('BILLIARD_STOP') && (
                                <button
                                    onClick={() => onStopSession(table.id)}
                                    className={`py-2 rounded-xl flex items-center justify-center transition-all active:scale-[0.95] ${isDark
                                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10'
                                        : 'bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-100'
                                        }`}
                                    title="Stop Sesi"
                                >
                                    <Square className="w-3.5 h-3.5 fill-current" />
                                </button>
                            )}
                            {hasPermission('BILLIARD_ORDER') && (
                                <button
                                    onClick={() => onOrder(table.id)}
                                    className={`py-2 rounded-xl flex items-center justify-center transition-all active:scale-[0.95] ${isDark
                                        ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/10'
                                        : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100'
                                        }`}
                                    title="Pesan Menu"
                                >
                                    <Utensils className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {hasPermission('BILLIARD_MOVE') && (
                                <button
                                    onClick={() => onMove && onMove(table.id)}
                                    className={`py-2 rounded-xl flex items-center justify-center transition-all active:scale-[0.95] ${isDark
                                        ? 'bg-white/[0.05] hover:bg-white/[0.10] text-white/30 border border-white/[0.06]'
                                        : 'bg-slate-50 hover:bg-slate-100 text-slate-400 border border-slate-100'
                                        }`}
                                    title="Pindah Meja"
                                >
                                    <ArrowLeftRight className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {hasPermission('BILLIARD_PREVIEW') && (
                                <button
                                    onClick={() => setIsPreviewOpen(true)}
                                    className={`py-2 rounded-xl flex items-center justify-center transition-all active:scale-[0.95] ${isDark
                                        ? 'bg-white/[0.05] hover:bg-white/[0.10] text-white/40 border border-white/[0.06]'
                                        : 'bg-slate-50 hover:bg-slate-100 text-slate-400 border border-slate-100'
                                        }`}
                                    title="Lihat Nota"
                                >
                                    <Receipt className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {hasPermission('BILLIARD_LIGHT') && (
                                <button
                                    onClick={() => onToggleLight(table.id, !table.isLightOn)}
                                    className={`py-2 rounded-xl flex items-center justify-center transition-all active:scale-[0.95] border ${table.isLightOn
                                        ? isDark ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/15' : 'bg-yellow-50 text-yellow-500 border-yellow-100'
                                        : isDark ? 'bg-white/[0.05] text-white/30 border-white/[0.06]' : 'bg-white text-slate-300 border-slate-200'
                                        }`}
                                    title="Lampu"
                                >
                                    <Lightbulb className={`w-3.5 h-3.5 ${table.isLightOn ? 'fill-current' : ''}`} />
                                </button>
                            )}
                            {hasPermission('ADMIN_RESET') && (
                                <button
                                    onClick={() => onForceReset && onForceReset(table.id)}
                                    className={`py-2 rounded-xl flex items-center justify-center transition-all active:scale-[0.95] ${isDark
                                        ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/20'
                                        : 'bg-rose-100 hover:bg-rose-200 text-rose-600 border border-rose-200'
                                        }`}
                                    title="Force Reset (Admin)"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Offline Mask Removed — v17.7 cleanup ─── */}

            <TableInvoicePreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                tableId={table.id}
                tableName={table.tableName}
                initialData={table.activeTransaction}
            />

            <TableOrderDetailsModal
                isOpen={isDetailsOpen && hasOrders}
                onClose={() => setIsDetailsOpen(false)}
                tableName={table.tableName}
                orderItems={table.activeTransaction?.orderItems || []}
                selectedItemIds={selectedItemIds}
                onToggleItem={(itemId: number) => {
                    setSelectedItemIds(prev =>
                        prev.includes(itemId)
                            ? prev.filter(id => id !== itemId)
                            : [...prev, itemId]
                    );
                }}
                onCancelItem={onCancelItem}
                hasCancelPermission={hasPermission('BILLIARD_CANCEL_ITEM')}
            />
        </div >
    );
};

export default React.memo(TableCard);
