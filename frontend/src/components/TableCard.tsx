'use client';

import React, { useState, useEffect } from 'react';
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
    ChevronRight
} from 'lucide-react';
import TableInvoicePreviewModal from './TableInvoicePreviewModal'; // Added import
import TableOrderDetailsModal from './TableOrderDetailsModal';
import { useAuth } from '@/context/AuthContext';

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
}

const statusConfig = {
    [TableStatus.AVAILABLE]: { color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Available' },
    [TableStatus.IN_USE]: { color: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50', label: 'In Use' },
    [TableStatus.WARNING]: { color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', label: 'Ending Soon' },
    [TableStatus.WAITING_PAYMENT]: { color: 'bg-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Billing' },
    [TableStatus.MAINTENANCE]: { color: 'bg-slate-500', text: 'text-slate-600', bg: 'bg-slate-50', label: 'Maint.' },
};

const TableCard: React.FC<TableProps> = ({ table, onToggleLight, onStartSession, onStopSession, onBilling, onExtend, onMove, onOrder, onCancelItem }) => {
    const { hasPermission } = useAuth();
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

    const statusStyle = statusConfig[table.status] || statusConfig[TableStatus.MAINTENANCE];
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

    // Premium Color Logic
    const tierColors: Record<string, string> = {
        'PLATINUM': 'from-slate-900 via-indigo-950 to-slate-900 border-indigo-400/50 shadow-indigo-500/20',
        'GOLD': 'from-amber-900 via-yellow-900 to-amber-900 border-amber-400/50 shadow-amber-500/20',
        'SILVER': 'from-slate-400 via-slate-200 to-slate-400 border-slate-300 shadow-slate-300/20',
    };
    const activeTierStyle = tierColors[tierName] || 'from-indigo-600 via-indigo-500 to-indigo-600 border-indigo-400 shadow-indigo-500/20';

    if (table.status === TableStatus.MAINTENANCE) {
        return (
            <div className="relative group bg-slate-50/50 rounded-xl overflow-hidden border border-slate-200 h-full min-h-[160px] flex flex-col items-center justify-center">
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%, transparent 50%, #000 50%, #000 75%, transparent 75%, transparent)',
                        backgroundSize: '10px 10px'
                    }}
                ></div>
                <div className="z-10 text-center p-4 grayscale opacity-60">
                    <Wrench className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-600 mb-1">{table.tableName}</h3>
                    <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-500 uppercase tracking-wider">
                        Maintenance
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative group rounded-xl transition-all duration-500 overflow-hidden border ${isMember && (table.status === TableStatus.IN_USE || table.status === TableStatus.WARNING)
            ? `bg-gradient-to-br ${activeTierStyle} border-2 shadow-2xl scale-[1.02] z-10`
            : `${table.status === TableStatus.IN_USE ? 'bg-white shadow-lg shadow-indigo-100/40 border-indigo-200' :
                table.status === TableStatus.WARNING ? 'bg-white shadow-lg shadow-amber-100/40 border-amber-200' :
                    table.status === TableStatus.WAITING_PAYMENT ? 'bg-white shadow-lg shadow-indigo-100/40 border-indigo-200' :
                        'bg-white shadow-sm hover:shadow-md border-slate-200'
            }`
            } ${isOffline ? 'opacity-70 grayscale' : ''} flex flex-col h-full`}>

            {/* Premium Animated Glow for Members */}
            {isMember && table.status === TableStatus.IN_USE && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
            )}

            {/* Header: Compact Name & Status */}
            <div className={`px-3 py-2.5 flex justify-between items-center border-b border-slate-50 ${table.status === TableStatus.WARNING ? (parseInt(timeLeft.split(':')[0] || '0') === 0 && parseInt(timeLeft.split(':')[1] || '0') < 5 ? 'bg-rose-50' : 'bg-amber-50') : table.status === TableStatus.WAITING_PAYMENT ? 'bg-indigo-50/50' : 'bg-slate-50/30'}`}>
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isMember && (table.status === TableStatus.IN_USE || table.status === TableStatus.WARNING) ? 'bg-white animate-ping' :
                        table.status === TableStatus.WARNING ? (parseInt(timeLeft.split(':')[0] || '0') === 0 && parseInt(timeLeft.split(':')[1] || '0') < 5 ? 'bg-rose-500 animate-pulse' : 'bg-amber-500 animate-pulse') :
                            table.status === TableStatus.WAITING_PAYMENT ? 'bg-indigo-500 animate-pulse' : statusStyle.color
                        }`}></div>
                    <span className={`text-sm font-black truncate ${isMember && (table.status === TableStatus.IN_USE || table.status === TableStatus.WARNING) ? 'text-white' : 'text-slate-700'}`}>{table.tableName}</span>
                    {isMember && (table.status === TableStatus.IN_USE || table.status === TableStatus.WARNING || table.status === TableStatus.WAITING_PAYMENT) && (
                        <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[8px] font-black border border-white/30 animate-pulse shrink-0 tracking-widest">
                            <CreditCard className="w-2.5 h-2.5" />
                            {tierName}
                        </div>
                    )}
                    {table.isBooked && (
                        <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[8px] font-black border border-amber-200 animate-pulse ml-1 shrink-0">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            WAITING: {table.bookedByName}
                        </div>
                    )}
                </div>
                <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 ${table.status === TableStatus.WARNING ? (parseInt(timeLeft.split(':')[0] || '0') === 0 && parseInt(timeLeft.split(':')[1] || '0') < 5 ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white') : table.status === TableStatus.WAITING_PAYMENT ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100' : statusStyle.bg + ' ' + statusStyle.text}`}>
                    {table.status === TableStatus.WARNING ? (parseInt(timeLeft.split(':')[0] || '0') === 0 && parseInt(timeLeft.split(':')[1] || '0') < 5 ? 'URGENT' : 'ENDING SOON') : table.status === TableStatus.WAITING_PAYMENT ? 'SIAP BAYAR (BILLING)' : statusStyle.label}
                </div>
            </div>

            {/* Sub-Header: Secondary Status Alerts */}
            {(balanceState !== 'NORMAL' || table.status === TableStatus.WAITING_PAYMENT) && (
                <div className="px-3 py-1 flex flex-wrap gap-2 border-b border-slate-50 bg-white/10 backdrop-blur-sm">
                    {balanceState === 'URGENT' && (
                        <div className="bg-rose-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 text-[8px] font-black animate-pulse shadow-sm ring-1 ring-white/20">
                            <AlertCircle className="w-2.5 h-2.5" />
                            SALDO KRITIS
                        </div>
                    )}
                    {balanceState === 'LOW' && (
                        <div className="bg-amber-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 text-[8px] font-black shadow-sm ring-1 ring-white/20">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            SALDO TIPIS
                        </div>
                    )}
                    {table.status === TableStatus.WAITING_PAYMENT && isMember && effectiveBalance <= 5000 && (
                        <div className="bg-rose-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 text-[8px] font-black shadow-sm ring-1 ring-white/20">
                            <XCircle className="w-2.5 h-2.5" />
                            SALDO STANDBY HABIS
                        </div>
                    )}
                </div>
            )}

            {/* Body: High Density Stats */}
            <div className="p-3 flex-1 flex flex-col gap-2">
                {table.status === TableStatus.AVAILABLE ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-4 text-slate-300">
                        <Play className="w-8 h-8 mb-1 opacity-50" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Ready</span>
                    </div>
                ) : (
                    <>
                        {/* Customer Row */}
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black border shrink-0 ${isMember ? 'bg-white text-indigo-600 border-white' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                {(table.activeTransaction?.customerName || 'T').charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1 leading-tight">
                                <p className={`text-sm font-black truncate ${isMember ? 'text-white drop-shadow-sm' : 'text-slate-700'}`}>{table.activeTransaction?.customerName || 'Tamu'}</p>
                                {isMember && <p className="text-[8px] font-black text-indigo-200 uppercase tracking-[0.2em] leading-none mb-1">PREMIUM {tierName}</p>}
                                <div className="text-[9px] text-slate-400 line-clamp-2 leading-tight">
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
                                            const durationStr = `[${h}h:${m}m]`;

                                            return (
                                                <span key={i}>
                                                    {i > 0 && " + "}
                                                    <span className={`font-bold ${isMember ? 'text-indigo-100' : 'text-slate-500'}`}>{b.name || b.title || b.slot || 'Sesi'}</span>
                                                    <span className="ml-0.5 opacity-70">({durationStr})</span>
                                                </span>
                                            );
                                        })
                                    ) : (
                                        <span>{table.activeTransaction?.fareName || '-'}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className={`p-2 rounded-lg border ${isMember && (table.status === TableStatus.IN_USE || table.status === TableStatus.WARNING) ? 'bg-black/20 border-white/10' : table.status === TableStatus.WARNING ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                                <p className={`text-[9px] font-bold uppercase mb-0.5 flex items-center gap-1 ${isMember && (table.status === TableStatus.IN_USE || table.status === TableStatus.WARNING) ? 'text-white/60' : 'text-slate-400'}`}>
                                    <Timer className="w-3 h-3" /> Durasi
                                </p>
                                <p className={`text-base font-black tabular-nums tracking-tight leading-none ${isMember && (table.status === TableStatus.IN_USE || table.status === TableStatus.WARNING) ? 'text-white' : table.status === TableStatus.WARNING ? 'text-amber-600' : 'text-slate-700'}`}>
                                    {timeLeft}
                                </p>
                            </div>
                            <div className={`p-2 rounded-lg border ${isMember && (table.status === TableStatus.IN_USE || table.status === TableStatus.WARNING) ? 'bg-white/10 border-white/10' : 'bg-indigo-50/50 border-indigo-100'}`}>
                                <p className={`text-[9px] font-bold uppercase mb-0.5 flex items-center gap-1 ${isMember && (table.status === TableStatus.IN_USE || table.status === TableStatus.WARNING) ? 'text-white/60' : 'text-indigo-400'}`}>
                                    <CreditCard className="w-3 h-3" /> Tagihan
                                </p>
                                <p className={`text-base font-black tabular-nums tracking-tight leading-none ${isMember && (table.status === TableStatus.IN_USE || table.status === TableStatus.WARNING) ? 'text-white' : 'text-indigo-900'}`}>
                                    {(() => {
                                        const baseTotal = Math.max(Number(table.grandTotal || 0), currentTotal);
                                        const paid = Number(table.activeTransaction?.paidAmount || 0);
                                        const remaining = Math.max(0, baseTotal - paid);
                                        return isNaN(remaining) ? '0' : remaining.toLocaleString();
                                    })()}
                                </p>
                            </div>
                        </div>

                        {/* Orders (Conditional) */}
                        {hasOrders && (
                            <button
                                onClick={() => setIsDetailsOpen(true)}
                                className="mt-1 w-full flex items-center justify-between p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors group/order"
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <Utensils className="w-3 h-3 text-amber-500 shrink-0" />
                                    <span className="text-[10px] font-bold text-slate-600 truncate">{orderCount} Menu</span>
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
                                                    <span className={`text-[8px] font-black px-1 py-0.5 rounded border shrink-0 ${kdsStatus === 'READY' ? 'text-emerald-500 bg-emerald-50 border-emerald-100 animate-pulse' : 'text-slate-400 bg-slate-50 border-slate-100'}`}>
                                                        KDS: {kdsStatus}
                                                    </span>
                                                )}
                                                {bdsStatus && (
                                                    <span className={`text-[8px] font-black px-1 py-0.5 rounded border shrink-0 ${bdsStatus === 'READY' ? 'text-emerald-500 bg-emerald-50 border-emerald-100 animate-pulse' : 'text-slate-400 bg-slate-50 border-slate-100'}`}>
                                                        BDS: {bdsStatus}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                            </button>
                        )}

                    </>
                )}
            </div>

            {/* Action Bar: Compact Bottom Row */}
            <div className="p-2 pt-0 grid grid-cols-4 gap-1.5 mt-auto">
                {table.status === TableStatus.AVAILABLE ? (
                    hasPermission('BILLIARD_START') && (
                        <button
                            onClick={() => onStartSession(table.id)}
                            className="col-span-4 bg-slate-800 hover:bg-indigo-600 text-white py-2 rounded-lg font-bold text-xs shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                        >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            MULAI
                        </button>
                    )
                ) : table.status === TableStatus.WAITING_PAYMENT ? (
                    <div className="col-span-4 grid grid-cols-4 gap-1.5">
                        {selectedItemIds.length > 0 ? (
                            <button
                                onClick={() => {
                                    // Navigate to billing with selected items
                                    window.location.href = `/billing?tableId=${table.id}&type=billiard&selectedItems=${selectedItemIds.join(',')}`;
                                }}
                                className="col-span-4 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg font-bold text-xs shadow-sm shadow-amber-200 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 animate-bounce-subtle"
                            >
                                <CreditCard className="w-3.5 h-3.5" />
                                BAYAR CICIL ({selectedItemIds.length})
                            </button>
                        ) : hasPermission('BILLIARD_PAY') && (
                            (() => {
                                const baseTotal = Math.max(Number(table.grandTotal || 0), currentTotal);
                                const paid = Number(table.activeTransaction?.paidAmount || 0);
                                const unpaid = Math.max(0, baseTotal - paid);

                                if (unpaid === 0 && (table.activeTransaction?.paidAmount ?? 0) > 0) {
                                    return (
                                        <button
                                            onClick={() => onBilling(table.id)}
                                            className="col-span-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg font-bold text-xs shadow-sm shadow-emerald-200 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 animate-pulse"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            SELESAIKAN (LUNAS WALLET)
                                        </button>
                                    );
                                }

                                return (
                                    <button
                                        onClick={() => onBilling(table.id)}
                                        className="col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold text-xs shadow-sm shadow-indigo-200 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 animate-pulse"
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
                                className="bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-lg font-bold text-xs shadow-sm shadow-rose-200 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                                title="Tambah Waktu"
                            >
                                <Clock className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {hasPermission('BILLIARD_PREVIEW') && (
                            <button
                                onClick={() => setIsPreviewOpen(true)}
                                className="bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 border border-slate-200 hover:border-indigo-200 rounded-lg py-2 flex items-center justify-center transition-all active:scale-95"
                                title="Lihat Nota"
                            >
                                <Receipt className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {selectedItemIds.length > 0 ? (
                            <button
                                onClick={() => {
                                    window.location.href = `/billing?tableId=${table.id}&type=billiard&selectedItems=${selectedItemIds.join(',')}`;
                                }}
                                className="col-span-4 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg font-bold text-xs shadow-sm shadow-amber-200 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 animate-bounce-subtle mb-1"
                            >
                                <CreditCard className="w-3.5 h-3.5" />
                                BAYAR CICIL ({selectedItemIds.length})
                            </button>
                        ) : (
                            <button
                                onClick={() => onExtend(table.id)}
                                className={`col-span-4 py-2 rounded-lg font-bold text-xs shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 mb-1 ${table.status === TableStatus.WARNING
                                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-100 animate-pulse'
                                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100'
                                    }`}
                            >
                                <Clock className="w-3.5 h-3.5" />
                                TAMBAH WAKTU
                            </button>
                        )}
                        <div className="col-span-4 grid grid-cols-5 gap-1.5">
                            {hasPermission('BILLIARD_STOP') && (
                                <button
                                    onClick={() => onStopSession(table.id)}
                                    className="bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 border border-rose-100 hover:border-rose-500 rounded-lg py-2 flex items-center justify-center transition-all active:scale-95"
                                    title="Stop Sesi"
                                >
                                    <Square className="w-4 h-4 fill-current" />
                                </button>
                            )}
                            {hasPermission('BILLIARD_ORDER') && (
                                <button
                                    onClick={() => onOrder(table.id)}
                                    className="bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100 rounded-lg py-2 flex items-center justify-center transition-all active:scale-95"
                                    title="Pesan Menu (Cafe)"
                                >
                                    <Utensils className="w-4 h-4" />
                                </button>
                            )}
                            {hasPermission('BILLIARD_PREVIEW') && (
                                <button
                                    onClick={() => setIsPreviewOpen(true)}
                                    className="bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 border border-slate-200 hover:border-indigo-200 rounded-lg py-2 flex items-center justify-center transition-all active:scale-95"
                                    title="Lihat Nota"
                                >
                                    <Receipt className="w-4 h-4" />
                                </button>
                            )}
                            {hasPermission('BILLIARD_LIGHT') && (
                                <button
                                    onClick={() => onToggleLight(table.id, !table.isLightOn)}
                                    className={`rounded-lg py-2 flex items-center justify-center transition-all active:scale-95 border ${table.isLightOn
                                        ? 'bg-yellow-50 text-yellow-500 border-yellow-100'
                                        : 'bg-white text-slate-300 border-slate-200 hover:bg-slate-50'}`}
                                    title="Lampu"
                                >
                                    <Lightbulb className={`w-4 h-4 ${table.isLightOn ? 'fill-current' : ''}`} />
                                </button>
                            )}
                            {hasPermission('BILLIARD_MOVE') && (
                                <button
                                    onClick={() => onMove && onMove(table.id)}
                                    className="bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 border border-slate-200 hover:border-indigo-200 rounded-lg py-2 flex items-center justify-center transition-all active:scale-95"
                                    title="Pindah Meja"
                                >
                                    <ArrowLeftRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Offline Overlay */}
            {
                isOffline && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center">
                        <Power className="w-8 h-8 text-rose-500 mb-1 animate-pulse" />
                        <span className="font-black text-rose-600 text-[10px] uppercase tracking-widest">OFFLINE</span>
                    </div>
                )
            }

            <TableInvoicePreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                tableId={table.id}
                tableName={table.tableName}
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
