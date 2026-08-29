'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Trophy, Medal, Star, TrendingUp, Users, Award, Zap } from 'lucide-react';
import { useRealtimeData } from '@/context/RealtimeDataContext';

interface WaiterStat {
    userId: number;
    userName: string;
    totalSales: number;
    revenue: number;
    items: Record<string, number>;
    teamStrikeRate?: number;
}

export const WaiterPerformanceLeaderboard: React.FC = () => {
    const { performancePulse } = useRealtimeData();
    const [stats, setStats] = useState<WaiterStat[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const res = await axios.get(`/ai/waiter-performance`);
            setStats(res.data);
        } catch (err) {
            console.error('Failed to fetch waiter performance', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    // Also update when real-time pulse arrives
    useEffect(() => {
        if (performancePulse) {
            // We still fetch full stats to get the leaderboard correctly
            // but the pulse can trigger an instant refresh if needed
            fetchStats();
        }
    }, [performancePulse]);

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Trophy className="w-6 h-6 text-yellow-400" />;
            case 1: return <Medal className="w-6 h-6 text-slate-300" />;
            case 2: return <Medal className="w-6 h-6 text-amber-600" />;
            default: return <Star className="w-4 h-4 text-indigo-400 opacity-40" />;
        }
    };

    if (loading) return (
        <div className="bg-slate-900/40  border border-white/5 rounded-[2.5rem] p-8 animate-pulse">
            <div className="h-8 bg-white/5 rounded-full w-48 mb-6" />
            <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl" />)}
            </div>
        </div>
    );

    return (
        <div className="bg-slate-900/40  border border-white/5 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none" />
            
            <div className="relative space-y-8">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
                                <Trophy className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tight italic uppercase">AI Sales Champions</h2>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Performance Leaderboard</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        {/* Strike Rate Gauge */}
                        <div className="flex items-center gap-4 bg-white/5 px-6 py-4 rounded-[2rem] border border-white/5">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="6" className="text-white/5" />
                                    <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="6" strokeDasharray={175.9} strokeDashoffset={175.9 * (1 - (stats[0]?.teamStrikeRate || 0) / 100)} className="text-indigo-500 transition-all duration-1000" strokeLinecap="round" />
                                </svg>
                                <span className="absolute text-sm font-black text-white">{Math.round(stats[0]?.teamStrikeRate || 0)}%</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Team Strike Rate</p>
                                <p className="text-xs text-slate-400 font-medium">Conversion success</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-indigo-600/20 px-4 py-2 rounded-2xl border border-indigo-500/30">
                            <Users className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">{stats.length} Active Staff</span>
                        </div>
                    </div>
                </div>

                {stats.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                            <Star className="w-10 h-10 text-slate-700" />
                        </div>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No upselling recorded yet today</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {stats.map((stat, index) => (
                            <div 
                                key={stat.userId}
                                className={`group relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/5 rounded-3xl p-6 transition-all duration-500 flex items-center gap-6 ${index === 0 ? 'bg-indigo-600/10 border-indigo-500/20' : ''}`}
                            >
                                {/* Rank */}
                                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                                    {getRankIcon(index)}
                                    {index > 2 && <span className="text-lg font-black text-slate-600">{index + 1}</span>}
                                </div>

                                {/* Waiter Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors truncate uppercase">{stat.userName}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Zap className="w-3 h-3 text-indigo-400 fill-indigo-400" />
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Top: {Object.keys(stat.items)[0] || '-'}</p>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-12 shrink-0">
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Items Sold</p>
                                        <p className="text-xl font-black text-white">{stat.totalSales}</p>
                                    </div>
                                    <div className="text-right bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-2 justify-end mb-1">
                                            <TrendingUp className="w-3 h-3 text-emerald-400" />
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Revenue</p>
                                        </div>
                                        <p className="text-2xl font-black text-white tracking-tighter">Rp {stat.revenue.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Progress Bar (Visual Flair) */}
                                <div className="absolute bottom-0 left-0 h-0.5 bg-indigo-500/30 w-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${Math.min(100, (stat.revenue / (stats[0]?.revenue || 1)) * 100)}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
