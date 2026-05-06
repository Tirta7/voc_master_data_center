'use client';

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useRef,
} from 'react';
import axios from 'axios';
import { useMqtt } from './MqttContext';
import { useAuth } from './AuthContext';
import { socket } from '@/lib/socket';

// ─── Enums ────────────────────────────────────────────────────────────────────
export enum TableStatus {
    AVAILABLE = 'available',
    IN_USE = 'in_use',
    WARNING = 'warning',
    WAITING_PAYMENT = 'waiting_payment',
    MAINTENANCE = 'maintenance',
}

export enum TransactionStatus {
    UNPAID = 'UNPAID',
    PAID = 'PAID',
    PARTIAL = 'PARTIAL',
    DEBT = 'DEBT',
    CANCELLED = 'CANCELLED',
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TableRow {
    id: number;
    tableName: string;
    status: any;
    type?: 'billiard' | 'cafe';
    isLightOn?: boolean;
    isOffline?: boolean;
    isBooked?: boolean;
    category?: string;
    sessionType?: 'prepaid' | 'open';
    startTime?: string;
    endTime?: string;
    currentCustomer?: string;
    currentTransactionId?: number;
    grandTotal?: number;
    activeTransaction?: any;
    [key: string]: any;
}

export interface WaitingEntry {
    id: number;
    status: string;
    type: 'BILLIARD' | 'CAFE';
    customerName: string;
    [key: string]: any;
}

export interface BattlePlanItem {
    menuItemId?: number;
    packageId?: number;
    promoId?: number;
    menuItem?: {
        name: string;
    };
    billiardPackage?: {
        name: string;
    };
    promo?: {
        name: string;
    };
    targetQuantity: number;
    soldQuantity: number;
    aiLabel: string;
}

export interface BattlePlan {
    id: number;
    businessDayId: number;
    targetRevenue: number;
    aiStrategyBrief: string;
    items: BattlePlanItem[];
}

export interface PerformancePulse {
    businessDayId: number;
    actualRevenue: number;
    targetRevenue: number;
    achievementPercent: number;
    gap: number;
    items: {
        id: number;
        type: string;
        name: string;
        sold: number;
        target: number;
        percent: number;
    }[];
    timestamp: Date;
}

interface RealtimeDataContextType {
    // Data
    billiardTables: TableRow[];
    cafeTables: TableRow[];
    waitingList: WaitingEntry[];
    settings: any;

    // Loading
    loadingBilliard: boolean;
    loadingCafe: boolean;

    // Manual refetch (for actions that change data server-side before MQTT fires)
    refetchBilliard: () => Promise<void>;
    refetchCafe: () => Promise<void>;
    refetchWaitingList: () => Promise<void>;
    optimisticUpdateTable: (tableId: number, data: Partial<TableRow>) => void;

    // Counts for sidebar badges
    activeBilliardCount: number;
    activeCafeCount: number;
    pendingWaitingCount: number;
    activeDebtCount: number;
    unreadChatCount: number;
    lastUpdated: Date | null;

    // Shift refetch trigger for dashboards
    shiftEventCount: number;

    // Global Reward Redemption
    redeemQueue: any[];
    setRedeemQueue: React.Dispatch<React.SetStateAction<any[]>>;
    dismissRedeem: (tokenId: string) => void;

    // AI Battle Plan
    battlePlan: BattlePlan | null;
    refetchBattlePlan: () => Promise<void>;
    performancePulse: PerformancePulse | null;
    lastUpsellPrompt: any | null;
    dismissUpsellPrompt: () => void;
    aiCampaigns: Record<number, { ackCount: number, conversionValue: number }>;
    intensityData: any | null;
    waiterStats: any[];
    expiringItemsCount: number;
    upcomingInstallmentCount: number;
    upcomingInstallmentTotal: number;
    refetchFinancialHealth: () => Promise<void>;
    isBannerDismissed: boolean;
    setIsBannerDismissed: (val: boolean) => void;
}

const RealtimeDataContext = createContext<RealtimeDataContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const RealtimeDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { subscribe } = useMqtt();

