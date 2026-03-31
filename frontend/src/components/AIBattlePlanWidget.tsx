'use client';

import React from 'react';
import { useRealtimeData } from '@/context/RealtimeDataContext';
import { Zap, Target, TrendingUp, Flame, Rocket, Megaphone, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuth } from '@/context/AuthContext';

export default function AIBattlePlanWidget() {
    const { battlePlan, performancePulse, intensityData } = useRealtimeData();
    const { user } = useAuth();
    const { showToast } = useToast();

    const canPromote = ['ADMIN', 'OWNER', 'CASHIER'].includes(user?.role?.toUpperCase() || '');

    if (!battlePlan || !battlePlan.items || battlePlan.items.length === 0) return null;

    const handlePromote = async (itemId: number, type: 'CAFE' | 'BILLIARD' | 'PROMO') => {
        try {
            await axios.post(`/ai/broadcast-item`, { itemId, type });
            showToast("Promosi Terkirim", "Item telah dipromosikan ke seluruh tim.", "success");
        } catch (err) {
            console.error("Failed to promote item", err);
            showToast("Error", "Gagal mengirim promosi.", "error");
        }
    };

    return (
        <div className="bg-[#0F172A] border border-indigo-500/20 rounded-[2rem] p-6 shadow-2xl overflow-hidden relative mb-8 backdrop-blur-xl">
            <div className={`absolute top-0 right-0 w-64 h-64 blur-3xl pointer-events-none transition-all duration-1000 ${intensityData?.score >= 6 ? 'bg-rose-500/10' : 'bg-indigo-500/5'}`} />
            
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 ${intensityData?.score >= 6 ? 'bg-rose-600 shadow-rose-600/20' : 'bg-indigo-600 shadow-indigo-600/20'}`}>
                        {intensityData?.score >= 6 ? <Flame className="w-5 h-5 text-white animate-bounce" /> : <Zap className="w-5 h-5 text-white animate-pulse" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">AI BATTLE PLAN</h3>
                            {intensityData?.score >= 6 && (
                                <span className="bg-rose-500/20 text-rose-400 text-[8px] font-black px-2 py-0.5 rounded-full border border-rose-500/30 animate-pulse">
                                    PEAK INTENSITY
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">Live Strategic Progress</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {performancePulse && performancePulse.achievementPercent >= 80 && (
                        <div className="px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[9px] font-black text-emerald-400 uppercase">Target Secure</span>
                        </div>
                    )}
                    <div className="px-4 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">
                            Goal: Rp {(Number(battlePlan.targetRevenue || 0)).toLocaleString('id-ID')}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {battlePlan.items.map((item, idx) => {
                    const progress = (item.soldQuantity / item.targetQuantity) * 100;
                    const isDone = item.soldQuantity >= item.targetQuantity;
                    
                    return (
                        <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between group/item hover:bg-white/[0.04] hover:border-indigo-500/30 transition-all duration-300">
                            <div className="flex justify-between items-start mb-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        {(item.aiLabel || '').includes('🔥') ? <Flame className="w-3.5 h-3.5 text-orange-500" /> : <Rocket className="w-3.5 h-3.5 text-indigo-500" />}
                                        <span className="text-[9px] font-black uppercase text-indigo-400/60 tracking-tighter">{item.aiLabel}</span>
                                    </div>
                                    {canPromote ? (
                                        <button 
                                            onClick={() => {
                                                const itemId = item.menuItemId || item.packageId || item.promoId || 0;
                                                const type = item.menuItemId ? 'CAFE' : item.packageId ? 'BILLIARD' : 'PROMO';
                                                handlePromote(itemId, type);
                                            }}
                                            className="text-left group/name"
                                            title="Klik untuk promosikan ke waiter"
                                        >
                                            <p className="text-xs font-black text-slate-200 uppercase tracking-tight truncate group-hover/name:text-indigo-400 transition-colors">
                                                {item.menuItem?.name || item.billiardPackage?.name || item.promo?.name || 'Item'}
                                            </p>
                                        </button>
                                    ) : (
                                        <p className="text-xs font-black text-slate-200 uppercase tracking-tight truncate">
                                            {item.menuItem?.name || item.billiardPackage?.name || item.promo?.name || 'Item'}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right shrink-0 ml-3 flex flex-col items-end gap-2">
                                    {isDone ? (
                                        <CheckCircle className="w-4 h-4 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    ) : (
                                        <span className="text-xs font-black text-white">
                                            {item.soldQuantity}<span className="text-slate-500 mx-0.5">/</span>{item.targetQuantity}
                                        </span>
                                    )}
                                    {canPromote && !isDone && (
                                        <button 
                                            onClick={() => {
                                                const itemId = item.menuItemId || item.packageId || item.promoId || 0;
                                                const type = item.menuItemId ? 'CAFE' : item.packageId ? 'BILLIARD' : 'PROMO';
                                                handlePromote(itemId, type);
                                            }}
                                            className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400 opacity-0 group-hover/item:opacity-100 transition-all hover:bg-indigo-500 hover:text-white active:scale-95"
                                            title="Promosikan ke Waiter"
                                        >
                                            <Megaphone className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                    <div 
                                        className={`h-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(99,102,241,0.3)] ${isDone ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-indigo-600 to-indigo-400'}`}
                                        style={{ width: `${Math.min(100, progress)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    <span>Progress</span>
                                    <span className={isDone ? "text-emerald-500" : "text-slate-400"}>{Math.round(progress)}%</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Performance Pulse Footer */}
            {performancePulse && (
                <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Revenue Achievement</p>
                                <p className="text-sm font-black text-white">Rp {(performancePulse.actualRevenue || 0).toLocaleString('id-ID')}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Gap to Target</p>
                            <p className="text-xs font-black text-amber-500">- Rp {(performancePulse.gap || 0).toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                    
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(100, Number(performancePulse.achievementPercent) || 0)}%` }}
                        />
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                        <span className="text-slate-500">Global Progress</span>
                        <span className="text-emerald-400">{Math.round(Number(performancePulse.achievementPercent) || 0)}%</span>
                    </div>
                </div>
            )}

            {battlePlan?.aiStrategyBrief && (
                <div className="mt-6 flex items-start gap-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                        <Rocket className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-400/50 uppercase tracking-widest mb-1">Commander's Insight</p>
                        <p className="text-[11px] text-slate-400 italic font-medium leading-relaxed">"{battlePlan.aiStrategyBrief}"</p>
                    </div>
                </div>
            )}
        </div>
    );
}
