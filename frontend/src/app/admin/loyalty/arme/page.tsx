'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    Target, Sparkles, Database, Loader2, Save, BarChart3, AlertTriangle, 
    ShieldCheck, Calculator, Orbit, Settings, Terminal, Activity, 
    TrendingUp, User, Clock, Zap, Cpu, Gauge, Layers, Info, Filter,
    ChevronRight, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart, 
    PieChart as PieIcon, LayoutDashboard, Database as DbIcon, ShieldAlert,
    Gem, Trophy, ZapOff, Briefcase, Users, Search
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, AreaChart, Area, BarChart as ReBarChart, 
    Bar, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import InputField from '@/components/ui/InputField';
import { useAuth } from '@/context/AuthContext';
import { socket } from '@/lib/socket';

// import { API_URL } from '@/utils/urlUtils';

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtK = (n: number) => fmt(n);

export default function ARMEMonitoringPage() {
    const [settings, setSettings] = useState<any>(null);
    const [gamificationStats, setGamificationStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [members, setMembers] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<'netProfit' | 'totalPlays' | 'points'>('netProfit');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [adjustData, setAdjustData] = useState({ memberId: 0, name: "", amount: 0, description: "" });
    const [overrideData, setOverrideData] = useState({ memberId: 0, name: "", currentRate: 0, targetRate: null as number | null });

    useEffect(() => {
        fetchData();
        socket.connect();
        socket.on('loyalty_updated', (data) => {
            fetchStats();
            if (data.type === 'SETTINGS_UPDATE') fetchSettings();
        });
        const interval = setInterval(fetchStats, 15000);
        return () => {
            socket.off('loyalty_updated');
            clearInterval(interval);
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [setRes, statRes] = await Promise.all([
                axios.get(`/settings`),
                axios.get(`/loyalty/admin/analytics`)
            ]);
            setSettings(setRes.data);
            setGamificationStats(statRes.data);
            const memRes = await axios.get(`/loyalty/admin/members/win-stats`);
            setMembers(memRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        const res = await axios.get(`/settings`);
        setSettings(res.data);
    };

    const fetchStats = async () => {
        const [statRes, memRes] = await Promise.all([
          axios.get(`/loyalty/admin/analytics`),
          axios.get(`/loyalty/admin/members/win-stats`)
        ]);
        setGamificationStats(statRes.data);
        setMembers(memRes.data);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.patch(`/settings`, settings);
        } catch (error) {
            console.error('Save error', error);
        } finally {
            setSaving(false);
        }
    };

    const sessionID = useMemo(() => "ARME-" + Math.random().toString(36).substr(2, 6).toUpperCase(), []);

    // Instant real-time save for critical game parameters
    const saveInstant = async (patch: Record<string, any>) => {
        try {
            await axios.patch(`/settings`, patch);
        } catch (e) {
            console.error('Instant save error', e);
        }
    };

    const handleAdjust = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`/loyalty/admin/adjust`, {
                memberId: adjustData.memberId,
                amount: adjustData.amount,
                description: adjustData.description || "ARME Manual Adjustment"
            });
            setShowAdjustModal(false);
            fetchStats();
        } catch (err) { console.error(err); }
    };

    const handleOverride = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`/loyalty/admin/members/target-winrate`, {
                memberId: overrideData.memberId,
                targetWinRate: overrideData.targetRate
            });
            setShowOverrideModal(false);
            fetchStats();
        } catch (err) { console.error(err); }
    };

    const openAdjust = (member: any) => {
        setAdjustData({ memberId: member.id, name: member.name, amount: 0, description: "" });
        setShowAdjustModal(true);
    };

    const openOverride = (member: any) => {
        setOverrideData({ memberId: member.id, name: member.name, currentRate: member.actualWinRate, targetRate: member.targetWinRate });
        setShowOverrideModal(true);
    };

    const analytics = useMemo(() => {
        if (!settings || !gamificationStats) return null;
        return {
            houseEdge: gamificationStats.houseEdge || 0,
            rtp: gamificationStats.rtp || 0,
            poolDepth: gamificationStats.winPool || 0,
            survivalScore: (gamificationStats.winPool || 0) / 1000, 
            performance: gamificationStats.performance || 0,
            systemIntegrity: gamificationStats.armeStatus?.systemIntegrity || 'UNKNOWN'
        };
    }, [settings, gamificationStats]);

    const activeAnalytics = analytics;

    if (loading || !activeAnalytics) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#020617]">
                <div className="relative">
                    <div className="w-24 h-24 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Cpu className="text-indigo-400 w-8 h-8 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 font-['Outfit'] selection:bg-indigo-500/30 overflow-x-hidden relative">
            <div className="fixed inset-0 neural-bg pointer-events-none z-0"></div>
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="scan-line top-1/4 opacity-20"></div>
                <div className="scan-line top-3/4 opacity-10"></div>
            </div>
            
            <div className="relative z-10 flex flex-col h-screen">
                {/* GLOBAL TOP NAV */}
                <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl px-12 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg ring-1 ring-white/20">
                            <Orbit className="w-6 h-6 text-white animate-spin-slow" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-[0.2em] leading-none mb-1">ARME·MISSION·CONTROL</h1>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.4em]">Autonomous Revenue Engine</span>
                                <div className="h-1 w-1 rounded-full bg-indigo-500/40"></div>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Ver v4.28</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                        <div className="hidden xl:flex items-center gap-6">
                            <StatPill icon={Activity} label="SYS_LOAD" val="2.4%" color="emerald" />
                            <StatPill icon={Zap} label="INTEGRITY" val={activeAnalytics.systemIntegrity} color={activeAnalytics.performance > 0 ? "indigo" : "amber"} />
                            <StatPill icon={Database} label="POOL_SYNC" val="ACTIVE" color="indigo" />
                        </div>
                        <button onClick={handleSave} disabled={saving} className="px-8 py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 flex items-center gap-2 group shadow-xl shadow-white/5">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Save className="w-4 h-4 text-black group-hover:rotate-12 transition-transform" />}
                            {saving ? "SYNCING" : "COMMIT CHANGES"}
                        </button>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT CONTROL SIDEBAR */}
                    <aside className="w-[420px] border-r border-white/5 bg-black/20 backdrop-blur-3xl overflow-y-auto no-scrollbar p-10 space-y-12">
                        {/* AUTO PILOT MASTER CARD */}
                        <div className={`p-8 rounded-[3rem] border-2 transition-all duration-1000 relative overflow-hidden group ${settings.gamificationAutoPilot ? "bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_50px_rgba(99,102,241,0.1)]" : "bg-white/5 border-white/10"}`}>
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Cpu className="w-24 h-24 text-white" />
                            </div>
                            
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${settings.gamificationAutoPilot ? "bg-indigo-500 text-white" : "bg-white/10 text-slate-500"}`}>
                                        <Cpu className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-white tracking-widest uppercase">Hybrid Intelligence</span>
                                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Active Pilot System</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSettings({...settings, gamificationAutoPilot: !settings.gamificationAutoPilot})}
                                    className={`w-14 h-7 rounded-full relative transition-all duration-500 ${settings.gamificationAutoPilot ? "bg-indigo-500" : "bg-white/10 ring-1 ring-white/10"}`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-500 shadow-xl ${settings.gamificationAutoPilot ? "translate-x-8" : "translate-x-1"}`}></div>
                                </button>
                            </div>
                            
                            <p className="text-[11px] text-slate-400 italic mb-8 leading-relaxed opacity-60 px-2 h-8">
                                {settings.gamificationAutoPilot ? '"ARME is currently optimizing Slot weight tables and RTP across all active engines."' : '"Manual override active. System awaiting human parameter input."'}
                            </p>
                            
                            <InputField 
                                label="TARGET SURPLUS REVENUE / MONTH" 
                                type="number" 
                                value={settings.gamificationTargetSurplus} 
                                savedValue={settings.gamificationTargetSurplus}
                                onChange={v => setSettings({...settings, gamificationTargetSurplus: Number(v)})} 
                                className="!bg-black !ring-2 !ring-indigo-500/50 !text-white font-mono text-2xl focus:!ring-indigo-500 focus:!shadow-[0_0_20px_rgba(99,102,241,0.4)] h-16"
                                isEditing={true}
                                placeholder="Enter Target Revenue..."
                                suffix={<span className="text-xs text-indigo-400 font-bold px-4">IDR</span>}
                            />
                        </div>

                        {/* ENGINE CONTROL PANELS */}
                        <div className="space-y-10">
                            <div>
                                <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                                    <Briefcase className="w-3 h-3 text-indigo-500" /> Operational Control
                                    <span className="ml-auto text-[8px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black">REALTIME</span>
                                </h3>
                                <div className="space-y-5">

                                    {/* SCRATCH WIN RATE */}
                                    <div className={`p-6 rounded-[1.5rem] border transition-all ${ settings.gamificationAutoPilot ? 'bg-indigo-500/5 border-indigo-500/20 opacity-70' : 'bg-white/5 border-white/5 hover:border-indigo-500/30' }`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Target className="w-3.5 h-3.5 text-indigo-400" />
                                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">SCRATCH_WIN_RATE</span>
                                            </div>
                                            <span className="font-mono font-black text-white text-lg">{settings.scratchBombWinRate}%</span>
                                        </div>
                                        <input
                                            type="range" min="1" max="100" step="1"
                                            disabled={settings.gamificationAutoPilot}
                                            value={settings.scratchBombWinRate}
                                            onChange={e => {
                                                const val = Number(e.target.value);
                                                setSettings({...settings, scratchBombWinRate: val});
                                            }}
                                            onMouseUp={e => saveInstant({ scratchBombWinRate: Number((e.target as HTMLInputElement).value) })}
                                            onTouchEnd={e => saveInstant({ scratchBombWinRate: Number((e.target as HTMLInputElement).value) })}
                                            className="w-full h-1.5 rounded-full accent-indigo-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                            style={{ background: `linear-gradient(to right, #6366f1 ${settings.scratchBombWinRate}%, rgba(255,255,255,0.06) ${settings.scratchBombWinRate}%)` }}
                                        />
                                        <div className="flex justify-between mt-1">
                                            <span className="text-[8px] text-slate-600 font-bold">1%</span>
                                            <span className="text-[8px] text-slate-600 font-bold">100%</span>
                                        </div>
                                    </div>

                                    {/* MAHJONG WIN RATE */}
                                    <div className={`p-6 rounded-[1.5rem] border transition-all ${ settings.gamificationAutoPilot ? 'bg-emerald-500/5 border-emerald-500/20 opacity-70' : 'bg-white/5 border-white/5 hover:border-emerald-500/30' }`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Gem className="w-3.5 h-3.5 text-emerald-400" />
                                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">MAHJONG_WIN_RATE</span>
                                            </div>
                                            <span className="font-mono font-black text-white text-lg">{settings.mahjongSlotWinRate}%</span>
                                        </div>
                                        <input
                                            type="range" min="1" max="100" step="1"
                                            disabled={settings.gamificationAutoPilot}
                                            value={settings.mahjongSlotWinRate}
                                            onChange={e => {
                                                const val = Number(e.target.value);
                                                setSettings({...settings, mahjongSlotWinRate: val});
                                            }}
                                            onMouseUp={e => saveInstant({ mahjongSlotWinRate: Number((e.target as HTMLInputElement).value) })}
                                            onTouchEnd={e => saveInstant({ mahjongSlotWinRate: Number((e.target as HTMLInputElement).value) })}
                                            className="w-full h-1.5 rounded-full accent-emerald-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                            style={{ background: `linear-gradient(to right, #10b981 ${settings.mahjongSlotWinRate}%, rgba(255,255,255,0.06) ${settings.mahjongSlotWinRate}%)` }}
                                        />
                                        <div className="flex justify-between mt-1">
                                            <span className="text-[8px] text-slate-600 font-bold">1%</span>
                                            <span className="text-[8px] text-slate-600 font-bold">100%</span>
                                        </div>
                                    </div>

                                    {/* BASE PLAY COST */}
                                    <div className="p-6 rounded-[1.5rem] border border-white/5 bg-white/5 hover:border-purple-500/30 transition-all">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Layers className="w-3.5 h-3.5 text-purple-400" />
                                                <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">BASE_PLAY_COST</span>
                                            </div>
                                            <span className="font-mono font-black text-white text-lg">{settings.scratchBombPlayCost} <span className="text-[10px] opacity-30">PTS</span></span>
                                        </div>
                                        <input
                                            type="range" min="1" max="50" step="1"
                                            value={settings.scratchBombPlayCost}
                                            onChange={e => {
                                                const val = Number(e.target.value);
                                                setSettings({...settings, scratchBombPlayCost: val});
                                            }}
                                            onMouseUp={e => saveInstant({ scratchBombPlayCost: Number((e.target as HTMLInputElement).value) })}
                                            onTouchEnd={e => saveInstant({ scratchBombPlayCost: Number((e.target as HTMLInputElement).value) })}
                                            className="w-full h-1.5 rounded-full accent-purple-500 cursor-pointer"
                                            style={{ background: `linear-gradient(to right, #a855f7 ${(settings.scratchBombPlayCost / 50) * 100}%, rgba(255,255,255,0.06) ${(settings.scratchBombPlayCost / 50) * 100}%)` }}
                                        />
                                        <div className="flex justify-between mt-1">
                                            <span className="text-[8px] text-slate-600 font-bold">1 PTS</span>
                                            <span className="text-[8px] text-slate-600 font-bold">50 PTS</span>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            <div>
                                <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                                    <ShieldAlert className="w-3 h-3 text-rose-500" /> Security Override
                                </h3>
                                <div className="p-6 bg-rose-500/5 border border-rose-500/10 rounded-[2rem] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Yield Protection</span>
                                        <span className="px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded uppercase tracking-tighter">MAX_SAFE</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 font-medium italic">Yield protection prevents total pool depletion by capping large wins when house vault is below 15% of monthly target.</p>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* MAIN ANALYTICS VIEW */}
                    <main className="flex-1 overflow-y-auto no-scrollbar p-12 space-y-12 bg-indigo-500/[0.01]">
                        {/* CORE ANALYTICS GRID (8-PILLARS) - ALIGNED TO USER SPEC */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <EliteCard 
                                icon={Layers} 
                                label="SCRATCH PLAYS" 
                                val={`${Number(gamificationStats?.totalPlays) || 0}x`} 
                                sub="Total putaran permainan Scratch Bomb" 
                                trend="VOLUME"
                                color="indigo" 
                            />
                            <EliteCard 
                                icon={ArrowDownRight} 
                                label="POINTS ABSORBED" 
                                val={`+${(Number(gamificationStats?.ptsIn) || 0).toLocaleString()} Pts`} 
                                sub="Poin yang masuk ke sistem (Biaya main)" 
                                trend="INCOMING"
                                color="emerald" 
                            />
                            <EliteCard 
                                icon={ArrowUpRight} 
                                label="JACKPOT DISTRIBUTED" 
                                val={`-${(Number(gamificationStats?.ptsOut) || 0).toLocaleString()} Pts`} 
                                sub="Poin yang dimenangkan oleh member" 
                                trend="OUTGOING"
                                color="rose" 
                            />
                            <EliteCard 
                                icon={Activity} 
                                label="NET POIN PROFIT" 
                                val={`${(Number(gamificationStats?.netProfitPoints) || 0).toLocaleString()} Pts`} 
                                sub="Laba bersih poin (Drain Mechanism)" 
                                trend="CRITICAL"
                                color="amber" 
                            />
                            <EliteCard 
                                icon={Database} 
                                label="WINPOOL AMUNITION" 
                                val={`${(Number(gamificationStats?.winPool) || 0).toLocaleString()} Pts`} 
                                sub="Saldo amunisi Jackpot mesin" 
                                trend="BUDGET"
                                color="purple" 
                            />
                            <EliteCard 
                                icon={User} 
                                label="LIVE LOBBY" 
                                val={`${Number(gamificationStats?.activePlayerCount) || 0}`} 
                                sub="User aktif bermain dalam 15 menit terakhir" 
                                trend="PLAYERS"
                                color="blue" 
                            />
                            <EliteCard 
                                icon={Cpu} 
                                label="AI OPERATIONAL MODE" 
                                val={analytics.systemIntegrity} 
                                sub="Strategi ARME AI saat ini berdasarkan performa" 
                                trend="PROTECTED"
                                color="indigo" 
                            />
                            <EliteCard 
                                icon={ShieldCheck} 
                                label="REVENUE PROTECTION" 
                                val={fmtK(Number(gamificationStats?.netProfitIDR) || 0)} 
                                sub="Uang riil yang sudah aman di kas (Omzet Member - Hadiah Keluar)" 
                                trend="SURPLUS"
                                color="emerald" 
                            />
                        </div>

                        {/* CHARTS DECK */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 glass-card rounded-[3.5rem] p-12 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                                    <BarChart3 className="w-48 h-48 text-indigo-500" />
                                </div>
                                <div className="flex items-center justify-between mb-16 relative z-10">
                                    <div>
                                        <h3 className="text-xl font-black text-white tracking-widest uppercase mb-1 flex items-center gap-3">
                                            <Zap className="w-5 h-5 text-indigo-400" /> Revenue Stream Delta
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em]">Temporal Transaction Volume</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Active_Plays</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-[380px] w-full relative z-10">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={gamificationStats?.trendData || []}>
                                            <defs>
                                                <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                            <XAxis dataKey="date" hide />
                                            <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 900}} />
                                            <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }} />
                                            <Area type="monotone" dataKey="amount" stroke="#6366f1" fill="url(#colorPerf)" strokeWidth={4} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="glass-card rounded-[3.5rem] p-12 flex flex-col items-center">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-12 text-center w-full">Yield Fingerprint</h3>
                                <div className="h-[320px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                                            { subject: 'Yield', A: Math.min(100, (activeAnalytics.houseEdge || 0) * 5) },
                                            { subject: 'Retention', A: activeAnalytics.rtp || 0 },
                                            { subject: 'Pool', A: Math.min(100, (activeAnalytics.survivalScore || 0) * 10) },
                                            { subject: 'M_Profit', A: Math.min(100, (gamificationStats?.mahjongStats?.rtp || 0)) },
                                            { subject: 'S_Profit', A: Math.min(100, (gamificationStats?.scratchStats?.rtp || 0)) },
                                        ]}>
                                            <PolarGrid stroke="rgba(255,255,255,0.05)" />
                                            <PolarAngleAxis dataKey="subject" tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 900}} />
                                            <Radar name="ARME" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-8 p-6 bg-indigo-500/5 ring-1 ring-white/5 rounded-2xl w-full">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Engine Rating</span>
                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Stable Alpha</span>
                                    </div>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 animate-pulse" style={{width: '85%'}}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* TELMETRY FEED & ENGINE RECAP */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                            <div className="lg:col-span-3 bg-black/40 border border-white/5 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent"></div>
                                <div className="flex items-center justify-between mb-10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-500/10 rounded-2xl ring-1 ring-indigo-500/20">
                                            <Terminal className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-white tracking-widest uppercase">Cognitive Logic Tunnel</h3>
                                            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">Session_Identifier: {sessionID}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-emerald-500/5 px-4 py-2 rounded-full border border-emerald-500/10">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)]"></div>
                                        <span className="text-[10px] font-mono text-emerald-500 font-bold tracking-widest">FEED.ACTIVE</span>
                                    </div>
                                </div>
                                
                                <div className="space-y-4 font-mono text-[11px] max-h-[420px] overflow-y-auto no-scrollbar pr-4">
                                    <div className="p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-[2.5rem] space-y-4 relative overflow-hidden group/logic">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover/logic:rotate-12 transition-transform duration-1000">
                                            <Sparkles className="w-20 h-20 text-indigo-400" />
                                        </div>
                                        <p className="text-indigo-400/50">[{new Date().toLocaleTimeString()}] $ BOOT_AI_AUTOPILOT_SUCCESS</p>
                                        <div className="grid grid-cols-2 gap-6 py-2">
                                            <p className="text-white flex flex-col gap-1">
                                                <span className="text-[9px] opacity-40 uppercase tracking-widest font-black">House_Edge_Base:</span> 
                                                <span className="text-indigo-400 font-black text-lg">{(activeAnalytics.houseEdge || 0).toFixed(2)}%</span>
                                            </p>
                                            <p className="text-white flex flex-col gap-1">
                                                <span className="text-[9px] opacity-40 uppercase tracking-widest font-black">Surplus_Gap:</span> 
                                                <span className={`${activeAnalytics.performance >= 100 ? "text-emerald-400" : "text-rose-400"} font-black text-lg`}>
                                                    {fmt(Math.abs((gamificationStats?.netProfitIDR || 0) - (settings.gamificationTargetSurplus || 0)))}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="h-px bg-white/5 my-2"></div>
                                        <p className="text-white font-black tracking-widest flex items-center gap-2">
                                            <Cpu className="w-3 h-3 text-indigo-400" /> 
                                            DECISION_REF_ID: <span className="text-indigo-500">OPTIMIZE_YIELD_{Math.round(activeAnalytics.performance || 0)}</span>
                                        </p>
                                        <p className="text-slate-400 leading-relaxed pl-6 border-l-2 border-indigo-500/30 font-medium">
                                            "{gamificationStats?.armeStatus?.autoPilot ? 'Machine analyzed total plays. Current yield efficiency matches linear target. Maintaining standard volatility tables.' : 'Manual override detected. AI in diagnostic polling mode.'}"
                                        </p>
                                    </div>

                                    <div className="space-y-2 pt-8">
                                        <span className="text-[10px] text-slate-600 font-black tracking-[0.4em] uppercase pl-2 mb-4 block">Realtime Telemetry (X-Stream)</span>
                                        {(gamificationStats?.recentPlays || []).map((p: any) => (
                                            <div key={p.id} className="group/play flex items-center justify-between p-4 rounded-2xl hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/5">
                                                <div className="flex items-center gap-6">
                                                    <span className="text-[10px] text-slate-600 font-bold min-w-[60px]">{new Date(p.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}</span>
                                                    <div className={`w-1 h-8 rounded-full shadow-lg ${p.type === 'GAME_WIN' ? "bg-emerald-500 shadow-emerald-500/20" : "bg-indigo-500/20"}`}></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-slate-300 group-hover/play:text-white transition-colors uppercase tracking-widest">{p.memberName}</span>
                                                        <span className="text-[8px] text-slate-600 font-black uppercase tracking-tighter opacity-80">{p.description}</span>
                                                    </div>
                                                </div>
                                                <span className={`text-xs font-mono font-black ${p.type === 'GAME_WIN' ? "text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "text-slate-600"}`}>
                                                    {p.amount > 0 ? `+${p.amount}` : p.amount} <span className="text-[9px] opacity-40">PTS</span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-2 glass-card rounded-[3.5rem] p-12">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-12 flex items-center justify-center gap-4">
                                    <Trophy className="w-4 h-4 text-amber-500" /> Reward Spectrum
                                </h3>
                                <div className="h-[420px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ReBarChart data={Object.entries(gamificationStats?.distribution || {}).map(([k, v]) => ({name: k, count: v}))}>
                                            <XAxis dataKey="name" fontSize={10} fontWeight={900} axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.2)'}} />
                                            <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{backgroundColor: '#020617', border: 'none', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'}} />
                                            <Bar dataKey="count" radius={[12, 12, 0, 0]}>
                                                {Object.keys(gamificationStats?.distribution || {}).map((_, i) => (
                                                    <Cell key={i} fill={i % 2 === 0 ? "#6366f1" : "rgba(99,102,241,0.2)"} />
                                                ))}
                                            </Bar>
                                        </ReBarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-10 p-6 bg-amber-500/5 ring-1 ring-amber-500/10 rounded-2xl">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest">Most Frequent Win</span>
                                        <span className="text-xl font-black text-white font-mono">{Object.entries(gamificationStats?.distribution || {}).sort((a:any, b:any) => b[1] - a[1])[0]?.[0] || 'N/A'} <span className="text-[9px] text-slate-600">PTS</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* MEMBER COMMANDER - THE CORE REQUEST */}
                        <div className="glass-card rounded-[3.5rem] overflow-hidden border border-white/5">
                            <div className="p-12 border-b border-white/5 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-widest uppercase mb-2 flex items-center gap-4 italic">
                                        <Users className="w-8 h-8 text-indigo-400" /> Member Commander
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em]">Real-time Win Stats & Neural Override</p>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-6">
                                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                                        <button onClick={() => setSortKey('netProfit')} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sortKey === 'netProfit' ? 'bg-indigo-500 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>Top Winners</button>
                                        <button onClick={() => setSortKey('totalPlays')} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sortKey === 'totalPlays' ? 'bg-indigo-500 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>The Hooked</button>
                                    </div>
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                        <input 
                                            type="text"
                                            placeholder="DNA Scan: Code or Name..."
                                            className="pl-12 pr-6 py-3 bg-white/5 border border-white/10 rounded-2xl font-bold text-xs text-white outline-none focus:border-indigo-500/50 transition-all w-[300px]"
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white/[0.02]">
                                            <th className="px-12 py-8 text-[9px] font-black text-slate-500 uppercase tracking-widest">Identification Member</th>
                                            <th className="px-12 py-8 text-[9px] font-black text-slate-500 uppercase tracking-widest">Live Win Stats</th>
                                            <th className="px-12 py-8 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Member P/L</th>
                                            <th className="px-12 py-8 text-[9px] font-black text-slate-500 uppercase tracking-widest">Override Status</th>
                                            <th className="px-12 py-8 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Credit Balance</th>
                                            <th className="px-12 py-8 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Operation</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {(members || [])
                                            .filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.memberCode.toLowerCase().includes(search.toLowerCase()))
                                            .sort((a,b) => (b[sortKey] || 0) - (a[sortKey] || 0))
                                            .map((member: any) => (
                                                <tr key={member.id} className="group hover:bg-white/[0.04] transition-all">
                                                    <td className="px-12 py-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black text-slate-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                                {member.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-black text-white text-lg tracking-tighter">{member.name}</div>
                                                                <div className="text-[9px] font-mono text-slate-500 font-bold tracking-widest">{member.memberCode}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-12 py-8">
                                                        <div className="flex flex-col">
                                                            <span className={`text-xl font-black font-mono tracking-tighter ${member.actualWinRate > 40 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                                {member.actualWinRate}%
                                                            </span>
                                                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">From {member.totalPlays} Plays</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-12 py-8">
                                                        <div className="flex flex-col items-center">
                                                            <span className={`text-md font-black font-mono tracking-tighter ${member.netProfit > 0 ? 'text-emerald-400' : member.netProfit < 0 ? 'text-rose-400' : 'text-slate-600'}`}>
                                                                {member.netProfit > 0 ? '+' : ''}{member.netProfit} <span className="text-[8px] opacity-40">PTS</span>
                                                            </span>
                                                            <div className={`mt-2 h-1 w-12 rounded-full ${member.netProfit > 0 ? 'bg-emerald-500/40' : member.netProfit < 0 ? 'bg-rose-500/40' : 'bg-white/5'}`}></div>
                                                        </div>
                                                    </td>
                                                    <td className="px-12 py-8">
                                                        {member.targetWinRate !== null ? (
                                                            <div className="flex flex-col">
                                                                <span className="px-3 py-1 bg-indigo-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest mb-1 inline-flex items-center gap-2">
                                                                    <ShieldCheck className="w-3 h-3" /> MANUAL
                                                                </span>
                                                                <span className="text-[10px] font-black text-indigo-400 font-mono">SET: {member.targetWinRate}%</span>
                                                            </div>
                                                        ) : (
                                                            <span className="px-3 py-1 bg-white/5 text-slate-500 rounded-lg text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-2">
                                                                <Orbit className="w-3 h-3 animate-spin-slow opacity-30" /> AUTO PILOT
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-12 py-8 text-right">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-2xl font-black text-white font-mono tracking-tighter">
                                                                {(member.points || 0).toLocaleString()}
                                                            </span>
                                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest font-mono">Credits</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-12 py-8">
                                                        <div className="flex items-center justify-center gap-3">
                                                            <button 
                                                                onClick={() => openOverride(member)}
                                                                className="px-6 py-3 bg-white text-black hover:bg-indigo-500 hover:text-white font-black text-[9px] rounded-xl transition-all uppercase tracking-widest shadow-xl"
                                                            >
                                                                OVERRIDE
                                                            </button>
                                                            <button 
                                                                onClick={() => openAdjust(member)}
                                                                className="p-3 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-xl transition-all"
                                                            >
                                                                <Settings className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            <style jsx global>{`
                @font-face {
                    font-family: 'Outfit';
                    src: url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .glass-card { background: rgba(2, 6, 23, 0.8); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.05); }
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin-slow { animation: spin-slow 12s linear infinite; }
                .neural-bg {
                    background-image: radial-gradient(rgba(99, 102, 241, 0.15) 1px, transparent 1px);
                    background-size: 30px 30px;
                    mask-image: linear-gradient(to bottom, black, transparent);
                }
                @keyframes scan { from { transform: translateY(-100%); } to { transform: translateY(100%); } }
                .scan-line {
                    position: absolute; width: 100%; h-1px; 
                    background: linear-gradient(to right, transparent, rgba(99, 102, 241, 0.5), transparent);
                    animation: scan 4s linear infinite;
                }
            `}</style>

            {/* NEURAL OVERRIDE MODAL */}
            {showOverrideModal && (
                <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowOverrideModal(false)} />
                    <div className="relative bg-white rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 p-12">
                        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
                        <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase mb-2 italic">
                            Neural <span className="text-indigo-600">Override</span>
                        </h2>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mb-12">Subject: {overrideData.name}</p>
                        
                        <div className="space-y-10">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Neural Win Probability</span>
                                <span className="text-2xl font-black font-mono text-indigo-600">{overrideData.targetRate === null ? "AUTO" : `${overrideData.targetRate}%`}</span>
                            </div>
                            
                            <input 
                                type="range" min="1" max="100" step="1"
                                className="w-full h-2 rounded-full accent-indigo-600 bg-slate-100"
                                value={overrideData.targetRate || 50}
                                onChange={e => setOverrideData({...overrideData, targetRate: parseInt(e.target.value)})}
                            />
                            
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <button onClick={() => setShowOverrideModal(false)} className="py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Abort</button>
                                <button onClick={handleOverride} className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all">Engage Link</button>
                            </div>
                            
                            <button onClick={() => setOverrideData({...overrideData, targetRate: null})} className="w-full py-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm">Restore System AutoPilot</button>
                        </div>
                    </div>
                </div>
            )}

            {/* POINT ADJUST MODAL */}
            {showAdjustModal && (
                <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowAdjustModal(false)} />
                    <div className="relative bg-white rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 p-12">
                        <div className="absolute top-0 left-0 w-full h-2 bg-slate-900"></div>
                        <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase mb-2 italic">Point Adjust</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em] mb-12">Target Interface: {adjustData.name}</p>
                        
                        <div className="space-y-8">
                            <InputField label="Quantum Amount" type="number" isEditing={true} value={adjustData.amount || ""} onChange={v => setAdjustData({...adjustData, amount: Number(v)})} className="text-xl font-mono" />
                            <InputField label="Transaction Ref" isEditing={true} value={adjustData.description} onChange={v => setAdjustData({...adjustData, description: v})} className="text-xs" />
                            
                            <div className="pt-6 flex gap-4">
                                <button onClick={() => setShowAdjustModal(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Dismiss</button>
                                <button onClick={handleAdjust} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl">Commit Vector</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatPill({ icon: Icon, label, val, color }: any) {
    const colors: any = {
        emerald: "bg-emerald-500 text-emerald-500",
        indigo: "bg-indigo-500 text-indigo-500",
        amber: "bg-amber-500 text-amber-500"
    }
    return (
        <div className="flex items-center gap-3">
            <div className={`w-1 h-3 rounded-full ${colors[color].split(' ')[0]}`}></div>
            <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
                <span className={`text-[10px] font-black uppercase tracking-tighter ${colors[color].split(' ')[1]}`}>{val}</span>
            </div>
        </div>
    )
}

function ControlGroup({ label, icon: Icon, color, pilot, children }: any) {
    const colors: any = {
        indigo: "text-indigo-400 bg-indigo-500/10",
        emerald: "text-emerald-400 bg-emerald-500/10",
        purple: "text-purple-400 bg-purple-500/10"
    }
    return (
        <div className={`p-6 bg-black/40 rounded-[2.5rem] border border-white/5 transition-all ${pilot ? "opacity-40 grayscale pointer-events-none" : "hover:border-white/10"}`}>
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${colors[color]}`}>
                        <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>
                </div>
                {pilot && <span className="text-[8px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded uppercase tracking-widest animate-pulse">Auto</span>}
            </div>
            {children}
        </div>
    )
}

function EliteCard({ icon: Icon, label, val, sub, trend, color, variant }: any) {
    const colors: any = {
        indigo: "text-indigo-400",
        emerald: "text-emerald-400",
        purple: "text-purple-400 shadow-indigo-500/20",
        amber: "text-amber-400",
        rose: "text-rose-400",
        blue: "text-blue-400"
    }
    return (
        <div className="glass-card p-10 rounded-[3.5rem] relative group hover:scale-[1.02] transition-all duration-500 overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Icon className={`w-12 h-12 ${colors[color]}`} />
            </div>
            <div className="flex flex-col justify-between h-full relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">{label}</span>
                    {trend && <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">{trend}</span>}
                </div>
                <div>
                   <div className={`text-4xl font-black mb-1 font-mono tracking-tighter ${colors[color]}`}>{val}</div>
                   <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                      <div className={`w-3 h-0.5 bg-current ${colors[color]}`}></div>
                      {sub}
                   </div>
                </div>
            </div>
        </div>
    )
}