    const [billiardTables, setBilliardTables] = useState<TableRow[]>([]);
    const [cafeTables, setCafeTables] = useState<TableRow[]>([]);
    const [waitingList, setWaitingList] = useState<WaitingEntry[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [loadingBilliard, setLoadingBilliard] = useState(true);
    const [loadingCafe, setLoadingCafe] = useState(true);
    const [shiftEventCount, setShiftEventCount] = useState(0);
    const [redeemQueue, setRedeemQueue] = useState<any[]>([]);
    const [battlePlan, setBattlePlan] = useState<BattlePlan | null>(null);
    const [performancePulse, setPerformancePulse] = useState<PerformancePulse | null>(null);
    const [lastUpsellPrompt, setLastUpsellPrompt] = useState<any | null>(null);
    const [aiCampaigns, setAiCampaigns] = useState<Record<number, { ackCount: number, conversionValue: number }>>({});
    const [intensityData, setIntensityData] = useState<any | null>(null);
    const [waiterStats, setWaiterStats] = useState<any[]>([]);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [activeDebtCount, setActiveDebtCount] = useState(0);
    const [upcomingInstallmentCount, setUpcomingInstallmentCount] = useState(0);
    const [upcomingInstallmentTotal, setUpcomingInstallmentTotal] = useState(0);
    const [expiringItemsCount, setExpiringItemsCount] = useState(0);
    const [isBannerDismissed, setIsBannerDismissed] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const billiardFetchInProgress = useRef(false);
    const heartbeatBuffer = useRef<Record<number, any>>({});
    const heartbeatTimeout = useRef<NodeJS.Timeout | null>(null);

    const dismissRedeem = (token: string) => {
        setRedeemQueue(prev => prev.map(r => r.token === token ? { ...r, dismissed: true } : r));
    };

    const { user, terminalId: currentTerminalId } = useAuth();

    // --- PHASE 27: CAMPAIGN STAT HYDRATION ---
    useEffect(() => {
        const fetchStats = async () => {
            if (battlePlan?.businessDayId) {
                try {
                    const res = await axios.get(`/ai/campaign-stats/${battlePlan.businessDayId}`);
                    setAiCampaigns(res.data || {});
                } catch (err) {
                    console.error('[RealtimeData] Failed to fetch campaign stats:', err);
                }
            }
        };
        fetchStats();
    }, [battlePlan?.businessDayId]);

    const sortByName = (arr: any[]) =>
        [...arr].sort((a, b) =>
            (a.tableName || '').localeCompare(b.tableName || '', undefined, { numeric: true, sensitivity: 'base' })
        );

    // ── Fetch helpers ──────────────────────────────────────────────────────────
    const refetchBilliard = useCallback(async () => {
        if (billiardFetchInProgress.current) return;
        try {
            billiardFetchInProgress.current = true;
            const res = await axios.get(`/billiard/tables`, {
                timeout: 10000, // 10s timeout
            });
            setBilliardTables(sortByName(res.data));
            setLastUpdated(new Date());
        } catch (err) {
            console.error('[RealtimeData] billiard fetch failed:', err);
        } finally {
            setLoadingBilliard(false);
            billiardFetchInProgress.current = false;
        }
    }, []);

    const refetchCafe = useCallback(async () => {
        try {
            const res = await axios.get(`/cafe-table`);
            setCafeTables(sortByName(res.data));
        } catch (err) {
            console.error('[RealtimeData] cafe fetch failed:', err);
        } finally {
            setLoadingCafe(false);
        }
    }, []);

    const refetchWaitingList = useCallback(async () => {
        try {
            const [billiardRes, cafeRes] = await Promise.all([
                axios.get(`/waiting-list`, {
                    params: { type: 'BILLIARD' },
                }),
                axios.get(`/waiting-list`, {
                    params: { type: 'CAFE' },
                }),
            ]);
            setWaitingList([...billiardRes.data, ...cafeRes.data]);
        } catch (err) {
            console.error('[RealtimeData] waiting-list fetch failed:', err);
        }
    }, []);

    const refetchSettings = useCallback(async () => {
        try {
            const res = await axios.get(`/settings`);
            setSettings(res.data);
        } catch (err) {
            console.error('[RealtimeData] settings fetch failed:', err);
        }
    }, []);

    const refetchBattlePlan = useCallback(async () => {
        try {
            // Get active business day first
            const bdayRes = await axios.get(`/finance/shifts/business-day/active`);
            if (bdayRes.data) {
                const [planRes, pulseRes] = await Promise.all([
                    axios.get(`/ai/battle-plan/active/${bdayRes.data.id}`),
                    axios.get(`/ai/battle-plan/${bdayRes.data.id}/report`)
                ]);
                setBattlePlan(planRes.data);
                if (pulseRes.data) {
                    setPerformancePulse(pulseRes.data);
                }
            }
        } catch (err) {
            console.error('[RealtimeData] battle plan/pulse fetch failed:', err);
        }
    }, []);

    const fetchIntensityData = useCallback(async () => {
        try {
            const res = await axios.get(`/ai/predict-intensity`);
            setIntensityData(res.data);
        } catch (err) {
            console.error('[RealtimeData] intensity fetch failed:', err);
        }
    }, []);

    const fetchWaiterStats = useCallback(async (businessDayId?: number) => {
        if (!user) return;
        try {
            const url = businessDayId
                ? `/ai/waiter-performance/${businessDayId}`
                : `/ai/waiter-performance`;
            const res = await axios.get(url);
            setWaiterStats(res.data || []);
        } catch (err) {
            console.error('[RealtimeData] waiter stats fetch failed:', err);
        }
    }, [user]);

    const refetchDebtCount = useCallback(async () => {
        if (!user) return;
        try {
            const res = await axios.get(`/transactions/debt/count`);
            setActiveDebtCount(res.data || 0);
        } catch (err) {
            // Only log if not a 401 (AuthContext handles 401s)
            if (axios.isAxiosError(err) && err.response?.status !== 401) {
                console.error('[RealtimeData] debt count fetch failed:', err.message);
            }
        }
    }, [user]);

    const refetchUnreadCount = useCallback(async () => {
        if (!user) return;
        try {
            const res = await axios.get(`/chat/unread-count`);
            setUnreadChatCount(res.data.count || 0);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status !== 401) {
                console.error('[RealtimeData] unread count fetch failed:', err.message);
            }
        }
    }, [user]);

