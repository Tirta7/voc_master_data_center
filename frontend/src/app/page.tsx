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
import { MessageSquare } from 'lucide-react';
import ChatWindow from '@/components/ChatWindow';
import { socket } from '@/lib/socket';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Dashboard() {
  const { user, activeShift, hasPermission } = useAuth();
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
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/chat/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUnreadChatCount(res.data.count);
      } catch (err) {
        console.error('Failed to fetch unread count', err);
      }
    };
    fetchUnread();

    const fetchActiveAdmin = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/chat/active-admin`, {
          headers: { Authorization: `Bearer ${token}` }
        });
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
    const unrestricted = ['ADMIN', 'OWNER', 'SUPERADMIN', 'MANAGER', 'ADMINISTRATOR'];
    // If it literally matches one of those, it's not restricted
    if (unrestricted.includes(role)) return false;
    // Otherwise, restrict (Waiters, Cashiers, etc)
    return true;
  }, [user]);
  const waiterAssignments = React.useMemo(() => {
    if (!isRestrictedRole) return [];
    return (activeShift?.assignedTableIds && activeShift.assignedTableIds.length > 0)
      ? activeShift.assignedTableIds
      : (user?.assignedTableIds || []);
  }, [isRestrictedRole, activeShift, user]);

  const filteredTables = React.useMemo(() => {
    return tables.filter(table => {
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

  // ── Action handlers ───────────────────────────────────────────────────────
  const handleToggleLight = React.useCallback(async (id: number, isOn: boolean) => {
    // Optimistic Update
    optimisticUpdateTable(id, { isLightOn: isOn });
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/billiard/tables/${id}/toggle-light`, { isOn }, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  const handleStartSession = async (type: 'prepaid' | 'open', duration?: number, customerName?: string, packageId?: number, customPriceSettings?: any, promoId?: number, memberId?: number) => {
    setIsSubmitting(true);
    setIsModalOpen(false); // Close immediately for instant feedback
    
    // Optimistic UI Update
    optimisticUpdateTable(selectedTable.id, {
      status: 'in_use' as any,
      activeTransaction: { customerName } as any
    });

    const idempotencyKey = generateIdempotencyKey('start_session', user?.id);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/billiard/tables/${selectedTable.id}/start`, {
        type, duration, customerName, packageId, customPriceSettings, promoId, memberId, userId: user?.id, idempotencyKey
      }, { headers: { Authorization: `Bearer ${token}` } });
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
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/billiard/move`, {
        fromTableId: moveFromTableId, toTableId, userId: user?.id
      }, { headers: { Authorization: `Bearer ${token}` } });
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
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/billiard/tables/${id}/stop`, { userId: user?.id }, { headers: { Authorization: `Bearer ${token}` } });
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

  const handleCancelItem = React.useCallback(async (item: any) => {
    const status = item.status?.toUpperCase() || 'PENDING';
    const isProcessing = ['PROCESSING', 'COOKING'].includes(status);
    setItemToCancel({ id: item.id, name: item.menuItem?.name || item.name || 'Menu', isProcessing });
    setCancellationModalOpen(true);
  }, []);

  const handleConfirmCancellation = async (data: { reason: string; waiterName: string }) => {
    if (!itemToCancel || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/cafe/order/item/${itemToCancel.id}/cancel`, {
        reason: data.reason, user: data.waiterName, userId: user?.id
      }, { headers: { Authorization: `Bearer ${token}` } });
      showAlert('Berhasil', 'Permintaan pembatalan dikirim ke KDS.', { variant: 'success' });
      setCancellationModalOpen(false);
      setItemToCancel(null);
      refetchBilliard();
    } catch (error) {
      console.error('Cancel request failed:', error);
      showAlert('Gagal', 'Gagal mengirim permintaan pembatalan.', { variant: 'error' });
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

        <header className="mb-8 flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 leading-tight">{t('billiard.title')}</h2>
            <p className="text-slate-500 mt-1 font-medium text-sm">{t('common.total')}: {tables.length}</p>
          </div>

          {/* Status Filters & Waiting List */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm overflow-x-auto max-w-full">
              {[
                { id: 'ALL', label: t('common.all') },
                { id: 'ACTIVE', label: t('billiard.occupied') },
                { id: 'AVAILABLE', label: t('billiard.available') },
                { id: 'ISSUE', label: 'Offline' }
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setFilterStatus(filter.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterStatus === filter.id
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Waiter Chat Trigger */}
            <button
                onClick={() => {
                    setIsChatOpen(prev => !prev);
                    setUnreadChatCount(0);
                }}
                className={`flex items-center gap-2 px-5 py-3.5 rounded-xl font-black text-xs shadow-lg transition-all relative ${
                    unreadChatCount > 0 
                    ? 'bg-rose-600 text-white animate-pulse' 
                    : 'bg-white text-slate-900 border border-slate-100'
                }`}
            >
                <MessageSquare className="w-4 h-4" />
                <span className="uppercase tracking-widest hidden md:inline">Instruksi Admin</span>
                {unreadChatCount > 0 && (
                    <div className="absolute -top-2 -right-2 bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded-full border border-white/20">
                        {unreadChatCount}
                    </div>
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
                className="flex items-center gap-2 px-5 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all relative overflow-hidden"
              >
                {alertType === 'RED' ? (
                  <Bell className="w-4 h-4 text-rose-400 animate-bounce fill-rose-500" />
                ) : alertType === 'YELLOW' ? (
                  <Bell className="w-4 h-4 text-amber-400 animate-pulse fill-amber-500" />
                ) : (
                  <Users className="w-4 h-4" />
                )}
                <span className="uppercase tracking-widest truncate max-w-[120px]">
                  {alertType === 'RED' && newestCustomerName ? (
                    <>
                      <span className="hidden md:inline text-[9px] opacity-70">BARU: </span>
                      {newestCustomerName}
                    </>
                  ) : alertType === 'YELLOW' ? (
                    'Booking Meja'
                  ) : 'Antrean'}
                </span>
                <div className="bg-white/20 px-1.5 py-0.5 rounded-md text-[10px]">
                  {waitingList.filter((e: any) => e.type === 'BILLIARD' && e.status === 'PENDING').length}
                </div>
              </button>
            )}
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
        itemName={itemToCancel?.menuItem?.name || ''}
        isProcessing={['PROCESSING', 'COOKING'].includes(itemToCancel?.status?.toUpperCase() || '')}
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
