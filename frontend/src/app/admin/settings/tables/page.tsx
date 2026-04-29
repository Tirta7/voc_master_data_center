'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { socket } from '@/lib/socket';
import { useMqtt } from '@/context/MqttContext';
import { useAlert } from '@/components/ui/AlertProvider';
import {
    Wifi, WifiOff, Lightbulb, Power, Radio,
    AlertTriangle, CheckCircle2, Clock, Cpu,
    RefreshCw, Zap, Activity, Server, Circle,
    X, Sun, ChevronRight, ChevronLeft, FastForward, Shuffle, Hash,
    Plus, Signal
} from 'lucide-react';
// import { API_URL } from '@/utils/urlUtils';

type PingStatus = 'idle' | 'pinging' | 'sent' | 'error';
type LightStatus = 'idle' | 'loading' | 'success' | 'error';

interface TableState {
    id: number;
    tableName: string;
    category: 'REGULAR' | 'VIP';
    macAddress: string | null;
    relayPin: number | null;
    hardwareType?: 'PCF8575' | 'MOC3062' | 'ESPNOW_NODE';
    isLightOn: boolean;
    status: string;
    updatedAt: string;
    lastHeartbeat?: string | null; // ← heartbeat asli dari ESP, bukan billing update
    isOffline?: boolean; // heartbeat-derived via WebSocket
}

interface TableMeta {
    pingStatus: PingStatus;
    pingAt: string | null;
    pingTopic: string | null;
    lightStatus: LightStatus;
}

const DEFAULT_META: TableMeta = { pingStatus: 'idle', pingAt: null, pingTopic: null, lightStatus: 'idle' };