    const dismissUpsellPrompt = useCallback(() => {
        setLastUpsellPrompt(null);
    }, []);
    
    const refetchFinancialHealth = useCallback(async () => {
        if (!user) return;
        try {
            // Fetch Installments
            const instRes = await axios.get(`/inventory/installments/upcoming`);
            const instItems = instRes.data || [];
            setUpcomingInstallmentCount(instItems.length);
            setUpcomingInstallmentTotal(instItems.reduce((sum: number, it: any) => sum + Number(it.amount), 0));

            // Fetch Expiring Soon
            const statsRes = await axios.get(`/inventory/stats`);
            setExpiringItemsCount(statsRes.data?.expiringSoon?.length || 0);
        } catch (err) {
            console.error('[RealtimeData] financial health fetch failed:', err);
        }
    }, [user]);

    const optimisticUpdateTable = useCallback((tableId: number, data: Partial<TableRow>) => {
        setBilliardTables(prev => prev.map(t => t.id === tableId ? { ...t, ...data } : t));
    }, []);

    // ── Initial load ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user) return;
        if (!socket.connected) socket.connect();
        refetchBilliard();
        refetchCafe();
        refetchWaitingList();
        refetchSettings();
        refetchBattlePlan();
        fetchIntensityData();
        fetchWaiterStats();
        refetchUnreadCount();
        refetchDebtCount();
        refetchFinancialHealth();

