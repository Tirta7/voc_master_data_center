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

    return (
        <div className="h-screen w-screen overflow-hidden bg-black text-slate-100 flex flex-col relative selection:bg-blue-500/30">


            {/* CANCELLATION REQUEST MODAL (DANGER) */}
            {cancellationAlert && (
                <div className="fixed inset-0 z-[210] bg-red-950/90  flex items-center justify-center p-4 overscroll-contain">
                    <div className="bg-slate-900 border-2 md:border-4 border-red-500 rounded-3xl md:rounded-[3rem] p-6 md:p-10 max-w-2xl w-full text-center shadow-[0_0_60px_rgba(239,68,68,0.4)] relative overflow-hidden animate-bounce-slow">
                        {/* Red Pulse Overlay */}
                        <div className="absolute inset-0 bg-red-600/10 md:bg-red-600/20 animate-pulse"></div>

                        <div className="relative z-10 space-y-6 md:space-y-8">
                            <div className="flex flex-col items-center gap-3 md:gap-4">
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.6)] animate-ping-slow">
                                    <X className="w-8 h-8 md:w-10 md:h-10 text-white" />
                                </div>
                                <h2 className="text-xl md:text-2xl font-black text-red-500 uppercase tracking-[0.2em]">⚠️ PERMINTAAN BATAL ⚠️</h2>
                            </div>

                            <div className="space-y-2 md:space-y-3">
                                <h3 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-tight md:leading-none break-words">
                                    {cancellationAlert.tableName?.toUpperCase()}
                                </h3>
                                <div className="bg-red-500/20 border border-red-500/30 py-3 md:py-4 px-4 md:px-6 rounded-xl md:rounded-2xl inline-block w-full">
                                    <p className="text-2xl md:text-4xl font-black text-red-400 uppercase tracking-tight break-words mb-2 md:mb-4">
                                        {cancellationAlert.itemName}
                                    </p>
                                    
                                    {(cancellationAlert.reason || cancellationAlert.user) && (
                                        <div className="mt-4 pt-4 border-t border-red-500/30 text-left bg-black/20 rounded-xl p-3 md:p-4">
                                            {cancellationAlert.reason && (
                                                <div className="mb-2">
                                                    <span className="text-[10px] md:text-xs font-bold text-red-300 uppercase tracking-widest block mb-1">Alasan Pembatalan:</span>
                                                    <p className="text-sm md:text-lg font-medium text-white italic">"{cancellationAlert.reason}"</p>
                                                </div>
                                            )}
                                            {cancellationAlert.user && (
                                                <div>
                                                    <span className="text-[10px] md:text-xs font-bold text-red-300 uppercase tracking-widest block mb-1">Diminta Oleh:</span>
                                                    <p className="text-xs md:text-sm font-bold text-slate-300 uppercase">{cancellationAlert.user}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 md:gap-4 pt-2">
                                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                                    <button
                                        onClick={() => {
                                            handleConfirmCancel(cancellationAlert);
                                            stopAlarm();
                                        }}
                                        className="flex-1 py-4 md:py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl md:text-2xl rounded-xl md:rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 md:gap-3"
                                    >
                                        <CheckCircle className="w-6 h-6 md:w-8 md:h-8" />
                                        TERIMA
                                    </button>
                                    <button
                                        onClick={() => handleRejectCancel(cancellationAlert)}
                                        className="flex-1 py-4 md:py-5 bg-red-600 hover:bg-red-500 text-white font-black text-xl md:text-2xl rounded-xl md:rounded-2xl shadow-lg shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 md:gap-3"
                                    >
                                        <X className="w-6 h-6 md:w-8 md:h-8" />
                                        TOLAK
                                    </button>
                                </div>
                                <button
                                    onClick={stopAlarm}
                                    className="w-full py-3 md:py-4 bg-slate-800 text-slate-400 font-bold text-sm md:text-base rounded-xl md:rounded-2xl hover:bg-slate-700 transition-colors"
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
                <div className="fixed inset-0 z-[200] bg-slate-950/90  flex items-center justify-center p-4 animate-in fade-in duration-200 overscroll-contain">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-2xl w-full text-center shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Pulse Effect */}
                        <div className="absolute inset-0 bg-blue-600/10 animate-pulse"></div>

                        <div className="relative z-10 space-y-8">
                            <div className="inline-flex flex-col items-center gap-3">
                                { (newOrderAlert.items || []).some((i: any) => i.note && i.note.toLowerCase().includes('bundle')) && (
                                    <div className="bg-amber-500 text-black px-4 py-1.5 rounded-full font-black text-sm uppercase tracking-[0.2em] shadow-lg animate-bounce mb-2">
                                        ⚡ PAKET BUNDLING ⚡
                                    </div>
                                )}
                                <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-blue-600/20 text-blue-400 font-bold border border-blue-600/30">
                                    <span>ORDERAN BARU MASUK!</span>
                                    {/* Queue badge — tunjukkan berapa orderan lagi dalam antrian */}
                                    {queueCount > 0 && (
                                        <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full animate-pulse">
                                            +{queueCount} lagi
                                        </span>
                                    )}
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
                                    <p className="text-3xl font-medium text-slate-400">
                                        {newOrderAlert.customerName}
                                    </p>
                                )}
                            </div>

                            <div className="bg-slate-800/50 rounded-2xl p-6 text-left border border-slate-700/50 max-h-[300px] overflow-y-auto">
                                {(newOrderAlert.items || []).map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center py-3 border-b border-slate-700 last:border-0">
                                        <span className="text-2xl font-bold text-slate-200">{item.name}</span>
                                        <span className="text-2xl font-black text-blue-400 bg-blue-400/10 px-4 py-1 rounded-lg">x{Number(item.quantity) || 1}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={showNextAlert}
                                className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white font-black text-3xl rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-4"
                            >
                                <CheckCircle className="w-10 h-10" />
                                {queueCount > 0
                                    ? `TERIMA → BERIKUTNYA (${queueCount} sisa)`
                                    : 'TERIMA ORDER'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header / Topbar */}
            <header className="sticky top-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-3 md:py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2 md:gap-6">
                    <button
                        onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors text-blue-400"
                    >
                        <Menu className="w-6 h-6 md:w-8 md:h-8" />
                    </button>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => {
                                kdsSocket.disconnect().connect();
                                fetchActiveOrders();
                            }}
                            title="Klik untuk paksa hubungkan ulang realtime"
                            className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-all ${isConnected ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : 'bg-red-500/10 hover:bg-red-500/20'}`}
                        >
                            <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]'} animate-pulse`} />
                            <span className={`text-[10px] font-black uppercase ${isConnected ? 'text-emerald-500' : 'text-red-500'}`}>
                                {isConnected ? 'Realtime' : 'Offline'}
                            </span>
                        </button>
                        <h1 className="text-base sm:text-lg md:text-xl lg:text-3xl font-black tracking-tighter text-white flex items-center gap-1 sm:gap-2 truncate">
                            <ChefHat className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 text-indigo-500 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)] shrink-0" />
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0 sm:gap-2 leading-tight truncate">
                                <span>KITCHEN & BAR</span>
                                <span className="text-indigo-400 opacity-80 text-[10px] sm:text-sm md:text-base lg:text-3xl">(UNIFIED)</span>
                            </div>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-6">
                    {/* TEST AUDIO BUTTON */}
                    <button
                        onClick={() => playVocalAlert("Tes Audio Kitchen", false)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] md:text-xs font-black rounded-lg border border-slate-700 text-slate-400 transition-all active:scale-95"
                    >
                        🔊 {t('kds.audioEnabled')}
                    </button>

                    <button
                        onClick={() => {
                            const dept = selectedStation === 'BDS' ? 'BAR' : 'KITCHEN';
                            router.push(`/admin/closing/stock-opname?dept=${dept}`);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] md:text-xs font-black rounded-xl border border-indigo-500 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                    >
                        <ClipboardCheck className="w-4 h-4" />
                        <span className="hidden sm:inline">LAPOR STOK</span>
                        <span className="sm:hidden">STOK</span>
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
                        className={`p-2.5 md:p-3.5 rounded-2xl transition-all border ${showHistory ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-400'}`}
                    >
                        <RotateCcw className={`w-5 h-5 md:w-6 md:h-6 ${showHistory ? 'animate-spin-slow' : ''}`} />
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative flex flex-row bg-black">
                {/* AGGREGATION SIDEBAR - integrated into flex flow */}
                <aside className={`flex flex-col shrink-0 h-full w-52 bg-[#141416]/98 border-r border-white/5 overflow-hidden transition-all duration-300 ease-out z-[150] ${isSummaryOpen ? 'ml-0 opacity-100' : '-ml-52 opacity-0 pointer-events-none'}`}>
                    {/* Header compact */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <LayoutGrid className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <div className="min-w-0">
                                <div className="text-[11px] font-black text-white leading-none truncate">Ringkasan</div>
                                <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">Antrian Masak</div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsSummaryOpen(false)}
                            className="p-1.5 rounded-lg hover:bg-white/8 text-slate-600 hover:text-slate-400 shrink-0"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Summary List — slim rows */}
                    <div
                        className="flex-1 overflow-y-auto no-scrollbar pb-20"
                        style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                        onTouchMove={(e) => e.stopPropagation()}
                    >
                        {aggregatedItems.map((item: any, i: number) => {
                            const anyPending = hasAnyPending(item.name);
                            const isProcessing = item.processingCount > 0;
                            return (
                                <div key={i} className={`flex items-center gap-1.5 px-2 py-1.5 border-b border-white/4 transition-colors ${
                                    isProcessing && !anyPending ? 'bg-amber-500/8' : 'hover:bg-white/4'
                                }`}>
                                    {/* Qty badge */}
                                    <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black font-mono border ${
                                        isProcessing && !anyPending
                                            ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                                            : 'bg-black/40 border-white/8 text-blue-400'
                                    }`}>
                                        {Number(item.quantity) || 1}
                                    </div>
                                    {/* Name + status */}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[11px] font-bold text-slate-200 leading-tight truncate">{item.name}</div>
                                        <div className="flex gap-1 mt-0.5">
                                            {item.pendingCount > 0 && (
                                                <span className="text-[8px] font-black text-blue-400">{item.pendingCount}Q</span>
                                            )}
                                            {item.processingCount > 0 && (
                                                <span className="text-[8px] font-black text-amber-400">{item.processingCount}🔥</span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Action icon buttons */}
                                    <div className="flex gap-0.5 shrink-0">
                                        <button
                                            onClick={() => bulkStartCooking(item.name)}
                                            disabled={!anyPending || item.hasPendingCancel}
                                            title="Mulai masak"
                                            className={`w-6 h-6 rounded flex items-center justify-center transition-all active:scale-90 border ${
                                                anyPending && !item.hasPendingCancel
                                                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                                                    : 'bg-white/4 border-white/4 text-slate-700 cursor-not-allowed'
                                            }`}
                                        >
                                            {item.hasPendingCancel
                                                ? <AlertCircle className="w-3 h-3 text-rose-500 animate-pulse" />
                                                : <ChefHat className="w-3 h-3" />}
                                        </button>
                                        {item.processingCount > 0 && !item.hasPendingCancel && (
                                            <button
                                                onClick={() => bulkUncheckProcessing(item.name)}
                                                title="Batal proses"
                                                className="w-6 h-6 rounded flex items-center justify-center bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all active:scale-90"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => bulkFinishItem(item.name)}
                                            disabled={!item.readyToFinishCount || item.readyToFinishCount === 0 || item.hasRejected || item.hasPendingCancel}
                                            title="Tandai selesai"
                                            className={`w-6 h-6 rounded flex items-center justify-center transition-all active:scale-90 border ${
                                                item.readyToFinishCount > 0 && !item.hasRejected && !item.hasPendingCancel
                                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                                                    : 'bg-white/4 border-white/4 text-slate-700 cursor-not-allowed'
                                            }`}
                                        >
                                            {item.hasRejected
                                                ? <Ban className="w-3 h-3 text-red-500" />
                                                : <CheckCircle className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {aggregatedItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center opacity-20">
                                <ChefHat className="w-8 h-8 text-slate-400 mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dapur Bersih</p>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main Grid — Ultra-Compact KDS v2 */}
                <div
                    className={`h-full flex-1 min-w-0 px-2 pt-2 pb-2 overflow-y-auto transition-all duration-500 no-scrollbar ${showHistory ? 'opacity-0 scale-95 translate-x-full' : 'opacity-100 scale-100 translate-x-0'}`}
                    style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                    onTouchMove={(e) => e.stopPropagation()}
                >
                    <div
                        className="grid gap-1.5 pb-24 items-start"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 190px), 1fr))' }}
                    >
                        {orders.map((order) => {
                            const elapsed = getTimeElapsed(order.timestamp);
                            const isUrgent = elapsed >= 20;
                            const isWarning = elapsed >= 10 && elapsed < 20;
                            const isCooking = order.status === 'COOKING';
                            const isReady = order.status === 'READY';
                            const hasPendingCancel = (order.items || []).some((i: any) => i.status === 'CANCEL_REQUESTED');

                            // Card border & bg based on priority
                            const cardBorder = hasPendingCancel
                                ? 'border-rose-500 bg-rose-950/50'
                                : isUrgent
                                    ? 'border-red-500/70 bg-red-950/30'
                                    : isWarning
                                        ? 'border-yellow-500/50 bg-yellow-950/20'
                                        : isCooking
                                            ? 'border-amber-500/40 bg-amber-950/20'
                                            : isReady
                                                ? 'border-emerald-500/40 bg-emerald-950/20'
                                                : 'border-white/8 bg-[#1a1a1c]';

                            const timerBg = isUrgent
                                ? 'bg-red-500 text-white'
                                : isWarning
                                    ? 'bg-yellow-500 text-black'
                                    : isCooking
                                        ? 'bg-amber-500/80 text-black'
                                        : isReady
                                            ? 'bg-emerald-500/80 text-white'
                                            : 'bg-white/8 text-slate-300';

                            return (
                                <div
                                    key={order.orderId}
                                    className={`relative flex flex-col rounded-xl border overflow-hidden transition-all duration-200 ${cardBorder} ${isUrgent ? 'shadow-[0_0_8px_rgba(239,68,68,0.3)]' : ''}`}
                                >
                                    {/* ── Card Header ── */}
                                    <div className="flex items-center justify-between px-2.5 pt-2 pb-1.5 gap-1">
                                        <div className="flex flex-col min-w-0 flex-1">
                                            {/* Table Name */}
                                            <span className="text-white font-black text-base leading-none tracking-tight truncate">
                                                {order.tableName || (order.tableId ? `M-${order.tableId}` : 'WALK-IN')}
                                            </span>
                                            {/* Customer + Order ID */}
                                            <div className="flex items-center gap-1 mt-0.5">
                                                {hasPendingCancel && (
                                                    <span className="text-[9px] font-black text-rose-400 uppercase animate-pulse">⚠ BATAL</span>
                                                )}
                                                {!hasPendingCancel && (
                                                    <span className="text-slate-500 text-[10px] font-bold truncate">
                                                        {order.customerName && order.customerName !== 'Guest' ? order.customerName : `#${String(order.orderId || '').slice(-4)}`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Timer */}
                                        <div className={`shrink-0 flex flex-col items-center justify-center w-9 h-9 rounded-lg font-black leading-none ${timerBg}`}>
                                            <span className="text-sm">{elapsed}</span>
                                            <span className="text-[8px] opacity-70">min</span>
                                        </div>
                                    </div>

                                    {/* ── Divider ── */}
                                    <div className="h-px bg-white/5 mx-2" />

                                    {/* ── Items List ── */}
                                    <div className="flex flex-col gap-0 px-1.5 py-1">
                                        {(order.items || [])
                                            .filter((i: any) => ['KDS', 'BDS'].includes(i.station?.toUpperCase()))
                                            .map((item: any, idx: number) => {
                                                const isKDS = item.station?.toUpperCase() !== 'BDS';
                                                const isDone = item.status === 'DONE';
                                                const isCancelReq = item.status === 'CANCEL_REQUESTED';
                                                const isCancelRej = item.status === 'CANCEL_REJECTED';

                                                return (
                                                    <div key={idx}>
                                                        <div className={`flex items-center gap-1 py-1 px-1 rounded-lg transition-all ${
                                                            isCancelReq ? 'bg-rose-500/15 animate-pulse' :
                                                            isDone ? 'opacity-40' : ''
                                                        }`}>
                                                            {/* Checkbox */}
                                                            <button
                                                                disabled={isCancelReq}
                                                                onClick={() => updateStatusForItem(order, item, isDone ? 'PENDING' : 'DONE')}
                                                                className={`shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-all ${
                                                                    isDone ? 'bg-emerald-500 border-emerald-400' :
                                                                    item.status === 'PROCESSING' ? 'bg-blue-500 border-blue-400' :
                                                                    isCancelRej ? 'bg-orange-500 border-orange-400 animate-pulse' :
                                                                    'border-white/15 bg-black/30 hover:border-emerald-400'
                                                                }`}
                                                            >
                                                                {isCancelReq ? <X className="w-2.5 h-2.5 text-rose-300" /> :
                                                                    isCancelRej ? <Ban className="w-2.5 h-2.5 text-white" /> :
                                                                    isDone ? <CheckCircle className="w-2.5 h-2.5 text-white" /> : null}
                                                            </button>

                                                            {/* Station dot */}
                                                            <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                                                                isCancelReq ? 'bg-rose-400' :
                                                                isKDS ? 'bg-amber-400' : 'bg-blue-400'
                                                            }`} />

                                                            {/* Item name */}
                                                            <span className={`flex-1 text-[11px] font-bold leading-tight truncate ${
                                                                isDone ? 'line-through text-slate-600' :
                                                                isCancelReq ? 'text-rose-300' :
                                                                'text-slate-100'
                                                            }`}>
                                                                {item.name}
                                                            </span>

                                                            {/* Qty */}
                                                            <span className={`shrink-0 text-[11px] font-black px-1 rounded ${
                                                                isDone ? 'text-emerald-600' :
                                                                isCancelReq ? 'text-rose-300' :
                                                                'text-white'
                                                            }`}>
                                                                ×{Number(item.quantity) || 1}
                                                            </span>
                                                        </div>

                                                        {/* Note */}
                                                        {item.note && (
                                                            <div className="ml-8 mb-0.5 text-[10px] font-bold text-amber-400 bg-amber-400/8 px-1.5 py-0.5 rounded italic truncate">
                                                                ↳ {item.note}
                                                            </div>
                                                        )}

                                                        {/* Cancel action buttons */}
                                                        {isCancelReq && (
                                                            <div className="flex gap-1 ml-8 mb-1">
                                                                <button
                                                                    onClick={() => handleConfirmCancel(item)}
                                                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1 rounded text-[9px] font-black uppercase tracking-wider animate-pulse flex items-center justify-center gap-0.5"
                                                                >
                                                                    <CheckCircle className="w-2.5 h-2.5" /> Batal ✓
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectCancel(item)}
                                                                    className="flex-1 bg-red-600 hover:bg-red-500 text-white py-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-0.5"
                                                                >
                                                                    <X className="w-2.5 h-2.5" /> Tolak
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        }
                                    </div>

                                    {/* ── Action Button ── */}
                                    <div className="px-1.5 pb-1.5 pt-1">
                                        {order.status === 'PENDING' && (
                                            <button
                                                disabled={hasPendingCancel}
                                                onClick={() => updateStatus(order, 'COOKING')}
                                                className={`w-full py-1.5 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all active:scale-[0.97] flex items-center justify-center gap-1 ${
                                                    hasPendingCancel
                                                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                                                        : 'bg-amber-400 hover:bg-amber-300 text-black shadow-[0_2px_8px_rgba(251,191,36,0.25)]'
                                                }`}
                                            >
                                                {hasPendingCancel ? <><AlertCircle className="w-3 h-3 text-rose-400" /> Batal dulu</> : <>PROSES <ChevronRight className="w-3 h-3" /></>}
                                            </button>
                                        )}
                                        {order.status === 'COOKING' && (
                                            <button
                                                disabled={hasPendingCancel}
                                                onClick={() => updateStatus(order, 'READY')}
                                                className={`w-full py-1.5 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all active:scale-[0.97] flex items-center justify-center gap-1 ${
                                                    hasPendingCancel
                                                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                                                        : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_2px_8px_rgba(16,185,129,0.25)]'
                                                }`}
                                            >
                                                {hasPendingCancel ? <><AlertCircle className="w-3 h-3 text-rose-400" /> Batal dulu</> : <><CheckCircle className="w-3 h-3" /> SELESAI</>}
                                            </button>
                                        )}
                                        {order.status === 'READY' && (
                                            <button
                                                disabled={hasPendingCancel}
                                                onClick={() => updateStatus(order, 'SERVED')}
                                                className={`w-full py-1.5 rounded-lg font-black text-[11px] uppercase tracking-wider border transition-all active:scale-[0.97] flex items-center justify-center gap-1 ${
                                                    hasPendingCancel
                                                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-40 border-white/5'
                                                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                                                }`}
                                            >
                                                {hasPendingCancel ? <><AlertCircle className="w-3 h-3 text-rose-400" /> Batal dulu</> : <><CheckCircle className="w-3 h-3 text-emerald-400" /> DIAMBIL</>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Empty State */}
                        {orders.length === 0 && (
                            <div className="col-span-full h-[60vh] flex flex-col items-center justify-center text-slate-800 animate-in fade-in zoom-in duration-1000">
                                <ChefHat className="w-24 h-24 mb-4 opacity-10" />
                                <h2 className="text-3xl font-black text-white/20 tracking-tighter">KITCHEN STANDBY</h2>
                                <p className="text-sm font-bold text-slate-600 mt-2 uppercase tracking-[0.3em]">Menunggu orderan baru...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* History Panel Overlay */}
            <div
                className={`fixed inset-y-0 right-0 w-full md:w-[600px] lg:w-[700px] bg-slate-900 shadow-[0_0_100px_rgba(0,0,0,0.8)] z-[200] transform transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] border-l border-white/5 ${showHistory ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="h-full flex flex-col bg-slate-900/95 ">
                    <div className="p-8 border-b border-white/5 flex flex-col gap-6 bg-white/[0.02]">
                        <div className="flex justify-between items-center">
                            <h2 className="text-4xl font-black text-white flex items-center gap-4 tracking-tighter">
                                <RotateCcw className="w-10 h-10 text-blue-500" />
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
                                <svg className="h-6 w-6 text-slate-500 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-12 pr-4 py-4 border border-white/10 rounded-2xl leading-5 bg-black/40 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold"
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
                                    Daily Summary ({selectedStation})
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
                                )
                                .map((order: any) => (
                                    <div key={order.orderId} className="group bg-white/5 hover:bg-white/10 rounded-[2rem] p-6 border border-white/5 hover:border-blue-500/30 transition-all duration-300 hover:shadow-2xl flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="font-black text-2xl text-white tracking-tighter group-hover:text-blue-300 transition-colors">
                                                    {order.tableName || 'WALK-IN'}
                                                </div>
                                                <div className="text-sm font-bold text-slate-500 mt-1 flex items-center gap-2">
                                                    <span className="truncate max-w-[120px]">{order.customerName}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                                    <span className="font-mono opacity-60">#{(order.orderId || "").slice(-4)}</span>
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
                                            <div className="text-[10px] text-red-500 overflow-hidden text-ellipsis whitespace-nowrap">{JSON.stringify(order.items || 'NO ITEMS')}</div>
                                            {(order.items || []).filter((item: any) => selectedStation === 'ALL' ? true : item.station?.toUpperCase() === selectedStation?.toUpperCase()).map((item: any, i: number) => (
                                                <div key={i} className="flex justify-between items-start text-xs">
                                                    <span className="text-slate-400 font-bold leading-snug">{item.name}</span>
                                                    <span className="font-black text-slate-200 bg-white/5 px-2 py-0.5 rounded-lg ml-3 whitespace-nowrap">x{Number(item.quantity) || 1}</span>
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

            {/* Bottom Stats Bar — Compact */}
            <div className={`fixed bottom-0 left-0 right-0 ${isSummaryOpen ? 'pl-52' : ''} bg-black/90 backdrop-blur-sm border-t border-white/8 py-1.5 px-4 z-[180] transition-all duration-300 flex items-center justify-around gap-6`}>
                <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 text-[9px] font-black uppercase tracking-wider">Total</span>
                    <span className="text-lg font-black text-white leading-none">{orders.length}</span>
                </div>
                <div className="w-px h-5 bg-white/8" />
                <div className="flex items-center gap-1.5">
                    <span className="text-blue-500/70 text-[9px] font-black uppercase tracking-wider">Queued</span>
                    <span className="text-lg font-black text-blue-400 leading-none">{orders.filter(o => o.status === 'PENDING').length}</span>
                </div>
                <div className="w-px h-5 bg-white/8" />
                <div className="flex items-center gap-1.5">
                    <span className="text-amber-500/70 text-[9px] font-black uppercase tracking-wider">Proses</span>
                    <span className="text-lg font-black text-amber-400 leading-none">{orders.filter(o => o.status === 'COOKING').length}</span>
                </div>
                <div className="w-px h-5 bg-white/8" />
                <div className="flex items-center gap-1.5">
                    <span className="text-emerald-500/70 text-[9px] font-black uppercase tracking-wider">Ready</span>
                    <span className="text-lg font-black text-emerald-400 leading-none">{orders.filter(o => o.status === 'READY').length}</span>
                </div>
            </div>
        </div>
    );
}
