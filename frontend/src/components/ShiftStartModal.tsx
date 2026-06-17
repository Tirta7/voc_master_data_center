'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Clock, Wallet, ChevronRight, Loader2, CheckCircle2, Users, ShieldCheck, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useMqtt } from '@/context/MqttContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface ShiftStartModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user: any;
}


export default function ShiftStartModal({ isOpen, onClose, onSuccess, user }: ShiftStartModalProps) {
    useBodyScrollLock(isOpen);
    const { subscribe } = useMqtt();
    const isProductionRole = ['KITCHEN', 'BARTENDER'].includes(user?.role?.toUpperCase() || '');


    const [cashStart, setCashStart] = useState<number | string>(user?.role?.toUpperCase() === 'WAITER' ? 0 : 500000);
    const [shiftName, setShiftName] = useState<string>('');
    const [coverNote, setCoverNote] = useState<string>('');
    const [emergencyWarning, setEmergencyWarning] = useState<string | null>(null);
    const [availableShifts, setAvailableShifts] = useState<any[]>([]);
    const [openShifts, setOpenShifts] = useState<any[]>([]);
    const [cafeTables, setCafeTables] = useState<any[]>([]);
    const [billiardTables, setBilliardTables] = useState<any[]>([]);
    const [selectedTables, setSelectedTables] = useState<{ type: 'CAFE' | 'BILLIARD', id: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(false);

    const fetchData = useCallback(async () => {
        setFetchingData(true);
        try {
            const [shiftRes, cafeRes, billiardRes, openShiftsRes] = await Promise.all([
                axios.get(`/settings`),
                axios.get(`/cafe-table`),
                axios.get(`/billiard/tables`),
                axios.get(`/finance/shifts/open`)
            ]);

            setAvailableShifts(shiftRes.data.availableShifts || []);
            setCafeTables(cafeRes.data || []);
            setBilliardTables(billiardRes.data || []);
            const openShiftsData = openShiftsRes.data || [];
            setOpenShifts(openShiftsData);

            const assignedTableIds = user?.assignedTableIds;
            if (user?.role?.toUpperCase() === 'WAITER' && assignedTableIds && assignedTableIds.length > 0) {
                const occupiedSet = new Set();
                openShiftsData.forEach((os: any) => {
                    if (os.userId === user?.id) return;
                    (os.assignedTableIds || []).forEach((t: any) => { occupiedSet.add(`${t.type}_${t.id}`); });
                });
                const freeAssignments = assignedTableIds.filter((t: any) => !occupiedSet.has(`${t.type}_${t.id}`));
                setSelectedTables(freeAssignments);
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setFetchingData(false);
        }
    }, [user]);

    useEffect(() => {
        if (isOpen) {
            fetchData();
            if (user?.baseShift) setShiftName(user.baseShift);
            if (user?.role?.toUpperCase() === 'WAITER') setCashStart(0);
        }
    }, [isOpen, user, fetchData]);

    // Real-time shift occupancy updates via MQTT
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

    const handleStart = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post(`/finance/shifts/start`, {
                cashStart: Number(cashStart),
                shiftName: shiftName || null,
                assignedTableIds: selectedTables.length > 0 ? selectedTables : null,
                coverNote: coverNote || null,
            }, {});
            // Show emergency cover warning if backend detects it
            if (res.data?.warning) {
                setEmergencyWarning(res.data.warning);
                return; // keep modal open to show warning
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Failed to start shift', error);
            const msg = error.response?.data?.message || 'Gagal memulai shift. Silakan coba lagi.';
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    const isWaiter = user?.role?.toUpperCase() === 'WAITER';
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

    if (!isOpen || isProductionRole) return null;

    return (
        <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 max-h-[100vh] sm:max-h-[90vh] flex flex-col">
                <header className="px-6 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 blur-3xl rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Mulai Shift</h2>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] sm:text-[12px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-widest">{user?.role}</span>
                            <span className="text-sm font-light text-slate-300">|</span>
                            <span className="text-sm font-bold text-slate-600 tracking-tight">{user?.name}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="relative z-10 p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </header>

                {/* Emergency Cover Warning Banner */}
                {emergencyWarning && (
                    <div className="mx-4 mt-4 p-3 bg-orange-50 border border-orange-200 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-orange-700 bg-orange-100 px-2 py-0.5 rounded uppercase tracking-widest">⚡ Cover Darurat Aktif</span>
                        </div>
                        <p className="text-[10px] font-semibold text-orange-600 leading-relaxed">{emergencyWarning}</p>
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => { setEmergencyWarning(null); onSuccess(); onClose(); }}
                                className="flex-1 py-2 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all"
                            >
                                Mengerti, Lanjutkan
                            </button>
                            <button
                                onClick={() => setEmergencyWarning(null)}
                                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-8 custom-scrollbar">
                    {/* section: Cash */}
                    {!isWaiter && (
                        <div className="space-y-3">
                            <label className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
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
                                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 text-2xl font-bold text-slate-900 transition-all font-sans"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    )}

                    {/* section: Shifts */}
                    <div className="space-y-3">
                        <label className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-600" />
                            Pilih Jadwal
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {availableShifts.map((s: any) => (
                                <button
                                    key={s.name}
                                    type="button"
                                    onClick={() => setShiftName(s.name)}
                                    className={`p-4 rounded-xl border-2 text-left transition-all flex justify-between items-center ${shiftName === s.name
                                        ? 'bg-indigo-50 border-indigo-600'
                                        : 'bg-white border-slate-100 hover:border-slate-300'
                                        }`}
                                >
                                    <div>
                                        <p className="font-bold text-slate-900 uppercase text-xs sm:text-sm">{s.name}</p>
                                        <p className="text-[10px] sm:text-[12px] text-slate-500 mt-1 uppercase tracking-wider">{s.startTime} - {s.endTime}</p>
                                    </div>
                                    {shiftName === s.name && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setShiftName('CUSTOM')}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${shiftName === 'CUSTOM' || (!availableShifts.some(as => as.name === shiftName) && shiftName !== '')
                                    ? 'bg-indigo-50 border-indigo-600'
                                    : 'bg-white border-slate-100 hover:border-slate-300'
                                    }`}
                            >
                                <p className="font-bold text-slate-900 uppercase text-xs sm:text-sm">Shift Kustom</p>
                                <p className="text-[10px] sm:text-[12px] text-slate-500 mt-0.5">Input Nama Manual</p>
                            </button>
                        </div>

                    {/* section: Cover Note (shown after shift option is selected) */}
                    {shiftName && !isWaiter && (
                        <div className="space-y-2 mt-4">
                            <label className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                📝 Catatan Shift (Opsional)
                            </label>
                            <textarea
                                value={coverNote}
                                onChange={(e) => setCoverNote(e.target.value)}
                                rows={2}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 text-sm font-medium text-slate-700 resize-none"
                                placeholder="Contoh: Cover shift menunggu Kasir Budi datang..."
                            />
                        </div>
                    )}
                        
                        {(shiftName === 'CUSTOM' || (!availableShifts.some(as => as.name === shiftName) && shiftName !== '')) && (
                            <input
                                type="text"
                                required
                                value={shiftName === 'CUSTOM' ? '' : shiftName}
                                onChange={(e) => setShiftName(e.target.value)}
                                className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                                placeholder="Nama Shift..."
                            />
                        )}
                    </div>

                    {/* section: Tables */}
                    {isAssignmentRequired && (
                        <div className="space-y-6 pt-6 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">Atur Penugasan</h3>
                                        <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">PILIH MEJA TUGAS ANDA</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={fetchData}
                                    className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-indigo-600"
                                >
                                    <RefreshCw className={`w-4 h-4 ${fetchingData ? 'animate-spin text-indigo-600' : ''}`} />
                                </button>
                            </div>

                            {/* Billiard Area */}
                            {billiardTables.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <h4 className="text-[10px] sm:text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">Meja Billiard</h4>
                                        <div className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded">
                                            <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">IOT Control</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                                                    className={`aspect-[4/3] rounded-xl flex flex-col items-center justify-center p-2 relative transition-all border-2 ${isSelected
                                                        ? 'bg-[#1a1c2e] border-[#1a1c2e] text-white shadow-lg'
                                                        : isOfficial
                                                            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-400/50 text-amber-900 shadow-lg shadow-amber-200/40'
                                                            : 'bg-white border-slate-50 text-slate-800 hover:border-slate-200'
                                                        } ${isOccupiedByOthers ? 'opacity-40 cursor-not-allowed grayscale-[0.5]' : ''}`}
                                                >
                                                    {/* Status Dot */}
                                                    <div className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-400' : isOfficial ? 'bg-amber-500' : 'hidden'
                                                        }`} />
                                                    {isOfficial && (
                                                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-amber-500 text-white text-[7px] sm:text-[9px] font-bold uppercase rounded-full">
                                                            TUGAS
                                                        </div>
                                                    )}

                                                    <span className={`text-[9px] sm:text-[11px] font-black uppercase tracking-tight leading-none ${isSelected ? 'text-white' : isOfficial ? 'text-amber-900' : 'text-slate-600'
                                                        }`}>
                                                        {table.tableName?.replace('Meja ', '') || table.id}
                                                    </span>

                                                    <div className="my-1">
                                                        {isSelected ? (
                                                            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                                                        ) : isOccupiedByOthers ? (
                                                            <ShieldCheck className="w-4 h-4 text-slate-300" />
                                                        ) : (
                                                            <Users className={`w-4 h-4 ${isOfficial ? 'text-amber-500' : 'text-slate-200'}`} />
                                                        )}
                                                    </div>

                                                    <div className="h-3 flex items-center justify-center overflow-hidden w-full px-1">
                                                        <span className={`text-[7px] sm:text-[9px] font-bold uppercase truncate ${isSelected ? 'text-slate-300' : isOccupiedByOthers ? 'text-slate-400' : 'text-slate-500'
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
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <h4 className="text-[10px] sm:text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">Meja Cafe</h4>
                                        <div className="px-2 py-0.5 bg-indigo-50/50 border border-indigo-100 rounded">
                                            <span className="text-[8px] sm:text-[10px] font-black text-indigo-600 uppercase tracking-widest">POS Access</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                                                    className={`aspect-[4/3] rounded-xl flex flex-col items-center justify-center p-2 relative transition-all border-2 ${isSelected
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                                                        : isOfficial
                                                            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-400/50 text-amber-900 shadow-lg shadow-amber-200/40'
                                                            : 'bg-white border-slate-50 text-slate-800 hover:border-slate-200'
                                                        } ${isOccupiedByOthers ? 'opacity-40 cursor-not-allowed grayscale-[0.5]' : ''}`}
                                                >
                                                    {/* Status Dot */}
                                                    <div className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : isOfficial ? 'bg-amber-500' : 'hidden'
                                                        }`} />
                                                    {isOfficial && (
                                                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-amber-500 text-white text-[7px] sm:text-[9px] font-bold uppercase rounded-full">
                                                            TUGAS
                                                        </div>
                                                    )}

                                                    <span className={`text-[9px] sm:text-[11px] font-black uppercase tracking-tight leading-none ${isSelected ? 'text-white' : isOfficial ? 'text-amber-900' : 'text-slate-600'
                                                        }`}>
                                                        {table.tableName?.replace('Meja Cafe ', '') || table.id}
                                                    </span>

                                                    <div className="my-1">
                                                        {isSelected ? (
                                                            <CheckCircle2 className="w-4 h-4 text-white/80" />
                                                        ) : isOccupiedByOthers ? (
                                                            <ShieldCheck className="w-4 h-4 text-slate-300" />
                                                        ) : (
                                                            <Users className={`w-4 h-4 ${isOfficial ? 'text-amber-500' : 'text-slate-200'}`} />
                                                        )}
                                                    </div>

                                                    <div className="h-3 flex items-center justify-center overflow-hidden w-full px-1">
                                                        <span className={`text-[7px] sm:text-[9px] font-bold uppercase truncate ${isSelected ? 'text-white/70' : isOccupiedByOthers ? 'text-slate-400' : 'text-slate-500'
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
                </div>

                <footer className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0 relative z-10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors uppercase text-xs sm:text-sm tracking-widest"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        disabled={loading || !shiftName || shiftName === 'CUSTOM'}
                        onClick={() => handleStart()}
                        className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-4 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-indigo-100"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        {loading ? 'Memproses...' : 'Mulai Shift'}
                    </button>
                </footer>
            </div>
        </div>
    );
}
