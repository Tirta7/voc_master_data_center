'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, X, Target, Zap, Waves, Star, Award } from 'lucide-react';
import { useRealtimeData } from '@/context/RealtimeDataContext';

export const AIBroadcastOverlay: React.FC = () => {
    const { lastUpsellPrompt, dismissUpsellPrompt } = useRealtimeData();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (lastUpsellPrompt) {
            setVisible(true);
        }
    }, [lastUpsellPrompt]);

    const handleDismiss = async () => {
        if (lastUpsellPrompt?.id) {
            try {
                const token = localStorage.getItem('token');
                const apiUrl = (window as any).API_URL || process.env.NEXT_PUBLIC_API_URL || ''; 
                // Using a simpler approach since we don't have getApiUrl imported here easily
                fetch(`${apiUrl}/ai/prompt/${lastUpsellPrompt.id}/acknowledge`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(e => console.error(e));
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
            <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm pointer-events-auto" onClick={handleDismiss} />
            
            <div className={`relative w-full max-w-lg bg-gradient-to-br ${bgGradient} backdrop-blur-2xl rounded-[3rem] p-10 shadow-[0_32px_64px_-16px_rgba(79,70,229,0.5)] border border-white/30 pointer-events-auto overflow-hidden animate-in zoom-in-95 duration-500`}>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 p-8 opacity-20">
                    <Sparkles className="w-32 h-32 text-white animate-pulse" />
                </div>
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-blob" />
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl animate-blob animation-delay-2000" />

                <div className="relative space-y-8">
                    {/* Badge */}
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">
                                {isCombo ? 'AI Market Basket Affinity' : 'AI Real-time Guidance'}
                            </span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-4">
                        <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter leading-none">
                            {isCombo ? 'Combo Discovery! 🍱' : 'New Opportunity! 🚀'}
                        </h2>
                        <div className="p-6 bg-white/10 rounded-3xl border border-white/20 backdrop-blur-md">
                            <p className="text-2xl font-bold text-white leading-relaxed">
                                {lastUpsellPrompt?.message}
                            </p>
                        </div>
                    </div>

                    {/* Action Hint */}
                        <div className="flex items-center justify-between gap-6 pt-4">
                            <div className="flex items-center gap-4 text-white/80">
                                {isCombo ? <Star className="w-8 h-8 text-yellow-300" /> : <Target className="w-8 h-8" />}
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                        {isCombo ? 'Combo Item' : 'Fokus Program'}
                                    </p>
                                    <p className="text-lg font-black tracking-tight">{lastUpsellPrompt?.menuItemName}</p>
                                </div>
                            </div>
                            
                            {lastUpsellPrompt?.confidence && (
                                <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl border border-white/20">
                                    <div className="w-8 h-8 bg-emerald-400 rounded-full flex items-center justify-center">
                                        <Waves className="w-4 h-4 text-slate-900" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-emerald-100">Strength</p>
                                        <p className="text-xs font-black text-white">{lastUpsellPrompt.confidence}% Match</p>
                                    </div>
                                </div>
                            )}

                            {lastUpsellPrompt?.referenceWaiter && (
                                <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl border border-white/20">
                                    <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                                        <Star className="w-4 h-4 text-slate-900 fill-slate-900" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-indigo-200">Top Performer</p>
                                        <p className="text-xs font-black text-white">{lastUpsellPrompt.referenceWaiter} ({lastUpsellPrompt.referenceStrikeRate}%)</p>
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={handleDismiss}
                                className={`bg-white ${isCombo ? 'text-emerald-600' : 'text-indigo-600'} px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-neutral-50 transition-all active:scale-95`}
                            >
                                Nice!
                            </button>
                        </div>
                </div>


                <button 
                    onClick={handleDismiss}
                    className="absolute top-6 right-6 p-2 text-white/50 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
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
