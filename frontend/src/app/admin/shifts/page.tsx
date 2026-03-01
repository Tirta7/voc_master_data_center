'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Clock,
    Users,
    ShieldAlert,
    RefreshCw,
    LogOut,
    Search,
    Calendar,
    Wallet,
    AlertTriangle,
    CheckCircle2,
    Timer,
    ArrowRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/components/ui/AlertProvider';
import { useMqtt } from '@/context/MqttContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function ShiftManagementPage() {
    const { hasPermission } = useAuth();
    const { showAlert } = useAlert();
    const { subscribe } = useMqtt();
    const [shifts, setShifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({
        active: 0,
        late: 0,
        ot: 0
    });

    useEffect(() => {
        fetchShifts();

        const unsubs = [
            subscribe('billiard/shift/started', fetchShifts),
            subscribe('billiard/shift/ended', fetchShifts),
            subscribe('billiard/assignments/updated', fetchShifts),
        ];

        return () => unsubs.forEach(u => u());
    }, [subscribe]);

    const fetchShifts = async () => {
        try {
            const res = await axios.get(`${API_URL}/finance/shifts/open`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setShifts(res.data);

            // Calculate quick stats
            const active = res.data.length;
            const late = res.data.filter((s: any) => s.latenessMinutes > 0).length;
            setStats({ active, late, ot: 0 }); // OT only calculated when closing

        } catch (err) {
            console.error('Failed to fetch shifts', err);
        } finally {
            setLoading(false);
        }
    };

    const handleForceEndShift = async (userId: number, userName: string) => {
        if (!confirm(`Paksa akhiri shift untuk ${userName}? Uang fisik akan dianggap Rp 0.`)) return;

        try {
            await axios.post(`${API_URL}/finance/shifts/end`, {
                cashPhysical: 0,
                note: `FORCE CLOSED BY ADMIN`
            }, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Force-For-User': userId // We might need to update backend to support this header or a param
                }
            });
            showAlert('Sukses', `Shift ${userName} berhasil diakhiri.`);
            fetchShifts();
        } catch (err: any) {
            showAlert('Gagal', err.response?.data?.message || 'Gagal mengakhiri shift.');
        }
    };

    if (!hasPermission('USER_MANAGE')) {
        return <div className="p-10 text-center font-bold text-slate-400 uppercase tracking-widest">Akses Ditolak</div>;
    }

    const filteredShifts = shifts.filter(s =>
        s.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.shiftName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Real-time Presence</span>
                        </div>
                        <h1 className="text-3xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight uppercase">
                            Manajemen <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Shift</span>
                        </h1>
                        <p className="text-slate-500 font-medium text-sm lg:text-base max-w-2xl">
                            Pantau keberadaan staf dan status keuangan shift secara langsung.
                        </p>
                    </div>

                    <div className="flex bg-white p-2 rounded-2xl border border-slate-200 shadow-sm md:w-80">
                        <Search className="w-5 h-5 text-slate-400 m-2" />
                        <input
                            type="text"
                            placeholder="Cari staf / shift..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 bg-transparent border-none focus:ring-0 font-bold text-sm text-slate-800 placeholder:text-slate-300"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Shift Berjalan', val: stats.active, icon: Timer, color: 'indigo' },
                        { label: 'Terlambat', val: stats.late, icon: AlertTriangle, color: 'rose' },
                        { label: 'Area Tercover', val: `${Math.round((shifts.reduce((acc, s) => acc + (s.assignedTableIds?.length || 0), 0) / 20) * 100)}%`, icon: Users, color: 'emerald' },
                        { label: 'Total Modal', val: `Rp ${shifts.reduce((acc, s) => acc + Number(s.cashStart), 0).toLocaleString()}`, icon: Wallet, color: 'sky' }
                    ].map((s, i) => (
                        <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 bg-${s.color}-50 text-${s.color}-600 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-${s.color}-600 group-hover:text-white`}>
                                    <s.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                                    <p className="text-2xl font-black text-slate-900">{s.val}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Shifts Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="h-80 bg-white rounded-[3rem] animate-pulse" />)}
                    </div>
                ) : filteredShifts.length === 0 ? (
                    <div className="bg-white p-20 rounded-[4rem] border border-slate-200 text-center space-y-4">
                        <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-[2rem] flex items-center justify-center mx-auto text-slate-300 shadow-inner">
                            <RefreshCw className="w-10 h-10" />
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Belum ada shift yang aktif.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredShifts.map((shift, idx) => (
                            <div key={idx} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden flex flex-col hover:-translate-y-2">
                                <div className={`h-3 bg-gradient-to-r ${shift.latenessMinutes > 0 ? 'from-rose-500 to-amber-500' : 'from-indigo-600 to-violet-600'}`} />

                                <div className="p-8 space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-xl group-hover:scale-110 transition-transform">
                                                {shift.user?.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900">{shift.user?.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded uppercase tracking-widest">{shift.shiftName || 'Manual'}</span>
                                                    <span className="text-xs text-slate-300">|</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{shift.user?.role?.name}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {shift.latenessMinutes > 0 && (
                                            <div className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full flex items-center gap-2 border border-rose-100 shadow-sm animate-pulse">
                                                <AlertTriangle className="w-3 h-3" />
                                                <span className="text-[10px] font-black tracking-widest">LATE</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Mulai</p>
                                                <p className="text-sm font-black text-slate-700">{new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Terlambat</p>
                                                <p className={`text-sm font-black ${shift.latenessMinutes > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                                    {shift.latenessMinutes} min
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-5 bg-indigo-50/50 rounded-[2rem] border border-indigo-100/50 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2 text-indigo-600">
                                                    <Wallet className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Modal Awal</span>
                                                </div>
                                                <span className="text-sm font-black text-indigo-900">Rp {Number(shift.cashStart).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Calendar className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Session ID</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-600">#{shift.id}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Area Penugasan</p>
                                            <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                                                {shift.assignedTableIds && shift.assignedTableIds.length > 0 ? (
                                                    shift.assignedTableIds.map((t: any, i: number) => (
                                                        <span key={i} className="px-2 py-1 bg-white border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600 uppercase">
                                                            {t.type === 'BILLIARD' ? 'B' : 'C'}{t.id}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-slate-300 italic">Belum ada penugasan spesifik</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100">
                                        <button
                                            onClick={() => handleForceEndShift(shift.userId, shift.user?.name)}
                                            className="w-full bg-slate-900 hover:bg-rose-600 text-white py-4 rounded-2xl font-black text-xs tracking-widest transition-all duration-300 shadow-xl shadow-slate-200 active:scale-95 flex items-center justify-center gap-3"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            FORCE END SHIFT
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Additional Info / Footer */}
                <div className="p-8 bg-indigo-900 rounded-[3rem] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-10 scale-150 rotate-12">
                        <ShieldAlert className="w-40 h-40" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-3">
                            <h3 className="text-2xl font-black tracking-tight">Pengawasan Finansial</h3>
                            <p className="text-indigo-200 text-sm max-w-lg leading-relaxed font-medium">
                                Seluruh selisih dana (discrepancy) akan tercatat secara otomatis pada Business Day Dashboard.
                                Gunakan fitur FORCE END hanya jika staf berhalangan hadir atau lupa menutup shift.
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.href = '/admin/reports/business-day'}
                            className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black text-xs hover:bg-indigo-50 transition-all flex items-center gap-2 group"
                        >
                            LIHAT DASHBOARD HARIAN
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
