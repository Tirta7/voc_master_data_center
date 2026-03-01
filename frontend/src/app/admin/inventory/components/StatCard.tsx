import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color: 'indigo' | 'rose' | 'emerald' | 'amber';
    trend?: string;
    isWarning?: boolean;
}

export function StatCard({ label, value, icon: Icon, color, trend, isWarning }: StatCardProps) {
    const theme = {
        indigo: { text: 'text-indigo-600', bg: 'bg-indigo-600', glow: 'from-indigo-400/30 to-indigo-600/10', blob: 'bg-indigo-400/10', border: 'group-hover:border-indigo-200' },
        rose: { text: 'text-rose-600', bg: 'bg-rose-600', glow: 'from-rose-400/30 to-rose-600/10', blob: 'bg-rose-400/10', border: 'group-hover:border-rose-200' },
        emerald: { text: 'text-emerald-600', bg: 'bg-emerald-600', glow: 'from-emerald-400/30 to-emerald-600/10', blob: 'bg-emerald-400/10', border: 'group-hover:border-emerald-200' },
        amber: { text: 'text-amber-600', bg: 'bg-amber-600', glow: 'from-amber-600/30 to-amber-600/10', blob: 'bg-amber-400/10', border: 'group-hover:border-amber-200' }
    }[color] || { text: 'text-indigo-600', bg: 'bg-indigo-600', glow: 'from-indigo-400/30 to-indigo-600/10', blob: 'bg-indigo-400/10', border: 'group-hover:border-indigo-200' };

    return (
        <div className={`
            relative group overflow-hidden
            bg-white/80 backdrop-blur-xl
            p-5 rounded-[1.75rem]
            border border-slate-200/60
            shadow-[0_4px_20px_rgb(0,0,0,0.03)]
            hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)]
            hover:-translate-y-1.5
            transition-all duration-400 ease-out
            active:scale-[0.98]
            ${isWarning ? 'ring-1 ring-rose-500/20 border-rose-200 bg-rose-50/20' : theme.border}
        `}>
            {/* Subtle Mesh Blobs */}
            <div className={`absolute -right-2 -top-2 w-20 h-20 ${theme.blob} blur-2xl rounded-full transition-transform duration-700 group-hover:scale-150 pointer-events-none`} />

            <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <div className={`
                        w-11 h-11 rounded-2xl flex items-center justify-center
                        ${isWarning ? 'bg-rose-600' : theme.bg}
                        text-white shadow-lg rotate-1 group-hover:rotate-6 transition-all duration-300
                    `}>
                        <Icon className="w-5 h-5 drop-shadow-sm" />
                    </div>

                    {trend && (
                        <div className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'} shadow-sm`}>
                            {trend}
                        </div>
                    )}
                </div>

                <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                        {label}
                    </p>
                    <h3 className={`text-2xl md:text-3xl font-black tracking-tighter ${isWarning ? 'text-rose-600' : 'text-slate-900'}`}>
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </h3>
                </div>

                {/* Compact Indicators */}
                <div className="mt-4 flex items-center gap-1 opacity-20">
                    <div className={`h-1 w-8 rounded-full ${isWarning ? 'bg-rose-500' : theme.bg}`} />
                    <div className={`h-1 w-1 rounded-full ${isWarning ? 'bg-rose-500' : theme.bg}`} />
                </div>
            </div>

            {/* Bottom Glow Line */}
            <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${theme.glow} transition-all duration-500 ease-out group-hover:w-full w-0`} />
        </div>
    );
}
