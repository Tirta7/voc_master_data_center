'use client';

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import TableCard, { TableStatus } from '@/components/TableCard';
import StartSessionModal from '@/components/StartSessionModal';
import ExtendSessionModal from '@/components/ExtendSessionModal';
import MoveTableModal from '@/components/MoveTableModal';
import CafeOrderModal from '@/components/CafeOrderModal';
import CancellationRequestModal from '@/components/CancellationRequestModal';
import WaitingListSidebar from '@/components/WaitingListSidebar';
import { generateIdempotencyKey } from '@/utils/transactionUtils';
import { useAlert } from '@/components/ui/AlertProvider';
import NetworkMonitor from '@/components/NetworkMonitor';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { useMqtt } from '@/context/MqttContext';
import { useRealtimeData } from '@/context/RealtimeDataContext';
import { Users, Bell } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import AIBattlePlanWidget from '@/components/AIBattlePlanWidget';
import { AIBroadcastOverlay } from '@/components/AIBroadcastOverlay';
import { MessageSquare, AlertOctagon, RefreshCw } from 'lucide-react';
import ChatWindow from '@/components/ChatWindow';
import { socket } from '@/lib/socket';


export default function Dashboard() {
  const { user, activeShift, hasPermission, refetchShift } = useAuth();
  const { subscribe } = useMqtt();
  // ── Global real-time data from MQTT-driven context (no local fetch needed) ──
  const {
    billiardTables,
    waitingList,
    loadingBilliard,
    refetchBilliard,
    settings: globalSettings,
    optimisticUpdateTable,
  } = useRealtimeData();

  const tables = billiardTables;
  const loading = loadingBilliard;

  const { showToast } = useToast();
  const router = useRouter();
  const { showConfirm, showAlert } = useAlert();
  const { t } = useLanguage();

  // ── Modal / UI state (page-local, not needed in context) ──────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extendTableId, setExtendTableId] = useState<number | null>(null);
  const [extendTableCategory, setExtendTableCategory] = useState<string | undefined>(undefined);
  const [extendTableStationType, setExtendTableStationType] = useState<'BILLIARD' | 'PLAYSTATION' | undefined>(undefined);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveFromTableId, setMoveFromTableId] = useState<number | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderTableId, setOrderTableId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isWaitingListOpen, setIsWaitingListOpen] = useState(false);
  const [cancellationModalOpen, setCancellationModalOpen] = useState(false);
  const [itemToCancel, setItemToCancel] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSeenId, setLastSeenId] = useState<number>(0);

  // Waiting list alert UI state
  const [alertType, setAlertType] = useState<'NONE' | 'RED' | 'YELLOW'>('NONE');
  const [newestCustomerName, setNewestCustomerName] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [activeAdmin, setActiveAdmin] = useState<{ id: number, name: string } | null>(null);

  // Settings from context (sidebar already fetches settings; we use global one here)
  const settings = globalSettings;

  // tablesRef: used only for window.openExtendModal (prevents stale closure)
  const tablesRef = useRef<any[]>([]);
  useEffect(() => { tablesRef.current = tables; }, [tables]);

  // window.openExtendModal — called from TableCard timer popups
  useEffect(() => {
    (window as any).openExtendModal = (id: number) => {
      const tbl = tablesRef.current.find((t: any) => t.id === id);
      setExtendTableId(id);
      setExtendTableCategory(tbl?.category);
      setExtendTableStationType(tbl?.stationType);
      setIsExtendModalOpen(true);
    };
    return () => { delete (window as any).openExtendModal; };
  }, []);

  // ── Waiting list alert state: subscribe to MQTT updates ───────────────────
  useEffect(() => {
    return subscribe('billiard/waiting-list/update', (data: any) => {
      if (data.action === 'CREATE' || data.action === 'RELEASE') {
        // Trigger check in next useEffect by context update
        if (data.customerName) setNewestCustomerName(data.customerName);
      }
    });
  }, [subscribe]);

  // ── REAL-TIME: Listen for assignment changes via MQTT (backup for socket.io) ─────
  useEffect(() => {
    if (!user) return;
    return subscribe('billiard/assignments/updated', (data: any) => {
      if (data.userId === user.id) {
        console.info('[Page] 🔄 Assignments updated via MQTT, force refetching shift...');
        // Force an immediate shift refetch so waiterAssignments updates
        refetchShift();
      }
    });
  }, [subscribe, user, refetchShift]);

  // Restore alert state from current waiting list on mount
  useEffect(() => {
    const pendingUnhandled = waitingList.filter((e: any) =>
      e.type === 'BILLIARD' && e.status === 'PENDING' && !e.handledById && !e.targetTableId
    );
    
    const pendingAssigned = waitingList.filter((e: any) =>
      e.type === 'BILLIARD' && e.status === 'PENDING' && (!!e.targetTableId || !!e.assignedTableId)
    );
    
    if (pendingUnhandled.length > 0) {
      const maxId = Math.max(...pendingUnhandled.map(e => e.id));
      if (maxId > lastSeenId) {
        setAlertType('RED');
        setNewestCustomerName(pendingUnhandled[pendingUnhandled.length - 1].customerName);
      } else {
        // Even if there are unhandled, they aren't "NEW" anymore. 
        // Show yellow if any assigned, else nothing.
        setAlertType(pendingAssigned.length > 0 ? 'YELLOW' : 'NONE');
      }
    } else if (pendingAssigned.length > 0) {
      setAlertType('YELLOW');
      setNewestCustomerName(null);
    } else {
      setAlertType('NONE');
      setNewestCustomerName(null);
    }
  }, [waitingList, lastSeenId]);

  // --- Real-time Chat Notification Logic ---
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await axios.get(`/chat/unread-count`);
        setUnreadChatCount(res.data.count);
      } catch (err) {
        console.error('Failed to fetch unread count', err);
      }
    };
    fetchUnread();

    const fetchActiveAdmin = async () => {
      try {
        const res = await axios.get(`/chat/active-admin`);
        if (res.data) setActiveAdmin(res.data);
      } catch (err) {
        console.error('Failed to fetch active admin', err);
      }
    };
    if (isChatOpen) fetchActiveAdmin();

    const handleChat = (msg: any) => {
      if (!isChatOpen && msg.senderId !== user?.id) {
        setUnreadChatCount(prev => prev + 1);
        showToast("Pesan Baru", "Ada instruksi baru dari Admin.", "info");
      }
    };

    socket.on('receive_chat', handleChat);
    return () => { socket.off('receive_chat', handleChat); };
  }, [isChatOpen]);

  // ── Derived filtered tables ────────────────────────────────────────────────
  const isRestrictedRole = React.useMemo(() => {
    const role = user?.role?.toUpperCase() || '';
    // Roles that can see EVERYTHING:
    const unrestricted = ['ADMIN', 'OWNER', 'SUPERADMIN', 'MANAGER', 'ADMINISTRATOR', 'CASHIER', 'KASIR'];
    // If it literally matches one of those, it's not restricted
    if (unrestricted.includes(role)) return false;
    // Otherwise, restrict (Waiters, Cashiers, etc)
    return true;
  }, [user]);
  const waiterAssignments = React.useMemo(() => {
    if (!isRestrictedRole) return [];
    // CRITICAL: Only use shift assignments if this shift BELONGS to the current user.
    // A user may receive a "fallback" shift (e.g., Kitchen/Other roles get any open shift).
    // In that case, use the user's own default assignments instead.
    const shiftBelongsToUser = activeShift?.userId === user?.id;
    if (shiftBelongsToUser && activeShift?.assignedTableIds && activeShift.assignedTableIds.length > 0) {
      return activeShift.assignedTableIds;
    }
    return user?.assignedTableIds || [];
  }, [isRestrictedRole, activeShift, user]);

  const filteredTables = React.useMemo(() => {
    const sortedTables = [...tables].sort((a, b) => 
        a.tableName.localeCompare(b.tableName, undefined, { numeric: true, sensitivity: 'base' })
    );

    return sortedTables.filter(table => {
      if (isRestrictedRole) {
        if (waiterAssignments.length > 0) {
          const isAssigned = waiterAssignments.some((t: any) => t.type === 'BILLIARD' && t.id === table.id);
          if (!isAssigned) return false;
        } else {
          return false;
        }
      }
      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'ACTIVE') return table.status === TableStatus.IN_USE || table.status === TableStatus.WARNING || table.status === TableStatus.WAITING_PAYMENT;
      if (filterStatus === 'AVAILABLE') return table.status === TableStatus.AVAILABLE;
      if (filterStatus === 'ISSUE') return table.status === TableStatus.MAINTENANCE || table.isOffline;
      return true;
    });
  }, [tables, isRestrictedRole, waiterAssignments, filterStatus]);

  // ── Scroll Restoration Logic ─────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('billiard_dashboard_scroll', window.scrollY.toString());
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const savedScrollPos = sessionStorage.getItem('billiard_dashboard_scroll');
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
  const handleToggleLight = React.useCallback(async (id: number, isOn: boolean) => {
    // Optimistic Update
    optimisticUpdateTable(id, { isLightOn: isOn });
    try {
      await axios.patch(`/billiard/tables/${id}/toggle-light`, { isOn });
    } catch (error) {
      console.error('Failed to toggle light:', error);
      // Rollback on fail
      optimisticUpdateTable(id, { isLightOn: !isOn });
    }
  }, [optimisticUpdateTable]);

  const openStartModal = React.useCallback((id: number) => {
    const tableObj = tables.find(t => t.id === id);
    if (!tableObj) return;
    setSelectedTable(tableObj);
    setIsModalOpen(true);
  }, [tables]);

  const handleStartSession = async (type: 'prepaid' | 'open', duration?: number, customerName?: string, packageId?: number, customPriceSettings?: any, promoId?: number, memberId?: number, voucherCode?: string) => {
    setIsSubmitting(true);
    setIsModalOpen(false); // Close immediately for instant feedback
    
    // Optimistic UI Update
    optimisticUpdateTable(selectedTable.id, {
      status: 'in_use' as any,
      activeTransaction: { customerName } as any
    });

    const idempotencyKey = generateIdempotencyKey('start_session', user?.id);
    try {
      await axios.post(`/billiard/tables/${selectedTable.id}/start`, {
        type, duration, customerName, packageId, customPriceSettings, promoId, memberId, userId: user?.id, idempotencyKey,
        voucherCode: voucherCode || undefined,
      });
      refetchBilliard(); // Refetch from context after action
    } catch (error: any) {
      console.error('Failed to start session:', error);
      setIsModalOpen(true); // Re-open on fail to allow retry
      showAlert('Gagal', error.response?.data?.message || 'Gagal memulai sesi. Silakan coba lagi.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveTable = async (toTableId: number) => {
    if (!moveFromTableId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await axios.post(`/billiard/move`, {
        fromTableId: moveFromTableId, toTableId, userId: user?.id
      });
      await showAlert('Berhasil', 'Meja berhasil dipindahkan!', { variant: 'success' });
      setIsMoveModalOpen(false);
      refetchBilliard();
    } catch (error) {
      console.error('Move failed:', error);
      showAlert('Gagal', 'Gagal memindahkan meja.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStopSession = React.useCallback(async (id: number) => {
    const isConfirmed = await showConfirm('Konfirmasi Stop Sesi', 'Apakah Anda yakin ingin menyudahi sesi ini? Billing akan diproses.');
    if (isConfirmed) {
      setIsSubmitting(true);
      // Optimistic Update
      optimisticUpdateTable(id, {
        status: 'waiting_payment' as any
      });
      try {
        await axios.post(`/billiard/tables/${id}/stop`, { userId: user?.id });
      } catch (error) {
        console.error('Stop failed:', error);
        showAlert('Gagal', 'Gagal menyudahi sesi.', { variant: 'error' });
        refetchBilliard();
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [showConfirm, user?.id, optimisticUpdateTable, showAlert, refetchBilliard]);

  const handleBilling = React.useCallback((id: number) => {
    router.push(`/billing?tableId=${id}&type=billiard`);
  }, [router]);

  const handleForceReset = React.useCallback(async (id: number) => {
    const managerPin = await showConfirm(
      'Force Reset Meja',
      'Tindakan ini akan menghapus paksa status meja dan mematikan lampu. Gunakan hanya jika sistem stuck. Lanjutkan?',
      { requirePin: true }
    );
    if (managerPin) {
      setIsSubmitting(true);
      try {
        await axios.post(`/billiard/tables/${id}/reset`, { managerPin });
        showToast('Berhasil', 'Meja berhasil di-reset paksa.', 'success');
        refetchBilliard();
      } catch (error: any) {
        console.error('Force reset failed:', error);
        showAlert('Gagal', error.response?.data?.message || 'Gagal mereset meja.', { variant: 'error' });
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [showConfirm, showToast, refetchBilliard, showAlert]);

  const handleEmergencyStop = React.useCallback(async () => {
    const managerPin = await showConfirm(
      '🛑 EMERGENCY STOP',
      'APAKAH ANDA YAKIN INGIN MEMATIKAN SEMUA LAMPU MEJA SEKARANG?\nTindakan ini akan mengirim perintah OFF ke seluruh meja yang sedang aktif.',
      { requirePin: true }
    );
    
    if (managerPin) {
      setIsSubmitting(true);
      try {
        const resp = await axios.post(`/billiard/emergency-stop`, { managerPin });
        if (resp.data.success) {
          showToast('System Halted', resp.data.message, 'warning');
          setTimeout(refetchBilliard, 1500);
        }
      } catch (error: any) {
        console.error('Emergency stop failed:', error);
        showAlert('Gagal', 'Gagal memicu emergency stop.', { variant: 'error' });
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [showConfirm, showToast, refetchBilliard, showAlert]);

  const handleCancelItem = React.useCallback(async (item: any) => {
    const status = item.status?.toUpperCase() || 'PENDING';
    const isProcessing = ['QUEUED', 'PROCESSING', 'COOKING', 'CANCEL_REJECTED'].includes(status);
    setItemToCancel({ id: item.id, name: item.menuItem?.name || item.name || 'Menu', isProcessing });
    setCancellationModalOpen(true);
  }, []);

  const handleConfirmCancellation = async (data: { reason: string; waiterName: string; managerPin?: string }) => {
    if (!itemToCancel || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await axios.patch(`/cafe/order/item/${itemToCancel.id}/cancel`, {
        reason: data.reason, user: data.waiterName, userId: user?.id, managerPin: data.managerPin
      });
      showAlert('Berhasil', 'Permintaan pembatalan dikirim ke KDS.', { variant: 'success' });
      setCancellationModalOpen(false);
      setItemToCancel(null);
      refetchBilliard();
    } catch (error: any) {
      console.error('Cancel request failed:', error);
      showAlert('Gagal', error.response?.data?.message || 'Gagal mengirim permintaan pembatalan.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <nav className="bg-white border-b border-slate-100 px-6 py-4 sticky top-16 lg:top-0 z-30 shadow-sm backdrop-blur-md bg-white/80 lg:pl-6 pl-6 hidden md:block">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-100">
              {(settings?.businessName || 'S').charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight uppercase">{settings?.businessName || 'SPOTON BILLIARD'}</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Hybrid IoT Management</p>
            </div>
          </div>
          <div className="flex gap-6 items-center">
            <NetworkMonitor />
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-6 md:p-8">

        {/* ── Waiter Restricted View Banner ──────────────────────────────── */}
        {isRestrictedRole && (
          waiterAssignments.length === 0 ? (
            // Critical: waiter has NO table assignments at all
            <div className="mb-6 flex items-start gap-4 bg-red-50 border-2 border-red-300 text-red-800 rounded-2xl px-5 py-4 shadow-sm animate-pulse">
              <span className="text-2xl mt-0.5">🚨</span>
              <div>
                <p className="font-black text-sm uppercase tracking-wide">Tidak Ada Meja yang Ditugaskan!</p>
                <p className="text-xs font-medium mt-1 text-red-600">
                  Akun <strong>{user?.name}</strong> ({user?.role}) belum memiliki penugasan meja billiard.
                  Hubungi <strong>Admin / Manajer</strong> untuk mengatur penugasan meja melalui menu <em>Waiter Assignment</em>.
                </p>
              </div>
            </div>
          ) : (
            // Info: waiter sees filtered tables only
            <div className="mb-6 flex items-start gap-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-4 shadow-sm">
              <span className="text-xl mt-0.5">⚠️</span>
              <div className="flex-1">
                <p className="font-black text-sm uppercase tracking-wide">Tampilan Meja Terbatas</p>
                <p className="text-xs font-medium mt-1 text-amber-700">
                  Kamu hanya melihat <strong>{waiterAssignments.filter((t: any) => t.type === 'BILLIARD').length} meja</strong> yang ditugaskan ke akunmu.
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

        <header className="mb-6 md:mb-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5">
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">{t('billiard.title')}</h2>
              <div className="flex items-center gap-2 mt-3">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200/60 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  {t('common.total')}: {tables.length}
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex w-full md:w-auto gap-2 bg-white p-1.5 rounded-[1.25rem] shadow-sm border border-slate-100">
              {hasPermission('ADMIN_RESET') && (
                <button
                  onClick={handleEmergencyStop}
                  disabled={isSubmitting}
                  className="flex items-center justify-center p-3.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-xl transition-all disabled:opacity-50 group shrink-0"
                  title="Emergency Stop"
                >
                  <AlertOctagon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              )}

              <button
                  onClick={() => {
                      setIsChatOpen(prev => !prev);
                      setUnreadChatCount(0);
                  }}
                  className={`flex items-center justify-center p-3.5 rounded-xl transition-all relative shrink-0 ${
                      unreadChatCount > 0 
                      ? 'bg-indigo-50 text-indigo-600' 
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Instruksi Admin"
              >
                  <MessageSquare className="w-5 h-5" />
                  {unreadChatCount > 0 && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                  )}
                  {unreadChatCount > 0 && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
                  )}
              </button>

              {(hasPermission('WAITING_LIST_VIEW') || hasPermission('WAITING_LIST_MANAGE')) && (
                <button
                  onClick={() => {
                    setIsWaitingListOpen(true);
                    const currentMaxId = waitingList.length > 0 ? Math.max(...waitingList.map(e => e.id)) : 0;
                    setLastSeenId(currentMaxId);
                    setNewestCustomerName(null);
                  }}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-black text-xs md:text-sm shadow-sm transition-all relative overflow-hidden shrink-0 ${
                    alertType === 'RED' 
                      ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200' 
                      : alertType === 'YELLOW'
                      ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                  }`}
                >
                  {alertType === 'RED' ? (
                    <Bell className="w-4 h-4 md:w-5 md:h-5 text-rose-200 animate-bounce fill-current shrink-0" />
                  ) : alertType === 'YELLOW' ? (
                    <Bell className="w-4 h-4 md:w-5 md:h-5 text-amber-200 animate-pulse fill-current shrink-0" />
                  ) : (
                    <Users className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                  )}
                  <span className="uppercase tracking-widest truncate max-w-[120px]">
                    {alertType === 'RED' && newestCustomerName ? (
                      <>
                        <span className="opacity-70 font-bold hidden md:inline">BARU: </span>
                        {newestCustomerName}
                      </>
                    ) : alertType === 'YELLOW' ? (
                      'Booking'
                    ) : 'Antrean'}
                  </span>
                  <div className="bg-white/20 text-white px-2 py-0.5 rounded-md text-[11px] shrink-0 ml-1">
                    {waitingList.filter((e: any) => e.type === 'BILLIARD' && e.status === 'PENDING').length}
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mt-5 flex gap-1.5 bg-slate-200/60 p-1.5 rounded-[1.25rem] overflow-x-auto w-full no-scrollbar md:max-w-fit">
            {[
              { id: 'ALL', label: t('common.all') },
              { id: 'ACTIVE', label: t('billiard.occupied') },
              { id: 'AVAILABLE', label: t('billiard.available') },
              { id: 'ISSUE', label: 'Offline' }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setFilterStatus(filter.id)}
                className={`px-5 py-3 flex-1 md:flex-none text-center rounded-xl text-xs font-black transition-all whitespace-nowrap tracking-wide uppercase ${filterStatus === filter.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
          {loading ? (
            [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col h-full min-h-[200px] animate-pulse">
                <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center">
                   <div className="w-16 h-4 bg-slate-100 rounded-lg"></div>
                   <div className="w-10 h-4 bg-slate-50 rounded-lg"></div>
                </div>
                <div className="px-4 py-8 flex-1 flex flex-col items-center justify-center gap-3">
                   <div className="w-16 h-10 bg-slate-50 rounded-xl"></div>
                   <div className="w-12 h-2 bg-slate-50 rounded-full"></div>
                </div>
                <div className="p-3 mt-auto">
                   <div className="w-full h-10 bg-slate-100 rounded-xl"></div>
                </div>
              </div>
            ))
          ) : (
            <>
              {filteredTables.map((table) => (
                hasPermission('BILLIARD_CARD_VIEW') ? (
                  <TableCard
                    key={`${table.id}-${table.activeTransaction?.id || 'empty'}`}
                    table={{ ...table, isLightOn: table.isLightOn ?? false }}
                    onToggleLight={handleToggleLight}
                    onStartSession={openStartModal}
                    onStopSession={handleStopSession}
                    onBilling={handleBilling}
                    onExtend={(id) => {
                      setExtendTableId(id);
                      setExtendTableCategory(table.category);
                      setExtendTableStationType(table.stationType);
                      setIsExtendModalOpen(true);
                    }}
                    onMove={(id) => {
                      setMoveFromTableId(id);
                      setIsMoveModalOpen(true);
                    }}
                    onOrder={(id) => {
                      setOrderTableId(id);
                      setIsOrderModalOpen(true);
                    }}
                    onCancelItem={handleCancelItem}
                    onForceReset={handleForceReset}
                  />
                ) : null
              ))}
              {filteredTables.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <p className="text-slate-400 font-bold text-lg">{t('common.notFound')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <StartSessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStart={handleStartSession}
        table={selectedTable}
      />

      <ExtendSessionModal
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        tableId={extendTableId}
        tableCategory={extendTableCategory}
        stationType={extendTableStationType}
        onExtended={() => refetchBilliard()}
      />

      <MoveTableModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onMove={handleMoveTable}
        tables={filteredTables}
        currentTableId={moveFromTableId || 0}
        isLoading={isSubmitting}
      />

      <CafeOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        tableId={orderTableId || 0}
        tableName={tables.find(t => t.id === orderTableId)?.tableName}
        cafeTransactionId={tables.find(t => t.id === orderTableId)?.currentTransactionId}
        onSuccess={refetchBilliard}
      />

      <CancellationRequestModal
        isOpen={cancellationModalOpen}
        onClose={() => {
          setCancellationModalOpen(false);
          setItemToCancel(null);
        }}
        onSubmit={handleConfirmCancellation}
        itemName={itemToCancel?.name || ''}
        isProcessing={itemToCancel?.isProcessing || false}
        isLoading={isSubmitting}
      />

      <WaitingListSidebar
        isOpen={isWaitingListOpen}
        onClose={() => setIsWaitingListOpen(false)}
        tables={tables}
      />

      {isChatOpen && (
        <ChatWindow 
          receiverId={0}
          receiverName="Group Chat Management"
          onClose={() => setIsChatOpen(false)}
          socket={socket}
        />
      )}
    </div>
  );
}
