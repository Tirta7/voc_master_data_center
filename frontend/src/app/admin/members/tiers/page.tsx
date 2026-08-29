'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
    Award, Plus, Trash2, Edit2, Shield,
    ArrowLeft, Save, Coffee, Smartphone,
    ChevronRight, CheckCircle2, AlertCircle, Calendar, X as CloseIcon,
    Trash, Clock, Star, Gift, Users, Zap, TrendingUp, CreditCard, Repeat
} from 'lucide-react';
import Link from 'next/link';
import InputField from '@/components/ui/InputField';

// import { API_URL } from '@/utils/urlUtils';

const DAYS = [
    { label: 'MIN', value: 0 }, { label: 'SEN', value: 1 }, { label: 'SEL', value: 2 },
    { label: 'RAB', value: 3 }, { label: 'KAM', value: 4 }, { label: 'JUM', value: 5 },
    { label: 'SAB', value: 6 },
];

const TIER_COLORS: Record<string, { gradient: string; badge: string; icon: string }> = {
    PLATINUM: { gradient: 'from-slate-800 to-indigo-900', badge: 'bg-indigo-100 text-indigo-700', icon: '💎' },
    GOLD: { gradient: 'from-amber-600 to-yellow-500', badge: 'bg-amber-100 text-amber-700', icon: '🥇' },
    SILVER: { gradient: 'from-slate-400 to-slate-600', badge: 'bg-slate-100 text-slate-600', icon: '🥈' },
    BRONZE: { gradient: 'from-orange-500 to-amber-700', badge: 'bg-orange-100 text-orange-700', icon: '🥉' },
};
const getTierStyle = (name: string) => TIER_COLORS[name?.toUpperCase()] || { gradient: 'from-indigo-600 to-purple-700', badge: 'bg-indigo-100 text-indigo-700', icon: '⭐' };

interface Tier {
    id: number;
    name: string;
    discountConfig: { billiardPackage: number; billiardOpen: number; food: number; drink: number; other: number; isFreeLocker: boolean; };
    activeStartTime: string;
    activeEndTime: string;
    pointMultiplier: number;
    activeDates?: { date: string, startTime: string, endTime: string }[];
    activeDays?: number[];
    // New gamification fields
    autoUpgradeSpend?: number | null;
    minimumTopUp?: number | null;
    birthdayDiscountPct?: number | null;
    doublePointDays?: number[] | null;
    bonusTopupConfig?: { minAmount: number; bonusPercent: number; label: string; } | null;
    freeItemTrigger?: string | null;
    referralBonusPoints?: number | null;
    isActive?: boolean;
}

const BLANK_FORM: Partial<Tier> = {
    name: '', discountConfig: { billiardPackage: 0, billiardOpen: 0, food: 0, drink: 0, other: 0, isFreeLocker: false },
    activeStartTime: '00:00', activeEndTime: '23:59', pointMultiplier: 1,
    activeDates: [], activeDays: [0, 1, 2, 3, 4, 5, 6],
    autoUpgradeSpend: null, minimumTopUp: null, birthdayDiscountPct: null,
    doublePointDays: [], bonusTopupConfig: null, freeItemTrigger: null, referralBonusPoints: null,
};

// Sections for step wizard
const SECTIONS = [
    { id: 'identity', label: 'Identitas', icon: Shield },
    { id: 'discounts', label: 'Diskon & Benefit', icon: Award },
    { id: 'gamification', label: 'Gamifikasi', icon: Zap },
    { id: 'birthday', label: 'Personalisasi', icon: Gift },
    { id: 'referral', label: 'Referral', icon: Users },
    { id: 'topup', label: 'Bonus Top-up', icon: CreditCard },
    { id: 'schedule', label: 'Jadwal', icon: Clock },
];

