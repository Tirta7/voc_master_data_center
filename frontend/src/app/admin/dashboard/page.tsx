'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
    ShoppingBag, TrendingUp, DollarSign, AlertTriangle,
    BarChart3, Package, Users, Clock, Layers, Star,
    ArrowUp, ArrowDown, Minus, Eye, FileText, RefreshCw,
    CheckCircle, XCircle, Activity, LayoutDashboard, Lock, Share2,
    Trophy, Dices, Zap, AlertCircle, Printer
} from 'lucide-react';
import { useMqtt } from '@/context/MqttContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { AIStrategicAdvisor } from './components/AIStrategicAdvisor';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatRupiah as fmt, formatNumber } from '@/utils/formatUtils';
const fmtK = fmt;

const pct = (a: number, b: number) => b === 0 ? '0%' : `${((a / b) * 100).toFixed(1)}%`;
const now = () => new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// ─── Types ─────────────────────────────────────────────────────────────────────
interface SummaryData {
    totalOmzet: number;
    grossRevenue?: number;
    totalBilliard?: number;
    billiardOmzet?: number; // fallback for backend naming legacy
    totalCafe?: number;
    cafeOmzet?: number; // fallback for backend naming legacy
    topUpOmzet?: number;
    totalTopUp?: number; // fallback for backend naming legacy
    taxServiceRevenue?: number;
    transactionCount: number;
    unpaidAmount?: number;
    totalRounding?: number;
    paymentMethods?: Record<string, number>;
    avgOccupancyMinutes?: number;
    totalOccupancyMinutes?: number;
    tableUsage?: Record<string, { 
        count: number; 
        duration: number; 
        revenue: number;
        billiardRevenue: number;
        cafeRevenue: number;
        peakHour: number;
        avgSessionMinutes: number;
    }>;
    currentBusinessDayId?: number;
    staffPerformance?: {
        name: string;
        revenue: number;
        rph: number;
        upsellRatio: number;
        txCount: number;
    }[];
    memberRevenue?: number;
    guestRevenue?: number;
}
interface Ingredient { id: number; name: string; stockQuantity: number; minStockLevel: number; unit: string; }
interface Finance { totalIn: number; totalOut: number; netProfit: number; }
interface ItemPerf { 
    id: number; name: string; category: string; price: number; totalQty: number; totalRevenue: number; 
    hpp?: number; margin?: number; totalMargin?: number; 
    engineeringCategory?: string; aiAdvice?: string;
}
interface ItemsPerf {
    all: ItemPerf[]; topItems: ItemPerf[]; slowItems: ItemPerf[];
    totalMenuItems: number; activeItems: number; unsoldItems: number;
    menuEngineering?: {
        stars: ItemPerf[]; plowhorses: ItemPerf[]; puzzles: ItemPerf[]; dogs: ItemPerf[];
        avgMargin: number; avgVolume: number;
    };
    tableProfitability?: { name: string; billiard: number; cafe: number; total: number; count: number; avgPerSession: number }[];
    staffAudit?: { 
        id: number; 
        name: string; 
        totalTxs: number; 
        bundleTxs: number; 
        conversionRate: number;
        totalRevenue: number;
        billiardTotal: number;
        cafeTotal: number;
        categories: Record<string, Record<string, number>>;
        packages: Record<string, number>;
    }[];
}
interface DetailedRevenue {
    hourly: { hour: number; billiard: number; cafe: number; topup: number; total: number; count: number }[];
    paymentMethods: Record<string, number>;
    summary: SummaryData;
    tableUsage?: Record<string, { 
        count: number; 
        duration: number; 
        revenue: number;
        billiardRevenue: number;
        cafeRevenue: number;
        peakHour: number;
        avgSessionMinutes: number;
    }>;
    staffRevenue?: Record<string, number>;
    memberRevenue?: number;
    guestRevenue?: number;
    currentBusinessDayId?: number;
    hourlyForecast?: { hour: number; total: number }[];
    churnRiskMembers?: { id: number; name: string; phone: string; lastVisit: string; daysSince: number }[];
    staffLeaderboard?: {
        name: string;
        revenue: number;
        rph: number;
        upsellRatio: number;
        txCount: number;
        rank: number;
        badge: string;
        performanceLevel: string;
    }[];
}
interface PayrollStat {
    id: number;
    name: string;
    role: string;
    basicSalary: number;
    overtimeRate: number;
    commissionService: number;
    commissionSales: number;
    commissionProduction: number;
    penalties: number;
    total: number;
    activeDays: number;
    totalSessions: number;
    salesBreakdown: Record<string, any>;
    productionBreakdown: Record<string, any>;
}
interface PayrollRelease {
    id: number;
    month: number;
    year: number;
    basicSalary: number;
    commissionService: number;
    commissionSales: number;
    commissionProduction: number;
    penalties: number;
    totalPayout: number;
    releasedAt: string;
    details: any;
    user: { id: number; name: string };
}

