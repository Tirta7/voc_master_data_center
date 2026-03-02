'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit2, Tag, Clock, Save, DollarSign, List, ShieldCheck, Timer, Info, AlertCircle, CalendarOff } from 'lucide-react';
import InputField from '@/components/ui/InputField';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function BilliardPricingPage() {
    const [packages, setPackages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPackageId, setEditingPackageId] = useState<number | null>(null);
    const [formData, setFormData] = useState<{
        name: string;
        type: string;
        tableCategory: 'REGULAR' | 'VIP'; // New field
        durationMinutes: number;
        price: number;
        timeSlots?: { start: string; end: string; price: number }[];
    }>({
        name: '',
        type: 'hourly', // 'hourly' maps to PLAYTIME
        tableCategory: 'REGULAR',
        durationMinutes: 120, // Default 2 hours for clarity
        price: 0,
        timeSlots: [],
    });

    const [globalSettings, setGlobalSettings] = useState<any>(null);
    const [lastSavedGlobalSettings, setLastSavedGlobalSettings] = useState<any>(null);
    const [lastSavedPackage, setLastSavedPackage] = useState<any>(null);
    const [savingGlobal, setSavingGlobal] = useState(false);

    useEffect(() => {
        fetchPackages();
        fetchGlobalSettings();
    }, []);

    const fetchGlobalSettings = async () => {
        try {
            const res = await axios.get(`${API_URL}/settings`);
            setGlobalSettings(res.data);
            setLastSavedGlobalSettings(res.data);
        } catch (err) {
            console.error('Fetch global settings failed:', err);
        }
    };

    const fetchPackages = async () => {
        try {
            const res = await axios.get(`${API_URL}/billiard/packages`);
            setPackages(res.data);
        } catch (err) {
            console.error('Fetch packages failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingPackageId) {
                await axios.patch(`${API_URL}/billiard/packages/${editingPackageId}`, formData);
                alert('Paket berhasil diperbarui!');
            } else {
                await axios.post(`${API_URL}/billiard/packages`, formData);
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
        setFormData({
            name: '',
            type: formData.type, // Keep last selected type preference
            tableCategory: 'REGULAR',
            durationMinutes: 120,
            price: 0,
            timeSlots: []
        });
    };

    const handleEditPackage = (pkg: any) => {
        setEditingPackageId(pkg.id);
        const mappedData = {
            name: pkg.name,
            type: pkg.type === 'PLAYTIME' ? 'hourly' : (pkg.type === 'DURATION' ? 'fixed' : (pkg.type === 'hourly' ? 'hourly' : 'fixed')), // Handle enum mismatch if any
            tableCategory: pkg.tableCategory || 'REGULAR',
            durationMinutes: pkg.durationMinutes || 120,
            price: Number(pkg.price),
            timeSlots: pkg.timeSlots || []
        };
        setFormData(mappedData);
        setLastSavedPackage(mappedData);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeletePackage = async (id: number) => {
        if (!confirm('Apakah Anda yakin ingin menghapus paket ini?')) return;
        try {
            await axios.delete(`${API_URL}/billiard/packages/${id}`);
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
            await axios.patch(`${API_URL}/settings`, {
                customDurationPricingRegular: globalSettings.customDurationPricingRegular,
                customDurationPricingVip: globalSettings.customDurationPricingVip,
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
                            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-8">
                                {/* Regular Tables */}
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                        <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs">Meja REGULAR</h3>
                                        {isAnySlotActive(globalSettings?.customDurationPricingRegular) ? (
                                            <div className="ml-auto bg-emerald-100 text-emerald-700 px-3 py-1 rounded-xl text-[10px] font-black animate-pulse flex items-center gap-1.5 shadow-sm shadow-emerald-50">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                AKTIF: Rp {getActiveRate(globalSettings?.customDurationPricingRegular).toLocaleString()}
                                            </div>
                                        ) : (
                                            <div className="ml-auto bg-rose-500 text-white px-3 py-1 rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-lg shadow-rose-200 animate-bounce cursor-help group relative">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                <span>ERROR: SLOT TIDAK DITEMUKAN</span>
                                                <div className="absolute bottom-full right-0 mb-3 w-64 p-3 bg-slate-900 text-white text-[10px] leading-relaxed rounded-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-2xl border border-slate-700">
                                                    <div className="flex items-center gap-2 mb-1 text-rose-400">
                                                        <Clock className="w-3 h-3" />
                                                        <span className="font-black uppercase">Peringatan Penting</span>
                                                    </div>
                                                    Jam {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} tidak terdaftar di slot manapun. Harap tambahkan slot baru agar sistem bisa menentukan harga!
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {!isAnySlotActive(globalSettings?.customDurationPricingRegular) && (
                                        <div className="bg-rose-50 border-2 border-dashed border-rose-200 p-5 rounded-[2rem] flex flex-col items-center text-center gap-3 animate-in zoom-in-95 duration-300">
                                            <div className="p-4 bg-white rounded-2xl shadow-sm ring-4 ring-rose-100/50">
                                                <CalendarOff className="w-8 h-8 text-rose-500" />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-black text-rose-700 uppercase tracking-widest">Pricing Error</h4>
                                                <p className="text-[10px] text-rose-600 font-bold leading-relaxed max-w-[200px]">
                                                    Tidak ada harga yang berlaku untuk jam <span className="underlineDecoration-rose-300">{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>. Sistem tidak akan bisa menghitung tagihan dengan benar!
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4 pt-2">
                                        <div className="flex justify-between items-center px-1">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-amber-100 rounded-lg">
                                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                </div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Atur Slot Waktu</label>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const current = globalSettings.customDurationPricingRegular || { basePrice: 0, timeSlots: [] };
                                                    setGlobalSettings({
                                                        ...globalSettings,
                                                        customDurationPricingRegular: {
                                                            ...current,
                                                            timeSlots: [...current.timeSlots, { start: '00:00', end: '00:00', price: current.basePrice || 0 }]
                                                        }
                                                    });
                                                }}
                                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black flex items-center gap-1.5 transition-all shadow-lg shadow-amber-100 active:scale-95"
                                            >
                                                <Plus className="w-3 h-3" />
                                                <span>TAMBAH SLOT</span>
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            {(globalSettings?.customDurationPricingRegular?.timeSlots || []).length === 0 && (
                                                <div className="flex flex-col items-center justify-center py-8 bg-white/50 rounded-3xl border border-dashed border-slate-200">
                                                    <div className="p-3 bg-slate-50 rounded-2xl mb-3">
                                                        <Info className="w-5 h-5 text-slate-300" />
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-400">Belum ada slot khusus diatur.</p>
                                                </div>
                                            )}
                                            {(globalSettings?.customDurationPricingRegular?.timeSlots || []).map((slot: any, idx: number) => (
                                                <div key={idx} className="bg-white/70 backdrop-blur-sm p-3 rounded-[1rem] border border-slate-100 shadow-sm hover:shadow-md hover:shadow-amber-100/5 transition-all group relative animate-in zoom-in-95 duration-300 overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-0.5 h-full bg-amber-400 opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                                    <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center">
                                                        {/* Time Range Group */}
                                                        <div className="flex-1 space-y-0.5">
                                                            <div className="flex items-center gap-1 ml-1">
                                                                <Timer className="w-2 h-2 text-amber-500/50" />
                                                                <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Rentang Waktu</span>
                                                            </div>
                                                            <div className="flex items-center bg-slate-50/50 p-0.5 rounded-lg border border-slate-100/30 focus-within:border-amber-200 focus-within:bg-white transition-all">
                                                                <input type="time" className="flex-1 bg-transparent rounded-md p-1 font-black text-[10px] outline-none text-center text-slate-700" value={slot.start} onChange={(e) => {
                                                                    const newSlots = [...globalSettings.customDurationPricingRegular.timeSlots];
                                                                    newSlots[idx].start = e.target.value;
                                                                    setGlobalSettings({ ...globalSettings, customDurationPricingRegular: { ...globalSettings.customDurationPricingRegular, timeSlots: newSlots } });
                                                                }} />
                                                                <div className="px-1 text-slate-200">
                                                                    <div className="w-2 h-[1px] bg-slate-200 rounded-full"></div>
                                                                </div>
                                                                <input type="time" className="flex-1 bg-transparent rounded-md p-1 font-black text-[10px] outline-none text-center text-slate-700" value={slot.end} onChange={(e) => {
                                                                    const newSlots = [...globalSettings.customDurationPricingRegular.timeSlots];
                                                                    newSlots[idx].end = e.target.value;
                                                                    setGlobalSettings({ ...globalSettings, customDurationPricingRegular: { ...globalSettings.customDurationPricingRegular, timeSlots: newSlots } });
                                                                }} />
                                                            </div>
                                                        </div>

                                                        {/* Price Input Group */}
                                                        <div className="lg:w-[120px] xl:w-[140px] space-y-0.5">
                                                            <div className="flex items-center gap-1 ml-1">
                                                                <DollarSign className="w-2 h-2 text-amber-500/50" />
                                                                <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Tarif Per Jam</span>
                                                            </div>
                                                            <InputField
                                                                label=""
                                                                type="number"
                                                                className="w-full pl-7 pr-2 py-1.5 bg-slate-50/50 hover:bg-slate-100 focus:bg-white rounded-lg font-black text-xs outline-none border border-slate-100/30 focus:border-amber-300 transition-all text-amber-600 shadow-inner"
                                                                value={slot.price}
                                                                savedValue={lastSavedGlobalSettings?.customDurationPricingRegular?.timeSlots?.[idx]?.price}
                                                                isEditing={true}
                                                                onChange={(val) => {
                                                                    const newSlots = [...globalSettings.customDurationPricingRegular.timeSlots];
                                                                    newSlots[idx].price = val;
                                                                    setGlobalSettings({ ...globalSettings, customDurationPricingRegular: { ...globalSettings.customDurationPricingRegular, timeSlots: newSlots } });
                                                                }}
                                                            />
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center justify-end lg:pt-3">
                                                            <button
                                                                onClick={() => {
                                                                    const newSlots = globalSettings.customDurationPricingRegular.timeSlots.filter((_: any, i: number) => i !== idx);
                                                                    setGlobalSettings({ ...globalSettings, customDurationPricingRegular: { ...globalSettings.customDurationPricingRegular, timeSlots: newSlots } });
                                                                }}
                                                                className="p-1.5 bg-rose-50 text-rose-400 hover:text-white hover:bg-rose-500 rounded-md transition-all shadow-sm active:scale-90 group/del"
                                                            >
                                                                <Trash2 className="w-3 h-3 group-hover/del:scale-110 transition-transform" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* VIP Tables */}
                                <div className="bg-purple-50/50 p-6 rounded-3xl border border-purple-100 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                        <h3 className="font-black text-purple-700 uppercase tracking-widest text-xs">Meja VIP</h3>
                                        {isAnySlotActive(globalSettings?.customDurationPricingVip) ? (
                                            <div className="ml-auto bg-purple-100 text-purple-700 px-3 py-1 rounded-xl text-[10px] font-black animate-pulse flex items-center gap-1.5 shadow-sm shadow-purple-50">
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                                                AKTIF: Rp {getActiveRate(globalSettings?.customDurationPricingVip).toLocaleString()}
                                            </div>
                                        ) : (
                                            <div className="ml-auto bg-rose-500 text-white px-3 py-1 rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-lg shadow-rose-200 animate-bounce cursor-help group relative">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                <span>ERROR: SLOT TIDAK DITEMUKAN</span>
                                                <div className="absolute bottom-full right-0 mb-3 w-64 p-3 bg-slate-900 text-white text-[10px] leading-relaxed rounded-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-2xl border border-slate-700">
                                                    <div className="flex items-center gap-2 mb-1 text-rose-400">
                                                        <Clock className="w-3 h-3" />
                                                        <span className="font-black uppercase">Peringatan Penting (VIP)</span>
                                                    </div>
                                                    Jam {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} tidak terdaftar di slot manapun. Harap tambahkan slot baru agar sistem bisa menentukan harga!
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {!isAnySlotActive(globalSettings?.customDurationPricingVip) && (
                                        <div className="bg-rose-50 border-2 border-dashed border-rose-200 p-5 rounded-[2rem] flex flex-col items-center text-center gap-3 animate-in zoom-in-95 duration-300">
                                            <div className="p-4 bg-white rounded-2xl shadow-sm ring-4 ring-rose-100/50">
                                                <CalendarOff className="w-8 h-8 text-rose-500" />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-black text-rose-700 uppercase tracking-widest">Pricing Error (VIP)</h4>
                                                <p className="text-[10px] text-rose-600 font-bold leading-relaxed max-w-[200px]">
                                                    Tidak ada harga yang berlaku untuk jam <span className="underlineDecoration-rose-300">{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>. Sistem tidak akan bisa menghitung tagihan dengan benar!
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4 pt-2">
                                        <div className="flex justify-between items-center px-1">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-purple-100 rounded-lg">
                                                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                                                </div>
                                                <label className="block text-[10px] font-black text-purple-500 uppercase tracking-widest">Atur Slot Waktu</label>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const current = globalSettings.customDurationPricingVip || { basePrice: 0, timeSlots: [] };
                                                    setGlobalSettings({
                                                        ...globalSettings,
                                                        customDurationPricingVip: {
                                                            ...current,
                                                            timeSlots: [...current.timeSlots, { start: '00:00', end: '00:00', price: current.basePrice || 0 }]
                                                        }
                                                    });
                                                }}
                                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black flex items-center gap-1.5 transition-all shadow-lg shadow-purple-100 active:scale-95"
                                            >
                                                <Plus className="w-3 h-3" />
                                                <span>TAMBAH SLOT</span>
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            {(globalSettings?.customDurationPricingVip?.timeSlots || []).length === 0 && (
                                                <div className="flex flex-col items-center justify-center py-8 bg-white/50 rounded-3xl border border-dashed border-purple-200">
                                                    <div className="p-3 bg-purple-50 rounded-2xl mb-3">
                                                        <Info className="w-5 h-5 text-purple-300" />
                                                    </div>
                                                    <p className="text-xs font-bold text-purple-400">Belum ada slot khusus diatur.</p>
                                                </div>
                                            )}
                                            {(globalSettings?.customDurationPricingVip?.timeSlots || []).map((slot: any, idx: number) => (
                                                <div key={idx} className="bg-white/70 backdrop-blur-sm p-3 rounded-[1rem] border border-purple-100 shadow-sm hover:shadow-md hover:shadow-purple-100/5 transition-all group relative animate-in zoom-in-95 duration-300 overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-0.5 h-full bg-purple-400 opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                                    <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center">
                                                        {/* Time Range Group */}
                                                        <div className="flex-1 space-y-0.5">
                                                            <div className="flex items-center gap-1 ml-1">
                                                                <Timer className="w-2 h-2 text-purple-500/50" />
                                                                <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Rentang Waktu</span>
                                                            </div>
                                                            <div className="flex items-center bg-slate-50/50 p-0.5 rounded-lg border border-slate-100/30 focus-within:border-purple-200 focus-within:bg-white transition-all">
                                                                <input type="time" className="flex-1 bg-transparent rounded-md p-1 font-black text-[10px] outline-none text-center text-slate-700" value={slot.start} onChange={(e) => {
                                                                    const newSlots = [...globalSettings.customDurationPricingVip.timeSlots];
                                                                    newSlots[idx].start = e.target.value;
                                                                    setGlobalSettings({ ...globalSettings, customDurationPricingVip: { ...globalSettings.customDurationPricingVip, timeSlots: newSlots } });
                                                                }} />
                                                                <div className="px-1 text-slate-200">
                                                                    <div className="w-2 h-[1px] bg-slate-200 rounded-full"></div>
                                                                </div>
                                                                <input type="time" className="flex-1 bg-transparent rounded-md p-1 font-black text-[10px] outline-none text-center text-slate-700" value={slot.end} onChange={(e) => {
                                                                    const newSlots = [...globalSettings.customDurationPricingVip.timeSlots];
                                                                    newSlots[idx].end = e.target.value;
                                                                    setGlobalSettings({ ...globalSettings, customDurationPricingVip: { ...globalSettings.customDurationPricingVip, timeSlots: newSlots } });
                                                                }} />
                                                            </div>
                                                        </div>

                                                        {/* Price Input Group */}
                                                        <div className="lg:w-[120px] xl:w-[140px] space-y-0.5">
                                                            <div className="flex items-center gap-1 ml-1">
                                                                <DollarSign className="w-2 h-2 text-purple-500/50" />
                                                                <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Tarif Per Jam</span>
                                                            </div>
                                                            <InputField
                                                                label=""
                                                                type="number"
                                                                className="w-full pl-7 pr-2 py-1.5 bg-slate-50/50 hover:bg-slate-100 focus:bg-white rounded-lg font-black text-xs outline-none border border-slate-100/30 focus:border-purple-300 transition-all text-purple-700 shadow-inner"
                                                                value={slot.price}
                                                                savedValue={lastSavedGlobalSettings?.customDurationPricingVip?.timeSlots?.[idx]?.price}
                                                                isEditing={true}
                                                                onChange={(val) => {
                                                                    const newSlots = [...globalSettings.customDurationPricingVip.timeSlots];
                                                                    newSlots[idx].price = val;
                                                                    setGlobalSettings({ ...globalSettings, customDurationPricingVip: { ...globalSettings.customDurationPricingVip, timeSlots: newSlots } });
                                                                }}
                                                            />
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center justify-end lg:pt-3">
                                                            <button
                                                                onClick={() => {
                                                                    const newSlots = globalSettings.customDurationPricingVip.timeSlots.filter((_: any, i: number) => i !== idx);
                                                                    setGlobalSettings({ ...globalSettings, customDurationPricingVip: { ...globalSettings.customDurationPricingVip, timeSlots: newSlots } });
                                                                }}
                                                                className="p-1.5 bg-rose-50 text-rose-400 hover:text-white hover:bg-rose-500 rounded-md transition-all shadow-sm active:scale-90 group/del"
                                                            >
                                                                <Trash2 className="w-3 h-3 group-hover/del:scale-110 transition-transform" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
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
                    <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 border border-indigo-50/50 sticky top-8">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
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
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, tableCategory: 'REGULAR' })}
                                                    className={`py-3 rounded-xl text-[10px] font-black border-2 transition-all ${formData.tableCategory === 'REGULAR' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 bg-white text-slate-400'}`}
                                                >
                                                    REGULAR
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, tableCategory: 'VIP' })}
                                                    className={`py-3 rounded-xl text-[10px] font-black border-2 transition-all ${formData.tableCategory === 'VIP' ? 'border-purple-600 bg-purple-50 text-purple-600' : 'border-slate-100 bg-white text-slate-400'}`}
                                                >
                                                    VIP
                                                </button>
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
                                                {(formData.timeSlots || []).map((slot, idx) => (
                                                    <div key={idx} className="bg-white/70 backdrop-blur-sm p-3 rounded-[1rem] border border-slate-100 shadow-sm hover:shadow-md hover:shadow-indigo-100/5 transition-all group relative animate-in zoom-in-95 duration-300 overflow-hidden">
                                                        <div className="absolute top-0 left-0 w-0.5 h-full bg-indigo-400 opacity-20 group-hover:opacity-40 transition-opacity"></div>
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
                                                                        <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Tarif Varian</span>
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

                {/* List Section */}
                <div className="lg:col-span-12 xl:col-span-7 space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Daftar Paket</h2>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {packages.map((pkg) => (
                            <div
                                key={pkg.id}
                                className={`group bg-white rounded-[2.5rem] border-2 transition-all p-1 hover:shadow-2xl hover:shadow-slate-200 hover:-translate-y-1 ${editingPackageId === pkg.id ? 'border-indigo-600 shadow-xl shadow-indigo-100' : 'border-slate-50'
                                    }`}
                            >
                                <div className="bg-slate-50/50 rounded-[2rem] p-6 h-full flex flex-col">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${pkg.type === 'hourly' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'
                                            }`}>
                                            {pkg.type === 'hourly' ? 'Playtime' : 'Duration'}
                                        </div>
                                        <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => handleEditPackage(pkg)} className="p-2.5 bg-white border border-slate-100 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeletePackage(pkg.id)} className="p-2.5 bg-white border border-slate-100 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="text-xl font-black text-slate-800 leading-tight mb-2 group-hover:text-indigo-600 transition-colors uppercase">{pkg.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${pkg.tableCategory === 'VIP' ? 'bg-purple-500' : 'bg-slate-400'}`}></div>
                                            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Meja {pkg.tableCategory}</span>
                                        </div>
                                    </div>

                                    <div className="mt-auto space-y-4">
                                        {pkg.type === 'fixed' && (
                                            <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100">
                                                <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
                                                    <Clock className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Durasi Utama</p>
                                                    <p className="text-sm font-black text-slate-700">{pkg.durationMinutes} Menit</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1">Struktur Tarif</p>
                                            <div className="grid grid-cols-1 gap-2">
                                                {pkg.timeSlots && pkg.timeSlots.length > 0 ? (
                                                    pkg.timeSlots.map((slot: any, sIdx: number) => (
                                                        <div key={sIdx} className="bg-white px-4 py-2.5 rounded-2xl border border-slate-100 flex justify-between items-center group/item hover:border-indigo-100 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover/item:bg-indigo-400 transition-colors"></div>
                                                                <span className="text-[10px] font-black text-slate-500 tracking-tight">{slot.start} - {slot.end}</span>
                                                            </div>
                                                            <span className="text-xs font-black text-indigo-600">Rp {slot.price.toLocaleString()}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-3 bg-white rounded-2xl border border-slate-100 text-[10px] font-black text-slate-300 italic">
                                                        Belum ada aturan khusus
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
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
