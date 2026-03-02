'use client';

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { History, Printer, X, Download, BarChart3, PieChart, TrendingUp, AlertTriangle, Clock, Package, DollarSign } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtK = (n: number) => n >= 1_000_000 ? `Rp ${(n / 1_000_000).toFixed(1)} Juta` : n >= 1_000 ? `Rp ${(n / 1_000).toFixed(0)}K` : fmt(n);
const pct = (a: number, b: number) => b === 0 ? '0%' : `${((a / b) * 100).toFixed(1)}%`;
const fDate = (d: Date) => d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fTime = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

export default function OwnerReportPage() {
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState(false);
    const printed = useRef(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const start = params.get('start') || new Date().toISOString();
        const end = params.get('end') || new Date().toISOString();

        Promise.all([
            axios.get(`${API_URL}/reports/summary/daily`),
            axios.get(`${API_URL}/reports/inventory/health`),
            axios.get(`${API_URL}/inventory/ingredients`),
            axios.get(`${API_URL}/finance/profit?start=${start}&end=${end}`),
            axios.get(`${API_URL}/reports/items-performance`),
            axios.get(`${API_URL}/finance/expenses`),
            axios.get(`${API_URL}/reports/detailed?start=${start}&end=${end}`),
        ]).then(([s, cs, allS, fin, perf, exp, det]) => {
            setData({
                summary: s.data, criticalStock: cs.data, allStock: allS.data,
                finance: fin.data, itemsPerf: perf.data, expenses: exp.data || [],
                detailed: det.data
            });
        }).catch(() => setError(true));
    }, []);

    useEffect(() => {
        if (data && !printed.current) {
            printed.current = true;
            // Removed auto-print for better UX on mobile, user can click Cetak
        }
    }, [data]);

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-slate-50">
            <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
            <p className="text-xl font-black text-slate-900 uppercase">Gagal memuat data laporan</p>
            <p className="text-slate-500 mt-2">Pastikan koneksi internet stabil atau hubungi teknisi.</p>
        </div>
    );
    if (!data) return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-slate-50">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest animate-pulse">Menyiapkan laporan Bisnis...</p>
        </div>
    );


    const { summary, criticalStock, allStock, finance, itemsPerf, expenses, detailed } = data;
    const totalRevenue = Number(detailed?.summary?.totalOmzet || summary?.totalOmzet || 0);
    const activeBilliard = Number(detailed?.summary?.totalBilliard ?? detailed?.summary?.billiardOmzet ?? summary?.billiardOmzet ?? 0);
    const activeCafe = Number(detailed?.summary?.totalCafe ?? detailed?.summary?.cafeOmzet ?? summary?.cafeOmzet ?? 0);

    const totalPaid = Object.values(detailed?.paymentMethods || summary?.paymentMethods || {} as Record<string, number>).reduce((s: number, v) => s + Number(v), 0);
    const expTotal = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const netProfit = finance?.netProfit || (totalRevenue - expTotal);

    // Tax & Discount summaries
    const totalVat = Number(detailed?.summary?.totalVat || 0);
    const totalSc = Number(detailed?.summary?.totalServiceCharge || detailed?.summary?.totalService || 0);
    const totalDiscount = Number(detailed?.summary?.totalDiscount || 0);
    const topUpRevenue = Number(detailed?.summary?.topUpRevenue || 0);
    const unpaidAmount = Number(summary?.unpaidAmount || 0);
    const txCount = Number(summary?.transactionCount || detailed?.summary?.transactionCount || 0);

    const printDate = new Date();

    const expByCat: Record<string, number> = {};
    expenses.forEach((e: any) => {
        expByCat[e.category || 'Lain-lain'] = (expByCat[e.category || 'Lain-lain'] || 0) + Number(e.amount || 0);
    });

    const maxQty = Math.max(...((itemsPerf?.all || []) as any[]).map((i: any) => i.totalQty), 1);
    const maxHourly = Math.max(...(detailed?.hourly || []).map((h: any) => h.total), 1);

    return (
        <div className="min-h-screen bg-slate-100 font-sans">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
                
                body { font-family: 'Plus Jakarta Sans', sans-serif; }

                @media print {
                    .no-print { display: none !important; }
                    .page-container { padding: 0 !important; background: white !important; }
                    .report-paper { 
                        width: 210mm !important; 
                        margin: 0 !important; 
                        box-shadow: none !important; 
                        border: none !important;
                        padding: 10mm !important;
                    }
                    @page { size: A4 portrait; margin: 0; }
                    .page-break { page-break-before: always; }
                    .keep-together { break-inside: avoid; }
                }
            `}</style>

            {/* Sticky Action Bar */}
            <div className="no-print sticky top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 lg:px-10 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.close()} className="p-2 hover:bg-slate-100 rounded-xl lg:hidden text-slate-500">
                        <X className="w-6 h-6" />
                    </button>
                    <div className="hidden lg:flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Owner Report</p>
                            <p className="text-sm font-black text-slate-900 tracking-tight">{fDate(printDate)}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => window.print()} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200">
                        <Printer className="w-4 h-4" />
                        <span className="hidden sm:inline">Cetak PDF</span>
                        <span className="sm:hidden text-[10px]">Cetak</span>
                    </button>
                    <button onClick={() => window.close()} className="hidden lg:flex p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Document Container */}
            <div className="page-container flex justify-center p-4 lg:p-12">
                <div className="report-paper bg-white w-full max-w-[210mm] shadow-2xl shadow-slate-300/50 rounded-none lg:rounded-[2.5rem] overflow-hidden border border-slate-100">

                    {/* Section 1: Overview & Finance */}
                    <div className="bg-slate-900 p-8 lg:p-12 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
                            <TrendingUp className="w-64 h-64" />
                        </div>
                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="px-3 py-1 bg-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Confidential</span>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Master Analytics</span>
                                </div>
                                <h1 className="text-3xl lg:text-5xl font-black tracking-tighter leading-none mb-1">Business Overview</h1>
                                <p className="text-slate-400 text-xs font-bold">{fDate(printDate)} · {fTime(printDate)}</p>
                            </div>
                            <div className="text-left sm:text-right">
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Net Profit</p>
                                    <p className={`text-2xl lg:text-3xl font-black leading-none ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(netProfit)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 lg:p-10 space-y-10">
                        {/* 📊 Overview Section */}
                        <div className="keep-together">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><BarChart3 className="w-5 h-5" /></span>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Performa Keuangan</h2>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                {[
                                    { label: 'Omzet (Revenue)', val: fmt(totalRevenue), sub: `${summary?.transactionCount} Transaksi`, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
                                    { label: 'Laba Bersih', val: fmt(netProfit), sub: `Out: ${fmtK(expTotal)}`, color: netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600', bg: netProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100' },
                                    { label: 'Piutang', val: fmt(Number(summary?.unpaidAmount || 0)), sub: 'Unpaid / Debt', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' },
                                    { label: 'Stok Kritis', val: `${criticalStock.length} Item`, sub: 'Perlu Re-stock', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' }
                                ].map((kpi, idx) => (
                                    <div key={idx} className={`p-4 rounded-3xl border ${kpi.bg}`}>
                                        <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${kpi.color}`}>{kpi.label}</p>
                                        <p className="text-lg font-black text-slate-900 tracking-tight leading-none">{kpi.val}</p>
                                        <p className="text-[9px] font-bold text-slate-400 mt-2">{kpi.sub}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Revenue Stream Breakdown</p>
                                    <div className="space-y-4">
                                        {[
                                            { label: 'Meja / Billiard', amt: activeBilliard, color: 'bg-indigo-600' },
                                            { label: 'Café / F&B', amt: activeCafe, color: 'bg-amber-500' },
                                            { label: 'Top-up Member', amt: topUpRevenue, color: 'bg-emerald-500' },
                                        ].map((r, i) => (
                                            <div key={i}>
                                                <div className="flex justify-between items-end mb-1">
                                                    <span className="text-xs font-black text-slate-700">{r.label}</span>
                                                    <span className="text-xs font-black text-slate-900">{fmt(r.amt)} ({pct(r.amt, totalRevenue)})</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-white rounded-full overflow-hidden shadow-inner">
                                                    <div className={`h-full ${r.color}`} style={{ width: pct(r.amt, totalRevenue) }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Metode Pembayaran</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(detailed?.paymentMethods || summary?.paymentMethods || {}).map(([m, v]: [any, any], i) => (
                                            <div key={i} className="flex justify-between bg-white px-3 py-2 rounded-xl border border-slate-100">
                                                <span className="text-[9px] font-black text-slate-400 uppercase">{m}</span>
                                                <span className="text-xs font-black text-slate-900">{fmtK(Number(v))}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 💰 Tax & Deductions Breakdown */}
                        <div className="keep-together">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="p-2 bg-rose-100 rounded-xl text-rose-600"><DollarSign className="w-5 h-5" /></span>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Pajak, Diskon & Audit Trail</h2>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Tax & SC Collected */}
                                <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pajak & Service Charge Terkumpul</p>
                                    </div>
                                    <div className="p-6 space-y-3">
                                        {[
                                            { label: 'Service Charge (SC)', val: totalSc, color: 'text-amber-600', bg: 'bg-amber-50/60' },
                                            { label: 'PPN / VAT', val: totalVat, color: 'text-indigo-600', bg: 'bg-indigo-50/60' },
                                            { label: 'Total Potongan Member', val: totalDiscount, color: 'text-rose-500', bg: 'bg-rose-50/60', isDiscount: true },
                                        ].map((row, i) => (
                                            <div key={i} className={`flex justify-between items-center px-4 py-3 rounded-2xl ${row.bg}`}>
                                                <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{row.label}</span>
                                                <span className={`text-sm font-black ${row.color}`}>{row.isDiscount ? '-' : '+'}{fmt(row.val)}</span>
                                            </div>
                                        ))}
                                        <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-500">Net Tax Collected (SC + PPN)</span>
                                            <span className="text-sm font-black text-slate-900">{fmt(totalSc + totalVat)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Full Audit Waterfall */}
                                <div className="bg-slate-900 text-white rounded-3xl overflow-hidden shadow-md">
                                    <div className="px-6 py-4 border-b border-white/10">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Trail Keuangan</p>
                                    </div>
                                    <div className="p-6 space-y-2">
                                        {[
                                            { label: 'Gross Revenue (Subtotal)', val: totalRevenue + totalDiscount - totalSc - totalVat, color: 'text-white', bold: false },
                                            { label: 'Potongan / Diskon', val: -totalDiscount, color: 'text-rose-400', bold: false },
                                            { label: 'Service Charge (SC)', val: totalSc, color: 'text-amber-400', bold: false },
                                            { label: 'PPN / VAT', val: totalVat, color: 'text-indigo-400', bold: false },
                                        ].map((row, i) => (
                                            <div key={i} className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{row.label}</span>
                                                <span className={`text-xs font-black ${row.color}`}>{row.val < 0 ? `-${fmt(-row.val)}` : fmt(row.val)}</span>
                                            </div>
                                        ))}
                                        <div className="border-t border-white/10 pt-3 mt-1 flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Grand Total (Net Revenue)</span>
                                            <span className="text-lg font-black text-emerald-400">{fmt(totalRevenue)}</span>
                                        </div>
                                        <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Biaya Operasional</span>
                                            <span className="text-xs font-black text-rose-400">-{fmt(expTotal)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Estimasi Laba Bersih</span>
                                            <span className={`text-base font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(netProfit)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 🕒 Hourly Revenue Section */}
                        {detailed?.hourly && (
                            <div className="keep-together page-break pt-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="p-2 bg-amber-100 rounded-xl text-amber-600"><Clock className="w-5 h-5" /></span>
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Hourly Revenue Stream</h2>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <div className="space-y-2">
                                        {detailed.hourly.map((h: any) => (
                                            <div key={h.hour} className="flex items-center gap-4">
                                                <span className="text-[10px] font-black text-slate-400 w-10">{h.hour.toString().padStart(2, '0')}:00</span>
                                                <div className="flex-1 h-3 bg-white rounded-lg overflow-hidden flex shadow-inner">
                                                    <div className="bg-indigo-500 h-full" style={{ width: pct(h.billiard, maxHourly) }} />
                                                    <div className="bg-amber-400 h-full" style={{ width: pct(h.cafe, maxHourly) }} />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-700 w-16 text-right">{h.total > 0 ? fmtK(h.total) : '—'}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-indigo-500 rounded" /> Billiard</div>
                                        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-amber-400 rounded" /> Café</div>
                                        <div>* Skala Relatif Terhadap Omzet Jam Tertinggi</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 🍽️ Menu Performance Table */}
                        <div className="keep-together page-break pt-8">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="p-2 bg-emerald-100 rounded-xl text-emerald-600"><TrendingUp className="w-5 h-5" /></span>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Menu Performance Analytics</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ranking / Menu Item</th>
                                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Sold</th>
                                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Revenue</th>
                                            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Trend %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {(itemsPerf?.topItems || []).slice(0, 12).map((item: any, i: number) => (
                                            <tr key={item.id}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black text-white ${i < 3 ? 'bg-amber-400' : 'bg-slate-400'}`}>{i + 1}</span>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-900">{item.name}</p>
                                                            <p className="text-[8px] font-bold text-slate-400 uppercase">{item.category}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs font-black text-indigo-600 text-right">{item.totalQty}×</td>
                                                <td className="px-4 py-3 text-xs font-bold text-slate-700 text-right">{fmt(item.totalRevenue)}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="inline-block w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500" style={{ width: pct(item.totalQty, maxQty) }} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 📦 Inventori Section */}
                        <div className="keep-together page-break pt-8">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="p-2 bg-rose-100 rounded-xl text-rose-600"><Package className="w-5 h-5" /></span>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Inventori & Stok Logistik</h2>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="border border-slate-100 rounded-3xl overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase">Nama Bahan</th>
                                                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase text-right">Stok</th>
                                                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase text-right">Minimum</th>
                                                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {allStock.map((ing: any) => {
                                                const isCrit = Number(ing.stockQuantity) <= Number(ing.minStockLevel);
                                                const isLow = Number(ing.stockQuantity) <= Number(ing.minStockLevel) * 1.5;
                                                return (
                                                    <tr key={ing.id} className={isCrit ? 'bg-rose-50/30' : ''}>
                                                        <td className="px-4 py-2.5 font-bold text-slate-800">{ing.name}</td>
                                                        <td className={`px-4 py-2.5 text-right font-black ${isCrit ? 'text-rose-600' : 'text-slate-700'}`}>{ing.stockQuantity} {ing.unit}</td>
                                                        <td className="px-4 py-2.5 text-right text-slate-400">{ing.minStockLevel}</td>
                                                        <td className="px-4 py-2.5 text-right">
                                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${isCrit ? 'bg-rose-100 text-rose-600' : isLow ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                                {isCrit ? 'KRITIS' : isLow ? 'LOW' : 'AMAN'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* 💰 Keuangan Section */}
                        <div className="keep-together page-break pt-8">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="p-2 bg-emerald-100 rounded-xl text-emerald-600"><DollarSign className="w-5 h-5" /></span>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Rincian Keuangan & Pengeluaran</h2>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Breakdown Pengeluaran</p>
                                    <div className="space-y-4">
                                        {Object.entries(expByCat).map(([cat, amt], i) => (
                                            <div key={i}>
                                                <div className="flex justify-between items-end mb-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">{cat}</span>
                                                    <span className="text-sm font-black text-rose-400">{fmt(amt)}</span>
                                                </div>
                                                <div className="h-1 w-full bg-white/10 rounded-full">
                                                    <div className="h-full bg-rose-500 rounded-full" style={{ width: pct(amt, expTotal) }} />
                                                </div>
                                            </div>
                                        ))}
                                        <div className="pt-8 border-t border-white/10 mt-6 overflow-hidden">
                                            <div className="flex justify-between items-center bg-white/5 rounded-2xl p-4 border border-white/5">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Expenses</p>
                                                    <p className="text-2xl font-black text-rose-500">{fmt(expTotal)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efficiency</p>
                                                    <p className="text-lg font-black text-white">{pct(totalRevenue - expTotal, totalRevenue)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Audit Summary</p>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-xs font-bold text-slate-500">Gross Sales</span>
                                                <span className="text-xs font-black text-slate-900">{fmt(totalRevenue)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs font-bold text-slate-500">Total Operational Cost</span>
                                                <span className="text-xs font-black text-rose-500">{fmt(expTotal)}</span>
                                            </div>
                                            <div className="h-px bg-slate-100 my-2" />
                                            <div className="flex justify-between">
                                                <span className="text-sm font-black text-slate-900">Net Business Profit</span>
                                                <span className={`text-sm font-black ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(netProfit)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 italic">Legal Note</p>
                                        <p className="text-[10px] text-indigo-900/60 leading-relaxed font-medium">Laporan ini dihasilkan secara otomatis oleh sistem manajemen internal. Data yang tertera bersifat rahasia dan merupakan milik sah perusahaan.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Sign-off */}
                        <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-end gap-10 keep-together">
                            <div className="space-y-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Business Intelligence Report</p>
                                <p className="text-[10px] font-bold text-slate-500">Document ID: report_{new Date().getTime()}</p>
                            </div>
                            <div className="text-center shrink-0">
                                <div className="w-56 h-px bg-slate-900 mb-2" />
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Authorized Signature (Owner)</p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Gradient Bar */}
                    <div className="h-2 bg-gradient-to-r from-indigo-600 via-rose-500 to-amber-500" />
                </div>
            </div>
            <div className="h-20 no-print" />
        </div>
    );
}
