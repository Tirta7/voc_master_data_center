'use client';

import React from 'react';
import { WaiterPerformanceLeaderboard } from '@/components/WaiterPerformanceLeaderboard';
import { LayoutDashboard, Award, Settings, Download } from 'lucide-react';

export default function WaiterPerformancePage() {
    return (
        <div className="min-h-screen bg-[#0F172A] text-slate-200 p-6 lg:p-12">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <Award className="w-8 h-8 text-indigo-400" />
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white uppercase italic">Staff Performance</h1>
                        </div>
                        <p className="text-slate-400 font-medium">Monitoring real-time upselling success against AI Battle Plan targets.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-3 rounded-2xl transition-all font-bold text-sm">
                            <Settings className="w-4 h-4" />
                            Settings
                        </button>
                        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl transition-all font-black text-sm shadow-xl shadow-indigo-600/20">
                            <Download className="w-4 h-4" />
                            Export Data
                        </button>
                    </div>
                </div>

                {/* Dashboard Stats (Quick View) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-indigo-600/20 to-indigo-900/20 border border-indigo-500/20 rounded-3xl p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Total Upsell Revenue</p>
                        <p className="text-3xl font-black text-white italic tracking-tighter">AI Driven Growth</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Top Performer</p>
                        <p className="text-3xl font-black text-white italic tracking-tighter">Updating Live...</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Team Strike Rate</p>
                        <p className="text-3xl font-black text-white italic tracking-tighter">78% Achievement</p>
                    </div>
                </div>

                {/* Main Leaderboard */}
                <WaiterPerformanceLeaderboard />

                {/* Navigation Hint */}
                <div className="flex justify-center pt-8">
                    <a 
                        href="/admin/ai-orchestrator"
                        className="flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors font-black uppercase text-[10px] tracking-[0.3em]"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Back to Sales Orchestrator
                    </a>
                </div>
            </div>
        </div>
    );
}
