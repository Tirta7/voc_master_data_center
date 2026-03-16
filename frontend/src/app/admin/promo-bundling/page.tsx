'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Tag, Plus, Trash2, Edit3, Save, X, Check,
    Gift, Timer, Package, Search, AlertCircle,
    ChevronRight, ArrowLeft, Coffee, Info, DollarSign, Minus, Zap, ShieldOff
} from 'lucide-react';

import { useRouter } from 'next/navigation';
import InputField from '@/components/ui/InputField';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface RuleJson {
    requireBilliardMinutes: number;
    requireMenuItems: { id: number; name: string; quantity: number }[];
    bestSellerCount: number; // NEW
    badge?: string; // NEW
    fixedPrice: number;
}


export default function PromoBundlingPage() {
    const { hasPermission } = useAuth();
    const router = useRouter();
    const [promos, setPromos] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [billiardPackages, setBilliardPackages] = useState<any[]>([]);
    const [bestSellers, setBestSellers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [lastSavedPromo, setLastSavedPromo] = useState<any>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        type: 'PACKAGE',
        description: '',
        isActive: true,
        ruleJson: {
            requireBilliardMinutes: 0,
            requireMenuItems: [] as { id: number; name: string; quantity: number }[],
            bestSellerCount: 0,
            badge: '',
            fixedPrice: 0,
        } as RuleJson


    });
    const [searchMenu, setSearchMenu] = useState('');

    const filteredMenuItems = menuItems.filter(item =>
        item.name.toLowerCase().includes(searchMenu.toLowerCase()) && !item.isSubRecipe
    );

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [promoRes, menuRes, pkgRes, bestRes] = await Promise.all([
                axios.get(`${API_URL}/admin/promos`),
                axios.get(`${API_URL}/cafe/menu`),
                axios.get(`${API_URL}/billiard/packages`),
                axios.get(`${API_URL}/reports/best-sellers`)
            ]);
            setPromos(promoRes.data);
            setMenuItems(menuRes.data);
            setBilliardPackages(pkgRes.data);
            setBestSellers(bestRes.data);

        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name) return alert('Nama promo harus diisi');
        if (formData.ruleJson.fixedPrice <= 0) return alert('Harga paket harus lebih dari 0');

        try {
            if (editingId) {
                await axios.put(`${API_URL}/admin/promos/${editingId}`, formData);
            } else {
                await axios.post(`${API_URL}/admin/promos`, formData);
            }
            setIsAdding(false);
            setEditingId(null);
            resetForm();
            fetchData();
        } catch (error) {
            alert('Gagal menyimpan promo');
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setLastSavedPromo(null);
        setFormData({
            name: '',
            type: 'PACKAGE',
            description: '',
            isActive: true,
            ruleJson: {
                requireBilliardMinutes: 0,
                requireMenuItems: [],
                bestSellerCount: 0,
                badge: '',
                fixedPrice: 0,
            }

        });
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus promo bundling ini?')) return;
        try {
            await axios.delete(`${API_URL}/admin/promos/${id}`);
            fetchData();
        } catch (error) {
            alert('Gagal menghapus promo');
        }
    };

    const startEdit = (promo: any) => {
        setEditingId(promo.id);
        const promoData = {
            name: promo.name,
            type: promo.type,
            description: promo.description || '',
            isActive: promo.isActive,
            ruleJson: promo.ruleJson || {
                requireBilliardMinutes: 0,
                requireMenuItems: [],
                bestSellerCount: 0,
                badge: '',
                fixedPrice: 0,
            }

        };
        setFormData(promoData);
        setLastSavedPromo(promoData);
        setIsAdding(true);
    };

    const addMenuItemToRule = (item: any) => {
        const current = [...formData.ruleJson.requireMenuItems];
        const existing = current.find(i => i.id === item.id);

        if (existing) {
            existing.quantity += 1;
        } else {
            current.push({ id: item.id, name: item.name, quantity: 1 });
        }

        setFormData({
            ...formData,
            ruleJson: { ...formData.ruleJson, requireMenuItems: current }
        });
    };

    const removeMenuItemFromRule = (itemId: number) => {
        const current = formData.ruleJson.requireMenuItems.filter(i => i.id !== itemId);
        setFormData({
            ...formData,
            ruleJson: { ...formData.ruleJson, requireMenuItems: current }
        });
    };

    const updateMenuItemQty = (itemId: number, qty: number) => {
        if (qty <= 0) return removeMenuItemFromRule(itemId);
        const current = formData.ruleJson.requireMenuItems.map(i =>
            i.id === itemId ? { ...i, quantity: qty } : i
        );
        setFormData({
            ...formData,
            ruleJson: { ...formData.ruleJson, requireMenuItems: current }
        });
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Menyiapkan Dashboard Promo...</p>
        </div>
    );

    if (!hasPermission('PROMO_MANAGE')) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-10 text-center">
                <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mb-6 border-2 border-rose-100 shadow-xl shadow-rose-100/50">
                    <ShieldOff className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter uppercase">Akses Terbatas</h2>
                <p className="text-slate-500 max-w-md font-medium leading-relaxed">
                    Maaf, akun Anda tidak memiliki izin untuk mengelola promo dan bundling.
                    Silakan hubungi Administrator untuk mendapatkan akses.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 lg:p-12">
            <div className="max-w-6xl mx-auto">
                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 rounded-3xl p-8 lg:p-10 text-white shadow-2xl shadow-indigo-200 mb-8 md:mb-12">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12" />
                    <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <Gift className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Marketing Center</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Promo & Bundling</h1>
                            <p className="text-white/60 text-sm font-semibold mt-1">Sistem manajemen paket khusus, promo menarik, dan bundling menu cafe</p>
                        </div>
                        {!isAdding && (
                            <button
                                onClick={() => setIsAdding(true)}
                                className="bg-white text-indigo-700 hover:bg-indigo-50 px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl transition-all active:scale-95 group"
                            >
                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                BUAT PAKET BARU
                            </button>
                        )}
                    </div>
                </div>

                {/* Editor Modal/Card */}
                {isAdding && (
                    <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 overscroll-contain animate-in fade-in duration-300">
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => { setIsAdding(false); setEditingId(null); resetForm(); }} />
                        <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-6xl shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-full sm:zoom-in duration-500 overflow-hidden flex flex-col max-h-[95vh]">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] pointer-events-none -mt-32 -mr-32" />

                            <div className="p-8 md:p-10 border-b border-slate-50 flex-shrink-0 relative z-10 flex justify-between items-center bg-white">
                                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-4">
                                    <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg">
                                        <Edit3 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Promo Configurator</p>
                                        {editingId ? 'Edit Promo Bundling' : 'Konfigurasi Paket Baru'}
                                    </div>
                                </h2>
                                <button onClick={() => { setIsAdding(false); setEditingId(null); resetForm(); }} className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-all">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar flex-1 relative z-10 bg-slate-50/30">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                    {/* Left Col: Core Info */}
                                    <div className="lg:col-span-5 space-y-8">
                                        <div className="space-y-6">
                                            <InputField
                                                label="Nama Paket / Promo"
                                                value={formData.name}
                                                savedValue={lastSavedPromo?.name}
                                                isEditing={!!editingId}
                                                onChange={val => setFormData({ ...formData, name: val })}
                                                placeholder="Misal: Paket Happy Ramadhan"
                                            />

                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">Tipe Promo</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {[
                                                        { id: 'PACKAGE', label: 'PAKET MEJA', icon: Timer, desc: 'Waktu + Menu' },
                                                        { id: 'BUNDLE', label: 'MENU BUNDLE', icon: Package, desc: 'Set Menu' }
                                                    ].map(type => (
                                                        <button
                                                            key={type.id}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, type: type.id as any })}
                                                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${formData.type === type.id
                                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                                        >
                                                            <type.icon className="w-6 h-6" />
                                                            <div className="text-center">
                                                                <p className="text-[11px] font-black">{type.label}</p>
                                                                <p className={`text-[9px] font-bold ${formData.type === type.id ? 'text-indigo-100' : 'text-slate-400'}`}>{type.desc}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <InputField
                                                label="Deskripsi Singkat"
                                                type="textarea"
                                                value={formData.description}
                                                savedValue={lastSavedPromo?.description}
                                                isEditing={!!editingId}
                                                onChange={val => setFormData({ ...formData, description: val })}
                                                placeholder="Berikan info isi paket ke kasir..."
                                            />

                                            <InputField
                                                label="Badge / Label Promo (Opsional)"
                                                value={formData.ruleJson.badge}
                                                savedValue={lastSavedPromo?.ruleJson?.badge}
                                                isEditing={!!editingId}
                                                onChange={val => setFormData({
                                                    ...formData,
                                                    ruleJson: { ...formData.ruleJson, badge: val }
                                                })}
                                                placeholder="Misal: TERLARIS, HEMAT, NEW"
                                            />
                                        </div>

                                        <div className="bg-emerald-50 rounded-3xl p-8 border border-emerald-100 shadow-sm">
                                            <InputField
                                                label="HARGA JUAL PAKET (NET)"
                                                type="number"
                                                value={formData.ruleJson.fixedPrice}
                                                savedValue={lastSavedPromo?.ruleJson?.fixedPrice}
                                                isEditing={!!editingId}
                                                onChange={val => setFormData({
                                                    ...formData,
                                                    ruleJson: { ...formData.ruleJson, fixedPrice: val }
                                                })}
                                                className="text-3xl text-emerald-700 bg-white border-emerald-200"
                                                suffix="Rp"
                                            />
                                            <p className="text-[10px] text-emerald-600/60 font-bold mt-3">* Harga ini yang akan muncul di billing final.</p>
                                        </div>
                                    </div>

                                    {/* Right Col: Rules & Selection */}
                                    <div className="lg:col-span-7 space-y-8">
                                        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
                                            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-8 flex items-center gap-3">
                                                <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                                                ISI DALAM PAKET
                                            </h3>

                                            <div className="space-y-8">
                                                {/* Time Selection (if PACKAGE) */}
                                                {formData.type === 'PACKAGE' && (
                                                    <div className="animate-in fade-in duration-300">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                            <Timer className="w-4 h-4" /> DURASI BERMAIN (MENIT)
                                                        </label>
                                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                                            {[60, 120, 180, 240, 300].map(mins => (
                                                                <button
                                                                    key={mins}
                                                                    type="button"
                                                                    onClick={() => setFormData({
                                                                        ...formData,
                                                                        ruleJson: { ...formData.ruleJson, requireBilliardMinutes: mins }
                                                                    })}
                                                                    className={`py-3 rounded-xl border-2 font-black text-sm transition-all ${formData.ruleJson.requireBilliardMinutes === mins
                                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                                                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                                                >
                                                                    {mins / 60} JAM
                                                                </button>
                                                            ))}
                                                            <InputField
                                                                label="Custom Menit"
                                                                type="number"
                                                                value={formData.ruleJson.requireBilliardMinutes || ''}
                                                                savedValue={lastSavedPromo?.ruleJson?.requireBilliardMinutes}
                                                                isEditing={!!editingId}
                                                                onChange={val => setFormData({
                                                                    ...formData,
                                                                    ruleJson: { ...formData.ruleJson, requireBilliardMinutes: val }
                                                                })}
                                                                placeholder="Custom..."
                                                                suffix="MENIT"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Best Seller Rule */}
                                                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 animate-in fade-in duration-500">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                            <Zap className="w-4 h-4 text-amber-500" /> ATURAN MENU BEST SELLER
                                                        </label>
                                                        {bestSellers.length > 0 && (
                                                            <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-md">AUTO-RESOLVE AKTIF</span>
                                                        )}
                                                    </div>

                                                    <p className="text-[11px] text-slate-400 font-medium mb-6 italic leading-relaxed">
                                                        Bundle akan otomatis mengambil menu terpopuler (Best Seller) saat ini dari laporan penjualan 30 hari terakhir.
                                                    </p>

                                                    <div className="grid grid-cols-5 gap-3">
                                                        {[0, 1, 2, 3, 5].map(count => (
                                                            <button
                                                                key={count}
                                                                type="button"
                                                                onClick={() => setFormData({
                                                                    ...formData,
                                                                    ruleJson: { ...formData.ruleJson, bestSellerCount: count }
                                                                })}
                                                                className={`py-3 rounded-xl border-2 font-black text-sm transition-all ${formData.ruleJson.bestSellerCount === count
                                                                    ? 'bg-amber-500 border-amber-500 text-white shadow-md'
                                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                                            >
                                                                {count === 0 ? 'OFF' : `+${count}`}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {formData.ruleJson.bestSellerCount > 0 && (
                                                        <div className="mt-6 p-4 bg-white rounded-[1.25rem] border border-slate-200 animate-in slide-in-from-top-2">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Estimasi menu yang masuk:</p>
                                                            <div className="space-y-2">
                                                                {bestSellers.slice(0, formData.ruleJson.bestSellerCount).map((item, idx) => (
                                                                    <div key={idx} className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                                        {item.name}
                                                                        <span className="text-[9px] text-slate-300 font-medium">(~{item.totalSales} terjual)</span>
                                                                    </div>
                                                                ))}
                                                                {bestSellers.length === 0 && (
                                                                    <p className="text-[10px] text-slate-400 italic">Belum ada data best seller yang cukup.</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>


                                                {/* Menu Items Selection */}
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                        <Coffee className="w-4 h-4" /> MENU CAFE TERMASUK
                                                    </label>

                                                    <div className="flex flex-wrap gap-2 mb-6">
                                                        {formData.ruleJson.requireMenuItems.map(item => (
                                                            <div key={item.id} className="flex items-center gap-3 bg-white border-2 border-indigo-100 pl-4 pr-2 py-2 rounded-2xl shadow-sm animate-in zoom-in-95">
                                                                <span className="text-xs font-black text-slate-700">{item.name}</span>
                                                                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-2 py-1 border border-slate-100">
                                                                    <button type="button" onClick={() => updateMenuItemQty(item.id, item.quantity - 1)} className="text-slate-400 hover:text-indigo-600"><Minus className="w-3 h-3" /></button>
                                                                    <span className="text-xs font-black text-indigo-600 w-4 text-center">{item.quantity}</span>
                                                                    <button type="button" onClick={() => updateMenuItemQty(item.id, item.quantity + 1)} className="text-slate-400 hover:text-indigo-600"><Plus className="w-3 h-3" /></button>
                                                                </div>
                                                                <button type="button" onClick={() => removeMenuItemFromRule(item.id)} className="p-1.5 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-colors">
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {formData.ruleJson.requireMenuItems.length === 0 && (
                                                            <div className="w-full p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                                                                <p className="text-xs font-bold text-slate-400 italic">Belum ada menu yang ditambahkan.</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                                            <Search className="w-4 h-4 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                placeholder="Cari menu cafe..."
                                                                className="bg-transparent border-none outline-none text-xs font-bold w-full"
                                                                value={searchMenu}
                                                                onChange={e => setSearchMenu(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="max-h-64 overflow-y-auto p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 custom-scrollbar">
                                                            {filteredMenuItems.map(item => (
                                                                <button
                                                                    key={item.id}
                                                                    type="button"
                                                                    onClick={() => addMenuItemToRule(item)}
                                                                    className="flex items-center justify-between p-3 hover:bg-indigo-50 rounded-xl group transition-all text-left"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                                            {item.name.charAt(0)}
                                                                        </div>
                                                                        <span className="text-[11px] font-bold text-slate-600 group-hover:text-indigo-700">{item.name}</span>
                                                                    </div>
                                                                    <Plus className="w-3 h-3 text-slate-300 group-hover:text-indigo-600" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 md:p-10 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-4 bg-white flex-shrink-0 relative z-10">
                                <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); resetForm(); }} className="px-10 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all uppercase text-xs tracking-widest">Batalkan</button>
                                <button
                                    onClick={handleSave}
                                    type="button"
                                    className="px-12 py-5 bg-indigo-600 hover:bg-slate-900 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-sm tracking-[0.15em]"
                                >
                                    <Save className="w-5 h-5" /> {editingId ? 'Update Paket' : 'Aktifkan Promo Bundling'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Promo Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {promos.length === 0 ? (
                        <div className="col-span-full bg-white rounded-[3rem] p-32 text-center border-4 border-dashed border-slate-100">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                                <Gift className="w-12 h-12 text-slate-200" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Belum Tersedia Promo</h3>
                            <p className="text-slate-400 font-bold max-w-sm mx-auto">Mulai buat paket promosi pertama Anda untuk meningkatkan penjualan billiard & cafe.</p>
                        </div>
                    ) : (
                        promos.map(promo => (
                            <div key={promo.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 group hover:shadow-2xl hover:shadow-indigo-500/10 transition-all hover:-translate-y-2 relative overflow-hidden flex flex-col">
                                {/* Type Badge */}
                                <div className="flex justify-between items-start mb-8">
                                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${promo.type === 'PACKAGE' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}>
                                        {promo.type === 'PACKAGE' ? 'PAKET MEJA' : 'MENU BUNDLE'}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => startEdit(promo)} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(promo.id)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-2 flex-wrap mb-4">
                                    {promo.ruleJson?.badge ? (
                                        <span className="bg-rose-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                            {promo.ruleJson.badge}
                                        </span>
                                    ) : (
                                        promo.type === 'BUNDLE' && (
                                            <span className="bg-rose-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                                SPECIAL BUNDLE
                                            </span>
                                        )
                                    )}
                                    {promo.ruleJson?.requireBilliardMinutes > 0 && (
                                        <span className="bg-indigo-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                            {promo.ruleJson.requireBilliardMinutes / 60} JAM
                                        </span>
                                    )}
                                    {promo.ruleJson?.bestSellerCount > 0 && (
                                        <span className="bg-amber-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                            BEST SELLER
                                        </span>
                                    )}
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-2xl font-black text-slate-800 mb-2 truncate group-hover:text-indigo-600 transition-colors uppercase tracking-tighter">{promo.name}</h3>
                                    <p className="text-xs font-bold text-slate-400 line-clamp-2 h-8 italic">{promo.description || 'Syarat berlaku.'}</p>
                                </div>

                                <div className="mt-auto space-y-4">
                                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-3">
                                        {promo.type === 'PACKAGE' && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-indigo-100 text-indigo-500 shadow-sm">
                                                    <Timer className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-black text-slate-700 capitalize">{promo.ruleJson?.requireBilliardMinutes / 60} Jam Billiard</span>
                                            </div>
                                        )}
                                        {promo.ruleJson?.bestSellerCount > 0 && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-amber-100 text-amber-500 shadow-sm">
                                                    <Zap className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-black text-slate-700">+{promo.ruleJson.bestSellerCount} Menu Best Seller</span>
                                            </div>
                                        )}
                                        {promo.ruleJson?.requireMenuItems?.length > 0 && (

                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-emerald-100 text-emerald-500 shadow-sm shrink-0">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {promo.ruleJson.requireMenuItems.map((item: any, i: number) => (
                                                        <span key={i} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-md font-bold text-slate-500">
                                                            {item.quantity}x {item.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between px-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Harga Paket</span>
                                        <div className="text-2xl font-black text-emerald-600 tracking-tighter">
                                            Rp {Number(promo.ruleJson?.fixedPrice || 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Active toggle on card bottom? */}
                                <div className={`h-1.5 w-full absolute bottom-0 left-0 ${promo.isActive ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}


