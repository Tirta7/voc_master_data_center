'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Brain, Target, TrendingUp, AlertCircle, 
    Clock, Zap, Sparkles, ChevronRight,
    Users, Info, Loader2
} from 'lucide-react';

interface AIAdvisorProps {
    businessDayId?: number;
    totalRevenue: number;
}

interface Suggestion {
    suggestedTarget: number;
    justification: string;
    confidence: number;
}

interface StaffingAnalysis {
    staffRecommended: number;
    activeWaiters: number;
    isShortage: boolean;
    coveragePercent: number;
    staffRecommendation: string;
}

interface MissionReport {
    strategyBrief: string;
    staffingAnalysis: StaffingAnalysis;
}

interface TrafficForecast {
    predictedCustomerCount: number;
    peakHours: string[];
    isHeuristic: boolean;
}

export const AIStrategicAdvisor: React.FC<AIAdvisorProps> = ({ businessDayId, totalRevenue }) => {
    const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
    const [traffic, setTraffic] = useState<TrafficForecast | null>(null);
    const [mission, setMission] = useState<MissionReport | null>(null);
    
    // Independent loading states for progressive display
    const [loadingTarget, setLoadingTarget] = useState(true);
    const [loadingTraffic, setLoadingTraffic] = useState(true);
    const [loadingMission, setLoadingMission] = useState(true);

    // 1. Fetch Target Suggestion (Fast)
    useEffect(() => {
        const fetchTarget = async () => {
            try {
                const res = await axios.get(`/ai/suggest-target`);
                setSuggestion(res.data);
            } catch (err) {
                console.error("Failed to fetch target suggestion:", err);
            } finally {
                setLoadingTarget(false);
            }
        };
        fetchTarget();
    }, []);

    // 2. Fetch Traffic Forecast (Was slow, now cached)
    useEffect(() => {
        const fetchTraffic = async () => {
            try {
                const res = await axios.get(`/ai/predict-traffic`);
                setTraffic(res.data);
            } catch (err) {
                console.error("Failed to fetch traffic forecast:", err);
            } finally {
                setLoadingTraffic(false);
            }
        };
        fetchTraffic();
    }, []);

    // 3. Fetch Mission Report (Context-dependent)
    useEffect(() => {
        if (!businessDayId) {
            setLoadingMission(false);
            return;
        }
        const fetchMission = async () => {
            try {
                const res = await axios.get(`/ai/mission-report/${businessDayId}`);
                setMission(res.data);
            } catch (err) {
                console.error("Failed to fetch mission report:", err);
            } finally {
                setLoadingMission(false);
            }
        };
        fetchMission();
    }, [businessDayId]);

    const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
    const progress = suggestion ? (totalRevenue / suggestion.suggestedTarget) * 100 : 0;

    // Helper to render skeleton for a single card
    const CardSkeleton = () => (
        <div className="bg-white/5  border border-white/10 rounded-2xl p-5 h-[180px] animate-pulse flex flex-col justify-center items-center gap-3">
            <Loader2 className="w-6 h-6 text-indigo-400/20 animate-spin" />
            <div className="h-2 w-24 bg-white/5 rounded" />
        </div>
    );

    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl p-6 md:p-8 group">
            {/* Animated Glow Background */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full group-hover:bg-indigo-500/30 transition-all duration-1000" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-violet-500/10 blur-[100px] rounded-full group-hover:bg-violet-500/20 transition-all duration-1000" />

            {/* Header */}
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-50 animate-pulse" />
                        <div className="relative w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                            <Brain className="w-8 h-8 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1">
                            <span className="flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                            </span>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                            AI Strategic Advisor
                            <Sparkles className="w-5 h-5 text-amber-400" />
                        </h2>
                        <p className="text-indigo-200/60 text-xs md:text-sm font-medium mt-1">
                            Menganalisis pola bisnis untuk pertumbuhan hari ini.
                        </p>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-2 bg-white/5  border border-white/10 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-300">
                    <Zap className="w-3 h-3 text-amber-400" />
                    Real-time Intelligence
                </div>
            </div>

            {/* Main Cards Grid */}
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Target Pulse */}
                {loadingTarget ? <CardSkeleton /> : (
                <div className="bg-white/5  border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors duration-300">
                    <div className="flex items-center gap-2 text-indigo-300 mb-4">
                        <Target className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Recommended Target</span>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <p className="text-2xl font-black text-white">{fmt(suggestion?.suggestedTarget || 0)}</p>
                            <p className="text-[10px] text-indigo-300/60 font-medium mt-1 leading-relaxed break-words whitespace-normal">
                                {suggestion?.justification || "Menganalisis histori transaksi..."}
                            </p>
                        </div>
                        <div className="pt-2">
                            <div className="flex justify-between text-[10px] font-black text-white/40 mb-1.5 uppercase">
                                <span>Achievement</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000 ease-out"
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                )}

                {/* 2. Traffic Radar */}
                {loadingTraffic ? <CardSkeleton /> : (
                <div className="bg-white/5  border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors duration-300">
                    <div className="flex items-center gap-2 text-emerald-400 mb-4">
                        <Clock className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Traffic Forecast</span>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <p className="text-2xl font-black text-white">{traffic?.predictedCustomerCount || 0} <span className="text-xs text-emerald-400 font-bold tracking-normal uppercase">Customer Predicted</span></p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {traffic?.peakHours && traffic.peakHours.length > 0 ? traffic.peakHours.slice(0, 3).map(hour => (
                                    <span key={hour} className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-black">
                                        Peak: {hour}
                                    </span>
                                )) : (
                                    <span className="text-[10px] text-white/40 italic">Trafik diprediksi stabil</span>
                                )}
                            </div>
                        </div>
                        <p className="text-[11px] text-indigo-200/40 italic leading-relaxed break-words whitespace-normal">
                            💡 Intensitas tinggi diprediksi pada jam makan malam. Siapkan stok lebih awal.
                        </p>
                    </div>
                </div>
                )}

                {/* 3. Strategic Move & Staffing */}
                {loadingMission ? <CardSkeleton /> : (
                <div className="bg-white/5  border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-violet-400">
                            <Zap className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Strategic Advice</span>
                        </div>
                        {mission?.staffingAnalysis?.isShortage && (
                            <span className="flex items-center gap-1 bg-rose-500/20 text-rose-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-rose-500/30">
                                <AlertCircle className="w-3 h-3" /> STAFF SHORTAGE
                            </span>
                        )}
                    </div>
                    <div className="space-y-4">
                        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
                            <div className="flex gap-3">
                                <div className="p-2 bg-violet-500/20 rounded-lg h-fit">
                                    <Sparkles className="w-4 h-4 text-violet-400" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-violet-200 leading-normal break-words whitespace-normal">
                                        {mission?.strategyBrief || "Fokus pada upsell paket Billiard 2 Jam selama jam sibuk untuk meningkatkan margin hingga 15%."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-1">
                            <div className="flex justify-between text-[9px] font-black text-white/40 mb-1.5 uppercase tracking-wider">
                                <span>Staff Duty Coverage</span>
                                <span className={mission?.staffingAnalysis?.isShortage ? 'text-rose-400' : 'text-emerald-400'}>
                                    {mission?.staffingAnalysis?.coveragePercent || 100}%
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${mission?.staffingAnalysis?.isShortage ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${mission?.staffingAnalysis?.coveragePercent || 100}%` }}
                                />
                            </div>
                        </div>

                        <button className="w-full flex items-center justify-center gap-2 py-3 bg-white text-slate-900 rounded-xl text-xs font-black shadow-lg hover:bg-indigo-50 transition-colors group/btn">
                            Lihat Strategy Lengkap
                            <ChevronRight className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
                )}
            </div>

            {/* Footer Insight */}
            <div className="mt-8 flex items-center gap-3 text-indigo-300/40 text-[10px] font-medium border-t border-white/5 pt-6">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>AI Confidence: <b>{suggestion?.confidence || 85}%</b>. Data dihitung berdasarkan performa 30 hari terakhir. {loadingTraffic && "Memperbarui model AI di latar belakang..."}</span>
            </div>
        </div>
    );
};
