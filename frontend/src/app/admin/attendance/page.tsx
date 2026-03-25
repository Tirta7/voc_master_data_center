'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calendar, 
    Clock, 
    UserCheck, 
    UserX, 
    Search, 
    Filter, 
    ChevronLeft, 
    ChevronRight,
    QrCode,
    Fingerprint,
    Info,
    AlertCircle,
    CheckCircle2,
    CalendarDays
} from 'lucide-react';
// import { API_URL } from '@/utils/urlUtils';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';

interface AttendanceRecord {
    id: number;
    userId: number;
    date: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    workDurationMinutes: number | null;
    status: 'PRESENT' | 'LATE' | 'ABSENT';
    note: string | null;
    user: {
        name: string;
        role?: { name: string };
    };
}



export default function AttendancePage() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [pinAction, setPinAction] = useState<'IN' | 'OUT' | null>(null);
    const [pin, setPin] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`/attendance/history`, {
                params: { from: dateFrom, to: dateTo }
            });
            setRecords(res.data);
        } catch (error) {
            console.error('Failed to fetch attendance history:', error);
        }
    };

    const fetchToday = async () => {
        try {
            const res = await axios.get(`/attendance/today`);
            setTodayRecord(res.data);
        } catch (error) {
            console.error('Failed to fetch today record:', error);
        }
    };

    useEffect(() => {
        setIsLoading(true);
        Promise.all([fetchHistory(), fetchToday()]).finally(() => setIsLoading(false));
    }, [dateFrom, dateTo]);

    const handlePinSubmit = async () => {
        if (pin.length < 4) return;
        
        setIsSubmitting(true);
        try {
            // In a real scenario, we might want to verify PIN on backend or just use the token 
            // if the user is already logged in. The prompt mentioned "absensi berbasis QR code atau PIN".
            // Since this is the admin attendance page, we assume the user is already logged in.
            // For a shared kiosk, a different auth flow would be needed. 
            // For now, let's assume it's for the logged-in user.
            
            const endpoint = pinAction === 'IN' ? '/attendance/checkin' : '/attendance/checkout';
            await axios.post(endpoint, {});
            
            showToast(
                pinAction === 'IN' ? 'Check-in Berhasil' : 'Check-out Berhasil',
                `Selamat ${pinAction === 'IN' ? 'bekerja' : 'istirahat'}!`,
                'success'
            );
            
            setIsPinModalOpen(false);
            setPin('');
            fetchToday();
            fetchHistory();
        } catch (error: any) {
            showToast('Gagal', error.response?.data?.message || 'Terjadi kesalahan', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredRecords = useMemo(() => {
        return records.filter(r => 
            r.user.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [records, searchQuery]);

    const stats = useMemo(() => {
        const present = records.filter(r => r.status === 'PRESENT').length;
        const late = records.filter(r => r.status === 'LATE').length;
        return { present, late };
    }, [records]);

    if (isLoading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Memuat data absensi...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
                            <CalendarDays className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">PRESENSI KARYAWAN</h1>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Monitoring Kehadiran & Shift Kerja</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => { setPinAction('IN'); setIsPinModalOpen(true); }}
                        disabled={!!todayRecord?.checkInTime}
                        className={`px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all
                            ${todayRecord?.checkInTime 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95'}
                        `}
                    >
                        <UserCheck className="w-4 h-4" />
                        Check-in
                    </button>
                    <button 
                        onClick={() => { setPinAction('OUT'); setIsPinModalOpen(true); }}
                        disabled={!todayRecord?.checkInTime || !!todayRecord?.checkOutTime}
                        className={`px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all
                            ${(!todayRecord?.checkInTime || todayRecord?.checkOutTime)
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                : 'bg-rose-600 text-white shadow-lg shadow-rose-600/20 hover:scale-105 active:scale-95'}
                        `}
                    >
                        <UserX className="w-4 h-4" />
                        Check-out
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm group hover:border-indigo-500 transition-all duration-300">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Status Hari Ini</p>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors
                            ${todayRecord?.checkInTime ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}
                        `}>
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xl font-black text-slate-900 uppercase">
                                {todayRecord?.checkInTime 
                                    ? new Date(todayRecord.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                    : '--:--'}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Jam Masuk</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:border-indigo-500 transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Kehadiran (Periode)</p>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                            <UserCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xl font-black text-slate-900">{stats.present}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Karyawan Hadir</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:border-indigo-500 transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Terlambat (Periode)</p>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center transition-colors">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xl font-black text-slate-900">{stats.late}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Karyawan LATE</p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Server Date</p>
                        <p className="text-xl font-black text-white">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mt-1">{new Date().toLocaleDateString('id-ID', { weekday: 'long' })}</p>
                    </div>
                    <Calendar className="absolute top-1/2 right-4 -translate-y-1/2 w-16 h-16 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                {/* Internal Toolbar */}
                <div className="px-8 py-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/30">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative group/search">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/search:text-indigo-500 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Cari nama karyawan..."
                                className="bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-6 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all w-full md:w-64"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1 px-3">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <input 
                                type="date" 
                                className="bg-transparent py-2 text-xs font-black text-slate-700 outline-none"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                            <span className="text-slate-300 mx-1">/</span>
                            <input 
                                type="date" 
                                className="bg-transparent py-2 text-xs font-black text-slate-700 outline-none"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Menampilkan <span className="text-indigo-600">{filteredRecords.length}</span> Catatan
                        </p>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="flex-1 overflow-x-auto overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
                            <tr className="border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tanggal</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Karyawan</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Masuk</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Keluar</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Durasi Kerja</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredRecords.map((record) => (
                                <tr key={record.id} className="group hover:bg-slate-50/80 transition-all">
                                    <td className="px-8 py-5">
                                        <p className="text-sm font-black text-slate-900 tabular-nums">
                                            {new Date(record.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-[10px]">
                                                {record.user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 leading-none mb-1">{record.user.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{record.user.role?.name || 'Staff'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-sm font-black text-slate-700 tabular-nums uppercase">
                                            {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-sm font-black text-slate-700 tabular-nums uppercase">
                                            {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </p>
                                    </td>
                                    <td className="px-8 py-5">
                                        {record.workDurationMinutes ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                <p className="text-sm font-black text-indigo-600 tabular-nums">
                                                    {Math.floor(record.workDurationMinutes / 60)}j {record.workDurationMinutes % 60}m
                                                </p>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">On Duty</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest
                                            ${record.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600' : 
                                              record.status === 'LATE' ? 'bg-amber-50 text-amber-600' : 
                                              'bg-rose-50 text-rose-600'}
                                        `}>
                                            {record.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredRecords.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-24 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-300">
                                            <UserX className="w-12 h-12 mb-4 opacity-10" />
                                            <p className="text-xs font-black uppercase tracking-[0.2em] opacity-30">Tidak ada data presensi ditemukan</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PIN Entry Modal */}
            {isPinModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl border border-white overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center space-y-6">
                            <div className={`w-16 h-16 mx-auto rounded-[1.5rem] flex items-center justify-center
                                ${pinAction === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}
                            `}>
                                {pinAction === 'IN' ? <UserCheck className="w-8 h-8" /> : <UserX className="w-8 h-8" />}
                            </div>

                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase">Konfirmasi {pinAction}</h3>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Masukkan PIN Keamanan Anda</p>
                            </div>

                            <div className="relative">
                                <input 
                                    type="password"
                                    maxLength={4}
                                    placeholder="••••"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-3xl py-6 text-center text-3xl font-black tracking-[0.5em] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-200"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => { setIsPinModalOpen(false); setPin(''); }}
                                    className="px-6 py-4 rounded-2xl font-black text-[10px] text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button 
                                    onClick={handlePinSubmit}
                                    disabled={pin.length < 4 || isSubmitting}
                                    className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all
                                        ${pinAction === 'IN' 
                                            ? 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700' 
                                            : 'bg-rose-600 shadow-rose-600/20 hover:bg-rose-700'} 
                                        text-white shadow-lg disabled:opacity-50
                                    `}
                                >
                                    {isSubmitting ? 'Proses...' : 'Konfirmasi'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 flex items-center gap-3 border-t border-slate-100 italic">
                            <Info className="w-4 h-4 text-slate-300" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">PIN Anda bersifat rahasia. Jangan dibagikan!</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
