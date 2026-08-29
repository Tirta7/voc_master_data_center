'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Sparkles, X, Target, Zap, Waves, Star, Award } from 'lucide-react';
import { useRealtimeData } from '@/context/RealtimeDataContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

export const AIBroadcastOverlay: React.FC = () => {
    const { lastUpsellPrompt, dismissUpsellPrompt } = useRealtimeData();
    const [visible, setVisible] = useState(false);
    
    useBodyScrollLock(visible);

    useEffect(() => {
        if (lastUpsellPrompt) {
            setVisible(true);
        }
    }, [lastUpsellPrompt]);

    const handleDismiss = async () => {
        if (lastUpsellPrompt?.id) {
            try {
                axios.post(`/ai/prompt/${lastUpsellPrompt.id}/acknowledge`, {}).catch(e => console.error(e));
            } catch (e) {}
        }
        setVisible(false);
        setTimeout(() => {
            dismissUpsellPrompt();
        }, 500); // Wait for animation to finish
    };

    const isCombo = lastUpsellPrompt?.type === 'COMBO_SUGGESTION';
    const bgGradient = isCombo 
        ? "from-emerald-600/90 via-teal-600/90 to-cyan-600/90" 
        : "from-indigo-600/90 via-violet-600/90 to-fuchsia-600/90";

    if (!lastUpsellPrompt && !visible) return null;

    return (
        <div 
            className={`fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none p-6 transition-all duration-700 ${
                visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
        >
            <div className="absolute inset-0 bg-slate-950/20  pointer-events-auto" onClick={handleDismiss} />
            <div className={`relative w-full max-w-sm md:max-w-md bg-gradient-to-br ${bgGradient}  rounded-[2rem] p-6 md:p-8 shadow-[0_20px_40px_-10px_rgba(79,70,229,0.5)] border border-white/30 pointer-events-auto overflow-hidden animate-in zoom-in-95 duration-500 max-h-[85vh]`}>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 p-6 opacity-20 pointer-events-none">
                    <Sparkles className="w-24 h-24 text-white animate-pulse" />
                </div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-blob pointer-events-none" />
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl animate-blob animation-delay-2000 pointer-events-none" />

                <div className="relative space-y-5">
                    {/* Badge */}
                    <div className="flex items-center gap-2">
                        <div className="bg-white/20  px-3 py-1.5 rounded-full border border-white/30 flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">
                                {isCombo ? 'AI Market Basket' : 'AI Guidance'}
                            </span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-3">
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight pr-6">
                            {isCombo ? 'Combo Discovery! 🍱' : 'New Opportunity! 🚀'}
                        </h2>
                        <div className="p-4 md:p-5 bg-white/10 rounded-2xl border border-white/20 ">
                            <p className="text-base md:text-lg font-bold text-white leading-snug">
                                {lastUpsellPrompt?.message}
                            </p>
                        </div>
                    </div>

                    {/* Action Hint & Button */}
                        <div className="flex flex-row items-center justify-between gap-4 pt-2">
                            <div className="flex items-center gap-3 text-white/90">
                                {isCombo ? <Star className="w-6 h-6 text-yellow-300 shrink-0" /> : <Target className="w-6 h-6 shrink-0" />}
                                <div className="flex flex-col">
                                    <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-70">
                                        {isCombo ? 'Combo Item' : 'Fokus Program'}
                                    </span>
                                    <span className="text-sm md:text-base font-black tracking-tight leading-none mt-0.5">{lastUpsellPrompt?.menuItemName}</span>
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleDismiss}
                                className={`bg-white ${isCombo ? 'text-emerald-600' : 'text-indigo-600'} px-5 py-2.5 rounded-xl font-black text-xs md:text-sm uppercase tracking-widest shadow-lg hover:bg-neutral-50 transition-all active:scale-95 shrink-0`}
                            >
                                Nice!
                            </button>
                        </div>
                </div>


                <button 
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <style jsx>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
            `}</style>
        </div>
    );
};
