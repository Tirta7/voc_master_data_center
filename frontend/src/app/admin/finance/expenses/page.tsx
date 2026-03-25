'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Plus, Receipt, Wallet, User, Loader2, SearchX, X, Trash2, Pencil,
    TrendingUp, TrendingDown, DollarSign, Filter, Calendar, ArrowUpRight, ArrowDownRight, BarChart3
} from 'lucide-react';
import InputField from '@/components/ui/InputField';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useMqtt } from '@/context/MqttContext';
import { socket } from '@/lib/socket';
import { useAlert } from '@/components/ui/AlertProvider';

// import { API_URL } from '@/utils/urlUtils';

const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtK = (n: number) => fmt(n);

const CATEGORY_MAP: Record<string, { label: string; color: string; bg: string }> = {
    maintenance: { label: 'Maintenance', color: 'text-blue-600', bg: 'bg-blue-50' },
    staff: { label: 'Staff / Gaji', color: 'text-violet-600', bg: 'bg-violet-50' },
    utility: { label: 'Listrik / Air', color: 'text-amber-600', bg: 'bg-amber-50' },
    inventory_stock: { label: 'Stok Bahan', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    marketing: { label: 'Marketing', color: 'text-rose-600', bg: 'bg-rose-50' },
    other: { label: 'Lainnya', color: 'text-stone-600', bg: 'bg-stone-100' },
};

export default function ExpensePage() {
    const { hasPermission, user } = useAuth();
    const { subscribe } = useMqtt();
    const { showAlert, showConfirm } = useAlert();

    const [expenses, setExpenses] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        amount: '', category: 'other', description: '', recordedBy: '',
    });

    // Filters
    const [filterCategory, setFilterCategory] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useBodyScrollLock(showModal);

    useEffect(() => {
        fetchAll();
    }, [filterCategory, startDate, endDate]);

    useEffect(() => {
        const mqttUnsub = subscribe('billiard/finance/update', () => fetchAll());
        const onFinanceUpdate = () => fetchAll();
        socket.on('financeUpdate', onFinanceUpdate);
        return () => {
            if (mqttUnsub) mqttUnsub();
            socket.off('financeUpdate', onFinanceUpdate);
        };
    }, [subscribe]);

    const fetchAll = async () => {
        try {
            const params: any = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            if (filterCategory !== 'all') params.category = filterCategory;

            const [expRes, sumRes] = await Promise.all([
                axios.get(`/finance/expenses`, { params }),
                axios.get(`/finance/expenses/summary`, { params: { startDate: startDate || undefined, endDate: endDate || undefined } }),
            ]);
            setExpenses(expRes.data);
            setSummary(sumRes.data);
        } catch (err) {
            console.error('Failed to load expenses', err);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingId(null);
        setFormData({ amount: '', category: 'other', description: '', recordedBy: user?.name || '' });
        setShowModal(true);
    };

    const openEditModal = (exp: any) => {
        setEditingId(exp.id);
        setFormData({
            amount: String(exp.amount),
            category: exp.category,
            description: exp.description,
            recordedBy: exp.recordedBy,
        });
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...formData, amount: Number(formData.amount) };
            if (editingId) {
                await axios.patch(`/finance/expenses/${editingId}`, payload);
                showAlert('Berhasil', 'Pengeluaran berhasil diperbarui.', { variant: 'success' });
            } else {
                await axios.post(`/finance/expenses`, payload);
                showAlert('Berhasil', 'Pengeluaran berhasil dicatat.', { variant: 'success' });
            }
            setShowModal(false);
            fetchAll();
        } catch (err) {
            showAlert('Gagal', 'Gagal menyimpan pengeluaran.', { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (exp: any) => {
        const confirmed = await showConfirm(
            'Hapus Pengeluaran',
            `Yakin menghapus "${exp.description}" (${fmt(exp.amount)})?`,
        );
        if (!confirmed) return;
        try {
            await axios.delete(`/finance/expenses/${exp.id}`);
            showAlert('Berhasil', 'Pengeluaran dihapus & cashflow di-reverse.', { variant: 'success' });
            fetchAll();
        } catch (err) {
            showAlert('Gagal', 'Gagal menghapus pengeluaran.', { variant: 'error' });
        }
    };


    const totalFiltered = expenses.reduce((s, e) => s + Number(e.amount), 0);

    if (!hasPermission('FIN_EXPENSES_VIEW')) {
        return (
            <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-rose-50 text-rose-400 rounded-2xl flex items-center justify-center mb-5 border border-rose-100">
                    <X className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-stone-800 mb-1">Akses Terbatas</h2>
                <p className="text-stone-400 max-w-sm text-sm">Anda tidak memiliki izin untuk melihat riwayat pengeluaran.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAF9]">
            <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center">
                                <Receipt className="w-4.5 h-4.5 text-stone-500" />
                            </div>
                            <h1 className="text-2xl font-bold text-stone-800 tracking-tight">Pengeluaran Operasional</h1>
                        </div>
                        <p className="text-stone-400 text-sm ml-12">Catat, pantau, dan analisa biaya operasional untuk perhitungan laba bersih.</p>
                    </div>
                    {hasPermission('FIN_EXPENSES_ADD') && (
                        <button
                            onClick={openAddModal}
                            className="bg-stone-800 hover:bg-stone-900 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all active:scale-95 text-sm shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> Catat Pengeluaran
                        </button>
                    )}
                </div>

                {/* ── Summary Cards ──────────────────────────────────────── */}
                {summary && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Revenue */}
                        <div className="bg-white rounded-2xl border border-stone-100 p-5 flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">Omzet Periode</p>
                                <p className="text-2xl font-bold text-stone-800 tracking-tight">{fmtK(summary.totalRevenue)}</p>
                                <p className="text-[10px] text-stone-300 mt-1">{summary.expenseCount} catatan pengeluaran</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                            </div>
                        </div>
                        {/* Expenses */}
                        <div className="bg-white rounded-2xl border border-stone-100 p-5 flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">Total Pengeluaran</p>
                                <p className="text-2xl font-bold text-rose-500 tracking-tight">{fmtK(summary.totalExpenses)}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <ArrowDownRight className="w-3 h-3 text-rose-400" />
                                    <span className="text-[10px] text-rose-400">
                                        {summary.totalRevenue > 0 ? `${((summary.totalExpenses / summary.totalRevenue) * 100).toFixed(1)}% dari omzet` : '—'}
                                    </span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                                <TrendingDown className="w-5 h-5 text-rose-400" />
                            </div>
                        </div>
                        {/* Net Profit */}
                        <div className={`rounded-2xl border p-5 flex items-start justify-between ${summary.netProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                            <div>
                                <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">Laba Bersih (Net Profit)</p>
                                <p className={`text-2xl font-bold tracking-tight ${summary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                    {fmtK(summary.netProfit)}
                                </p>
                                <div className="flex items-center gap-1 mt-1">
                                    {summary.netProfit >= 0
                                        ? <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                                        : <ArrowDownRight className="w-3 h-3 text-rose-500" />
                                    }
                                    <span className={`text-[10px] ${summary.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        Basis perhitungan pajak
                                    </span>
                                </div>
                            </div>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${summary.netProfit >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                                <DollarSign className={`w-5 h-5 ${summary.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Category Breakdown ─────────────────────────────────── */}
                {summary && summary.byCategory && Object.keys(summary.byCategory).length > 0 && (
                    <div className="bg-white rounded-2xl border border-stone-100 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-4 h-4 text-stone-400" />
                            <h3 className="text-sm font-semibold text-stone-700">Breakdown per Kategori</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            {Object.entries(summary.byCategory).map(([cat, amount]) => {
                                const meta = CATEGORY_MAP[cat] || CATEGORY_MAP.other;
                                const pct = summary.totalExpenses > 0 ? ((Number(amount) / summary.totalExpenses) * 100).toFixed(0) : 0;
                                return (
                                    <div key={cat} className={`${meta.bg} rounded-xl p-3.5 border border-transparent`}>
                                        <p className={`text-[9px] font-semibold uppercase tracking-wider ${meta.color} mb-1`}>{meta.label}</p>
                                        <p className="text-base font-bold text-stone-800">{fmtK(Number(amount))}</p>
                                        <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                                            <div className="h-full bg-stone-800/20 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                        <p className="text-[9px] text-stone-400 mt-1">{pct}% dari total</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Filters ───────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-stone-100 p-4 flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex items-center gap-2 text-stone-400 shrink-0">
                        <Filter className="w-4 h-4" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Filter</span>
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1 block">Dari Tanggal</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2.5 text-sm text-stone-700 focus:border-stone-300 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1 block">Sampai Tanggal</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2.5 text-sm text-stone-700 focus:border-stone-300 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1 block">Kategori</label>
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2.5 text-sm text-stone-700 focus:border-stone-300 outline-none transition-colors"
                            >
                                <option value="all">Semua Kategori</option>
                                {Object.entries(CATEGORY_MAP).map(([val, { label }]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {(startDate || endDate || filterCategory !== 'all') && (
                        <button
                            onClick={() => { setStartDate(''); setEndDate(''); setFilterCategory('all'); }}
                            className="shrink-0 text-xs text-stone-400 hover:text-stone-600 underline transition-colors"
                        >
                            Reset
                        </button>
                    )}
                </div>

                {/* ── Expense List ───────────────────────────────────────── */}
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-stone-400 text-xs">Memuat data...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
                        {/* Header row */}
                        <div className="px-5 py-3 border-b border-stone-50 flex items-center justify-between bg-stone-50/50">
                            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                                {expenses.length} Catatan
                                {totalFiltered > 0 && ` · Total: ${fmtK(totalFiltered)}`}
                            </span>
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-stone-50/30">
                                    <tr>
                                        <th className="px-5 py-4 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Tanggal</th>
                                        <th className="px-5 py-4 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Kategori</th>
                                        <th className="px-5 py-4 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Keterangan</th>
                                        <th className="px-5 py-4 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">PJ Staff</th>
                                        <th className="px-5 py-4 text-[10px] font-semibold text-stone-400 uppercase tracking-wider text-right">Jumlah</th>
                                        <th className="px-5 py-4 text-[10px] font-semibold text-stone-400 uppercase tracking-wider text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-50">
                                    {expenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-16 text-center">
                                                <SearchX className="w-8 h-8 text-stone-200 mx-auto mb-2" />
                                                <p className="text-stone-400 text-sm font-medium">Belum ada data pengeluaran</p>
                                                <p className="text-stone-300 text-xs mt-1">Klik "Catat Pengeluaran" untuk memulai</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        expenses.map((exp) => {
                                            const meta = CATEGORY_MAP[exp.category] || CATEGORY_MAP.other;
                                            return (
                                                <tr key={exp.id} className="hover:bg-stone-50/50 transition-colors group">
                                                    <td className="px-5 py-4 text-sm text-stone-600">
                                                        {new Date(exp.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={`${meta.bg} ${meta.color} text-[9px] font-semibold px-2.5 py-1 rounded-lg`}>
                                                            {meta.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-sm font-medium text-stone-800 max-w-xs truncate">{exp.description}</td>
                                                    <td className="px-5 py-4 text-sm text-stone-400">{exp.recordedBy}</td>
                                                    <td className="px-5 py-4 text-right text-sm font-semibold text-rose-500">
                                                        {fmt(Number(exp.amount))}
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => openEditModal(exp)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Pencil className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(exp)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-600 transition-colors"
                                                                title="Hapus"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
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

                        {/* Mobile Card View */}
                        <div className="lg:hidden p-4 space-y-3">
                            {expenses.length === 0 ? (
                                <div className="py-16 text-center">
                                    <SearchX className="w-8 h-8 text-stone-200 mx-auto mb-2" />
                                    <p className="text-stone-400 text-sm">Belum ada data</p>
                                </div>
                            ) : (
                                expenses.map((exp) => {
                                    const meta = CATEGORY_MAP[exp.category] || CATEGORY_MAP.other;
                                    return (
                                        <div key={exp.id} className="bg-white border border-stone-100 rounded-xl p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-9 h-9 ${meta.bg} rounded-xl flex items-center justify-center`}>
                                                        <Receipt className={`w-4 h-4 ${meta.color}`} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-stone-400">
                                                            {new Date(exp.date).toLocaleDateString('id-ID')}
                                                        </p>
                                                        <span className={`text-[9px] font-semibold ${meta.color}`}>{meta.label}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-sm font-semibold text-rose-500">{fmt(Number(exp.amount))}</p>
                                                    <button onClick={() => openEditModal(exp)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-stone-50 text-stone-400">
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                    <button onClick={() => handleDelete(exp)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-rose-50 text-rose-400">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-sm font-medium text-stone-800 mb-1">{exp.description}</p>
                                            <p className="text-[10px] text-stone-400 flex items-center gap-1">
                                                <User className="w-3 h-3" /> {exp.recordedBy}
                                            </p>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <header className="p-6 bg-stone-800 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold tracking-tight">{editingId ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru'}</h2>
                                <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Expense Entry</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-xl text-white hover:bg-white/20 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </header>
                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            <InputField
                                label="Besar Pengeluaran (Rp)"
                                type="number"
                                suffix={<Wallet className="w-4 h-4 text-stone-300" />}
                                value={formData.amount}
                                onChange={(val) => setFormData({ ...formData, amount: val })}
                                required
                                placeholder="0"
                                className="!text-2xl !font-bold !py-4"
                            />

                            <div>
                                <label className="block text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1.5 ml-0.5">Kategori Biaya</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-stone-50 border border-stone-100 rounded-xl px-4 py-3.5 font-medium text-stone-700 focus:border-stone-300 outline-none transition-colors"
                                >
                                    <option value="maintenance">Maintenance (Perbaikan)</option>
                                    <option value="staff">Staff / Gaji</option>
                                    <option value="utility">Listrik / Air / Internet</option>
                                    <option value="inventory_stock">Stok (Food & Drink)</option>
                                    <option value="marketing">Promo / Marketing</option>
                                    <option value="other">Lain-lain</option>
                                </select>
                            </div>

                            <InputField
                                label="Nama Staff Penanggung Jawab"
                                suffix={<User className="w-4 h-4 text-stone-300" />}
                                value={formData.recordedBy}
                                onChange={(val) => setFormData({ ...formData, recordedBy: val })}
                                required
                                placeholder="Andi..."
                            />

                            <InputField
                                label="Detail Keterangan"
                                type="textarea"
                                value={formData.description}
                                onChange={(val) => setFormData({ ...formData, description: val })}
                                required
                                placeholder="Sebutkan alasan pengeluaran secara detail..."
                            />

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-stone-800 hover:bg-stone-900 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
                            >
                                {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Pengeluaran'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