export default function PanelControlPage() {
    const [tables, setTables] = useState<TableState[]>([]);
    const [meta, setMeta] = useState<Record<number, TableMeta>>({});
    const [loading, setLoading] = useState(true);
    const [pingAllStatus, setPingAllStatus] = useState<'idle' | 'running' | 'done'>('idle');
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [socketConnected, setSocketConnected] = useState(false);
    // Tick every 15s to re-evaluate "connected" based on updatedAt freshness
    const [tick, setTick] = useState(0);
    const [isTestingIoT, setIsTestingIoT] = useState(false);
    const [testModeDropdown, setTestModeDropdown] = useState(false);

    const iotTestRef = useRef<boolean>(false);
    const [testingTableId, setTestingTableId] = useState<number | null>(null);
    const { subscribe } = useMqtt();
    const { showAlert } = useAlert();

    // ✅ v7.0: Cancel-and-replace refs untuk rapid clicking
    // Key = tableId, Value = AbortController dari request yang sedang berjalan
    const abortRefs = useRef<Record<number, AbortController>>({});
    // Key = tableId, Value = desired state (true/false) dari klik terakhir
    const pendingStateRef = useRef<Record<number, boolean>>({});
    // Key = tableId, Value = debounce timeout handle
    const debounceRefs = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

    // ── Fetch ────────────────────────────────────────────────────────────────────
    const fetchTables = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await axios.get(`/billiard/tables`);
            const tbls: TableState[] = (res.data || [])
                .filter((t: any) => !t.type || t.type === 'billiard')
                .sort((a: any, b: any) => a.tableName.localeCompare(b.tableName, undefined, { numeric: true }));
            setTables(tbls);
            setMeta(prev => {
                const next = { ...prev };
                tbls.forEach(t => { if (!next[t.id]) next[t.id] = { ...DEFAULT_META }; });
                return next;
            });
            setLastRefresh(new Date());
        } catch (err) {
            console.error('[PanelControl] fetch failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTables(); }, [fetchTables]);

    // ── Tick every 15s to refresh "last-update" derived status ──────────────────
    useEffect(() => {
        const id = setInterval(() => setTick(n => n + 1), 15_000);
        return () => clearInterval(id);
    }, []);

    // ── WebSocket: real-time table state sync ────────────────────────────────────
    useEffect(() => {
        setSocketConnected(socket.connected);

        const onConnect = () => setSocketConnected(true);
        const onDisconnect = () => setSocketConnected(false);

        // tableUpdate — merge updated fields into the matching table
        const onTableUpdate = (updated: any) => {
            if (!updated?.id) return;
            if (updated.type && updated.type !== 'billiard') return;

            setTables(prev => {
                if (updated._action === 'DELETE') return prev.filter(t => t.id !== updated.id);
                if (updated._action === 'ADD') {
                    if (prev.some(t => t.id === updated.id)) return prev;
                    return [...prev, updated].sort((a, b) => a.tableName.localeCompare(b.tableName, undefined, { numeric: true }));
                }
                return prev.map(t => t.id !== updated.id ? t : {
                    ...t,
                    ...updated,
                    // LOCK: If testing, ignore external light status to prevent jitter
                    isLightOn: iotTestRef.current ? t.isLightOn : (updated.hasOwnProperty('isLightOn') ? updated.isLightOn : t.isLightOn),
                    // Preserve meta fields we set locally
                    isOffline: t.isOffline,
                });
            });
        };

        // heartbeat — mark online/offline instantly
        const onHeartbeat = (data: any) => {
            if (!data?.tableId) return;
            const tid = Number(data.tableId);
            
            const isOffline = data.connectivity === 'OFFLINE' || data.status === 'OFFLINE';
            const isOnline = data.connectivity === 'ONLINE' || data.status === 'ONLINE' || data.online === true;

            setTables(prev => prev.map(t => Number(t.id) === tid
                ? { 
                    ...t, 
                    isOffline, 
                    lastHeartbeat: isOnline ? new Date().toISOString() : t.lastHeartbeat,
                    updatedAt: data.timestamp ?? t.updatedAt 
                  }
                : t
            ));
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('tableUpdate', onTableUpdate);
        socket.on('heartbeat', onHeartbeat);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('tableUpdate', onTableUpdate);
            socket.off('heartbeat', onHeartbeat);
        };
    }, []);

    // ── MQTT fallback ────────────────────────────────────────────────────────────
    useEffect(() => {
        const unsubs: (() => void)[] = [];

        // MQTT table updates
        unsubs.push(subscribe('billiard/tables/update', (updated: any) => {
            if (!updated?.id) return;
            setTables(prev => {
                const alreadyExists = prev.some(t => t.id === updated.id);
                if (!alreadyExists) {
                    return [...prev, updated].sort((a, b) => a.tableName.localeCompare(b.tableName, undefined, { numeric: true }));
                }
                return prev.map(t => t.id !== updated.id ? t : {
                    ...t,
                    ...updated,
                    // LOCK: If testing, ignore external light status
                    isLightOn: iotTestRef.current ? t.isLightOn : (updated.hasOwnProperty('isLightOn') ? updated.isLightOn : t.isLightOn),
                });
            });
        }));

        // MQTT heartbeat
        unsubs.push(subscribe('billiard/heartbeat/+', (data: any) => {
            if (!data?.tableId) return;
            const isOffline = data.connectivity === 'OFFLINE' || data.status === 'OFFLINE' || data.online === false;
            setTables(prev => prev.map(t => t.id === data.tableId
                ? { ...t, isOffline }
                : t
            ));
        }));

        return () => unsubs.forEach(u => u());
    }, [subscribe]);

    // ── Helpers ──────────────────────────────────────────────────────────────────
    const setTableMeta = useCallback((id: number, update: Partial<TableMeta>) => {
        setMeta(prev => ({ ...prev, [id]: { ...(prev[id] || DEFAULT_META), ...update } }));
    }, []);

    // Online = macAddress ada DAN lastHeartbeat < 7 menit yang lalu
    // PENTING: JANGAN pakai updatedAt karena itu berubah saat billing update juga!
    // Threshold 7 menit sesuai throttle DB backend (5 mnt) + buffer jitter
    const ONLINE_THRESHOLD_MS = 7 * 60 * 1000;

    const isOnline = (t: TableState) => {
        if (!t.macAddress) return false;
        
        // Prioritas 1: Sinyal real-time dari WebSocket
        if (t.isOffline === false) return true;
        if (t.isOffline === true) return false;

        // Prioritas 2: Data historis dari database
        if (t.lastHeartbeat) {
            const diff = Date.now() - new Date(t.lastHeartbeat).getTime();
            return diff < ONLINE_THRESHOLD_MS;
        }

        return false;
    };

    // ── Ping ─────────────────────────────────────────────────────────────────────
    const handlePingOne = async (tableId: number) => {
        if (meta[tableId]?.pingStatus === 'pinging') return;
        setTableMeta(tableId, { pingStatus: 'pinging' });
        try {
            const res = await axios.post(`/billiard/tables/${tableId}/ping`, {});
            setTableMeta(tableId, {
                pingStatus: 'sent',
                pingAt: res.data?.sentAt ?? new Date().toISOString(),
                pingTopic: res.data?.topic ?? null
            });
            setTimeout(() => setTableMeta(tableId, { pingStatus: 'idle' }), 8000);
        } catch {
            setTableMeta(tableId, { pingStatus: 'error' });
            setTimeout(() => setTableMeta(tableId, { pingStatus: 'idle' }), 5000);
        }
    };

    // ── Light Toggle (Cancel-and-Replace) ────────────────────────────────────────
    // Klik rapid → cancel request lama → update UI langsung → debounce 80ms → kirim request baru
    // Ini memastikan: klik terakhir SELALU menang, tidak ada blocking, UI selalu sinkron
    const handleToggleLight = useCallback((tableId: number, newState: boolean) => {
        // 1. Simpan state yang diinginkan dari klik terbaru
        pendingStateRef.current[tableId] = newState;

        // 2. Update UI SEKETIKA (optimistic) — tidak perlu tunggu apapun
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, isLightOn: newState } : t));
        setTableMeta(tableId, { lightStatus: 'loading' });

        // 3. Cancel debounce sebelumnya (jika ada rapid click)
        if (debounceRefs.current[tableId]) clearTimeout(debounceRefs.current[tableId]);

        // 4. Debounce 80ms: kumpulkan klik rapid, hanya kirim yang terakhir
        debounceRefs.current[tableId] = setTimeout(async () => {
            // Ambil state final yang diinginkan (klik terakhir)
            const finalState = pendingStateRef.current[tableId];

            // 5. Cancel request sebelumnya jika masih in-flight
            if (abortRefs.current[tableId]) {
                abortRefs.current[tableId].abort();
            }

            // 6. Buat AbortController baru untuk request ini
            const controller = new AbortController();
            abortRefs.current[tableId] = controller;

            try {
                const res = await axios.patch(
                    `/billiard/tables/${tableId}/toggle-light`,
                    { isOn: finalState },
                    { signal: controller.signal }
                );
                if (!controller.signal.aborted) {
                    // Konfirmasi state dari server (jika beda, koreksi)
                    if (res.data && res.data.hasOwnProperty('isLightOn')) {
                        setTables(prev => prev.map(t =>
                            t.id === tableId ? { ...t, isLightOn: Boolean(res.data.isLightOn) } : t
                        ));
                    }
                    setTableMeta(tableId, { lightStatus: 'success' });
                    setTimeout(() => setTableMeta(tableId, { lightStatus: 'idle' }), 2000);
                }
            } catch (err: any) {
                if (axios.isCancel(err) || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
                    // Request di-cancel oleh klik berikutnya — ini NORMAL, bukan error
                    return;
                }
                // Error nyata: revert UI ke state sebelumnya
                setTables(prev => prev.map(t => t.id === tableId ? { ...t, isLightOn: !finalState } : t));
                setTableMeta(tableId, { lightStatus: 'error' });
                setTimeout(() => setTableMeta(tableId, { lightStatus: 'idle' }), 3000);
            }
        }, 80); // 80ms debounce — cukup cepat untuk terasa instan, cukup lambat untuk koalesce rapid click
    }, [setTableMeta]);

    // ── Ping All ─────────────────────────────────────────────────────────────────
    const handlePingAll = async () => {
        if (pingAllStatus === 'running') return;
        setPingAllStatus('running');
        tables.forEach(t => setTableMeta(t.id, { pingStatus: 'pinging' }));
        try {
            const res = await axios.post(`/billiard/tables/ping-all`, {});
            (res.data || []).forEach((r: any) => {
                setTableMeta(r.tableId, r.status === 'fulfilled'
                    ? { pingStatus: 'sent', pingAt: r.result?.sentAt ?? new Date().toISOString(), pingTopic: r.result?.topic ?? null }
                    : { pingStatus: 'error' }
                );
            });
        } catch {
            tables.forEach(t => setTableMeta(t.id, { pingStatus: 'error' }));
        } finally {
            setPingAllStatus('done');
            setTimeout(() => setPingAllStatus('idle'), 8000);
        }
    };

    // ── Test IoT (Animations) ──────────────────────────────────────────────────
    const handleToggleLightSilent = async (tableId: number, isOn: boolean) => {
        // Optimistic update (Improves visual rhythm)
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, isLightOn: isOn } : t));
        try {
            await axios.patch(
                `/billiard/tables/${tableId}/toggle-light`,
                { isOn }
            );
        } catch {
            // Silently fail as this is for testing, but state was already updated above
        }
    };

    const stopTest = () => {
        iotTestRef.current = false;
        setIsTestingIoT(false);
    };

    const runIotTest = async (mode: string) => {
        if (iotTestRef.current) return;
        iotTestRef.current = true;
        setIsTestingIoT(true);
        setTestModeDropdown(false);

        // Simpan state awal untuk dikembalikan setelah test selesai
        const initialStates = [...tables].map(t => ({ id: t.id, isLightOn: t.isLightOn }));

        try {
            const sortedTables = [...tables].sort((a, b) => a.tableName.localeCompare(b.tableName, undefined, { numeric: true }));
            if (sortedTables.length === 0) return;

            if (mode === 'sequential_on') {
                showAlert('Testing', 'Lampu menyala berurutan...', { variant: 'info' });
                // No more forced reset to OFF - sequential on will just light them up as they go

                for (const t of sortedTables) {
                    if (!iotTestRef.current) break;
                    handleToggleLightSilent(t.id, true);
                    await new Promise(r => setTimeout(r, 500));
                }
            } else if (mode === 'sequential_off') {
                showAlert('Testing', 'Lampu mati berurutan...', { variant: 'info' });
                // No more forced reset to ON - sequential off will just turn them off as they go

                for (const t of sortedTables) {
                    if (!iotTestRef.current) break;
                    handleToggleLightSilent(t.id, false);
                    await new Promise(r => setTimeout(r, 500));
                }
            } else if (mode === 'dancing') {
                showAlert('Testing', 'Lampu menari (Ganjil-Genap)...', { variant: 'info' });
                const odds = sortedTables.filter((_, i) => i % 2 === 0);
                const evens = sortedTables.filter((_, i) => i % 2 !== 0);

                for (let i = 0; i < 5; i++) {
                    if (!iotTestRef.current) break;
                    odds.forEach(t => handleToggleLightSilent(t.id, true));
                    evens.forEach(t => handleToggleLightSilent(t.id, false));
                    await new Promise(r => setTimeout(r, 500));

                    if (!iotTestRef.current) break;
                    odds.forEach(t => handleToggleLightSilent(t.id, false));
                    evens.forEach(t => handleToggleLightSilent(t.id, true));
                    await new Promise(r => setTimeout(r, 500));
                }
            } else if (mode === 'wave') {
                showAlert('Testing', 'Mexican Wave (Gelombang)...', { variant: 'info' });
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < sortedTables.length; j++) {
                        if (!iotTestRef.current) break;
                        handleToggleLightSilent(sortedTables[j].id, true);
                        if (j > 0) handleToggleLightSilent(sortedTables[j - 1].id, false);
                        else handleToggleLightSilent(sortedTables[sortedTables.length - 1].id, false);
                        await new Promise(r => setTimeout(r, 500));
                    }
                }
            } else if (mode === 'chaser') {
                showAlert('Testing', 'Knight Rider Chaser...', { variant: 'info' });
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < sortedTables.length; j++) {
                        if (!iotTestRef.current) break;
                        sortedTables.forEach(t => handleToggleLightSilent(t.id, false));
                        handleToggleLightSilent(sortedTables[j].id, true);
                        await new Promise(r => setTimeout(r, 500));
                    }
                    for (let j = sortedTables.length - 2; j > 0; j--) {
                        if (!iotTestRef.current) break;
                        sortedTables.forEach(t => handleToggleLightSilent(t.id, false));
                        handleToggleLightSilent(sortedTables[j].id, true);
                        await new Promise(r => setTimeout(r, 500));
                    }
                }
            } else if (mode === 'strobe') {
                showAlert('Testing', 'STROBE EXTREME (Cepat)...', { variant: 'warning' });
                for (let i = 0; i < 20; i++) {
                    if (!iotTestRef.current) break;
                    sortedTables.forEach(t => handleToggleLightSilent(t.id, true));
                    await new Promise(r => setTimeout(r, 500));

                    if (!iotTestRef.current) break;
                    sortedTables.forEach(t => handleToggleLightSilent(t.id, false));
                    await new Promise(r => setTimeout(r, 500));
                }
            } else if (mode === 'random_chaos') {
                showAlert('Testing', 'Mode Chaos (Acak & Cepat)...', { variant: 'info' });
                for (let i = 0; i < 30; i++) {
                    if (!iotTestRef.current) break;
                    const randomTable = sortedTables[Math.floor(Math.random() * sortedTables.length)];
                    const isRandomOn = Math.random() > 0.5;
                    await handleToggleLightSilent(randomTable.id, isRandomOn);
                    await new Promise(r => setTimeout(r, 100)); // Very fast
                }
            } else if (mode === 'meteor_shower') {
                showAlert('Testing', 'Hujan Meteor...', { variant: 'info' });
                for (let i = 0; i < 4; i++) {
                    for (let j = 0; j < sortedTables.length + 2; j++) {
                        if (!iotTestRef.current) break;
                        if (j < sortedTables.length) handleToggleLightSilent(sortedTables[j].id, true);
                        if (j >= 2 && j - 2 < sortedTables.length) handleToggleLightSilent(sortedTables[j - 2].id, false);
                        await new Promise(r => setTimeout(r, 500));
                    }
                }
                sortedTables.forEach(t => handleToggleLightSilent(t.id, false));
            } else if (mode === 'split_center') {
                showAlert('Testing', 'Belah Tengah (Split Center)...', { variant: 'info' });
                const mid = Math.floor(sortedTables.length / 2);
                for (let i = 0; i < 4; i++) {
                    sortedTables.forEach(t => handleToggleLightSilent(t.id, false));
                    // Outward
                    for (let step = 0; step <= mid; step++) {
                        if (!iotTestRef.current) break;
                        if (mid - step >= 0) handleToggleLightSilent(sortedTables[mid - step].id, true);
                        if (mid + step < sortedTables.length) handleToggleLightSilent(sortedTables[mid + step].id, true);
                        await new Promise(r => setTimeout(r, 500));
                    }
                    // Inward
                    for (let step = mid; step >= 0; step--) {
                        if (!iotTestRef.current) break;
                        if (mid - step >= 0) handleToggleLightSilent(sortedTables[mid - step].id, false);
                        if (mid + step < sortedTables.length) handleToggleLightSilent(sortedTables[mid + step].id, false);
                        await new Promise(r => setTimeout(r, 500));
                    }
                }
            } else if (mode === 'heartbeat') {
                showAlert('Testing', 'Detak Jantung (Heartbeat)...', { variant: 'info' });
                for (let i = 0; i < 8; i++) {
                    if (!iotTestRef.current) break;
                    sortedTables.forEach(t => handleToggleLightSilent(t.id, true));
                    await new Promise(r => setTimeout(r, 500));
                    sortedTables.forEach(t => handleToggleLightSilent(t.id, false));
                    await new Promise(r => setTimeout(r, 500));

                    if (!iotTestRef.current) break;
                    sortedTables.forEach(t => handleToggleLightSilent(t.id, true));
                    await new Promise(r => setTimeout(r, 500));
                    sortedTables.forEach(t => handleToggleLightSilent(t.id, false));
                    await new Promise(r => setTimeout(r, 1000));
                }
            } else if (mode === 'alternating_blocks') {
                showAlert('Testing', 'Blok Berganti (Kiri-Kanan)...', { variant: 'info' });
                const mid = Math.floor(sortedTables.length / 2);
                for (let i = 0; i < 6; i++) {
                    if (!iotTestRef.current) break;
                    sortedTables.forEach((t, idx) => handleToggleLightSilent(t.id, idx < mid));
                    await new Promise(r => setTimeout(r, 500));

                    if (!iotTestRef.current) break;
                    sortedTables.forEach((t, idx) => handleToggleLightSilent(t.id, idx >= mid));
                    await new Promise(r => setTimeout(r, 500));
                }
            } else if (mode === 'blink_all') {
                showAlert('Testing', 'Kedip bersamaan...', { variant: 'info' });
                for (let i = 0; i < 5; i++) {
                    if (!iotTestRef.current) break;
                    sortedTables.forEach(t => handleToggleLightSilent(t.id, true));
                    await new Promise(r => setTimeout(r, 500));

                    if (!iotTestRef.current) break;
                    sortedTables.forEach(t => handleToggleLightSilent(t.id, false));
                    await new Promise(r => setTimeout(r, 500));
                }
            } else if (mode === 'turn_off_all') {
                showAlert('Testing', 'Mematikan semua lampu...', { variant: 'info' });
                sortedTables.forEach(t => handleToggleLightSilent(t.id, false));
            }
        } finally {
            if (mode !== 'turn_off_all') {
                for (const state of initialStates) {
                    handleToggleLightSilent(state.id, state.isLightOn);
                    await new Promise(r => setTimeout(r, 100));
                }
            }
            iotTestRef.current = false;
            setIsTestingIoT(false);
            showAlert('Selesai', 'Sesi testing selesai. Kondisi lampu dikembalikan ke posisi awal.', { variant: 'success' });
        }
    };

    // ── Labels ───────────────────────────────────────────────────────────────────
    const statusInfo = (t: TableState) => {
        if (!t.macAddress) return { color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', icon: AlertTriangle, label: 'No MAC' };
        if (isOnline(t)) return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: Wifi, label: 'Online' };
        return { color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', icon: WifiOff, label: 'Offline' };
    };

    const pingLabel = (id: number) => {
        const p = meta[id]?.pingStatus;
        if (p === 'pinging') return { text: 'Mengirim...', cls: 'bg-amber-500 text-white animate-pulse', icon: Radio };
        if (p === 'sent') return { text: 'Ping Terkirim ✓', cls: 'bg-emerald-500 text-white', icon: CheckCircle2 };
        if (p === 'error') return { text: 'Gagal Ping', cls: 'bg-rose-500 text-white', icon: WifiOff };
        return { text: 'Ping Koneksi', cls: 'bg-slate-900 hover:bg-slate-700 text-white', icon: Radio };
    };

    const regulars = tables.filter(t => t.category !== 'VIP');
    const vips = tables.filter(t => t.category === 'VIP');
    const onlineCount = tables.filter(isOnline).length; // re-evaluates on tick

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">

            {/* ── Header ── */}
            <header className="relative z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white">
                <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10 relative">
                    <div className="absolute inset-0 opacity-[0.07] overflow-hidden rounded-lg pointer-events-none"
                        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.15) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-violet-600" />

                    <div className="relative flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center">
                                    <Cpu className="w-5 h-5 text-indigo-300" />
                                </div>
                                <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Hardware Control Panel</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Panel Kontrol Meja</h1>
                            <p className="text-white/50 text-sm font-medium mt-1">Cek koneksi ESP32 & kendalikan lampu meja secara manual</p>

                            <div className="flex flex-wrap items-center gap-3 mt-4">
                                {/* Socket indicator */}
                                <div className={`flex items-center gap-2 border rounded-2xl px-4 py-2 ${socketConnected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                                    <Circle className={`w-2 h-2 fill-current ${socketConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
                                    <span className="text-xs font-black text-white/70">
                                        {socketConnected ? 'Real-time Aktif' : 'Disconnected'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
                                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-xs font-black text-white/70">{onlineCount}/{tables.length} Online</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
                                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="text-xs font-black text-white/70">{tables.filter(t => t.isLightOn).length} Lampu Menyala</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 flex-wrap">
                            <button onClick={() => fetchTables(true)}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-black text-xs px-5 py-3 rounded-2xl transition-all active:scale-95">
                                <RefreshCw className="w-4 h-4" />
                                Refresh
                            </button>
                            <button onClick={handlePingAll} disabled={pingAllStatus === 'running'}
                                className={`flex items-center gap-2 font-black text-xs px-6 py-3 rounded-2xl transition-all active:scale-95 shadow-lg
                                    ${pingAllStatus === 'running' ? 'bg-indigo-400 text-white animate-pulse'
                                        : pingAllStatus === 'done' ? 'bg-emerald-500 text-white'
                                            : 'bg-indigo-500 hover:bg-indigo-400 text-white'}`}>
                                <Zap className="w-4 h-4" />
                                {pingAllStatus === 'running' ? 'Pinging...' : pingAllStatus === 'done' ? 'Ping Terkirim ✓' : 'Ping Semua Meja'}
                            </button>
                            <div className="relative w-full sm:w-auto">
                                {isTestingIoT ? (
                                    <button onClick={stopTest} className="bg-rose-500 text-white px-5 py-3 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 text-xs w-full sm:w-auto animate-pulse border-2 border-rose-400">
                                        <X className="w-4 h-4" /> STOP TESTING
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={() => setTestModeDropdown(!testModeDropdown)} className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-3 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 text-xs w-full">
                                            <Activity className="w-4 h-4" /> TEST LAMPU (IoT)
                                        </button>
                                        {testModeDropdown && (
                                            <div className="absolute right-0 sm:left-0 lg:right-0 lg:left-auto top-full mt-2 w-72 lg:w-80 bg-white rounded-xl shadow-2xl shadow-indigo-500/20 overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 border border-slate-100">
                                                <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                                        <p className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">Mode Uji Coba</p>
                                                    </div>
                                                    <button onClick={() => setTestModeDropdown(false)} className="text-indigo-400 hover:text-indigo-800"><X className="w-4 h-4" /></button>
                                                </div>
                                                <div className="p-2 max-h-[350px] overflow-y-auto custom-scrollbar space-y-1 text-slate-900">
                                                    <div className="px-3 pb-1 pt-2">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Animasi Dasar</p>
                                                    </div>
                                                    <button onClick={() => runIotTest('sequential_on')} className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2">
                                                        <ChevronRight className="w-4 h-4 text-emerald-500" /> Menyala Berurutan
                                                    </button>
                                                    <button onClick={() => runIotTest('sequential_off')} className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2">
                                                        <ChevronLeft className="w-4 h-4 text-rose-500" /> Mati Berurutan
                                                    </button>
                                                    <button onClick={() => runIotTest('dancing')} className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2">
                                                        <Shuffle className="w-4 h-4 text-indigo-500" /> Menari Ganjil-Genap (Lambat)
                                                    </button>
                                                    <button onClick={() => runIotTest('blink_all')} className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2">
                                                        <Sun className="w-4 h-4 text-orange-400" /> Kedip Bersamaan (1s)
                                                    </button>

                                                    <div className="my-2 border-t border-slate-100"></div>
                                                    <div className="px-3 pb-1 pt-2 flex items-center gap-1.5">
                                                        <Zap className="w-3 h-3 text-amber-500" />
                                                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Animasi Estetik & Brutal</p>
                                                    </div>
                                                    <button onClick={() => runIotTest('wave')} className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2">
                                                        <Activity className="w-4 h-4 text-sky-500" /> Ombak Berjalan (Wave)
                                                    </button>
                                                    <button onClick={() => runIotTest('chaser')} className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2">
                                                        <FastForward className="w-4 h-4 text-rose-500" /> Knight Rider Chaser
                                                    </button>
                                                    <button onClick={() => runIotTest('strobe')} className="w-full text-left px-3 py-2 text-[11px] font-black text-slate-800 bg-slate-100 hover:bg-slate-200 border-l-2 border-slate-800 rounded-lg transition-colors flex items-center gap-2">
                                                        <Zap className="w-4 h-4 text-slate-800" /> Strobe / Disco Extreme
                                                    </button>
                                                    <button onClick={() => runIotTest('meteor_shower')} className="w-full text-left px-3 py-2 text-[11px] font-black text-orange-600 bg-orange-50 hover:bg-orange-100 border-l-2 border-orange-500 rounded-lg transition-colors flex items-center gap-2">
                                                        <FastForward className="w-4 h-4 text-orange-500" /> Hujan Meteor (Cepat)
                                                    </button>
                                                    <button onClick={() => runIotTest('random_chaos')} className="w-full text-left px-3 py-2 text-[11px] font-black text-fuchsia-600 bg-fuchsia-50 hover:bg-fuchsia-100 border-l-2 border-fuchsia-500 rounded-lg transition-colors flex items-center gap-2">
                                                        <Hash className="w-4 h-4 text-fuchsia-500" /> Random Chaos (Berantakan)
                                                    </button>

                                                    <div className="my-2 border-t border-slate-100"></div>
                                                    <div className="px-3 pb-1 pt-2 flex items-center gap-1.5">
                                                        <Sun className="w-3 h-3 text-indigo-500" />
                                                        <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Animasi Sinematik</p>
                                                    </div>
                                                    <button onClick={() => runIotTest('split_center')} className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2">
                                                        <Activity className="w-4 h-4 text-indigo-500" /> Belah Tengah (Mekar)
                                                    </button>
                                                    <button onClick={() => runIotTest('heartbeat')} className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2">
                                                        <Activity className="w-4 h-4 text-rose-500" /> Detak Jantung (Heartbeat)
                                                    </button>
                                                    <button onClick={() => runIotTest('alternating_blocks')} className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2">
                                                        <Shuffle className="w-4 h-4 text-amber-500" /> Blok Berganti (Separuh)
                                                    </button>

                                                    <div className="my-2 border-t border-slate-100"></div>
                                                    <button onClick={() => runIotTest('turn_off_all')} className="w-full text-left px-3 py-2 text-[11px] font-black text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2">
                                                        <Power className="w-4 h-4" /> Matikan Semua Lampu
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500" />

            <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10 space-y-10">

                {/* Legend */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Keterangan Status</p>
                    <div className="flex flex-wrap gap-3">
                        {[
                            { icon: Wifi, label: 'Online', sub: 'Heartbeat < 3 mnt', c: 'text-emerald-600', bg: 'bg-emerald-50', b: 'border-emerald-200' },
                            { icon: WifiOff, label: 'Offline', sub: 'Tidak ada heartbeat', c: 'text-slate-500', bg: 'bg-slate-50', b: 'border-slate-200' },
                            { icon: AlertTriangle, label: 'No MAC', sub: 'MAC belum diatur', c: 'text-amber-600', bg: 'bg-amber-50', b: 'border-amber-200' },
                            { icon: Lightbulb, label: 'Lampu ON', sub: 'Relay aktif', c: 'text-yellow-600', bg: 'bg-yellow-50', b: 'border-yellow-200' },
                            { icon: Signal, label: 'ESP-NOW', sub: 'Node via Gateway', c: 'text-violet-600', bg: 'bg-violet-50', b: 'border-violet-200' },
                        ].map(({ icon: Icon, label, sub, c, bg, b }) => (
                            <div key={label} className={`flex items-start gap-2 ${bg} border ${b} rounded-xl px-3 py-2.5`}>
                                <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${c}`} />
                                <div>
                                    <p className={`text-xs font-black ${c}`}>{label}</p>
                                    <p className="text-[10px] text-slate-400">{sub}</p>
                                </div>
                            </div>
                        ))}
                        <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 ml-auto">
                            <Circle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-indigo-500 animate-pulse fill-indigo-500" />
                            <div>
                                <p className="text-xs font-black text-indigo-600">Real-time</p>
                                <p className="text-[10px] text-slate-400">Auto-sync via WebSocket & MQTT</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tables */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array(6).fill(0).map((_, i) => <div key={i} className="h-80 bg-slate-100 animate-pulse rounded-3xl" />)}
                    </div>
                ) : (
                    <>
                        {[{ label: 'Meja Regular', items: regulars, accent: 'indigo' }, { label: 'Meja VIP', items: vips, accent: 'violet' }]
                            .map(({ label, items, accent }) => items.length > 0 && (
                                <div key={label}>
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className={`w-2 h-2 rounded-full ${accent === 'indigo' ? 'bg-indigo-600' : 'bg-violet-600'}`} />
                                        <h2 className="text-lg font-black text-slate-800 tracking-tight">{label}</h2>
                                        <span className={`text-xs font-black px-3 py-1 rounded-full ${accent === 'indigo' ? 'text-indigo-600 bg-indigo-50 border border-indigo-100' : 'text-violet-600 bg-violet-50 border border-violet-100'}`}>
                                            {items.length} meja
                                        </span>
                                        <span className="text-xs font-black text-emerald-600 ml-1">
                                            {items.filter(isOnline).length} online
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {items.map(table => {
                                            const st = statusInfo(table);
                                            const StatusIcon = st.icon;
                                            const online = isOnline(table);
                                            const m = meta[table.id] || DEFAULT_META;
                                            const pInfo = pingLabel(table.id);
                                            const PIcon = pInfo.icon;
                                            const lightOn = table.isLightOn;
                                            const lightLoading = m.lightStatus === 'loading';

                                            return (
                                                <div key={table.id}
                                                    className={`bg-white rounded-3xl border-2 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5
                                                        ${testingTableId === table.id ? 'border-amber-400 ring-4 ring-amber-100 scale-[1.02]'
                                                            : online ? 'border-emerald-100 hover:border-emerald-200'
                                                                : 'border-slate-100 hover:border-slate-200'}`}>

                                                    {/* Card Header */}
                                                    <div className={`p-4 border-b border-slate-100 transition-colors duration-500 ${lightOn ? 'bg-gradient-to-r from-amber-50 to-yellow-50' : 'bg-slate-50'}`}>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${lightOn ? 'bg-amber-100 shadow-lg shadow-amber-200' : 'bg-slate-200'}`}>
                                                                    <Lightbulb className={`w-5 h-5 transition-colors duration-500 ${lightOn ? 'text-amber-500' : 'text-slate-400'}`} />
                                                                    {lightOn && <span className="absolute inset-0 rounded-2xl bg-amber-300 animate-ping opacity-20" />}
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-black text-slate-900 text-sm leading-tight">{table.tableName}</h3>
                                                                    <span className={`text-[9px] font-black uppercase tracking-wider ${table.category === 'VIP' ? 'text-violet-600' : 'text-indigo-600'}`}>{table.category || 'REGULAR'}</span>
                                                                </div>
                                                            </div>

                                                            {/* Connection badge with live dot */}
                                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black ${st.bg} ${st.border} ${st.color}`}>
                                                                {online
                                                                    ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                    : <StatusIcon className="w-3 h-3 flex-shrink-0" />
                                                                }
                                                                {st.label}
                                                            </div>
                                                        </div>

                                                        <div className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl transition-all duration-500 ${lightOn ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${lightOn ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`} />
                                                            {lightLoading ? 'Memproses...' : `Lampu ${lightOn ? 'MENYALA' : 'MATI'}`}
                                                        </div>
                                                    </div>

                                                    {/* Info */}
                                                    <div className="px-4 py-3 space-y-2">
                                                        {/* Hardware Mode Badge */}
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mode</span>
                                                            {table.hardwareType === 'ESPNOW_NODE' ? (
                                                                <span className="text-[9px] font-black bg-violet-100 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                    <Signal className="w-2.5 h-2.5" /> ESP-NOW Prajurit
                                                                </span>
                                                            ) : table.hardwareType === 'MOC3062' ? (
                                                                <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                    <Wifi className="w-2.5 h-2.5" /> MOC WiFi
                                                                </span>
                                                            ) : table.hardwareType === 'PCF8575' ? (
                                                                <span className="text-[9px] font-black bg-cyan-100 text-cyan-700 border border-cyan-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                    <Wifi className="w-2.5 h-2.5" /> PCF WiFi
                                                                </span>
                                                            ) : (
                                                                <span className="text-[9px] font-black bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full">—</span>
                                                            )}
                                                        </div>
                                                        {[
                                                            {
                                                                label: table.hardwareType === 'ESPNOW_NODE' ? 'MAC Prajurit (Unique)' : 'MAC Address',
                                                                value: table.macAddress || '—',
                                                                cls: 'text-slate-700'
                                                            },
                                                            {
                                                                label: table.hardwareType === 'ESPNOW_NODE' ? 'ID Meja' : 'Relay Pin',
                                                                value: table.relayPin != null
                                                                    ? table.hardwareType === 'ESPNOW_NODE'
                                                                        ? `Meja ${table.relayPin}`
                                                                        : `Pin ${table.relayPin}`
                                                                    : '—',
                                                                cls: table.hardwareType === 'ESPNOW_NODE' ? 'text-violet-600' : 'text-indigo-600'
                                                            },
                                                            { label: 'Sesi', value: table.status, cls: table.status === 'available' ? 'text-emerald-600' : 'text-amber-600' },
                                                        ].map(row => (
                                                            <div key={row.label} className="flex items-center justify-between">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{row.label}</span>
                                                                <span className={`text-[10px] font-black font-mono ${row.cls} bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg max-w-[150px] truncate text-right`}>{row.value}</span>
                                                            </div>
                                                        ))}
                                                        {m.pingAt && (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Ping</span>
                                                                <span className="text-[10px] font-black text-emerald-600 font-mono">
                                                                    {new Date(m.pingAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="px-4 pb-4 space-y-2.5">
                                                        <div className="flex flex-col gap-2">
                                                            <button onClick={() => handlePingOne(table.id)} disabled={meta[table.id]?.pingStatus === 'pinging'}
                                                                className={`flex items-center justify-center gap-2 font-bold text-[10px] px-3 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm
                                                                ${pingLabel(table.id).cls}`}>
                                                                {React.createElement(pingLabel(table.id).icon, { className: 'w-3.5 h-3.5' })}
                                                                {table.hardwareType === 'ESPNOW_NODE'
                                                                    ? pingLabel(table.id).text.toUpperCase().replace('KONEKSI', 'PRAJURIT')
                                                                    : pingLabel(table.id).text.toUpperCase()}
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <button
                                                                onClick={() => handleToggleLight(table.id, true)}
                                                                disabled={lightOn || lightLoading}
                                                                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 border-2
                                                                    ${lightOn ? 'bg-amber-100 text-amber-600 border-amber-300 cursor-default'
                                                                        : lightLoading ? 'bg-slate-100 text-slate-400 border-slate-200 animate-pulse'
                                                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600'}`}>
                                                                <Lightbulb className="w-3.5 h-3.5" />
                                                                NYALAKAN
                                                            </button>

                                                            <button
                                                                onClick={() => handleToggleLight(table.id, false)}
                                                                disabled={!lightOn || lightLoading}
                                                                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 border-2
                                                                    ${!lightOn ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default'
                                                                        : lightLoading ? 'bg-slate-100 text-slate-400 border-slate-200 animate-pulse'
                                                                            : 'bg-white border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700'}`}>
                                                                <Power className="w-3.5 h-3.5" />
                                                                MATIKAN
                                                            </button>
                                                        </div>

                                                        {m.lightStatus === 'success' && (
                                                            <p className="text-[10px] font-black text-emerald-600 text-center flex items-center justify-center gap-1">
                                                                <CheckCircle2 className="w-3 h-3" /> Berhasil dikirim ke panel
                                                            </p>
                                                        )}
                                                        {m.lightStatus === 'error' && (
                                                            <p className="text-[10px] font-black text-rose-500 text-center flex items-center justify-center gap-1">
                                                                <AlertTriangle className="w-3 h-3" /> Gagal — coba lagi
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                        {tables.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                                <Server className="w-16 h-16 mb-4 opacity-20" />
                                <p className="font-black uppercase tracking-widest text-sm">Belum ada meja terkonfigurasi</p>
                            </div>
                        )}
                    </>
                )}


                {/* Safety note */}
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="font-black text-amber-800 text-sm mb-1">Catatan Penting — Kontrol Manual</p>
                            <p className="text-xs text-amber-700 leading-relaxed">
                                Mengubah status lampu secara manual <strong>tidak mempengaruhi hitungan sesi aktif</strong>.
                                Fitur ini hanya untuk maintenance dan pengujian panel box.
                                Status Online/Offline diperbarui secara real-time via WebSocket + MQTT, dan recalc tiap 15 detik otomatis.
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span className="text-[10px] font-black text-amber-600">
                                    Last sync: {lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
