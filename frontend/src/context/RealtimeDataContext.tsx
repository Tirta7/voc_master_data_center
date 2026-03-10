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
import { socket } from '@/lib/socket';

const getApiUrl = () => {
    if (typeof window !== 'undefined') {
        return `http://${window.location.hostname}:4000`;
    }
    return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').trim();
};
const API_URL = getApiUrl();

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

    // Counts for sidebar badges
    activeBilliardCount: number;
    activeCafeCount: number;
    pendingWaitingCount: number;

    // Shift refetch trigger for dashboards
    shiftEventCount: number;
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

    const sortByName = (arr: any[]) =>
        [...arr].sort((a, b) =>
            (a.tableName || '').localeCompare(b.tableName || '', undefined, { numeric: true, sensitivity: 'base' })
        );

    // ── Fetch helpers ──────────────────────────────────────────────────────────
    const refetchBilliard = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/billiard/tables`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setBilliardTables(sortByName(res.data));
        } catch (err) {
            console.error('[RealtimeData] billiard fetch failed:', err);
        } finally {
            setLoadingBilliard(false);
        }
    }, []);

    const refetchCafe = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/cafe-table`);
            setCafeTables(sortByName(res.data));
        } catch (err) {
            console.error('[RealtimeData] cafe fetch failed:', err);
        } finally {
            setLoadingCafe(false);
        }
    }, []);

    const refetchWaitingList = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const [billiardRes, cafeRes] = await Promise.all([
                axios.get(`${API_URL}/waiting-list`, {
                    params: { type: 'BILLIARD' },
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${API_URL}/waiting-list`, {
                    params: { type: 'CAFE' },
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);
            setWaitingList([...billiardRes.data, ...cafeRes.data]);
        } catch (err) {
            console.error('[RealtimeData] waiting-list fetch failed:', err);
        }
    }, []);

    const refetchSettings = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/settings`);
            setSettings(res.data);
        } catch (err) {
            console.error('[RealtimeData] settings fetch failed:', err);
        }
    }, []);

    // ── Initial load ───────────────────────────────────────────────────────────
    useEffect(() => {
        refetchBilliard();
        refetchCafe();
        refetchWaitingList();
        refetchSettings();
    }, [refetchBilliard, refetchCafe, refetchWaitingList, refetchSettings]);

    // ── SAFETY NET: Periodic full-refetch setiap 30 detik ─────────────────────
    // Mencegah data drift jika pesan WebSocket/MQTT terlewat.
    // Hanya refetch data yang sering berubah (billiard + cafe tables).
    useEffect(() => {
        const interval = setInterval(() => {
            refetchBilliard();
            refetchCafe();
        }, 30000); // Setiap 30 detik
        return () => clearInterval(interval);
    }, [refetchBilliard, refetchCafe]);

    // ── AUTO-RECOVERY: Refetch saat socket reconnect ──────────────────────────
    // Setelah disconnect dan reconnect, semua data terakhir bisa saja
    // sudah berubah — kita harus fetch ulang semuanya dari server.
    useEffect(() => {
        const handleReconnect = () => {
            console.log('[RealtimeData] Socket reconnected — refetching all data...');
            refetchBilliard();
            refetchCafe();
            refetchWaitingList();
            refetchSettings();
        };
        socket.on('connect', handleReconnect);
        return () => {
            socket.off('connect', handleReconnect);
        };
    }, [refetchBilliard, refetchCafe, refetchWaitingList, refetchSettings]);

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
        const unsubs: (() => void)[] = [];

        // Billiard table updates (real-time replace)
        unsubs.push(subscribe('billiard/tables/update', handleTableUpdate));

        // Heartbeat: mark table offline/online
        unsubs.push(subscribe('billiard/heartbeat/+', (data: any) => {
            setBilliardTables(prev =>
                prev.map(t => t.id === data.tableId
                    ? { ...t, isOffline: data.status === 'OFFLINE' }
                    : t
                )
            );
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

        return () => unsubs.forEach(u => u());
    }, [subscribe, refetchWaitingList, handleTableUpdate]);

    // ── WebSocket Fallback ───────────────────────────────────────────────────
    useEffect(() => {
        const onTableUpdate = (updated: any) => {
            handleTableUpdate(updated);
        };

        const onHeartbeat = (data: any) => {
            setBilliardTables(prev =>
                prev.map(t => t.id === data.tableId
                    ? { ...t, isOffline: data.status === 'OFFLINE' }
                    : t
                )
            );
        };

        const onTransactionUpdated = (data: any) => {
            console.log('[RealtimeData] Transaction update via WebSocket:', data);
            if (!data.id) return;

            const updater = (prev: TableRow[]) => {
                const updatedArr = prev.map(t => {
                    const isMatch = (t.activeTransaction?.id === data.id) || (data.tableId && t.id === data.tableId);
                    if (!isMatch) return t;

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

        socket.on('tableUpdate', onTableUpdate);
        socket.on('heartbeat', onHeartbeat);
        socket.on('transactionUpdated', onTransactionUpdated);
        socket.on('memberBalanceUpdated', onMemberBalanceUpdated);
        socket.on('shift_started', onShiftUpdate);
        socket.on('shift_ended', onShiftUpdate);
        socket.on('waitingListUpdate', onWaitingListUpdate);

        return () => {
            socket.off('tableUpdate', onTableUpdate);
            socket.off('heartbeat', onHeartbeat);
            socket.off('transactionUpdated', onTransactionUpdated);
            socket.off('memberBalanceUpdated', onMemberBalanceUpdated);
            socket.off('shift_started', onShiftUpdate);
            socket.off('shift_ended', onShiftUpdate);
            socket.off('waitingListUpdate', onWaitingListUpdate);
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
                activeBilliardCount,
                activeCafeCount,
                pendingWaitingCount,
                shiftEventCount,
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
