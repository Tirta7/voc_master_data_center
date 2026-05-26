'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useRealtimeData } from '@/context/RealtimeDataContext';
import { Plus, Coffee, Utensils, CreditCard, ArrowRightLeft, Power, CheckCircle2, Timer, ChevronDown, ChevronUp, Clock, Loader2, Trash2, AlertCircle, AlertTriangle, Ban, ChevronRight, Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/components/ui/AlertProvider';
import NetworkMonitor from '@/components/NetworkMonitor';
import CafeOrderModal from '@/components/CafeOrderModal';
import TransferToBilliardModal from '@/components/TransferToBilliardModal';
import CancellationRequestModal from '@/components/CancellationRequestModal';
import CafeStartSessionModal from '@/components/CafeStartSessionModal';
import TableOrderDetailsModal from '@/components/TableOrderDetailsModal';
import WaitingListSidebar from '@/components/WaitingListSidebar';
import { useLanguage } from '@/context/LanguageContext';
import AIBattlePlanWidget from '@/components/AIBattlePlanWidget';
import { AIBroadcastOverlay } from '@/components/AIBroadcastOverlay';

// import { API_URL } from '@/utils/urlUtils';

// ─── Cafe Table Card ──────────────────────────────────────────────────────────
function CafeTableCard({ table, onOrder, onTransfer, onStart, onCheckout, onCancelItem, selectedItemIds = [], onToggleItem }: any) {
    const { hasPermission } = useAuth();
    const { t } = useLanguage();
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const isOccupied = table.status === 'occupied';
    const isOffline = !!table.isOffline;
    const isBooked = !!table.isBooked;
    const { grandTotal, currentCustomer, activeTransaction } = table;
    let member = (activeTransaction as any)?.member;
    if (!activeTransaction?.memberId) {
        member = null;
    }
    const isMember = !!member;
    const tierName = member?.tier?.name?.toUpperCase() || 'MEMBER';

    const tierColors: Record<string, string> = {
        'PLATINUM': 'from-slate-900 via-indigo-950 to-slate-900 border-indigo-400/50 shadow-indigo-500/20',
        'GOLD': 'from-amber-900 via-yellow-900 to-amber-900 border-amber-400/50 shadow-amber-500/20',
        'SILVER': 'from-slate-400 via-slate-200 to-slate-400 border-slate-300 shadow-slate-300/20',
    };
    const activeTierStyle = tierColors[tierName] || 'from-indigo-600 via-indigo-500 to-indigo-600 border-indigo-400 shadow-indigo-500/20';

    const allItems = activeTransaction?.orderItems || [];
    const items = allItems.filter((i: any) => i.status?.toUpperCase() !== 'CANCELLED');
    const hasOrders = items.length > 0;
    const orderCount = items.length;

    const kdsItems = items.filter((i: any) => i.station === 'KDS');
    const bdsItems = items.filter((i: any) => i.station === 'BDS');
    const kdsDone = kdsItems.length > 0 && kdsItems.every((i: any) => ['DONE', 'SERVED', 'COMPLETED'].includes(i.status?.toUpperCase()));
    const bdsDone = bdsItems.length > 0 && bdsItems.every((i: any) => ['DONE', 'SERVED', 'COMPLETED'].includes(i.status?.toUpperCase()));
    const allDone = hasOrders && items.every((i: any) => ['DONE', 'SERVED', 'COMPLETED'].includes(i.status?.toUpperCase()));
    const mySelectedItems = selectedItemIds.filter((id: number) => items.some((i: any) => i.id === id));

    return (
        <div className={`relative group rounded-xl transition-all duration-500 overflow-hidden border ${isMember && isOccupied
            ? `bg-gradient-to-br ${activeTierStyle} border-2 shadow-2xl scale-[1.02] z-10`
            : `${isOccupied ? 'bg-white shadow-lg shadow-indigo-100/40 border-indigo-200' : isBooked ? 'bg-amber-100/40 shadow-lg shadow-amber-100/40 border-amber-200' : 'bg-white shadow-sm hover:shadow-md border-slate-200'} h-full flex flex-col`
            } ${isOffline ? 'opacity-70 grayscale' : ''}`}>

            {isMember && isOccupied && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
            )}

            {/* Header */}
            <div className={`px-4 py-3 flex justify-between items-center border-b border-slate-100 ${isBooked && !isOccupied ? 'bg-amber-50/50' : 'bg-slate-50/50'}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isMember && isOccupied ? 'bg-white animate-ping' : isOccupied ? 'bg-indigo-500 animate-pulse' : isBooked ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                    <span className={`text-sm font-black truncate tracking-tight ${isMember && isOccupied ? 'text-white' : 'text-slate-800'}`}>{table.tableName}</span>
                    {isMember && isOccupied && (
                        <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[8px] font-black border border-white/30 shrink-0 tracking-widest uppercase">
                            {tierName}
                        </div>
                    )}
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 border ${isMember && isOccupied ? 'bg-white/10 text-white border-white/20' : isOccupied ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : isBooked ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                    {isOccupied ? t('billiard.occupied') : isBooked ? 'Booked' : t('billiard.available')}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex-1">
                {isBooked && !isOccupied && (
                    <div className="h-full flex flex-col items-center justify-center py-6">
                        <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-3">
                            <Clock className="w-6 h-6 text-amber-500" />
                        </div>
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest text-center">DIBOOKING OLEH:</span>
                        <p className="text-sm font-black text-slate-800 uppercase text-center mt-1">{table.bookedByName}</p>
                    </div>
                )}

                {!isOccupied && !isBooked && (
                    <div className="h-full flex flex-col items-center justify-center py-6">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                            <Coffee className="w-6 h-6 text-slate-200" />
                        </div>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Ready for Guest</span>
                    </div>
                )}

                {isOccupied && (
                    <>
                        <div className={`flex items-center gap-3 mb-4 p-2.5 rounded-xl border ${isMember ? 'bg-white/10 border-white/20' : 'bg-indigo-50/30 border-indigo-100/50'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-md uppercase ${isMember ? 'bg-white text-indigo-600 shadow-indigo-500/20' : 'bg-indigo-600 text-white shadow-indigo-100'}`}>
                                {(currentCustomer || 'G').charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 leading-none ${isMember ? 'text-indigo-100' : 'text-indigo-400'}`}>Customer</p>
                                <p className={`text-sm font-black truncate leading-none uppercase ${isMember ? 'text-white' : 'text-slate-800'}`}>{currentCustomer || 'UMUM'}</p>
                                {isMember && <p className="text-[8px] font-black text-indigo-200 uppercase tracking-[0.2em] leading-none mt-1">PREMIUM {tierName}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-1">
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1">
                                    <CreditCard className="w-3 h-3" /> Sisa Tagihan
                                </p>
                                <p className="text-lg font-black text-indigo-900 tabular-nums tracking-tight leading-none">
                                    Rp {(() => {
                                        const paid = Number(activeTransaction?.paidAmount || 0);
                                        const remaining = Math.max(0, Number(grandTotal || 0) - paid);
                                        return remaining.toLocaleString();
                                    })()}
                                </p>
                            </div>
                            {hasOrders && (
                                <div className="text-right">
                                    <p className="text-[9px] font-bold text-indigo-400 uppercase mb-0.5">Orders</p>
                                    <p className="text-base font-black text-slate-700 leading-none">{orderCount}</p>
                                </div>
                            )}
                        </div>

                        {hasOrders && (
                            <div className="mt-1 flex flex-col gap-1">
                                <button
                                    onClick={() => setIsDetailsOpen(true)}
                                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors group/order"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Utensils className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                        <span className="text-[10px] font-bold text-slate-600 truncate">PREPARATION</span>
                                        {allDone ? (
                                            <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1 uppercase ml-1 shrink-0">
                                                <CheckCircle2 className="w-2.5 h-2.5" /> READY
                                            </span>
                                        ) : (
                                            <div className="flex gap-1 ml-1 overflow-hidden">
                                                {kdsItems.length > 0 && (
                                                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded border flex items-center gap-1 uppercase shrink-0 ${kdsDone ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-amber-600 bg-amber-50 border-amber-100'}`}>
                                                        {kdsDone ? <CheckCircle2 className="w-2 h-2" /> : <Timer className="w-2 h-2 animate-pulse" />} KDS
                                                    </span>
                                                )}
                                                {bdsItems.length > 0 && (
                                                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded border flex items-center gap-1 uppercase shrink-0 ${bdsDone ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-amber-600 bg-amber-50 border-amber-100'}`}>
                                                        {bdsDone ? <CheckCircle2 className="w-2 h-2" /> : <Timer className="w-2 h-2 animate-pulse" />} BDS
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover/order:text-amber-500 group-hover/order:translate-x-0.5 transition-all" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <TableOrderDetailsModal
                isOpen={isDetailsOpen && hasOrders}
                onClose={() => setIsDetailsOpen(false)}
                tableName={table.tableName}
                orderItems={items}
                selectedItemIds={selectedItemIds}
                onToggleItem={onToggleItem}
                onCancelItem={onCancelItem}
                hasCancelPermission={hasPermission('CAFE_CANCEL_ITEM')}
            />

            {/* Actions */}
            <div className="p-2 pt-0 gap-1.5 mt-auto">
                {!isOccupied ? (
                    hasPermission('CAFE_START') && (
                        <button
                            onClick={() => onStart(table.id, isBooked ? table.bookedByName : '')}
                            className={`w-full py-2.5 rounded-lg font-bold text-xs shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${isBooked ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-100' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                        >
                            <Plus className="w-4 h-4" />
                            {isBooked ? 'CHECK-IN' : t('cafe.newOrder').toUpperCase()}
                        </button>
                    )
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {hasPermission('CAFE_PAY') && (
                            <button
                                onClick={() => onCheckout(table.id, mySelectedItems)}
                                className={`w-full py-2.5 rounded-lg font-bold text-xs shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${mySelectedItems.length > 0
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                                    }`}
                            >
                                <CreditCard className="w-4 h-4" />
                                {mySelectedItems.length > 0 ? `${t('cafe.payNow')} (${mySelectedItems.length})` : `${t('cafe.payNow')} / CHECKOUT`}
                            </button>
                        )}
                        <div className="grid grid-cols-2 gap-1.5">
                            {hasPermission('CAFE_ORDER') && (
                                <button
                                    onClick={() => onOrder(table.id)}
                                    className="bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100 rounded-lg py-2 flex items-center justify-center transition-all active:scale-95 text-[10px] font-bold gap-1"
                                >
                                    <Utensils className="w-3.5 h-3.5" /> ORDER
                                </button>
                            )}
                            {hasPermission('CAFE_TRANSFER') && (
                                <button
                                    onClick={() => onTransfer(table.id)}
                                    className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg py-2 flex items-center justify-center transition-all active:scale-95 text-[10px] font-bold gap-1"
                                >
                                    <ArrowRightLeft className="w-3.5 h-3.5" /> PINDAH
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {isOffline && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center">
                    <Power className="w-8 h-8 text-rose-500 mb-1 animate-pulse" />
                    <span className="font-black text-rose-600 text-[10px] uppercase tracking-widest">OFFLINE</span>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CafeDashboardPage() {
    const router = useRouter();
    const { showAlert } = useAlert();
    const { user, activeShift, hasPermission } = useAuth();
    const { t } = useLanguage();

    // ── Global real-time data (no local fetch needed) ─────────────────────────
    const {
        cafeTables,
        waitingList,
        loadingCafe,
        refetchCafe,
        billiardTables,
        settings,
    } = useRealtimeData();

    const tables = cafeTables;
    const loading = loadingCafe;
    const entries = waitingList.filter((e: any) => e.type === 'CAFE');

    const [alertType, setAlertType] = useState<'NONE' | 'RED' | 'YELLOW'>('NONE');
    const [newestCustomerName, setNewestCustomerName] = useState<string | null>(null);
    const [lastSeenId, setLastSeenId] = useState<number>(0);

    useEffect(() => {
        const pendingUnhandled = entries.filter((e: any) =>
            e.status === 'PENDING' && !e.handledById && !e.targetTableId
        );
        const pendingAssigned = entries.filter((e: any) =>
            e.status === 'PENDING' && (!!e.targetTableId || !!e.assignedTableId)
        );

        if (pendingUnhandled.length > 0) {
            const maxId = Math.max(...pendingUnhandled.map(e => e.id));
            if (maxId > lastSeenId) {
                setAlertType('RED');
                setNewestCustomerName(pendingUnhandled[pendingUnhandled.length - 1].customerName);
            } else {
                setAlertType(pendingAssigned.length > 0 ? 'YELLOW' : 'NONE');
            }
        } else if (pendingAssigned.length > 0) {
            setAlertType('YELLOW');
            setNewestCustomerName(null);
        } else {
            setAlertType('NONE');
            setNewestCustomerName(null);
        }
    }, [entries, lastSeenId]);

    // ── Modal / UI states ─────────────────────────────────────────────────────
    const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [orderTableId, setOrderTableId] = useState<number | null>(null);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferSourceId, setTransferSourceId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cancellationModalOpen, setCancellationModalOpen] = useState(false);
    const [cancellationItem, setCancellationItem] = useState<{ id: number; name: string; isProcessing: boolean } | null>(null);
    const [isStartModalOpen, setIsStartModalOpen] = useState(false);
    const [startTableId, setStartTableId] = useState<number | null>(null);
    const [initialCustomerName, setInitialCustomerName] = useState('');
    const [isWaitingListOpen, setIsWaitingListOpen] = useState(false);

    // ── Filtered tables from context ──────────────────────────────────────────
    const isRestrictedRole = React.useMemo(() => {
        const role = user?.role?.toUpperCase() || '';
        // Roles that can see EVERYTHING:
        const unrestricted = ['ADMIN', 'OWNER', 'SUPERADMIN', 'MANAGER', 'ADMINISTRATOR'];
        // If it literally matches one of those, it's not restricted
        if (unrestricted.includes(role)) return false;
        return true;
    }, [user]);
    const waiterAssignments = React.useMemo(() => {
        if (!isRestrictedRole) return [];
        return (activeShift?.assignedTableIds && activeShift.assignedTableIds.length > 0)
            ? activeShift.assignedTableIds : (user?.assignedTableIds || []);
    }, [isRestrictedRole, activeShift, user]);

    const sortedCafeTables = React.useMemo(() => {
        return [...tables].sort((a, b) => 
            a.tableName.localeCompare(b.tableName, undefined, { numeric: true, sensitivity: 'base' })
        );
    }, [tables]);

    const filteredTables = sortedCafeTables.filter((table: any) => {
        if (isRestrictedRole) {
            if (waiterAssignments.length > 0) {
                if (!waiterAssignments.some((t: any) => t.type === 'CAFE' && t.id === table.id)) return false;
            } else return false;
        }
        return true;
    });

    const filteredBilliardTables = React.useMemo(() => {
        return [...billiardTables].sort((a, b) => 
            a.tableName.localeCompare(b.tableName, undefined, { numeric: true, sensitivity: 'base' })
        ).filter((table: any) => {
            if (isRestrictedRole && waiterAssignments.length > 0) {
                return waiterAssignments.some((t: any) => t.type === 'BILLIARD' && t.id === table.id);
            }
            return true;
        });
    }, [billiardTables, isRestrictedRole, waiterAssignments]);

  // ── Scroll Restoration Logic ─────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('cafe_dashboard_scroll', window.scrollY.toString());
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const savedScrollPos = sessionStorage.getItem('cafe_dashboard_scroll');
    if (savedScrollPos && !loading && filteredTables.length > 0) {
      // Small timeout to ensure DOM has settled after loading transitions
      const timer = setTimeout(() => {
        window.scrollTo({
          top: parseInt(savedScrollPos),
          behavior: 'instant'
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading, filteredTables.length]);

    // ── Action handlers ───────────────────────────────────────────────────────
    const handleStart = (id: number, customerName: string = '') => {
        setStartTableId(id);
        setInitialCustomerName(customerName);
        setIsStartModalOpen(true);
    };

    const confirmStart = async (customerName: string, memberId?: number) => {
        if (!startTableId) return;
        try {
            await axios.post(`/cafe-table/${startTableId}/open`, { customerName, memberId });
            const table = tables.find((t: any) => t.id === startTableId);
            if (table && table.isBooked && table.bookedByWaitingId) {
                await axios.patch(`/waiting-list/${table.bookedByWaitingId}/check-in`);
            }
            setIsStartModalOpen(false);
            refetchCafe();
        } catch (error) {
            showAlert('Gagal', 'Gagal membuka meja cafe.', { variant: 'error' });
        }
    };

    const handleCheckout = (id: number, selectedIds: number[] = []) => {
        let url = `/billing?tableId=${id}&type=cafe`;
        if (selectedIds.length > 0) url += `&selectedItems=${selectedIds.join(',')}`;
        router.push(url);
    };

    const handleTransfer = (id: number) => {
        setTransferSourceId(id);
        setIsTransferModalOpen(true);
    };

    const confirmTransfer = async (targetBilliardId: number) => {
        if (!transferSourceId || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await axios.post(`/cafe-table/${transferSourceId}/transfer-to-billiard`, { billiardTableId: targetBilliardId });
            showAlert('Berhasil', 'Order cafe berhasil dipindah ke meja billiard!', { variant: 'success' });
            setIsTransferModalOpen(false);
            refetchCafe();
        } catch (error: any) {
            showAlert('Gagal', error.response?.data?.message || 'Pastikan meja billiard tujuan sudah memiliki sesi aktif.', { variant: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelItem = async (item: any, status: string) => {
        const s = status.toUpperCase();
        const isProcessing = ['QUEUED', 'PROCESSING', 'COOKING', 'CANCEL_REJECTED'].includes(s);
        setCancellationItem({ id: item.id, name: item.menuItem?.name || item.name || 'Menu', isProcessing });
        setCancellationModalOpen(true);
    };

    const handleConfirmCancellation = async (data: { reason: string; waiterName: string; managerPin?: string }) => {
        if (!cancellationItem || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await axios.patch(`/cafe/order/item/${cancellationItem.id}/cancel`, {
                reason: data.reason, user: data.waiterName, managerPin: data.managerPin
            });
            showAlert('Berhasil', cancellationItem.isProcessing ? 'Permintaan pembatalan dikirim ke dapur.' : 'Pesanan berhasil dibatalkan.', { variant: 'success' });
            setCancellationModalOpen(false);
            refetchCafe();
        } catch (error: any) {
            console.error('Cancel request failed:', error);
            showAlert('Gagal', error.response?.data?.message || 'Gagal mengirim permintaan pembatalan.', { variant: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold">Memuat Dashboard Cafe...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            <nav className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/80">
                <div className="max-w-[1600px] mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-100">
                            {(settings?.businessName || 'C').charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight uppercase">{settings?.businessName || 'SPOTON'} CAFE</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cafe Table Management</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {(hasPermission('WAITING_LIST_VIEW') || hasPermission('WAITING_LIST_MANAGE')) && (
                            <button
                                onClick={() => {
                                    setIsWaitingListOpen(true);
                                    const currentMaxId = entries.length > 0 ? Math.max(...entries.map(e => e.id)) : 0;
                                    setLastSeenId(currentMaxId);
                                    setNewestCustomerName(null);
                                }}
                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 border border-indigo-100"
                            >
                                {alertType === 'RED' ? (
                                    <Bell className="w-4 h-4 text-rose-500 animate-bounce fill-rose-500" />
                                ) : alertType === 'YELLOW' ? (
                                    <Bell className="w-4 h-4 text-amber-500 animate-pulse fill-amber-500" />
                                ) : (
                                    <Clock className="w-4 h-4" />
                                )}
                                <span className="uppercase tracking-widest truncate max-w-[120px]">
                                    {alertType === 'RED' && newestCustomerName ? (
                                        <>
                                            <span className="hidden md:inline text-[9px] opacity-70">BARU: </span>
                                            {newestCustomerName}
                                        </>
                                    ) : alertType === 'YELLOW' ? (
                                        'Booking Meja'
                                    ) : 'Antrean Cafe'}
                                </span>
                                <div className="bg-indigo-100 px-1.5 py-0.5 rounded-md text-[10px]">
                                    {entries.filter((e: any) => e.status === 'PENDING').length}
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            <main className="max-w-[1600px] mx-auto p-6 md:p-8">

                {/* ── Waiter Restricted View Banner ──────────────────────────────── */}
                {isRestrictedRole && (
                    waiterAssignments.length === 0 ? (
                        <div className="mb-6 flex items-start gap-4 bg-red-50 border-2 border-red-300 text-red-800 rounded-2xl px-5 py-4 shadow-sm animate-pulse">
                            <span className="text-2xl mt-0.5">🚨</span>
                            <div>
                                <p className="font-black text-sm uppercase tracking-wide">Tidak Ada Meja Cafe yang Ditugaskan!</p>
                                <p className="text-xs font-medium mt-1 text-red-600">
                                    Akun <strong>{user?.name}</strong> ({user?.role}) belum memiliki penugasan meja cafe.
                                    Hubungi <strong>Admin / Manajer</strong> untuk mengatur penugasan meja melalui menu <em>Waiter Assignment</em>.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-6 flex items-start gap-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-4 shadow-sm">
                            <span className="text-xl mt-0.5">⚠️</span>
                            <div className="flex-1">
                                <p className="font-black text-sm uppercase tracking-wide">Tampilan Meja Cafe Terbatas</p>
                                <p className="text-xs font-medium mt-1 text-amber-700">
                                    Kamu hanya melihat <strong>{waiterAssignments.filter((t: any) => t.type === 'CAFE').length} meja cafe</strong> yang ditugaskan ke akunmu.
                                    Jika ada meja yang seharusnya muncul tapi tidak terlihat, minta <strong>Admin / Manajer</strong> untuk mengecek penugasan di menu <em>Waiter Assignment</em>.
                                </p>
                            </div>
                            <span className="text-[10px] font-black bg-amber-200 text-amber-800 px-2 py-1 rounded-lg uppercase tracking-widest whitespace-nowrap">
                                {user?.role}
                            </span>
                        </div>
                    )
                )}
                
                <AIBattlePlanWidget />
            <AIBroadcastOverlay />

                <header className="mb-8">
                    <h2 className="text-3xl font-black text-slate-900 leading-tight">{t('cafe.title')}</h2>
                    <p className="text-slate-500 mt-1 font-medium text-sm">{t('common.total')}: {filteredTables.length}</p>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                    {filteredTables.map((t: any) => (
                        hasPermission('CAFE_CARD_VIEW') ? (
                            <CafeTableCard
                                key={`${t.id}-${t.activeTransaction?.id || 'empty'}`}
                                table={t}
                                onStart={handleStart}
                                onCheckout={handleCheckout}
                                onCancelItem={handleCancelItem}
                                onOrder={(id: number) => {
                                    setOrderTableId(id);
                                    setIsOrderModalOpen(true);
                                }}
                                onTransfer={handleTransfer}
                                selectedItemIds={selectedItemIds}
                                onToggleItem={(itemId: number) => {
                                    setSelectedItemIds(prev =>
                                        prev.includes(itemId)
                                            ? prev.filter(id => id !== itemId)
                                            : [...prev, itemId]
                                    );
                                }}
                            />
                        ) : null
                    ))}
                </div>
            </main>

            <CafeOrderModal
                isOpen={isOrderModalOpen}
                onClose={() => setIsOrderModalOpen(false)}
                tableId={orderTableId || 0}
                tableName={tables.find((t: any) => t.id === orderTableId)?.tableName}
                cafeTransactionId={tables.find((t: any) => t.id === orderTableId)?.currentTransactionId}
                onSuccess={refetchCafe}
            />

            <TransferToBilliardModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                onTransfer={confirmTransfer}
                billiardTables={filteredBilliardTables}
                cafeTable={tables.find((t: any) => t.id === transferSourceId)}
                isLoading={isSubmitting}
            />

            {cancellationItem && (
                <CancellationRequestModal
                    isOpen={cancellationModalOpen}
                    onClose={() => setCancellationModalOpen(false)}
                    onSubmit={handleConfirmCancellation}
                    itemName={cancellationItem.name}
                    isProcessing={cancellationItem.isProcessing}
                    isLoading={isSubmitting}
                />
            )}

            <CafeStartSessionModal
                isOpen={isStartModalOpen}
                onClose={() => setIsStartModalOpen(false)}
                onStart={confirmStart}
                tableName={tables.find((t: any) => t.id === startTableId)?.tableName || ''}
                initialCustomerName={initialCustomerName}
            />

            <WaitingListSidebar
                isOpen={isWaitingListOpen}
                onClose={() => setIsWaitingListOpen(false)}
                tables={tables}
                type="CAFE"
            />
        </div>
    );
}
