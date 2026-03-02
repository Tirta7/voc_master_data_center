'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Receipt, Wallet, Calendar, User, FileText, Loader2, CheckCircle2, ShieldOff, SearchX } from 'lucide-react';
import InputField from '@/components/ui/InputField';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useMqtt } from '@/context/MqttContext';
import { socket } from '@/lib/socket';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ExpensePage() {
    const { hasPermission } = useAuth();
    const { subscribe } = useMqtt();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        amount: '',
        category: 'other',
        description: '',
        recordedBy: '',
    });

    useBodyScrollLock(showModal);

    useEffect(() => {
        fetchExpenses();
    }, []);

    useEffect(() => {
        // MQTT Channel
        const mqttUnsub = subscribe('billiard/finance/update', () => {
            fetchExpenses();
        });

        // WebSocket Channel
        const onFinanceUpdate = () => fetchExpenses();
        socket.on('financeUpdate', onFinanceUpdate);

        return () => {
            if (mqttUnsub) mqttUnsub();
            socket.off('financeUpdate', onFinanceUpdate);
        };
    }, [subscribe]);

    const fetchExpenses = async () => {
        try {
            const res = await axios.get(`${API_URL}/finance/expenses`);
            setExpenses(res.data);
        } catch (err) {
            console.error('Failed to load expenses', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.post(`${API_URL}/finance/expenses`, {
                ...formData,
                amount: Number(formData.amount),
            });
            setShowModal(false);
            setFormData({ amount: '', category: 'other', description: '', recordedBy: '' });
            fetchExpenses();
        } catch (err) {
            alert('Gagal menyimpan pengeluaran');
        } finally {
            setSaving(false);
        }
    };

    if (!hasPermission('FIN_EXPENSES_VIEW')) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6 border-2 border-rose-100 shadow-xl shadow-rose-100/50">
                    <ShieldOff className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase">Akses Terbatas</h2>
                <p className="text-slate-500 max-w-sm font-medium">Anda tidak memiliki izin untuk melihat riwayat pengeluaran.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/40">
            <div className="p-4 lg:p-10 max-w-7xl mx-auto space-y-8">

                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-rose-700 via-rose-600 to-pink-700 rounded-3xl p-8 lg:p-10 text-white shadow-2xl shadow-rose-200">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12" />
                    <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <Receipt className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Financial Management</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Pengeluaran</h1>
                            <p className="text-white/60 text-sm font-semibold mt-1">Catat dan pantau sirkulasi biaya operasional bisnis Anda</p>
                            <div className="flex flex-wrap gap-3 mt-5">
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                    💸 Total Transaksi: {expenses.length}
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                    💰 Akumulasi: Rp {expenses.reduce((acc, e) => acc + Number(e.amount), 0).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {hasPermission('FIN_EXPENSES_ADD') && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-white text-rose-600 px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl hover:shadow-2xl active:scale-95 text-sm uppercase tracking-widest hover:bg-rose-50"
                            >
                                <Plus className="w-5 h-5" /> Catat Baru
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Sinkronisasi Data...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                        {/* Desktop Table View */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-50">
                                    <tr>
                                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">PJ Staff</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50/50">
                                    {expenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center">
                                                <SearchX className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                                <p className="text-slate-400 font-bold">Belum ada data pengeluaran</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        expenses.map((exp) => (
                                            <tr key={exp.id} className="hover:bg-slate-50/70 transition-all group">
                                                <td className="px-10 py-6 font-bold text-slate-600 text-sm">{new Date(exp.date).toLocaleDateString('id-ID')}</td>
                                                <td className="px-10 py-6">
                                                    <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ring-1 ring-slate-200 group-hover:bg-white transition-all">
                                                        {exp.category}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-6 text-sm font-bold text-slate-900">{exp.description}</td>
                                                <td className="px-10 py-6 text-sm font-medium text-slate-400 uppercase tracking-tight">{exp.recordedBy}</td>
                                                <td className="px-10 py-6 text-right text-base font-black text-rose-500">
                                                    Rp {Number(exp.amount).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile List View */}
                        <div className="lg:hidden p-4 space-y-4">
                            {expenses.length === 0 ? (
                                <div className="py-20 text-center">
                                    <SearchX className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                    <p className="text-slate-400 font-bold">Belum ada data pengeluaran</p>
                                </div>
                            ) : (
                                expenses.map((exp) => (
                                    <div key={exp.id} className="bg-white border-2 border-slate-50 rounded-[1.5rem] p-5 shadow-sm active:scale-[0.98] transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 group">
                                                    <Receipt className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(exp.date).toLocaleDateString('id-ID')}</p>
                                                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tight">{exp.category}</span>
                                                </div>
                                            </div>
                                            <p className="text-base font-black text-rose-500">Rp {Number(exp.amount).toLocaleString()}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-3">
                                            <p className="text-sm font-black text-slate-800 leading-snug">{exp.description}</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                            <User className="w-3 h-3" />
                                            PJ: {exp.recordedBy}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overscroll-contain">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <header className="p-8 bg-gradient-to-r from-rose-600 to-pink-600 text-white flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                            <div className="relative z-10">
                                <h2 className="text-2xl font-black tracking-tight">Catat Baru</h2>
                                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mt-0.5">Financial Log Entry</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-xl text-white hover:bg-white/30 transition-all active:scale-95 relative z-10">
                                <X className="w-5 h-5" />
                            </button>
                        </header>
                        <form onSubmit={handleSave} className="p-8 lg:p-10 space-y-6">
                            <InputField
                                label="Besar Pengeluaran (Rp)"
                                type="number"
                                suffix={<Wallet className="w-4 h-4 text-emerald-400" />}
                                value={formData.amount}
                                onChange={(val) => setFormData({ ...formData, amount: val })}
                                required
                                placeholder="0"
                                className="!text-2xl !font-black !py-5"
                            />

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Kategori Biaya</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
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
                                suffix={<User className="w-4 h-4 text-slate-300" />}
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
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 text-xs uppercase tracking-[0.2em]"
                            >
                                {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                {saving ? 'Menyimpan...' : 'Simpan Transaksi'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const X = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
);
