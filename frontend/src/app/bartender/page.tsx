'use client';

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
    Martini, Clock, Wine, Bell, CheckCircle, RotateCcw,
    X,
    Volume2,
    Menu,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    Search,
    RotateCw,
    Ban,
    AlertCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/components/ui/AlertProvider';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').trim();
const KDS_URL = API_URL + '/kds';

export default function BartenderPage() {
    const { user } = useAuth();
    const { showConfirm, showAlert } = useAlert();
    const [orders, setOrders] = useState<any[]>([]);
    const ordersRef = useRef<any[]>([]);
    // Update ref whenever orders state changes to avoid stale closures in socket listeners
    useEffect(() => {
        ordersRef.current = orders;
    }, [orders]);
    const [historyOrders, setHistoryOrders] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isConnected, setIsConnected] = useState(false);

    const [newOrderAlert, setNewOrderAlert] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSummaryOpen, setIsSummaryOpen] = useState(true);
    const [stationSummary, setStationSummary] = useState<any>(null);
    const [cancellationAlert, setCancellationAlert] = useState<any | null>(null);

    useBodyScrollLock(!!cancellationAlert || !!newOrderAlert);

    const socketRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const beepIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioEnabledRef = useRef(false);
    const ttsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isVocalAlertActiveRef = useRef(false);

    // Clock Interval
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchActiveOrders();

        socketRef.current = io(KDS_URL);

        socketRef.current.on('connect', () => {
            console.log('Connected to BDS Gateway');
            setIsConnected(true);
        });
        socketRef.current.on('disconnect', () => setIsConnected(false));

        socketRef.current.on('newOrder', (order: any) => {
            console.log('New BDS Order Received:', order);
            const bdsItems = order.items.filter((i: any) => i.station === 'BDS');

            if (bdsItems.length > 0) {
                const filteredOrder = { ...order, items: bdsItems };
                setOrders((prev) => {
                    const existing = prev.find(o => o.orderId === order.orderId);
                    if (existing) return prev;
                    return [filteredOrder, ...prev];
                });
                setNewOrderAlert(filteredOrder);

                // Detect if it's a bundle order
                const isBundle = order.items.some((i: any) => i.note && i.note.toLowerCase().includes('bundle'));

                const itemNames = bdsItems
                    .map((i: any) => `${i.quantity} ${i.name || i.menuItem?.name || 'Menu'} `).join(', ');
                const location = order.tableName
                    ? `${order.tableName}`
                    : (order.tableId ? `Meja ${order.tableId}` : 'Takeaway');
                const customer = order.customerName && order.customerName !== 'Guest' ? `atas nama ${order.customerName} ` : '';

                const alertText = isBundle
                    ? `Perhatian! Orderan Paket Bundling masuk. ${location}. Pesanan: ${itemNames}`
                    : `Orderan masuk. ${location}. Pesanan: ${itemNames}`;

                console.log(`BDS Audio Trigger: ${alertText}`);
                // Play Audio Loop - isDanger=true for faster beeps
                playVocalAlert(alertText, true, true);
            }
        });

        socketRef.current.on('statusUpdated', (data: any) => {
            console.log('Order Status Updated:', data);

            setNewOrderAlert((currentAlert: any) => {
                if (currentAlert && currentAlert.orderId === data.orderId) {
                    stopAlarm();
                    return null;
                }
                return currentAlert;
            });

            // If the status update is DONE/SERVED and it's from BDS, we remove it
            // If it's from KDS, we just update the local state to show KDS is done
            if ((data.status === 'SERVED' || data.status === 'DONE') && (!data.station || data.station === 'BDS')) {
                setOrders((prev) => prev.filter((o) => o.orderId !== data.orderId));
            } else {
                setOrders((prev) =>
                    prev.map((o) => {
                        if (o.orderId === data.orderId) {
                            // Update items status if station matches
                            const updatedItems = o.items.map((item: any) => {
                                if (data.station && item.station === data.station) {
                                    return { ...item, status: data.status === 'READY' ? 'DONE' : data.status };
                                }
                                return item;
                            });
                            return { ...o, status: data.status, items: updatedItems };
                        }
                        return o;
                    })
                );
            }
        });

        socketRef.current.on('orderItemUpdated', (data: any) => {
            console.log('Order Item Updated (BDS):', data);
            setOrders((prev) => prev.map(o => {
                if (o.items.some((i: any) => i.id === data.id)) {
                    const updatedItems = o.items.map((i: any) => i.id === data.id ? { ...i, status: data.status } : i);

                    // Recalculate order-level status
                    const hasMixing = updatedItems.some((i: any) =>
                        i.status === 'PROCESSING' ||
                        i.status === 'CANCEL_REQUESTED' ||
                        i.status === 'CANCEL_REJECTED'
                    );
                    const newStatus = hasMixing ? 'MIXING' : 'PENDING';

                    return { ...o, items: updatedItems, status: newStatus };
                }
                return o;
            }));
        });

        socketRef.current.on('itemCancelled', (data: any) => {
            console.log('Item Cancelled (BDS Listener):', data);

            // Sync find station using ordersRef
            let itemStation = '';
            ordersRef.current.forEach(o => {
                const item = o.items.find((i: any) => i.id === data.id);
                if (item) itemStation = item.station?.toUpperCase() || '';
            });

            setOrders((prev) => prev.map(o => {
                const newItems = o.items.filter((i: any) => i.id !== data.id);
                if (newItems.length === 0) return null;
                return { ...o, items: newItems };
            }).filter(Boolean) as any[]);

            // ONLY speak if the item belonged to BDS
            if (audioEnabledRef.current && itemStation === 'BDS') {
                // REDUNDANT CHIME via Web Audio API
                playBeep(true);
                setTimeout(() => stopBeep(), 1000);

                const location = data.tableName || 'MEJA';
                const itemName = data.itemName || 'PESANAN';
                const alertText = `KONFIRMASI: ITEM ${itemName} DI ${location} TELAH DIHAPUS.`;

                const utterance = new SpeechSynthesisUtterance(alertText);
                utterance.lang = 'id-ID';
                utterance.rate = 1.0;
                utterance.pitch = 1.2;
                window.speechSynthesis.speak(utterance);
            }
        });

        socketRef.current.on('cancellationRequested', (data: any) => {
            console.log('Cancellation Requested (BDS Listener):', data);

            // Synchronously check if the item exists in the current orders list
            const itemFoundInBDS = ordersRef.current.some(o => o.items.some((i: any) => i.id === data.id && i.station?.toUpperCase() === 'BDS'));

            setOrders((prev) => prev.map(o => {
                const targetItem = o.items.find((i: any) => i.id === data.id);
                if (targetItem) {
                    return {
                        ...o,
                        items: o.items.map((i: any) => i.id === data.id ? { ...i, status: 'CANCEL_REQUESTED' } : i)
                    };
                }
                return o;
            }));

            const isTargetStation = data.station?.toUpperCase() === 'BDS';
            if (isTargetStation && itemFoundInBDS) {
                const location = data.tableName || (data.tableId ? `Meja ${data.tableId}` : 'Pesanan Tanpa Meja');
                const alertText = `PERHATIAN! ADA PERMINTAAN BATAL DI ${location}. MENU: ${data.itemName}. HARAP TINDAK LANJUTI SEGERA.`;

                setCancellationAlert({ ...data, alertText });
                playVocalAlert(alertText, true, true);
            } else {
                console.log(`BDS Listener: Skipping alert for ${data.itemName} (Station: ${data.station}, Item Found in BDS set: ${itemFoundInBDS})`);
            }
        });

        // cancellationRejected is redundant with orderItemUpdated but kept for separate logging/logic
        socketRef.current.on('cancellationRejected', (data: any) => {
            console.log('Cancellation Rejected Signal (BDS):', data);
            setOrders((prev) => prev.map(o => {
                if (o.items.some((i: any) => i.id === data.id)) {
                    const updatedItems = o.items.map((i: any) => i.id === data.id ? { ...i, status: 'CANCEL_REJECTED' } : i);
                    const hasMixing = updatedItems.some((i: any) =>
                        i.status === 'PROCESSING' ||
                        i.status === 'CANCEL_REQUESTED' ||
                        i.status === 'CANCEL_REJECTED'
                    );
                    return { ...o, items: updatedItems, status: hasMixing ? 'MIXING' : 'PENDING' };
                }
                return o;
            }));
        });

        return () => {
            socketRef.current.disconnect();
            if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
        };
    }, []);

    const fetchActiveOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/cafe/orders/active`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Show orders that have at least one BDS item that is NOT DONE
            // We KEEP full items to preserve cross-station status visibility
            const bdsOrders = res.data.filter((order: any) =>
                order.items.some((i: any) => i.station === 'BDS' && !['DONE', 'CANCELLED'].includes(i.status?.toUpperCase()))
            );
            setOrders(bdsOrders.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
        } catch (error) {
            console.error('Failed to load active orders', error);
        }
    };

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/cafe/orders/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Keeping all items for history logic, but will filter in UI
            const bdsHistory = res.data.filter((order: any) =>
                order.items.some((i: any) => i.station === 'BDS')
            ).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setHistoryOrders(bdsHistory);
            fetchStationSummary();
        } catch (error) {
            console.error('Failed to load history', error);
        }
    };

    const fetchStationSummary = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/cafe/summary/BDS`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStationSummary(res.data);
        } catch (error) {
            console.error('Failed to fetch station summary', error);
        }
    };

    const toggleHistory = () => {
        if (!showHistory) fetchHistory();
        setShowHistory(!showHistory);
    };

    // Aggregate active items for the bar summary panel — track per-status counts
    const aggregatedItems = orders.reduce((acc: any[], order) => {
        order.items.forEach((item: any) => {
            const s = item.status?.toUpperCase();
            if (s === 'DONE' || s === 'CANCELLED') return;
            // Extra safety: only aggregate BDS items
            if (item.station && item.station !== 'BDS') return;

            const isInProcessingFamily = ['PROCESSING', 'CANCEL_REQUESTED', 'CANCEL_REJECTED'].includes(s);
            const isReadyToFinish = s === 'PROCESSING'; // Only pure PROCESSING can be finished
            const isRejected = s === 'CANCEL_REJECTED';
            const isPendingCancel = s === 'CANCEL_REQUESTED';

            const existing = acc.find(i => i.name === item.name);
            if (existing) {
                existing.quantity += item.quantity;
                if (isInProcessingFamily) {
                    existing.processingCount = (existing.processingCount || 0) + item.quantity;
                } else {
                    existing.pendingCount = (existing.pendingCount || 0) + item.quantity;
                }
                if (isReadyToFinish) {
                    existing.readyToFinishCount = (existing.readyToFinishCount || 0) + item.quantity;
                }
                if (isRejected) {
                    existing.hasRejected = true;
                }
                if (isPendingCancel) {
                    existing.hasPendingCancel = true;
                }
            } else {
                acc.push({
                    name: item.name,
                    quantity: item.quantity,
                    pendingCount: isInProcessingFamily ? 0 : item.quantity,
                    processingCount: isInProcessingFamily ? item.quantity : 0,
                    readyToFinishCount: isReadyToFinish ? item.quantity : 0,
                    hasRejected: isRejected,
                    hasPendingCancel: isPendingCancel
                });
            }
        });
        return acc;
    }, []).sort((a: any, b: any) => b.quantity - a.quantity);

    // ── Web Audio API tone generator (replaces broken MP3 files) ──
    const playBeep = (isDanger = false) => {
        if (!audioEnabledRef.current) return;
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;

            const beepOnce = () => {
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);

                if (isDanger) {
                    // Rapid urgent two-tone beep
                    oscillator.type = 'square';
                    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
                    oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
                    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
                    oscillator.start(ctx.currentTime);
                    oscillator.stop(ctx.currentTime + 0.35);
                } else {
                    // Pleasant notification chime
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
                    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                    oscillator.start(ctx.currentTime);
                    oscillator.stop(ctx.currentTime + 0.5);
                }
            };

            // Play once immediately
            beepOnce();
            // Loop the beep while alert is active
            beepIntervalRef.current = setInterval(beepOnce, isDanger ? 500 : 2000);
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    };

    const stopBeep = () => {
        if (beepIntervalRef.current) {
            clearInterval(beepIntervalRef.current);
            beepIntervalRef.current = null;
        }
    };

    const playVocalAlert = (text: string, loop = true, isDanger = false) => {
        console.log(`[AUDIO] playVocalAlert: "${text}" (loop=${loop}, isDanger=${isDanger}, audioEnabled=${audioEnabledRef.current})`);
        if (!audioEnabledRef.current) return;

        isVocalAlertActiveRef.current = true;
        if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
        window.speechSynthesis.cancel();

        const speak = () => {
            if (!audioEnabledRef.current || !isVocalAlertActiveRef.current) return;

            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'id-ID';
                utterance.rate = isDanger ? 1.1 : 0.9;
                utterance.pitch = isDanger ? 1.4 : 1.1;

                utterance.onend = () => {
                    if (loop && isVocalAlertActiveRef.current) {
                        ttsTimeoutRef.current = setTimeout(speak, isDanger ? 1000 : 4000);
                    }
                };
                utterance.onerror = (e) => {
                    console.error('TTS Error:', e);
                    if (loop && isVocalAlertActiveRef.current) {
                        ttsTimeoutRef.current = setTimeout(speak, 6000);
                    }
                };
                window.speechSynthesis.speak(utterance);
            }
        };

        speak();

        // Persistent Background Beep (Web Audio)
        if (loop) playBeep(isDanger);
    };

    const stopAlarm = () => {
        isVocalAlertActiveRef.current = false;
        if (ttsTimeoutRef.current) {
            clearTimeout(ttsTimeoutRef.current);
            ttsTimeoutRef.current = null;
        }
        window.speechSynthesis.cancel();
        stopBeep();
        setNewOrderAlert(null);
        setCancellationAlert(null);
    };

    const enableAudio = () => {
        setAudioEnabled(true);
        audioEnabledRef.current = true;

        // Unlock AudioContext (required by browsers on first user gesture)
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        // Play a quick unlock beep to confirm audio is working
        playBeep(false);
        setTimeout(stopBeep, 600);

        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance('Sistem Bartender Terhubung, Semangat bekerja jangan lupa berdoa');
            utterance.lang = 'id-ID';
            window.speechSynthesis.speak(utterance);
        }
    };

    const updateStatus = async (order: any, nextStatus: string) => {
        stopAlarm();
        socketRef.current.emit('updateOrderStatus', { orderId: order.orderId, status: nextStatus });

        const statusMap: any = { 'MIXING': 'PROCESSING', 'READY': 'DONE', 'SERVED': 'DONE' };
        const backendStatus = statusMap[nextStatus];

        if (backendStatus) {
            try {
                for (const item of order.items) {
                    if (item.id && item.status !== 'DONE') {
                        const token = localStorage.getItem('token');
                        await axios.patch(`${API_URL}/cafe/order/item/${item.id}/status`, { status: backendStatus }, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                    }
                }
                if (nextStatus === 'SERVED') {
                    setTimeout(() => setOrders(prev => prev.filter(o => o.orderId !== order.orderId)), 500);
                }
            } catch (error) {
                console.error('Failed to update persistence status:', error);
            }
        }
    };

    const updateStatusForItem = async (order: any, item: any, nextStatus: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/cafe/order/item/${item.id}/status`, { status: nextStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setOrders(prev => {
                const newOrders = prev.map(o => {
                    if (o.orderId === order.orderId) {
                        const newItems = o.items.map((i: any) =>
                            i.id === item.id ? { ...i, status: nextStatus } : i
                        );
                        const allDone = newItems.every((i: any) => i.status === 'DONE');
                        const currentStatus = allDone ? 'READY' : o.status;

                        if (allDone && o.status !== 'READY') {
                            socketRef.current.emit('updateOrderStatus', { orderId: o.orderId, status: 'READY' });
                        }

                        return { ...o, items: newItems, status: currentStatus };
                    }
                    return o;
                });
                return newOrders;
            });
        } catch (error) {
            console.error('Failed to update item status:', error);
        }
    };

    const handleConfirmCancel = async (item: any) => {
        const confirmed = await showConfirm(
            "Konfirmasi Pembatalan",
            `Apakah Anda yakin ingin MENERIMA pembatalan "${item.itemName}"? Tindakan ini tidak dapat dibatalkan.`
        );
        if (!confirmed) return;

        try {
            const token = localStorage.getItem('token');
            const confirmerName = user?.name || "Staff Bar";
            await axios.patch(`${API_URL}/cafe/order/item/${item.id}/confirm-cancel`, {
                user: confirmerName
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            stopAlarm();
            showAlert("Berhasil", "Pembatalan telah dikonfirmasi.", { variant: "success" });
        } catch (error: any) {
            console.error('Failed to confirm cancellation:', error);
            const msg = error.response?.data?.message || "Gagal mengonfirmasi pembatalan. Silakan coba lagi.";
            showAlert("Kesalahan", msg, { variant: "error" });
        }
    };

    const handleRejectCancel = async (item: any) => {
        const confirmed = await showConfirm(
            "Tolak Pembatalan",
            `Apakah Anda yakin ingin MENOLAK pembatalan "${item.itemName}"? Minuman harus tetap dikirim.`
        );
        if (!confirmed) return;

        try {
            const token = localStorage.getItem('token');
            const rejecterName = user?.name || "Staff Bar";
            await axios.patch(`${API_URL}/cafe/order/item/${item.id}/reject-cancel`, {
                user: rejecterName
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            stopAlarm();
            showAlert("Ditolak", "Permintaan pembatalan telah ditolak.", { variant: "warning" });
        } catch (error: any) {
            console.error('Failed to reject cancellation:', error);
            const msg = error.response?.data?.message || "Gagal menolak pembatalan. Item mungkin sudah dihapus atau status berubah.";
            showAlert("Kesalahan", msg, { variant: "error" });
        }
    };

    // Stage 1: Start mixing — set matching items to PROCESSING
    const bulkStartMixing = async (itemName: string) => {
        const promises: Promise<void>[] = [];

        for (const order of orders) {
            const matchingItems = order.items.filter(
                (item: any) => item.name === itemName && !['DONE', 'CANCELLED'].includes(item.status?.toUpperCase())
            );
            if (matchingItems.length === 0) continue;

            // An order can be moved to MIXING if at least one item is moved to PROCESSING
            const hasQueuedItems = matchingItems.some((i: any) => i.status !== 'PROCESSING' && i.status !== 'DONE');

            if (order.status === 'PENDING' && hasQueuedItems) {
                socketRef.current.emit('updateOrderStatus', { orderId: order.orderId, status: 'MIXING', station: 'BDS' });
                setOrders(prev => prev.map(o =>
                    o.orderId === order.orderId ? { ...o, status: 'MIXING' } : o
                ));
            }

            for (const item of matchingItems) {
                if (item.status !== 'PROCESSING' && item.status !== 'DONE') {
                    const token = localStorage.getItem('token');
                    promises.push(
                        axios.patch(`${API_URL}/cafe/order/item/${item.id}/status`, { status: 'PROCESSING' }, {
                            headers: { Authorization: `Bearer ${token}` }
                        })
                            .then(() => {
                                setOrders(prev => prev.map(o =>
                                    o.orderId === order.orderId
                                        ? {
                                            ...o,
                                            items: o.items.map((i: any) =>
                                                i.id === item.id ? { ...i, status: 'PROCESSING' } : i
                                            )
                                        }
                                        : o
                                ));
                            })
                            .catch((err: any) => console.error('Failed to update item to PROCESSING:', err))
                    );
                }
            }
        }

        await Promise.all(promises);
    };

    const bulkUncheckProcessing = async (itemName: string) => {
        const promises: Promise<void>[] = [];

        for (const order of orders) {
            const matchingItems = order.items.filter(
                (item: any) => item.name === itemName && item.status === 'PROCESSING'
            );
            if (matchingItems.length === 0) continue;

            for (const item of matchingItems) {
                const token = localStorage.getItem('token');
                promises.push(
                    axios.patch(`${API_URL}/cafe/order/item/${item.id}/status`, { status: 'QUEUED' }, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                        .then(() => {
                            setOrders(prev => prev.map(o =>
                                o.orderId === order.orderId
                                    ? {
                                        ...o,
                                        items: o.items.map((i: any) =>
                                            i.id === item.id ? { ...i, status: 'QUEUED' } : i
                                        )
                                    }
                                    : o
                            ));
                        })
                        .catch((err: any) => console.error('Failed to update item to QUEUED:', err))
                );
            }
        }

        await Promise.all(promises);
    };

    // Stage 2: Finish — marks items as DONE, but ONLY pure PROCESSING items
    const bulkFinishItem = async (itemName: string) => {
        const promises: Promise<void>[] = [];
        for (const order of orders) {
            for (const item of order.items) {
                const s = item.status?.toUpperCase();
                // Only finish pure PROCESSING items — CANCEL_REQUESTED/CANCEL_REJECTED must be resolved first
                if (item.name === itemName && s === 'PROCESSING') {
                    promises.push(updateStatusForItem(order, item, 'DONE'));
                }
            }
        }
        await Promise.all(promises);
    };

    // Helper: check item-level status (not order-level)
    const hasAnyPending = (itemName: string) =>
        orders.some(order =>
            order.items.some((item: any) =>
                item.name === itemName &&
                !['DONE', 'PROCESSING', 'CANCELLED'].includes(item.status?.toUpperCase())
            )
        );

    // Helper
    const getTimeElapsed = (timestamp: string) => {
        const diff = new Date().getTime() - new Date(timestamp).getTime();
        return Math.floor(diff / 60000);
    };

    // ─── AUDIO GATE ───────────────────────────────────────────────────────────
    if (!audioEnabled) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center space-y-8 max-w-md w-full">
                    <div className="relative w-32 h-32 mx-auto">
                        <div className="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-20"></div>
                        <div className="relative bg-gradient-to-br from-amber-600 to-amber-800 w-full h-full rounded-full flex items-center justify-center shadow-2xl border-4 border-slate-900">
                            <Martini className="w-16 h-16 text-white" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-tight mb-2">BAR DISPLAY</h1>
                        <p className="text-slate-400 text-lg">Sentuh tombol dibawah untuk memulai sistem.</p>
                    </div>
                    <button
                        onClick={enableAudio}
                        className="group w-full py-6 bg-white hover:bg-amber-50 text-slate-900 font-black rounded-3xl text-2xl shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)] transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        <Volume2 className="w-8 h-8 text-amber-600 group-hover:scale-110 transition-transform" />
                        <span>MULAI SHIFT</span>
                    </button>
                </div>
            </div>
        );
    }

    // ─── MAIN RENDER ──────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden selection:bg-amber-500/30">

            {/* CANCELLATION REQUEST MODAL (DANGER) */}
            {cancellationAlert && (
                <div className="fixed inset-0 z-[210] bg-red-950/90 backdrop-blur-2xl flex items-center justify-center p-4 overscroll-contain">
                    <div className="bg-slate-900 border-4 border-red-500 rounded-[3rem] p-8 md:p-12 max-w-3xl w-full text-center shadow-[0_0_100px_rgba(239,68,68,0.4)] relative overflow-hidden animate-bounce-slow">
                        {/* Red Pulse Overlay */}
                        <div className="absolute inset-0 bg-red-600/20 animate-pulse"></div>

                        <div className="relative z-10 space-y-8">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.6)] animate-ping-slow">
                                    <X className="w-12 h-12 text-white" />
                                </div>
                                <h2 className="text-3xl font-black text-red-500 uppercase tracking-[0.2em]">⚠️ PERMINTAAN BATAL ⚠️</h2>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-7xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none">
                                    {cancellationAlert.tableName?.toUpperCase()}
                                </h3>
                                <div className="bg-red-500/20 border border-red-500/30 py-4 px-6 rounded-2xl">
                                    <p className="text-4xl font-black text-red-400 uppercase tracking-tight">
                                        {cancellationAlert.itemName}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleConfirmCancel(cancellationAlert)}
                                        className="flex-1 py-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-2xl rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        <CheckCircle className="w-8 h-8" />
                                        TERIMA BATAL
                                    </button>
                                    <button
                                        onClick={() => handleRejectCancel(cancellationAlert)}
                                        className="flex-1 py-6 bg-red-600 hover:bg-red-500 text-white font-black text-2xl rounded-2xl shadow-xl shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        <X className="w-8 h-8" />
                                        TOLAK BATAL
                                    </button>
                                </div>
                                <button
                                    onClick={stopAlarm}
                                    className="w-full py-4 bg-slate-800 text-slate-400 font-bold rounded-2xl hover:bg-slate-700 transition-colors"
                                >
                                    DIAMKAN ALARM
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW ORDER MODAL */}
            {newOrderAlert && (
                <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200 overscroll-contain">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-2xl w-full text-center shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="absolute inset-0 bg-amber-600/10 animate-pulse"></div>
                        <div className="relative z-10 space-y-8">
                            <div className="inline-flex flex-col items-center gap-3">
                                {newOrderAlert.items.some((i: any) => i.note && i.note.toLowerCase().includes('bundle')) && (
                                    <div className="bg-amber-500 text-black px-4 py-1.5 rounded-full font-black text-sm uppercase tracking-[0.2em] shadow-lg animate-bounce mb-2">
                                        ⚡ PAKET BUNDLING ⚡
                                    </div>
                                )}
                                <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-amber-600/20 text-amber-400 font-bold border border-amber-600/30">
                                    <span>ORDERAN MINUMAN MASUK!</span>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-8xl font-black text-white tracking-tighter mb-2">
                                    {newOrderAlert.tableName
                                        ? newOrderAlert.tableName.toUpperCase()
                                        : (newOrderAlert.tableId ? `MEJA ${newOrderAlert.tableId}` : 'TAKEAWAY')
                                    }
                                </h2>
                                {newOrderAlert.customerName && (
                                    <p className="text-3xl font-medium text-slate-400">{newOrderAlert.customerName}</p>
                                )}
                            </div>
                            <div className="bg-slate-800/50 rounded-2xl p-6 text-left border border-slate-700/50 max-h-[300px] overflow-y-auto">
                                {newOrderAlert.items.map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center py-3 border-b border-slate-700 last:border-0">
                                        <span className="text-2xl font-bold text-slate-200">{item.name}</span>
                                        <span className="text-2xl font-black text-amber-400 bg-amber-400/10 px-4 py-1 rounded-lg">x{item.quantity}</span>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={stopAlarm}
                                className="w-full py-6 bg-amber-500 hover:bg-amber-400 text-black font-black text-3xl rounded-2xl shadow-xl shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center gap-4"
                            >
                                <CheckCircle className="w-10 h-10" />
                                TERIMA ORDER
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-16 md:h-20 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 flex justify-between items-center shadow-2xl z-[160] transition-all duration-300">
                <div className="flex items-center gap-2 md:gap-6">
                    <button
                        onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors text-amber-400"
                    >
                        <Menu className="w-6 h-6 md:w-8 md:h-8" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]'} animate-pulse`} />
                        <h1 className="text-xl md:text-3xl font-black tracking-tighter text-white flex items-center gap-2">
                            <Martini className="w-8 h-8 md:w-10 md:h-10 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                            <span className="hidden sm:inline">BAR CENTER</span>
                            <span className="sm:hidden">BDS</span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-6">
                    <button
                        onClick={() => playVocalAlert('Tes Audio Bartender', false)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] md:text-xs font-black rounded-lg border border-slate-700 text-slate-400 transition-all active:scale-95"
                    >
                        🔊 VERIFIED AUDIO
                    </button>
                    <div className="text-right hidden sm:block border-l border-white/10 pl-6">
                        <div className="text-2xl md:text-3xl font-black font-mono tracking-tighter text-white leading-none">
                            {currentTime.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">
                            {currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                    </div>
                    <button
                        onClick={toggleHistory}
                        className={`p-2.5 md:p-3.5 rounded-2xl transition-all border ${showHistory ? 'bg-amber-600 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-400'}`}
                    >
                        <RotateCcw className={`w-5 h-5 md:w-6 md:h-6 ${showHistory ? 'animate-spin-slow' : ''}`} />
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative pt-16 md:pt-20 flex flex-row bg-[#020617]">

                {/* AGGREGATION SIDEBAR */}
                <aside className={`fixed z-[150] inset-y-0 left-0 w-72 md:w-80 bg-slate-900/60 backdrop-blur-2xl border-r border-white/5 flex flex-col shrink-0 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isSummaryOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}`}>
                    {/* Header */}
                    <div className="p-6 md:p-8 border-b border-white/5 bg-white/[0.02] mt-16 lg:mt-0">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xs font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4" />
                                Live Queue
                            </h2>
                            <button
                                onClick={() => setIsSummaryOpen(false)}
                                className="p-2 rounded-lg hover:bg-white/5 text-slate-500"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-1">
                            <div className="text-3xl font-black text-white tracking-tighter">Ringkasan</div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Antrian Minuman</div>
                        </div>
                    </div>

                    {/* Summary List */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 no-scrollbar pb-32">
                        {aggregatedItems.map((item: any, i: number) => {
                            const anyPending = hasAnyPending(item.name);
                            const isProcessing = item.processingCount > 0;
                            return (
                                <div key={i} className={`group flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-300 ${isProcessing && !anyPending
                                    ? 'bg-amber-500/10 border-amber-500/30'
                                    : 'bg-white/5 border-white/5 hover:bg-white/[0.08] hover:border-amber-500/20'
                                    }`}>
                                    {/* Item Name & Qty */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-slate-200 font-bold text-lg leading-tight truncate">{item.name}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                {item.pendingCount > 0 && (
                                                    <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">{item.pendingCount} ANTRI</span>
                                                )}
                                                {item.processingCount > 0 && (
                                                    <span className="text-[9px] font-black text-amber-300 uppercase tracking-widest">{item.processingCount} MIXING 🍹</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`flex items-center justify-center min-w-[3rem] h-12 rounded-xl border text-2xl font-black font-mono shadow-inner shrink-0 ${isProcessing && !anyPending
                                            ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                                            : 'bg-black/40 border-white/5 text-amber-400'
                                            }`}>
                                            {item.quantity}
                                        </div>
                                    </div>
                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => bulkStartMixing(item.name)}
                                            disabled={!anyPending || item.hasPendingCancel}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-200 active:scale-95 ${anyPending && !item.hasPendingCancel
                                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30 cursor-pointer'
                                                : 'bg-white/5 border-white/5 text-slate-600 cursor-not-allowed opacity-50'
                                                }`}
                                        >
                                            {item.hasPendingCancel ? (
                                                <div className="flex flex-col items-center">
                                                    <AlertCircle className="w-3 h-3 text-red-500 animate-pulse" />
                                                    <span className="text-[8px] text-red-400 mt-0.5">Selesaikan Batal</span>
                                                </div>
                                            ) : (
                                                ' Mulai'
                                            )}
                                        </button>
                                        {item.processingCount > 0 && !item.hasPendingCancel && (
                                            <button
                                                onClick={() => bulkUncheckProcessing(item.name)}
                                                className="px-3 flex items-center justify-center rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 transition-all"
                                                title="Uncheck/Cancel Mulai"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => bulkFinishItem(item.name)}
                                            disabled={!item.readyToFinishCount || item.readyToFinishCount === 0 || item.hasRejected || item.hasPendingCancel}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-200 active:scale-95 ${item.readyToFinishCount > 0 && !item.hasRejected && !item.hasPendingCancel
                                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 cursor-pointer'
                                                : 'bg-white/5 border-white/5 text-slate-600 cursor-not-allowed opacity-50'
                                                }`}
                                        >
                                            {item.hasPendingCancel ? (
                                                <div className="flex flex-col items-center">
                                                    <AlertCircle className="w-3 h-3 text-red-500 animate-pulse" />
                                                    <span className="text-[8px] text-red-400 mt-0.5">Selesaikan Batal</span>
                                                </div>
                                            ) : item.hasRejected ? (
                                                <><Ban className="w-3 h-3 text-red-500" /> Ditolak</>
                                            ) : (
                                                <><CheckCircle className="w-3 h-3" /> Selesai</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {aggregatedItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4 opacity-20">
                                <div className="p-6 rounded-full bg-slate-800/50">
                                    <Martini className="w-12 h-12 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">Bar Bersih</p>
                                    <p className="text-xs font-bold text-slate-600 mt-1 uppercase">Semua pesanan selesai</p>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main Grid */}
                <div className={`h-full flex-1 p-4 md:p-8 overflow-y-auto transition-all duration-500 no-scrollbar ${isSummaryOpen ? 'lg:pl-[320px]' : ''} ${showHistory ? 'opacity-0 scale-95 translate-x-full' : 'opacity-100 scale-100 translate-x-0'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-24 max-w-[1600px] mx-auto">
                        {orders.map((order) => {
                            const elapsed = getTimeElapsed(order.timestamp);
                            const isLate = elapsed > 10 && order.status !== 'READY';

                            return (
                                <div
                                    key={order.orderId}
                                    className={`relative group rounded-[2.5rem] flex flex-col h-full overflow-hidden transition-all duration-500 hover:shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] border-2 ${isLate ? 'bg-red-950/40 border-red-500/50 shadow-[0_0_40px_-10px_rgba(239,68,68,0.2)]' :
                                        order.status === 'READY' ? 'bg-emerald-950/40 border-emerald-500/50' :
                                            order.status === 'MIXING' ? 'bg-amber-950/40 border-amber-500/50' :
                                                'bg-slate-900/40 border-white/5 hover:border-amber-500/40'
                                        } backdrop-blur-xl`}
                                >
                                    <div className="p-6 md:p-8 flex flex-col h-full">
                                        {/* Card Header */}
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm ${isLate ? 'bg-red-500 text-white' :
                                                        order.status === 'READY' ? 'bg-emerald-500 text-white' :
                                                            order.status === 'MIXING' ? 'bg-amber-500 text-black' :
                                                                'bg-amber-600 text-white'
                                                        }`}>
                                                        {order.status === 'MIXING' ? 'MIXING' : order.status}
                                                    </span>
                                                    {(() => {
                                                        const kdsItems = order.items.filter((i: any) => i.station === 'KDS');
                                                        if (kdsItems.length === 0) return null;
                                                        const kdsDone = kdsItems.every((i: any) => i.status === 'DONE');
                                                        const kdsRemaining = kdsItems.filter((i: any) => i.status !== 'DONE').length;

                                                        return (
                                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border shadow-sm ${kdsDone ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                                                KDS: {kdsDone ? 'READY!' : `${kdsRemaining} LEFT`}
                                                            </span>
                                                        );
                                                    })()}
                                                    {order.items.some((i: any) => i.note && i.note.toLowerCase().includes('bundle')) && (
                                                        <span className="bg-amber-500 text-black text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter shadow-sm border border-amber-400">
                                                            BUNDLING
                                                        </span>
                                                    )}
                                                    <span className="text-slate-500 text-xs font-mono font-bold">ID: {order.orderId.slice(-4)}</span>
                                                </div>
                                                <h3 className="text-4xl font-black text-white tracking-tighter drop-shadow-sm">
                                                    {order.tableName || (order.tableId ? `M-${order.tableId}` : 'WALK-IN')}
                                                </h3>
                                                {order.customerName && order.customerName !== 'Guest' && (
                                                    <div className="flex items-center gap-1.5 text-slate-400">
                                                        <div className="w-1 h-1 rounded-full bg-slate-600" />
                                                        <p className="text-sm font-bold truncate max-w-[150px]">{order.customerName}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl border-2 transition-colors ${isLate ? 'border-red-500/40 bg-red-500/10 text-red-500' : 'border-white/10 bg-white/5 text-slate-400'}`}>
                                                <span className="text-xl font-black leading-none">{elapsed}</span>
                                                <span className="text-[9px] uppercase font-black tracking-widest mt-0.5 opacity-60">Mins</span>
                                            </div>
                                        </div>

                                        {/* Item List */}
                                        <div className="flex-1 space-y-4 mb-8">
                                            {order.items.filter((i: any) => i.station === 'BDS').map((item: any, idx: number) => (
                                                <div key={idx} className={`group/item flex flex-col gap-1.5 p-2 rounded-2xl transition-all ${item.status === 'CANCEL_REQUESTED' ? 'bg-red-500/20 animate-pulse border border-red-500/50' : ''}`}>
                                                    <div className="flex justify-between items-center gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <button
                                                                disabled={item.status === 'CANCEL_REQUESTED'}
                                                                onClick={() => updateStatusForItem(order, item, item.status === 'DONE' ? 'PENDING' : 'DONE')}
                                                                className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all duration-300 ${item.status === 'DONE'
                                                                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                                                    : item.status === 'PROCESSING'
                                                                        ? 'bg-blue-500 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                                                        : item.status === 'CANCEL_REJECTED'
                                                                            ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)] animate-pulse'
                                                                            : 'border-white/10 hover:border-emerald-500/50 text-transparent hover:text-emerald-500/50'
                                                                    }`}
                                                            >
                                                                {item.status === 'CANCEL_REQUESTED' ? <X className="w-5 h-5" /> :
                                                                    item.status === 'CANCEL_REJECTED' ? <Ban className="w-5 h-5" /> :
                                                                        <CheckCircle className="w-5 h-5" />}
                                                            </button>
                                                            <span className={`text-xl font-bold leading-tight transition-all duration-300 ${item.status === 'DONE' || order.status === 'READY' ? 'text-emerald-400/40 line-through' : 'text-slate-100'}`}>
                                                                {item.status === 'CANCEL_REJECTED' && (
                                                                    <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded-lg mr-2 animate-pulse">
                                                                        <Ban className="w-3 h-3 text-orange-500" />
                                                                        <span className="text-[10px] font-black text-orange-400">DITOLAK</span>
                                                                    </div>
                                                                )}
                                                                {item.name}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {item.status === 'CANCEL_REQUESTED' && (
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => handleConfirmCancel(item)}
                                                                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg animate-pulse flex items-center justify-center gap-1"
                                                                    >
                                                                        <CheckCircle className="w-3 h-3" /> Terima
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRejectCancel(item)}
                                                                        className="flex-1 bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-1"
                                                                    >
                                                                        <X className="w-3 h-3" /> Tolak
                                                                    </button>
                                                                </div>
                                                            )}
                                                            <div className={`text-xl font-black px-3 py-1 rounded-xl transition-all duration-300 ${item.status === 'DONE' || order.status === 'READY' ? 'bg-emerald-500/10 text-emerald-400/40' : 'bg-white/5 text-white shadow-sm'}`}>
                                                                {item.quantity}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {item.note && (
                                                        <div className="ml-12 text-sm font-bold text-amber-400/80 bg-amber-400/5 px-3 py-1.5 rounded-xl border border-amber-400/10 italic">
                                                            "{item.note}"
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Action Button */}
                                        <div className="mt-auto pt-4 border-t border-white/5">
                                            {(() => {
                                                const hasPendingCancel = order.items.some((i: any) => i.status === 'CANCEL_REQUESTED');

                                                if (order.status === 'PENDING') return (
                                                    <button
                                                        disabled={hasPendingCancel}
                                                        onClick={() => updateStatus(order, 'MIXING')}
                                                        className={`group w-full py-5 rounded-2xl font-black text-xl tracking-tight shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${hasPendingCancel
                                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5 opacity-50'
                                                            : 'bg-amber-400 hover:bg-amber-300 text-black hover:shadow-amber-400/20'
                                                            }`}
                                                    >
                                                        {hasPendingCancel ? (
                                                            <>
                                                                <AlertCircle className="w-6 h-6 text-red-500 animate-pulse" />
                                                                <span className="uppercase text-sm">Selesaikan Batal</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span>MULAI MIXING</span>
                                                                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                                            </>
                                                        )}
                                                    </button>
                                                );

                                                if (order.status === 'MIXING') return (
                                                    <button
                                                        disabled={hasPendingCancel}
                                                        onClick={() => updateStatus(order, 'READY')}
                                                        className={`group w-full py-5 rounded-2xl font-black text-xl tracking-tight shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${hasPendingCancel
                                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5 opacity-50'
                                                            : 'bg-emerald-500 hover:bg-emerald-400 text-white hover:shadow-emerald-500/20'
                                                            }`}
                                                    >
                                                        {hasPendingCancel ? (
                                                            <>
                                                                <AlertCircle className="w-6 h-6 text-red-500 animate-pulse" />
                                                                <span className="uppercase text-sm">Selesaikan Batal</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span>SELESAI MIXING</span>
                                                                <CheckCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                                            </>
                                                        )}
                                                    </button>
                                                );

                                                if (order.status === 'READY') return (
                                                    <button
                                                        disabled={hasPendingCancel}
                                                        onClick={() => updateStatus(order, 'SERVED')}
                                                        className={`w-full py-5 rounded-2xl font-black text-xl tracking-tight border transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${hasPendingCancel
                                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-white/5 opacity-50'
                                                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                                                            }`}
                                                    >
                                                        {hasPendingCancel ? (
                                                            <>
                                                                <AlertCircle className="w-6 h-6 text-red-500 animate-pulse" />
                                                                <span className="uppercase text-sm">Selesaikan Batal</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span>DIAMBIL WAITER</span>
                                                                <CheckCircle className="w-6 h-6 text-emerald-500" />
                                                            </>
                                                        )}
                                                    </button>
                                                );

                                                return null;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Empty State */}
                        {orders.length === 0 && (
                            <div className="col-span-full h-[60vh] flex flex-col items-center justify-center text-slate-800 animate-in fade-in zoom-in duration-1000">
                                <Martini className="w-32 h-32 mb-6 opacity-10" />
                                <h2 className="text-4xl font-black text-white/20 tracking-tighter">BAR STANDBY</h2>
                                <p className="text-lg font-bold text-slate-600 mt-2 uppercase tracking-[0.3em]">Waiting for new orders</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* History Panel Overlay */}
            <div className={`fixed inset-y-0 right-0 w-full md:w-[600px] lg:w-[700px] bg-slate-900 shadow-[0_0_100px_rgba(0,0,0,0.8)] z-[200] transform transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] border-l border-white/5 ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-full flex flex-col bg-slate-900/95 backdrop-blur-3xl">
                    <div className="p-8 border-b border-white/5 flex flex-col gap-6 bg-white/[0.02]">
                        <div className="flex justify-between items-center">
                            <h2 className="text-4xl font-black text-white flex items-center gap-4 tracking-tighter">
                                <RotateCcw className="w-10 h-10 text-amber-500" />
                                Riwayat Order
                            </h2>
                            <button
                                onClick={toggleHistory}
                                className="p-3 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white border border-white/5 active:scale-90"
                            >
                                <X className="w-8 h-8" />
                            </button>
                        </div>
                        {/* Search Bar */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-6 w-6 text-slate-500 group-focus-within:text-amber-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-12 pr-4 py-4 border border-white/10 rounded-2xl leading-5 bg-black/40 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-bold"
                                placeholder="Cari nomor meja, nama customer..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                        {stationSummary && (
                            <div className="mb-8 p-6 bg-amber-500/10 border border-amber-500/30 rounded-3xl">
                                <h3 className="text-xl font-black text-amber-400 mb-4 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    Daily Summary (BDS)
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Items</div>
                                        <div className="text-3xl font-black text-white">{stationSummary.totalItems}</div>
                                    </div>
                                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Orders</div>
                                        <div className="text-3xl font-black text-white">{orders.length}</div>
                                    </div>
                                </div>
                                {stationSummary.itemsJson && (
                                    <div className="mt-4 p-4 bg-black/20 rounded-2xl border border-white/5 space-y-2">
                                        {Object.entries(JSON.parse(stationSummary.itemsJson)).map(([name, count]: any) => (
                                            <div key={name} className="flex justify-between items-center text-sm">
                                                <span className="text-slate-400 font-medium">{name}</span>
                                                <span className="text-white font-black">x{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {historyOrders
                                .filter(order => {
                                    // Filter by current day
                                    const orderDate = new Date(order.timestamp).toISOString().split('T')[0];
                                    const today = new Date().toISOString().split('T')[0];
                                    return orderDate === today;
                                })
                                .filter(order =>
                                    order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    order.tableName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    order.tableId?.toString().includes(searchQuery) ||
                                    order.orderId?.includes(searchQuery)
                                ).map((order) => (
                                    <div key={order.orderId} className="group bg-white/5 hover:bg-white/10 rounded-[2rem] p-6 border border-white/5 hover:border-amber-500/30 transition-all duration-300 hover:shadow-2xl flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="font-black text-2xl text-white tracking-tighter group-hover:text-amber-300 transition-colors">
                                                    {order.tableName || 'WALK-IN'}
                                                </div>
                                                <div className="text-sm font-bold text-slate-500 mt-1 flex items-center gap-2">
                                                    <span className="truncate max-w-[120px]">{order.customerName}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                                    <span className="font-mono opacity-60">#{order.orderId.substring(order.orderId.length - 4)}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">COMPLETED</div>
                                                <div className="font-mono text-slate-400 font-bold text-sm">
                                                    {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 flex-1 border-t border-white/5 pt-4 mt-2">
                                            {order.items.filter((item: any) => item.station === 'BDS').map((item: any, i: number) => (
                                                <div key={i} className="flex justify-between items-start text-xs">
                                                    <span className="text-slate-400 font-bold leading-snug">{item.name}</span>
                                                    <span className="font-black text-slate-200 bg-white/5 px-2 py-0.5 rounded-lg ml-3 whitespace-nowrap">x{item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                SERVED
                                            </span>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {historyOrders.length === 0 && (
                            <div className="h-[50vh] flex flex-col items-center justify-center text-slate-700 opacity-20">
                                <RotateCcw className="w-20 h-20 mb-4" />
                                <p className="text-xl font-black uppercase tracking-widest">No History</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Stats Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-slate-900/40 backdrop-blur-3xl border-t border-white/5 p-4 md:p-6 z-[180] transition-all duration-500">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex-1 flex justify-around items-center">
                        <div className="text-center group cursor-help transition-all hover:scale-110">
                            <div className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-1.5">Total Orders</div>
                            <div className="text-3xl md:text-4xl font-black text-white leading-none tracking-tighter drop-shadow-lg">{orders.length}</div>
                        </div>
                        <div className="w-px h-12 bg-white/5 mx-4 md:mx-8" />
                        <div className="text-center group cursor-help transition-all hover:scale-110">
                            <div className="text-amber-500/80 text-[9px] font-black uppercase tracking-[0.2em] mb-1.5">Queued</div>
                            <div className="text-3xl md:text-4xl font-black text-amber-400 leading-none tracking-tighter drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">{orders.filter(o => o.status === 'PENDING').length}</div>
                        </div>
                        <div className="w-px h-12 bg-white/5 mx-4 md:mx-8" />
                        <div className="text-center group cursor-help transition-all hover:scale-110">
                            <div className="text-purple-500/80 text-[9px] font-black uppercase tracking-[0.2em] mb-1.5">Mixing</div>
                            <div className="text-3xl md:text-4xl font-black text-purple-400 leading-none tracking-tighter drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">{orders.filter(o => o.status === 'MIXING').length}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
