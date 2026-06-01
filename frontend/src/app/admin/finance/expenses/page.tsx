'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/fetcher';
import {
    Plus, Receipt, Wallet, User, Loader2, SearchX, X, Trash2, Pencil,
    TrendingUp, TrendingDown, DollarSign, Filter, Calendar, ArrowUpRight, ArrowDownRight, BarChart3,
    Search, CreditCard, PieChart, Activity, Settings, Users, Zap, Package, Megaphone, MoreHorizontal, Lock
} from 'lucide-react';
import InputField from '@/components/ui/InputField';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useMqtt } from '@/context/MqttContext';
import { socket } from '@/lib/socket';
import { useAlert } from '@/components/ui/AlertProvider';
import { formatRupiah as fmt } from '@/utils/formatUtils';

const fmtK = (n: number) => `Rp ${(Math.round(n) / 1000).toFixed(1)}rb`;

const CATEGORY_MAP: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
    maintenance: { label: 'Maintenance', icon: Settings, color: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-100' },
    staff: { label: 'Staff / Gaji', icon: Users, color: 'text-violet-600', bg: 'bg-violet-50/50', border: 'border-violet-100' },
    utility: { label: 'Utility', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-100' },
    inventory_stock: { label: 'Stock Material', icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100' },
    marketing: { label: 'Marketing', icon: Megaphone, color: 'text-rose-600', bg: 'bg-rose-50/50', border: 'border-rose-100' },
    other: { label: 'Lainnya', icon: MoreHorizontal, color: 'text-slate-600', bg: 'bg-slate-50/50', border: 'border-slate-100' },
};

export default function ExpensePage() {
    const { hasPermission, user, activeShift } = useAuth();
    const { subscribe } = useMqtt();
    const { showAlert, showConfirm } = useAlert();

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        amount: '', category: 'other', description: '', recordedBy: '', recordedByUserId: null as number | null,
    });

    // Filters
    const [filterCategory, setFilterCategory] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useBodyScrollLock(showModal);

    // ── Data Fetching with SWR ──────────────────────────────────────────
    const expensesKey = `/finance/expenses?${new URLSearchParams({
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(filterCategory !== 'all' && { category: filterCategory }),
    }).toString()}`;

    const { data: expenses = [], isLoading: loadingExpenses } = useSWR<any[]>(
        hasPermission('FIN_EXPENSES_VIEW') ? expensesKey : null,
        fetcher
    );

    const summaryKey = `/finance/expenses/summary?${new URLSearchParams({
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
    }).toString()}`;

    const { data: summary, isLoading: loadingSummary } = useSWR<any>(
        hasPermission('FIN_EXPENSES_VIEW') ? summaryKey : null,
        fetcher
    );

    // Sync with MQTT & Socket
    useEffect(() => {
        const handleUpdate = () => {
            mutate(expensesKey);
            mutate(summaryKey);
        };
        const mqttUnsub = subscribe('billiard/finance/update', handleUpdate);
        socket.on('financeUpdate', handleUpdate);
        return () => {
            if (mqttUnsub) mqttUnsub();
            socket.off('financeUpdate', handleUpdate);
        };
    }, [subscribe, expensesKey, summaryKey]);

    // Client-side filtering for Search
    const filteredExpenses = useMemo(() => {
        if (!searchQuery) return expenses;
        const q = searchQuery.toLowerCase();
        return expenses.filter(e => 
            e.description.toLowerCase().includes(q) || 
            e.recordedBy.toLowerCase().includes(q)
        );
    }, [expenses, searchQuery]);

    // ── Actions ────────────────────────────────────────────────────────
    const openAddModal = () => {
        setEditingId(null);
        setFormData({ amount: '', category: 'other', description: '', recordedBy: user?.name || '', recordedByUserId: user?.id || null });
        setShowModal(true);
    };

    const openEditModal = (exp: any) => {
        setEditingId(exp.id);
        setFormData({
            amount: String(exp.amount),
            category: exp.category,
            description: exp.description,
            recordedBy: exp.recordedBy,
            recordedByUserId: exp.recordedByUserId || null,
        });
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { 
                ...formData, 
                amount: Number(formData.amount),
                shiftId: activeShift?.id,
                recordedByUserId: user?.id
            };
            if (editingId) {
                await axios.patch(`/finance/expenses/${editingId}`, payload);
                showAlert('Success', 'Expense updated successfully.', { variant: 'success' });
            } else {
                await axios.post(`/finance/expenses`, payload);
                showAlert('Success', 'Expense recorded successfully.', { variant: 'success' });
            }
            setShowModal(false);
            mutate(expensesKey);
            mutate(summaryKey);
        } catch (err) {
            showAlert('Error', 'Failed to save expense.', { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (exp: any) => {
        const confirmed = await showConfirm(
            'Delete Expense',
            `Are you sure you want to delete "${exp.description}" (${fmt(exp.amount)})?`,
        );
        if (!confirmed) return;
        try {
            await axios.delete(`/finance/expenses/${exp.id}`);
            showAlert('Success', 'Expense deleted and cashflow reversed.', { variant: 'success' });
            mutate(expensesKey);
            mutate(summaryKey);
        } catch (err) {
            showAlert('Error', 'Failed to delete expense.', { variant: 'error' });
        }
    };

    if (!hasPermission('FIN_EXPENSES_VIEW')) {
        return (
            <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mb-6 border border-rose-100 shadow-xl shadow-rose-100/50">
                    <Lock className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Enterprise Access Restricted</h2>
                <p className="text-slate-400 max-w-sm text-sm font-medium">You do not have the required permissions to view enterprise operational expenses.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFDFD] pb-20">
            <div className="p-4 lg:p-10 max-w-[1400px] mx-auto space-y-10">

                {/* ── Header Strategy ────────────────────────────────────── */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-200">
                                <Receipt className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter">Operational Expenses</h1>
                        </div>
                        <p className="text-slate-400 text-sm font-medium ml-1 flex items-center gap-2">
                             Analysis and detailed tracking of business expenditures
                             <span className="w-1 h-1 bg-slate-200 rounded-full" />
                             Standard Enterprise Protocol
                        </p>
                    </div>
                    {hasPermission('FIN_EXPENSES_ADD') && (
                        <button
                            onClick={openAddModal}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2.5 transition-all active:scale-95 text-[13px] uppercase tracking-widest shadow-xl shadow-indigo-200/50"
                        >
                            <Plus className="w-4.5 h-4.5" strokeWidth={3} /> Record New Expense
                        </button>
                    )}
                </div>

                {/* ── Financial Insights Dashboard ───────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Period Revenue */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-slate-100/50 transition-all group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
                                Revenue
                            </div>
                        </div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-0.5">Gross Period Revenue</p>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                            {loadingSummary ? '...' : fmt(summary?.totalRevenue || 0)}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-300 mt-2 flex items-center gap-1.5 capitalize">
                             <Activity className="w-3 h-3" /> based on {summary?.expenseCount || 0} expenditure records
                        </p>
                    </div>

                    {/* Total Expenditure */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-slate-100/50 transition-all group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <TrendingDown className="w-6 h-6 text-rose-500" />
                            </div>
                            <div className="text-[10px] font-black text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
                                Burn Rate
                            </div>
                        </div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-0.5">Operational Expenditure</p>
                        <h3 className="text-3xl font-black text-rose-600 tracking-tighter">
                            {loadingSummary ? '...' : fmt(summary?.totalExpenses || 0)}
                        </h3>
                        <div className="mt-3 flex items-center gap-2">
                             <div className="flex-1 h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                 <div 
                                    className="h-full bg-rose-400 rounded-full transition-all duration-1000" 
                                    style={{ width: `${summary?.totalRevenue > 0 ? (summary.totalExpenses / summary.totalRevenue) * 100 : 0}%` }} 
                                 />
                             </div>
                             <span className="text-[11px] font-black text-rose-500 w-10">
                                {summary?.totalRevenue > 0 ? `${((summary.totalExpenses / summary.totalRevenue) * 100).toFixed(0)}%` : '0%'}
                             </span>
                        </div>
                    </div>

                    {/* Net Liquidity */}
                    <div className={`rounded-[2.5rem] border p-8 shadow-sm transition-all group ${summary?.netProfit >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100'}`}>
                        <div className="flex justify-between items-start mb-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${summary?.netProfit >= 0 ? 'bg-indigo-100' : 'bg-rose-100'}`}>
                                <DollarSign className={`w-6 h-6 ${summary?.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`} />
                            </div>
                            <div className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${summary?.netProfit >= 0 ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white'}`}>
                                Net Profit
                            </div>
                        </div>
                        <p className={`text-[11px] font-black uppercase tracking-widest mb-1.5 ml-0.5 ${summary?.netProfit >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>Available Liquidity</p>
                        <h3 className={`text-3xl font-black tracking-tighter ${summary?.netProfit >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                            {loadingSummary ? '...' : fmt(summary?.netProfit || 0)}
                        </h3>
                        <p className={`text-[10px] font-bold mt-2 flex items-center gap-1.5 uppercase tracking-tighter ${summary?.netProfit >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                             Standard Business Tax Foundation Applied
                        </p>
                    </div>
                </div>

                {/* ── Category Intelligence ──────────────────────────────── */}
                {summary?.byCategory && Object.keys(summary.byCategory).length > 0 && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                    <PieChart className="w-5 h-5 font-black" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Sector Allocation</h3>
                                    <p className="text-[10px] text-slate-400 font-bold">Expenditure weight by business category</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                            {Object.entries(summary.byCategory).map(([cat, amount]) => {
                                const meta = CATEGORY_MAP[cat] || CATEGORY_MAP.other;
                                const weight = summary.totalExpenses > 0 ? ((Number(amount) / summary.totalExpenses) * 100).toFixed(0) : 0;
                                return (
                                    <div key={cat} className={`${meta.bg} ${meta.border} border rounded-[1.5rem] p-5 hover:scale-[1.02] transition-transform`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className={`p-2 rounded-lg bg-white/60 ${meta.color}`}>
                                                <meta.icon className="w-3.5 h-3.5" />
                                            </div>
                                            <span className={`text-[11px] font-black ${meta.color}`}>{weight}%</span>
                                        </div>
                                        <p className="text-[9px] font-black uppercase text-slate-400/80 mb-1">{meta.label}</p>
                                        <p className="text-xl font-black text-slate-900 tracking-tight">{fmtK(Number(amount))}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Enterprise Filter & Search Suite ────────────────────── */}
                <div className="bg-white rounded-[2rem] border border-slate-100 p-6 flex flex-col xl:flex-row gap-6 items-center">
                    <div className="w-full xl:flex-1 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Universal Search</label>
                        <div className="relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by description, staff name, or reference..."
                                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all placeholder:text-slate-300 shadow-inner"
                            />
                        </div>
                    </div>
                    <div className="w-full xl:w-auto grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Period</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-600 outline-none transition-all shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Period</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-600 outline-none transition-all shadow-inner"
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category Filter</label>
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-600 outline-none transition-all shadow-inner ring-0"
                            >
                                <option value="all">All Sectors</option>
                                {Object.entries(CATEGORY_MAP).map(([val, { label }]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* ── Master List Ledger ─────────────────────────────────── */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-10 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                {filteredExpenses.length} Records Detected
                                {(startDate || endDate || filterCategory !== 'all') && <span className="text-slate-300 ml-2 italic">— filtered analysis</span>}
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction Date</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Business Sector</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational Description</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Authorized By</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Debit Amount</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loadingExpenses ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="px-10 py-8"><div className="h-6 bg-slate-50 rounded-xl" /></td>
                                        </tr>
                                    ))
                                ) : filteredExpenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-24 text-center">
                                            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-200">
                                                <SearchX className="w-10 h-10" />
                                            </div>
                                            <p className="text-xl font-black text-slate-900 tracking-tight">No Matching Records</p>
                                            <p className="text-slate-400 text-sm font-medium mt-2">Try adjusting your filters or search keywords.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredExpenses.map((exp) => {
                                        const meta = CATEGORY_MAP[exp.category] || CATEGORY_MAP.other;
                                        return (
                                            <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                                        <span className="text-sm font-black text-slate-700">
                                                            {new Date(exp.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`inline-flex items-center gap-1.5 ${meta.bg} ${meta.color} text-[10px] font-black px-3 py-1.5 rounded-xl border ${meta.border}`}>
                                                        <meta.icon className="w-3 h-3" />
                                                        {meta.label}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="text-sm font-black text-slate-900 max-w-sm truncate group-hover:text-indigo-600 transition-colors">
                                                        {exp.description}
                                                    </p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                                            <User className="w-3 h-3 text-slate-400" />
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-400 tracking-tight">{exp.recordedBy}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className="text-base font-black text-rose-500 tracking-tighter">
                                                        {fmt(Number(exp.amount))}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform scale-95 group-hover:scale-100">
                                                        <button
                                                            onClick={() => openEditModal(exp)}
                                                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                            title="Authorized Edit"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(exp)}
                                                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                            title="Authorized Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ── Professional Expense Entry Modal ───────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white w-full max-w-xl rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <header className="p-6 md:p-10 bg-slate-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                                    <CreditCard className="w-5 h-5 md:w-7 md:h-7 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl md:text-2xl font-black tracking-tight">{editingId ? 'Edit Authorized Expense' : 'Record New Expenditure'}</h2>
                                    <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mt-1 font-black">Fiscal Year 2026 Protocol</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white/10 rounded-2xl text-white hover:bg-rose-500 transition-all group">
                                <X className="w-5 h-5 group-hover:scale-125 transition-transform" />
                            </button>
                        </header>
                        <form onSubmit={handleSave} className="p-6 md:p-10 space-y-6 md:space-y-8 bg-white">
                            <InputField
                                label="Disbursement Amount (Rp)"
                                type="number"
                                value={formData.amount}
                                onChange={(val) => setFormData({ ...formData, amount: val })}
                                required
                                placeholder="0"
                                className="!text-2xl md:!text-3xl !font-black !py-6 md:!py-8 !bg-slate-50 !border-slate-50 focus:!bg-white focus:!border-indigo-600 !rounded-[1.5rem] shadow-inner"
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Sector</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-[1.25rem] px-5 py-4 font-bold text-slate-700 focus:bg-white focus:border-indigo-600 outline-none transition-all shadow-inner"
                                    >
                                        <option value="maintenance">Maintenance</option>
                                        <option value="staff">Staff / Payroll</option>
                                        <option value="utility">Utility / Energy</option>
                                        <option value="inventory_stock">Stock Procurement</option>
                                        <option value="marketing">Brand Marketing</option>
                                        <option value="other">General Other</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <InputField
                                        label="Responsible Agent"
                                        value={formData.recordedBy}
                                        onChange={(val) => setFormData({ ...formData, recordedBy: val })}
                                        required
                                        placeholder="Officer Name..."
                                        className="!bg-slate-50 !border-slate-50 focus:!bg-white focus:!border-indigo-600 !rounded-[1.25rem] !py-4 shadow-inner"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <InputField
                                    label="Authorized Description"
                                    type="textarea"
                                    value={formData.description}
                                    onChange={(val) => setFormData({ ...formData, description: val })}
                                    required
                                    placeholder="Provide a detailed justification for this disbursement..."
                                    className="!bg-slate-50 !border-slate-50 focus:!bg-white focus:!border-indigo-600 !rounded-[1.25rem] shadow-inner !min-h-[120px]"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black py-6 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 text-[13px] uppercase tracking-[0.2em] shadow-xl shadow-slate-200"
                            >
                                {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                {saving ? 'Authorizing Disbursement...' : editingId ? 'Update Official Record' : 'Commit Disbursement'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
