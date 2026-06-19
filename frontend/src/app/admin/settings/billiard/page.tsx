'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit2, Tag, Clock, Save, DollarSign, List, ShieldCheck, Timer, Info, AlertCircle, CalendarOff, CalendarDays, CheckCircle2, Calendar, FileSpreadsheet } from 'lucide-react';
import InputField from '@/components/ui/InputField';
import { ImportTarifModal } from './ImportTarifModal';

const DAYS_OPTIONS = [
    { value: 'MON', label: 'Sen', full: 'Senin' },
    { value: 'TUE', label: 'Sel', full: 'Selasa' },
    { value: 'WED', label: 'Rab', full: 'Rabu' },
    { value: 'THU', label: 'Kam', full: 'Kamis' },
    { value: 'FRI', label: 'Jum', full: "Jum'at" },
    { value: 'SAT', label: 'Sab', full: 'Sabtu' },
    { value: 'SUN', label: 'Min', full: 'Minggu' },
];

// import { API_URL } from '@/utils/urlUtils';

export default function BilliardPricingPage() {
    const [packages, setPackages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPackageId, setEditingPackageId] = useState<number | null>(null);
    const [validDays, setValidDays] = useState<string[]>([]); // ✅ NEW: hari berlaku paket
    const [formData, setFormData] = useState<{
        name: string;
        type: string;
        tableCategory: 'REGULAR' | 'VIP' | 'PS_REGULAR' | 'PS_VIP';
        durationMinutes: number;
        price: number;
        timeSlots?: { start: string; end: string; price: number; validDays?: string[] }[];
    }>({
        name: '',
        type: 'hourly',
        tableCategory: 'REGULAR',
        durationMinutes: 120,
        price: 0,
        timeSlots: [],
    });

    const [globalSettings, setGlobalSettings] = useState<any>(null);
    const [lastSavedGlobalSettings, setLastSavedGlobalSettings] = useState<any>(null);
    const [lastSavedPackage, setLastSavedPackage] = useState<any>(null);
    const [savingGlobal, setSavingGlobal] = useState(false);
    const [activeTab, setActiveTab] = useState<number | null>(null);
    const [activePackageTab, setActivePackageTab] = useState<string>('ALL');
    const [categories, setCategories] = useState<any[]>([]);
    const [showImportModal, setShowImportModal] = useState(false);
    
    // Timer to track current time for active slot highlighting
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const isSlotActive = (startStr: string, endStr: string) => {
        if (!startStr || !endStr) return false;
        const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
        const [startH, startM] = startStr.split(':').map(Number);
        const [endH, endM] = endStr.split(':').map(Number);
        
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;

        if (startTotal < endTotal) {
            return currentMinutes >= startTotal && currentMinutes < endTotal;
        } else {
            // Crosses midnight
            return currentMinutes >= startTotal || currentMinutes < endTotal;
        }
    };

    const fetchGlobalSettings = async () => {
        try {
            const res = await axios.get(`/settings`);
            setGlobalSettings(res.data);
            setLastSavedGlobalSettings(res.data);
        } catch (err) {
            console.error('Fetch global settings failed:', err);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await axios.get('/categories');
            const cats = res.data;
            setCategories(cats);
            const billiardCats = cats.filter((c:any) => c.isActive && (c.assetType === 'BILLIARD' || c.assetType === 'PLAYSTATION'));
            if (billiardCats.length > 0) {
                setActiveTab(billiardCats[0].id);
            }
        } catch(err) {}
    };

    const fetchPackages = async () => {
        try {
            const res = await axios.get(`/billiard/packages`);
            setPackages(res.data);
        } catch (err) {
            console.error('Fetch packages failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPackages();
        fetchGlobalSettings();
        fetchCategories();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const selectedCategory = categories.find(c => c.name === formData.tableCategory);
            const dataToSubmit = {
                ...formData,
                categoryId: selectedCategory ? selectedCategory.id : null,
                // ✅ NEW: kirim validDays — array kosong = berlaku setiap hari
                validDays: validDays.length > 0 ? validDays : null,
            };

            if (editingPackageId) {
                await axios.patch(`/billiard/packages/${editingPackageId}`, dataToSubmit);
                alert('Paket berhasil diperbarui!');
            } else {
                await axios.post(`/billiard/packages`, dataToSubmit);
                alert('Paket berhasil ditambahkan!');
            }
            fetchPackages();
            resetForm();
        } catch (err) {
            console.error(err);
            alert('Gagal menyimpan paket.');
        }
    };

    const resetForm = () => {
        setEditingPackageId(null);
        setLastSavedPackage(null);
        setValidDays([]); // ✅ Reset hari berlaku
        setFormData({
            name: '',
            type: formData.type,
            tableCategory: 'REGULAR',
            durationMinutes: 120,
            price: 0,
            timeSlots: []
        });
    };

    const handleEditPackage = (pkg: any) => {
        setEditingPackageId(pkg.id);
        const categoryObj = categories.find(c => c.id === pkg.categoryId);
        const catName = categoryObj ? categoryObj.name : (pkg.tableCategory || 'REGULAR');
        const mappedData = {
            name: pkg.name,
            type: pkg.type === 'PLAYTIME' ? 'hourly' : (pkg.type === 'DURATION' ? 'fixed' : (pkg.type === 'hourly' ? 'hourly' : 'fixed')),
            tableCategory: catName,
            durationMinutes: pkg.durationMinutes || 120,
            price: Number(pkg.price),
            timeSlots: pkg.timeSlots || []
        };
        setFormData(mappedData);
        setLastSavedPackage(mappedData);
        // ✅ NEW: Load validDays saat edit
        setValidDays(Array.isArray(pkg.validDays) && pkg.validDays.length > 0 ? pkg.validDays : []);
    };

    const handleDeletePackage = async (id: number) => {
        if (!confirm('Yakin ingin menghapus paket ini?')) return;
        try {
            await axios.delete(`/billiard/packages/${id}`);
            fetchPackages();
            alert('Paket berhasil dihapus!');
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Gagal menghapus paket.');
        }
    };

    const addTimeSlot = () => {
        const slots = formData.timeSlots || [];
        setFormData({ ...formData, timeSlots: [...slots, { start: '00:00', end: '00:00', price: 0 }] });
    };

    const removeTimeSlot = (index: number) => {
        const slots = [...(formData.timeSlots || [])];
        slots.splice(index, 1);
        setFormData({ ...formData, timeSlots: slots });
    };

    const updateTimeSlot = (index: number, field: string, value: any) => {
        const slots = [...(formData.timeSlots || [])];
        (slots[index] as any)[field] = value;
        setFormData({ ...formData, timeSlots: slots });
    };

    const getActiveRate = (config: any) => {
        if (!config) return 0;
        const now = new Date();
        const timeVal = now.getHours() * 60 + now.getMinutes();

        if (config.timeSlots && config.timeSlots.length > 0) {
            for (const slot of config.timeSlots) {
                const [sH, sM] = slot.start.split(':').map(Number);
                const [eH, eM] = slot.end.split(':').map(Number);
                const startVal = sH * 60 + sM;
                const endVal = eH * 60 + eM;

                let isMatch = false;
                if (endVal < startVal) { // Crossover
                    if (timeVal >= startVal || timeVal < endVal) isMatch = true;
                } else {
                    if (timeVal >= startVal && timeVal < endVal) isMatch = true;
                }

                if (isMatch) return Number(slot.price);
            }
        }
        return 0;
    };

    const isAnySlotActive = (config: any) => {
        if (!config || !config.timeSlots || config.timeSlots.length === 0) return false;
        const now = new Date();
        const timeVal = now.getHours() * 60 + now.getMinutes();

        for (const slot of config.timeSlots) {
            const [sH, sM] = slot.start.split(':').map(Number);
            const [eH, eM] = slot.end.split(':').map(Number);
            const startVal = sH * 60 + sM;
            const endVal = eH * 60 + eM;

            if (endVal < startVal) { // Crossover
                if (timeVal >= startVal || timeVal < endVal) return true;
            } else {
                if (timeVal >= startVal && timeVal < endVal) return true;
            }
        }
        return false;
    };

    const handleSaveGlobal = async () => {
        setSavingGlobal(true);
        try {
            await axios.patch(`/settings`, {
                customPricingDynamic: globalSettings.customPricingDynamic,
            });
            setLastSavedGlobalSettings(globalSettings);
            alert('Konfigurasi harga manual berhasil disimpan!');
        } catch (err) {
            console.error(err);
            alert('Gagal menyimpan konfigurasi.');
        } finally {
            setSavingGlobal(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 lg:p-12 text-slate-900">
            {/* Import Modal */}
            <ImportTarifModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSuccess={() => { fetchPackages(); setShowImportModal(false); }}
            />

            {/* Hero Header */}
            <header className="mb-12 max-w-7xl mx-auto">
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12" />
                    <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <DollarSign className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Game Tariffs Configuration</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Pengaturan Harga</h1>
                            <p className="text-white/60 text-sm font-semibold mt-1">Kelola kategori meja, tipe bermain, dan aturan tarif waktu reguler maupun VIP.</p>
                        </div>
                        {/* Import Button in Header */}
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="flex items-center gap-3 px-6 py-3.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 rounded-2xl text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Import dari Excel
                        </button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
                {/* Global Custom Duration Section */}
                <div className="lg:col-span-12">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col xl:flex-row gap-10">
                        <div className="xl:w-1/4 space-y-4">
                            <div className="p-4 bg-amber-500 rounded-2xl text-white w-fit mb-6">
                                <Timer className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 mb-2">Set Durasi Manual</h2>
                            <p className="text-slate-500 font-medium text-sm leading-relaxed">
                                Atur tarif dasar dan slot waktu khusus untuk sesi yang dimulai tanpa paket (Custom Duration).
                                Pengaturan ini berlaku secara global saat operator memasukkan menit secara manual.
                            </p>
                        </div>

                        <div className="xl:flex-1 space-y-10">
                            {/* Status Alert for Schedule Gaps */}
                                                        {/* TAB NAVIGATION */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {categories.filter((c:any) => c.isActive && (c.assetType === 'BILLIARD' || c.assetType === 'PLAYSTATION')).map((cat:any) => {
                                    let activeClass = 'bg-indigo-600 text-white shadow-indigo-200 border-indigo-600';
                                    if (cat.name.toLowerCase().includes('vip') && cat.assetType === 'BILLIARD') activeClass = 'bg-purple-600 text-white shadow-purple-200 border-purple-600';
                                    if (cat.assetType === 'PLAYSTATION') activeClass = 'bg-blue-600 text-white shadow-blue-200 border-blue-600';
                                    if (cat.name.toLowerCase().includes('vip') && cat.assetType === 'PLAYSTATION') activeClass = 'bg-violet-600 text-white shadow-violet-200 border-violet-600';

                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveTab(cat.id)}
                                            className={`px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all ${
                                                activeTab === cat.id ? activeClass + ' shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50 border-2 border-slate-100 hover:border-slate-300'
                                            }`}
                                        >
                                            {cat.name}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* TAB CONTENT */}
                            <div className="bg-white border border-slate-100 p-6 xl:p-8 rounded-[2rem] shadow-sm animate-in fade-in duration-300">
                                {(() => {
                                    if (!activeTab) return null;
                                    const activeCategory = categories.find(c => c.id === activeTab);
                                    if (!activeCategory) return null;

                                    let theme = 'indigo'; let dotColor = 'bg-indigo-500';
                                    if (activeCategory.name.toLowerCase().includes('vip') && activeCategory.assetType === 'BILLIARD') { theme = 'purple'; dotColor = 'bg-purple-500'; }
                                    if (activeCategory.assetType === 'PLAYSTATION') { theme = 'blue'; dotColor = 'bg-blue-500'; }
                                    if (activeCategory.name.toLowerCase().includes('vip') && activeCategory.assetType === 'PLAYSTATION') { theme = 'violet'; dotColor = 'bg-violet-500'; }
                                    
                                    const title = `Meja ${activeCategory.name}`;
                                    
                                    // Make sure customPricingDynamic is an array
                                    const dynamicConfigs = globalSettings?.customPricingDynamic || [];
                                    let config = dynamicConfigs.find((c: any) => c.categoryId === activeTab);
                                    if (!config) {
                                        config = { categoryId: activeTab, basePrice: 0, timeSlots: [] };
                                    }

                                    const setConfig = (newC: any) => {
                                        const newDynamicConfigs = [...(globalSettings?.customPricingDynamic || [])];
                                        const index = newDynamicConfigs.findIndex((c: any) => c.categoryId === activeTab);
                                        if (index >= 0) {
                                            newDynamicConfigs[index] = { ...newC, categoryId: activeTab };
                                        } else {
                                            newDynamicConfigs.push({ ...newC, categoryId: activeTab });
                                        }
                                        setGlobalSettings({ ...globalSettings, customPricingDynamic: newDynamicConfigs });
                                    };

                                    return (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                                                <div className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`}></div>
                                                <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">{title}</h3>
                                                {isAnySlotActive(config) ? (
                                                    <div className="ml-auto bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                        AKTIF: Rp {getActiveRate(config).toLocaleString()}
                                                    </div>
                                                ) : (
                                                    <div className="ml-auto bg-rose-50 border border-rose-100 text-rose-600 px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5">
                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                        SLOT TIDAK DITEMUKAN
                                                    </div>
                                                )}
                                            </div>

                                            {/* Base Price */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-2 ml-1">
                                                    <DollarSign className={`w-3.5 h-3.5 text-${theme}-500`} />
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tarif Dasar Per Jam</span>
                                                </div>
                                                <InputField
                                                    label=""
                                                    type="number"
                                                    className={`w-full max-w-xs pl-7 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-xl font-black text-sm outline-none border border-slate-200 focus:border-${theme}-400 transition-all`}
                                                    value={config?.basePrice || 0}
                                                    isEditing={true}
                                                    onChange={(val) => setConfig({ ...(config || {timeSlots:[]}), basePrice: Number(val) || 0 })}
                                                />
                                            </div>

                                            {/* Time Slots */}
                                            <div className="pt-4 border-t border-slate-100">
                                                <div className="flex justify-between items-center px-1 mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className={`w-4 h-4 text-${theme}-600`} />
                                                        <label className="block text-[11px] font-black text-slate-700 uppercase tracking-widest">Slot Waktu Khusus</label>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const current = config || { basePrice: 0, timeSlots: [] };
                                                            setConfig({ ...current, timeSlots: [...(current.timeSlots||[]), { start: '00:00', end: '00:00', price: current.basePrice || 0, validDays: [] }] });
                                                        }}
                                                        className={`px-4 py-2 bg-${theme}-50 text-${theme}-700 hover:bg-${theme}-600 hover:text-white border border-${theme}-100 rounded-xl text-[10px] font-black flex items-center gap-1.5 transition-all active:scale-95`}
                                                    >
                                                        <Plus className="w-3 h-3" /> TAMBAH SLOT
                                                    </button>
                                                </div>

                                                {(config?.timeSlots || []).length === 0 && (
                                                    <div className="text-center py-6 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                                        Belum ada slot waktu khusus diatur.
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                    {(config?.timeSlots || []).map((slot: any, idx: number) => (
                                                        <div key={idx} className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex flex-col xl:flex-row gap-3 items-center group">
                                                            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 focus-within:border-indigo-400 flex-1 w-full xl:w-auto">
                                                                <input type="time" className="bg-transparent rounded-md p-1 font-black text-xs outline-none text-center text-slate-700 w-full" value={slot.start} onChange={(e) => {
                                                                    const newSlots = [...config.timeSlots];
                                                                    newSlots[idx].start = e.target.value;
                                                                    setConfig({ ...config, timeSlots: newSlots });
                                                                }} />
                                                                <span className="text-slate-300 font-bold px-1">-</span>
                                                                <input type="time" className="bg-transparent rounded-md p-1 font-black text-xs outline-none text-center text-slate-700 w-full" value={slot.end} onChange={(e) => {
                                                                    const newSlots = [...config.timeSlots];
                                                                    newSlots[idx].end = e.target.value;
                                                                    setConfig({ ...config, timeSlots: newSlots });
                                                                }} />
                                                            </div>
                                                            <div className="flex gap-2 items-center w-full xl:w-auto">
                                                                <InputField
                                                                    label="" type="number"
                                                                    className="w-full xl:w-28 pl-7 pr-2 py-2 bg-white rounded-xl font-black text-xs outline-none border border-slate-200 focus:border-indigo-400"
                                                                    value={slot.price}
                                                                    isEditing={true}
                                                                    onChange={(val) => {
                                                                        const newSlots = [...config.timeSlots];
                                                                        newSlots[idx].price = val;
                                                                        setConfig({ ...config, timeSlots: newSlots });
                                                                    }}
                                                                />
                                                                <button
                                                                    onClick={() => {
                                                                        const newSlots = config.timeSlots.filter((_: any, i: number) => i !== idx);
                                                                        setConfig({ ...config, timeSlots: newSlots });
                                                                    }}
                                                                    className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all h-full flex items-center justify-center"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                            {/* ✅ Valid Days Selection */}
                                                            <div className="w-full pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                                                                {DAYS_OPTIONS.map((day) => {
                                                                    const slotValidDays = slot.validDays || [];
                                                                    const isSelected = slotValidDays.includes(day.value);
                                                                    const isWeekend = day.value === 'SAT' || day.value === 'SUN';
                                                                    return (
                                                                        <button
                                                                            key={day.value}
                                                                            type="button"
                                                                            title={day.full}
                                                                            onClick={() => {
                                                                                const newSlots = [...config.timeSlots];
                                                                                let currentDays = newSlots[idx].validDays || [];
                                                                                if (isSelected) {
                                                                                    currentDays = currentDays.filter((d: string) => d !== day.value);
                                                                                } else {
                                                                                    currentDays = [...currentDays, day.value];
                                                                                }
                                                                                newSlots[idx].validDays = currentDays.length > 0 ? currentDays : null;
                                                                                setConfig({ ...config, timeSlots: newSlots });
                                                                            }}
                                                                            className={`w-7 h-7 text-[8px] font-black rounded-lg border transition-all active:scale-90 ${
                                                                                isSelected
                                                                                    ? isWeekend
                                                                                        ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200'
                                                                                        : 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-200'
                                                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-500'
                                                                            }`}
                                                                        >
                                                                            {day.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                                <div className="ml-auto text-[8px] font-bold text-slate-400 self-center">
                                                                    {(!slot.validDays || slot.validDays.length === 0) ? 'Setiap Hari' : 'Hari Pilihan'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
<button
                                onClick={handleSaveGlobal}
                                disabled={savingGlobal}
                                className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-200 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                            >
                                <Save className="w-5 h-5" />
                                <span>{savingGlobal ? 'Menyimpan...' : 'Simpan Konfigurasi Harga Manual'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Form Section */}
                <div className="lg:col-span-12 xl:col-span-5">
                    <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 border border-indigo-50/50 sticky top-8 h-[calc(100vh-4rem)] flex flex-col">
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-8 shrink-0">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                        {editingPackageId ? <Edit2 className="w-6 h-6 text-amber-500" /> : <Plus className="w-6 h-6 text-indigo-600" />}
                                        {editingPackageId ? 'Edit Paket' : 'Paket Baru'}
                                    </h2>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Konfigurasi Tarif Meja</p>
                                </div>
                                {editingPackageId && (
                                    <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 -mr-2 no-scrollbar mt-2 pb-8">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* 1. TIPE & KATEGORI GROUP */}
                                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-6">
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Bermain</label>
                                        <div className="flex gap-2 p-1 bg-white rounded-2xl border border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type: 'hourly', timeSlots: [], price: 0 })}
                                                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${formData.type === 'hourly'
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                    : 'text-slate-400 hover:bg-slate-50'}`}
                                            >
                                                <Clock className="w-4 h-4" /> PLAYTIME
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type: 'fixed', timeSlots: [], price: 0 })}
                                                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${formData.type === 'fixed'
                                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                                                    : 'text-slate-400 hover:bg-slate-50'}`}
                                            >
                                                <Timer className="w-4 h-4" /> DURATION
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama & Kategori</label>
                                        <div className="space-y-3">
                                            <InputField
                                                label="Nama Paket"
                                                value={formData.name}
                                                savedValue={lastSavedPackage?.name}
                                                isEditing={!!editingPackageId}
                                                required
                                                placeholder="Nama Paket..."
                                                onChange={(val) => setFormData({ ...formData, name: val })}
                                            />

                                            {/* ✅ HARI BERLAKU PAKET */}
                                            <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <CalendarDays className="w-3.5 h-3.5 text-violet-500" />
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hari Berlaku Paket</label>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {DAYS_OPTIONS.map((day) => {
                                                        const isSelected = validDays.includes(day.value);
                                                        const isWeekend = day.value === 'SAT' || day.value === 'SUN';
                                                        return (
                                                            <button
                                                                key={day.value}
                                                                type="button"
                                                                title={day.full}
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        setValidDays(validDays.filter(d => d !== day.value));
                                                                    } else {
                                                                        setValidDays([...validDays, day.value]);
                                                                    }
                                                                }}
                                                                className={`w-10 h-10 text-[10px] font-black rounded-xl border-2 transition-all active:scale-90 ${
                                                                    isSelected
                                                                        ? isWeekend
                                                                            ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-200'
                                                                            : 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-200'
                                                                        : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-violet-300 hover:text-violet-500'
                                                                }`}
                                                            >
                                                                {day.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <div className="text-[9px] text-slate-400 leading-relaxed mt-2">
                                                    {validDays.length === 0
                                                        ? <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Berlaku setiap hari (tidak ada batasan hari)</span>
                                                        : <span className="flex items-center gap-1.5 text-indigo-600"><Calendar className="w-3.5 h-3.5" /> Aktif: {validDays.map(v => DAYS_OPTIONS.find(d => d.value === v)?.full).join(', ')}</span>
                                                    }
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                {categories.filter((c:any) => c.isActive && (c.assetType === 'BILLIARD' || c.assetType === 'PLAYSTATION')).map((cat:any) => {
                                                    const isSelected = formData.tableCategory === cat.name;
                                                    let activeClass = 'border-indigo-600 bg-indigo-50 text-indigo-600';
                                                    if (cat.name.toLowerCase().includes('vip') && cat.assetType === 'BILLIARD') activeClass = 'border-purple-600 bg-purple-50 text-purple-600';
                                                    if (cat.assetType === 'PLAYSTATION') activeClass = 'border-blue-600 bg-blue-50 text-blue-600';
                                                    if (cat.name.toLowerCase().includes('vip') && cat.assetType === 'PLAYSTATION') activeClass = 'border-violet-600 bg-violet-50 text-violet-600';
                                                    
                                                    return (
                                                        <button
                                                            key={cat.id}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, tableCategory: cat.name })}
                                                            className={`py-3 rounded-xl text-[10px] font-black border-2 transition-all uppercase ${isSelected ? activeClass : 'border-slate-100 bg-white text-slate-400'}`}
                                                        >
                                                            {cat.name}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. DYNAMIC CONTENT AREA */}
                                <div className="min-h-[200px]">
                                    {formData.type === 'hourly' ? (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Happy Hour Slots</h3>
                                                <button type="button" onClick={addTimeSlot} className="bg-indigo-50 text-indigo-600 p-2 rounded-xl hover:bg-indigo-100 transition-colors">
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {(formData.timeSlots || []).map((slot: { start: string; end: string; price: number; validDays?: string[] }, idx) => (
                                                    <div key={idx} className="bg-white/70 backdrop-blur-sm p-3 rounded-[1rem] border border-slate-100 shadow-sm hover:shadow-md hover:shadow-indigo-100/5 transition-all group relative animate-in zoom-in-95 duration-300 overflow-hidden">
                                                        <div className="absolute top-0 left-0 w-0.5 h-full bg-indigo-400 opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center">
                                                                {/* Time Range Group */}
                                                                <div className="flex-1 space-y-0.5">
                                                                    <div className="flex items-center gap-1 ml-1">
                                                                        <Timer className="w-2 h-2 text-indigo-500/50" />
                                                                        <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Rentang Happy Hour</span>
                                                                    </div>
                                                                    <div className="flex items-center bg-slate-50/50 p-0.5 rounded-lg border border-slate-100/30 focus-within:border-indigo-200 focus-within:bg-white transition-all">
                                                                        <input type="time" className="flex-1 bg-transparent rounded-md p-1 font-black text-[10px] outline-none text-center text-slate-700" value={slot.start} onChange={(e) => updateTimeSlot(idx, 'start', e.target.value)} />
                                                                        <div className="px-1 text-slate-200">
                                                                            <div className="w-2 h-[1px] bg-slate-200 rounded-full"></div>
                                                                        </div>
                                                                        <input type="time" className="flex-1 bg-transparent rounded-md p-1 font-black text-[10px] outline-none text-center text-slate-700" value={slot.end} onChange={(e) => updateTimeSlot(idx, 'end', e.target.value)} />
                                                                    </div>
                                                                </div>

                                                                {/* Price Input Group */}
                                                                <div className="lg:w-[120px] xl:w-[140px] space-y-0.5">
                                                                    <div className="flex items-center gap-1 ml-1">
                                                                        <DollarSign className="w-2 h-2 text-indigo-500/50" />
                                                                        <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Harga Paket</span>
                                                                    </div>
                                                                    <InputField
                                                                        label=""
                                                                        type="number"
                                                                        className="w-full pl-7 pr-2 py-1.5 bg-slate-50/50 hover:bg-slate-100 focus:bg-white rounded-lg font-black text-xs outline-none border border-slate-100/30 focus:border-indigo-300 transition-all text-indigo-600 shadow-inner"
                                                                        value={slot.price}
                                                                        savedValue={lastSavedPackage?.timeSlots?.[idx]?.price}
                                                                        isEditing={!!editingPackageId}
                                                                        onChange={(val) => updateTimeSlot(idx, 'price', val)}
                                                                    />
                                                                </div>

                                                                {/* Actions */}
                                                                <div className="flex items-center justify-end lg:pt-3">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeTimeSlot(idx)}
                                                                        className="p-1.5 bg-rose-50 text-rose-400 hover:text-white hover:bg-rose-500 rounded-md transition-all shadow-sm active:scale-90 group/del"
                                                                    >
                                                                        <Trash2 className="w-3 h-3 group-hover/del:scale-110 transition-transform" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Slot Valid Days Group */}
                                                            <div className="border-t border-slate-100/50 pt-2 pb-0.5 mt-1">
                                                                <div className="flex items-center gap-1 ml-1 mb-1.5">
                                                                    <CalendarDays className="w-2 h-2 text-indigo-500/50" />
                                                                    <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Hari Berlaku Slot</span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {DAYS_OPTIONS.map((day) => {
                                                                        const validDays = slot.validDays || [];
                                                                        const isSelected = validDays.includes(day.value);
                                                                        const isWeekend = day.value === 'SAT' || day.value === 'SUN';
                                                                        return (
                                                                            <button
                                                                                key={day.value}
                                                                                type="button"
                                                                                title={day.full}
                                                                                onClick={() => {
                                                                                    let newDays = [...validDays];
                                                                                    if (isSelected) newDays = newDays.filter(d => d !== day.value);
                                                                                    else newDays.push(day.value);
                                                                                    updateTimeSlot(idx, 'validDays', newDays);
                                                                                }}
                                                                                className={`w-7 h-7 text-[8px] font-black rounded-lg border transition-all active:scale-90 ${
                                                                                    isSelected
                                                                                        ? isWeekend
                                                                                            ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200'
                                                                                            : 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-200'
                                                                                        : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-violet-300 hover:text-violet-500'
                                                                                }`}
                                                                            >
                                                                                {day.label}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <div className="text-[8px] text-slate-400 mt-1.5 ml-1 font-medium">
                                                                    {(!slot.validDays || slot.validDays.length === 0)
                                                                        ? <span className="text-emerald-500">Berlaku setiap hari</span>
                                                                        : <span className="text-indigo-500">Aktif: {(slot.validDays || []).map((v: string) => DAYS_OPTIONS.find(d => d.value === v)?.full).join(', ')}</span>
                                                                    }
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!formData.timeSlots || formData.timeSlots.length === 0) && (
                                                    <div className="py-12 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                                                        <Clock className="w-8 h-8 mb-2 opacity-20" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest">Belum ada slot waktu</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100/50">
                                                <InputField
                                                    label="Durasi Paket"
                                                    type="number"
                                                    value={formData.durationMinutes}
                                                    savedValue={lastSavedPackage?.durationMinutes}
                                                    isEditing={!!editingPackageId}
                                                    onChange={(val) => setFormData({ ...formData, durationMinutes: val })}
                                                    suffix="MENIT"
                                                />
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Varian Harga</h3>
                                                    <button type="button" onClick={addTimeSlot} className="bg-amber-50 text-amber-600 p-2 rounded-xl hover:bg-amber-100 transition-colors">
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="space-y-3">
                                                    {(formData.timeSlots || []).map((slot, idx) => (
                                                        <div key={idx} className="bg-white/70 backdrop-blur-sm p-3 rounded-[1rem] border border-slate-100 shadow-sm hover:shadow-md hover:shadow-amber-100/5 transition-all group relative animate-in slide-in-from-right-4 duration-300 overflow-hidden">
                                                            <div className="absolute top-0 left-0 w-0.5 h-full bg-amber-400 opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center">
                                                                    {/* Time Range Group */}
                                                                    <div className="flex-1 space-y-0.5">
                                                                        <div className="flex items-center gap-1 ml-1">
                                                                            <Timer className="w-2 h-2 text-amber-500/50" />
                                                                            <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Rentang Waktu</span>
                                                                        </div>
                                                                        <div className="flex items-center bg-slate-50/50 p-0.5 rounded-lg border border-slate-100/30 focus-within:border-amber-200 focus-within:bg-white transition-all">
                                                                            <input type="time" className="flex-1 bg-transparent rounded-md p-1 font-black text-[10px] outline-none text-center text-slate-700" value={slot.start} onChange={(e) => updateTimeSlot(idx, 'start', e.target.value)} />
                                                                            <div className="px-1 text-slate-200">
                                                                                <div className="w-2 h-[1px] bg-slate-200 rounded-full"></div>
                                                                            </div>
                                                                            <input type="time" className="flex-1 bg-transparent rounded-md p-1 font-black text-[10px] outline-none text-center text-slate-700" value={slot.end} onChange={(e) => updateTimeSlot(idx, 'end', e.target.value)} />
                                                                        </div>
                                                                    </div>

                                                                    {/* Price Input Group */}
                                                                    <div className="lg:w-[120px] xl:w-[140px] space-y-0.5">
                                                                        <div className="flex items-center gap-1 ml-1">
                                                                            <DollarSign className="w-2 h-2 text-amber-500/50" />
                                                                            <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Harga Varian</span>
                                                                        </div>
                                                                        <InputField
                                                                            label=""
                                                                            type="number"
                                                                            className="w-full pl-7 pr-2 py-1.5 bg-slate-50/50 hover:bg-slate-100 focus:bg-white rounded-lg font-black text-xs outline-none border border-slate-100/30 focus:border-amber-300 transition-all text-amber-600 shadow-inner"
                                                                            value={slot.price}
                                                                            savedValue={lastSavedPackage?.timeSlots?.[idx]?.price}
                                                                            isEditing={!!editingPackageId}
                                                                            onChange={(val) => updateTimeSlot(idx, 'price', val)}
                                                                        />
                                                                    </div>

                                                                    {/* Actions */}
                                                                    <div className="flex items-center justify-end lg:pt-3">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeTimeSlot(idx)}
                                                                            className="p-1.5 bg-rose-50 text-rose-400 hover:text-white hover:bg-rose-500 rounded-md transition-all shadow-sm active:scale-90 group/del"
                                                                        >
                                                                            <Trash2 className="w-3 h-3 group-hover/del:scale-110 transition-transform" />
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Slot Valid Days Group */}
                                                                <div className="border-t border-slate-100/50 pt-2 pb-0.5 mt-1">
                                                                    <div className="flex items-center gap-1 ml-1 mb-1.5">
                                                                        <CalendarDays className="w-2 h-2 text-amber-500/50" />
                                                                        <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Hari Berlaku Slot</span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {DAYS_OPTIONS.map((day) => {
                                                                            const validDays = slot.validDays || [];
                                                                            const isSelected = validDays.includes(day.value);
                                                                            const isWeekend = day.value === 'SAT' || day.value === 'SUN';
                                                                            return (
                                                                                <button
                                                                                    key={day.value}
                                                                                    type="button"
                                                                                    title={day.full}
                                                                                    onClick={() => {
                                                                                        let newDays = [...validDays];
                                                                                        if (isSelected) newDays = newDays.filter(d => d !== day.value);
                                                                                        else newDays.push(day.value);
                                                                                        updateTimeSlot(idx, 'validDays', newDays);
                                                                                    }}
                                                                                    className={`w-7 h-7 text-[8px] font-black rounded-lg border transition-all active:scale-90 ${
                                                                                        isSelected
                                                                                            ? isWeekend
                                                                                                ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200'
                                                                                                : 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-200'
                                                                                            : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-violet-300 hover:text-violet-500'
                                                                                    }`}
                                                                                >
                                                                                    {day.label}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    <div className="text-[8px] text-slate-400 mt-1.5 ml-1 font-medium">
                                                                        {(!slot.validDays || slot.validDays.length === 0)
                                                                            ? <span className="text-emerald-500">Berlaku setiap hari</span>
                                                                            : <span className="text-indigo-500">Aktif: {(slot.validDays || []).map((v: string) => DAYS_OPTIONS.find(d => d.value === v)?.full).join(', ')}</span>
                                                                        }
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-[2rem] transition-all shadow-xl shadow-slate-200 active:scale-[0.98] flex items-center justify-center gap-3 group"
                                >
                                    <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span>{editingPackageId ? 'Perbarui Paket' : 'Simpan Paket'}</span>
                                </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-12 xl:col-span-7">
                    <div className="bg-white/80 backdrop-blur-xl p-6 lg:p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 border border-indigo-50/50 sticky top-8 h-[calc(100vh-4rem)] flex flex-col">
                        
                        {/* Header stays at top */}
                        <div className="flex-shrink-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Daftar Paket</h2>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Kelola Paket & Tarif Aktif</p>
                                </div>
                        <div className="flex gap-2">
                            <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl text-[10px] font-black text-indigo-600 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></div>
                                {packages.filter(p => p.type === 'hourly').length} PLAYTIME
                            </div>
                            <div className="px-4 py-2 bg-amber-50 border border-amber-100 rounded-2xl text-[10px] font-black text-amber-600 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></div>
                                {packages.filter(p => p.type === 'fixed').length} DURATION
                            </div>
                        </div>
                    </div>

                            {/* DAFTAR PAKET TABS */}
                            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mt-6 mb-2">
                        <button
                            onClick={() => setActivePackageTab('ALL')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase whitespace-nowrap transition-all ${
                                activePackageTab === 'ALL'
                                    ? 'bg-slate-800 text-white shadow-md shadow-slate-200'
                                    : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
                            }`}
                        >
                            SEMUA KATEGORI
                        </button>
                        {categories.filter((c:any) => c.isActive && (c.assetType === 'BILLIARD' || c.assetType === 'PLAYSTATION')).map((cat:any) => (
                            <button
                                key={cat.id}
                                onClick={() => setActivePackageTab(cat.name)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase whitespace-nowrap transition-all ${
                                    activePackageTab === cat.name
                                        ? 'bg-slate-800 text-white shadow-md shadow-slate-200'
                                        : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
                                }`}
                            >
                                {cat.name.replace('_', ' ')}
                            </button>
                        ))}
                    </div>

                        </div>
                        
                        {/* Scrollable List Container */}
                        <div className="flex-1 overflow-y-auto pr-2 -mr-2 no-scrollbar mt-2 pb-8">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {packages.filter(pkg => {
                            if (activePackageTab === 'ALL') return true;
                            const categoryObj = categories.find(c => c.id === pkg.categoryId);
                            const catName = categoryObj ? categoryObj.name : (pkg.tableCategory || 'REGULAR');
                            return catName === activePackageTab;
                        }).map((pkg) => {
                            const isHourly = pkg.type === 'hourly';
                            const badgeColor = isHourly ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200';
                            
                            const categoryObj = categories.find(c => c.id === pkg.categoryId);
                            const catName = categoryObj ? categoryObj.name : (pkg.tableCategory || 'REGULAR');
                            
                            return (
                                <div
                                    key={pkg.id}
                                    className={`group bg-white rounded-3xl border transition-all p-5 hover:shadow-xl hover:-translate-y-1 flex flex-col gap-4 relative ${
                                        editingPackageId === pkg.id ? 'border-indigo-500 shadow-lg shadow-indigo-100 ring-2 ring-indigo-500/20' : 'border-slate-100'
                                    }`}
                                >
                                    {/* Actions Overlay Top Right */}
                                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-slate-100 z-10">
                                        <button
                                            onClick={() => handleEditPackage(pkg)}
                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeletePackage(pkg.id)}
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Hapus"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Top: Header Info */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-1.5 mb-2.5 pr-14">
                                                <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${badgeColor}`}>
                                                    {isHourly ? 'PLAYTIME' : 'DURATION'}
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${
                                                    catName === 'VIP' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                    catName === 'PS_REGULAR' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    catName === 'PS_VIP' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                                                    'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                }`}>
                                                    STATION {catName.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-black text-slate-800 uppercase pr-16 leading-tight">{pkg.name}</h3>

                                            {/* ✅ BADGE HARI BERLAKU */}
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {pkg.validDays && pkg.validDays.length > 0 ? (
                                                    pkg.validDays.map((dayVal: string) => {
                                                        const dayInfo = DAYS_OPTIONS.find(d => d.value === dayVal);
                                                        const isWeekend = dayVal === 'SAT' || dayVal === 'SUN';
                                                        return (
                                                            <span key={dayVal} className={`px-1.5 py-0.5 text-[9px] font-black rounded-md ${
                                                                isWeekend ? 'bg-rose-50 text-rose-600' : 'bg-violet-50 text-violet-600'
                                                            }`}>
                                                                {dayInfo?.label || dayVal}
                                                            </span>
                                                        );
                                                    })
                                                ) : (
                                                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-emerald-50 text-emerald-600">
                                                        Setiap Hari
                                                    </span>
                                                )}
                                            </div>

                                            {pkg.type === 'fixed' && (
                                                <div className="flex items-center gap-1.5 text-amber-600 mt-2">
                                                    <Clock className="w-4 h-4" />
                                                    <span className="text-xs font-black">{pkg.durationMinutes} Menit</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bottom: Time Slots */}
                                    <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100 flex-1 flex flex-col justify-center">
                                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <div className="w-1 h-1 rounded-full bg-slate-300"></div> Varian Harga
                                        </h4>
                                        {(pkg.timeSlots && pkg.timeSlots.length > 0) ? (
                                            <div className="flex flex-col gap-1.5">
                                                {pkg.timeSlots.map((slot: any, sIdx: number) => {
                                                    const isActiveSlot = isSlotActive(slot.start, slot.end);
                                                    return (
                                                        <div key={sIdx} className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border shadow-sm transition-all ${
                                                            isActiveSlot 
                                                                ? 'bg-emerald-50 border-emerald-200 shadow-emerald-100 ring-1 ring-emerald-400' 
                                                                : 'bg-white border-slate-100'
                                                        }`}>
                                                            <span className={`text-[10px] font-bold flex items-center gap-1 ${isActiveSlot ? 'text-emerald-700' : 'text-slate-500'}`}>
                                                                <Clock className={`w-3 h-3 ${isActiveSlot ? 'text-emerald-500' : 'text-slate-400'}`}/> 
                                                                {slot.start}-{slot.end}
                                                                {isActiveSlot && <span className="ml-1 text-[7px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse whitespace-nowrap">Berlaku</span>}
                                                            </span>
                                                            <span className={`text-[10px] font-black whitespace-nowrap ${
                                                                isActiveSlot ? 'text-emerald-700' : (isHourly ? 'text-indigo-600' : 'text-amber-600')
                                                            }`}>
                                                                Rp {slot.price.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="py-2 text-center border border-dashed border-slate-200 rounded-xl bg-white">
                                                <span className="text-[10px] font-bold text-slate-400 italic">Tidak ada slot khusus</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SettingsIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}
