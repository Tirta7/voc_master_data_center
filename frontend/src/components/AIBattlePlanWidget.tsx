'use client';

import React, { useState } from 'react';
import { useRealtimeData } from '@/context/RealtimeDataContext';
import { Zap, Target, TrendingUp, Flame, Rocket, Megaphone, CheckCircle, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIBattlePlanWidget() {
    const { battlePlan, performancePulse, intensityData } = useRealtimeData();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [isMinimized, setIsMinimized] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await axios.get('/settings');
                setSettings(response.data);
            } catch (error) {
                console.error('Failed to fetch settings:', error);
            }
        };
        fetchSettings();
    }, []);

    const roleStr = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name || '';
    const canPromote = [
        'ADMIN', 'OWNER', 'CASHIER', 'KASIR', 'MANAGER', 
        'SUPER ADMIN', 'SUPERADMIN', 'SHIFT 1', 'SHIFT 2', 'SHIFT 3'
    ].some(r => roleStr.toUpperCase().includes(r)) || ['ADMIN', 'OWNER', 'CASHIER', 'KASIR', 'MANAGER'].includes(roleStr.toUpperCase());

    if (!settings?.enableAISalesOrchestrator) return null;
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
            
            <div className={`flex items-center justify-between gap-3 ${isMinimized ? '' : 'mb-6'}`}>
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 ${intensityData?.score >= 6 ? 'bg-rose-600 shadow-rose-600/20' : 'bg-indigo-600 shadow-indigo-600/20'}`}>
                        {intensityData?.score >= 6 ? <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-bounce" /> : <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[11px] sm:text-sm font-black text-white uppercase tracking-wider sm:tracking-[0.2em] truncate">AI BATTLE PLAN</h3>
                            {intensityData?.score >= 6 && (
                                <span className="hidden sm:inline-block bg-rose-500/20 text-rose-400 text-[8px] font-black px-2 py-0.5 rounded-full border border-rose-500/30 animate-pulse">
                                    PEAK INTENSITY
                                </span>
                            )}
                        </div>
                        <p className="text-[8px] sm:text-[10px] text-indigo-400/80 font-bold uppercase tracking-wider sm:tracking-widest mt-0.5 truncate">Live Strategic Progress</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 z-10 shrink-0">
                    {performancePulse && performancePulse.achievementPercent >= 80 && (
                        <div className="hidden sm:flex px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[9px] font-black text-emerald-400 uppercase">Target Secure</span>
                        </div>
                    )}
                    <div className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-indigo-500/10 rounded-lg sm:rounded-xl border border-indigo-500/20 flex flex-col items-end sm:flex-row sm:items-center sm:gap-1.5">
                        <span className="text-[7px] sm:text-[10px] font-black text-indigo-400/60 uppercase tracking-widest leading-none mb-0.5 sm:mb-0">
                            TARGET
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-black text-indigo-300 uppercase tracking-wider leading-none">
                            Rp {(Number(battlePlan.targetRevenue || 0)).toLocaleString('id-ID')}
                        </span>
                    </div>
                    <button 
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1.5 sm:p-2 bg-white/5 rounded-lg sm:rounded-xl border border-white/10 hover:bg-white/10 transition-all active:scale-95 shrink-0"
                    >
                        <ChevronDown className={`w-4 h-4 sm:w-4 sm:h-4 text-slate-400 transition-transform duration-300 ${isMinimized ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {!isMinimized && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                            {battlePlan.items.map((item, idx) => {
                                const progress = (item.soldQuantity / item.targetQuantity) * 100;
                                const isDone = item.soldQuantity >= item.targetQuantity;
                                
                                return (
                                    <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col gap-2.5 group/item hover:bg-white/[0.04] hover:border-indigo-500/30 transition-all duration-300">
                                        {/* Top Row: AI Label & Target Numbers */}
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1.5">
                                                {(item.aiLabel || '').includes('🔥') ? <Flame className="w-3 h-3 text-orange-500" /> : <Rocket className="w-3 h-3 text-indigo-500" />}
                                                <span className="text-[9px] font-black uppercase text-indigo-400/80 tracking-widest">{item.aiLabel}</span>
                                            </div>
                                            <div className="shrink-0 flex items-center">
                                                {isDone ? (
                                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                ) : (
                                                    <span className="text-[10px] font-black text-white">
                                                        {item.soldQuantity}<span className="text-slate-500 mx-0.5">/</span>{item.targetQuantity}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Middle Row: Item Name */}
                                        <div className="w-full">
                                            {canPromote ? (
                                                <button 
                                                    onClick={() => {
                                                        const itemId = item.menuItemId || item.packageId || item.promoId || 0;
                                                        const type = item.menuItemId ? 'CAFE' : item.packageId ? 'BILLIARD' : 'PROMO';
                                                        handlePromote(itemId, type);
                                                    }}
                                                    className="w-full text-left group/name block overflow-hidden"
                                                    title="Klik untuk promosikan ke waiter"
                                                >
                                                    <p className="text-xs font-black text-slate-200 uppercase tracking-wider truncate group-hover/name:text-indigo-400 transition-colors">
                                                        {item.menuItem?.name || item.billiardPackage?.name || item.promo?.name || 'Item'}
                                                    </p>
                                                </button>
                                            ) : (
                                                <p className="text-xs font-black text-slate-200 uppercase tracking-wider truncate">
                                                    {item.menuItem?.name || item.billiardPackage?.name || item.promo?.name || 'Item'}
                                                </p>
                                            )}
                                        </div>

                                        {/* Bottom Row: Progress Bar & Push Button */}
                                        <div className="flex items-end justify-between gap-4 mt-0.5">
                                            <div className="flex-1 space-y-1.5 pb-0.5 min-w-0">
                                                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                                    <div 
                                                        className={`h-full transition-all duration-1000 ease-out ${isDone ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-indigo-600 to-indigo-400'}`}
                                                        style={{ width: `${Math.min(100, progress)}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                                    <span>Progress</span>
                                                    <span className={isDone ? "text-emerald-500" : "text-slate-400"}>{Math.round(progress)}%</span>
                                                </div>
                                            </div>
                                            {canPromote && !isDone && (
                                                <button 
                                                    onClick={() => {
                                                        const itemId = item.menuItemId || item.packageId || item.promoId || 0;
                                                        const type = item.menuItemId ? 'CAFE' : item.packageId ? 'BILLIARD' : 'PROMO';
                                                        handlePromote(itemId, type);
                                                    }}
                                                    className="shrink-0 px-2.5 py-1.5 bg-indigo-500/10 rounded-lg text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 border border-indigo-500/20 flex items-center gap-1.5 group/btn"
                                                    title="Broadcast promosi ke seluruh tim"
                                                >
                                                    <Megaphone className="w-3 h-3 group-hover/btn:-rotate-12 transition-transform" />
                                                    <span className="text-[9px] font-black uppercase tracking-wider">Push</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Performance Pulse Footer */}
                        {performancePulse && (
                            <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
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
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