interface Printer {
    id: number;
    name: string;
    type: string;
    ipAddress: string;
    isOnline: boolean;
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({ title, value, sub, icon, grad, ring }: {
    title: string; value: string; sub: string;
    icon: React.ReactNode; grad: string; ring: string;
}) {
    return (
        <div className={`relative overflow-hidden rounded-xl md:rounded-2xl p-4 text-white shadow-lg ${grad}`}>
            <div className="relative z-10">
                <div className={`w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center mb-2.5 border border-white/20`}>{icon}</div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">{title}</p>
                <p className="text-xl md:text-2xl font-black leading-none mb-1.5">{value}</p>
                <p className="text-[10px] text-white/60 font-semibold">{sub}</p>
            </div>
            <div className={`absolute -bottom-6 -right-6 w-20 h-20 rounded-full ${ring} blur-2xl opacity-40`} />
        </div>
    );
}

function SectionHeader({ icon, title, badge }: { icon: React.ReactNode; title: string; badge?: string }) {
    return (
        <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <span className="text-indigo-500">{icon}</span> {title}
            </h2>
            {badge && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">{badge}</span>}
        </div>
    );
}

// stock bar
function StockBar({ qty, min }: { qty: number; min: number }) {
    const max = Math.max(qty, min * 2, 1);
    const widthPct = Math.min((qty / max) * 100, 100);
    const isOk = qty > min;
    const isCritical = qty <= min * 0.5;
    return (
        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
            <div className={`h-1.5 rounded-full transition-all ${isCritical ? 'bg-rose-500' : isOk ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${widthPct}%` }} />
        </div>
    );
}

// Performance bar (relative to max in the list)
function PerfBar({ value, max, color }: { value: number; max: number; color: string }) {
    const w = max === 0 ? 0 : Math.min((value / max) * 100, 100);
    return (
        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-0.5">
            <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${w}%` }} />
        </div>
    );
}

// Payment method badge colors
function methodColor(m: string): string {
    const s = m.toLowerCase();
    if (s === 'member' || s === 'membership') return 'bg-violet-500';
    if (s.includes('qris') || s.includes('qr')) return 'bg-purple-500';
    if (s.includes('cash') || s.includes('tunai')) return 'bg-emerald-500';
    if (s.includes('debit') || s.includes('bank') || s.includes('card')) return 'bg-sky-500';
    if (s.includes('transfer')) return 'bg-blue-500';
    if (s.includes('sho') || s.includes('pay')) return 'bg-orange-500';
    if (s.includes('ovo') || s.includes('gopay') || s.includes('dana') || s.includes('linkaja')) return 'bg-indigo-500';
    return 'bg-slate-500';
}

function PeakIntensityHeatmap({ data, forecast = [] }: { data: any[], forecast?: any[] }) {
    const maxTotal = Math.max(...data.map(h => h.total), 1);
    const maxForecast = Math.max(...forecast.map(f => f.count), 1);
    
    const getIntensity = (total: number) => (total / maxTotal);
    const getForecastIntensity = (count: number) => (count / maxForecast);

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-gradient-to-r from-slate-50/50 to-white">
                <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        Heatmap Intensitas
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Revenue Density</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full border border-dashed border-sky-400 bg-sky-50" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pred</span>
                    </div>
                    <div className="flex items-center gap-1.5 border-l border-slate-100 pl-4">
                        <span className="text-[8px] font-bold text-slate-400">LOW</span>
                        <div className="flex gap-0.5">
                            {[0.1, 0.4, 0.7, 1].map(o => <div key={o} className="w-2.5 h-2.5 rounded-sm bg-indigo-600" style={{ opacity: o }} />)}
                        </div>
                        <span className="text-[8px] font-bold text-slate-400">PEAK</span>
                    </div>
                </div>
            </div>

            <div className="p-5">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                    {data.map((h, idx) => {
                        const intensity = getIntensity(h.total);
                        const hasValue = h.total > 0;
                        const f = forecast.find(pred => parseInt(pred.hour) === h.hour);
                        const fIntensity = f ? getForecastIntensity(f.count) : 0;
                        
                        return (
                            <div
                                key={h.hour}
                                className={`
                                    relative group aspect-square rounded-xl flex flex-col items-center justify-center border transition-all duration-300
                                    ${hasValue
                                        ? 'border-indigo-100 shadow-sm hover:shadow-lg hover:shadow-indigo-50 hover:-translate-y-0.5'
                                        : fIntensity > 0 
                                            ? 'border-dashed border-sky-200 bg-sky-50/10' 
                                            : 'border-slate-50 bg-slate-50/20 opacity-30'}
                                `}
                                style={{
                                    backgroundColor: hasValue ? `rgba(79, 70, 229, ${0.05 + intensity * 0.9})` : undefined,
                                    color: intensity > 0.6 ? '#fff' : '#1e293b'
                                }}
                            >
                                <span className={`text-[10px] font-black mb-0.5 ${intensity > 0.6 ? 'text-white/70' : 'text-slate-400'}`}>
                                    {h.hour.toString().padStart(2, '0')}:00
                                </span>
                                <span className="text-xs font-black">
                                    {hasValue ? fmtK(h.total) : (fIntensity > 0 ? <TrendingUp className="w-3 h-3 text-sky-400" /> : '—')}
                                </span>

                                {/* Tooltip on Hover */}
                                {(hasValue || fIntensity > 0) && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-slate-900 text-white p-3 rounded-xl text-[10px] opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-[100] shadow-2xl">
                                        <div className="space-y-1">
                                            {hasValue && (
                                                <>
                                                    <div className="flex justify-between border-b border-white/10 pb-1 mb-1">
                                                        <span className="font-bold opacity-60">Actual Rev</span>
                                                        <span className="font-black text-indigo-400">{fmtK(h.total)}</span>
                                                    </div>
                                                </>
                                            )}
                                            {f && (
                                                <div className="flex justify-between text-sky-400">
                                                    <span className="font-bold opacity-70">AI Forecast</span>
                                                    <span className="font-black">~{f.count} Pax/Hr</span>
                                                </div>
                                            )}
                                            {hasValue && f && (
                                                <div className="pt-1 mt-1 border-t border-white/10">
                                                    <p className="text-[9px] text-slate-400 leading-tight italic">
                                                        {h.total > (f.count * 10000) ? '🔥 Melampaui Prediksi' : '📉 Dibawah Target Trafik'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Prime Time (Billiard)</p>
                        {(() => {
                            const peak = [...data].sort((a, b) => b.billiard - a.billiard)[0];
                            return peak?.billiard > 0 ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-100">
                                        {peak.hour}:00
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800">{fmt(peak.billiard)}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Peak Omzet Billiard</p>
                                    </div>
                                </div>
                            ) : <p className="text-xs text-slate-400 italic">Data tidak tersedia</p>
                        })()}
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Prime Time (Cafe/FnB)</p>
                        {(() => {
                            const peak = [...data].sort((a, b) => b.cafe - a.cafe)[0];
                            return peak?.cafe > 0 ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-amber-100">
                                        {peak.hour}:00
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800">{fmt(peak.cafe)}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Peak Omzet Cafe</p>
                                    </div>
                                </div>
                            ) : <p className="text-xs text-slate-400 italic">Data tidak tersedia</p>
                        })()}
                    </div>
                    <div className="p-6 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-100 flex flex-col justify-center">
                        <div className="flex items-center gap-3 text-white">
                            <TrendingUp className="w-6 h-6 text-indigo-200" />
                            <div>
                                <p className="text-xl font-black">{Math.round((data.filter(h => h.total > 0).length / 24) * 100)}%</p>
                                <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest">Store Utilization Rate</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TablePerformanceCard({ usage }: { usage: Record<string, any> }) {
    const data = Object.entries(usage || {})
        .map(([name, stats]) => {
            const rph = stats.duration > 0 ? (stats.revenue / (stats.duration / 60)) : 0;
            // Performance Grade Logic (RPH based)
            let grade = 'C';
            let gradeColor = 'text-slate-400 bg-slate-50 border-slate-100';
            if (rph > 50000) { grade = 'A++'; gradeColor = 'text-amber-500 bg-amber-50 border-amber-200 shadow-sm shadow-amber-100'; }
            else if (rph > 35000) { grade = 'A'; gradeColor = 'text-emerald-500 bg-emerald-50 border-emerald-200 shadow-sm shadow-emerald-100'; }
            else if (rph > 20000) { grade = 'B'; gradeColor = 'text-indigo-500 bg-indigo-50 border-indigo-200 shadow-sm shadow-indigo-100'; }
            
            // Clean up name (remove (DELETED-...) suffix for cleaner UI)
            const cleanName = name.split(' (DELETED')[0];
            const isRetired = name.includes('(DELETED');
            
            // Calculate Utilization (Est. based on 12h active window)
            const utilPct = Math.min(((stats.duration || 0) / (12 * 60)) * 100, 100);

            return {
                name,
                displayName: cleanName,
                isRetired,
                ...stats,
                rph,
                grade,
                gradeColor,
                utilPct
            };
        })
        .sort((a, b) => b.revenue - a.revenue);

    if (data.length === 0) return (
        <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/40 p-12 text-center shadow-xl">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-200">
                <Dices className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Sistem Siap • Menunggu Aktivitas Meja</p>
        </div>
    );

    const fmtNum = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
    const fmtK = (v: number) => {
        if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
        if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
        return Math.round(v).toString();
    };

    const formatDuration = (mins: number) => {
        if (mins >= 1440) return `${(mins / 1440).toFixed(1)} days`;
        if (mins >= 60) return `${(mins / 60).toFixed(1)} hours`;
        return `${Math.round(mins)} mins`;
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Intelligence Hub</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Performance Intelligence</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Real-time Table Profitability & Demand Analytics</p>
                </div>
                <div className="bg-white/60 backdrop-blur-xl border border-white p-1 rounded-2xl flex items-center shadow-sm">
                    <div className="px-4 py-2 border-r border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Fleet Size</p>
                        <p className="text-sm font-black text-slate-800 leading-none">{data.length} Meja</p>
                    </div>
                    <div className="px-4 py-2">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Top Performer</p>
                        <p className="text-sm font-black text-indigo-600 leading-none">{data[0].name}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                {data.map((table) => (
                    <div key={table.name} className="group bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white p-7 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-200/40 transition-all duration-500 hover:-translate-y-1 relative overflow-hidden">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-all duration-500" />
                        
                        <div className="relative z-10">
                            {/* Header: Name & Grade */}
                            <div className="flex justify-between items-start mb-8">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xl font-black text-slate-900 tracking-tight truncate max-w-[140px] uppercase italic">{table.displayName}</h4>
                                        {table.isRetired && (
                                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded text-[7px] font-black uppercase tracking-tighter">Retired</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="px-2 py-0.5 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-tighter italic">
                                            Table Hub
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">{table.count} Visits Today</span>
                                    </div>
                                </div>
                                <div className={`px-4 py-2 rounded-2xl border font-black italic shadow-sm transition-all duration-500 group-hover:scale-110 ${table.gradeColor}`}>
                                    {table.grade}
                                </div>
                            </div>

                            {/* Efficiency Meter (NEW) */}
                            <div className="mb-8">
                                <div className="flex justify-between items-end px-1 mb-2">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Est. Utilization</p>
                                    <span className={`text-[9px] font-black ${table.utilPct > 70 ? 'text-amber-500' : 'text-indigo-400'}`}>{Math.round(table.utilPct)}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${table.utilPct > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`} 
                                        style={{ width: `${Math.max(5, table.utilPct)}%` }} 
                                    />
                                </div>
                            </div>

                            {/* Main Metrics */}
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50 group-hover:bg-white/80 transition-colors duration-500">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <DollarSign className="w-2.5 h-2.5" /> Total Revenue
                                    </p>
                                    <p className="text-lg font-black text-slate-900 leading-none tracking-tight">{fmtNum(table.revenue)}</p>
                                </div>
                                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50 group-hover:bg-white/80 transition-colors duration-500">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1 text-emerald-500">
                                        <TrendingUp className="w-2.5 h-2.5" /> Efficiency (RPH)
                                    </p>
                                    <p className="text-lg font-black text-emerald-600 leading-none tracking-tight">{fmtK(table.rph)}<span className="text-[10px] font-bold text-emerald-400 ml-1">/H</span></p>
                                </div>
                            </div>

                            {/* Revenue Mix (DNA) */}
                            <div className="space-y-3 mb-8">
                                <div className="flex justify-between items-end px-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenue Mix (DNA)</p>
                                    <div className="flex gap-2">
                                        <span className="text-[8px] font-bold text-indigo-500 uppercase">Play</span>
                                        <span className="text-[8px] font-bold text-emerald-500 uppercase">Dine</span>
                                    </div>
                                </div>
                                <div className="h-4 bg-slate-100/50 rounded-xl overflow-hidden flex p-1 gap-1">
                                    <div 
                                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg transition-all duration-1000 shadow-sm" 
                                        style={{ width: `${Math.max(15, (table.billiardRevenue / (table.revenue || 1)) * 100)}%` }} 
                                    />
                                    <div 
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg transition-all duration-1000 shadow-sm" 
                                        style={{ width: `${Math.max(15, (table.cafeRevenue / (table.revenue || 1)) * 100)}%` }} 
                                    />
                                </div>
                            </div>

                            {/* Secondary Metrics */}
                            <div className="grid grid-cols-2 border-t border-slate-100 pt-6 gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500">
                                        <Zap className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Peak Hour</p>
                                        <p className="text-xs font-black text-slate-700">{table.peakHour !== undefined ? `${table.peakHour.toString().padStart(2, '0')}:00` : 'None'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100 group-hover:bg-amber-500 group-hover:text-white transition-all duration-500">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Avg Session</p>
                                        <p className="text-xs font-black text-slate-700">{formatDuration(table.avgSessionMinutes)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32" />
                <div className="relative flex items-center gap-6">
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 shadow-xl group-hover:scale-110 transition-all duration-500">
                        <Activity className="w-7 h-7 text-indigo-400" />
                    </div>
                    <div className="max-w-xl">
                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Strategic Analytics</p>
                        <h4 className="text-xl font-black mb-1">Operational Efficiency Detected</h4>
                        <p className="text-white/40 text-xs font-medium leading-relaxed">
                            Meja dengan performa tertinggi cenderung mengandalkan kombinasi durasi bermain panjang dan volume penjualan cafe yang stabil. Pantau kontribusi <b>Dine (Green Bar)</b> untuk menjaga profitabilitas di luar biaya operasional meja.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
    const { hasPermission } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const [selectedPayrollDetail, setSelectedPayrollDetail] = useState<any>(null);
    const [showPayrollDetail, setShowPayrollDetail] = useState(false);
    const [payrollView, setPayrollView] = useState<'active' | 'history'>('active');
    const [isBusinessDayMode, setIsBusinessDayMode] = useState(false);
    const [selectedAuditStaff, setSelectedAuditStaff] = useState<any | null>(null);

    // Filter states
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        // If before 2 AM (default offset), start from yesterday
        if (d.getHours() < 2) d.setDate(d.getDate() - 1);
        d.setHours(2, 0, 0, 0); // Start at 02:00
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:00:00`;
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        // If before 2 AM (default offset), end at 01:59 today
        // Else end at 01:59 tomorrow
        if (d.getHours() >= 2) d.setDate(d.getDate() + 1);
        d.setHours(1, 59, 0, 0);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${mins}:59`;
    });

    // SWR Data Fetching
    const { data: summary, mutate: mutateSummary, isLoading: loadingSummary } = useSWR<SummaryData | null>('/reports/summary/daily', fetcher);
    const { data: stock, mutate: mutateStockHealth, isLoading: loadingStock } = useSWR<Ingredient[]>('/reports/inventory/health', fetcher);
    const { data: allStock, mutate: mutateIngredients, isLoading: loadingAllStock } = useSWR<Ingredient[]>('/inventory/ingredients', fetcher);
    const { data: finance, isLoading: loadingFinance } = useSWR<Finance | null>(`/finance/profit?start=${startDate}&end=${endDate}`, fetcher);
    const { data: itemsPerf, mutate: mutateItems, isLoading: loadingItems } = useSWR<ItemsPerf | null>(`/reports/items-performance?start=${startDate}&end=${endDate}`, fetcher);
    const { data: expenses, isLoading: loadingExpenses } = useSWR<any[]>(`/finance/expenses?startDate=${startDate}&endDate=${endDate}`, fetcher);
    const { data: settings, isLoading: loadingSettings } = useSWR<any>('/settings', fetcher);
    const { data: detailedRevenue, isLoading: loadingDetailed } = useSWR<DetailedRevenue | null>(`/reports/detailed?start=${startDate}&end=${endDate}`, fetcher);
    
    const payrollMonth = new Date(startDate).getMonth() + 1;
    const payrollYear = new Date(startDate).getFullYear();
    const { data: payrollStats, isLoading: loadingPayroll } = useSWR<Record<number, PayrollStat>>(`/users/employees/payroll/bulk?month=${payrollMonth}&year=${payrollYear}&includeReleased=true`, fetcher);
    const { data: payrollRangeStats, isLoading: loadingPayrollRange } = useSWR<Record<number, PayrollStat>>(`/users/employees/payroll/bulk?start=${startDate}&end=${endDate}&includeReleased=true`, fetcher);
    const { data: payrollHistory, isLoading: loadingPayrollHistory } = useSWR<PayrollRelease[]>('/users/payroll/history', fetcher);
    const { data: printers, mutate: mutatePrinters } = useSWR<Printer[]>('/settings/printers', fetcher);

    const initialLoading = loadingSummary || loadingDetailed || loadingItems || loadingStock || loadingFinance;

    const [loading, setLoading] = useState(false);
    // const [initialLoading, setInitialLoading] = useState(true); // Removed, SWR handles initial loading
    const [tab, setTab] = useState<'overview' | 'items' | 'stock' | 'finance' | 'hourly' | 'payroll' | 'analytics'>('overview');
    const [stockView, setStockView] = useState<'critical' | 'all'>('critical');
    const printRef = useRef<HTMLDivElement>(null);

    const { subscribe } = useMqtt();

    // Revalidation function via mutate
    const revalidateAll = () => {
        mutate('/reports/summary/daily');
        mutate('/reports/inventory/health');
        mutate('/inventory/ingredients');
        mutate(`/finance/profit?start=${startDate}&end=${endDate}`);
        mutate(`/reports/items-performance?start=${startDate}&end=${endDate}`);
        mutate(`/finance/expenses?startDate=${startDate}&endDate=${endDate}`);
        mutate('/settings');
        mutate(`/reports/detailed?start=${startDate}&end=${endDate}`);
        mutate(`/users/employees/payroll/bulk?month=${payrollMonth}&year=${payrollYear}&includeReleased=true`);
        mutate(`/users/employees/payroll/bulk?start=${startDate}&end=${endDate}&includeReleased=true`);
        mutate('/users/payroll/history');
    };

    const fetchAll = async () => {
        setLoading(true);
        await revalidateAll();
        setLoading(false);
    };

    useEffect(() => {
        // Initial fetch is handled by SWR. We only need to set up MQTT listeners.
        // fetchAll(); // Removed, SWR handles initial fetch

        const handleUpdate = () => revalidateAll(); // Use revalidateAll for MQTT refresh

        // MQTT Listeners for real-time dashboard refresh
        const unsubs = [
            subscribe('billiard/tables/update', handleUpdate),
            subscribe('billiard/order/update', handleUpdate),
            subscribe('billiard/finance/transaction', handleUpdate),
            subscribe('billiard/inventory/update', handleUpdate),
            subscribe('billiard/user/+/violation', handleUpdate),
            subscribe('billiard/user/+/commission', handleUpdate),
            subscribe('printer_status_update', () => mutate('/settings/printers')),
        ];

        return () => unsubs.forEach(u => u());
    }, [subscribe, startDate, endDate]); // Dependencies for MQTT and SWR keys

    const handlePrint = () => {
        window.open(`/admin/dashboard/report?start=${startDate}&end=${endDate}`, '_blank');
    };

    const handleReleaseSalary = async (empId: number, name: string) => {
        console.log(`[Dashboard-Payroll] Initiating salary release for ${name} (ID: ${empId})`);
        
        const stats = payrollRangeStats?.[empId];
        const total = stats?.total ?? 0;

        if (!stats || total <= 0) {
            showToast('Peringatan', 'Belum ada gaji yang bisa diselesaikan periode ini.', 'error');
            return;
        }

        const confirmMsg = `Konfirmasi penyerahan gaji Rp ${Number(total).toLocaleString('id-ID')} ke ${name}?\n\nSemua data komisi & denda periode ini akan diarsipkan (Ledger Reset).`;
        
        if (!window.confirm(confirmMsg)) return;

        try {
            console.log(`[Dashboard-Payroll] Sending release request for month ${payrollMonth}/${payrollYear}`);
            await axios.post(`/users/${empId}/payroll/release`, {
                month: payrollMonth,
                year: payrollYear
            });
            
            await revalidateAll();
            showToast('Gaji Diselesaikan', `Gaji ${name} berhasil diselesaikan & diarsipkan.`, 'success');
        } catch (error: any) {
            console.error('Failed to release salary:', error);
            const msg = error.response?.data?.message || 'Gagal menyelesaikan pembayaran gaji.';
            showToast('Error', msg, 'error');
        }
    };

    // Auto-sync offset when settings load or mode changes
    useEffect(() => {
        if (!settings) return;
        
        if (isBusinessDayMode) {
            const offsetStr = settings.businessDayOffset || '04:00';
            const [h, m] = offsetStr.split(':').map(Number);
            
            const dStart = new Date();
            if (dStart.getHours() < h) dStart.setDate(dStart.getDate() - 1);
            dStart.setHours(h, m, 0, 0);
            
            const dEnd = new Date(dStart);
            dEnd.setDate(dEnd.getDate() + 1);
            dEnd.setMinutes(dEnd.getMinutes() - 1); // 1 minute before next day offset
            
            const fmt = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const HH = String(d.getHours()).padStart(2, '0');
                const MM = String(d.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${HH}:${MM}:00`;
            };

            setStartDate(fmt(dStart));
            setEndDate(fmt(dEnd));
        } else {
            // CALENDAR MODE: Sync to strictly 00:00 - 23:59 of today
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            
            setStartDate(`${year}-${month}-${day}T00:00:00`);
            setEndDate(`${year}-${month}-${day}T23:59:59`);
        }
    }, [settings, isBusinessDayMode]);

    const handleSendDashboardWA = async () => {
        try {
            const ownerPhone = settings?.ownerPhone;
            if (!ownerPhone) {
                alert('Nomor HP Owner belum diatur di Settings!');
                return;
            }
            
            setLoading(true);
            await axios.post(`/reports/whatsapp-dashboard`, {
                phone: ownerPhone,
                start: startDate,
                end: endDate
            });
            
            alert('Laporan Dashboard telah dikirim ke WhatsApp Owner!');
        } catch (e: any) {
            console.error(e);
            alert(`Gagal mengirim laporan: ${e.response?.data?.message || e.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading && !summary) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500 font-semibold text-sm animate-pulse">Memuat data dashboard...</p>
            </div>
        </div>
    );

    // Use summary from detailedRevenue if available (it follows the date range)
    const activeSummary = (() => {
        const startDay = new Date(startDate);
        const today = new Date();
        const isToday = startDay.toDateString() === today.toDateString();

        // For 'Today', we prioritize the business-day-aware 'summary' from /reports/summary/daily
        // which includes late-night transactions (00:00 - 04:00) that calendar filters might miss.
        if (isToday && summary) return summary;
        return detailedRevenue?.summary || summary;
    })();

    // NEW: totalRevenue is now Gross Revenue for consistent pie chart/breakdown
    const totalRevenue = Number(activeSummary?.grossRevenue || activeSummary?.totalOmzet || 0);

    const activeBilliard = Number(activeSummary?.totalBilliard ?? activeSummary?.billiardOmzet ?? 0);
    const activeCafe = Number(activeSummary?.totalCafe ?? activeSummary?.cafeOmzet ?? 0);
    const activeTopup = Number(activeSummary?.totalTopUp ?? activeSummary?.topUpOmzet ?? 0);
    const activeTaxService = Number(activeSummary?.taxServiceRevenue ?? 0);
    const activeRounding = Number(activeSummary?.totalRounding ?? 0);

    const billiardPct = pct(activeBilliard, totalRevenue);
    const cafePct = pct(activeCafe, totalRevenue);
    const topupPct = pct(activeTopup, totalRevenue);
    const taxServicePct = pct(activeTaxService, totalRevenue);
    const roundingPct = pct(activeRounding, totalRevenue);
    const criticalCount = (stock || []).length;
    const topItems = itemsPerf?.topItems || [];
    const maxItemQty = topItems.length > 0 ? Math.max(...topItems.map((i: any) => i.totalQty), 1) : 1;
    const maxItemRev = topItems.length > 0 ? Math.max(...topItems.map((i: any) => i.totalRevenue), 1) : 1;

    const payMethodsRaw = activeSummary?.paymentMethods || detailedRevenue?.paymentMethods || {};
    // Separate cash methods (real income) from member balance (non-cash)
    const cashPayMethods = Object.entries(payMethodsRaw)
        .filter(([m]) => !['MEMBER', 'MEMBERSHIP'].includes(m.toUpperCase()))
        .sort((a, b) => (b[1] as number) - (a[1] as number));
    const memberPayMethods = Object.entries(payMethodsRaw)
        .filter(([m]) => ['MEMBER', 'MEMBERSHIP'].includes(m.toUpperCase()))
        .sort((a, b) => (b[1] as number) - (a[1] as number));
    const payMethods = [...cashPayMethods, ...memberPayMethods];
    const totalCashPaid = cashPayMethods.reduce((s: number, [, v]: any) => s + Number(v), 0);
    const totalMemberPaid = memberPayMethods.reduce((s: number, [, v]: any) => s + Number(v), 0);
    const totalPaid = totalCashPaid + totalMemberPaid;

    const expenseTotal = (expenses || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const todayExp = (expenses || [])
        .filter((e: any) => {
            const d = new Date(e.date || e.createdAt);
            const t = new Date(); t.setHours(0, 0, 0, 0);
            return d >= t;
        })
        .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

    // grouped by category
    const expByCategory: Record<string, number> = {};
    (expenses || []).forEach((e: any) => {
        expByCategory[e.category || 'Lain-lain'] = (expByCategory[e.category || 'Lain-lain'] || 0) + Number(e.amount || 0);
    });

    const tabs = [
        { id: 'overview', label: '📊 Overview' },
        ...(hasPermission('DASHBOARD_CHART_VIEW') ? [{ id: 'hourly', label: '🕒 Hourly Revenue' } as const] : []),
        { id: 'items', label: '🍽️ Menu Performance' },
        { id: 'stock', label: '📦 Inventori' },
        { id: 'finance', label: '💰 Keuangan' },
        { id: 'analytics', label: '📈 Tabel & Analytics' },
        { id: 'payroll', label: '👥 Gaji Karyawan' },
    ] as const;

    return (
        <div className="min-h-screen bg-slate-50 relative">
            {/* ── Printer Health Toast (Floating) ── */}
            {printers?.some(p => !p.isOnline) && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] animate-in slide-in-from-bottom duration-500">
                    <div className="bg-rose-500/90 backdrop-blur-xl border border-rose-400 p-4 rounded-3xl shadow-2xl flex items-center gap-4 text-white">
                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
                            <Printer className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-100">Hardware Alert</p>
                            <p className="text-sm font-black italic">
                                {printers.filter(p => !p.isOnline).length} Printer Offline
                            </p>
                            <p className="text-[9px] text-rose-100/70 font-semibold italic mt-0.5">
                                Order akan dialihkan ke Kasir secara otomatis.
                            </p>
                        </div>
                        <button 
                            onClick={() => router.push('/admin/settings')}
                            className="ml-4 px-4 py-2 bg-white text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                        >
                            Konfigurasi
                        </button>
                    </div>
                </div>
            )}


            {/* ── Top bar ── */}
            {/* Hero Header */}
            <div className="max-w-7xl mx-auto px-6 py-6 pt-8 pb-0">
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 rounded-3xl p-8 lg:p-10 text-white shadow-2xl shadow-indigo-200 w-full mb-4">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12" />
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                                </div>
                                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Owner Dashboard</span>
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-2">
                                Ringkasan Operasional
                            </h1>
                            <p className="text-white/60 mt-0.5 font-semibold text-[11px]">{now()} · {activeSummary?.transactionCount || 0} transaksi dalam filter</p>
                        </div>

                        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3">
                            {/* Business Day Toggle */}
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-1.5 hover:bg-white/20 transition-all cursor-pointer group/toggle" onClick={() => setIsBusinessDayMode(!isBusinessDayMode)}>
                                <div className="flex flex-col items-start pr-2 border-r border-white/10">
                                    <span className="text-[7px] font-black text-white/40 uppercase tracking-widest leading-none">Logic Mode</span>
                                    <span className="text-[9px] font-black text-white uppercase italic tracking-tighter">
                                        {isBusinessDayMode ? 'Business Day' : 'Calendar'}
                                    </span>
                                </div>
                                <div className={`w-8 h-5 rounded-full p-1 transition-all duration-500 flex items-center ${isBusinessDayMode ? 'bg-emerald-500' : 'bg-white/20'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full shadow-lg transform transition-all duration-500 ${isBusinessDayMode ? 'translate-x-3' : 'translate-x-0'}`} />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-2.5 py-2 w-full sm:w-auto overflow-hidden">
                                <input
                                    type="datetime-local"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        if (isBusinessDayMode) setIsBusinessDayMode(false); // Manual change breaks auto mode
                                    }}
                                    className="bg-transparent text-[10px] md:text-xs font-bold text-white outline-none w-[130px] md:w-[140px] [&::-webkit-calendar-picker-indicator]:filter-white focus:outline-none"
                                />
                                <span className="text-white/50 text-xs">→</span>
                                <input
                                    type="datetime-local"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        if (isBusinessDayMode) setIsBusinessDayMode(false); // Manual change breaks auto mode
                                    }}
                                    className="bg-transparent text-[10px] md:text-xs font-bold text-white outline-none w-[130px] md:w-[140px] [&::-webkit-calendar-picker-indicator]:filter-white focus:outline-none"
                                />
                            </div>