export default function TierManagementPage() {
    const [tiers, setTiers] = useState<Tier[]>([]);
    const [categories, setCategories] = useState<{ id: number, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTier, setEditingTier] = useState<Tier | null>(null);
    const [activeSection, setActiveSection] = useState('identity');
    const [form, setForm] = useState<Partial<Tier>>(BLANK_FORM);

    // Bonus top-up helper state
    const [hasBonusTopup, setHasBonusTopup] = useState(false);

    useEffect(() => { fetchTiers(); fetchCategories(); }, []);

    useEffect(() => {
        if (showModal && typeof document !== 'undefined') {
            document.body.style.overflow = 'hidden';
        } else if (typeof document !== 'undefined') {
            document.body.style.overflow = '';
        }
        return () => {
            if (typeof document !== 'undefined') document.body.style.overflow = '';
        };
    }, [showModal]);

    const fetchCategories = async () => {
        try { const res = await axios.get(`/cafe/categories`); setCategories(res.data); } catch { }
    };
    const fetchTiers = async () => {
        try { const res = await axios.get(`/members/tiers`); setTiers(res.data); }
        catch { console.error('Failed to fetch tiers'); }
        finally { setLoading(false); }
    };

    const openCreate = () => {
        setEditingTier(null); setForm(BLANK_FORM); setHasBonusTopup(false); setActiveSection('identity'); setShowModal(true);
    };
    const openEdit = (tier: Tier) => {
        setEditingTier(tier);
        setForm({ ...tier });
        setHasBonusTopup(!!tier.bonusTopupConfig);
        setActiveSection('identity');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...form };
        if (!hasBonusTopup) payload.bonusTopupConfig = null;
        try {
            if (editingTier) await axios.patch(`/members/tiers/${editingTier.id}`, payload);
            else await axios.post(`/members/tiers`, payload);
            setShowModal(false);
            fetchTiers();
        } catch { alert('Gagal menyimpan kategori member'); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus kategori ini?')) return;
        try { await axios.delete(`/members/tiers/${id}`); fetchTiers(); }
        catch { alert('Gagal menghapus kategori'); }
    };

    const setDiscount = (key: string, value: number) =>
        setForm(f => ({ ...f, discountConfig: { ...f.discountConfig!, [key]: value } as any }));

    const toggleDay = (day: number, field: 'activeDays' | 'doublePointDays') => {
        setForm(f => {
            const current: number[] = (f[field] as number[]) || [];
            return { ...f, [field]: current.includes(day) ? current.filter(d => d !== day) : [...current, day] };
        });
    };

    const addSpecialDate = () => {
        setForm(f => ({ ...f, activeDates: [...(f.activeDates || []), { date: '', startTime: '00:00', endTime: '23:59' }] }));
    };

    return (
        <div className="p-4 lg:p-10 max-w-6xl mx-auto space-y-8 min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
            <header className="mb-10 w-full">
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 rounded-3xl p-8 lg:p-10 text-white shadow-2xl shadow-indigo-200 w-full">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12" />
                    <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <Link href="/admin/members" className="flex items-center gap-2 text-white/80 font-bold text-xs uppercase tracking-widest mb-3 hover:text-white transition-all">
                                <ArrowLeft className="w-4 h-4" /> Kembali ke Member
                            </Link>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20  rounded-2xl flex items-center justify-center">
                                    <Award className="w-5 h-5 flex-shrink-0" />
                                </div>
                                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Sistem Loyalitas</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight flex items-center gap-3">
                                Tier Member
                            </h1>
                            <p className="text-white/60 mt-1.5 font-semibold text-sm">Gamifikasi, diskon, referral, dan reward otomatis per kategori.</p>
                        </div>
                        <button onClick={openCreate}
                            className="w-full lg:w-auto bg-white/10 hover:bg-white/20 border border-white/20 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-500/30 active:scale-95 text-xs">
                            <Plus className="w-5 h-5" /> TAMBAH TIER
                        </button>
                    </div>
                </div>
            </header>

            {/* Tier Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-slate-400 font-black text-xs uppercase tracking-widest">Memuat...</div>
                ) : tiers.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-slate-400 font-black text-xs uppercase tracking-widest">Belum ada tier member. Klik "Tambah Tier".</div>
                ) : tiers.map(tier => {
                    const style = getTierStyle(tier.name);
                    return (
                        <div key={tier.id} className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xl shadow-slate-100/60 group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                            {/* Card Header */}
                            <div className={`bg-gradient-to-br ${style.gradient} p-6 relative overflow-hidden`}>
                                <div className="absolute top-0 right-0 text-6xl opacity-20 -mt-2 -mr-2">{style.icon}</div>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-white/60 text-[9px] font-black uppercase tracking-[0.3em] mb-1">Tier Member</p>
                                        <h3 className="text-2xl font-black text-white tracking-tight">{tier.name}</h3>
                                        <div className="flex items-center gap-2 mt-3">
                                            <div className="bg-white/20  text-white px-3 py-1 rounded-full text-[10px] font-black">
                                                ×{tier.pointMultiplier} POIN
                                            </div>
                                            {tier.autoUpgradeSpend && (
                                                <div className="bg-white/20  text-white px-3 py-1 rounded-full text-[10px] font-black">
                                                    AUTO ≥ {`Rp ${Math.round(Number(tier.autoUpgradeSpend)).toLocaleString('id-ID')}`}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <StatPill label="Billiard Paket" value={`${tier.discountConfig.billiardPackage}%`} color="indigo" />
                                    <StatPill label="Meja Open" value={`${tier.discountConfig.billiardOpen}%`} color="violet" />
                                    <StatPill label="Makanan" value={`${tier.discountConfig.food}%`} color="amber" />
                                    <StatPill label="Minuman" value={`${tier.discountConfig.drink}%`} color="emerald" />
                                </div>

                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {tier.discountConfig.isFreeLocker && <Badge label="🔐 Free Loker" color="emerald" />}
                                    {tier.birthdayDiscountPct && <Badge label={`🎂 Ulang Tahun −${tier.birthdayDiscountPct}%`} color="rose" />}
                                    {tier.bonusTopupConfig && <Badge label={`💳 Bonus +${tier.bonusTopupConfig.bonusPercent}%`} color="blue" />}
                                    {tier.freeItemTrigger && <Badge label={`🎁 ${tier.freeItemTrigger.slice(0, 20)}...`} color="purple" />}
                                    {tier.referralBonusPoints && <Badge label={`👥 Referral +${tier.referralBonusPoints}pts`} color="orange" />}
                                    {(tier.doublePointDays?.length || 0) > 0 && <Badge label={`⚡ ${tier.doublePointDays!.length}x Double Day`} color="yellow" />}
                                </div>

                                <div className="pt-2 border-t border-slate-50 flex gap-2">
                                    <button onClick={() => openEdit(tier)}
                                        className="flex-1 py-2.5 bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5">
                                        <Edit2 className="w-3 h-3" /> Edit
                                    </button>
                                    <button onClick={() => handleDelete(tier.id)}
                                        className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Modal ── */}
            {showModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 overscroll-contain">
                    <div className="absolute inset-0 bg-slate-900/80  animate-in fade-in duration-300" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-[3.5rem] w-full max-w-3xl max-h-[85vh] sm:max-h-[90vh] flex flex-col shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-6 pt-4 pb-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 bg-white z-10 relative">
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden shrink-0 self-center" />
                            <div className="flex justify-between items-center w-full">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">{editingTier ? 'Edit Tier' : 'Buat Tier Baru'}</h2>
                                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-0.5">Sistem Loyalitas & Gamifikasi</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all shrink-0"><CloseIcon className="w-5 h-5" /></button>
                            </div>
                        </div>

                        {/* Section Nav */}
                        <div className="flex gap-1 px-4 py-3 border-b border-slate-100 overflow-x-auto flex-shrink-0 bg-slate-50/50">
                            {SECTIONS.map(s => {
                                const Icon = s.icon;
                                return (
                                    <button key={s.id} onClick={() => setActiveSection(s.id)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${activeSection === s.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}>
                                        <Icon className="w-3 h-3" />{s.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Modal Body */}
                        <form id="tier-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">

                            {/* ── IDENTITAS ── */}
                            {activeSection === 'identity' && (
                                <div className="space-y-5">
                                    <SectionHeader icon={Shield} title="Identitas Tier" desc="Nama dan konfigurasi dasar tier." />
                                    <InputField label="Nama Tier (PLATINUM, GOLD, dll)" value={form.name || ''} onChange={v => setForm(f => ({ ...f, name: v.toUpperCase() }))} required />
                                    <div className="grid grid-cols-3 gap-3">
                                        {Object.keys(TIER_COLORS).map(t => (
                                            <button type="button" key={t} onClick={() => setForm(f => ({ ...f, name: t }))}
                                                className={`p-3 rounded-2xl font-black text-xs text-center transition-all border-2 ${form.name === t ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-indigo-300'}`}>
                                                {TIER_COLORS[t].icon} {t}
                                            </button>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">Multiplier Poin per Transaksi</label>
                                        <div className="flex gap-2">
                                            {[1, 1.5, 2, 3, 5].map(m => (
                                                <button type="button" key={m} onClick={() => setForm(f => ({ ...f, pointMultiplier: m }))}
                                                    className={`flex-1 py-3 rounded-2xl font-black text-xs transition-all border-2 ${form.pointMultiplier === m ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-indigo-300'}`}>
                                                    ×{m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── DISKON & BENEFIT ── */}
                            {activeSection === 'discounts' && (
                                <div className="space-y-5">
                                    <SectionHeader icon={Award} title="Diskon & Benefit" desc="Persentase diskon per kategori. Otomatis mengikuti kategori yang ada." />

                                    {/* Fixed billiard discounts */}
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 pl-1">🎱 Billiard</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <InputField label="Paket Billiard (%)" type="number" value={form.discountConfig?.billiardPackage ?? 0} onChange={v => setDiscount('billiardPackage', Number(v))} />
                                            <InputField label="Meja Open (%)" type="number" value={form.discountConfig?.billiardOpen ?? 0} onChange={v => setDiscount('billiardOpen', Number(v))} />
                                        </div>
                                    </div>

                                    {/* Dynamic category discounts */}
                                    {categories.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 pl-1">☕ Kategori Cafe ({categories.length} kategori)</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {categories.map(cat => (
                                                    <InputField
                                                        key={cat.id}
                                                        label={`${cat.name} (%)`}
                                                        type="number"
                                                        value={(form.discountConfig as any)?.[cat.name] ?? 0}
                                                        onChange={v => setDiscount(cat.name, Number(v))}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {categories.length === 0 && (
                                        <div className="text-center py-4 text-slate-300 text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-2xl">
                                            Belum ada kategori cafe. Tambahkan di menu Inventori → Kategori.
                                        </div>
                                    )}

                                    {/* Default/other */}
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">🏷️ Default</p>
                                        <InputField label="Lainnya / Default (% — berlaku jika kategori tidak cocok)" type="number" value={form.discountConfig?.other ?? 0} onChange={v => setDiscount('other', Number(v))} />
                                    </div>

                                    {/* Free locker toggle */}
                                    <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 cursor-pointer" onClick={() => setForm(f => ({ ...f, discountConfig: { ...f.discountConfig!, isFreeLocker: !f.discountConfig?.isFreeLocker } }))}>
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${form.discountConfig?.isFreeLocker ? 'bg-emerald-600 text-white' : 'bg-white border-2 border-slate-200'}`}>
                                            {form.discountConfig?.isFreeLocker && <CheckCircle2 className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="font-black text-emerald-900 text-sm">🔐 Free Loker Penyimpanan</p>
                                            <p className="text-emerald-600 text-[10px] font-bold">Akses loker gratis untuk member tier ini</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── GAMIFIKASI ── */}
                            {activeSection === 'gamification' && (
                                <div className="space-y-5">
                                    <SectionHeader icon={Zap} title="Gamifikasi & Milestone" desc="Buat customer \'leveling up\' secara otomatis." />
                                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <TrendingUp className="w-4 h-4 text-indigo-600" />
                                            <p className="font-black text-indigo-900 text-sm">Auto Naik Tier</p>
                                        </div>
                                        <InputField label="Total Belanja Minimum untuk Naik ke Tier Ini (Rp, kosongkan jika manual)"
                                            type="number" value={form.autoUpgradeSpend ?? ''} onChange={v => setForm(f => ({ ...f, autoUpgradeSpend: v ? Number(v) : null }))} />
                                        <p className="text-indigo-500 text-[10px] font-bold">Contoh: 5.000.000 = customer yang sudah belanja total Rp 5jt otomatis naik ke tier ini.</p>
                                    </div>
                                    <InputField label="Minimum Saldo Top-up untuk Tetap di Tier Ini (Rp, opsional)"
                                        type="number" value={form.minimumTopUp ?? ''} onChange={v => setForm(f => ({ ...f, minimumTopUp: v ? Number(v) : null }))} />
                                    <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-yellow-600" />
                                            <p className="font-black text-yellow-900 text-sm">⚡ Double Point Days</p>
                                            <p className="text-yellow-600 text-[10px] font-bold ml-auto">Poin 2× lipat di hari pilihan</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {DAYS.map(d => (
                                                <button type="button" key={d.value} onClick={() => toggleDay(d.value, 'doublePointDays')}
                                                    className={`flex-1 py-2 rounded-xl text-[9px] font-black transition-all border ${(form.doublePointDays || []).includes(d.value) ? 'bg-yellow-500 text-white border-yellow-500 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-yellow-300'}`}>
                                                    {d.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── PERSONALISASI ── */}
                            {activeSection === 'birthday' && (
                                <div className="space-y-5">
                                    <SectionHeader icon={Gift} title="Personalisasi" desc="Reward otomatis berbasis data pribadi customer." />
                                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Gift className="w-4 h-4 text-rose-500" />
                                            <p className="font-black text-rose-900 text-sm">🎂 Birthday Reward</p>
                                        </div>
                                        <InputField label="Diskon di Hari Ulang Tahun (%, 0 = nonaktif)"
                                            type="number" value={form.birthdayDiscountPct ?? 0} onChange={v => setForm(f => ({ ...f, birthdayDiscountPct: Number(v) || null }))} />
                                        <p className="text-rose-500 text-[10px] font-bold">Sistem otomatis memberi diskon ini di hari lahir member.</p>
                                    </div>
                                    <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Gift className="w-4 h-4 text-purple-600" />
                                            <p className="font-black text-purple-900 text-sm">🎁 Free Item Trigger</p>
                                        </div>
                                        <textarea
                                            className="w-full border-2 border-purple-100 rounded-2xl p-3 text-sm font-semibold text-slate-700 bg-white resize-none focus:outline-none focus:border-purple-400 transition-all"
                                            rows={3}
                                            placeholder="Contoh: 1 Es Teh gratis setiap bermain > 2 jam"
                                            value={form.freeItemTrigger || ''}
                                            onChange={e => setForm(f => ({ ...f, freeItemTrigger: e.target.value || null }))}
                                        />
                                        <p className="text-purple-500 text-[10px] font-bold">Deskripsi benefit yang staf wajib berikan (reminder manual).</p>
                                    </div>
                                </div>
                            )}

                            {/* ── REFERRAL ── */}
                            {activeSection === 'referral' && (
                                <div className="space-y-5">
                                    <SectionHeader icon={Users} title="Sistem Referral" desc="Biarkan member yang mencari customer baru." />
                                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-orange-600" />
                                            <p className="font-black text-orange-900 text-sm">👥 Bonus Referral</p>
                                        </div>
                                        <InputField label="Poin Bonus untuk Pengajak (per member baru yang berhasil bergabung)"
                                            type="number" value={form.referralBonusPoints ?? ''} onChange={v => setForm(f => ({ ...f, referralBonusPoints: v ? Number(v) : null }))} />
                                        <div className="flex gap-3 p-3 bg-white rounded-xl border border-orange-100">
                                            <div className="text-2xl">💡</div>
                                            <div className="text-[10px] font-bold text-orange-700 space-y-1">
                                                <p>Setiap member memiliki kode referral unik otomatis.</p>
                                                <p>Saat member baru mendaftar dengan kode tersebut, pengajak mendapat poin bonus sejumlah ini.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── BONUS TOP-UP ── */}
                            {activeSection === 'topup' && (
                                <div className="space-y-5">
                                    <SectionHeader icon={CreditCard} title="Bonus Top-up" desc="Lock-in customer dengan saldo & bonus." />
                                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100 cursor-pointer" onClick={() => setHasBonusTopup(v => !v)}>
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${hasBonusTopup ? 'bg-blue-600 text-white' : 'bg-white border-2 border-slate-200'}`}>
                                            {hasBonusTopup && <CheckCircle2 className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="font-black text-blue-900 text-sm">💳 Aktifkan Bonus Top-up</p>
                                            <p className="text-blue-600 text-[10px] font-bold">Top-up lebih hemat dengan bonus saldo ekstra</p>
                                        </div>
                                    </div>
                                    {hasBonusTopup && (
                                        <div className="p-4 bg-white rounded-2xl border-2 border-blue-100 space-y-4">
                                            <InputField label="Minimum Top-up untuk Dapat Bonus (Rp)"
                                                type="number" value={form.bonusTopupConfig?.minAmount ?? ''} onChange={v => setForm(f => ({ ...f, bonusTopupConfig: { ...f.bonusTopupConfig!, minAmount: Number(v), bonusPercent: f.bonusTopupConfig?.bonusPercent || 0, label: f.bonusTopupConfig?.label || '' } }))} />
                                            <InputField label="Persen Bonus (%)"
                                                type="number" value={form.bonusTopupConfig?.bonusPercent ?? ''} onChange={v => setForm(f => ({ ...f, bonusTopupConfig: { ...f.bonusTopupConfig!, bonusPercent: Number(v), minAmount: f.bonusTopupConfig?.minAmount || 0, label: f.bonusTopupConfig?.label || '' } }))} />
                                            <InputField label='Label Promo (contoh: "Top-up 500K Dapat 600K")'
                                                value={form.bonusTopupConfig?.label ?? ''} onChange={v => setForm(f => ({ ...f, bonusTopupConfig: { ...f.bonusTopupConfig!, label: v, minAmount: f.bonusTopupConfig?.minAmount || 0, bonusPercent: f.bonusTopupConfig?.bonusPercent || 0 } }))} />
                                            {form.bonusTopupConfig && form.bonusTopupConfig.minAmount > 0 && (
                                                <div className="p-3 bg-blue-50 rounded-xl text-[11px] font-bold text-blue-700">
                                                    Preview: Top-up Rp {Number(form.bonusTopupConfig.minAmount).toLocaleString('id-ID')} → dapat Rp {Math.round(form.bonusTopupConfig.minAmount * (1 + form.bonusTopupConfig.bonusPercent / 100)).toLocaleString('id-ID')} (+{form.bonusTopupConfig.bonusPercent}%)
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── JADWAL ── */}
                            {activeSection === 'schedule' && (
                                <div className="space-y-5">
                                    <SectionHeader icon={Clock} title="Jadwal Aktif" desc="Kapan diskon tier ini berlaku." />
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="Jam Mulai" type="time" value={form.activeStartTime || '00:00'} onChange={v => setForm(f => ({ ...f, activeStartTime: v }))} />
                                        <InputField label="Jam Selesai" type="time" value={form.activeEndTime || '23:59'} onChange={v => setForm(f => ({ ...f, activeEndTime: v }))} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block mb-2">Hari Aktif (klik untuk toggle)</label>
                                        <div className="flex gap-2">
                                            {DAYS.map(d => (
                                                <button type="button" key={d.value} onClick={() => toggleDay(d.value, 'activeDays')}
                                                    className={`flex-1 py-3 rounded-xl text-[9px] font-black transition-all border ${(form.activeDays || []).includes(d.value) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-300'}`}>
                                                    {d.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jadwal Tanggal Khusus</label>
                                            <button type="button" onClick={addSpecialDate} className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-600 hover:text-white transition-all">+ TAMBAH</button>
                                        </div>
                                        {(form.activeDates || []).length === 0 && (
                                            <p className="text-center py-6 text-slate-300 font-bold text-[10px]">BELUM ADA JADWAL KHUSUS</p>
                                        )}
                                        {(form.activeDates || []).map((d, i) => (
                                            <div key={i} className="flex gap-2 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                <input type="date" value={d.date} onChange={e => { const arr = [...(form.activeDates || [])]; arr[i] = { ...arr[i], date: e.target.value }; setForm(f => ({ ...f, activeDates: arr })); }} className="flex-1 text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400" />
                                                <input type="time" value={d.startTime} onChange={e => { const arr = [...(form.activeDates || [])]; arr[i] = { ...arr[i], startTime: e.target.value }; setForm(f => ({ ...f, activeDates: arr })); }} className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 w-28 focus:outline-none focus:border-indigo-400" />
                                                <input type="time" value={d.endTime} onChange={e => { const arr = [...(form.activeDates || [])]; arr[i] = { ...arr[i], endTime: e.target.value }; setForm(f => ({ ...f, activeDates: arr })); }} className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 w-28 focus:outline-none focus:border-indigo-400" />
                                                <button type="button" onClick={() => setForm(f => ({ ...f, activeDates: (f.activeDates || []).filter((_, j) => j !== i) }))} className="p-2 text-rose-400 hover:text-rose-600"><Trash className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </form>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 flex gap-4 flex-shrink-0 bg-slate-50/50 pb-[calc(1.5rem+env(safe-area-inset-bottom,20px))] sm:pb-6 relative z-10">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-white text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest border border-slate-200 rounded-2xl hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm">
                                Batal
                            </button>
                            <button form="tier-form" type="submit" className="flex-[2] bg-gradient-to-br from-indigo-600 to-purple-600 text-white py-4 px-8 rounded-2xl font-black text-[10px] sm:text-xs shadow-lg shadow-indigo-200 active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                                <Save className="w-4 h-4 sm:w-5 sm:h-5" /> Simpan Tier
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
                <h3 className="font-black text-slate-900 text-sm">{title}</h3>
                <p className="text-slate-400 text-[10px] font-bold mt-0.5">{desc}</p>
            </div>
        </div>
    );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
    const colors: Record<string, string> = {
        indigo: 'bg-indigo-50 text-indigo-700', violet: 'bg-violet-50 text-violet-700',
        amber: 'bg-amber-50 text-amber-700', emerald: 'bg-emerald-50 text-emerald-700',
    };
    return (
        <div className={`${colors[color] || colors.indigo} rounded-xl px-3 py-2`}>
            <p className="text-[8px] font-black uppercase tracking-wider opacity-60 mb-0.5">{label}</p>
            <p className="text-sm font-black">{value}</p>
        </div>
    );
}

function Badge({ label, color }: { label: string; color: string }) {
    const colors: Record<string, string> = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-100',
        orange: 'bg-orange-50 text-orange-700 border-orange-100',
        yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    };
    return <span className={`${colors[color] || colors.blue} border text-[9px] font-black px-2.5 py-1 rounded-full whitespace-nowrap`}>{label}</span>;
}
