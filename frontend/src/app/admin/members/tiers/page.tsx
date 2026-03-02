'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Award, Plus, Trash2, Edit2, Shield,
    ArrowLeft, Save, Coffee, Smartphone,
    ChevronRight, CheckCircle2, AlertCircle, Calendar, X as CloseIcon,
    Trash, Clock
} from 'lucide-react';
import Link from 'next/link';
import InputField from '@/components/ui/InputField';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Tier {
    id: number;
    name: string;
    discountConfig: {
        billiardPackage: number;
        billiardOpen: number;
        food: number;
        drink: number;
        other: number;
        isFreeLocker: boolean;
    };
    activeStartTime: string;
    activeEndTime: string;
    pointMultiplier: number;
    activeDates?: { date: string, startTime: string, endTime: string }[];
    activeDays?: number[];
}

export default function TierManagementPage() {
    const [tiers, setTiers] = useState<Tier[]>([]);
    const [categories, setCategories] = useState<{ id: number, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTier, setEditingTier] = useState<Tier | null>(null);

    const [form, setForm] = useState<Partial<Tier>>({
        name: '',
        discountConfig: {
            billiardPackage: 0,
            billiardOpen: 0,
            food: 0,
            drink: 0,
            other: 0,
            isFreeLocker: false
        },
        activeStartTime: '00:00',
        activeEndTime: '23:59',
        pointMultiplier: 1.0,
        activeDates: [],
        activeDays: []
    });

    useEffect(() => {
        fetchTiers();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await axios.get(`${API_URL}/cafe/categories`);
            setCategories(res.data);
        } catch (err) {
            console.error('Failed to fetch categories', err);
        }
    };

    const fetchTiers = async () => {
        try {
            const res = await axios.get(`${API_URL}/members/tiers`);
            setTiers(res.data);
        } catch (err) {
            console.error('Failed to fetch tiers', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingTier) {
                await axios.patch(`${API_URL}/members/tiers/${editingTier.id}`, form);
            } else {
                await axios.post(`${API_URL}/members/tiers`, form);
            }
            setShowModal(false);
            setEditingTier(null);
            setForm({
                name: '',
                discountConfig: { billiardPackage: 0, billiardOpen: 0, food: 0, drink: 0, other: 0, isFreeLocker: false },
                activeStartTime: '00:00',
                activeEndTime: '23:59',
                pointMultiplier: 1.0,
                activeDates: [],
                activeDays: []
            });
            fetchTiers();
        } catch (err) {
            alert('Gagal menyimpan kategori member');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus kategori ini? Member yang terdaftar akan terpengaruh.')) return;
        try {
            await axios.delete(`${API_URL}/members/tiers/${id}`);
            fetchTiers();
        } catch (err) {
            alert('Gagal menghapus kategori');
        }
    };

    return (
        <div className="p-4 lg:p-10 max-w-5xl mx-auto space-y-8">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <Link href="/admin/members" className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-2 hover:translate-x-[-4px] transition-all">
                        <ArrowLeft className="w-4 h-4" /> Kembali
                    </Link>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Award className="w-8 h-8 text-indigo-600" />
                        Kategori Member
                    </h1>
                    <p className="text-slate-500 mt-1 font-bold text-xs lg:text-sm uppercase tracking-wider">Atur Diskon Khusus Platinum, Gold, & Lainnya.</p>
                </div>
                <button
                    onClick={() => { setEditingTier(null); setForm({ name: '', activeStartTime: '00:00', activeEndTime: '23:59', pointMultiplier: 1.0, activeDates: [], activeDays: [], discountConfig: { billiardPackage: 0, billiardOpen: 0, food: 0, drink: 0, other: 0, isFreeLocker: false } }); setShowModal(true); }}
                    className="w-full lg:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 text-xs"
                >
                    <Plus className="w-5 h-5" />
                    TAMBAH KATEGORI
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-slate-400 font-black text-xs uppercase tracking-widest">Memuat Kategori...</div>
                ) : tiers.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-slate-400 font-black text-xs uppercase tracking-widest">Belum ada kategori member.</div>
                ) : tiers.map(tier => (
                    <div key={tier.id} className="bg-white rounded-[2rem] p-8 border-2 border-slate-100 shadow-xl shadow-slate-100/50 group hover:border-indigo-600 transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-[4rem] flex items-center justify-center -mr-8 -mt-8 group-hover:bg-indigo-600 transition-all">
                            <Award className="w-10 h-10 text-indigo-600 group-hover:text-white transition-all transform group-hover:scale-110" />
                        </div>

                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">{tier.name}</h3>

                        <div className="space-y-4 mb-8">
                            <DiscountBadge label="Paket Billiard" value={tier.discountConfig.billiardPackage} />
                            <DiscountBadge label="Meja Open" value={tier.discountConfig.billiardOpen} />

                            {categories.map(cat => {
                                const val = (tier.discountConfig as any)[cat.name] || 0;
                                if (val > 0) {
                                    return <DiscountBadge key={cat.id} label={cat.name} value={val} />;
                                }
                                return null;
                            })}

                            {/* Fallbacks for legacy display if not stored perfectly by category yet */}
                            {tier.discountConfig.food > 0 && <DiscountBadge label="Makanan (Legacy)" value={tier.discountConfig.food} />}
                            {tier.discountConfig.drink > 0 && <DiscountBadge label="Minuman (Legacy)" value={tier.discountConfig.drink} />}
                            {tier.discountConfig.other > 0 && <DiscountBadge label="Lainnya" value={tier.discountConfig.other} />}
                            {tier.discountConfig.isFreeLocker && (
                                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> FREE LOKER
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                <Clock className="w-3.5 h-3.5" /> Jam: {tier.activeStartTime} - {tier.activeEndTime}
                            </div>
                            {tier.activeDays && tier.activeDays.length > 0 && (
                                <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                    <Calendar className="w-3.5 h-3.5" /> {tier.activeDays.length === 7 ? 'SETIAP HARI' : `${tier.activeDays.length} HARI AKTIF`}
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                <Award className="w-3.5 h-3.5" /> Bonus: {Math.round(tier.pointMultiplier)} Poin
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => { setEditingTier(tier); setForm(tier); setShowModal(true); }}
                                className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-900 hover:text-white transition-all"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(tier.id)}
                                className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] md:rounded-[3rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto p-0 shadow-3xl animate-in zoom-in duration-300 relative">
                        <div className="sticky top-0 left-0 w-full h-2 bg-indigo-600 z-10"></div>
                        <div className="p-6 md:p-12">

                            <header className="mb-8">
                                <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight uppercase">{editingTier ? 'Update' : 'Tambah'} Kategori</h2>
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Sesuaikan royalty otomatis.</p>
                            </header>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <InputField
                                    label="Nama Kategori (Contoh: PLATINUM)"
                                    value={form.name}
                                    onChange={v => setForm({ ...form, name: v.toUpperCase() })}
                                    required
                                />

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <InputField label="Billiard Paket (%)" type="number" value={form.discountConfig?.billiardPackage} onChange={v => setForm({ ...form, discountConfig: { ...form.discountConfig!, billiardPackage: Number(v) } })} />
                                    <InputField label="Billiard Open (%)" type="number" value={form.discountConfig?.billiardOpen} onChange={v => setForm({ ...form, discountConfig: { ...form.discountConfig!, billiardOpen: Number(v) } })} />

                                    {categories.map(cat => (
                                        <InputField
                                            key={cat.id}
                                            label={`${cat.name} (%)`}
                                            type="number"
                                            value={(form.discountConfig as any)[cat.name] || 0}
                                            onChange={v => setForm({ ...form, discountConfig: { ...form.discountConfig!, [cat.name]: Number(v) } })}
                                        />
                                    ))}

                                    <InputField label="Lainnya / Default (%)" type="number" value={form.discountConfig?.other || 0} onChange={v => setForm({ ...form, discountConfig: { ...form.discountConfig!, other: Number(v) } })} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <InputField label="Jam Mulai" type="time" value={form.activeStartTime} onChange={v => setForm({ ...form, activeStartTime: v })} />
                                    <InputField label="Jam Selesai" type="time" value={form.activeEndTime} onChange={v => setForm({ ...form, activeEndTime: v })} />
                                    <InputField
                                        label="Poin per Transaksi"
                                        type="number"
                                        step="1"
                                        value={Math.round(Number(form.pointMultiplier || 1))}
                                        onChange={v => setForm({ ...form, pointMultiplier: Math.floor(Number(v)) })}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hari Aktif (Pilih yang diperbolehkan)</label>
                                    <div className="grid grid-cols-4 lg:grid-cols-7 gap-2">
                                        {['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'].map((day, idx) => {
                                            const isSelected = form.activeDays?.includes(idx);
                                            return (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    onClick={() => {
                                                        const current = form.activeDays || [];
                                                        const next = isSelected ? current.filter(d => d !== idx) : [...current, idx];
                                                        setForm({ ...form, activeDays: next });
                                                    }}
                                                    className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all border-2 flex flex-col items-center justify-center gap-1 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                                >
                                                    {day}
                                                    <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-200'}`} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 mb-6">
                                    {form.activeDates?.map((item, idx) => (
                                        <div key={idx} className="bg-white border-2 border-slate-100 rounded-[2rem] p-5 md:p-6 shadow-xl shadow-slate-100/30 hover:border-indigo-600 transition-all flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-right-4 duration-300">
                                            <div className="flex items-center gap-4 min-w-[120px] w-full md:w-auto">
                                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
                                                    <span className="text-lg font-black leading-none">{new Date(item.date).getDate()}</span>
                                                    <span className="text-[7px] font-black uppercase tracking-widest">{new Date(item.date).toLocaleDateString('id-ID', { month: 'short' })}</span>
                                                </div>
                                                <div className="shrink-0">
                                                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{new Date(item.date).toLocaleDateString('id-ID', { weekday: 'long' })}</p>
                                                    <p className="text-[8px] font-bold text-slate-400">{item.date}</p>
                                                </div>
                                            </div>

                                            <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                                                <div className="space-y-1.5 flex-1">
                                                    <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Jam Mulai</label>
                                                    <div className="relative">
                                                        <input
                                                            type="time"
                                                            value={item.startTime}
                                                            onChange={e => {
                                                                const next = [...(form.activeDates || [])];
                                                                next[idx].startTime = e.target.value;
                                                                setForm({ ...form, activeDates: next });
                                                            }}
                                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-xs font-black text-slate-700 focus:border-indigo-600 outline-none transition-all appearance-none"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5 flex-1">
                                                    <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Jam Selesai</label>
                                                    <div className="relative">
                                                        <input
                                                            type="time"
                                                            value={item.endTime}
                                                            onChange={e => {
                                                                const next = [...(form.activeDates || [])];
                                                                next[idx].endTime = e.target.value;
                                                                setForm({ ...form, activeDates: next });
                                                            }}
                                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-xs font-black text-slate-700 focus:border-indigo-600 outline-none transition-all appearance-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setForm({ ...form, activeDates: form.activeDates?.filter((_, i) => i !== idx) })}
                                                className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                            >
                                                <Trash className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                    {(!form.activeDates || form.activeDates.length === 0) && (
                                        <div className="py-10 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-slate-300">
                                            <Calendar className="w-10 h-10 opacity-20" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Belum ada jadwal khusus.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-1 bg-slate-100 rounded-[2rem] flex flex-col md:flex-row gap-2">
                                    <input
                                        type="date"
                                        id="new-special-date"
                                        className="flex-1 bg-white border-none rounded-[1.8rem] px-6 md:px-8 py-4 md:py-5 font-black text-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none transition-all cursor-pointer text-sm"
                                        onChange={e => {
                                            if (!e.target.value) return;
                                            const current = form.activeDates || [];
                                            if (!current.some(d => d.date === e.target.value)) {
                                                setForm({ ...form, activeDates: [...current, { date: e.target.value, startTime: '09:00', endTime: '22:00' }] });
                                            }
                                            e.target.value = '';
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => (document.getElementById('new-special-date') as any).showPicker()}
                                        className="bg-indigo-600 text-white px-8 py-4 md:py-5 rounded-[1.8rem] font-black text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        <Plus className="w-5 h-5" />
                                        TAMBAH JADWAL KHUSUS
                                    </button>
                                </div>

                                <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 cursor-pointer hover:border-indigo-600 transition-all">
                                    <input
                                        type="checkbox"
                                        checked={form.discountConfig?.isFreeLocker}
                                        onChange={e => setForm({ ...form, discountConfig: { ...form.discountConfig!, isFreeLocker: e.target.checked } })}
                                        className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-600 border-2"
                                    />
                                    <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Free Loker Penyimpanan</span>
                                </label>

                                <div className="flex flex-col md:flex-row gap-3 pt-4">
                                    <button type="button" onClick={() => setShowModal(false)} className="py-4 text-xs font-black text-slate-500 order-2 md:order-1">BATAL</button>
                                    <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 px-8 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 order-1 md:order-2">
                                        <Save className="w-4 h-4" /> SIMPAN KATEGORI
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DiscountBadge({ label, value }: { label: string, value: number }) {
    return (
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 font-bold">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">{label}</span>
            <span className="text-sm text-indigo-600 font-black">{value}%</span>
        </div>
    );
}