                            <button onClick={() => fetchAll()} title="Refresh Data" className="flex items-center justify-center p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 w-full sm:w-auto">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            {hasPermission('REPORT_EXPORT') && (
                                <>
                                    <button onClick={handleSendDashboardWA} className="flex flex-1 sm:flex-none justify-center items-center gap-2 bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-black transition-all shadow-xl active:scale-95 text-[11px] hover:bg-emerald-600 w-full sm:w-auto">
                                        <Share2 className="w-4 h-4" /> WA Summary
                                    </button>
                                    <button onClick={handlePrint} className="flex flex-1 sm:flex-none justify-center items-center gap-2 bg-white text-indigo-600 px-4 py-2.5 rounded-xl font-black transition-all shadow-xl active:scale-95 text-[11px] hover:bg-indigo-50 w-full sm:w-auto">
                                        <FileText className="w-4 h-4" /> Export PDF
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-5 space-y-6" ref={printRef}>
                {/* ── AI Strategic Advisor (Proactive Hero) ── */}
                {(tab === 'overview' || tab === 'analytics') && (
                    <AIStrategicAdvisor 
                        businessDayId={activeSummary?.currentBusinessDayId || detailedRevenue?.summary?.currentBusinessDayId}
                        totalRevenue={totalRevenue}
                    />
                )}

                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {hasPermission('DASHBOARD_STATS_VIEW') ? (
                        <>
                            <KpiCard title="Total Omzet (Gross)" value={fmtK(totalRevenue)}
                                sub={`${activeSummary?.transactionCount || 0} Transaksi`}
                                icon={<DollarSign className="w-5 h-5" />}
                                grad="bg-gradient-to-br from-indigo-600 to-violet-600" ring="bg-violet-400" />
                            <KpiCard title="Laba Bersih (Est.)" value={fmtK(totalRevenue - (finance?.totalOut || 0) - Object.values(payrollRangeStats || {}).filter(p => p !== null).reduce((sum, p) => sum + (p.total || 0), 0))}
                                sub={`Opex: ${fmtK(finance?.totalOut || 0)} · Gaji: ${fmtK(Object.values(payrollRangeStats || {}).filter(p => p !== null).reduce((sum, p) => sum + (p.total || 0), 0))}`}
                                icon={<TrendingUp className="w-5 h-5" />}
                                grad="bg-gradient-to-br from-emerald-500 to-teal-600" ring="bg-emerald-300" />
                            <KpiCard title="Piutang Belum Lunas" value={fmtK(Number(activeSummary?.unpaidAmount || 0))}
                                sub="Perlu ditagih"
                                icon={<AlertTriangle className="w-5 h-5" />}
                                grad="bg-gradient-to-br from-rose-500 to-pink-600" ring="bg-rose-300" />
                        </>
                    ) : (
                        <div className="col-span-1 sm:col-span-2 lg:col-span-3 bg-white/50 border border-slate-200 border-dashed rounded-2xl flex items-center justify-center p-10 text-slate-400 font-bold italic text-sm">
                            <Lock className="w-4 h-4 mr-2" /> Detail Finansial Terbatas
                        </div>
                    )}
                    <KpiCard title="Stok Kritis" value={`${criticalCount} Item`}
                        sub={`${(allStock || []).length} Total bahan`}
                        icon={<Package className="w-5 h-5" />}
                        grad={criticalCount > 0 ? "bg-gradient-to-br from-amber-500 to-orange-500" : "bg-gradient-to-br from-slate-500 to-slate-600"}
                        ring="bg-amber-300" />
                </div>

                {/* ── Revenue Breakdown ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Billiard vs Cafe split */}
                    {hasPermission('DASHBOARD_CHART_VIEW') && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                            <SectionHeader icon={<BarChart3 className="w-4 h-4" />} title="Sumber Pendapatan" />
                            <div className="space-y-4 mt-2">
                                {[
                                    { label: 'Billiard', amount: activeBilliard, pctStr: billiardPct, color: 'bg-indigo-500' },
                                    { label: 'Café / F&B', amount: activeCafe, pctStr: cafePct, color: 'bg-amber-400' },
                                    { label: 'Top-up Member', amount: activeTopup, pctStr: topupPct, color: 'bg-emerald-400' },
                                    { label: 'Taxes & Service', amount: activeTaxService, pctStr: taxServicePct, color: 'bg-slate-400' },
                                    { label: 'Pembulatan', amount: activeRounding, pctStr: roundingPct, color: 'bg-slate-300' },
                                ].map(({ label, amount, pctStr, color }) => (
                                    <div key={label}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="text-sm font-bold text-slate-700">{label}</span>
                                            <div className="text-right">
                                                <span className="text-sm font-black text-slate-800">{fmtK(amount)}</span>
                                                <span className="text-[10px] text-slate-400 ml-1.5">{pctStr}</span>
                                            </div>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(parseFloat(pctStr || '0'), 100)}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Quick stats */}
                            <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Avg/Transaksi', value: activeSummary?.transactionCount ? fmtK(totalRevenue / activeSummary.transactionCount) : '—' },
                                    { label: 'Total Masuk', value: fmtK(finance?.totalIn || 0) },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                                        <p className="text-sm font-black text-slate-800">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Payment methods */}
                    {hasPermission('DASHBOARD_STATS_VIEW') && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                            <SectionHeader icon={<Activity className="w-4 h-4" />} title="Metode Pembayaran" />
                            {payMethods.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">Belum ada pembayaran hari ini</div>
                            ) : (
                                <div className="space-y-3">
                                    {cashPayMethods.length > 0 && (
                                        <>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Kas Fisik Diterima</p>
                                            {cashPayMethods.map(([method, amount]) => (
                                                <div key={method} className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${methodColor(method)}`} />
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-baseline">
                                                            <span className="text-xs font-bold text-slate-700 uppercase">{method}</span>
                                                            <span className="text-xs font-black text-slate-800">{fmtK(amount)}</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                            <div className={`h-1.5 rounded-full ${methodColor(method)}`} style={{ width: `${Math.min(parseFloat(pct(amount, totalCashPaid)), 100)}%` }} />
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 w-10 text-right">{pct(amount, totalCashPaid)}</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {memberPayMethods.length > 0 && (
                                        <>
                                            {cashPayMethods.length > 0 && <div className="border-t border-slate-100 pt-2 mt-1" />}
                                            <p className="text-[8px] font-black text-violet-400 uppercase tracking-widest mb-1">Saldo Member (non-kas)</p>
                                            {memberPayMethods.map(([method, amount]) => (
                                                <div key={method} className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-violet-400" />
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-baseline">
                                                            <span className="text-xs font-bold text-violet-700 uppercase">💜 {method === 'MEMBER' ? 'MEMBERSHIP' : method}</span>
                                                            <span className="text-xs font-black text-violet-700">{fmtK(amount)}</span>
                                                        </div>
                                                        <p className="text-[8px] text-violet-400 mt-0.5">Dipotong dari saldo member · bukan kas fisik</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase">Total Kas Diterima</span>
                                        <span className="text-sm font-black text-emerald-700">{fmtK(totalCashPaid)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quick actions */}
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-4">Akses Cepat</p>
                            <div className="space-y-2.5">
                                {[
                                    { label: '📒 Buku Kas', path: '/admin/finance/ledger' },
                                    { label: '💸 Catat Pengeluaran', path: '/admin/finance/expenses' },
                                    { label: '📦 Inventori Bahan', path: '/admin/inventory' },
                                    { label: '⚙️ Pengaturan', path: '/admin/settings' },
                                    { label: '🔒 Tutup Toko', path: '/admin/closing', red: true },
                                ].map(({ label, path, red }) => (
                                    <button key={path} onClick={() => router.push(path)}
                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${red ? 'bg-rose-500/80 hover:bg-rose-500' : 'bg-white/10 hover:bg-white/20 border border-white/10'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Tab Panel ── */}
                <div>
                    {/* Tabs */}
                    <div className="flex gap-2 mb-4 overflow-x-auto whitespace-nowrap scrollbar-hide pb-1">
                        {tabs.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`flex-shrink-0 px-4 py-2 rounded-xl text-[11px] font-black transition-all ${tab === t.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Hourly Revenue Tab ── */}
                    {tab === 'hourly' && detailedRevenue && (
                        <div className="space-y-6">
                            <PeakIntensityHeatmap 
                                data={detailedRevenue.hourly || []} 
                                forecast={detailedRevenue.hourlyForecast || []} 
                            />
                        </div>
                    )}

                    {/* ── Analytics Tab ── */}
                    {tab === 'analytics' && (activeSummary || detailedRevenue?.summary) && (
                        <div className="space-y-6">
                            {/* Member vs Guest & Staff Ranking */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Member vs Guest */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                    <SectionHeader icon={<Users className="w-4 h-4" />} title="Segmentasi Pelanggan" />
                                    <div className="flex items-center gap-10 mt-6">
                                        <div className="relative w-32 h-32 flex-shrink-0">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                                                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" 
                                                    className="text-indigo-600" 
                                                    strokeDasharray={364.4} 
                                                    strokeDashoffset={364.4 * (1 - (activeSummary?.memberRevenue || 0) / (totalRevenue || 1))} 
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-lg font-black text-slate-800">{pct(activeSummary?.memberRevenue || 0, totalRevenue)}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase">Loyalty</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <div className="flex justify-between text-xs font-bold mb-1">
                                                    <span className="text-indigo-600">Member</span>
                                                    <span>{fmtK(activeSummary?.memberRevenue || 0)}</span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-100 rounded-full">
                                                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: pct(activeSummary?.memberRevenue || 0, totalRevenue) }} />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs font-bold mb-1">
                                                    <span className="text-slate-500">Guest (Walk-in)</span>
                                                    <span>{fmtK(activeSummary?.guestRevenue || 0)}</span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-100 rounded-full">
                                                    <div className="bg-slate-400 h-2 rounded-full" style={{ width: pct(activeSummary?.guestRevenue || 0, totalRevenue) }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="mt-8 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed italic">
                                        💡 Fokus untuk mengkonversi <b>Guest</b> menjadi <b>Member</b> guna meningkatkan retensi dan pendapatan jangka panjang.
                                    </p>

                                    {/* Member Churn Risk (Phase 3) */}
                                    {(detailedRevenue?.churnRiskMembers?.length ?? 0) > 0 && (
                                        <div className="mt-8 pt-8 border-t border-slate-50">
                                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <AlertCircle className="w-3 h-3" />
                                                At-Risk Member Retention (Churn Risk)
                                            </p>
                                            <div className="space-y-3">
                                                {(detailedRevenue?.churnRiskMembers || []).map((m: any) => (
                                                    <div key={m.id} className="flex items-center justify-between p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-800">{m.name}</p>
                                                            <p className="text-[9px] text-slate-400 mt-0.5">📞 {m.phone || 'No Phone'}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black text-rose-600 uppercase tracking-tighter">Inactive {Math.floor((new Date().getTime() - new Date(m.lastVisit).getTime()) / (1000 * 3600 * 24))} Days</p>
                                                            <button 
                                                                onClick={() => window.open(`https://wa.me/${m.phone?.replace(/[^0-9]/g, '')}`, '_blank')}
                                                                className="text-[9px] font-bold text-indigo-600 hover:underline mt-0.5"
                                                            >
                                                                Kirim Promo Re-engagement
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                                                <div className="p-2 bg-white rounded-xl shadow-sm">
                                                    <Zap className="w-4 h-4 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-indigo-900 leading-tight">AI Retention Strategy</p>
                                                    <p className="text-[10px] text-indigo-700/80 mt-1 leading-relaxed">
                                                        Pelanggan di atas memiliki kecenderungan churn &gt;60%. Gunakan <b>WhatsApp Re-engagement</b> dengan promo <i>&quot;We Miss You&quot;</i> (Free Drink/Discount 15%) untuk menarik mereka kembali dalam 3 hari ke depan.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Staff Performance Leaderboard (Phase 5) */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                    <SectionHeader icon={<Trophy className="w-4 h-4" />} title="Staff Performance Leaderboard" badge="Phase 5" />
                                    <div className="mt-4 space-y-4">
                                        {(activeSummary?.staffPerformance || []).length === 0 ? (
                                            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No Active Staff Performance Data</p>
                                            </div>
                                        ) : (
                                            [...(activeSummary?.staffPerformance || [])]
                                                .sort((a,b) => b.revenue - a.revenue)
                                                .slice(0, 5)
                                                .map((staff, idx) => (
                                                <div key={staff.name} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:shadow-md">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-200 text-slate-600' : 'bg-orange-50 text-orange-600'}`}>
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{staff.name}</span>
                                                            <span className="text-sm font-black text-indigo-600">{fmtK(staff.revenue)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center gap-1">
                                                                <Zap className="w-3 h-3 text-amber-500" />
                                                                <span className="text-[10px] font-bold text-slate-500">RPH: {fmtK(staff.rph)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 border-l pl-3 text-emerald-600">
                                                                <ShoppingBag className="w-3 h-3" />
                                                                <span className="text-[10px] font-bold">Upsell: {(staff.upsellRatio * 100).toFixed(0)}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {staff.upsellRatio > 0.3 && (
                                                        <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg" title="Upsell Master Badge">
                                                            <Star className="w-4 h-4 fill-current" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <p className="mt-8 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed italic">
                                        💡 Gunakan metrik <b>Upsell Ratio</b> dan <b>Revenue per Hour (RPH)</b> untuk evaluasi insentif performa staff.
                                    </p>
                                </div>
                            </div>

                            {/* ── Intelligence Hub: Premium Table Analytics ── */}
                            <TablePerformanceCard usage={activeSummary?.tableUsage || detailedRevenue?.tableUsage || {}} />

                            {/* Table Utilization */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <SectionHeader icon={<Dices className="w-4 h-4" />} title="Utilitas & Durasi Meja" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                                    {/* Most Popular (by Count) */}
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Meja Terpopuler (Frekuensi)</p>
                                        <div className="space-y-4">
                                            {Object.entries((activeSummary?.tableUsage || {}) as Record<string, { count: number; duration: number }>)
                                                .sort(([, a], [, b]) => b.count - a.count)
                                                .slice(0, 6)
                                                .map(([name, usage]) => (
                                                    <div key={name}>
                                                        <div className="flex justify-between text-xs font-bold mb-1">
                                                            <span className="text-slate-700">{name}</span>
                                                            <span className="text-slate-400">{usage.count} Sesi</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-slate-100 rounded-full">
                                                            <div className="bg-emerald-400 h-1.5 rounded-full" 
                                                                style={{ width: pct(usage.count, Math.max(...Object.values((activeSummary?.tableUsage || {}) as Record<string, { count: number; duration: number }>).map(u => u.count), 1)) }} 
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    {/* Most Used (by Duration) */}
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Meja Terlama (Menit)</p>
                                        <div className="space-y-4">
                                            {Object.entries((activeSummary?.tableUsage || {}) as Record<string, { count: number; duration: number }>)
                                                .sort(([, a], [, b]) => b.duration - a.duration)
                                                .slice(0, 6)
                                                .map(([name, usage]) => (
                                                    <div key={name}>
                                                        <div className="flex justify-between text-xs font-bold mb-1">
                                                            <span className="text-slate-700">{name}</span>
                                                            <span className="text-slate-400">{Math.round(usage.duration)} mnt</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-slate-100 rounded-full">
                                                            <div className="bg-amber-400 h-1.5 rounded-full" 
                                                                style={{ width: pct(usage.duration, Math.max(...Object.values((activeSummary?.tableUsage || {}) as Record<string, { count: number; duration: number }>).map(u => u.duration), 1)) }} 
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-slate-100">
                                    <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl overflow-hidden relative group">
                                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-indigo-500/20 transition-all duration-1000" />
                                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -ml-20 -mb-20" />
                                        
                                        <div className="relative z-10">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
                                                <div>
                                                    <h4 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Table Intensity Clusters</h4>
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">AI-Driven Segmentation based on Session Frequency & Duration</p>
                                                </div>
                                                <div className="px-6 py-2.5 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 text-[11px] font-black uppercase tracking-[0.2em] shadow-xl inline-flex items-center gap-2 w-fit">
                                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                                                    Advanced AI Analytics
                                                </div>
                                            </div>
                                
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                                {/* Cluster 1: High Velocity */}
                                                <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 hover:bg-white/10 transition-all duration-500 hover:scale-[1.02]">
                                                    <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                                                        <Activity className="w-6 h-6" />
                                                    </div>
                                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">High Velocity</p>
                                                    <p className="text-lg font-bold text-white mb-3">Turnover Meja Cepat</p>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-3xl font-black italic">{(activeSummary?.transactionCount || 0) / (Object.keys(activeSummary?.tableUsage || {}).length || 1) > 2 ? 'Meja Aktif' : 'Normal'}</span>
                                                    </div>
                                                    <p className="text-xs text-white/40 mt-5 leading-relaxed font-medium">Segmentasi untuk meja dengan perputaran tamu tinggi. Rekomendasi: Prioritaskan kecepatan pembersihan (clean-up) untuk turnover maksimal.</p>
                                                </div>
                                
                                                {/* Cluster 2: Sticky Tables */}
                                                <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 hover:bg-white/10 transition-all duration-500 hover:scale-[1.02]">
                                                    <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                                                        <Clock className="w-6 h-6" />
                                                    </div>
                                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Sticky Tables</p>
                                                    <p className="text-lg font-bold text-white mb-3">Loyalty & Upsell</p>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-3xl font-black italic">{Math.round(activeSummary?.avgOccupancyMinutes || 0)} <span className="text-xs font-medium opacity-40 not-italic ml-1">Min/Avg</span></span>
                                                    </div>
                                                    <p className="text-xs text-white/40 mt-5 leading-relaxed font-medium">Segmentasi untuk sesi durasi panjang. Rekomendasi: Tawarkan menu FnB porsi besar atau promo bundling durasi lama (upsell).</p>
                                                </div>
                                
                                                {/* Cluster 3: Revenue Engines */}
                                                <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 hover:bg-white/10 transition-all duration-500 hover:scale-[1.02]">
                                                    <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/30 shadow-lg shadow-amber-500/10">
                                                        <TrendingUp className="w-6 h-6" />
                                                    </div>
                                                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Revenue Engine</p>
                                                    <p className="text-lg font-bold text-white mb-3">Total Jam Profit</p>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-3xl font-black italic">{Math.round((activeSummary?.totalOccupancyMinutes || 0) / 60)} <span className="text-xs font-medium opacity-40 not-italic ml-1">Hours</span></span>
                                                    </div>
                                                    <p className="text-xs text-white/40 mt-5 leading-relaxed font-medium">Kontributor utama jam bermain tertinggi. Rekomendasi: Pastikan ketersediaan meja ini untuk pelanggan setia/VIP Anda.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Overview Tab ── */}
                    {tab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top sellers preview */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <SectionHeader icon={<Star className="w-4 h-4" />} title="Top Menu (30 Hari)" badge="Terlaris" />
                                {(itemsPerf?.topItems || []).length === 0 ? (
                                    <p className="text-slate-400 text-sm text-center py-6">Belum ada data penjualan</p>
                                ) : (
                                    <div className="space-y-3">
                                        {(itemsPerf?.topItems || []).slice(0, 5).map((item: any, i: number) => (
                                            <div key={item.id} className="flex items-center gap-3">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white ${['bg-amber-400', 'bg-slate-400', 'bg-orange-400', 'bg-indigo-400', 'bg-violet-400'][i] || 'bg-slate-300'}`}>{i + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline">
                                                        <span className="text-xs font-bold text-slate-800 truncate">{item.name}</span>
                                                        <span className="text-xs font-black text-indigo-600 ml-2 flex-shrink-0">{item.totalQty}×</span>
                                                    </div>
                                                    <PerfBar value={item.totalQty} max={maxItemQty} color="bg-indigo-400" />
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-bold w-24 text-right">{fmtK(item.totalRevenue)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Critical stock preview */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <SectionHeader icon={<AlertTriangle className="w-4 h-4" />} title="Stok Kritis" />
                                    {criticalCount > 0 && (
                                        <span className="bg-rose-50 text-rose-600 text-[10px] font-black px-2.5 py-1 rounded-full">{criticalCount} kritis</span>
                                    )}
                                </div>
                                {criticalCount === 0 ? (
                                    <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-4">
                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                        <p className="text-sm font-bold text-emerald-700">Semua stok aman ✓</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {(stock || []).slice(0, 5).map(ing => (
                                            <div key={ing.id} className="flex items-center justify-between bg-rose-50 rounded-xl px-4 py-3 border border-rose-100/50">
                                                <div>
                                                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{ing.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-widest">Min: {formatNumber(ing.minStockLevel, 0)} {ing.unit}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-rose-600">{formatNumber(ing.stockQuantity, 0)} <span className="text-[10px] font-bold text-rose-400 uppercase">{ing.unit}</span></p>
                                                    <p className="text-[9px] text-rose-400 font-black uppercase tracking-tighter">Sisa {pct(ing.stockQuantity, ing.minStockLevel)} min</p>
                                                </div>
                                            </div>
                                        ))}
                                        {(stock || []).length > 5 && (
                                            <button onClick={() => setTab('stock')} className="w-full text-xs text-indigo-600 font-bold py-2 text-center hover:underline">
                                                +{(stock || []).length - 5} lagi →
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Menu Performance Tab ── */}
                    {tab === 'items' && itemsPerf && (
                        <div className="space-y-6">
                            {/* Summary chips */}
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: 'Total Menu', value: itemsPerf.totalMenuItems, color: 'text-slate-800', bg: 'bg-white', border: 'border-slate-200' },
                                    { label: 'Menu Aktif (30hr)', value: itemsPerf.activeItems, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                                    { label: 'Tidak Terjual', value: itemsPerf.unsoldItems, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
                                ].map(({ label, value, color, bg, border }) => (
                                    <div key={label} className={`${bg} border ${border} rounded-2xl p-5 text-center shadow-sm`}>
                                        <p className={`text-3xl font-black mb-1 ${color}`}>{value}</p>
                                        <p className={`text-xs font-bold ${color} opacity-70`}>{label}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Top 8 terlaris */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                    <SectionHeader icon={<Star className="w-4 h-4" />} title={`🏆 Menu Terlaris (${isBusinessDayMode ? 'Harian' : '30 Hari'})`} badge={`Top ${itemsPerf.topItems.length}`} />
                                    <div className="space-y-3">
                                        {itemsPerf.topItems.map((item: any, i: number) => (
                                            <div key={item.id} className="flex items-start gap-3 group">
                                                <div className={`w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-[11px] font-black text-white ${[
                                                    'bg-yellow-400', 'bg-slate-400', 'bg-orange-400', 'bg-indigo-400',
                                                    'bg-violet-400', 'bg-sky-400', 'bg-rose-400', 'bg-teal-400'
                                                ][i]}`}>{i + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline gap-2 mb-0.5">
                                                        <span className="text-xs font-bold text-slate-800 truncate">{item.name}</span>
                                                        <span className="text-[10px] text-slate-400 flex-shrink-0">{item.category}</span>
                                                    </div>
                                                    <div className="flex gap-4 text-[10px] text-slate-500 mb-1">
                                                        <span className="text-indigo-600 font-black">{item.totalQty}× terjual</span>
                                                        <span className="font-bold text-slate-600">{fmtK(item.totalRevenue)}</span>
                                                    </div>
                                                    <PerfBar value={item.totalQty} max={maxItemQty} color="bg-gradient-to-r from-indigo-400 to-violet-400" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Inventory Velocity Clusters (Phase 3) */}
                                <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl overflow-hidden relative group lg:col-span-2">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-amber-500/20 transition-all duration-700" />
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-8">
                                            <div>
                                                <h4 className="text-xl font-black tracking-tight flex items-center gap-2">
                                                    <Zap className="w-5 h-5 text-amber-400" />
                                                    Inventory Velocity Clusters
                                                </h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{isBusinessDayMode ? 'Daily' : '30-Day'} Sales Velocity Segmentation</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Top Velocity */}
                                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1 font-mono">Fast Movers</p>
                                                <p className="text-sm font-bold text-white mb-4">Revenue Engines</p>
                                                <div className="space-y-2">
                                                    {itemsPerf.topItems.slice(0, 3).map((item: any) => (
                                                        <div key={item.id} className="flex justify-between items-center text-[10px]">
                                                            <span className="opacity-70 truncate max-w-[100px]">{item.name}</span>
                                                            <span className="font-black text-amber-400">{item.totalQty}×</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Slow Velocity */}
                                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-mono">Steady Performers</p>
                                                <p className="text-sm font-bold text-white mb-4">Core Inventory</p>
                                                <div className="text-3xl font-black">
                                                    {itemsPerf.all.filter((i: any) => i.totalQty > 0 && i.totalQty <= 5).length}
                                                    <span className="text-xs opacity-40 ml-2">Items</span>
                                                </div>
                                                <p className="text-[9px] text-white/40 mt-2">Daya serap pasar stabil namun volume rendah.</p>
                                            </div>

                                            {/* Dead Stock */}
                                            <div className="p-6 bg-rose-500/10 rounded-3xl border border-rose-500/20">
                                                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1 font-mono">Dead Stock</p>
                                                <p className="text-sm font-bold text-white mb-4">Capital Locked</p>
                                                <div className="text-3xl font-black text-rose-400">
                                                    {itemsPerf.unsoldItems}
                                                    <span className="text-xs opacity-40 ml-2 text-white">Items</span>
                                                </div>
                                                <p className="text-[9px] text-rose-300/60 mt-2">Item tidak terjual dalam {isBusinessDayMode ? 'hari ini' : '30 hari'}. Rekomendasi: Promo Bundling.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Slow movers */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 lg:col-span-2">
                                    <SectionHeader icon={<ArrowDown className="w-4 h-4" />} title={`⚠️ Menu Kurang Laku (${isBusinessDayMode ? 'Harian' : '30 Hari'})`} />
                                    {itemsPerf.slowItems.length === 0 ? (
                                        <p className="text-slate-400 text-sm text-center py-8">Semua menu terjual dalam {isBusinessDayMode ? 'hari ini' : '30 hari terakhir'}</p>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {itemsPerf.slowItems.map((item: any) => (
                                                <div key={item.id} className={`flex items-center justify-between px-4 py-3 rounded-xl ${item.totalQty === 0 ? 'bg-rose-50 border border-rose-100' : 'bg-amber-50 border border-amber-100'}`}>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800">{item.name}</p>
                                                        <p className="text-[9px] text-slate-400 mt-0.5">{item.category} · Rp {item.price.toLocaleString('id-ID')}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        {item.totalQty === 0 ? (
                                                            <span className="inline-flex items-center gap-1 text-rose-600 text-[10px] font-black bg-rose-100 px-2 py-0.5 rounded-full">
                                                                <XCircle className="w-3 h-3" /> Belum Terjual
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-700 text-xs font-black">{item.totalQty}×</span>
                                                        )}
                                                        <p className="text-[10px] text-slate-400 mt-0.5">{fmtK(item.totalRevenue)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── NEW: Executive Strategic Insights ── */}
                            <div className="space-y-6">
                                {/* AI Strategic Advisor HUD */}
                                <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse" />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                                <Zap className="w-6 h-6 text-amber-300" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black tracking-tight">Executive AI Advisor</h3>
                                                <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Real-time Strategic Decision Support</p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="p-6 bg-white/10 rounded-3xl backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all cursor-default">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Trophy className="w-4 h-4 text-emerald-300" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Profitability</span>
                                                </div>
                                                <p className="text-xs font-medium text-white/80 leading-relaxed">
                                                    Margin rata-rata item saat ini adalah <span className="text-white font-black">{fmt(itemsPerf.menuEngineering?.avgMargin || 0)}</span>. 
                                                    { (itemsPerf.menuEngineering?.stars?.length || 0) > 3 ? ' Performa "Stars" sangat sehat!' : ' Optimalkan menu Puzzles untuk boost margin.' }
                                                </p>
                                            </div>
                                            <div className="p-6 bg-white/10 rounded-3xl backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all cursor-default">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Activity className="w-4 h-4 text-sky-300" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Table Efficiency</span>
                                                </div>
                                                <p className="text-xs font-medium text-white/80 leading-relaxed">
                                                    Meja <span className="text-white font-black">{itemsPerf.tableProfitability?.[0]?.name || '—'}</span> memberikan kontribusi FnB tertinggi.
                                                    Target: Naikkan rasio belanja meja lainnya sebesar 15%.
                                                </p>
                                            </div>
                                            <div className="p-6 bg-white/10 rounded-3xl backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all cursor-default">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Lock className="w-4 h-4 text-rose-300" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Integrity & Upsell</span>
                                                </div>
                                                <p className="text-xs font-medium text-white/80 leading-relaxed">
                                                    Rasio konversi bundle tertinggi: <span className="text-white font-black">{itemsPerf.staffAudit?.[0]?.name || '—'}</span>. 
                                                    Gunakan tekniknya sebagai standar training staff lain.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Menu Engineering Matrix Visualizer */}
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
                                        <SectionHeader icon={<LayoutDashboard className="w-5 h-5 text-indigo-500" />} title="Menu Engineering Matrix" badge={`${isBusinessDayMode ? 'Daily' : 'Range'} Analysis`} />
                                        
                                        <div className="grid grid-cols-2 gap-4 mt-6 h-[400px]">
                                            {/* STARS */}
                                            <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100 flex flex-col relative overflow-hidden group">
                                                <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                                    <Star className="w-24 h-24 text-emerald-500" fill="currentColor" />
                                                </div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">⭐ Stars</h5>
                                                    <span className="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black rounded-full">Keep!</span>
                                                </div>
                                                <p className="text-[9px] font-bold text-emerald-800/60 mb-3 uppercase tracking-tighter">{isBusinessDayMode ? 'Best Sellers' : 'High Volume, High Margin'}</p>
                                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                                    {itemsPerf.menuEngineering?.stars.map(it => (
                                                        <div key={it.id} className="flex justify-between text-[10px] font-bold bg-white/50 p-2 rounded-lg border border-emerald-100/50 hover:bg-white/80 transition-colors">
                                                            <span className="truncate max-w-[100px] text-slate-800">{it.name}</span>
                                                            <span className="text-emerald-700">{it.totalQty}×</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* PUZZLES */}
                                            <div className="bg-indigo-50 rounded-3xl p-5 border border-indigo-100 flex flex-col relative overflow-hidden group">
                                                <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                                    <Dices className="w-24 h-24 text-indigo-500" fill="currentColor" />
                                                </div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h5 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">🧩 Puzzles</h5>
                                                    <span className="px-2 py-0.5 bg-indigo-500 text-white text-[8px] font-black rounded-full">Bundle!</span>
                                                </div>
                                                <p className="text-[9px] font-bold text-indigo-800/60 mb-3 uppercase tracking-tighter">Low Volume, High Margin</p>
                                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                                    {itemsPerf.menuEngineering?.puzzles.map(it => (
                                                        <div key={it.id} className="flex justify-between text-[10px] font-bold bg-white/50 p-2 rounded-lg border border-indigo-100/50 hover:bg-white/80 transition-colors">
                                                            <span className="truncate max-w-[100px] text-slate-800">{it.name}</span>
                                                            <span className="text-indigo-700">{it.totalQty}×</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* PLOWHORSES */}
                                            <div className="bg-amber-50 rounded-3xl p-5 border border-amber-100 flex flex-col relative overflow-hidden group">
                                                <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                                    <Zap className="w-24 h-24 text-amber-500" fill="currentColor" />
                                                </div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h5 className="text-[10px] font-black text-amber-700 uppercase tracking-widest">⚡ Plowhorses</h5>
                                                    <span className="px-2 py-0.5 bg-amber-500 text-white text-[8px] font-black rounded-full">Re-price</span>
                                                </div>
                                                <p className="text-[9px] font-bold text-amber-800/60 mb-3 uppercase tracking-tighter">High Volume, Low Margin</p>
                                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                                    {itemsPerf.menuEngineering?.plowhorses.map(it => (
                                                        <div key={it.id} className="flex justify-between text-[10px] font-bold bg-white/50 p-2 rounded-lg border border-amber-100/50 hover:bg-white/80 transition-colors">
                                                            <span className="truncate max-w-[100px] text-slate-800">{it.name}</span>
                                                            <span className="text-amber-700">{it.totalQty}×</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* DOGS */}
                                            <div className="bg-rose-50 rounded-3xl p-5 border border-rose-100 flex flex-col relative overflow-hidden group">
                                                <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                                    <AlertTriangle className="w-24 h-24 text-rose-500" fill="currentColor" />
                                                </div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h5 className="text-[10px] font-black text-rose-700 uppercase tracking-widest">📉 Dogs</h5>
                                                    <span className="px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-full">Delete</span>
                                                </div>
                                                <p className="text-[9px] font-bold text-rose-800/60 mb-3 uppercase tracking-tighter">Low Volume, Low Margin</p>
                                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                                    {itemsPerf.menuEngineering?.dogs.map(it => (
                                                        <div key={it.id} className="flex justify-between text-[10px] font-bold bg-white/50 p-2 rounded-lg border border-rose-100/50 hover:bg-white/80 transition-colors">
                                                            <span className="truncate max-w-[100px] text-slate-800">{it.name}</span>
                                                            <span className="text-rose-700">{it.totalQty}×</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Table Profitability & Staff Integrity Audit */}
                                    <div className="space-y-6">
                                        <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 p-6">
                                            <SectionHeader icon={<ShoppingBag className="w-4 h-4 text-emerald-500" />} title="Table Profitability Index" />
                                            <div className="space-y-3 mt-4 text-slate-800">
                                                {itemsPerf.tableProfitability?.slice(0, 5).map((table, i) => (
                                                    <div key={table.name} className="flex items-center gap-4 group">
                                                        <span className="w-5 text-[10px] font-black text-slate-300">#{i + 1}</span>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <p className="text-xs font-black text-slate-800">{table.name}</p>
                                                                <p className="text-xs font-black text-emerald-600">{fmt(table.total)}</p>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-slate-400">
                                                                <span className="flex items-center gap-1">🎱 {fmt(table.billiard)}</span>
                                                                <span className="flex items-center gap-1 text-amber-600">🍔 {fmt(table.cafe)}</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                                                                <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${(table.total / (itemsPerf.tableProfitability?.[0]?.total || 1)) * 100}%` }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-[20px]">
                                            <SectionHeader icon={<Users className="w-4 h-4 text-indigo-500" />} title="Staff Bundle Conversion Audit" />
                                            <div className="mt-4 space-y-4">
                                                {itemsPerf.staffAudit?.slice(0, 3).map((staff, i) => (
                                                    <div 
                                                        key={staff.id} 
                                                        onClick={() => setSelectedAuditStaff(staff)}
                                                        className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-slate-100 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                {i + 1}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{staff.name}</p>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{staff.totalTxs} Transactions</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex items-center gap-3">
                                                            <div>
                                                                <p className={`text-sm font-black ${staff.conversionRate > 30 ? 'text-emerald-600' : 'text-slate-700'}`}>{staff.conversionRate.toFixed(1)}%</p>
                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Package Upsell Rate</p>
                                                            </div>
                                                            <Eye className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-400 mt-4 leading-relaxed bg-white/50 p-3 rounded-xl border border-slate-200">
                                                💡 <span className="text-slate-600">Audit Insight:</span> Staff dengan tingkat konversi rendah mungkin kurang aktif menawarkan paket bundling kepada pelanggan baru.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* All items ranked table */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <SectionHeader icon={<Layers className="w-4 h-4" />} title="Semua Menu — Ranking Penjualan 30 Hari" badge={`${itemsPerf.all.length} Item`} />
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100">
                                                {['#', 'Nama Menu', 'Kategori', 'Harga', 'Qty Terjual', 'Revenue', 'Tren'].map((h: string, i: number) => (
                                                    <th key={h} className={`py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest ${i >= 3 ? 'text-right' : 'text-left'} px-2`}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const grouped = (itemsPerf.all || []).reduce((acc: any, it: any) => {
                                                    const cat = it.category || 'Lainnya';
                                                    if (!acc[cat]) acc[cat] = [];
                                                    acc[cat].push(it);
                                                    return acc;
                                                }, {});
                                                
                                                return (Object.entries(grouped) as [string, any[]][]).map(([category, items], ci: number) => (
                                                    <React.Fragment key={ci}>
                                                        <tr className="bg-slate-50/30">
                                                            <td colSpan={7} className="py-2 px-4 text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em]">{category}</td>
                                                        </tr>
                                                        {items.map((item: any, i: number) => (
                                                            <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                                <td className="py-2 px-2 text-slate-400 font-bold">{i + 1}</td>
                                                                <td className="py-2 px-2 font-bold text-slate-800">{item.name}</td>
                                                                <td className="py-2 px-2 text-slate-500">{item.category || '—'}</td>
                                                                <td className="py-2 px-2 text-right text-slate-600">{fmt(item.price)}</td>
                                                                <td className="py-2 px-2 text-right font-black text-indigo-600">{item.totalQty > 0 ? `${item.totalQty}×` : <span className="text-rose-400">—</span>}</td>
                                                                <td className="py-2 px-2 text-right font-bold text-slate-700">{item.totalRevenue > 0 ? fmtK(item.totalRevenue) : '—'}</td>
                                                                <td className="py-2 px-2 text-right">
                                                                    <div className="flex items-center justify-end">
                                                                        <div className="w-16 h-1 bg-slate-100 rounded-full">
                                                                            <div className={`h-1 rounded-full ${item.totalQty === 0 ? 'bg-slate-200' : 'bg-emerald-400'}`}
                                                                                style={{ width: `${Math.min((item.totalQty / (maxItemQty || 1)) * 100, 100)}%` }} />
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                ));
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Stock / Inventori Tab ── */}
                    {tab === 'stock' && (
                        <div className="space-y-5">
                            {/* Toggle critical / all */}
                            <div className="flex gap-2">
                                {(['critical', 'all'] as const).map(v => (
                                    <button key={v} onClick={() => setStockView(v)}
                                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${stockView === v ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}>
                                        {v === 'critical' ? `🔴 Stok Kritis (${(stock || []).length})` : `📦 Semua Bahan (${(allStock || []).length})`}
                                    </button>
                                ))}
                            </div>

                            {stockView === 'critical' && (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                    <SectionHeader icon={<AlertTriangle className="w-4 h-4" />} title="Bahan dengan Stok Kritis" badge={`${(stock || []).length} Item`} />
                                    {(stock || []).length === 0 ? (
                                        <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-5">
                                            <CheckCircle className="w-6 h-6 text-emerald-500" />
                                            <div>
                                                <p className="font-bold text-emerald-800">Semua stok dalam kondisi aman</p>
                                                <p className="text-xs text-emerald-600 mt-0.5">Tidak ada bahan di bawah minimum stok</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {(stock || []).map(ing => (
                                                <div key={ing.id} className="flex items-center justify-between bg-rose-50 border border-rose-100 rounded-xl p-4">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-slate-800">{ing.name}</p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">Min. stok: {ing.minStockLevel} {ing.unit}</p>
                                                        <StockBar qty={ing.stockQuantity} min={ing.minStockLevel} />
                                                    </div>
                                                    <div className="text-right ml-4">
                                                        <p className="text-base font-black text-rose-600">{ing.stockQuantity}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{ing.unit}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {stockView === 'all' && (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                    <SectionHeader icon={<Package className="w-4 h-4" />} title="Semua Bahan / Inventori" badge={`${(allStock || []).length} Bahan`} />
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-100">
                                                    {['Nama Bahan', 'Stok Saat Ini', 'Min. Stok', 'Satuan', 'Status', 'Level'].map((h, i) => (
                                                        <th key={h} className={`py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 ${i >= 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(allStock || []).map(ing => {
                                                    const isCrit = Number(ing.stockQuantity) <= Number(ing.minStockLevel);
                                                    const isLow = Number(ing.stockQuantity) <= Number(ing.minStockLevel) * 1.5;
                                                    return (
                                                        <tr key={ing.id} className="border-b border-slate-50 hover:bg-slate-50">
                                                            <td className="py-2.5 px-3 font-bold text-slate-800">{ing.name}</td>
                                                            <td className={`py-2.5 px-3 text-right font-black ${isCrit ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-600'}`}>{ing.stockQuantity}</td>
                                                            <td className="py-2.5 px-3 text-right text-slate-500">{ing.minStockLevel}</td>
                                                            <td className="py-2.5 px-3 text-right text-slate-400">{ing.unit}</td>
                                                            <td className="py-2.5 px-3 text-right">
                                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${isCrit ? 'bg-rose-100 text-rose-600' : isLow ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                                    {isCrit ? 'Kritis' : isLow ? 'Perhatian' : 'Aman'}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <StockBar qty={Number(ing.stockQuantity)} min={Number(ing.minStockLevel)} />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Finance Tab ── */}
                    {tab === 'finance' && (
                        <div className="space-y-6">
                            {/* Summary row */}
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: 'Total Pemasukan', value: fmtK(finance?.totalIn || 0), color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <ArrowUp className="w-4 h-4 text-emerald-600" /> },
                                    { label: 'Total Pengeluaran', value: fmtK(finance?.totalOut || 0), color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', icon: <ArrowDown className="w-4 h-4 text-rose-600" /> },
                                    { label: 'Laba Bersih', value: fmtK(finance?.netProfit || 0), color: `${(finance?.netProfit || 0) >= 0 ? 'text-indigo-700' : 'text-rose-700'}`, bg: `${(finance?.netProfit || 0) >= 0 ? 'bg-indigo-50' : 'bg-rose-50'}`, border: 'border-indigo-200', icon: <Minus className="w-4 h-4 text-indigo-600" /> },
                                ].map(({ label, value, color, bg, border, icon }) => (
                                    <div key={label} className={`${bg} border ${border} rounded-2xl p-5`}>
                                        <div className="flex items-center gap-2 mb-2">{icon}<p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p></div>
                                        <p className={`text-2xl font-black ${color}`}>{value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Pengeluaran by category */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                    <SectionHeader icon={<ArrowDown className="w-4 h-4" />} title="Pengeluaran per Kategori" badge={`Hari Ini: ${fmtK(todayExp)}`} />
                                    {Object.keys(expByCategory).length === 0 ? (
                                        <p className="text-slate-400 text-sm text-center py-8">Belum ada pengeluaran tercatat</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {Object.entries(expByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                                                <div key={cat}>
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <span className="text-xs font-bold text-slate-700">{cat}</span>
                                                        <span className="text-xs font-black text-slate-800">{fmtK(amt)}</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-1.5 bg-rose-400 rounded-full" style={{ width: `${Math.min(parseFloat(pct(amt, expenseTotal)), 100)}%` }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Piutang */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                    <SectionHeader icon={<Users className="w-4 h-4" />} title="Piutang & Unpaid" badge={`${fmtK(Number(summary?.unpaidAmount || 0))}`} />
                                    {Number(summary?.unpaidAmount || 0) === 0 ? (
                                        <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-4">
                                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                                            <p className="text-sm font-bold text-emerald-700">Tidak ada piutang hari ini ✓</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                                                <p className="text-xs text-rose-600 font-bold mb-1">Total Belum Dibayar</p>
                                                <p className="text-2xl font-black text-rose-700">{fmt(Number(summary?.unpaidAmount || 0))}</p>
                                            </div>
                                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                                                <p className="text-xs text-amber-700 font-bold">⚠️ Perlu tindak lanjut</p>
                                                <p className="text-xs text-amber-600 mt-1">Periksa Buku Kas untuk detail transaksi yang belum lunas.</p>
                                                <button onClick={() => router.push('/admin/finance/ledger')} className="mt-2 text-xs font-black text-amber-700 hover:underline">Buka Buku Kas →</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recent (expenses || []) */}
                            {(expenses || []).length > 0 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                    <SectionHeader icon={<Clock className="w-4 h-4" />} title="Riwayat Pengeluaran Terbaru" badge={`${(expenses || []).length} Entri`} />
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-100">
                                                    {['Tanggal', 'Kategori', 'Deskripsi', 'Jumlah', 'Dicatat oleh'].map((h, i) => (
                                                        <th key={h} className={`py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(expenses || []).slice(0, 10).map((exp: any) => (
                                                    <tr key={exp.id} className="border-b border-slate-50 hover:bg-slate-50">
                                                        <td className="py-2 px-2 text-slate-400">{new Date(exp.date || exp.createdAt).toLocaleDateString('id-ID')}</td>
                                                        <td className="py-2 px-2">
                                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase">{exp.category}</span>
                                                        </td>
                                                        <td className="py-2 px-2 text-slate-700 font-medium">{exp.description}</td>
                                                        <td className="py-2 px-2 text-right font-black text-rose-600">{fmt(Number(exp.amount || 0))}</td>
                                                        <td className="py-2 px-2 text-right text-slate-400">{exp.recordedBy || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* ── Payroll / Gaji Tab ── */}
                    {tab === 'payroll' && (
                        <div className="space-y-6">
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                                <button onClick={() => setPayrollView('active')} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${payrollView === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Ledger Aktif</button>
                                <button onClick={() => setPayrollView('history')} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${payrollView === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Riwayat Selesai</button>
                            </div>

                            {payrollView === 'active' ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimasi Pengeluaran Gaji (Range)</p>
                                            <p className="text-2xl font-black text-slate-900">{fmt(Object.values(payrollRangeStats || {}).filter(p => p !== null).reduce((sum, p) => sum + (p.total || 0), 0))}</p>
                                        </div>
                                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Komisi & Bonus (Range)</p>
                                            <p className="text-2xl font-black text-emerald-600">{fmt(Object.values(payrollRangeStats || {}).filter(p => p !== null).reduce((sum, p) => sum + (p.commissionService || 0) + (p.commissionSales || 0) + (p.commissionProduction || 0), 0))}</p>
                                        </div>
                                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Potongan & Denda (Range)</p>
                                            <p className="text-2xl font-black text-rose-600">{fmt(Object.values(payrollRangeStats || {}).filter(p => p !== null).reduce((sum, p) => sum + (p.penalties || 0), 0))}</p>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                            <SectionHeader icon={<Users className="w-4 h-4" />} title="Detail Gaji per Karyawan" badge={`${Object.keys(payrollStats || {}).length} Orang`} />
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-slate-50/30">
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Karyawan</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Gaji Pokok</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Komisi</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-rose-600 uppercase tracking-widest text-right">Denda</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-indigo-500 uppercase tracking-widest text-right">Total Gaji (THP)</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {Object.values(payrollRangeStats || {}).filter(p => p !== null).map(p => (
                                                        <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                                            <td className="px-6 py-5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center font-black text-indigo-600 text-[10px] border border-indigo-100">
                                                                        {p.name ? p.name.charAt(0) : '?'}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-black text-slate-800 leading-none mb-1">{p.name}</p>
                                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.role}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 text-right">
                                                                <p className="text-sm font-bold text-slate-600">{fmt(p.basicSalary)}</p>
                                                            </td>
                                                            <td className="px-6 py-5 text-right">
                                                                <p className="text-sm font-black text-emerald-600">+{fmt((p.commissionSales || 0) + (p.commissionService || 0) + (p.commissionProduction || 0))}</p>
                                                                <div className="flex flex-col items-end gap-0.5 mt-1">
                                                                    {(p.commissionService || 0) > 0 && <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Service: {fmt(p.commissionService)}</span>}
                                                                    {(p.commissionSales || 0) > 0 && <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Sales: {fmt(p.commissionSales)}</span>}
                                                                    {(p.commissionProduction || 0) > 0 && <span className="text-[8px] font-bold text-amber-500 uppercase tracking-tighter">Kitchen: {fmt(p.commissionProduction)}</span>}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 text-right">
                                                                <p className="text-sm font-black text-rose-500">-{fmt(p.penalties || 0)}</p>
                                                            </td>
                                                            <td className="px-6 py-5 text-right">
                                                                <p className="text-lg font-black text-indigo-600">{fmt(p.total || 0)}</p>
                                                                <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{(p.activeDays || 0)} Hari Kerja · {(p.totalSessions || 0)} Sesi</p>
                                                            </td>
                                                            <td className="px-6 py-5 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedPayrollDetail(p);
                                                                            setShowPayrollDetail(true);
                                                                        }}
                                                                        className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all shadow-sm"
                                                                        title="Lihat Detail"
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleReleaseSalary(p.id, p.name)}
                                                                        className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all shadow-sm"
                                                                        title="Selesaikan & Arsipkan Gaji"
                                                                    >
                                                                        <CheckCircle className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                        <SectionHeader icon={<FileText className="w-4 h-4" />} title="Riwayat Penyerahan Gaji" badge={`${(payrollHistory || []).length} Log`} />
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-slate-50/30">
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Karyawan</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Periode</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Payout</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Waktu Selesai</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {(payrollHistory || []).length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">Belum ada riwayat gaji yang diselesaikan.</td>
                                                    </tr>
                                                ) : (
                                                    (payrollHistory || []).map(h => (
                                                        <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-6 py-5">
                                                                <p className="text-sm font-black text-slate-800">{h.user?.name || 'Unknown'}</p>
                                                            </td>
                                                            <td className="px-6 py-5 text-center">
                                                                <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-600 uppercase">
                                                                    {new Date(0, h.month - 1).toLocaleString('id-ID', { month: 'long' })} {h.year}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-5 text-right font-black text-slate-800">
                                                                {fmt(h.totalPayout)}
                                                            </td>
                                                            <td className="px-6 py-5 text-right text-[10px] font-bold text-slate-400">
                                                                {new Date(h.releasedAt).toLocaleString('id-ID')}
                                                            </td>
                                                            <td className="px-6 py-5 text-right">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedPayrollDetail(h.details || h);
                                                                        setShowPayrollDetail(true);
                                                                    }}
                                                                    className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all shadow-sm"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Payroll Detail Modal */}
                {showPayrollDetail && selectedPayrollDetail && (
                    <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowPayrollDetail(false)} />
                        <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Detail Penggajian</h3>
                                    <p className="text-xs font-bold text-indigo-500 uppercase mt-1 tracking-widest">
                                        {selectedPayrollDetail.name || selectedPayrollDetail.user?.name || 'Karyawan'} · {selectedPayrollDetail.month ? new Date(0, selectedPayrollDetail.month - 1).toLocaleString('id-ID', { month: 'long' }) : '—'} {selectedPayrollDetail.year || ''}
                                    </p>
                                </div>
                                <button onClick={() => setShowPayrollDetail(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                                    <XCircle className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gaji Pokok</p>
                                        <p className="text-2xl font-black text-slate-900">{fmt(selectedPayrollDetail.basicSalary)}</p>
                                    </div>
                                    <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-xl shadow-indigo-200">
                                        <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Take Home Pay</p>
                                        <p className="text-2xl font-black">{fmt(selectedPayrollDetail.total || selectedPayrollDetail.totalPayout)}</p>
                                    </div>
                                </div>

                                {/* Commission Breakdown */}
                                <div className="space-y-4">
                                    <SectionHeader icon={<TrendingUp className="w-4 h-4" />} title="Rincian Komisi & Bonus" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Komisi Penjualan (Sales)</p>
                                            {Object.entries(selectedPayrollDetail.salesBreakdown || {}).length === 0 ? (
                                                <p className="text-xs text-slate-400 italic">Tidak ada komisi penjualan.</p>
                                            ) : (
                                                Object.entries(selectedPayrollDetail.salesBreakdown).map(([cat, data]: any) => (
                                                    <div key={cat} className="flex justify-between items-center bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50">
                                                        <span className="text-xs font-bold text-slate-700">{cat} <span className="text-[10px] text-slate-400">({data.percent}%)</span></span>
                                                        <span className="text-xs font-black text-emerald-600">{fmt(data.commission)}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Komisi Produksi (Kitchen)</p>
                                            {Object.entries(selectedPayrollDetail.productionBreakdown || {}).length === 0 ? (
                                                <p className="text-xs text-slate-400 italic">Tidak ada komisi produksi.</p>
                                            ) : (
                                                Object.entries(selectedPayrollDetail.productionBreakdown).map(([cat, data]: any) => (
                                                    <div key={cat} className="flex justify-between items-center bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                                                        <span className="text-xs font-bold text-slate-700">{cat} <span className="text-[10px] text-slate-400">({data.percent}%)</span></span>
                                                        <span className="text-xs font-black text-amber-600">{fmt(data.commission)}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                        <span className="text-sm font-bold text-indigo-700">Komisi Pelayanan (Service)</span>
                                        <span className="text-sm font-black text-indigo-600">{fmt(selectedPayrollDetail.commissionService)}</span>
                                    </div>
                                </div>

                                {/* Penalties */}
                                <div className="space-y-4">
                                    <SectionHeader icon={<AlertTriangle className="w-4 h-4" />} title="Potongan & Denda" />
                                    <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-black text-rose-700">Total Denda Keamanan</p>
                                            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mt-0.5">Idle Timeout, Lateness, etc.</p>
                                        </div>
                                        <p className="text-xl font-black text-rose-600">-{fmt(selectedPayrollDetail.penalties)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50 border-t border-slate-100">
                                <button onClick={() => setShowPayrollDetail(false)} className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all shadow-sm">
                                    Tutup Detail
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Staff Sales Detail Drill-down Modal */}
                {selectedAuditStaff && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedAuditStaff(null)} />
                        <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
                            <div className="p-8 border-b border-slate-100 bg-white sticky top-0 z-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedAuditStaff.name}</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Detailed Staff Activity</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-indigo-600">{fmt(selectedAuditStaff.totalRevenue)}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                {/* Packages Section */}
                                <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100/50">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Packages Sold</p>
                                    <div className="space-y-2">
                                        {Object.entries(selectedAuditStaff.packages).length > 0 ? (
                                            Object.entries(selectedAuditStaff.packages).map(([name, qty]: [string, any]) => (
                                                <div key={name} className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-600 uppercase italic">{name}</span>
                                                    <span className="text-xs font-black text-indigo-600">{qty}x</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-[10px] text-slate-400 italic font-medium">No packages sold in this range</p>
                                        )}
                                    </div>
                                </div>

                                {/* Categories Section */}
                                <div className="space-y-6">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">Items per Kategori</p>
                                    {Object.entries(selectedAuditStaff.categories).length > 0 ? (
                                        Object.entries(selectedAuditStaff.categories).sort().map(([cat, items]: [string, any]) => (
                                            <div key={cat} className="space-y-2">
                                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{cat}</p>
                                                <div className="space-y-1.5 pl-2">
                                                    {Object.entries(items).sort().map(([itemName, qty]: [string, any]) => (
                                                        <div key={itemName} className="flex justify-between items-center text-xs">
                                                            <span className="font-bold text-slate-600 truncate mr-2">{itemName}</span>
                                                            <span className="font-black text-slate-400">{qty}x</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-slate-400 italic font-medium">No items sold in this range</p>
                                    )}
                                </div>
                            </div>

                            <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-between gap-4">
                                <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-200">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Billiard Revenue</p>
                                    <p className="text-sm font-black text-slate-800">{fmt(selectedAuditStaff.billiardTotal)}</p>
                                </div>
                                <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-200">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cafe Revenue</p>
                                    <p className="text-sm font-black text-slate-800">{fmt(selectedAuditStaff.cafeTotal)}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-900">
                                <button onClick={() => setSelectedAuditStaff(null)} className="w-full py-4 text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-slate-800 transition-colors">
                                    Close Activity Log
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
