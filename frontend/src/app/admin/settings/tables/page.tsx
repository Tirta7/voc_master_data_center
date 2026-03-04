'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { socket } from '@/lib/socket';
import { useMqtt } from '@/context/MqttContext';
import {
    Wifi, WifiOff, Lightbulb, Power, Radio,
    AlertTriangle, CheckCircle2, Clock, Cpu,
    RefreshCw, Zap, Activity, Server, Circle
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type PingStatus = 'idle' | 'pinging' | 'sent' | 'error';
type LightStatus = 'idle' | 'loading' | 'success' | 'error';

interface TableState {
    id: number;
    tableName: string;
    category: 'REGULAR' | 'VIP';
    macAddress: string | null;
    relayPin: number | null;
    isLightOn: boolean;
    status: string;
    updatedAt: string;
    isOffline?: boolean; // heartbeat-derived
}

interface TableMeta {
    pingStatus: PingStatus;
    pingAt: string | null;
    pingTopic: string | null;
    lightStatus: LightStatus;
}

const DEFAULT_META: TableMeta = { pingStatus: 'idle', pingAt: null, pingTopic: null, lightStatus: 'idle' };

function authHeader() {
    return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

export default function PanelControlPage() {
    const [tables, setTables] = useState<TableState[]>([]);
    const [meta, setMeta] = useState<Record<number, TableMeta>>({});
    const [loading, setLoading] = useState(true);
    const [pingAllStatus, setPingAllStatus] = useState<'idle' | 'running' | 'done'>('idle');
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [socketConnected, setSocketConnected] = useState(false);
    // Tick every 15s to re-evaluate "connected" based on updatedAt freshness
    const [tick, setTick] = useState(0);
    const { subscribe } = useMqtt();

    // ── Fetch ────────────────────────────────────────────────────────────────────
    const fetchTables = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/billiard/tables`, { headers: authHeader() });
            const tbls: TableState[] = (res.data || []).filter((t: any) => !t.type || t.type === 'billiard');
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
                    return prev.some(t => t.id === updated.id) ? prev : [...prev, updated];
                }
                return prev.map(t => t.id !== updated.id ? t : {
                    ...t,
                    ...updated,
                    // Preserve meta fields we set locally
                    isOffline: t.isOffline,
                });
            });
        };

        // heartbeat — mark online/offline instantly
        const onHeartbeat = (data: any) => {
            if (!data?.tableId) return;
            setTables(prev => prev.map(t => t.id === data.tableId
                ? { ...t, isOffline: data.status === 'OFFLINE', updatedAt: data.timestamp ?? t.updatedAt }
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
            if (updated.type && updated.type !== 'billiard') return;
            setTables(prev => prev.map(t => t.id !== updated.id ? t : { ...t, ...updated }));
        }));

        // MQTT heartbeat
        unsubs.push(subscribe('billiard/heartbeat/+', (data: any) => {
            if (!data?.tableId) return;
            setTables(prev => prev.map(t => t.id === data.tableId
                ? { ...t, isOffline: data.status === 'OFFLINE' }
                : t
            ));
        }));

        return () => unsubs.forEach(u => u());
    }, [subscribe]);

    // ── Helpers ──────────────────────────────────────────────────────────────────
    const setTableMeta = useCallback((id: number, update: Partial<TableMeta>) => {
        setMeta(prev => ({ ...prev, [id]: { ...(prev[id] || DEFAULT_META), ...update } }));
    }, []);

    // Online = macAddress is set, NOT explicitly offline, and updatedAt is fresh (< 3 min)
    const isOnline = (t: TableState) => {
        if (!t.macAddress) return false;
        if (t.isOffline) return false;
        const ageMin = (Date.now() - new Date(t.updatedAt).getTime()) / 60000;
        return ageMin < 3;
    };

    // ── Ping ─────────────────────────────────────────────────────────────────────
    const handlePing = async (tableId: number) => {
        if (meta[tableId]?.pingStatus === 'pinging') return;
        setTableMeta(tableId, { pingStatus: 'pinging' });
        try {
            const res = await axios.post(`${API_URL}/billiard/tables/${tableId}/ping`, {}, { headers: authHeader() });
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

    // ── Light Toggle ─────────────────────────────────────────────────────────────
    const handleToggleLight = async (tableId: number, newState: boolean) => {
        if (meta[tableId]?.lightStatus === 'loading') return;
        setTableMeta(tableId, { lightStatus: 'loading' });
        // Optimistic update
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, isLightOn: newState } : t));
        try {
            const res = await axios.patch(
                `${API_URL}/billiard/tables/${tableId}/toggle-light`,
                { isOn: newState },
                { headers: authHeader() }
            );
            // Sync actual server state
            if (res.data) {
                setTables(prev => prev.map(t =>
                    t.id === tableId ? { ...t, isLightOn: Boolean(res.data.isLightOn) } : t
                ));
            }
            setTableMeta(tableId, { lightStatus: 'success' });
            setTimeout(() => setTableMeta(tableId, { lightStatus: 'idle' }), 3000);
        } catch {
            // Revert optimistic update
            setTables(prev => prev.map(t => t.id === tableId ? { ...t, isLightOn: !newState } : t));
            setTableMeta(tableId, { lightStatus: 'error' });
            setTimeout(() => setTableMeta(tableId, { lightStatus: 'idle' }), 3000);
        }
    };

    // ── Ping All ─────────────────────────────────────────────────────────────────
    const handlePingAll = async () => {
        if (pingAllStatus === 'running') return;
        setPingAllStatus('running');
        tables.forEach(t => setTableMeta(t.id, { pingStatus: 'pinging' }));
        try {
            const res = await axios.post(`${API_URL}/billiard/tables/ping-all`, {}, { headers: authHeader() });
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
            <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white">
                <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.07]"
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
                                                        ${online ? 'border-emerald-100 hover:border-emerald-200' : 'border-slate-100 hover:border-slate-200'}`}>

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
                                                        {[
                                                            { label: 'MAC', value: table.macAddress || '—', cls: 'text-slate-700' },
                                                            { label: 'Relay Pin', value: table.relayPin != null ? `Pin ${table.relayPin}` : '—', cls: 'text-indigo-600' },
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
                                                        <button
                                                            onClick={() => handlePing(table.id)}
                                                            disabled={m.pingStatus === 'pinging' || !table.macAddress}
                                                            title={!table.macAddress ? 'MAC Address belum dikonfigurasi' : ''}
                                                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${pInfo.cls}`}>
                                                            <PIcon className="w-3.5 h-3.5" />
                                                            {pInfo.text}
                                                        </button>

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
