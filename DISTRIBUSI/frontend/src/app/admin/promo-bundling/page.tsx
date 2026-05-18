'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Tag, Plus, Trash2, Edit3, Save, X, Check,
    Gift, Timer, Package, Search, AlertCircle,
    ChevronRight, ArrowLeft, Coffee, Info, DollarSign, Minus, Zap, ShieldOff,
    Target, Cpu, TrendingUp, BarChart3, RefreshCcw, Percent
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

import { useRouter } from 'next/navigation';
import InputField from '@/components/ui/InputField';
import { useAuth } from '@/context/AuthContext';


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
    const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [itemTrends, setItemTrends] = useState<Record<number, any[]>>({});

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
    const [searchLibrary, setSearchLibrary] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>('All');
    const [showItemLibrary, setShowItemLibrary] = useState(false);
    const [showCalculator, setShowCalculator] = useState(true); // Default show for UX
    const [calcSettings, setCalcSettings] = useState({
        billiardCostPerHour: 5000,
        targetCampaignProfit: 5000000,
        bundleDiscountPercent: 10,
    });

    const filteredMenuItems = menuItems.filter(item =>
        item.name.toLowerCase().includes(searchMenu.toLowerCase()) && !item.isSubRecipe
    );

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [promoRes, menuRes, pkgRes, bestRes, aiRes, trendRes] = await Promise.all([
                axios.get(`/admin/promos`),
                axios.get(`/cafe/menu`),
                axios.get(`/billiard/packages`),
                axios.get(`/reports/best-sellers`),
                axios.get(`/ai/suggested-bundles`),
                axios.get(`/reports/item-trends`)
            ]);
            setPromos(promoRes.data);
            setMenuItems(menuRes.data);
            setBilliardPackages(pkgRes.data);
            setBestSellers(bestRes.data);
            setAiSuggestions(aiRes.data);
            setItemTrends(trendRes.data);

        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name) return alert('Nama promo harus diisi');
        if (formData.ruleJson.fixedPrice <= 0) return alert('Harga paket harus lebih dari 0');

        const payload = {
            ...formData,
            estimatedHpp: metrics.totalHpp
        };

        try {
            if (editingId) {
                await axios.put(`/admin/promos/${editingId}`, payload);
            } else {
                await axios.post(`/admin/promos`, payload);
            }
            setIsAdding(false);
            setEditingId(null);
            resetForm();
            fetchData();
        } catch (error) {
            alert('Gagal menyimpan promo');
        }
    };

    const toggleActive = async (id: number, currentStatus: boolean) => {
        try {
            await axios.put(`/admin/promos/${id}`, { isActive: !currentStatus });
            fetchData();
        } catch (error) {
            alert('Gagal mengubah status promo');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus promo ini?')) return;
        try {
            await axios.delete(`/admin/promos/${id}`);
            fetchData();
        } catch (error) {
            alert('Gagal menghapus promo');
        }
    };

    const handleRecalibrate = async (id: number) => {
        try {
            await axios.post(`/admin/promos/${id}/recalibrate`);
            fetchData();
        } catch (error) {
            console.error('Calibration failed', error);
        }
    };

    const handleRecalibrateAll = async () => {
        if (!window.confirm('Sinkronisasi ulang statistik seluruh promo berdasarkan harga & HPP saat ini?')) return;
        try {
            await Promise.all(promos.map(p => axios.post(`/admin/promos/${p.id}/recalibrate`)));
            fetchData();
            alert('Semua statistik berhasil diperbarui!');
        } catch (error) {
            console.error('Bulk calibration failed', error);
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

    const applyAiSuggestion = (suggestion: any) => {
        setFormData({
            name: suggestion.name,
            type: 'PACKAGE',
            description: suggestion.reason,
            isActive: true,
            ruleJson: {
                requireBilliardMinutes: 0,
                requireMenuItems: suggestion.items,
                bestSellerCount: 0,
                badge: suggestion.type === 'TRENDING_PAIR' ? 'HOT COMBO' : 'CLEARANCE',
                fixedPrice: suggestion.suggestedPrice
            }
        });
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


    // --- CALCULATOR LOGIC ---
    const calculateBundleMetrics = () => {
        let totalHpp = 0;
        let normalPriceAtRetail = 0;
        const itemBreakdowns: any[] = [];

        // 1. Menu Items HPP
        formData.ruleJson.requireMenuItems.forEach(ruleItem => {
            const menu = menuItems.find(m => m.id === ruleItem.id);
            if (menu) {
                const hpp = Number(menu.productFinance?.baseHpp || 0);
                const retailPrice = Number(menu.price);
                totalHpp += hpp * ruleItem.quantity;
                normalPriceAtRetail += retailPrice * ruleItem.quantity;

                itemBreakdowns.push({
                    id: menu.id,
                    name: menu.name,
                    hpp,
                    retailPrice,
                    quantity: ruleItem.quantity
                });
            }
        });

        // 2. Billiard HPP (Electricity/Overhead)
        if (formData.type === 'PACKAGE' && formData.ruleJson.requireBilliardMinutes > 0) {
            const hours = formData.ruleJson.requireBilliardMinutes / 60;
            const hpp = hours * (calcSettings?.billiardCostPerHour || 5000);
            totalHpp += hpp;

            // Robust retail price: find REGULAR or use FIRST or use 50k fallback
            const pkg = billiardPackages.find(p => p.tableCategory === 'REGULAR') || billiardPackages[0];
            const basePrice = Number(pkg?.price || (pkg?.minutePrice ? pkg.minutePrice * 60 : 50000));
            const retailPrice = (basePrice / 60) * formData.ruleJson.requireBilliardMinutes;
            normalPriceAtRetail += retailPrice;

            itemBreakdowns.push({
                id: 'billiard',
                name: `Billiard (${formData.ruleJson.requireBilliardMinutes}m)`,
                hpp: hpp,
                retailPrice,
                quantity: 1
            });
        }

        const sellingPrice = Number(formData.ruleJson.fixedPrice || 0);
        const profitPerUnit = sellingPrice - totalHpp;
        const marginPercent = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0;
        const discountFromRetail = normalPriceAtRetail > 0 ? ((normalPriceAtRetail - sellingPrice) / normalPriceAtRetail) * 100 : 0;

        // Break-even and Target Volume
        const unitsToSellForTarget = profitPerUnit > 0 ? Math.ceil((calcSettings?.targetCampaignProfit || 0) / profitPerUnit) : 0;

        // Calculate item shares in bundle
        const itemsWithShares = itemBreakdowns.map(item => {
            const shareOfRetail = normalPriceAtRetail > 0 ? (item.retailPrice * item.quantity) / normalPriceAtRetail : 0;
            const bundlePriceShare = sellingPrice * shareOfRetail;
            const bundlePricePerPcs = item.quantity > 0 ? bundlePriceShare / item.quantity : 0;

            const profitNormal = item.retailPrice - item.hpp;
            const profitBundle = bundlePricePerPcs - item.hpp;
            const profitChange = profitBundle - profitNormal;

            return {
                ...item,
                bundlePricePerPcs,
                profitNormal,
                profitBundle,
                profitChange
            };
        });

        return {
            totalHpp,
            normalPriceAtRetail,
            profitPerUnit,
            marginPercent,
            discountFromRetail,
            unitsToSellForTarget,
            items: itemsWithShares
        };
    };

    const metrics = calculateBundleMetrics();

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
            <div className="max-w-7xl mx-auto">
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

                {/* GLOBAL DASHBOARD RIBBON */}
                {!isAdding && promos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Transaksi Promo</p>
                            <p className="text-2xl font-black text-slate-900">{promos.reduce((sum, p) => sum + (p.usageCount || 0), 0)}</p>
                            <div className="mt-2 h-1 w-12 bg-indigo-500 rounded-full" />
                        </div>
                        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Omset Promo</p>
                            <p className="text-2xl font-black text-emerald-600">Rp {promos.reduce((sum, p) => sum + Number(p.totalRevenueContribution || 0), 0).toLocaleString()}</p>
                            <div className="mt-2 h-1 w-12 bg-emerald-500 rounded-full" />
                        </div>
                        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Profit Bersih</p>
                            <p className="text-2xl font-black text-indigo-600">Rp {promos.reduce((sum, p) => sum + Number(p.totalProfitContribution || 0), 0).toLocaleString()}</p>
                            <div className="mt-2 h-1 w-12 bg-indigo-500 rounded-full" />
                        </div>
                        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm relative group/sync-all">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Top Performer</p>
                            <p className="text-sm font-black text-slate-900 truncate uppercase mt-1">
                                {promos.length > 0 ? [...promos].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))[0].name : '-'}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 mt-1">Paling banyak terjual</p>

                            <button
                                onClick={handleRecalibrateAll}
                                className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all opacity-0 group-hover/sync-all:opacity-100 shadow-lg flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
                            >
                                <RefreshCcw className="w-3 h-3" /> Sync All
                            </button>
                        </div>
                    </div>
                )}

                {/* AI SUGGESTION GALLERY */}
                {aiSuggestions.length > 0 && !isAdding && (
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                                <Cpu className="w-4 h-4 text-indigo-600" />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">AI Recommended Bundles</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {aiSuggestions.map((s) => (
                                <div key={s.id || `suggest-${s.name}`} className="bg-white rounded-3xl p-6 border border-slate-100 hover:border-indigo-100 transition-all hover:shadow-xl hover:shadow-indigo-500/5 group flex flex-col">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Zap className="w-24 h-24 text-indigo-600" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${s.type === 'TRENDING_PAIR' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                                                {s.type.replace('_', ' ')}
                                            </span>
                                            <span className="text-indigo-600 font-black text-sm">Rp {s.suggestedPrice.toLocaleString()}</span>
                                        </div>
                                        <h3 className="font-black text-slate-900 mb-2">{s.name}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold mb-4 line-clamp-2 leading-relaxed italic">"{s.reason}"</p>

                                        <div className="space-y-2 mb-6">
                                            {s.items.map((it: any, i: number) => (
                                                <div key={i} className="flex items-center gap-2 text-[10px] font-black text-slate-600">
                                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                                                    {it.quantity}x {it.name}
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => applyAiSuggestion(s)}
                                            className="w-full py-3 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-3 h-3" /> Create this Bundle
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ITEM LIBRARY MODAL */}
                {showItemLibrary && (
                    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" onClick={() => setShowItemLibrary(false)} />
                        <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                            {/* Header */}
                            <div className="p-8 border-b border-slate-100 flex flex-col gap-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Katalog Produk</h2>
                                        <p className="text-xs font-bold text-slate-400">Pilih item untuk ditambahkan ke bundle</p>
                                    </div>
                                    <button onClick={() => setShowItemLibrary(false)} className="p-4 bg-slate-50 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-2xl transition-all">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="relative group/search-lib">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within/search-lib:text-indigo-500 transition-all" />
                                    <input
                                        type="text"
                                        placeholder="Telusuri produk dalam katalog..."
                                        className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-[1.5rem] outline-none text-[11px] font-black transition-all shadow-inner"
                                        value={searchLibrary}
                                        onChange={e => setSearchLibrary(e.target.value)}
                                    />
                                    {searchLibrary && (
                                        <button
                                            onClick={() => setSearchLibrary('')}
                                            className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 font-black text-[9px] uppercase tracking-widest px-4"
                                        >
                                            Hapus
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {menuItems
                                        .filter(item => item.name.toLowerCase().includes(searchLibrary.toLowerCase()) && !item.isSubRecipe)
                                        .map(item => {
                                            const isSelected = formData.ruleJson.requireMenuItems.some(ri => ri.id === item.id);
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => addMenuItemToRule(item)}
                                                    className={`flex flex-col text-left group transition-all duration-300 ${isSelected ? 'scale-[0.98]' : 'hover:scale-[1.02]'}`}
                                                >
                                                    <div className={`relative aspect-square rounded-[2rem] overflow-hidden mb-3 border-4 transition-all ${isSelected ? 'border-indigo-600 ring-8 ring-indigo-50' : 'border-white shadow-lg group-hover:shadow-xl'}`}>
                                                        {item.imageUrl ? (
                                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-white flex items-center justify-center text-slate-100 font-black text-2xl uppercase tracking-tighter">
                                                                {item.name.substring(0, 2)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-8 border-t border-slate-100 bg-white flex justify-end">
                                <button
                                    onClick={() => setShowItemLibrary(false)}
                                    className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all"
                                >
                                    Selesai Memilih
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Editor Modal/Card */}
                {isAdding && (
                    <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 overscroll-contain animate-in fade-in duration-300">
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => { setIsAdding(false); setEditingId(null); resetForm(); }} />
                        <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-7xl shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-full sm:zoom-in duration-500 overflow-hidden flex flex-col max-h-[95vh]">
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
                                    <div className="lg:col-span-4 space-y-8">
                                        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
                                            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-8 flex items-center gap-3">
                                                <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                                                INFORMASI DASAR
                                            </h3>
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
                                                    label="Badge / Label Promo"
                                                    value={formData.ruleJson.badge}
                                                    savedValue={lastSavedPromo?.ruleJson?.badge}
                                                    isEditing={!!editingId}
                                                    onChange={val => setFormData({
                                                        ...formData,
                                                        ruleJson: { ...formData.ruleJson, badge: val }
                                                    })}
                                                    placeholder="Misal: TERLARIS, HEMAT"
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                                            <div className="flex items-center gap-3 mb-6">
                                                <Target className="w-5 h-5 text-indigo-400" />
                                                <p className="text-[11px] font-black uppercase tracking-widest text-white/80">Target Profit Campaign</p>
                                            </div>
                                            <input
                                                type="number"
                                                value={calcSettings.targetCampaignProfit}
                                                onChange={e => setCalcSettings({ ...calcSettings, targetCampaignProfit: Number(e.target.value) })}
                                                className="w-full bg-transparent border-none outline-none text-2xl font-black text-white mb-2"
                                                placeholder="Target untung..."
                                            />
                                            <div className="mb-6 space-y-4">
                                                <div>
                                                    <p className="text-[9px] font-black text-indigo-200 uppercase mb-2">Saran Diskon Bundle (%)</p>
                                                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 transition-all">
                                                        <Percent className="w-3 h-3 text-indigo-400" />
                                                        <input
                                                            type="number"
                                                            value={calcSettings.bundleDiscountPercent}
                                                            onChange={e => setCalcSettings({ ...calcSettings, bundleDiscountPercent: Number(e.target.value) })}
                                                            className="bg-transparent border-none outline-none text-sm font-black w-full text-white"
                                                            placeholder="Misal: 15"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-indigo-600 rounded-2xl">
                                                    <p className="text-[9px] font-black text-indigo-200 uppercase mb-1">Target Penjualan Minimum</p>
                                                    <p className="text-xl font-black">{metrics.unitsToSellForTarget} Paket</p>
                                                </div>
                                            </div>

                                            <div className="mt-8 pt-8 border-t border-white/10">
                                                <p className="text-[9px] font-bold text-white/40 uppercase mb-4">Estimasi Operasional / Jam</p>
                                                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                                                    <span className="text-xs text-white/40">Rp</span>
                                                    <input
                                                        type="number"
                                                        value={calcSettings.billiardCostPerHour}
                                                        onChange={e => setCalcSettings({ ...calcSettings, billiardCostPerHour: Number(e.target.value) })}
                                                        className="bg-transparent border-none outline-none text-xs font-black w-full"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Col: 2-Step Workflow */}
                                    <div className="lg:col-span-8 space-y-8">
                                        {/* LANGKAH 1 */}
                                        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-200 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-14 h-14 bg-indigo-600 rounded-br-[2rem] flex items-center justify-center text-white font-black text-lg shadow-xl shadow-indigo-100">
                                                1
                                            </div>
                                            <div className="ml-12">
                                                <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight mb-8">Pilih Item & Harga</h3>

                                                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                                                    {/* LEFT COLUMN: Selected Items & Price (Col 5) */}
                                                    <div className="xl:col-span-5 flex flex-col gap-8">
                                                        {/* Time Selection */}
                                                        {formData.type === 'PACKAGE' && (
                                                            <div className="animate-in fade-in duration-300">
                                                                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                                    <Timer className="w-4 h-4" /> DURASI BERMAIN (MENIT)
                                                                </label>
                                                                <div className="grid grid-cols-3 gap-2">
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
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Selected Items List */}
                                                        <div className="flex flex-col gap-4">
                                                            <div className="flex justify-between items-center">
                                                                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Isi Paket (pcs)</label>
                                                                {formData.ruleJson.requireMenuItems.length > 0 && (
                                                                    <button
                                                                        onClick={() => setFormData({ ...formData, ruleJson: { ...formData.ruleJson, requireMenuItems: [] } })}
                                                                        className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-colors"
                                                                    >
                                                                        Kosongkan
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                                                {formData.ruleJson.requireMenuItems.length === 0 ? (
                                                                    <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-8 text-center bg-slate-50/50">
                                                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-loose">
                                                                            Klik produk di samping<br />untuk menambah
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    formData.ruleJson.requireMenuItems.map(ruleItem => {
                                                                        const menu = menuItems.find(m => m.id === ruleItem.id);
                                                                        return (
                                                                            <div key={ruleItem.id} className="group relative bg-white p-3 rounded-2xl border-2 border-slate-100 hover:border-indigo-100 transition-all shadow-sm">
                                                                                <div className="flex gap-3 items-center">
                                                                                    <div className="w-10 h-10 rounded-lg bg-slate-50 overflow-hidden flex-shrink-0 border border-slate-100">
                                                                                        {menu?.imageUrl ? (
                                                                                            <img src={menu.imageUrl} alt={ruleItem.name} className="w-full h-full object-cover" />
                                                                                        ) : (
                                                                                            <div className="w-full h-full flex items-center justify-center text-slate-200 uppercase font-black text-[10px]">
                                                                                                {ruleItem.name.substring(0, 2)}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <p className="font-black text-slate-800 text-xs leading-tight mb-0.5">{ruleItem.name}</p>
                                                                                        <p className="text-[10px] font-bold text-slate-400">Rp {Math.round(menu?.price || 0).toLocaleString()}</p>
                                                                                    </div>
                                                                                    <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200 scale-90 origin-right">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => updateMenuItemQty(ruleItem.id, ruleItem.quantity - 1)}
                                                                                            className="w-7 h-7 flex items-center justify-center hover:bg-white hover:text-indigo-600 rounded-md text-slate-400 transition-all"
                                                                                        >
                                                                                            <Minus className="w-3 h-3" />
                                                                                        </button>
                                                                                        <span className="w-6 text-center font-black text-slate-700 text-[11px]">{ruleItem.quantity}</span>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => updateMenuItemQty(ruleItem.id, ruleItem.quantity + 1)}
                                                                                            className="w-7 h-7 flex items-center justify-center hover:bg-white hover:text-indigo-600 rounded-md text-slate-700 transition-all"
                                                                                        >
                                                                                            <Plus className="w-3 h-3" />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Price Configuration */}
                                                        <div className="bg-emerald-50 rounded-[2rem] p-6 border border-emerald-100 mt-auto">
                                                            <div className="space-y-4">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <label className="text-xs font-black text-emerald-600 uppercase tracking-widest block">Harga Jual Paket (Rp)</label>
                                                                    {metrics.totalHpp > 0 && (
                                                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight ${metrics.profitPerUnit > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                                            <div className={`w-1.5 h-1.5 rounded-full ${metrics.profitPerUnit > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                                                            {metrics.profitPerUnit > 0 ? `Cuan Rp ${Math.round(metrics.profitPerUnit).toLocaleString()}` : `Rugi Rp ${Math.abs(Math.round(metrics.profitPerUnit)).toLocaleString()}`}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="relative group/price">
                                                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-xl">Rp</div>
                                                                    <input
                                                                        type="number"
                                                                        value={formData.ruleJson.fixedPrice}
                                                                        onChange={e => setFormData({ ...formData, ruleJson: { ...formData.ruleJson, fixedPrice: Number(e.target.value) } })}
                                                                        className="w-full bg-white border-2 border-emerald-200 rounded-2xl pl-14 pr-4 py-3 text-xl font-black text-emerald-700 outline-none focus:border-emerald-400 transition-all shadow-sm"
                                                                    />
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        // Suggested Harga is dynamic discount from Total Retail Price
                                                                        const discountFactor = (100 - Number(calcSettings.bundleDiscountPercent || 0)) / 100;
                                                                        const suggested = Math.ceil((metrics.normalPriceAtRetail * discountFactor) / 1000) * 1000;
                                                                        setFormData({ ...formData, ruleJson: { ...formData.ruleJson, fixedPrice: suggested } });
                                                                    }}
                                                                    className="w-full py-4 bg-emerald-600 hover:bg-slate-900 transition-all text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-emerald-200 active:scale-95"
                                                                >
                                                                    <Zap className="w-3.5 h-3.5" /> Sugest Harga Aman
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* RIGHT COLUMN: Product Gallery (Col 7) */}
                                                    <div className="xl:col-span-7 flex flex-col h-[600px] bg-slate-50/50 rounded-[2rem] border border-slate-100 overflow-hidden">
                                                        <div className="p-5 md:p-6 border-b border-slate-50 bg-white/50 backdrop-blur-sm sticky top-0 z-20 flex flex-col gap-5">
                                                            <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar scroll-smooth whitespace-nowrap px-1">
                                                                {Array.from(new Set(['All', ...menuItems.map(m => typeof m.category === 'object' ? m.category?.name : m.category).filter(Boolean)])).map((cat: any) => {
                                                                    const isSelected = selectedCategory === cat;
                                                                    return (
                                                                        <button
                                                                            key={String(cat)}
                                                                            onClick={() => setSelectedCategory(cat)}
                                                                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                                                        >
                                                                            {cat}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            <div className="relative group/search-promo">
                                                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within/search-promo:text-indigo-600 transition-all" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Cepat cari menu..."
                                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-xl outline-none text-[11px] font-black transition-all"
                                                                    value={searchMenu}
                                                                    onChange={e => setSearchMenu(e.target.value)}
                                                                />
                                                                {searchMenu && (
                                                                    <button
                                                                        onClick={() => setSearchMenu('')}
                                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                                {menuItems
                                                                    .filter(item => {
                                                                        const itemCat = typeof item.category === 'object' ? item.category?.name : item.category;
                                                                        const matchesCategory = selectedCategory === 'All' || itemCat === selectedCategory;
                                                                        const matchesSearch = item.name.toLowerCase().includes(searchMenu.toLowerCase());
                                                                        return matchesCategory && matchesSearch;
                                                                    })
                                                                    .map(item => {
                                                                        const ruleItem = formData.ruleJson.requireMenuItems.find(ri => ri.id === item.id);
                                                                        const quantity = ruleItem?.quantity || 0;

                                                                        return (
                                                                            <button
                                                                                key={item.id}
                                                                                onClick={() => addMenuItemToRule(item)}
                                                                                className={`relative group flex flex-col text-left transition-all duration-300 active:scale-95 ${quantity > 0 ? 'scale-[0.98]' : 'hover:scale-[1.02]'}`}
                                                                            >
                                                                                <div className={`relative aspect-square rounded-2xl overflow-hidden mb-2 border-4 transition-all ${quantity > 0 ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-md' : 'border-white shadow-sm group-hover:shadow-md group-hover:border-indigo-100'}`}>
                                                                                    {item.imageUrl ? (
                                                                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                                                    ) : (
                                                                                        <div className="w-full h-full bg-white flex items-center justify-center text-slate-100 font-black text-xl uppercase tracking-tighter">
                                                                                            {item.name.substring(0, 2)}
                                                                                        </div>
                                                                                    )}

                                                                                    {quantity > 0 && (
                                                                                        <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center">
                                                                                            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-lg border-2 border-white animate-in zoom-in duration-300">
                                                                                                {quantity}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="px-1 mt-1">
                                                                                    <p className="font-black text-slate-800 text-[10px] uppercase leading-tight line-clamp-1">{item.name}</p>
                                                                                    <div className="flex justify-between items-center mt-1">
                                                                                        <p className="text-[9px] font-bold text-slate-400">Rp {Math.round(item.price || 0).toLocaleString()}</p>
                                                                                        {item.stockQuantity !== undefined && (
                                                                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${Number(item.stockQuantity) <= 0 ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'}`}>
                                                                                                {Math.round(item.stockQuantity)}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </button>
                                                                        );
                                                                    })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* LANGKAH 2 */}
                                        {(formData.ruleJson.requireMenuItems.length > 0 || (formData.type === 'PACKAGE' && formData.ruleJson.requireBilliardMinutes > 0)) && (
                                            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-200 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                                                <div className="absolute top-0 left-0 w-14 h-14 bg-emerald-600 rounded-br-[2rem] flex items-center justify-center text-white font-black text-lg shadow-xl shadow-emerald-100">
                                                    2
                                                </div>
                                                <div className="ml-12">
                                                    <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight mb-8">Hasil Cek Promo</h3>

                                                    <div className="flex gap-3 items-center text-slate-500 mb-8 bg-amber-50 p-4 rounded-2xl border border-amber-100">
                                                        <Info className="w-5 h-5 text-amber-500" />
                                                        <p className="text-[11px] font-bold leading-relaxed">
                                                            Info: Harga aman minimal dihitung otomatis dengan memberi **diskon {calcSettings.bundleDiscountPercent}%** dari total harga jual satuan.
                                                        </p>
                                                    </div>

                                                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white mb-10 shadow-2xl relative overflow-hidden border-4 border-slate-800">
                                                        <div className="absolute top-0 right-0 p-8 opacity-10">
                                                            <Cpu className="w-16 h-16" />
                                                        </div>
                                                        <div className="flex flex-wrap justify-between items-end gap-6 relative z-10">
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">RINGKASAN PAKET BUNDLING</p>
                                                                <div className="flex items-center gap-4">
                                                                    <p className="text-3xl font-black">Rp {Number(formData.ruleJson.fixedPrice || 0).toLocaleString()}</p>
                                                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${metrics.profitPerUnit > 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                                        {metrics.profitPerUnit > 0 ? 'MASIH CUAN' : 'RUGI'}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[10px] text-white/40 font-bold">Total modal (HPP) paket:</p>
                                                                    <p className="text-[10px] text-white/80 font-black">Rp {Math.round(metrics.totalHpp).toLocaleString()}</p>
                                                                </div>
                                                            </div>

                                                            <div className="text-right space-y-1">
                                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Untung bersih paket</p>
                                                                <p className={`text-3xl font-black ${metrics.profitPerUnit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                    Rp {Math.round(metrics.profitPerUnit).toLocaleString()}
                                                                </p>
                                                                <div className="flex items-center justify-end gap-2 text-indigo-200">
                                                                    <p className="text-[10px] font-bold uppercase tracking-widest">Target untung</p>
                                                                    <p className="text-xs font-black">
                                                                        {metrics.totalHpp > 0 ? (metrics.profitPerUnit / metrics.totalHpp).toFixed(1) : 0}x
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr className="border-b-2 border-slate-100">
                                                                    <th className="pb-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Produk</th>
                                                                    <th className="pb-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Banding Harga</th>
                                                                    <th className="pb-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Perubahan Untung/pcs</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {metrics.items.map((item: any) => (
                                                                    <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                                                                        <td className="py-6 pr-4">
                                                                            <p className="font-black text-slate-800 mb-1">{item.name}</p>
                                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">HPP: Rp {item.hpp.toLocaleString()}</p>
                                                                        </td>
                                                                        <td className="py-6 px-4">
                                                                            <div className="flex flex-col gap-1.5 max-w-[150px] mx-auto">
                                                                                <div className="flex justify-between items-center bg-slate-100 px-3 py-1 rounded-lg">
                                                                                    <span className="text-[9px] font-black text-slate-400 uppercase">Tanpa promo</span>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="w-16 h-8 opacity-60">
                                                                                            <ResponsiveContainer width="100%" height={24} minWidth={40} minHeight={20}>
                                                                                                <AreaChart data={itemTrends[item.id] || []} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                                                                                    <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#6366f1" strokeWidth={1.5} />
                                                                                                </AreaChart>
                                                                                            </ResponsiveContainer>
                                                                                        </div>
                                                                                        <span className="text-[10px] font-black text-slate-500">Rp {item.retailPrice.toLocaleString()}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex justify-between items-center bg-indigo-50 px-3 py-1 rounded-lg">
                                                                                    <span className="text-[9px] font-black text-indigo-400 uppercase">Dengan promo</span>
                                                                                    <span className="text-[10px] font-black text-indigo-600">Rp {Math.round(item.bundlePricePerPcs).toLocaleString()}</span>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-6 pl-4 text-right">
                                                                            <p className={`font-black text-sm mb-1 ${item.profitChange < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                                                {item.profitChange < 0 ? 'Turun' : 'Naik'} Rp {Math.abs(Math.round(item.profitChange)).toLocaleString()}
                                                                            </p>
                                                                            <p className="text-[10px] text-slate-300 font-bold leading-tight">untung per pcs dibanding tanpa promo</p>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
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
                                    <div className="flex items-center gap-3">
                                        <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${promo.type === 'PACKAGE' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}>
                                            {promo.type === 'PACKAGE' ? 'PAKET MEJA' : 'MENU BUNDLE'}
                                        </div>
                                        <button
                                            onClick={() => toggleActive(promo.id, promo.isActive)}
                                            className={`w-10 h-5 rounded-full relative transition-all ${promo.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${promo.isActive ? 'right-1' : 'left-1'}`} />
                                        </button>
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

                                <div className="mb-4">
                                    <h3 className="text-2xl font-black text-slate-800 mb-2 truncate group-hover:text-indigo-600 transition-colors uppercase tracking-tighter">{promo.name}</h3>
                                    <p className="text-xs font-bold text-slate-400 line-clamp-2 h-8 italic">{promo.description || 'Syarat berlaku.'}</p>
                                </div>

                                {/* Promo Stats Ribbon */}
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-[8px] font-black text-slate-400 uppercase">Total Terjual</p>
                                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                                        </div>
                                        <p className="text-sm font-black text-slate-700">{promo.usageCount || 0} Terpakai</p>

                                        {/* Sparkline overlay */}
                                        <div className="absolute inset-x-0 bottom-0 h-8 opacity-30">
                                            <ResponsiveContainer width="100%" height={32} minWidth={100} minHeight={32}>
                                                <AreaChart data={promo.weeklyTrend || []} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                                    <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#6366f1" strokeWidth={2} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 relative overflow-hidden group/eff">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter">ROI / Efektivitas</p>
                                            <div className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-lg">
                                                {promo.totalRevenueContribution > 0 ? (Math.round((promo.totalProfitContribution / promo.totalRevenueContribution) * 100)) : 0}%
                                            </div>
                                        </div>
                                        <p className="text-[11px] font-black text-emerald-700">Rp {Math.round(promo.totalRevenueContribution || 0).toLocaleString()}</p>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRecalibrate(promo.id);
                                            }}
                                            title="Kalibrasi Ulang Statistik"
                                            className="absolute bottom-1 right-1 p-1 bg-white/50 rounded-md opacity-0 group-hover/eff:opacity-100 transition-all hover:bg-indigo-600 hover:text-white"
                                        >
                                            <RefreshCcw className="w-2 h-2" />
                                        </button>

                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-200">
                                            <div
                                                className="h-full bg-emerald-500 transition-all duration-1000"
                                                style={{ width: `${Math.min(100, (promo.usageCount / 10) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
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
                                                <div className="flex flex-wrap gap-2">
                                                    {promo.ruleJson.requireMenuItems.map((item: any) => (
                                                        <div key={item.id || item.menuItemId || `rule-${item.name}`} className="flex items-center gap-1.5 bg-white border border-slate-100 pl-2 pr-1 py-1 rounded-lg shadow-sm group/item">
                                                            <span className="text-[10px] font-black text-slate-700">
                                                                {item.quantity}x {item.name}
                                                            </span>
                                                            <div className="w-12 h-4 opacity-70 bg-slate-50/50 rounded flex items-center justify-center overflow-hidden">
                                                                <ResponsiveContainer width="100%" height={16} minWidth={30} minHeight={12}>
                                                                    <AreaChart data={item.weeklyTrend || []} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                                                        <Area type="monotone" dataKey="count" stroke="#10b981" fill="#10b981" strokeWidth={1.5} />
                                                                    </AreaChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between px-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Harga Paket</span>
                                        <div className="text-2xl font-black text-emerald-600 tracking-tighter">
                                            Rp {Math.round(promo.ruleJson?.fixedPrice || 0).toLocaleString()}
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


