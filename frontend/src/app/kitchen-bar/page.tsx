'use client';

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { kdsSocket } from '@/lib/socket';
import {
    Terminal, Clock, ChefHat, Bell, CheckCircle, RotateCcw, X, Volume2, Box, Menu,
    ChevronLeft, ChevronRight, LayoutGrid, Search, RotateCw, Ban, AlertCircle, ClipboardCheck
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/components/ui/AlertProvider';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useLanguage } from '@/context/LanguageContext';

export default function KitchenBarUnifiedPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { showConfirm, showAlert } = useAlert();
    const { t } = useLanguage();
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

    const [selectedStation, setSelectedStation] = useState<string>('ALL');
    const selectedStationRef = useRef('ALL');

    useEffect(() => {
        selectedStationRef.current = selectedStation;
    }, [selectedStation]);

    // New Order Alert State
    const [newOrderAlert, setNewOrderAlert] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSummaryOpen, setIsSummaryOpen] = useState(true);
    const [stationSummary, setStationSummary] = useState<any>(null);
    const [cancellationAlert, setCancellationAlert] = useState<any | null>(null);

    useBodyScrollLock(!!cancellationAlert || !!newOrderAlert);
    const audioContextRef = useRef<AudioContext | null>(null);
    const beepIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioEnabledRef = useRef(false); // Ref to track enabled state in callbacks
    const ttsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isVocalAlertActiveRef = useRef(false);

    // Alert queue: antrian order yang belum dikonfirmasi oleh staff
    const alertQueueRef = useRef<any[]>([]);
    // Track apakah ada alert yang sedang ditampilkan (pakai ref untuk hindari stale closure)
    const alertActiveRef = useRef(false);
    // Queue count sebagai state agar badge re-render
    const [queueCount, setQueueCount] = useState(0);
    // Deduplication: track item IDs yang sudah diterima via MQTT
    const seenItemIdsRef = useRef<Set<number>>(new Set());
    // Periodic sync interval ref
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Clock Interval
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!user) return; // Wait until AuthContext provides user to ensure axios interceptor has token
        
        // Fetch existing active orders
        fetchActiveOrders();

        // ── Socket.io Setup (Legacy MQTT fallback removed due to connection issues) ──
        const socket = kdsSocket;
        
        const onConnect = () => {
            console.log(`[KDS] Socket.io Connected (station: ${selectedStationRef.current})`);
            setIsConnected(true);
        };

        const onReconnect = (attempt: number) => {
            console.log(`[KDS] Socket.io Reconnecting... Attempt: ${attempt}`);
            setIsConnected(false);
        };

        const onConnectError = (err: any) => {
            console.error('[KDS] Socket.io Connection Error:', err);
            setIsConnected(false);
        };

        const onDisconnect = (reason: string) => {
            console.warn('[KDS] Socket.io Disconnected:', reason);
            setIsConnected(false);
        };

        const onNewOrder = (data: any) => {
            const station = selectedStationRef.current;
            console.log(`[KDS][Socket] New Order Received:`, data);
            
            // Check if any item belongs to KDS or BDS
            const matchingItems = (data.items || []).filter(
                (i: any) => ['KDS', 'BDS'].includes(i.station?.toUpperCase())
            );

            if (matchingItems.length > 0) {
                // Remove duplicates handling for now to ensure rendering
                const newItems = matchingItems.filter((i: any) => {
                    if (seenItemIdsRef.current.has(i.id)) return false;
                    seenItemIdsRef.current.add(i.id);
                    return true;
                });
                
                if (newItems.length === 0) return;

                const filteredOrder = { ...data, items: newItems };
                setOrders((prev) => {
                    const existingIdx = prev.findIndex(o => o.orderId === data.orderId);
                    if (existingIdx >= 0) {
                        const existing = prev[existingIdx];
                        const merged = [...(existing.items || []), ...newItems];
                        const updated = [...prev];
                        updated[existingIdx] = { ...existing, items: merged };
                        return updated;
                    }
                    return [filteredOrder, ...prev];
                });

                const isBundle = (data.items || []).some((i: any) => i.note && i.note.toLowerCase().includes('bundle'));
                const itemNames = newItems.map((i: any) => `${i.quantity} ${i.name || i.menuItem?.name || 'Menu'} `).join(', ');
                const location = data.tableName || (data.tableId ? `Meja ${data.tableId}` : 'Takeaway');
                const alertText = isBundle
                    ? `Perhatian! Orderan Paket Bundling masuk. ${location}. Pesanan: ${itemNames}`
                    : `Orderan masuk. ${location}. Pesanan: ${itemNames}`;

                enqueueAlert(filteredOrder, alertText, true);
            }
        };

        const onStatusUpdated = (data: any) => {
            console.log('[KDS][Socket] Order Status Updated:', data);
            const isFinished = ['SERVED', 'DONE', 'CANCELLED'].includes(data.status?.toUpperCase() || '');
            setOrders((prev) => {
                return prev.map((o) => {
                    if (o.orderId !== data.orderId) return o;
                    if (isFinished) {
                        (o.items || []).forEach((i: any) => seenItemIdsRef.current.delete(i.id));
                        return null;
                    }
                    const updatedItems = (o.items || []).map((item: any) => {
                        if (!data.station || item.station?.toUpperCase() === data.station?.toUpperCase()) {
                            return { ...item, status: data.status === 'READY' ? 'DONE' : data.status };
                        }
                        return item;
                    });
                    const allDone = updatedItems.every((i: any) => ['DONE', 'CANCELLED'].includes(i.status?.toUpperCase() || ''));
                    if (allDone) {
                        updatedItems.forEach((i: any) => seenItemIdsRef.current.delete(i.id));
                        return null;
                    }
                    const hasCooking = updatedItems.some((i: any) => ['PROCESSING','CANCEL_REQUESTED','CANCEL_REJECTED'].includes(i.status));
                    return { ...o, items: updatedItems, status: hasCooking ? 'COOKING' : 'PENDING' };
                }).filter(Boolean) as any[];
            });
        };

        const onOrderItemUpdated = (data: any) => {
            console.log('[KDS][Socket] Order Item Updated:', data);
            setOrders((prev) => prev.map(o => {
                if ((o.items || []).some((i: any) => i.id === data.id)) {
                    const updatedItems = (o.items || []).map((i: any) => i.id === data.id ? { ...i, status: data.status } : i);
                    
                    const allDone = updatedItems.every((i: any) => ['DONE', 'CANCELLED'].includes(i.status?.toUpperCase() || ''));
                    if (allDone) {
                        return null;
                    }

                    const hasCooking = updatedItems.some((i: any) => i.status === 'PROCESSING' || i.status === 'CANCEL_REQUESTED' || i.status === 'CANCEL_REJECTED');
                    return { ...o, items: updatedItems, status: hasCooking ? 'COOKING' : 'PENDING' };
                }
                return o;
            }).filter(Boolean) as any[]);
        };

        const onItemCancelled = (data: any) => {
            const station = selectedStationRef.current;
            console.log('[KDS][Socket] Item Cancelled:', data);
            let itemStation = '';
            ordersRef.current.forEach(o => {
                const item = (o.items || []).find((i: any) => i.id === data.id);
                if (item) itemStation = item.station?.toUpperCase() || '';
            });

            // 🛡️ FIX: Hapus item dari seenItemIdsRef agar re-order item yang sama
            // (dengan ID baru) bisa masuk ke KDS tanpa terblokir sebagai duplikat
            seenItemIdsRef.current.delete(data.id);

            setOrders((prev) => prev.map(o => {
                const newItems = (o.items || []).filter((i: any) => i.id !== data.id);
                if (newItems.length === 0) return null;
                return { ...o, items: newItems };
            }).filter(Boolean) as any[]);

            if (audioEnabledRef.current && ['KDS', 'BDS'].includes(itemStation)) {
                playBeep(true);
                setTimeout(() => stopBeep(), 1000);
                const location = data.tableName || 'MEJA';
                const itemName = data.itemName || 'PESANAN';
                const alertText = `KONFIRMASI: ITEM ${itemName} DI ${location} TELAH DIHAPUS.`;
                playVocalAlert(alertText, false, true);
            }
        };

        const onCancellationRequested = (data: any) => {
            const station = selectedStationRef.current;
            console.log('[KDS][Socket] Cancellation Requested:', data);
            const itemFoundInStation = ordersRef.current.some(o =>
                (o.items || []).some((i: any) => i.id === data.id && ['KDS', 'BDS'].includes(i.station?.toUpperCase()))
            );

            setOrders((prev) => prev.map(o => {
                const targetItem = (o.items || []).find((i: any) => i.id === data.id);
                if (targetItem) {
                    return {
                        ...o,
                        items: (o.items || []).map((i: any) => i.id === data.id ? { ...i, status: 'CANCEL_REQUESTED' } : i)
                    };
                }
                return o;
            }));

            if (['KDS', 'BDS'].includes(data.station?.toUpperCase()) && itemFoundInStation) {
                const location = data.tableName || (data.tableId ? `Meja ${data.tableId}` : 'Pesanan Tanpa Meja');
                const alertText = `PERHATIAN! ADA PERMINTAAN BATAL DI ${location}. MENU: ${data.itemName}. HARAP TINDAK LANJUTI SEGERA.`;
                setCancellationAlert({ ...data, alertText });
                playVocalAlert(alertText, true, true);
            }
        };

        const onCancellationRejected = (data: any) => {
            setOrders((prev) => prev.map(o => {
                if ((o.items || []).some((i: any) => i.id === data.id)) {
                    const updatedItems = (o.items || []).map((i: any) => i.id === data.id ? { ...i, status: 'CANCEL_REJECTED' } : i);
                    const hasCooking = updatedItems.some((i: any) => i.status === 'PROCESSING' || i.status === 'CANCEL_REQUESTED' || i.status === 'CANCEL_REJECTED');
                    return { ...o, items: updatedItems, status: hasCooking ? 'COOKING' : 'PENDING' };
                }
                return o;
            }));
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);
        socket.on('reconnect_attempt', onReconnect);
        socket.on('newOrder', onNewOrder);
        socket.on('statusUpdated', onStatusUpdated);
        socket.on('orderItemUpdated', onOrderItemUpdated);
        socket.on('itemCancelled', onItemCancelled);
        socket.on('cancellationRequested', onCancellationRequested);
        socket.on('cancellationRejected', onCancellationRejected);

        if (socket.connected) {
            setIsConnected(true);
        } else {
            socket.connect();
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.off('reconnect_attempt', onReconnect);
            socket.off('newOrder', onNewOrder);
            socket.off('statusUpdated', onStatusUpdated);
            socket.off('orderItemUpdated', onOrderItemUpdated);
            socket.off('itemCancelled', onItemCancelled);
            socket.off('cancellationRequested', onCancellationRequested);
            socket.off('cancellationRejected', onCancellationRejected);
            if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
            if (syncIntervalRef.current) { clearInterval(syncIntervalRef.current); syncIntervalRef.current = null; }
        };
    }, [selectedStation, user]); // Re-run when station or user changes changes

    // ── Periodic re-sync setiap 30 detik sbg safety net jika ada MQTT message yang terlewat
    useEffect(() => {
        const interval = setInterval(() => {
            console.log('[KDS] Periodic re-sync active orders...');
            fetchActiveOrders();
        }, 30000);
        syncIntervalRef.current = interval;
        return () => clearInterval(interval);
    }, [selectedStation]);

    const fetchActiveOrders = async () => {
        try {
            const res = await axios.get(`/cafe/orders/active`);
            // Show orders that have at least one station item that is NOT DONE
            // We KEEP full items to preserve cross-station status visibility
            const filteredOrders = res.data.filter((order: any) =>
                (order.items || []).some((i: any) => 
                    ['KDS', 'BDS'].includes(i.station?.toUpperCase()) && 
                    !['DONE', 'CANCELLED'].includes(i.status?.toUpperCase() || '')
                )
            );
            // 🛡️ Rebuild seenItemIdsRef from fresh server data to stay in sync.
            // This prevents blocking re-ordered items after a periodic sync.
            const freshIds = new Set<number>();
            filteredOrders.forEach((order: any) =>
                (order.items || []).forEach((i: any) => freshIds.add(i.id))
            );
            seenItemIdsRef.current = freshIds;

            setOrders(filteredOrders.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
        } catch (error) {
            console.error("Failed to load active orders", error);
        }
    };
    const fetchHistory = async () => {
        try {
            const res = await axios.get(`/cafe/orders/history`);
            // Keeping all items for history logic, but will filter in UI
            const filteredHistory = res.data.filter((order: any) =>
                order.items.some((i: any) => ['KDS', 'BDS'].includes(i.station?.toUpperCase()))
            );
            setHistoryOrders(filteredHistory.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
            fetchStationSummary();
        } catch (error) {
            console.error("Failed to load history", error);
        }
    };

    const fetchStationSummary = async () => {
        try {
            // We fetch both summaries
            const resKds = await axios.get(`/cafe/summary/KDS`);
            const resBds = await axios.get(`/cafe/summary/BDS`);
            setStationSummary({
               totalOrders: (resKds.data?.totalOrders || 0) + (resBds.data?.totalOrders || 0),
               pendingOrders: (resKds.data?.pendingOrders || 0) + (resBds.data?.pendingOrders || 0),
               completedOrders: (resKds.data?.completedOrders || 0) + (resBds.data?.completedOrders || 0),
            });
        } catch (error) {
            console.error('Failed to fetch station summary', error);
        }
    };

    const toggleHistory = () => {
        if (!showHistory) fetchHistory();
        setShowHistory(!showHistory);
    };

    // Aggregate active items for the chef summary — track per-status counts
    const aggregatedItems = (orders || []).reduce((acc: any[], order) => {
        (order.items || []).forEach((item: any) => {
            const s = item.status?.toUpperCase() || '';
            if (s === 'DONE' || s === 'CANCELLED') return;
            // In Unified mode, include both
            if (item.station && !['KDS', 'BDS'].includes(item.station?.toUpperCase())) return;

            const isInProcessingFamily = ['PROCESSING', 'CANCEL_REQUESTED', 'CANCEL_REJECTED'].includes(s);
            const isReadyToFinish = s === 'PROCESSING'; // Only pure PROCESSING can be finished
            const isRejected = s === 'CANCEL_REJECTED';
            const isPendingCancel = s === 'CANCEL_REQUESTED';
            const qty = Number(item.quantity) || 1;

            const existing = acc.find(i => i.name === item.name);
            if (existing) {
                existing.quantity += qty;
                if (isInProcessingFamily) {
                    existing.processingCount = (existing.processingCount || 0) + qty;
                } else {
                    existing.pendingCount = (existing.pendingCount || 0) + qty;
                }
                if (isReadyToFinish) {
                    existing.readyToFinishCount = (existing.readyToFinishCount || 0) + qty;
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
                    quantity: qty,
                    pendingCount: isInProcessingFamily ? 0 : qty,
                    processingCount: isInProcessingFamily ? qty : 0,
                    readyToFinishCount: isReadyToFinish ? qty : 0,
                    hasRejected: isRejected,
                    hasPendingCancel: isPendingCancel
                });
            }
        });
        return acc;
    }, []).sort((a: any, b: any) => b.quantity - a.quantity);

    const stopBeep = () => {
        if (beepIntervalRef.current) {
            clearInterval(beepIntervalRef.current);
            beepIntervalRef.current = null;
        }
    };

    const playBeep = (isDanger = false) => {
        if (!audioEnabledRef.current) return;
        // ALWAYS stop previous beep before starting new one — prevents interval leak
        stopBeep();
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
                    oscillator.type = 'square';
                    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
                    oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
                    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
                    oscillator.start(ctx.currentTime);
                    oscillator.stop(ctx.currentTime + 0.35);
                } else {
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
                    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                    oscillator.start(ctx.currentTime);
                    oscillator.stop(ctx.currentTime + 0.5);
                }
            };

            beepOnce();
            beepIntervalRef.current = setInterval(beepOnce, isDanger ? 500 : 2000);
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    };

    const playVocalAlert = (text: string, loop = true, isDanger = false) => {
        console.log(`[AUDIO] playVocalAlert: "${text}" (loop=${loop}, isDanger=${isDanger}, audioEnabled=${audioEnabledRef.current})`);
        if (!audioEnabledRef.current) return;

        // Stop any currently playing alert first (prevents overlap + beep leak)
        if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
        if ((window as any).AndroidBridge && typeof (window as any).AndroidBridge.stopSpeech === 'function') {
            (window as any).AndroidBridge.stopSpeech();
        } else if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        stopBeep();

        isVocalAlertActiveRef.current = true;

        const speak = () => {
            if (!audioEnabledRef.current || !isVocalAlertActiveRef.current) return;
            
            if ((window as any).AndroidBridge && typeof (window as any).AndroidBridge.speakText === 'function') {
                (window as any).AndroidBridge.speakText(text, isDanger);
                if (loop && isVocalAlertActiveRef.current) {
                    const words = text.split(' ').length;
                    const duration = Math.max(3000, words * 400 + (isDanger ? 1000 : 4000));
                    ttsTimeoutRef.current = setTimeout(speak, duration);
                }
            } else if ('speechSynthesis' in window) {
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
                    // Do not log or restart loop if it was intentionally interrupted/cancelled
                    if (e.error !== 'interrupted' && e.error !== 'canceled') {
                        console.error("TTS Error:", e);
                        if (loop && isVocalAlertActiveRef.current) {
                            ttsTimeoutRef.current = setTimeout(speak, 6000);
                        }
                    }
                };

                window.speechSynthesis.speak(utterance);
            }
        };

        speak();
        if (loop) playBeep(isDanger);
    };

    /**
     * Tambahkan order ke antrian alert.
     * Jika belum ada alert aktif, tampilkan langsung.
     * Jika sudah ada, masukkan ke antrian — akan tampil setelah yang sekarang di-dismiss.
     */
    const enqueueAlert = (order: any, alertText: string, isDanger = true) => {
        alertQueueRef.current.push({ order, alertText, isDanger });
        setQueueCount(alertQueueRef.current.length);
        if (!alertActiveRef.current) {
            showNextAlert();
        }
    };

    /**
     * Tampilkan alert berikutnya dari antrian.
     * Restart alarm suara hanya untuk alert yang sedang ditampilkan.
     */
    const showNextAlert = () => {
        const next = alertQueueRef.current.shift();
        setQueueCount(alertQueueRef.current.length);
        if (!next) {
            alertActiveRef.current = false;
            isVocalAlertActiveRef.current = false;
            if (ttsTimeoutRef.current) { clearTimeout(ttsTimeoutRef.current); ttsTimeoutRef.current = null; }
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            stopBeep();
            setNewOrderAlert(null);
            return;
        }
        alertActiveRef.current = true;
        setNewOrderAlert(next.order);
        if (audioEnabledRef.current) playVocalAlert(next.alertText, true, next.isDanger);
    };

    const stopAlarm = () => {
        alertQueueRef.current = [];
        alertActiveRef.current = false;
        setQueueCount(0);
        isVocalAlertActiveRef.current = false;
        if (ttsTimeoutRef.current) { clearTimeout(ttsTimeoutRef.current); ttsTimeoutRef.current = null; }
        if ((window as any).AndroidBridge && typeof (window as any).AndroidBridge.stopSpeech === 'function') {
            (window as any).AndroidBridge.stopSpeech();
        } else if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
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

        // Test TTS
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance("Sistem Kitchen Terhubung, Semangat bekerja jangan lupa berdoa");
            utterance.lang = 'id-ID';
            window.speechSynthesis.speak(utterance);
        }
    };

    const updateStatus = async (order: any, nextStatus: string) => {
        stopAlarm(); // Stop alarm if playing

        // Map internal status to backend status
        const statusMap: any = { 'COOKING': 'PROCESSING', 'READY': 'DONE', 'SERVED': 'DONE' };
        const backendStatus = statusMap[nextStatus];

        if (backendStatus) {
            try {
                // Update each item in the database — backend will broadcast via MQTT
                for (const item of order.items) {
                    if (item.id && item.status !== 'DONE') {
                        await axios.patch(`/cafe/order/item/${item.id}/status`, {
                            status: backendStatus
                        });
                    }
                }
                // If order is done, remove it or move it to history locally after delay
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
            // Update single item in backend
            await axios.patch(`/cafe/order/item/${item.id}/status`, {
                status: nextStatus
            });

            // Update local state
            setOrders(prev => {
                const newOrders = prev.map(o => {
                    if (o.orderId === order.orderId) {
                        const newItems = o.items.map((i: any) =>
                            i.id === item.id ? { ...i, status: nextStatus } : i
                        );

                        // Check if ALL items in this order are now DONE or CANCELLED
                        const allDone = newItems.every((i: any) => ['DONE', 'CANCELLED'].includes(i.status?.toUpperCase() || ''));
                        const currentStatus = allDone ? 'READY' : o.status;

                        // Jika semua sudah selesai, hilangkan kartu langsung (optimistic UI)
                        if (allDone) {
                            return null;
                        }

                        return { ...o, items: newItems, status: currentStatus };
                    }
                    return o;
                });
                return newOrders.filter(Boolean) as any[];
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
            const confirmerName = user?.name || "Staff Dapur";
            await axios.patch(`/cafe/order/item/${item.id}/confirm-cancel`, {
                user: confirmerName
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
            `Apakah Anda yakin ingin MENOLAK pembatalan "${item.itemName}"? Makanan harus tetap dikirim.`
        );
        if (!confirmed) return;

        try {
            const rejecterName = user?.name || "Staff Dapur";
            await axios.patch(`/cafe/order/item/${item.id}/reject-cancel`, {
                user: rejecterName
            });
            stopAlarm();
            showAlert("Ditolak", "Permintaan pembatalan telah ditolak.", { variant: "warning" });
        } catch (error: any) {
            console.error('Failed to reject cancellation:', error);
            const msg = error.response?.data?.message || "Gagal menolak pembatalan. Item mungkin sudah dihapus atau status berubah.";
            showAlert("Kesalahan", msg, { variant: "error" });
        }
    };

    // Stage 1: Start cooking - only processes the specific named item across orders
    const bulkStartCooking = async (itemName: string) => {
        const promises: Promise<void>[] = [];

        for (const order of orders) {
            const matchingItems = order.items.filter(
                (item: any) => item.name === itemName && !['DONE', 'CANCELLED'].includes(item.status?.toUpperCase())
            );
            if (matchingItems.length === 0) continue;

            const hasQueuedItems = matchingItems.some((i: any) => i.status !== 'PROCESSING' && i.status !== 'DONE');

            if (order.status === 'PENDING' && hasQueuedItems) {
                // Status update will come back via MQTT broadcast from backend
                setOrders(prev => prev.map(o =>
                    o.orderId === order.orderId ? { ...o, status: 'COOKING' } : o
                ));
            }

            for (const item of matchingItems) {
                if (item.status !== 'PROCESSING' && item.status !== 'DONE') {
                    promises.push(
                        axios.patch(`/cafe/order/item/${item.id}/status`, { status: 'PROCESSING' })
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
                promises.push(
                    axios.patch(`/cafe/order/item/${item.id}/status`, { status: 'QUEUED' })
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

    // Stage 2: Finish cooking - marks items as DONE, but ONLY pure PROCESSING items
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

    // Helper: check if any matching item still has PENDING/QUEUED status (item-level, not order-level)
    const hasAnyPending = (itemName: string) =>
        orders.some(order =>
            order.items.some((item: any) =>
                item.name === itemName &&
                !['DONE', 'PROCESSING', 'CANCELLED'].includes(item.status?.toUpperCase())
            )
        );


    if (!audioEnabled) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center space-y-8 max-w-md w-full">
                    <div className="relative w-32 h-32 mx-auto">
                        <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
                        <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 w-full h-full rounded-full flex items-center justify-center shadow-2xl border-4 border-slate-900">
                            <ChefHat className="w-16 h-16 text-white" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-tight mb-2">KITCHEN & BAR</h1>
                        <p className="text-slate-400 text-lg">Sentuh tombol dibawah untuk memulai sistem.</p>
                    </div>
                    <button
                        onClick={enableAudio}
                        className="group w-full py-6 bg-white hover:bg-blue-50 text-slate-900 font-black rounded-3xl text-2xl shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        <Volume2 className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform" />
                        <span>MULAI SHIFT</span>
                    </button>

                </div>
            </div>
        );
    }

    // Helper for time elapsed
    const getTimeElapsed = (timestamp: string) => {
        const diff = new Date().getTime() - new Date(timestamp).getTime();
        return Math.floor(diff / 60000);
    };

    // ── iOS Color Tokens ──────────────────────────────────────────────────────
    const ios = {
        bg:       '#000000',
        card:     '#1C1C1E',
        card2:    '#2C2C2E',
        sep:      'rgba(255,255,255,0.08)',
        label:    '#FFFFFF',
        label2:   'rgba(255,255,255,0.55)',
        label3:   'rgba(255,255,255,0.25)',
        blue:     '#0A84FF',
        green:    '#30D158',
        red:      '#FF453A',
        orange:   '#FF9F0A',
        yellow:   '#FFD60A',
        indigo:   '#5E5CE6',
    };

    return (
        <div className="h-screen w-screen overflow-hidden flex flex-col relative" style={{ background: ios.bg, color: ios.label, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif' }}>

            {/* ── CANCELLATION MODAL (iOS Alert) ─────────────────────── */}
            {cancellationAlert && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(20px)' }}>
                    <div className="w-full max-w-sm rounded-[28px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" style={{ background: '#1C1C1E', border: '1px solid rgba(255,68,56,0.4)' }}>
                        {/* Red strip */}
                        <div className="px-6 pt-6 pb-4 text-center" style={{ background: 'rgba(255,68,56,0.1)' }}>
                            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse" style={{ background: 'rgba(255,68,56,0.2)', border: '2px solid #FF453A' }}>
                                <X className="w-7 h-7" style={{ color: '#FF453A' }} />
                            </div>
                            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#FF453A' }}>⚠ Permintaan Batal</p>
                            <h2 className="text-3xl font-bold tracking-tight">{cancellationAlert.tableName?.toUpperCase()}</h2>
                        </div>
                        <div className="px-6 py-4">
                            <div className="rounded-2xl px-4 py-3 mb-4" style={{ background: '#2C2C2E' }}>
                                <p className="text-lg font-bold">{cancellationAlert.itemName}</p>
                                {cancellationAlert.reason && (
                                    <p className="text-sm mt-1 italic" style={{ color: ios.label2 }}>"{cancellationAlert.reason}"</p>
                                )}
                                {cancellationAlert.user && (
                                    <p className="text-xs mt-1" style={{ color: ios.label3 }}>Diminta: {cancellationAlert.user}</p>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => { handleConfirmCancel(cancellationAlert); stopAlarm(); }}
                                    className="flex-1 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                                    style={{ background: ios.green, color: '#000' }}>
                                    <CheckCircle className="w-4 h-4" /> Terima
                                </button>
                                <button onClick={() => handleRejectCancel(cancellationAlert)}
                                    className="flex-1 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                                    style={{ background: ios.red, color: '#fff' }}>
                                    <X className="w-4 h-4" /> Tolak
                                </button>
                            </div>
                            <button onClick={stopAlarm} className="w-full mt-2 py-2.5 rounded-2xl text-xs font-medium transition-all active:scale-95" style={{ background: '#3A3A3C', color: ios.label2 }}>
                                Diamkan Alarm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── NEW ORDER MODAL (iOS Sheet) ─────────────────────────── */}
            {newOrderAlert && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)' }}>
                    <div className="w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300" style={{ background: '#1C1C1E', border: '1px solid rgba(10,132,255,0.3)' }}>
                        {/* Header */}
                        <div className="px-6 pt-6 pb-4 text-center" style={{ background: 'rgba(10,132,255,0.08)' }}>
                            {(newOrderAlert.items || []).some((i: any) => i.note?.toLowerCase().includes('bundle')) && (
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 animate-bounce" style={{ background: ios.orange, color: '#000' }}>⚡ PAKET BUNDLING</span>
                            )}
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3 text-sm font-semibold" style={{ background: 'rgba(10,132,255,0.2)', color: ios.blue, border: '1px solid rgba(10,132,255,0.3)' }}>
                                <Bell className="w-3.5 h-3.5" />
                                ORDER BARU MASUK
                                {queueCount > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold animate-pulse" style={{ background: ios.red, color: '#fff' }}>+{queueCount}</span>}
                            </div>
                            <h2 className="text-5xl font-black tracking-tighter">
                                {newOrderAlert.tableName ? newOrderAlert.tableName.toUpperCase() : newOrderAlert.tableId ? `MEJA ${newOrderAlert.tableId}` : 'TAKEAWAY'}
                            </h2>
                            {newOrderAlert.customerName && <p className="mt-1 text-base" style={{ color: ios.label2 }}>{newOrderAlert.customerName}</p>}
                        </div>
                        {/* Items */}
                        <div className="mx-4 my-3 rounded-2xl overflow-hidden" style={{ background: '#2C2C2E' }}>
                            {(newOrderAlert.items || []).map((item: any, i: number) => (
                                <div key={i} className="flex justify-between items-center px-4 py-3" style={{ borderBottom: i < (newOrderAlert.items?.length - 1) ? `1px solid ${ios.sep}` : 'none' }}>
                                    <span className="font-semibold text-sm">{item.name}</span>
                                    <span className="text-sm font-bold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(10,132,255,0.2)', color: ios.blue }}>×{Number(item.quantity) || 1}</span>
                                </div>
                            ))}
                        </div>
                        <div className="px-4 pb-5">
                            <button onClick={showNextAlert}
                                className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.97] flex items-center justify-center gap-2"
                                style={{ background: ios.blue, color: '#fff' }}>
                                <CheckCircle className="w-5 h-5" />
                                {queueCount > 0 ? `TERIMA & BERIKUTNYA (${queueCount} sisa)` : 'TERIMA ORDER'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── HEADER (iOS Navigation Bar) ────────────────────────── */}
            <header className="sticky top-0 z-[100] flex items-center justify-between px-4 py-2.5" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${ios.sep}` }}>
                <div className="flex items-center gap-3">
                    {/* Sidebar toggle */}
                    <button onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                        style={{ background: isSummaryOpen ? 'rgba(10,132,255,0.2)' : 'rgba(255,255,255,0.06)', color: isSummaryOpen ? ios.blue : ios.label2 }}>
                        <Menu className="w-5 h-5" />
                    </button>
                    {/* Realtime pill */}
                    <button onClick={() => { kdsSocket.disconnect().connect(); fetchActiveOrders(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95"
                        style={{ background: isConnected ? 'rgba(48,209,88,0.15)' : 'rgba(255,68,56,0.15)', border: `1px solid ${isConnected ? 'rgba(48,209,88,0.3)' : 'rgba(255,68,56,0.3)'}` }}>
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: isConnected ? ios.green : ios.red }} />
                        <span className="text-[11px] font-bold" style={{ color: isConnected ? ios.green : ios.red }}>{isConnected ? 'Realtime' : 'Offline'}</span>
                    </button>
                    {/* Title */}
                    <div className="flex items-center gap-2">
                        <ChefHat className="w-5 h-5" style={{ color: ios.indigo }} />
                        <span className="text-base font-bold tracking-tight">Kitchen & Bar</span>
                        <span className="text-sm" style={{ color: ios.label3 }}>Unified</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Audio btn */}
                    <button onClick={() => playVocalAlert("Tes Audio Kitchen", false)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-90"
                        style={{ background: 'rgba(255,255,255,0.06)', color: ios.label2 }}>
                        🔊 Audio
                    </button>
                    {/* Stock */}
                    <button onClick={() => { const dept = selectedStation === 'BDS' ? 'BAR' : 'KITCHEN'; router.push(`/admin/closing/stock-opname?dept=${dept}`); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-90"
                        style={{ background: 'rgba(94,92,230,0.2)', color: ios.indigo, border: '1px solid rgba(94,92,230,0.3)' }}>
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        Lapor Stok
                    </button>
                    {/* Clock */}
                    <div className="text-right pl-3" style={{ borderLeft: `1px solid ${ios.sep}` }}>
                        <div className="text-xl font-bold font-mono tracking-tight leading-none">
                            {currentTime.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[10px] font-medium mt-0.5" style={{ color: ios.label3 }}>
                            {currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                    </div>
                    {/* History */}
                    <button onClick={toggleHistory}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                        style={{ background: showHistory ? 'rgba(10,132,255,0.2)' : 'rgba(255,255,255,0.06)', color: showHistory ? ios.blue : ios.label2 }}>
                        <RotateCcw className="w-4.5 h-4.5" />
                    </button>
                </div>
            </header>

            {/* ── CONTENT ────────────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden flex flex-row" style={{ background: ios.bg }}>

                {/* ── SIDEBAR (iOS grouped inset list) ── */}
                <aside className="flex flex-col shrink-0 h-full overflow-hidden transition-all duration-300 ease-out" style={{ width: isSummaryOpen ? 200 : 0, opacity: isSummaryOpen ? 1 : 0, pointerEvents: isSummaryOpen ? 'auto' : 'none', background: '#111113', borderRight: `1px solid ${ios.sep}` }}>
                    {/* Sidebar header */}
                    <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: `1px solid ${ios.sep}` }}>
                        <div>
                            <p className="text-[13px] font-semibold">Ringkasan</p>
                            <p className="text-[10px] font-medium" style={{ color: ios.label3 }}>Antrian masak</p>
                        </div>
                        <button onClick={() => setIsSummaryOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90" style={{ background: '#2C2C2E', color: ios.label2 }}>
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Sidebar list */}
                    <div className="flex-1 overflow-y-auto no-scrollbar py-2 pb-20" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' } as React.CSSProperties} onTouchMove={e => e.stopPropagation()}>
                        {aggregatedItems.map((item: any, i: number) => {
                            const anyPending = hasAnyPending(item.name);
                            const isProcessing = item.processingCount > 0;
                            return (
                                <div key={i} className="mx-3 mb-1 rounded-2xl overflow-hidden" style={{ background: isProcessing && !anyPending ? 'rgba(255,159,10,0.08)' : '#1C1C1E', border: `1px solid ${isProcessing && !anyPending ? 'rgba(255,159,10,0.25)' : ios.sep}` }}>
                                    <div className="px-3 pt-2.5 pb-2 flex flex-col gap-1.5">
                                        {/* Name — full width, no truncation */}
                                        <p className="text-[13px] font-bold leading-snug" style={{ color: ios.label }}>{item.name}</p>

                                        {/* Bottom row: qty + status + actions */}
                                        <div className="flex items-center gap-1.5">
                                            {/* Qty badge */}
                                            <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold font-mono" style={{ background: isProcessing && !anyPending ? 'rgba(255,159,10,0.2)' : 'rgba(10,132,255,0.15)', color: isProcessing && !anyPending ? ios.orange : ios.blue }}>
                                                {Number(item.quantity) || 1}
                                            </div>
                                            {/* Status badges */}
                                            <div className="flex-1 flex items-center gap-1 min-w-0">
                                                {item.pendingCount > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(10,132,255,0.15)', color: ios.blue }}>{item.pendingCount} antri</span>}
                                                {item.processingCount > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,159,10,0.15)', color: ios.orange }}>{item.processingCount}🔥</span>}
                                            </div>
                                            {/* Icon action buttons */}
                                            <div className="flex gap-0.5 shrink-0">
                                                <button onClick={() => bulkStartCooking(item.name)} disabled={!anyPending || item.hasPendingCancel} title="Mulai masak"
                                                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-all active:scale-90"
                                                    style={{ background: anyPending && !item.hasPendingCancel ? 'rgba(255,159,10,0.2)' : 'rgba(255,255,255,0.05)', color: anyPending && !item.hasPendingCancel ? ios.orange : ios.label3, border: `1px solid ${anyPending && !item.hasPendingCancel ? 'rgba(255,159,10,0.35)' : ios.sep}` }}>
                                                    {item.hasPendingCancel ? <AlertCircle className="w-3 h-3" style={{ color: ios.red }} /> : <ChefHat className="w-3 h-3" />}
                                                </button>
                                                {item.processingCount > 0 && !item.hasPendingCancel && (
                                                    <button onClick={() => bulkUncheckProcessing(item.name)} title="Batal proses"
                                                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-all active:scale-90"
                                                        style={{ background: 'rgba(255,68,56,0.15)', color: ios.red, border: '1px solid rgba(255,68,56,0.3)' }}>
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                                <button onClick={() => bulkFinishItem(item.name)} disabled={!item.readyToFinishCount || item.hasRejected || item.hasPendingCancel} title="Tandai selesai"
                                                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-all active:scale-90"
                                                    style={{ background: item.readyToFinishCount > 0 && !item.hasRejected && !item.hasPendingCancel ? 'rgba(48,209,88,0.2)' : 'rgba(255,255,255,0.05)', color: item.readyToFinishCount > 0 && !item.hasRejected && !item.hasPendingCancel ? ios.green : ios.label3, border: `1px solid ${item.readyToFinishCount > 0 && !item.hasRejected && !item.hasPendingCancel ? 'rgba(48,209,88,0.35)' : ios.sep}` }}>
                                                    {item.hasRejected ? <Ban className="w-3 h-3" style={{ color: ios.red }} /> : <CheckCircle className="w-3 h-3" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );

                        })}
                        {aggregatedItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center" style={{ color: ios.label3 }}>
                                <ChefHat className="w-8 h-8 mb-2 opacity-30" />
                                <p className="text-xs font-semibold">Dapur Bersih</p>
                            </div>
                        )}
                    </div>
                </aside>

                {/* ── MAIN GRID (iOS Card Grid) ────────────────────── */}
                <div className={`h-full flex-1 min-w-0 overflow-y-auto no-scrollbar px-2 pt-2 pb-16 transition-all duration-300 ${showHistory ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                    onTouchMove={e => e.stopPropagation()}>
                    <div className="grid gap-2 items-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 185px), 1fr))' }}>
                        {orders.map(order => {
                            const elapsed = getTimeElapsed(order.timestamp);
                            const isUrgent = elapsed >= 20;
                            const isWarning = elapsed >= 10 && elapsed < 20;
                            const isCooking = order.status === 'COOKING';
                            const isReady = order.status === 'READY';
                            const hasPendingCancel = (order.items || []).some((i: any) => i.status === 'CANCEL_REQUESTED');

                            // Timer chip style
                            const timerStyle = hasPendingCancel
                                ? { background: 'rgba(255,68,56,0.25)', color: ios.red, border: '1px solid rgba(255,68,56,0.5)' }
                                : isUrgent ? { background: ios.red, color: '#fff', border: 'none' }
                                : isWarning ? { background: ios.yellow, color: '#000', border: 'none' }
                                : isCooking ? { background: ios.orange, color: '#000', border: 'none' }
                                : isReady ? { background: ios.green, color: '#000', border: 'none' }
                                : { background: '#3A3A3C', color: ios.label2, border: 'none' };

                            // Card border accent
                            const cardAccent = hasPendingCancel ? `0 0 0 1.5px ${ios.red}`
                                : isUrgent ? `0 0 0 1px rgba(255,68,56,0.5)` 
                                : isWarning ? `0 0 0 1px rgba(255,214,10,0.4)` 
                                : `0 0 0 1px ${ios.sep}`;

                            return (
                                <div key={order.orderId} className="flex flex-col rounded-2xl overflow-hidden transition-all duration-200" style={{ background: ios.card, boxShadow: cardAccent }}>

                                    {/* Card Header */}
                                    <div className="px-3 pt-3 pb-2">
                                        <div className="flex items-start justify-between gap-1 mb-1.5">
                                            {/* Status pill */}
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0"
                                                style={hasPendingCancel ? { background: 'rgba(255,68,56,0.2)', color: ios.red } :
                                                    isReady ? { background: 'rgba(48,209,88,0.2)', color: ios.green } :
                                                    isCooking ? { background: 'rgba(255,159,10,0.2)', color: ios.orange } :
                                                    { background: 'rgba(255,255,255,0.08)', color: ios.label2 }}>
                                                {hasPendingCancel ? '⚠ Batal' : order.status}
                                            </span>
                                            {/* Timer chip */}
                                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold" style={timerStyle}>
                                                <Clock className="w-2.5 h-2.5" />
                                                {elapsed}m
                                            </div>
                                        </div>
                                        {/* Table name */}
                                        <h3 className="text-[17px] font-bold tracking-tight leading-tight">
                                            {order.tableName || (order.tableId ? `Meja ${order.tableId}` : 'Walk-In')}
                                        </h3>
                                        {/* Customer */}
                                        {order.customerName && order.customerName !== 'Guest' && (
                                            <p className="text-[11px] mt-0.5 truncate" style={{ color: ios.label2 }}>{order.customerName}</p>
                                        )}
                                    </div>

                                    {/* Divider */}
                                    <div className="mx-3" style={{ height: 1, background: ios.sep }} />

                                    {/* Items */}
                                    <div className="px-3 py-2 flex flex-col gap-0">
                                        {(order.items || []).filter((i: any) => ['KDS', 'BDS'].includes(i.station?.toUpperCase())).map((item: any, idx: number) => {
                                            const isKDS = item.station?.toUpperCase() !== 'BDS';
                                            const isDone = item.status === 'DONE';
                                            const isCancelReq = item.status === 'CANCEL_REQUESTED';
                                            const isCancelRej = item.status === 'CANCEL_REJECTED';

                                            return (
                                                <div key={idx}>
                                                    <div className={`flex items-center gap-2 py-1 px-1 rounded-xl ${isCancelReq ? 'animate-pulse' : ''}`}
                                                        style={{ background: isCancelReq ? 'rgba(255,68,56,0.1)' : 'transparent' }}>
                                                        {/* Checkbox */}
                                                        <button disabled={isCancelReq}
                                                            onClick={() => updateStatusForItem(order, item, isDone ? 'PENDING' : 'DONE')}
                                                            className="shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all active:scale-90 border"
                                                            style={{
                                                                background: isDone ? ios.blue : item.status === 'PROCESSING' ? 'rgba(10,132,255,0.2)' : isCancelRej ? ios.orange : 'transparent',
                                                                borderColor: isDone ? ios.blue : item.status === 'PROCESSING' ? ios.blue : isCancelRej ? ios.orange : ios.label3
                                                            }}>
                                                            {isCancelReq ? <X className="w-2.5 h-2.5" style={{ color: ios.red }} /> :
                                                                isCancelRej ? <Ban className="w-2.5 h-2.5" style={{ color: '#fff' }} /> :
                                                                isDone ? <CheckCircle className="w-2.5 h-2.5" style={{ color: '#fff' }} /> : null}
                                                        </button>
                                                        {/* Station dot */}
                                                        <span className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: isCancelReq ? ios.red : isKDS ? ios.orange : ios.blue }} />
                                                        {/* Name */}
                                                        <span className="flex-1 text-[11px] font-medium leading-tight truncate" style={{
                                                            color: isDone ? ios.label3 : isCancelReq ? ios.red : ios.label,
                                                            textDecoration: isDone ? 'line-through' : 'none'
                                                        }}>{item.name}</span>
                                                        {/* Qty */}
                                                        <span className="text-[11px] font-bold shrink-0" style={{ color: isDone ? ios.label3 : isCancelReq ? ios.red : ios.blue }}>×{Number(item.quantity) || 1}</span>
                                                    </div>

                                                    {/* Note */}
                                                    {item.note && (
                                                        <div className="ml-6 mb-0.5 text-[10px] italic truncate" style={{ color: ios.orange }}>↳ {item.note}</div>
                                                    )}

                                                    {/* Cancel rejected badge */}
                                                    {isCancelRej && (
                                                        <div className="ml-6 mb-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold animate-pulse" style={{ background: 'rgba(255,159,10,0.2)', color: ios.orange }}>
                                                            <Ban className="w-2.5 h-2.5" /> DITOLAK
                                                        </div>
                                                    )}

                                                    {/* Cancel confirm buttons */}
                                                    {isCancelReq && (
                                                        <div className="flex gap-1.5 ml-6 mb-1.5">
                                                            <button onClick={() => handleConfirmCancel(item)}
                                                                className="flex-1 py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 animate-pulse transition-all active:scale-95"
                                                                style={{ background: ios.green, color: '#000' }}>
                                                                <CheckCircle className="w-3 h-3" /> OK
                                                            </button>
                                                            <button onClick={() => handleRejectCancel(item)}
                                                                className="flex-1 py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95"
                                                                style={{ background: ios.red, color: '#fff' }}>
                                                                <X className="w-3 h-3" /> Tolak
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Action Button */}
                                    <div className="px-2 pb-2 mt-auto">
                                        {order.status === 'PENDING' && (
                                            <button disabled={hasPendingCancel} onClick={() => updateStatus(order, 'COOKING')}
                                                className="w-full py-2 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1 transition-all active:scale-[0.97]"
                                                style={{ background: hasPendingCancel ? '#3A3A3C' : ios.orange, color: hasPendingCancel ? ios.label3 : '#000' }}>
                                                {hasPendingCancel ? <><AlertCircle className="w-3 h-3" style={{ color: ios.red }} /> Batal dulu</> : <>PROSES <ChevronRight className="w-3.5 h-3.5" /></>}
                                            </button>
                                        )}
                                        {order.status === 'COOKING' && (
                                            <button disabled={hasPendingCancel} onClick={() => updateStatus(order, 'READY')}
                                                className="w-full py-2 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1 transition-all active:scale-[0.97]"
                                                style={{ background: hasPendingCancel ? '#3A3A3C' : ios.green, color: hasPendingCancel ? ios.label3 : '#000' }}>
                                                {hasPendingCancel ? <><AlertCircle className="w-3 h-3" style={{ color: ios.red }} /> Batal dulu</> : <><CheckCircle className="w-3.5 h-3.5" /> SELESAI</>}
                                            </button>
                                        )}
                                        {order.status === 'READY' && (
                                            <button disabled={hasPendingCancel} onClick={() => updateStatus(order, 'SERVED')}
                                                className="w-full py-2 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1 transition-all active:scale-[0.97]"
                                                style={{ background: hasPendingCancel ? '#3A3A3C' : '#3A3A3C', color: hasPendingCancel ? ios.label3 : ios.label2, border: `1px solid ${ios.sep}` }}>
                                                {hasPendingCancel ? <><AlertCircle className="w-3 h-3" style={{ color: ios.red }} /> Batal dulu</> : <><CheckCircle className="w-3.5 h-3.5" style={{ color: ios.green }} /> DIAMBIL</>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {orders.length === 0 && (
                            <div className="col-span-full h-[60vh] flex flex-col items-center justify-center" style={{ color: ios.label3 }}>
                                <ChefHat className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-lg font-semibold opacity-30">Kitchen Standby</p>
                                <p className="text-xs mt-1 opacity-20">Menunggu orderan baru...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── HISTORY PANEL (iOS Sheet from right) ───────────────── */}
            <div className={`fixed inset-y-0 right-0 w-full sm:w-[400px] z-[200] transform transition-transform duration-500 ease-out ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}
                style={{ background: '#111113', borderLeft: `1px solid ${ios.sep}`, boxShadow: '-20px 0 60px rgba(0,0,0,0.5)' }}>
                <div className="h-full flex flex-col">
                    {/* History Header */}
                    <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${ios.sep}` }}>
                        <div className="flex items-center gap-3">
                            <RotateCcw className="w-5 h-5" style={{ color: ios.blue }} />
                            <h2 className="text-lg font-bold">Riwayat Order</h2>
                        </div>
                        <button onClick={toggleHistory} className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90" style={{ background: '#2C2C2E', color: ios.label2 }}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {/* Search */}
                    <div className="px-4 py-3 shrink-0" style={{ borderBottom: `1px solid ${ios.sep}` }}>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#2C2C2E' }}>
                            <Search className="w-4 h-4 shrink-0" style={{ color: ios.label3 }} />
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Cari meja, customer..." className="flex-1 text-sm bg-transparent outline-none" style={{ color: ios.label }} />
                        </div>
                    </div>
                    {/* History list */}
                    <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 space-y-2">
                        {historyOrders.filter(o => {
                            const d = new Date(o.timestamp).toISOString().split('T')[0];
                            const today = new Date().toISOString().split('T')[0];
                            return d === today;
                        }).filter(o =>
                            o.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            o.tableName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            o.tableId?.toString().includes(searchQuery) ||
                            o.orderId?.includes(searchQuery)
                        ).map((order: any) => (
                            <div key={order.orderId} className="rounded-2xl overflow-hidden" style={{ background: ios.card, border: `1px solid ${ios.sep}` }}>
                                <div className="flex items-center justify-between px-4 py-3">
                                    <div>
                                        <p className="text-sm font-bold">{order.tableName || 'Walk-In'}</p>
                                        <p className="text-xs" style={{ color: ios.label2 }}>{order.customerName} · #{(order.orderId || '').slice(-4)}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(48,209,88,0.15)', color: ios.green }}>
                                            <CheckCircle className="w-3 h-3" /> SERVED
                                        </span>
                                        <p className="text-[10px] mt-1" style={{ color: ios.label3 }}>
                                            {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="px-4 pb-3 space-y-1" style={{ borderTop: `1px solid ${ios.sep}` }}>
                                    {(order.items || []).map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center pt-1">
                                            <span className="text-xs" style={{ color: ios.label2 }}>{item.name}</span>
                                            <span className="text-xs font-bold" style={{ color: ios.label }}>×{Number(item.quantity) || 1}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {historyOrders.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16" style={{ color: ios.label3 }}>
                                <RotateCcw className="w-10 h-10 mb-3 opacity-20" />
                                <p className="text-sm font-medium opacity-30">Belum ada riwayat</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── BOTTOM TAB BAR (iOS style) ───────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 z-[180] flex items-center justify-around px-6 transition-all duration-300"
                style={{ paddingLeft: isSummaryOpen ? 200 + 24 : 24, paddingRight: 24, paddingTop: 8, paddingBottom: 10, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', borderTop: `1px solid ${ios.sep}` }}>
                {[
                    { label: 'Total', value: orders.length, color: ios.label },
                    { label: 'Antri', value: orders.filter(o => o.status === 'PENDING').length, color: ios.blue },
                    { label: 'Proses', value: orders.filter(o => o.status === 'COOKING').length, color: ios.orange },
                    { label: 'Ready', value: orders.filter(o => o.status === 'READY').length, color: ios.green },
                ].map((stat, i, arr) => (
                    <React.Fragment key={stat.label}>
                        <div className="flex flex-col items-center">
                            <span className="text-[22px] font-bold leading-none tabular-nums" style={{ color: stat.color }}>{stat.value}</span>
                            <span className="text-[10px] font-medium mt-0.5" style={{ color: ios.label3 }}>{stat.label}</span>
                        </div>
                        {i < arr.length - 1 && <div className="w-px h-6" style={{ background: ios.sep }} />}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}
