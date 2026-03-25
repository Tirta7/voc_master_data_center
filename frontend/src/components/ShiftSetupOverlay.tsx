'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Wallet, ChevronRight, Loader2, LogOut, CheckCircle2, LayoutDashboard, Users, ShieldCheck, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useMqtt } from '@/context/MqttContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useAlert } from './ui/AlertProvider';


export default function ShiftSetupOverlay() {
    const { user, activeShift, refetchShift, logout, hasPermission } = useAuth();
    const { showAlert } = useAlert();
    const { subscribe } = useMqtt();
    const isManagementRole = ['ADMIN', 'SUPERADMIN', 'OWNER'].includes(user?.role?.toUpperCase() || '');
    const isProductionRole = ['KITCHEN', 'BARTENDER'].includes(user?.role?.toUpperCase() || '');
    const shouldShow = user && hasPermission('SHIFT_START') && !activeShift && !isProductionRole && !isManagementRole;
    
    useBodyScrollLock(!!shouldShow);
    const [cashStart, setCashStart] = useState<number | string>(user?.role?.toUpperCase() === 'WAITER' ? 0 : 500000);
    const [shiftName, setShiftName] = useState<string>('');
    const [availableShifts, setAvailableShifts] = useState<any[]>([]);
    const [openShifts, setOpenShifts] = useState<any[]>([]);
    const [cafeTables, setCafeTables] = useState<any[]>([]);
    const [billiardTables, setBilliardTables] = useState<any[]>([]);
    const [selectedTables, setSelectedTables] = useState<{ type: 'CAFE' | 'BILLIARD', id: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);

    const fetchData = useCallback(async () => {
        setFetchingData(true);
        try {
            const [shiftRes, cafeRes, billiardRes, openShiftsRes] = await Promise.all([
                axios.get(`/settings`),
                axios.get(`/cafe-table`),
                axios.get(`/billiard/tables`),
                axios.get(`/finance/shifts/open`)
            ]);

            const availableShiftsData = shiftRes.data.availableShifts || [];
            const cafeTablesData = cafeRes.data || [];
            const billiardTablesData = billiardRes.data || [];
            const openShiftsData = openShiftsRes.data || [];

            setAvailableShifts(availableShiftsData);
            setCafeTables(cafeTablesData);
            setBilliardTables(billiardTablesData);
            setOpenShifts(openShiftsData);

            // Auto-select tables from admin assignments, but EXCLUDE occupied ones
            const assignedTableIds = user?.assignedTableIds;
            if (user?.role?.toUpperCase() === 'WAITER' && assignedTableIds && assignedTableIds.length > 0) {
                const occupiedSet = new Set();
                openShiftsData.forEach((os: any) => {
                    if (os.userId === user?.id) return;
                    (os.assignedTableIds || []).forEach((t: any) => {
                        occupiedSet.add(`${t.type}_${t.id}`);
                    });
                });

                const freeAssignments = assignedTableIds.filter((t: any) =>
                    !occupiedSet.has(`${t.type}_${t.id}`)
                );

                console.log('Auto-selecting free tables (Overlay):', freeAssignments);
                setSelectedTables(freeAssignments);
            }
        } catch (error) {
            console.error('Failed to fetch shift data', error);
        } finally {
            setFetchingData(false);
        }
    }, [user]);

    useEffect(() => {
        if (user && hasPermission('SHIFT_START') && !activeShift) {
            fetchData();
            if (user?.baseShift) setShiftName(user.baseShift);
            if (user?.role?.toUpperCase() === 'WAITER') setCashStart(0);
        }
    }, [user, activeShift, fetchData, hasPermission]);

    // Real-time shift updates via MQTT
    useEffect(() => {
        const unsubs = [
            subscribe('billiard/shift/started', fetchData),
            subscribe('billiard/shift/ended', fetchData),
            subscribe('billiard/assignments/updated', fetchData),
        ];
        return () => unsubs.forEach(u => u());
    }, [subscribe, fetchData]);


    const toggleTable = (type: 'CAFE' | 'BILLIARD', id: number) => {
        setSelectedTables(prev => {
            const exists = prev.find(t => t.type === type && t.id === id);
            if (exists) {
                return prev.filter(t => !(t.type === type && t.id === id));
            } else {
                return [...prev, { type, id }];
            }
        });
    };

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`/finance/shifts/start`, {
                cashStart: Number(cashStart),
                shiftName: shiftName || null,
                assignedTableIds: selectedTables.length > 0 ? selectedTables : null
            }, {
            });
            await refetchShift();
            setLoading(false);
        } catch (error: any) {
            setLoading(false);
            console.error('Failed to start shift', error);
            const msg = error.response?.data?.message || 'Gagal memulai shift. Silakan coba lagi.';
            showAlert('Gagal', msg, { variant: 'error' });
        }
    };

    if (!shouldShow) return null;

    const isWaiter = user.role?.toUpperCase() === 'WAITER';
    const isAssignmentRequired = !['ADMIN', 'OWNER', 'CASHIER', 'KASIR', 'SUPERADMIN'].includes(user?.role?.toUpperCase() || '');

    // Calculate Table Occupancy
    const tableOccupancy = {
        CAFE: {} as Record<number, { id: number, name: string }[]>,
        BILLIARD: {} as Record<number, { id: number, name: string }[]>
    };

    openShifts.forEach(os => {
        if (os.userId === user?.id) return;
        (os.assignedTableIds || []).forEach((t: any) => {
            const type = t.type as 'CAFE' | 'BILLIARD';
            if (!tableOccupancy[type][t.id]) tableOccupancy[type][t.id] = [];
            tableOccupancy[type][t.id].push({ id: os.userId, name: os.user?.name || 'Waiter' });
        });
    });

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col lg:flex-row bg-white overflow-hidden overscroll-contain font-sans">
            {/* --- Left Header (Top on Mobile) --- */}
            <div className="w-full lg:w-1/3 bg-indigo-600 p-8 lg:p-12 flex flex-col justify-between text-white shrink-0">
                <div className="space-y-8">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <LayoutDashboard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-[0.5em] text-indigo-200/70">Persiapan Shift</h1>
                        <div className="mt-6 space-y-2">
                            <p className="text-indigo-100/60 text-[10px] font-black uppercase tracking-[0.4em]">Official Staff</p>
                            <h2 className="text-5xl font-light tracking-tighter text-white leading-none">
                                {user.name}
                            </h2>
                            <div className="h-px w-16 bg-gradient-to-r from-white/40 to-transparent my-6" />
                            <p className="text-indigo-100/80 text-sm font-medium italic">Silakan lengkapi pengaturan sesi kerja Anda hari ini.</p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 lg:mt-0">
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 text-indigo-100 hover:text-white font-semibold text-sm transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Ganti Akun
                    </button>
                </div>
            </div>

            {/* --- Right Content (Scrollable) --- */}
            <div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50">
                <div className="max-w-2xl mx-auto p-6 lg:p-12 space-y-10">
                    <form onSubmit={handleStart} className="space-y-8">
                        {/* 1. Modal Awal */}
                        {!isWaiter && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
                                    <Wallet className="w-4 h-4 text-indigo-600" />
                                    Modal Tunai Awal
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                                    <input
                                        type="number"
                                        required
                                        value={cashStart}
                                        onChange={(e) => setCashStart(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-2xl font-bold text-slate-900 transition-all font-sans"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        )}

                        {/* 2. Pilih Shift */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
                                <Clock className="w-4 h-4 text-indigo-600" />
                                Jadwal Shift
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {fetchingData ? (
                                    <div className="h-16 bg-slate-50 animate-pulse rounded-xl" />
                                ) : (
                                    <>
                                        {availableShifts.map((s: any) => (
                                            <button
                                                key={s.name}
                                                type="button"
                                                onClick={() => setShiftName(s.name)}
                                                className={`p-4 rounded-xl border-2 text-left transition-all ${shiftName === s.name
                                                    ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-600/10'
                                                    : 'bg-white border-slate-100 hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-slate-900 uppercase text-xs">{s.name}</p>
                                                        <p className="text-xs text-slate-500 mt-1">{s.startTime} - {s.endTime}</p>
                                                    </div>
                                                    {shiftName === s.name && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                                                </div>
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setShiftName('CUSTOM')}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${shiftName === 'CUSTOM' || (!availableShifts.some(as => as.name === shiftName) && shiftName !== '')
                                                ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-600/10'
                                                : 'bg-white border-slate-100 hover:border-slate-300'
                                                }`}
                                        >
                                            <p className="font-bold text-slate-900 uppercase text-xs">Shift Kustom</p>
                                            <p className="text-xs text-slate-500 mt-1">Input Nama Sendiri</p>
                                        </button>
                                    </>
                                )}
                            </div>

                            {(shiftName === 'CUSTOM' || (!availableShifts.some(as => as.name === shiftName) && shiftName !== '')) && (
                                <input
                                    type="text"
                                    required
                                    value={shiftName === 'CUSTOM' ? '' : shiftName}
                                    onChange={(e) => setShiftName(e.target.value)}
                                    className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                                    placeholder="Masukkan Nama Shift..."
                                />
                            )}
                        </div>

                        {/* 3. Penugasan Meja */}
                        {isAssignmentRequired && (
                            <div className="bg-white p-6 lg:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-10">
                                <div className="flex items-center justify-between pb-2">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Atur Penugasan</h2>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                                PILIH MEJA UNTUK {user.name} ({shiftName || 'SHIFT'})
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={fetchData}
                                        className="p-3 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-indigo-600"
                                    >
                                        <RefreshCw className={`w-5 h-5 ${fetchingData ? 'animate-spin text-indigo-600' : ''}`} />
                                    </button>
                                </div>

                                {/* Billiard Area */}
                                {billiardTables.length > 0 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                    <LayoutDashboard className="w-4 h-4 text-slate-600" />
                                                </div>
                                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Meja Billiard</h3>
                                            </div>
                                            <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">IOT Real-Time Control</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                            {billiardTables.map(table => {
                                                const isSelected = selectedTables.some(t => t.type === 'BILLIARD' && t.id === table.id);
                                                const occupants = tableOccupancy.BILLIARD[table.id] || [];
                                                const isOccupiedByOthers = occupants.length > 0;
                                                const isOfficial = (user?.assignedTableIds || []).some((t: any) => t.type === 'BILLIARD' && t.id === table.id);

                                                return (
                                                    <button
                                                        key={table.id}
                                                        type="button"
                                                        onClick={() => !isOccupiedByOthers && toggleTable('BILLIARD', table.id)}
                                                        className={`aspect-[4/3] rounded-2xl flex flex-col items-center justify-center p-3 relative transition-all duration-300 border-2 group shadow-sm ${isSelected
                                                            ? 'bg-[#1a1c2e] border-[#1a1c2e] text-white shadow-xl shadow-indigo-100 -translate-y-1'
                                                            : isOfficial
                                                                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-400/50 text-amber-900 shadow-lg shadow-amber-200/40'
                                                                : 'bg-white border-slate-50 text-slate-800 hover:border-slate-200'
                                                            } ${isOccupiedByOthers ? 'opacity-40 cursor-not-allowed grayscale-[0.5]' : ''}`}
                                                    >
                                                        {/* Status Dot */}
                                                        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${isSelected ? 'bg-amber-400' : isOfficial ? 'bg-amber-500' : 'hidden'
                                                            }`} />
                                                        {isOfficial && (
                                                            <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-white text-[8px] font-bold uppercase rounded-full">
                                                                TUGAS
                                                            </div>
                                                        )}

                                                        <span className={`text-[11px] font-black uppercase tracking-tight ${isSelected ? 'text-white' : isOfficial ? 'text-amber-900' : 'text-slate-600'
                                                            }`}>
                                                            Meja {table.tableName?.replace('Meja ', '') || table.id}
                                                        </span>

                                                        <div className="my-2">
                                                            {isSelected ? (
                                                                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                                                            ) : isOccupiedByOthers ? (
                                                                <ShieldCheck className="w-5 h-5 text-slate-300" />
                                                            ) : (
                                                                <Users className={`w-5 h-5 ${isOfficial ? 'text-amber-500' : 'text-slate-200'}`} />
                                                            )}
                                                        </div>

                                                        <div className="h-4 flex items-center justify-center overflow-hidden w-full">
                                                            <span className={`text-[9px] font-bold uppercase truncate px-2 ${isSelected ? 'text-slate-300' : isOccupiedByOthers ? 'text-slate-400' : 'text-slate-500'
                                                                }`}>
                                                                {isSelected ? user.name : (occupants.map(o => o.name).join(', ') || (isOfficial ? 'TUGAS UTAMA' : ''))}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Cafe Area */}
                                {cafeTables.length > 0 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                                                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                                </div>
                                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Meja Cafe</h3>
                                            </div>
                                            <div className="px-3 py-1 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.15em]">POS Menu Access</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                            {cafeTables.map(table => {
                                                const isSelected = selectedTables.some(t => t.type === 'CAFE' && t.id === table.id);
                                                const occupants = tableOccupancy.CAFE[table.id] || [];
                                                const isOccupiedByOthers = occupants.length > 0;
                                                const isOfficial = (user?.assignedTableIds || []).some((t: any) => t.type === 'CAFE' && t.id === table.id);

                                                return (
                                                    <button
                                                        key={table.id}
                                                        type="button"
                                                        onClick={() => !isOccupiedByOthers && toggleTable('CAFE', table.id)}
                                                        className={`aspect-[4/3] rounded-2xl flex flex-col items-center justify-center p-3 relative transition-all duration-300 border-2 group shadow-sm ${isSelected
                                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 -translate-y-1'
                                                            : isOfficial
                                                                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-400/50 text-amber-900 shadow-lg shadow-amber-200/40'
                                                                : 'bg-white border-slate-50 text-slate-800 hover:border-slate-200'
                                                            } ${isOccupiedByOthers ? 'opacity-40 cursor-not-allowed grayscale-[0.5]' : ''}`}
                                                    >
                                                        {/* Status Dot */}
                                                        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${isSelected ? 'bg-white' : isOfficial ? 'bg-amber-500' : 'hidden'
                                                            }`} />
                                                        {isOfficial && (
                                                            <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-white text-[8px] font-bold uppercase rounded-full">
                                                                TUGAS
                                                            </div>
                                                        )}

                                                        <span className={`text-[11px] font-black uppercase tracking-tight ${isSelected ? 'text-white' : isOfficial ? 'text-amber-900' : 'text-slate-600'
                                                            }`}>
                                                            Meja Cafe {table.tableName?.replace('Meja Cafe ', '') || table.id}
                                                        </span>

                                                        <div className="my-2">
                                                            {isSelected ? (
                                                                <CheckCircle2 className="w-5 h-5 text-white/80" />
                                                            ) : isOccupiedByOthers ? (
                                                                <ShieldCheck className="w-5 h-5 text-slate-300" />
                                                            ) : (
                                                                <Users className={`w-5 h-5 ${isOfficial ? 'text-amber-500' : 'text-slate-200'}`} />
                                                            )}
                                                        </div>

                                                        <div className="h-4 flex items-center justify-center overflow-hidden w-full">
                                                            <span className={`text-[9px] font-bold uppercase truncate px-2 ${isSelected ? 'text-white/70' : isOccupiedByOthers ? 'text-slate-400' : 'text-slate-500'
                                                                }`}>
                                                                {isSelected ? user.name : (occupants.map(o => o.name).join(', ') || (isOfficial ? 'TUGAS UTAMA' : ''))}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Submit */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading || !shiftName || shiftName === 'CUSTOM'}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-5 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                            >
                                {loading ? <Loader2 className="animate-spin w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                                {loading ? 'Memproses...' : 'Mulai Shift'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
