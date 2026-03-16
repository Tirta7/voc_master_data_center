'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Lock, Unlock, Shield, History, Info,
    Plus, Search, RefreshCw, X, Check,
    AlertTriangle, ChevronRight, User, Phone,
    CreditCard, Clock, Trash2, Edit2, Settings,
    LayoutGrid, List, Mail
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMqtt } from '@/context/MqttContext';
import { useToast } from '@/components/ui/ToastProvider';

const formatDate = (date: Date | string, formatStr: string) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    if (formatStr === 'HH:mm:ss' || formatStr === 'HH:mm') {
        const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: formatStr === 'HH:mm:ss' ? '2-digit' : undefined, hour12: false });
        return timeStr.replace(/\./g, ':');
    }

    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Locker {
    id: number;
    number: string;
    label: string;
    category: 'REGULAR' | 'VIP';
    status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
    pricePerHour: number;
    notes: string;
    activeSession?: {
        id: number;
        customerName: string;
        phone: string;
        memberId: number | null;
        memberName: string | null;
        startTime: string;
        isMemberFree: boolean;
        isLocked: boolean;
        failedPinAttempts: number;
    } | null;
}

export default function LockerPage() {
    const { hasPermission, user } = useAuth();
    const { subscribe } = useMqtt();
    const { showToast } = useToast();

    const [lockers, setLockers] = useState<Locker[]>([]);
    const [stats, setStats] = useState({ total: 0, available: 0, occupied: 0, maintenance: 0, todaySessions: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'grid' | 'list' | 'history'>('grid');
    const [searchLocker, setSearchLocker] = useState('');

    // Modals
    const [checkInModal, setCheckInModal] = useState<{ open: boolean; locker: Locker | null }>({ open: false, locker: null });
    const [checkOutModal, setCheckOutModal] = useState<{ open: boolean; locker: Locker | null }>({ open: false, locker: null });
    const [manageModal, setManageModal] = useState<{ open: boolean; locker: Locker | null }>({ open: false, locker: null });
    const [addModal, setAddModal] = useState(false);
    const [editModal, setEditModal] = useState<{ open: boolean; locker: Locker | null }>({ open: false, locker: null });
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; locker: Locker | null }>({ open: false, locker: null });
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Form states
    const [checkInForm, setCheckInForm] = useState({
        customerName: '',
        phone: '',
        identityNumber: '',
        pin: '',
        isMember: false,
        memberSearch: '',
        selectedMember: null as any
    });
    const [checkOutPin, setCheckOutPin] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [lockerRes, statsRes] = await Promise.all([
                axios.get(`${API_URL}/lockers`, config),
                axios.get(`${API_URL}/lockers/stats`, config)
            ]);
            setLockers(lockerRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Failed to fetch lockers:', error);
            showToast('Error', 'Gagal memuat data locker', 'warning');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchData();

        // MQTT refresh
        const unsubs = [
            subscribe('billiard/lockers/update', () => fetchData(true))
        ];
        return () => unsubs.forEach(u => u?.());
    }, [fetchData, subscribe]);

    const handleCheckIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkInModal.locker) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/lockers/${checkInModal.locker.id}/checkin`, {
                customerName: checkInForm.isMember ? checkInForm.selectedMember?.name : checkInForm.customerName,
                phone: checkInForm.isMember ? checkInForm.selectedMember?.phone : checkInForm.phone,
                identityNumber: checkInForm.identityNumber,
                pin: checkInForm.pin,
                memberId: checkInForm.isMember ? checkInForm.selectedMember?.id : undefined,
                memberName: checkInForm.isMember ? checkInForm.selectedMember?.name : undefined,
                isMemberFree: checkInForm.isMember
            }, { headers: { Authorization: `Bearer ${token}` } });

            showToast('Success', 'Check-in berhasil!', 'info');
            setCheckInModal({ open: false, locker: null });
            setCheckInForm({ customerName: '', phone: '', identityNumber: '', pin: '', isMember: false, memberSearch: '', selectedMember: null });
            fetchData(true);
        } catch (error: any) {
            showToast('Error', error.response?.data?.message || 'Gagal check-in', 'warning');
        }
    };

    const handleCheckOut = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkOutModal.locker) return;
        setIsVerifying(true);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/lockers/${checkOutModal.locker.id}/checkout`, {
                pin: checkOutPin
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.valid === false) {
                showToast('Error', res.data.message || 'PIN salah', 'warning');
            } else {
                showToast('Success', 'Check-out berhasil!', 'info');
                setCheckOutModal({ open: false, locker: null });
                setCheckOutPin('');
                fetchData(true);
            }
        } catch (error: any) {
            showToast('Error', error.response?.data?.message || 'Gagal check-out', 'warning');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleForceCheckOut = async (lockerId: number) => {
        if (!confirm('Yakin ingin melepas loker ini secara paksa? (Tanpa verifikasi PIN customer)')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/lockers/${lockerId}/force-checkout`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('Success', 'Locker berhasil dikosongkan secara paksa', 'info');
            setCheckOutModal({ open: false, locker: null });
            fetchData(true);
        } catch (error: any) {
            showToast('Error', error.response?.data?.message || 'Gagal force check-out', 'warning');
        }
    };

    const handleUpdate = async (data: Partial<Locker>) => {
        if (!editModal.locker) return;
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/lockers/${editModal.locker.id}`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('Success', 'Data locker berhasil diperbarui', 'info');
            setEditModal({ open: false, locker: null });
            fetchData(true);
        } catch (error: any) {
            showToast('Error', error.response?.data?.message || 'Gagal memperbarui locker', 'warning');
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm.locker) return;
        setDeleteLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/lockers/${deleteConfirm.locker.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('Success', `Locker ${deleteConfirm.locker.number} berhasil dihapus`, 'info');
            setDeleteConfirm({ open: false, locker: null });
            fetchData(true);
        } catch (error: any) {
            showToast('Error', error.response?.data?.message || 'Gagal menghapus locker. Pastikan tidak ada sesi aktif.', 'warning');
        } finally {
            setDeleteLoading(false);
        }
    };

    const searchMember = async (query: string) => {
        if (!query) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/members?search=${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.length > 0) {
                setCheckInForm(prev => ({ ...prev, selectedMember: res.data[0], customerName: res.data[0].name }));
            } else {
                showToast('Info', 'Member tidak ditemukan', 'info');
            }
        } catch (error) {
            console.error('Member search failed:', error);
        }
    };

    const filteredLockers = lockers.filter(l =>
        l.number.toLowerCase().includes(searchLocker.toLowerCase()) ||
        l.label?.toLowerCase().includes(searchLocker.toLowerCase())
    );

    if (loading) return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
            <div className="w-full max-w-7xl mx-auto space-y-8">
                <div className="h-64 bg-white rounded-3xl animate-pulse border border-slate-100 shadow-xl shadow-slate-100" />
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-28 bg-white rounded-3xl animate-pulse border border-slate-100" />
                    ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="aspect-square bg-white rounded-[2rem] animate-pulse border border-slate-100" />
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 lg:p-12 selection:bg-indigo-100 selection:text-indigo-900">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden h-screen w-screen">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full" />
            </div>

            <div className="max-w-7xl mx-auto space-y-8 relative z-10">
                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 rounded-3xl p-8 lg:p-10 text-white shadow-2xl shadow-indigo-200">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12" />
                    <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Operational Security</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight leading-tight">Locker Penitipan Barang</h1>
                            <p className="text-white/60 text-sm font-semibold mt-1 max-w-lg">Kelola penyimpanan barang barang berharga customer dengan sistem verifikasi PIN terenkripsi dan terintegrasi dengan tier member.</p>
                            <div className="flex flex-wrap gap-3 mt-5">
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                    📦 Total {stats.total} Locker
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                    🟢 {stats.available} Tersedia
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                            <button
                                onClick={() => fetchData()}
                                className="flex-1 lg:flex-none bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2.5 transition-all active:scale-95 group"
                            >
                                <RefreshCw className="w-5 h-5 transition-transform group-hover:rotate-180 duration-500" />
                                <span className="whitespace-nowrap">Refresh Data</span>
                            </button>
                            <button
                                onClick={() => setAddModal(true)}
                                className="flex-1 lg:flex-none bg-white text-indigo-600 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2.5 hover:bg-white/95 shadow-xl transition-all active:scale-95 group uppercase tracking-widest text-sm"
                            >
                                <Plus className="w-5 h-5 transition-transform group-hover:scale-110" />
                                <span className="whitespace-nowrap">Tambah Locker</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                        { label: 'Total Loker', value: stats.total, icon: LayoutGrid, color: 'indigo', gradient: 'from-indigo-400 to-indigo-600' },
                        { label: 'Tersedia', value: stats.available, icon: Check, color: 'emerald', gradient: 'from-emerald-400 to-emerald-600' },
                        { label: 'Terisi', value: stats.occupied, icon: Lock, color: 'rose', gradient: 'from-rose-400 to-rose-600' },
                        { label: 'Maintenance', value: stats.maintenance, icon: AlertTriangle, color: 'amber', gradient: 'from-amber-400 to-amber-600' },
                        { label: 'Sesi Hari Ini', value: stats.todaySessions, icon: History, color: 'blue', gradient: 'from-blue-400 to-blue-600' },
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-lg shadow-slate-100/60 transition-all hover:shadow-xl hover:-translate-y-0.5 group">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-2.5 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform shadow-inner`}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                                <div className={`h-1.5 w-10 rounded-full bg-gradient-to-r ${stat.gradient} opacity-20`} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">{stat.label}</p>
                            <p className={`text-2xl font-black text-slate-900 leading-none`}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Controls Area */}
                <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
                    <div className="w-full xl:max-w-xl relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari nomor locker atau label penempatan..."
                            value={searchLocker}
                            onChange={(e) => setSearchLocker(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold transition-all shadow-sm"
                        />
                    </div>

                    <div className="bg-slate-200/50 p-1.5 rounded-2xl flex gap-1 shadow-inner h-fit w-full xl:w-auto overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'grid', label: 'Grid View', icon: LayoutGrid },
                            { id: 'list', label: 'List View', icon: List },
                            { id: 'history', label: 'History Log', icon: History }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id as any)}
                                className={`flex-1 xl:flex-none px-6 py-3 rounded-xl flex items-center justify-center gap-2.5 font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                <t.icon className="w-4 h-4" />
                                <span className="whitespace-nowrap">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="relative min-h-[400px]">
                    {activeTab === 'grid' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-5">
                            {filteredLockers.map((locker) => (
                                <div
                                    key={locker.id}
                                    onClick={() => {
                                        if (locker.status === 'AVAILABLE') setCheckInModal({ open: true, locker });
                                        else if (locker.status === 'OCCUPIED') setCheckOutModal({ open: true, locker });
                                    }}
                                    className={`
                                        relative aspect-square rounded-[2rem] p-5 cursor-pointer transition-all active:scale-95 group overflow-hidden
                                        ${locker.status === 'AVAILABLE' ? 'bg-white border border-slate-100 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-100 hover:-translate-y-1' : ''}
                                        ${locker.status === 'OCCUPIED' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 hover:-translate-y-1' : ''}
                                        ${locker.status === 'MAINTENANCE' ? 'bg-slate-200 text-slate-500 grayscale' : ''}
                                    `}
                                >
                                    <div className="flex flex-col h-full justify-between items-center text-center relative z-10">
                                        <span className={`text-[9px] uppercase font-black tracking-[0.2em] px-2 py-0.5 rounded-md ${locker.status === 'AVAILABLE' ? 'text-indigo-500 bg-indigo-50' : 'text-white/60 bg-white/10'}`}>
                                            {locker.category}
                                        </span>

                                        <div className="flex flex-col items-center">
                                            <span className="text-4xl font-black tracking-tighter mb-1 select-none">{locker.number}</span>
                                            {locker.label && <span className="text-[10px] font-black opacity-60 uppercase truncate w-full px-2 tracking-tight">{locker.label}</span>}
                                        </div>

                                        <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${locker.status === 'AVAILABLE' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-white/20 text-white backdrop-blur-sm'
                                            }`}>
                                            {locker.status === 'AVAILABLE' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                            {locker.status}
                                        </div>
                                    </div>

                                    {/* Overlay for Available */}
                                    {locker.status === 'AVAILABLE' && (
                                        <div className="absolute inset-0 bg-indigo-600 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                                            <div className="text-center">
                                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-2 animate-bounce">
                                                    <Plus className="w-7 h-7 text-white" />
                                                </div>
                                                <span className="text-white font-black text-[10px] uppercase tracking-[0.2em]">Check-In</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Occupied Badges */}
                                    {locker.status === 'OCCUPIED' && locker.activeSession && (
                                        <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
                                            <div className="bg-white/15 p-1.5 rounded-lg backdrop-blur-md border border-white/10">
                                                <User className="w-3.5 h-3.5" />
                                            </div>
                                            {locker.activeSession.isMemberFree && (
                                                <div className="bg-emerald-400 text-indigo-900 shadow-lg shadow-emerald-400/30 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border border-emerald-300">FREE</div>
                                            )}
                                        </div>
                                    )}

                                    {/* CRUD Hover Actions (only for non-occupied lockers) */}
                                    {locker.status !== 'OCCUPIED' && (
                                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 z-20 px-3">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setEditModal({ open: true, locker }); }}
                                                className="p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-indigo-600 hover:bg-indigo-50 transition-all active:scale-90"
                                                title="Edit Locker"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, locker }); }}
                                                className="p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-rose-500 hover:bg-rose-50 transition-all active:scale-90"
                                                title="Hapus Locker"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            <div
                                onClick={() => setAddModal(true)}
                                className="aspect-square border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-3 text-slate-300 hover:border-indigo-400 hover:text-indigo-500 hover:bg-white hover:shadow-xl hover:shadow-indigo-50 cursor-pointer transition-all active:scale-95 bg-white/30 backdrop-blur-sm"
                            >
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                    <Plus className="w-8 h-8" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">New Loker</span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'list' && (
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xl shadow-slate-100/50">
                            <table className="w-full text-left">
                                <thead className="bg-[#F8FAFC] border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Locker Unit</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Kategori</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status Loker</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identitas Penyewa</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredLockers.map(locker => (
                                        <tr key={locker.id} className="hover:bg-slate-50/50 transition-all group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black ${locker.status === 'AVAILABLE' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-900 text-white'
                                                        }`}>
                                                        {locker.number}
                                                    </div>
                                                    {locker.label && <span className="text-xs font-bold text-slate-500">{locker.label}</span>}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${locker.category === 'VIP' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {locker.category}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${locker.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-600' :
                                                    locker.status === 'OCCUPIED' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    <div className={`w-2 h-2 rounded-full ${locker.status === 'AVAILABLE' ? 'bg-emerald-500' :
                                                        locker.status === 'OCCUPIED' ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'
                                                        }`} />
                                                    {locker.status}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 font-bold text-slate-700">
                                                {locker.activeSession ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-900 font-black tracking-tight">{locker.activeSession.customerName}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase tracking-widest">{locker.activeSession.phone || 'No Phone'}</span>
                                                    </div>
                                                ) : <span className="text-slate-200">Kosong</span>}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button
                                                    onClick={() => {
                                                        if (locker.status === 'AVAILABLE') setCheckInModal({ open: true, locker });
                                                        else if (locker.status === 'OCCUPIED') setCheckOutModal({ open: true, locker });
                                                    }}
                                                    className="bg-transparent hover:bg-slate-100 p-2.5 rounded-xl text-indigo-600 font-black text-[11px] uppercase tracking-widest transition-all active:scale-95"
                                                >
                                                    Detail Loker
                                                </button>
                                                <button
                                                    onClick={() => setEditModal({ open: true, locker })}
                                                    className="p-2.5 rounded-xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm({ open: true, locker })}
                                                    disabled={locker.status === 'OCCUPIED'}
                                                    className="p-2.5 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                                                    title={locker.status === 'OCCUPIED' ? 'Tidak bisa hapus saat terisi' : 'Hapus'}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'history' && <HistoryView />}
                </div>
            </div>

            {/* Modals */}
            {checkInModal.open && <CheckInModal modal={checkInModal} onClose={() => setCheckInModal({ open: false, locker: null })} onCheckIn={handleCheckIn} form={checkInForm} setForm={setCheckInForm} onSearchMember={searchMember} />}
            {checkOutModal.open && checkOutModal.locker && <CheckOutModal locker={checkOutModal.locker} onClose={() => setCheckOutModal({ open: false, locker: null })} onCheckOut={handleCheckOut} pin={checkOutPin} setPin={setCheckOutPin} isVerifying={isVerifying} onForceCheckOut={handleForceCheckOut} />}
            {addModal && <AddLockerModal onClose={() => setAddModal(false)} onRefresh={() => fetchData(true)} />}
            {editModal.open && editModal.locker && <EditLockerModal locker={editModal.locker} onClose={() => setEditModal({ open: false, locker: null })} onSave={handleUpdate} />}

            {/* Delete Confirmation Modal */}
            {
                deleteConfirm.open && deleteConfirm.locker && (
                    <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setDeleteConfirm({ open: false, locker: null })} />
                        <div className="relative bg-white rounded-[2.5rem] w-full max-w-sm shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-200 p-8">
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 bg-rose-100 rounded-3xl flex items-center justify-center mb-2">
                                    <Trash2 className="w-8 h-8 text-rose-500" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900">Hapus Locker?</h3>
                                <p className="text-slate-500 text-sm font-medium">
                                    Locker <strong className="text-slate-900">{deleteConfirm.locker.number}</strong> akan dihapus permanen.
                                    Tindakan ini tidak dapat dibatalkan.
                                </p>
                                <div className="flex gap-3 w-full mt-2">
                                    <button
                                        onClick={() => setDeleteConfirm({ open: false, locker: null })}
                                        className="flex-1 py-3 rounded-2xl font-black text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleteLoading}
                                        className="flex-1 py-3 rounded-2xl font-black text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {deleteLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        Ya, Hapus
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

// Re-using HistoryView, CheckInModal, etc components but with refined styling
function HistoryView() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/lockers/sessions/history?page=${page}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data.items);
            setTotalPages(res.data.totalPages);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xl shadow-slate-100/50 min-h-[400px]">
            <table className="w-full text-left">
                <thead className="bg-[#F8FAFC] border-b border-slate-100">
                    <tr>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Entitas Customer</th>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Locker #</th>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Aktivitas Sewa</th>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Nilai Transaksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {loading ? (
                        <tr><td colSpan={4} className="p-12 text-center text-slate-300 font-black uppercase text-xs animate-pulse">Sinkronisasi data riwayat...</td></tr>
                    ) : history.length === 0 ? (
                        <tr><td colSpan={4} className="p-12 text-center text-slate-300 font-black uppercase text-xs">Belum ada riwayat tercatat</td></tr>
                    ) : history.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="px-8 py-5">
                                <div className="font-black text-slate-900 tracking-tight leading-none mb-1">{item.customerName}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.phone || 'Sesi anonim'}</div>
                            </td>
                            <td className="px-8 py-5">
                                <span className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-xs font-black shadow-sm">
                                    {item.locker?.number || 'ERR'}
                                </span>
                            </td>
                            <td className="px-8 py-5 text-xs text-slate-500 font-medium">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="font-bold text-slate-700 tracking-tight">{formatDate(item.startTime, 'dd MMM, HH:mm')}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-widest pl-5">Selesai: {item.endTime ? formatDate(item.endTime, 'HH:mm') : '-'}</div>
                            </td>
                            <td className="px-8 py-5 text-right">
                                <div className={`font-black tracking-tight ${item.isMemberFree ? 'text-emerald-600' : 'text-slate-900'}`}>
                                    {item.isMemberFree ? 'BENEFIT MEMBER' : `Rp ${Number(item.price).toLocaleString()}`}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function CheckInModal({ modal, onClose, onCheckIn, form, setForm, onSearchMember }: any) {
    return (
        <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white rounded-[2.5rem] sm:rounded-[3.5rem] w-full max-w-md shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 text-white relative">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md shadow-xl border border-white/10">
                            <Lock className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black tracking-tighter uppercase">Check-In Unit {modal.locker?.number}</h3>
                            <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest leading-none">Security Protocol Active</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={onCheckIn} className="p-8 space-y-6">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1.5">
                        <button type="button" onClick={() => setForm({ ...form, isMember: false })} className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!form.isMember ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-500 hover:bg-slate-200'}`}>Umum / Guest</button>
                        <button type="button" onClick={() => setForm({ ...form, isMember: true })} className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.isMember ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-500 hover:bg-slate-200'}`}>Member Tier</button>
                    </div>

                    {form.isMember ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input type="text" placeholder="Lookup Member (RFID/HP)..." value={form.memberSearch} onChange={(e) => setForm({ ...form, memberSearch: e.target.value })} className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:font-medium text-sm" />
                                </div>
                                <button type="button" onClick={() => onSearchMember(form.memberSearch)} className="px-6 bg-indigo-600 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase active:scale-95 transition-all shadow-lg shadow-indigo-100">Scan</button>
                            </div>
                            {form.selectedMember && (
                                <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 flex items-center gap-4 shadow-inner">
                                    <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-indigo-900 font-black tracking-tight leading-none mb-1">{form.selectedMember.name}</div>
                                        <div className="text-indigo-600 text-[10px] font-black tracking-widest uppercase">{form.selectedMember.phone}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input required type="text" placeholder="Nama Lengkap Customer" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm" />
                            </div>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="text" placeholder="WhatsApp (Untuk Notifikasi)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm" />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Credential Keamanan (4 Digit PIN)</label>
                        <div className="relative">
                            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                            <input required type="password" maxLength={4} placeholder="• • • •" value={form.pin} onChange={(e) => { if (/^\d*$/.test(e.target.value)) setForm({ ...form, pin: e.target.value }); }} className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-indigo-500/20 rounded-2xl font-black text-2xl tracking-[1.5rem] focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none placeholder:tracking-normal text-center transition-all bg-indigo-500/5" />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex justify-between items-center">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate Sewa / Jam</div>
                        <div className="text-base font-black text-indigo-900 tracking-tight">
                            {form.isMember ? 'BENEFIT TIER 0' : `Rp ${Number(modal.locker?.pricePerHour).toLocaleString()}`}
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-3xl font-black tracking-[0.2em] transition-all shadow-2xl shadow-indigo-100 active:scale-95 uppercase text-xs">
                        Aktifkan Loker Sekarang
                    </button>
                </form>
            </div>
        </div>
    );
}

function CheckOutModal({ locker, onClose, onCheckOut, pin, setPin, isVerifying, onForceCheckOut }: any) {
    return (
        <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white rounded-[2.5rem] sm:rounded-[3.5rem] w-full max-w-md shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-br from-rose-600 to-rose-700 p-8 text-white relative">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/10 shadow-xl">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black tracking-tighter uppercase">Validasi Sesi {locker.number}</h3>
                            <p className="text-white/70 text-[11px] font-black uppercase tracking-widest leading-none">Identity Verification Required</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4 border border-slate-100 shadow-inner">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-xl flex items-center justify-center text-rose-500 border border-slate-100">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Penyewa Aktif</div>
                                    <div className="text-lg font-black text-slate-900 tracking-tight leading-none">{locker.activeSession?.customerName}</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-2 border-t border-slate-200/60">
                            <div className="space-y-1">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu Mulai</div>
                                <div className="text-sm font-black text-slate-700">{locker.activeSession?.startTime && formatDate(locker.activeSession.startTime, 'HH:mm:ss')}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Durasi Sewa</div>
                                <div className="text-sm font-black text-indigo-600">
                                    {(() => {
                                        const start = new Date(locker.activeSession?.startTime || Date.now());
                                        const diffMs = Date.now() - start.getTime();
                                        const hours = Math.floor(diffMs / 3600000);
                                        const mins = Math.floor((diffMs % 3600000) / 60000);
                                        return `${hours} Jam ${mins} Menit`;
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={onCheckOut} className="space-y-6 text-center">
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block">Masukkan Security PIN</label>
                            <input
                                required autoFocus type="password" maxLength={4} placeholder="• • • •" value={pin}
                                onChange={(e) => { if (/^\d*$/.test(e.target.value)) setPin(e.target.value); }}
                                className="w-full text-center py-5 bg-slate-50 border-2 border-rose-500/20 rounded-3xl font-black text-4xl tracking-[1.5rem] focus:ring-8 focus:ring-rose-500/5 focus:border-rose-500 outline-none transition-all placeholder:tracking-normal placeholder:font-medium bg-rose-500/5"
                            />
                        </div>

                        <div className="space-y-3">
                            <button
                                type="submit"
                                disabled={isVerifying || pin.length < 4}
                                className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-100 disabled:text-slate-300 text-white py-5 rounded-3xl font-black tracking-widest transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 uppercase text-xs"
                            >
                                {isVerifying ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                                Verifikasi & Selesaikan Sesi
                            </button>

                            <button
                                type="button"
                                onClick={() => onForceCheckOut(locker.id)}
                                className="w-full text-slate-300 hover:text-rose-600 font-black text-[10px] uppercase tracking-widest py-3 transition-all underline underline-offset-4"
                            >
                                Selesaikan Tanpa PIN (Staff Override)
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

function AddLockerModal({ onClose, onRefresh }: { onClose: () => void, onRefresh: () => void }) {
    const { showToast } = useToast() as any;
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        number: '',
        label: '',
        category: 'REGULAR',
        pricePerHour: 0,
        prefix: 'LK',
        startNumber: 1,
        count: 5
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const url = mode === 'single' ? `${API_URL}/lockers` : `${API_URL}/lockers/bulk`;
            const payload = mode === 'single'
                ? { number: form.number, label: form.label, category: form.category, pricePerHour: form.pricePerHour }
                : { prefix: form.prefix, startNumber: form.startNumber, count: form.count, category: form.category, pricePerHour: form.pricePerHour };

            await axios.post(url, payload, { headers: { Authorization: `Bearer ${token}` } });
            showToast('Success', `Locker berhasil dikonfigurasi!`, 'info');
            onRefresh();
            onClose();
        } catch (error: any) {
            showToast('Error', error.response?.data?.message || 'Gagal menambahkan locker', 'warning');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white rounded-[2.5rem] sm:rounded-[3.5rem] w-full max-w-md shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-slate-900 p-8 text-white relative">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/10">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black tracking-tighter uppercase">Konfigurasi Unit</h3>
                            <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.2em] leading-none">Add New Storage Slots</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1.5">
                        <button type="button" onClick={() => setMode('single')} className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black tracking-widest transition-all uppercase ${mode === 'single' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-500 hover:bg-slate-200'}`}>Satuan</button>
                        <button type="button" onClick={() => setMode('bulk')} className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black tracking-widest transition-all uppercase ${mode === 'bulk' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-500 hover:bg-slate-200'}`}>Bulk Add</button>
                    </div>

                    <div className="space-y-5">
                        {mode === 'single' ? (
                            <>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nomor Loker</label>
                                    <input required type="text" placeholder="e.g. A01, B20" value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Label (Opsional)</label>
                                    <input type="text" placeholder="e.g. Barisan Atas" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm transition-all" />
                                </div>
                            </>
                        ) : (
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Prefix</label>
                                    <input type="text" value={form.prefix} onChange={e => setForm({ ...form, prefix: e.target.value })} className="w-full px-3 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black focus:ring-4 focus:ring-indigo-500/10 outline-none text-center text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Start</label>
                                    <input type="number" value={form.startNumber} onChange={e => setForm({ ...form, startNumber: Number(e.target.value) })} className="w-full px-3 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black focus:ring-4 focus:ring-indigo-500/10 outline-none text-center text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Qty</label>
                                    <input type="number" value={form.count} onChange={e => setForm({ ...form, count: Number(e.target.value) })} className="w-full px-3 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black focus:ring-4 focus:ring-indigo-500/10 outline-none text-center text-sm" />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tier / Level</label>
                                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm appearance-none shadow-sm">
                                    <option value="REGULAR">REGULAR SLOT</option>
                                    <option value="VIP">VIP SLOT</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Harga / Jam</label>
                                <input type="number" value={form.pricePerHour} onChange={e => setForm({ ...form, pricePerHour: Number(e.target.value) })} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm transition-all" />
                            </div>
                        </div>
                    </div>

                    <button disabled={loading} type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-3xl font-black tracking-widest uppercase transition-all shadow-2xl active:scale-95 flex justify-center items-center gap-3 text-xs">
                        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        Initialize Storage Unit
                    </button>
                </form>
            </div>
        </div>
    );
}

function EditLockerModal({ locker, onClose, onSave }: { locker: any; onClose: () => void; onSave: (data: any) => Promise<void> }) {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        number: locker.number || '',
        label: locker.label || '',
        category: locker.category || 'REGULAR',
        status: locker.status || 'AVAILABLE',
        pricePerHour: locker.pricePerHour || 0,
        notes: locker.notes || '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(form);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white rounded-[2.5rem] sm:rounded-[3.5rem] w-full max-w-md shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white relative">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/10">
                            <Edit2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black tracking-tighter uppercase">Edit Locker {locker.number}</h3>
                            <p className="text-white/60 text-[11px] font-black uppercase tracking-widest leading-none">Perbarui Konfigurasi Unit</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Loker</label>
                            <input
                                required
                                type="text"
                                value={form.number}
                                onChange={e => setForm({ ...form, number: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-black focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Label</label>
                            <input
                                type="text"
                                value={form.label}
                                onChange={e => setForm({ ...form, label: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-black focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tier / Kategori</label>
                            <select
                                value={form.category}
                                onChange={e => setForm({ ...form, category: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-black focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm appearance-none"
                            >
                                <option value="REGULAR">REGULAR</option>
                                <option value="VIP">VIP</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                            <select
                                value={form.status}
                                onChange={e => setForm({ ...form, status: e.target.value })}
                                disabled={locker.status === 'OCCUPIED'}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-black focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm appearance-none disabled:opacity-50"
                            >
                                <option value="AVAILABLE">AVAILABLE</option>
                                <option value="MAINTENANCE">MAINTENANCE</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Harga / Jam (Rp)</label>
                        <input
                            type="number"
                            min={0}
                            value={form.pricePerHour}
                            onChange={e => setForm({ ...form, pricePerHour: Number(e.target.value) })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-black focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catatan (Opsional)</label>
                        <textarea
                            rows={2}
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            placeholder="Keterangan tambahan..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm transition-all resize-none"
                        />
                    </div>

                    {locker.status === 'OCCUPIED' && (
                        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                            <p className="text-amber-700 text-xs font-bold">Status tidak bisa diubah saat locker sedang terisi.</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl font-black text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-4 rounded-2xl font-black tracking-wide uppercase transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2 text-xs"
                        >
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Simpan Perubahan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
