'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { Wifi, Activity, ArrowDownToLine, ArrowUpFromLine, Cpu, MemoryStick } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const POLL_INTERVAL = 5000;

interface Stats {
    cpu: number;
    memUsed: number;
    memUsedMB: number;
    memTotalMB: number;
    download: number; // KB/s
    upload: number;   // KB/s
}

function SparkBar({ value, max = 100, color = 'bg-indigo-400' }: { value: number; max?: number; color?: string }) {
    const pct = Math.min(100, Math.round((value / max) * 100));
    return (
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-700 ${color}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

function StatItem({
    icon,
    label,
    value,
    unit,
    barValue,
    barMax,
    barColor,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    unit: string;
    barValue?: number;
    barMax?: number;
    barColor?: string;
}) {
    return (
        <div className="flex flex-col gap-0.5 min-w-[52px]">
            <div className="flex items-center gap-1 opacity-60">
                {icon}
                <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <div className="flex items-baseline gap-0.5">
                <span className="text-[11px] font-black leading-none">{value}</span>
                <span className="text-[7px] opacity-50 font-bold">{unit}</span>
            </div>
            {barValue !== undefined && (
                <SparkBar value={barValue} max={barMax} color={barColor} />
            )}
        </div>
    );
}

export default function NetworkMonitor() {
    const [ping, setPing] = useState<number | null>(null);
    const [stats, setStats] = useState<Stats | null>(null);
    const [connected, setConnected] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    useBodyScrollLock(expanded);


    const fetchStats = useCallback(async () => {
        try {
            // Measure ping using a dedicated lightweight endpoint
            const pingStart = Date.now();
            await axios.get(`${API_URL}/settings/ping`, { timeout: 10000 });
            setPing(Date.now() - pingStart);

            // Fetch stats in the background
            const statsRes = await axios.get(`${API_URL}/settings/stats`, { timeout: 15000 });
            setStats(statsRes.data);
            setConnected(true);
        } catch (error) {
            console.error('NetworkMonitor fetch error:', error);
            setConnected(false);
            // Don't reset ping immediately on stats failure, let it show the last known or null
        }
    }, []);

    useEffect(() => {
        fetchStats();
        intervalRef.current = setInterval(fetchStats, POLL_INTERVAL);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [fetchStats]);

    const pingColor = ping === null ? 'text-rose-300' :
        ping < 50 ? 'text-emerald-300' :
            ping < 150 ? 'text-amber-300' : 'text-rose-300';

    const pingBarColor = ping === null ? 'bg-rose-400' :
        ping < 50 ? 'bg-emerald-400' :
            ping < 150 ? 'bg-amber-400' : 'bg-rose-400';

    return (
        <div className="relative">
            <button
                onClick={() => setExpanded(prev => !prev)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl border transition-all duration-300 text-white ${connected
                    ? 'bg-slate-800/90 border-slate-700 hover:bg-slate-700/90'
                    : 'bg-rose-900/80 border-rose-700 animate-pulse'
                    }`}
            >
                {/* Connection indicator */}
                <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-rose-400'} ${connected ? 'animate-pulse' : ''}`} />
                    <Wifi className="w-3 h-3 opacity-70" />
                </div>

                <div className="text-right">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-60 leading-none">Status Server</p>
                    <p className="text-[10px] font-black leading-tight">
                        {connected ? 'CONNECTED' : 'OFFLINE'}
                    </p>
                </div>

                {/* Ping badge */}
                {ping !== null && (
                    <div className={`text-[9px] font-black px-2 py-0.5 rounded-lg bg-white/10 ${pingColor} leading-none`}>
                        {ping}ms
                    </div>
                )}
            </button>

            {/* Expanded panel */}
            {expanded && connected && stats && (
                <div className="absolute top-full right-0 mt-2 z-50 animate-in zoom-in-95 slide-in-from-top-2 duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 w-[300px] shadow-2xl text-white">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-indigo-400" />
                                <span className="text-xs font-black uppercase tracking-widest text-slate-300">Server Monitor</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
                                <span className="text-[9px] font-black text-emerald-400 uppercase">Live</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Ping */}
                            <div className="bg-white/5 rounded-2xl p-3 space-y-2">
                                <div className="flex items-center gap-1.5 opacity-60">
                                    <Wifi className="w-3 h-3" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Ping</span>
                                </div>
                                <div className={`text-2xl font-black ${pingColor}`}>
                                    {ping ?? '—'}<span className="text-xs ml-1 opacity-60">ms</span>
                                </div>
                                <SparkBar value={ping ?? 0} max={300} color={pingBarColor} />
                            </div>

                            {/* CPU */}
                            <div className="bg-white/5 rounded-2xl p-3 space-y-2">
                                <div className="flex items-center gap-1.5 opacity-60">
                                    <Cpu className="w-3 h-3" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">CPU</span>
                                </div>
                                <div className={`text-2xl font-black ${stats.cpu > 80 ? 'text-rose-400' : stats.cpu > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {stats.cpu}<span className="text-xs ml-0.5 opacity-60">%</span>
                                </div>
                                <SparkBar value={stats.cpu} max={100} color={stats.cpu > 80 ? 'bg-rose-400' : stats.cpu > 50 ? 'bg-amber-400' : 'bg-emerald-400'} />
                            </div>

                            {/* RAM */}
                            <div className="bg-white/5 rounded-2xl p-3 space-y-2">
                                <div className="flex items-center gap-1.5 opacity-60">
                                    <MemoryStick className="w-3 h-3" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">RAM</span>
                                </div>
                                <div className="text-2xl font-black text-indigo-300">
                                    {stats.memUsed}<span className="text-xs ml-0.5 opacity-60">%</span>
                                </div>
                                <SparkBar value={stats.memUsed} max={100} color="bg-indigo-400" />
                                <p className="text-[8px] text-slate-500 font-bold">{stats.memUsedMB} / {stats.memTotalMB} MB</p>
                            </div>

                            {/* Network */}
                            <div className="bg-white/5 rounded-2xl p-3 space-y-1.5">
                                <div className="flex items-center gap-1.5 opacity-60">
                                    <Activity className="w-3 h-3" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Network</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <ArrowDownToLine className="w-3 h-3 text-sky-400 flex-shrink-0" />
                                    <div className="flex-1">
                                        <div className="text-[10px] font-black text-sky-300">{stats.download} <span className="opacity-50 text-[8px]">KB/s</span></div>
                                        <SparkBar value={stats.download} max={1024} color="bg-sky-400" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <ArrowUpFromLine className="w-3 h-3 text-violet-400 flex-shrink-0" />
                                    <div className="flex-1">
                                        <div className="text-[10px] font-black text-violet-300">{stats.upload} <span className="opacity-50 text-[8px]">KB/s</span></div>
                                        <SparkBar value={stats.upload} max={1024} color="bg-violet-400" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Auto-refresh every 3s</span>
                            <div className="flex gap-1">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-0.5 h-3 bg-indigo-500/40 rounded-full animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Backdrop to close */}
            {expanded && (
                <div className="fixed inset-0 z-40" onClick={() => setExpanded(false)} />
            )}
        </div>
    );
}