        // ── Visibility Change Handling ─────────────────────────────────────
        // Refetch when tab becomes visible (after being in background)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[RealtimeData] App became visible, refetching...');
                refetchBilliard();
                refetchCafe();
                refetchWaitingList();
                refetchDebtCount();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleVisibilityChange);
        };
    }, [user, refetchBilliard, refetchCafe, refetchWaitingList, refetchSettings]);

    // ── SAFETY NET: Periodic full-refetch setiap 30 detik ─────────────────────
    // Mencegah data drift jika pesan WebSocket/MQTT terlewat.
    // Hanya refetch data yang sering berubah (billiard + cafe tables).
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(() => {
            if (user) {
                refetchBilliard();
                refetchCafe();
                refetchBattlePlan();
                fetchIntensityData();
                fetchWaiterStats();
                refetchDebtCount();
                refetchFinancialHealth();
            }
        }, 30000); // Setiap 30 detik
        
        const longInterval = setInterval(() => {
            if (user) {
                refetchFinancialHealth();
            }
        }, 300000); // Setiap 5 menit

        return () => {
            clearInterval(interval);
            clearInterval(longInterval);
        };
    }, [user, refetchBilliard, refetchCafe, refetchFinancialHealth]);
    
    // Reset banner dismissal if counts drop to 0
    useEffect(() => {
        if (upcomingInstallmentCount === 0 && expiringItemsCount === 0) {
            setIsBannerDismissed(false);
        }
    }, [upcomingInstallmentCount, expiringItemsCount]);

    // ── AUTO-RECOVERY: Refetch saat socket reconnect ──────────────────────────
    const lastRefetch = useRef<number>(0);
    useEffect(() => {
        const handleReconnect = () => {
            if (!user) return;

            // Throttle: Jangan fetch ulang jika baru saja fetch dalam 10 detik terakhir
            const now = Date.now();
            if (now - lastRefetch.current < 10000) return;
            lastRefetch.current = now;

            // console.log('[RealtimeData] Socket reconnected — refetching all data...');
            refetchBilliard();
            refetchCafe();
            refetchWaitingList();
            refetchSettings();
            refetchBattlePlan();
            refetchDebtCount();
        };
        socket.on('connect', handleReconnect);
        return () => {
            socket.off('connect', handleReconnect);
        };
    }, [user, refetchBilliard, refetchCafe, refetchWaitingList, refetchSettings]);

    // ── MQTT subscriptions ─────────────────────────────────────────────────────
    const handleTableUpdate = useCallback((updated: any) => {
        if (!updated?.id) return;
        const updatedType = updated.type || 'billiard';

        const mergeLogic = (prev: TableRow[]) => {
            // 1. Handle Deletions (Table strictly removed by Admin)
            if (updated._action === 'DELETE') {
                return prev.filter(t => t.id !== updated.id);
            }

            // 2. Handle Additions
            if (updated._action === 'ADD') {
                const exists = prev.some(t => t.id === updated.id);
                if (!exists) {
                    return sortByName([...prev, updated]);
                }
            }

            // 3. Handle Updates
            const nextArr = prev.map(t => {
                if (t.id !== updated.id) return t;

                // Determine if this is a NEW or UPDATED transaction
                const oldTxId = t.activeTransaction?.id;
                const newTxId = updated.activeTransaction?.id;

                let finalTx = updated.activeTransaction;

                // If it's the SAME transaction ID, we can merge to preserve transient fields (like duration)
                if (oldTxId && newTxId && oldTxId === newTxId) {
                    finalTx = { ...t.activeTransaction, ...updated.activeTransaction };
                    // Strict Null-Check for member data leakage
                    if (updated.activeTransaction?.memberId === null || updated.memberId === null) {
                        finalTx.member = null;
                        finalTx.memberId = null;
                    }
                }
                // If newTxId is different or null, we MUST replace entirely (or clear)
                else {
                    finalTx = updated.activeTransaction || null;
                }

                const isNowAvailable = updated.status?.toLowerCase() === 'available';
                if (isNowAvailable) {
                    finalTx = null;
                }

                return {
                    ...t,
                    ...updated,
                    status: updated.status || t.status,
                    activeTransaction: finalTx,
                    // Ensure totals and names are correctly derived
                    grandTotal: isNowAvailable ? 0 : (updated.grandTotal ?? finalTx?.grandTotal ?? t.grandTotal),
                    customerName: isNowAvailable ? null : (finalTx?.customerName || updated.customerName || t.customerName),
                    currentCustomer: isNowAvailable ? null : (finalTx?.customerName || updated.currentCustomer || t.currentCustomer)
                };
            });

            // ── NEW: Trigger debt count refresh on any table update ──
            refetchDebtCount();

            // 4. Re-sort in case a table was renamed or ADD was triggered via fallback UPDATE
            return sortByName(nextArr);
        };

        if (updatedType === 'billiard') {
            setBilliardTables(mergeLogic);
        } else if (updatedType === 'cafe') {
            setCafeTables(mergeLogic);
        }
    }, []);


    // ── MQTT subscriptions ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!user) return;
        const unsubs: (() => void)[] = [];

        // Billiard table updates (real-time replace)
        unsubs.push(subscribe('billiard/tables/update', handleTableUpdate));

        // Heartbeat: batch status updates to reduce re-renders
        unsubs.push(subscribe('billiard/heartbeat/+', (data: any) => {
            if (!data.tableId) return;

            // Add to buffer
            heartbeatBuffer.current[data.tableId] = data;

            // Schedule flush
            if (!heartbeatTimeout.current) {
                heartbeatTimeout.current = setTimeout(() => {
                    const buffer = { ...heartbeatBuffer.current };
                    heartbeatBuffer.current = {};
                    heartbeatTimeout.current = null;

                    setBilliardTables(prev => {
                        let changed = false;
                        const next = prev.map(t => {
                            if (buffer[t.id] !== undefined) {
                                changed = true;
                                const hData = buffer[t.id];
                                return {
                                    ...t,
                                    isOffline: hData.connectivity === 'OFFLINE' || hData.status === 'OFFLINE',
                                    rssi: hData.rssi ?? t.rssi,
                                    uptime: hData.uptime ?? t.uptime,
                                };
                            }
                            return t;
                        });
                        return changed ? next : prev;
                    });
                }, 200); // 200ms batching window
            }
        }));

        // Order updates: update order item status inline
        unsubs.push(subscribe('billiard/order/update', (data: any) => {
            if (!data.transactionId) return;

            const updater = (prev: TableRow[]) => prev.map(t => {
                if (t?.activeTransaction && t.activeTransaction.id === data.transactionId) {
                    const updatedItems = (t.activeTransaction?.orderItems || []).map((item: any) =>
                        item?.id === data.id ? { ...item, status: data.status } : item
                    );
                    return {
                        ...t,
                        activeTransaction: { ...t.activeTransaction, orderItems: updatedItems }
                    };
                }
                return t;
            });
            setBilliardTables(updater);
            setCafeTables(updater);
        }));

        // Waiting list updates
        unsubs.push(subscribe('billiard/waiting-list/update', () => {
            refetchWaitingList();
        }));

        // Member balance updates — update both billiard and cafe tables inline
        unsubs.push(subscribe('billiard/member/+/balance', (data: any) => {
            if (!data.memberId) return;
            const applyBalance = (prev: TableRow[]) =>
                prev.map(t => {
                    const isMatch = (t.activeTransaction?.memberId === data.memberId)
                        || (t.activeTransaction?.member?.id === data.memberId)
                        || (t.memberId === data.memberId);
                    if (!isMatch) return t;
                    return {
                        ...t,
                        activeTransaction: t.activeTransaction ? {
                            ...t.activeTransaction,
                            member: t.activeTransaction.member
                                ? { ...t.activeTransaction.member, balance: data.balance }
                                : undefined,
                        } : t.activeTransaction,
                    };
                });
            setBilliardTables(applyBalance);
            setCafeTables(applyBalance);
        }));

        // Finance/Transaction updates (MQTT side)
        unsubs.push(subscribe('billiard/finance/transaction', (data: any) => {
            console.log('[RealtimeData] Transaction update via MQTT:', data);
            if (!data.id) return;

            const updater = (prev: TableRow[]) => {
                const updatedArr = prev.map(t => {
                    const isMatch = (t.activeTransaction?.id === data.id) || (data.tableId && t.id === data.tableId);
                    if (!isMatch) return t;

                    const mergedTx = t.activeTransaction
                        ? { ...t.activeTransaction, ...data }
                        : data;

                    // Strict Null-Check for member data leakage
                    if (data.memberId === null) {
                        mergedTx.member = null;
                        mergedTx.memberId = null;
                    }

                    return { ...t, activeTransaction: mergedTx };
                });
                return sortByName(updatedArr);
            };

            setBilliardTables(updater);
            setCafeTables(updater);
        }));

        // Shift updates
        unsubs.push(subscribe('billiard/shift/start', () => {
            setShiftEventCount(prev => prev + 1);
        }));
        unsubs.push(subscribe('billiard/shift/end', () => {
            setShiftEventCount(prev => prev + 1);
        }));

        unsubs.push(subscribe('billiard/ai/battle-plan/update', (data: any) => {
            if (['STRATEGY_BRIEF', 'PUBLISHED', 'RE_OPTIMIZED', 'UPDATED'].includes(data.type)) {
                refetchBattlePlan();
                return;
            }
            setBattlePlan(prev => {
                if (!prev || prev.id !== data.battlePlanId) return prev;
                return {
                    ...prev,
                    items: prev.items.map(it => {
                        const isMatch = (data.menuItemId && it.menuItemId === data.menuItemId) ||
                            (data.packageId && it.packageId === data.packageId) ||
                            (data.promoId && it.promoId === data.promoId);
                        return isMatch ? { ...it, soldQuantity: data.soldQuantity } : it;
                    })
                };
            });
        }));

        return () => unsubs.forEach(u => u());
    }, [subscribe, refetchWaitingList, handleTableUpdate]);

    // ── WebSocket Fallback ───────────────────────────────────────────────────
    useEffect(() => {
        if (currentTerminalId) {
            socket.emit('join_terminal_room', currentTerminalId);
        }

        const onTableUpdate = (data: any) => {
            handleTableUpdate(data);
        };

        const onHeartbeat = (data: any) => {
            if (!data.tableId) return;
            heartbeatBuffer.current[data.tableId] = data;

            if (!heartbeatTimeout.current) {
                heartbeatTimeout.current = setTimeout(() => {
                    const buffer = { ...heartbeatBuffer.current };
                    heartbeatBuffer.current = {};
                    heartbeatTimeout.current = null;

                    setBilliardTables(prev => {
                        let changed = false;
                        const next = prev.map(t => {
                            if (buffer[t.id] !== undefined) {
                                changed = true;
                                const hData = buffer[t.id];
                                return {
                                    ...t,
                                    isOffline: hData.connectivity === 'OFFLINE' || hData.status === 'OFFLINE',
                                    rssi: hData.rssi ?? t.rssi,
                                    uptime: hData.uptime ?? t.uptime,
                                };
                            }
                            return t;
                        });
                        return changed ? next : prev;
                    });
                }, 200);
            }
        };

        const onTransactionUpdated = (data: any) => {
            console.log('[RealtimeData] Transaction update via WebSocket:', data);
            if (!data.id) return;

            const updater = (prev: TableRow[]) => {
                const updatedArr = prev.map(t => {
                    const isMatch = (t.activeTransaction?.id === data.id) || (data.tableId && t.id === data.tableId);
                    if (!isMatch) return t;

                    // 🛡️ GHOST GUARD: If table is available, DO NOT re-attach any transaction data
                    // 🛡️ DEBT GUARD: If the incoming transaction is now DEBT or PARTIAL (Held), detach it from the table card
                    const isHeld = [TransactionStatus.DEBT, TransactionStatus.PARTIAL].includes(data.status);

                    if (t.status === TableStatus.AVAILABLE || isHeld) {
                        return {
                            ...t,
                            activeTransaction: null,
                            grandTotal: 0
                        };
                    }

                    // Deep merge transaction data
                    const mergedTx = t.activeTransaction
                        ? { ...t.activeTransaction, ...data }
                        : data;

                    // Strict Null-Check for member data leakage
                    if (data.memberId === null) {
                        mergedTx.member = null;
                        mergedTx.memberId = null;
                    }

                    return { ...t, activeTransaction: mergedTx };
                });
                return sortByName(updatedArr);
            };

            setBilliardTables(updater);
            setCafeTables(updater);
            refetchDebtCount();
        };

        const onMemberBalanceUpdated = (data: any) => {
            if (!data.memberId) return;
            const applyBalance = (prev: TableRow[]) =>
                prev.map(t => {
                    const isMatch = (t.activeTransaction?.memberId === data.memberId)
                        || (t.activeTransaction?.member?.id === data.memberId)
                        || (t.memberId === data.memberId);
                    if (!isMatch) return t;
                    return {
                        ...t,
                        activeTransaction: t.activeTransaction ? {
                            ...t.activeTransaction,
                            member: t.activeTransaction.member
                                ? { ...t.activeTransaction.member, balance: data.balance }
                                : undefined,
                        } : t.activeTransaction,
                    };
                });
            setBilliardTables(applyBalance);
            setCafeTables(applyBalance);
        };

        const onShiftUpdate = () => {
            setShiftEventCount(prev => prev + 1);
        };

        const onWaitingListUpdate = () => {
            console.log('[RealtimeData] Waiting list update via WebSocket');
            refetchWaitingList();
        };

        const onRedeemRequest = (data: any) => {
            console.log('[RealtimeData] Redeem request received:', data);
            // Append to queue if not already there
            setRedeemQueue(prev => {
                const exists = prev.some(r => r.token === data.token);
                if (exists) return prev;
                return [{ ...data, createdAt: new Date(), dismissed: false }, ...prev];
            });
        };

        socket.on('tableUpdate', onTableUpdate);
        socket.on('heartbeat', onHeartbeat);
        socket.on('transactionUpdated', onTransactionUpdated);
        socket.on('memberBalanceUpdated', onMemberBalanceUpdated);
        socket.on('shift_started', onShiftUpdate);
        socket.on('shift_ended', onShiftUpdate);
        socket.on('waitingListUpdate', onWaitingListUpdate);
        socket.on('redeem_request', onRedeemRequest);

        socket.on('battlePlanUpdated', (data: any) => {
            if (['STRATEGY_BRIEF', 'PUBLISHED', 'RE_OPTIMIZED', 'UPDATED'].includes(data.type)) {
                refetchBattlePlan();
                return;
            }
            if (data.type === 'UPSELL_PROMPT') {
                setLastUpsellPrompt({ ...data, id: data.id || Date.now() });
                return;
            }
            if (data.type === 'CAMPAIGN_UPDATE') {
                setAiCampaigns(prev => ({
                    ...prev,
                    [data.promptId]: {
                        ackCount: data.ackCount,
                        conversionValue: data.conversionValue
                    }
                }));
                return;
            }
            if (data.type === 'WAITER_STATS_UPDATE') {
                setWaiterStats(data.stats || []);
                return;
            }
            setBattlePlan(prev => {
                if (!prev || prev.id !== data.battlePlanId) return prev;
                return {
                    ...prev,
                    items: prev.items.map(it => {
                        const isMatch = (data.menuItemId && it.menuItemId === data.menuItemId) ||
                            (data.packageId && it.packageId === data.packageId) ||
                            (data.promoId && it.promoId === data.promoId);
                        return isMatch ? { ...it, soldQuantity: data.soldQuantity } : it;
                    })
                };
            });
        });

        socket.on('performancePulseUpdated', (data: any) => {
            // console.log('[RealtimeData] Performance pulse updated:', data);
            setPerformancePulse(data);
        });

        socket.on('unread_count_update', (data: any) => {
            if (data.global || data.count === undefined) {
                refetchUnreadCount();
            } else {
                setUnreadChatCount(data.count);
            }
        });

        socket.on('debt_updated', () => {
            refetchDebtCount();
        });

        // Also increment unread count on receive_chat if window is likely closed
        socket.on('receive_chat', (msg: any) => {
            if (msg.senderId !== user?.id) {
                setUnreadChatCount(prev => prev + 1);
            }
        });

        return () => {
            socket.off('tableUpdate', onTableUpdate);
            socket.off('heartbeat', onHeartbeat);
            socket.off('transactionUpdated', onTransactionUpdated);
            socket.off('memberBalanceUpdated', onMemberBalanceUpdated);
            socket.off('shift_started', onShiftUpdate);
            socket.off('shift_ended', onShiftUpdate);
            socket.off('waitingListUpdate', onWaitingListUpdate);
            socket.off('redeem_request', onRedeemRequest);
            socket.off('battlePlanUpdated');
            socket.off('performancePulseUpdated');
        };
    }, [refetchBilliard, refetchCafe, handleTableUpdate]);

    // ── Derived counts for sidebar badges ─────────────────────────────────────
    const activeBilliardCount = billiardTables.filter(t =>
        t.status === 'in_use' || t.status === 'warning' || t.status === 'IN_USE' || t.status === 'WARNING'
    ).length;

    const activeCafeCount = cafeTables.filter(t =>
        t.status === 'occupied' || t.status === 'OCCUPIED'
    ).length;

    const pendingWaitingCount = waitingList.filter(e =>
        e.status === 'PENDING'
    ).length;

    return (
        <RealtimeDataContext.Provider
            value={{
                billiardTables,
                cafeTables,
                waitingList,
                settings,
                loadingBilliard,
                loadingCafe,
                refetchBilliard,
                refetchCafe,
                refetchWaitingList,
                optimisticUpdateTable,
                activeBilliardCount,
                activeCafeCount,
                pendingWaitingCount,
                activeDebtCount,
                lastUpdated,
                shiftEventCount,
                redeemQueue,
                setRedeemQueue,
                dismissRedeem,
                battlePlan,
                refetchBattlePlan,
                performancePulse,
                lastUpsellPrompt,
                aiCampaigns,
                intensityData,
                waiterStats,
                unreadChatCount,
                upcomingInstallmentCount,
                upcomingInstallmentTotal,
                expiringItemsCount,
                refetchFinancialHealth,
                dismissUpsellPrompt,
                isBannerDismissed,
                setIsBannerDismissed
            }}
        >
            {children}
        </RealtimeDataContext.Provider>
    );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useRealtimeData = () => {
    const ctx = useContext(RealtimeDataContext);
    if (!ctx) throw new Error('useRealtimeData must be used within RealtimeDataProvider');
    return ctx;
};
