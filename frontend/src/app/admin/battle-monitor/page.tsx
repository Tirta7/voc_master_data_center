'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Flame, 
    Snowflake, 
    TrendingUp, 
    CheckCircle, 
    AlertCircle, 
    LayoutDashboard,
    Target,
    Zap,
    Users,
    Clock,
    RefreshCw,
    Eye
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { io } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

export default function BattleMonitor() {
    const { user } = useAuth();
    const [battlePlan, setBattlePlan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState<any>(null);

    useEffect(() => {
        fetchActivePlan();

        const s = io(API_URL);
        s.on('battlePlanUpdated', (data) => {
            if (data.type === 'PROGRESS_UPDATE') {
                setBattlePlan((prev: any) => {
                    if (!prev) return prev;
                    const newItems = prev.items.map((it: any) => 
                        it.id === data.itemId ? { ...it, soldQuantity: data.soldQuantity } : it
                    );
                    return { ...prev, items: newItems };
                });
            } else if (data.type === 'STRATEGY_BRIEF') {
                fetchActivePlan();
            }
        });
        setSocket(s);

        return () => { s.close(); };
    }, []);

    const fetchActivePlan = async () => {
        try {
            const token = localStorage.getItem('token');
            const bdayRes = await axios.get(`${API_URL}/finance/shifts/business-day/active`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (bdayRes.data) {
                const planRes = await axios.get(`${API_URL}/ai/battle-plan/active/${bdayRes.data.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setBattlePlan(planRes.data);
            }
        } catch (err) {
            console.error("Failed to fetch battle plan", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-medium">Memuat Rencana Tempur AI...</p>
            </div>
        </div>
    );

    if (!battlePlan) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
            <div className="max-w-md bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl">
                <AlertCircle className="w-16 h-16 text-slate-500 mx-auto mb-6" />
                <h1 className="text-2xl font-bold text-white mb-2">Belum Ada Rencana Tempur</h1>
                <p className="text-slate-400 mb-8">Admin belum mempublikasikan target penjualan untuk hari ini. Harap hubungi manager.</p>
                <button 
                    onClick={fetchActivePlan}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl mx-auto transition-colors"
                >
                    <RefreshCw className="w-5 h-5" /> Cek Ulang
                </button>
            </div>
        </div>
    );

    const totalTarget = battlePlan.targetRevenue;
    const realizedRevenue = battlePlan.items.reduce((sum: number, it: any) => {
        const price = Number(it.menuItem?.price || it.billiardPackage?.price || 0);
        return sum + (it.soldQuantity * price);
    }, 0);
    const progressPercent = Math.min(100, (realizedRevenue / totalTarget) * 100);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 lg:p-8 font-sans">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold flex items-center gap-3 tracking-tight">
                        <Zap className="text-amber-400 w-8 h-8 fill-amber-400" />
                        LIVE BATTLE MONITOR <span className="text-indigo-500">AI</span>
                    </h1>
                    <p className="text-slate-400 flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4" /> Real-time Performance Tracking
                    </p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Target Realization</span>
                            <span className="text-2xl font-black text-white">{progressPercent.toFixed(1)}%</span>
                        </div>
                        <div className="w-16 h-16 relative">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="32" cy="32" r="28" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                                <circle cx="32" cy="32" r="28" fill="transparent" stroke="white" strokeWidth="6" strokeDasharray={176} strokeDashoffset={176 - (176 * progressPercent / 100)} className="transition-all duration-1000 ease-out" />
                            </svg>
                        </div>
                    </div>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Right Column: Mini Stats */}
                <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
                    <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-indigo-300 font-bold uppercase text-xs tracking-widest mb-4">Total Revenue Prediction</h2>
                            <div className="text-4xl font-black mb-2">{fmt(realizedRevenue)}</div>
                            <div className="text-slate-400 text-sm">Target: {fmt(totalTarget)}</div>
                            
                            <div className="mt-8 space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">Progress</span>
                                    <span className="text-white font-bold">{fmt(realizedRevenue)} / {fmt(totalTarget)}</span>
                                </div>
                                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                                     <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                                </div>
                            </div>
                        </div>
                        <Target className="absolute -bottom-4 -right-4 w-32 h-32 text-indigo-500/5" />
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                        <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Eye className="w-4 h-4" /> AI Strategy Brief
                        </h3>
                        <p className="text-slate-200 text-lg leading-relaxed font-medium italic">
                            "{battlePlan.aiStrategyBrief}"
                        </p>
                    </div>
                </div>

                {/* Left Column: Item Grid */}
                <div className="lg:col-span-2 space-y-4 order-1 lg:order-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-bold text-xl flex items-center gap-2">
                            <TrendingUp className="text-emerald-400" /> High-Priority Targets
                        </h3>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700 font-bold">
                            SORTED BY UPSYNC
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {battlePlan.items.sort((a:any, b:any) => (b.soldQuantity/b.targetQuantity) - (a.soldQuantity/a.targetQuantity)).map((it: any) => {
                            const name = it.menuItem?.name || it.billiardPackage?.name || "Unknown";
                            const itemPrice = Number(it.menuItem?.price || it.billiardPackage?.price || 0);
                            const itemProgress = Math.min(100, (it.soldQuantity / it.targetQuantity) * 100);
                            const isDone = it.soldQuantity >= it.targetQuantity;
                            const isHot = it.aiLabel?.includes('🔥');

                            return (
                                <div key={`${it.menuItem ? 'cafe' : 'pkg'}-${it.id}`} className={`bg-slate-900 border ${isDone ? 'border-emerald-500/30' : isHot ? 'border-amber-500/30' : 'border-slate-800'} p-5 rounded-2xl shadow-lg hover:border-slate-600 transition-all flex flex-col justify-between group`}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-500 uppercase font-black mb-1">{it.menuItem ? 'Cafe Item' : 'Table Package'}</span>
                                            <h4 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{name}</h4>
                                        </div>
                                        <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${isHot ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-800 text-slate-400'}`}>
                                            {it.aiLabel || '✨ NORMAL'}
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <div className="flex items-end justify-between mb-2">
                                            <div className="flex flex-col">
                                                <span className="text-2xl font-black text-white">
                                                    {it.soldQuantity} <span className="text-slate-500 text-sm font-medium">/ {it.targetQuantity}</span>
                                                </span>
                                            </div>
                                            <span className={`font-black text-xs ${itemProgress > 80 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                {Math.round(itemProgress)}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-700 ${isDone ? 'bg-emerald-500' : isHot ? 'bg-amber-500' : 'bg-indigo-500'}`} 
                                                style={{ width: `${itemProgress}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                                        <span className="text-xs text-slate-500 font-medium">{fmt(itemPrice)} / unit</span>
                                        {isDone ? (
                                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase">
                                                <CheckCircle className="w-3 h-3" /> Target Achieved
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase">
                                                Remaining: {it.targetQuantity - it.soldQuantity}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
}


