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
import { useToast } from '@/components/ui/ToastProvider';

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
    setSettings: (settings: any) => void;
}

const RealtimeDataContext = createContext<RealtimeDataContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const RealtimeDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { subscribe } = useMqtt();

    const [billiardTables, setBilliardTables] = useState<TableRow[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem('voc_billiard_tables_cache');
                if (cached) return JSON.parse(cached);
            } catch (e) {}
        }
        return [];
    });
    const [cafeTables, setCafeTables] = useState<TableRow[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem('voc_cafe_tables_cache');
                if (cached) return JSON.parse(cached);
            } catch (e) {}
        }
        return [];
    });
    const [waitingList, setWaitingList] = useState<WaitingEntry[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [loadingBilliard, setLoadingBilliard] = useState(() => {
        if (typeof window !== 'undefined') {
            return !localStorage.getItem('voc_billiard_tables_cache');
        }
        return true;
    });
    const [loadingCafe, setLoadingCafe] = useState(() => {
        if (typeof window !== 'undefined') {
            return !localStorage.getItem('voc_cafe_tables_cache');
        }
        return true;
    });
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

    // --- PHASE ZERO LOADING: Persist state to local storage ---
    useEffect(() => {
        if (billiardTables.length > 0) {
            // Debounce the save to prevent blocking the main thread during rapid MQTT updates
            const timer = setTimeout(() => {
                localStorage.setItem('voc_billiard_tables_cache', JSON.stringify(billiardTables));
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [billiardTables]);

    useEffect(() => {
        if (cafeTables.length > 0) {
            const timer = setTimeout(() => {
                localStorage.setItem('voc_cafe_tables_cache', JSON.stringify(cafeTables));
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [cafeTables]);

    // ── Fetch helpers ──────────────────────────────────────────────────────────
    const { showToast } = useToast();

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

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [user, refetchBilliard, refetchCafe, refetchWaitingList, refetchSettings]);

    // ── SAFETY NET: Periodic full-refetch sebagai jaring pengaman ─────────────
    // Mencegah data drift jika pesan WebSocket/MQTT terlewat.
    // Interval di-set ke 30 detik karena update realtime sudah ditangani MQTT+WebSocket.
    // Polling hanya sebagai fallback jika ada pesan yang terlewat.
    useEffect(() => {
        if (!user) return;
        const fastInterval = setInterval(() => {
            if (user) {
                refetchBilliard();
                refetchCafe();
            }
        }, 30000); // Safety-net setiap 30 detik — MQTT+WebSocket yang handle realtime

        const slowInterval = setInterval(() => {
            if (user) {
                refetchBattlePlan();
                fetchIntensityData();
                fetchWaiterStats();
                refetchDebtCount();
                refetchFinancialHealth();
            }
        }, 30000); // Setiap 30 detik — data non-kritis

        
        const longInterval = setInterval(() => {
            if (user) {
                refetchFinancialHealth();
            }
        }, 300000); // Setiap 5 menit

        return () => {
            clearInterval(fastInterval);
            clearInterval(slowInterval);
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
                // 🛡️ FIX: Filter by BOTH id AND type to prevent cross-type deletion
                return prev.filter(t => !(t.id === updated.id && (t.type || 'billiard') === updatedType));
            }

            // 2. Handle Additions
            if (updated._action === 'ADD') {
                // 🛡️ FIX: Check existence by BOTH id AND type
                const exists = prev.some(t => t.id === updated.id && (t.type || 'billiard') === updatedType);
                if (!exists) {
                    return sortByName([...prev, updated]);
                }
            }

            // 3. Handle Updates
            const nextArr = prev.map(t => {
                // 🛡️ FIX: Match by BOTH id AND type — prevents Cafe Table 4 overwriting Billiard Table 4
                // when both share the same auto-increment ID (different DB tables = can overlap)
                if (t.id !== updated.id || (t.type || 'billiard') !== updatedType) return t;

                // Determine if this is a NEW or UPDATED transaction
                const oldTxId = t.activeTransaction?.id;
                const newTxId = updated.activeTransaction?.id;

                let finalTx = updated.activeTransaction;

                if (oldTxId && newTxId && oldTxId === newTxId) {
                    finalTx = { ...t.activeTransaction, ...updated.activeTransaction };
                    // Strict Null-Check for member data leakage
                    if (updated.activeTransaction?.memberId === null || updated.memberId === null) {
                        finalTx.member = null;
                        finalTx.memberId = null;
                    }
                    
                    // Prevent "MENU" blinking: Preserve menuItem if the update was shallow
                    if (t.activeTransaction?.orderItems && updated.activeTransaction?.orderItems) {
                        finalTx.orderItems = updated.activeTransaction.orderItems.map((newItem: any) => {
                            const oldItem = t.activeTransaction.orderItems.find((i: any) => i.id === newItem.id);
                            if (oldItem && !newItem.menuItem && oldItem.menuItem) {
                                return { ...newItem, menuItem: oldItem.menuItem };
                            }
                            return newItem;
                        });
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

                    // Prevent "MENU" blinking: Preserve menuItem if the update was shallow
                    if (t.activeTransaction?.orderItems && data.orderItems) {
                        mergedTx.orderItems = data.orderItems.map((newItem: any) => {
                            const oldItem = t.activeTransaction.orderItems.find((i: any) => i.id === newItem.id);
                            if (oldItem && !newItem.menuItem && oldItem.menuItem) {
                                return { ...newItem, menuItem: oldItem.menuItem };
                            }
                            return newItem;
                        });
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
            // Transaction update via WebSocket
            if (!data.id) return;

            const updater = (prev: TableRow[]) => {
                const updatedArr = prev.map(t => {
                    const isMatch = (t.activeTransaction?.id === data.id) || (data.tableId && t.id === data.tableId);
                    if (!isMatch) return t;

                    // 🛡️ GHOST GUARD: If table is available, DO NOT re-attach any transaction data
                    // 🛡️ DEBT GUARD: If the incoming transaction is now DEBT (Held), detach it from the table card
                    const isHeld = [TransactionStatus.DEBT].includes(data.status);

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

                    // Prevent "MENU" blinking: Preserve menuItem if the update was shallow
                    if (t.activeTransaction?.orderItems && data.orderItems) {
                        mergedTx.orderItems = data.orderItems.map((newItem: any) => {
                            const oldItem = t.activeTransaction.orderItems.find((i: any) => i.id === newItem.id);
                            if (oldItem && !newItem.menuItem && oldItem.menuItem) {
                                return { ...newItem, menuItem: oldItem.menuItem };
                            }
                            return newItem;
                        });
                    }

                    return { ...t, activeTransaction: mergedTx };
                });
                return sortByName(updatedArr);
            };

            setBilliardTables(updater);
            setCafeTables(updater);
            refetchDebtCount();
        };
        const onOrderItemUpdated = (data: any) => {
            // Check if data exists and is properly formatted
            const payload = data.item ? data.item : data;
            
            if (!payload.transactionId || !payload.id) return;

            const updater = (prev: TableRow[]) => prev.map(t => {
                if (t?.activeTransaction && Number(t.activeTransaction.id) === Number(payload.transactionId)) {
                    const updatedItems = (t.activeTransaction?.orderItems || []).map((item: any) =>
                        Number(item?.id) === Number(payload.id) ? { ...item, status: payload.status } : item
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
            refetchWaitingList();
        };

        const onRedeemRequest = (data: any) => {
            // Redeem request received
            // Append to queue if not already there
            setRedeemQueue(prev => {
                const exists = prev.some(r => r.token === data.token);
                if (exists) return prev;
                return [{ ...data, createdAt: new Date(), dismissed: false }, ...prev];
            });
        };

        // Hardware Failure Alert: Persisten, tidak auto-close, harus ditutup manual oleh kasir
        const onWarningNotification = (data: any) => {
            showToast(
                data.title || '⚠️ Peringatan Hardware',
                data.message || 'Periksa koneksi unit di lapangan.',
                'critical',
                data.tableId,
            );
        };

        socket.on('tableUpdate', onTableUpdate);
        socket.on('heartbeat', onHeartbeat);
        socket.on('transactionUpdated', onTransactionUpdated);
        socket.on('orderItemUpdated', onOrderItemUpdated);
        socket.on('memberBalanceUpdated', onMemberBalanceUpdated);
        socket.on('shift_started', onShiftUpdate);
        socket.on('shift_ended', onShiftUpdate);
        socket.on('waitingListUpdate', onWaitingListUpdate);
        socket.on('redeem_request', onRedeemRequest);
        socket.on('warningNotification', onWarningNotification);

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

        // Global settings update listener
        socket.on('loyaltyUpdated', (data: any) => {
            if (data?.type === 'SETTINGS_UPDATE' && data.settings) {
                setSettings(data.settings);
            }
        });

        return () => {
            socket.off('tableUpdate', onTableUpdate);
            socket.off('heartbeat', onHeartbeat);
            socket.off('transactionUpdated', onTransactionUpdated);
            socket.off('orderItemUpdated', onOrderItemUpdated);
            socket.off('memberBalanceUpdated', onMemberBalanceUpdated);
            socket.off('shift_started', onShiftUpdate);
            socket.off('shift_ended', onShiftUpdate);
            socket.off('waitingListUpdate', onWaitingListUpdate);
            socket.off('redeem_request', onRedeemRequest);
            socket.off('warningNotification', onWarningNotification);
            socket.off('battlePlanUpdated');
            socket.off('performancePulseUpdated');
            socket.off('loyaltyUpdated');
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
                setSettings,
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
