'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Clock, 
    Wallet, 
    ChevronRight, 
    Loader2, 
    LogOut, 
    CheckCircle2, 
    LayoutDashboard, 
    Users, 
    ShieldCheck, 
    RefreshCw, 
    Zap,
    ArrowRight,
    Shield,
    History,
    Sparkles,
    MousePointer2,
    Settings2,
    Briefcase,
    Activity,
    Lock,
    ShieldAlert,
    Save
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useMqtt } from '@/context/MqttContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useAlert } from './ui/AlertProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '@/lib/socket';

export default function ShiftSetupOverlay() {
    const { user, activeShift, refetchShift, refetchProfile, logout, hasPermission } = useAuth();
    const { showAlert, showConfirm } = useAlert();
    const { subscribe } = useMqtt();
    const userRole = user?.role?.toUpperCase() || '';
    const isWaiter = userRole.includes('WAITER') || userRole.includes('WAITERS') || userRole.includes('PELAYAN');
    const isCashier = userRole.includes('KASIR') || userRole.includes('CASHIER');
    const isManagementRole = ['ADMIN', 'SUPERADMIN', 'OWNER', 'MANAGER'].some(r => userRole.includes(r));
    const isProductionRole = ['KITCHEN', 'BARTENDER', 'CHEF'].some(r => userRole.includes(r));
    
    const [isManualOpen, setIsManualOpen] = useState(false);

    const isStaff = isWaiter || isCashier;
    const shouldShow = isManualOpen || (!!user && (isStaff || hasPermission('SHIFT_START')) && !activeShift && !isProductionRole && !isManagementRole);
    
    useBodyScrollLock(!!shouldShow);
    const [cashStart, setCashStart] = useState<number | string>(isWaiter ? 0 : 500000);
    const [shiftName, setShiftName] = useState<string>('');
    const [availableShifts, setAvailableShifts] = useState<any[]>([]);
    const [openShifts, setOpenShifts] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [cafeTables, setCafeTables] = useState<any[]>([]);
    const [billiardTables, setBilliardTables] = useState<any[]>([]);
    const [selectedTables, setSelectedTables] = useState<{ type: 'CAFE' | 'BILLIARD', id: number }[]>([]);
    const [pendingRequests, setPendingRequests] = useState<Record<string, number>>({}); // key: 'TYPE_ID', value: requestId
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);

    const fetchData = useCallback(async () => {
        setFetchingData(true);
        try {
            const [shiftRes, cafeRes, billiardRes, openShiftsRes, employeesRes] = await Promise.all([
                axios.get(`/settings`),
                axios.get(`/cafe-table`),
                axios.get(`/billiard/tables`),
                axios.get(`/finance/shifts/open`),
                axios.get(`/users/employees`)
            ]);

            setAvailableShifts(shiftRes.data.availableShifts || []);
            setCafeTables(cafeRes.data || []);
            setBilliardTables(billiardRes.data || []);
            setOpenShifts(openShiftsRes.data || []);
            setEmployees(employeesRes.data || []);

            const assignedTableIds = user?.assignedTableIds || [];
            if (isWaiter) {
                const occupiedSet = new Set();
                openShiftsRes.data.forEach((os: any) => {
                    if (os.userId === user?.id) return;
                    (os.assignedTableIds || []).forEach((t: any) => {
                        occupiedSet.add(`${t.type}_${t.id}`);
                    });
                });

                const freeAssignments = assignedTableIds.filter((t: any) =>
                    !occupiedSet.has(`${t.type}_${t.id}`)
                );

                setSelectedTables(prev => {
                    // On first load, use all free assignments
                    if (prev.length === 0) return freeAssignments;
                    
                    // On subsequent refreshes (due to MQTT/Socket sync):
                    // 1. Keep current selections that are still free (not occupied by others)
                    // 2. This preserves manually approved tables
                    return prev.filter(t => !occupiedSet.has(`${t.type}_${t.id}`));
                });
            }
        } catch (error) {
            console.error('Failed to fetch shift data', error);
        } finally {
            setFetchingData(false);
        }
    }, [user, isWaiter]);

    useEffect(() => {
        if (activeShift && activeShift.id) {
            setCashStart(activeShift.cashStart || 0);
            if (activeShift.shiftName) setShiftName(activeShift.shiftName);
            return;
        }

        if (user && (hasPermission('SHIFT_START') || isStaff)) {
            refetchShift(); // Ensure we have the latest shift status from context
            fetchData();
            if (user?.baseShift) setShiftName(user.baseShift);
            if (isWaiter) setCashStart(0);
            else setCashStart(500000); // Default for non-waiters
        }
    }, [user, activeShift, fetchData, hasPermission, isStaff, isWaiter, refetchShift]);

    useEffect(() => {
        const unsubs = [
            subscribe('billiard/shift/started', fetchData),
            subscribe('billiard/shift/ended', fetchData),
            subscribe('billiard/assignments/updated', fetchData),
            subscribe('billiard/user/+/status', fetchData),
        ];
        return () => unsubs.forEach(u => u());
    }, [subscribe, fetchData]);

    useEffect(() => {
        if (!socket) return;
        const handler = (data: { userId: number }) => {
            if (data.userId === user?.id) {
                refetchProfile();
                fetchData();
            }
        };

        const approvalHandler = (payload: any) => {
            if (payload.moduleType === 'TABLE_ACCESS' && payload.requestedByUserId === user?.id) {
                const { tableType, tableId, tableName } = payload.metadata;
                const key = `${tableType}_${tableId}`;
                
                if (payload.status === 'APPROVED') {
                    showAlert('Akses Disetujui', `Izin akses ${tableName} telah diberikan.`, { variant: 'info' });
                    setSelectedTables(prev => [...prev, { type: tableType, id: tableId }]);
                } else if (payload.status === 'REJECTED') {
                    showAlert('Akses Ditolak', `Permintaan akses ${tableName} tidak diizinkan.`, { variant: 'error' });
                }
                
                setPendingRequests(prev => {
                    const newReqs = { ...prev };
                    delete newReqs[key];
                    return newReqs;
                });
            }
        };

        socket.on('assignments_updated', handler);
        socket.on('approval_finalized', approvalHandler);
        return () => { 
            socket.off('assignments_updated', handler); 
            socket.off('approval_finalized', approvalHandler);
        };
    }, [socket, user?.id, fetchData, refetchProfile, showAlert]);

    useEffect(() => {
        const handler = () => setIsManualOpen(true);
        window.addEventListener('openShiftSetup', handler);
        return () => window.removeEventListener('openShiftSetup', handler);
    }, []);

    useEffect(() => {
        if (!isManualOpen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsManualOpen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isManualOpen]);

    const toggleTable = async (type: 'CAFE' | 'BILLIARD', id: number) => {
        const table = type === 'BILLIARD' 
            ? billiardTables.find(t => t.id === id) 
            : cafeTables.find(t => t.id === id);
        const tableName = table?.tableName || `${type === 'BILLIARD' ? 'Meja Billiard' : 'Meja Cafe'} ${id}`;

        const isOfficial = (user?.assignedTableIds || []).some((t: any) => t.type === type && t.id === id);
        const isSelected = selectedTables.some(t => t.type === type && t.id === id);

        // If not official and not currently selected, ask for permission
        if (!isOfficial && !isSelected && isWaiter) {
            const key = `${type}_${id}`;
            if (pendingRequests[key]) {
                showAlert('Menunggu Izin', 'Permintaan akses meja ini sedang menunggu persetujuan kasir.', { variant: 'info' });
                return;
            }

            const confirmed = await showConfirm(
                'Izin Diperlukan',
                `Meja ${tableName} berada diluar area penugasan Anda. Minta izin kepada kasir?`,
                {
                    variant: 'warning',
                    confirmLabel: 'Minta Izin',
                    cancelLabel: 'Batal',
                }
            );

            if (confirmed) {
                try {
                    const res = await axios.post('/approval/request/table-access', {
                        tableId: id,
                        tableType: type,
                        tableName: tableName
                    });
                    setPendingRequests(prev => ({ ...prev, [key]: res.data.id }));
                    showAlert('Permintaan Terkirim', 'Silakan tunggu persetujuan dari kasir.', { variant: 'info' });
                } catch (err) {
                    showAlert('Gagal', 'Gagal mengirim permintaan izin.', { variant: 'error' });
                }
            }
            return;
        }

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
            });
            await refetchShift();
            setIsManualOpen(false);
        } catch (error: any) {
            console.error('Failed to start shift', error);
            const msg = error.response?.data?.message || 'Gagal memulai shift. Silakan coba lagi.';
            showAlert('Gagal', msg, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (!shouldShow) return null;

    const isAssignmentRequired = !['ADMIN', 'OWNER', 'CASHIER', 'KASIR', 'SUPERADMIN'].includes(user?.role?.toUpperCase() || '');

    const tableOccupancy = {
        CAFE: {} as Record<number, { id: number, name: string, isActive: boolean }[]>,
        BILLIARD: {} as Record<number, { id: number, name: string, isActive: boolean }[]>
    };

     openShifts.forEach(os => {
        if (os.userId === user?.id) return;
        (os.assignedTableIds || []).forEach((t: any) => {
            const type = t.type as 'CAFE' | 'BILLIARD';
            if (!tableOccupancy[type][t.id]) tableOccupancy[type][t.id] = [];
            tableOccupancy[type][t.id].push({ id: os.userId, name: os.user?.name || 'Waiter', isActive: true });
        });
    });

    // Merge default assignments for employees who haven't started their shift yet
    employees.forEach(emp => {
        if (emp.id === user?.id) return;
        // Skip if they already have an open shift (handled above)
        if (openShifts.some(os => os.userId === emp.id)) return;

        (emp.assignedTableIds || []).forEach((t: any) => {
            const type = t.type as 'CAFE' | 'BILLIARD';
            if (!tableOccupancy[type][t.id]) tableOccupancy[type][t.id] = [];
            // Avoid duplicate names if they are already in the list
            if (!tableOccupancy[type][t.id].some(o => o.id === emp.id)) {
                tableOccupancy[type][t.id].push({ id: emp.id, name: emp.name, isActive: false });
            }
        });
    });

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex flex-col lg:flex-row bg-[#0F172A] overflow-hidden overscroll-contain font-sans"
            >
                {/* --- Sidebar: Professional Slate --- */}
                <motion.div 
                    initial={{ x: -60, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full lg:w-[360px] bg-[#1E293B] p-8 lg:p-10 flex flex-col justify-between text-white shrink-0 border-r border-slate-700/50"
                >
                    <div className="space-y-12">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/20">
                                <ShieldCheck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-sm font-bold tracking-tight text-white">Management System</h1>
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Internal Staff Portal</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Current Session</p>
                                <h2 className="text-3xl font-semibold tracking-tight text-white leading-tight">
                                    {user?.name}
                                </h2>
                                <div className="flex items-center gap-2 pt-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-xs font-medium text-slate-300">{user?.role?.toUpperCase()}</span>
                                </div>
                            </div>
                            
                            <div className="h-px w-full bg-slate-700/50" />
                            
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Silakan konfigurasi modal awal dan pilih area penugasan Anda untuk memulai operasional hari ini.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 pt-10">
                        <div className="grid grid-cols-1 gap-2">
                            <button
                                onClick={() => {
                                    refetchProfile();
                                    fetchData();
                                }}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700 transition-all group"
                            >
                                <RefreshCw className={`w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors ${fetchingData ? 'animate-spin' : ''}`} />
                                <span className="text-xs font-semibold text-slate-300">Sinkronisasi Data</span>
                            </button>
                            
                            <button
                                onClick={logout}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all group"
                            >
                                <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-400 transition-colors" />
                                <span className="text-xs font-semibold text-slate-300 group-hover:text-rose-300">Keluar Sesi</span>
                            </button>
                        </div>
                        
                        <div className="flex items-center justify-center gap-2 pt-4">
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">v2.4.0 Final Release</span>
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                        </div>
                    </div>
                </motion.div>

                {/* --- Main Content: Clean Canvas --- */}
                <div className="flex-1 overflow-y-auto bg-[#F1F5F9] overscroll-contain">
                    <div className="max-w-4xl mx-auto p-6 lg:p-16">
                        <motion.form 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1, duration: 0.6 }}
                            onSubmit={handleStart} 
                            className="space-y-12"
                        >
                            {/* Header Section */}
                            <div className="flex flex-col gap-1 border-b border-slate-200 pb-8">
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Persiapan Operasional</h3>
                                <p className="text-sm text-slate-500">Lengkapi detail berikut untuk mengaktifkan sesi kerja Anda.</p>
                            </div>

                            {/* 1. Modal Tunai */}
                            {!isWaiter && (
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Wallet className="w-4 h-4" />
                                        <h4 className="text-[11px] font-bold uppercase tracking-widest">Modal Tunai Awal</h4>
                                    </div>
                                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all">
                                        <div className="flex items-baseline gap-3">
                                            <span className="text-2xl font-bold text-slate-400">IDR</span>
                                            <input
                                                type="text"
                                                required
                                                value={Number(cashStart).toLocaleString('id-ID')}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setCashStart(val === '' ? 0 : parseInt(val));
                                                }}
                                                className="w-full bg-transparent text-5xl font-bold text-slate-900 placeholder:text-slate-100 focus:outline-none tracking-tight"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* 2. Pilih Shift */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Clock className="w-4 h-4" />
                                    <h4 className="text-[11px] font-bold uppercase tracking-widest">Pilih Jadwal Shift</h4>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {fetchingData ? (
                                        [1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-slate-100" />)
                                    ) : (
                                        <>
                                            {availableShifts.map((s: any) => (
                                                <button
                                                    key={s.name}
                                                    type="button"
                                                    onClick={() => setShiftName(s.name)}
                                                    className={`group p-5 rounded-xl border-2 text-left transition-all ${shiftName === s.name
                                                        ? 'bg-white border-indigo-600 shadow-md'
                                                        : 'bg-white border-slate-100 hover:border-slate-200'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="space-y-1">
                                                            <h5 className={`font-bold text-sm ${shiftName === s.name ? 'text-indigo-600' : 'text-slate-900'}`}>{s.name}</h5>
                                                            <div className="flex items-center gap-1.5 pt-0.5 text-slate-400">
                                                                <History className="w-3 h-3" />
                                                                <p className="text-[10px] font-medium">{s.startTime} — {s.endTime}</p>
                                                            </div>
                                                        </div>
                                                        {shiftName === s.name && (
                                                            <div className="bg-indigo-600 rounded-full p-1">
                                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                            
                                            <button
                                                type="button"
                                                onClick={() => setShiftName('CUSTOM')}
                                                className={`p-5 rounded-xl border-2 text-left transition-all ${shiftName === 'CUSTOM' || (!availableShifts.some(as => as.name === shiftName) && shiftName !== '')
                                                    ? 'bg-white border-indigo-600 shadow-md'
                                                    : 'bg-white border-slate-100 hover:border-slate-200'
                                                    }`}
                                            >
                                                <h5 className={`font-bold text-sm ${shiftName === 'CUSTOM' ? 'text-indigo-600' : 'text-slate-900'}`}>Shift Khusus</h5>
                                                <p className="text-[10px] font-medium text-slate-400 pt-1">Gunakan nama kustom</p>
                                            </button>
                                        </>
                                    )}
                                </div>

                                <AnimatePresence>
                                    {(shiftName === 'CUSTOM' || (!availableShifts.some(as => as.name === shiftName) && shiftName !== '')) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <input
                                                type="text"
                                                required
                                                value={shiftName === 'CUSTOM' ? '' : shiftName}
                                                onChange={(e) => setShiftName(e.target.value)}
                                                className="w-full mt-2 px-5 py-4 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold text-slate-900"
                                                placeholder="Contoh: Shift Lembur / Ramadhan..."
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </section>

                            {/* 3. Penugasan Meja */}
                            {isAssignmentRequired && (
                                <section className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Briefcase className="w-4 h-4" />
                                            <h4 className="text-[11px] font-bold uppercase tracking-widest">Penugasan Area Kerja</h4>
                                        </div>
                                        <div className="px-3 py-1 bg-slate-200 rounded-full text-[10px] font-bold text-slate-600">
                                            Real-time Sync Active
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 lg:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-12">
                                        {/* Billiard Section */}
                                        {billiardTables.length > 0 && (
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                                                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                                                        <Activity className="w-4 h-4" />
                                                    </div>
                                                    <h5 className="font-bold text-slate-900">Meja Billiard</h5>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                    {billiardTables.map(table => {
                                                        const isSelected = selectedTables.some(t => t.type === 'BILLIARD' && t.id === table.id);
                                                        const occupants = tableOccupancy.BILLIARD[table.id] || [];
                                                        const isOccupiedByOthers = occupants.length > 0;
                                                        const isActivelyOccupied = occupants.some(o => o.isActive);
                                                        const isOfficial = (user?.assignedTableIds || []).some((t: any) => t.type === 'BILLIARD' && t.id === table.id);
                                                        const isPending = !!pendingRequests[`BILLIARD_${table.id}`];

                                                        return (
                                                            <button
                                                                key={table.id}
                                                                type="button"
                                                                onClick={() => !isActivelyOccupied && toggleTable('BILLIARD', table.id)}
                                                                className={`group relative aspect-square rounded-2xl border-2 transition-all flex flex-col items-center justify-between p-4 ${isSelected
                                                                    ? 'bg-slate-900 border-slate-900 text-white shadow-xl -translate-y-1'
                                                                    : isOfficial
                                                                        ? 'bg-white border-amber-400 text-amber-900 shadow-sm'
                                                                        : isPending
                                                                            ? 'bg-amber-50 border-amber-200 text-amber-600 animate-pulse'
                                                                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                                                    } ${isActivelyOccupied ? 'opacity-90 cursor-not-allowed border-amber-200 bg-amber-50/30' : ''}`}
                                                            >
                                                                <div className="w-full flex justify-between items-center opacity-40">
                                                                    <span className="text-[10px] font-bold tracking-widest uppercase">B-{table.id < 10 ? `0${table.id}` : table.id}</span>
                                                                    <div className="flex gap-1">
                                                                        <div className={`w-1 h-1 rounded-full ${isOccupiedByOthers || isOfficial ? 'bg-amber-400' : 'bg-slate-300'}`} />
                                                                        <div className={`w-1 h-1 rounded-full ${isOccupiedByOthers || isOfficial ? 'bg-amber-400' : 'bg-slate-300'}`} />
                                                                        {isOccupiedByOthers && <div className="w-1 h-1 rounded-full bg-amber-400" />}
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-col items-center gap-2">
                                                                    <span className={`text-sm font-bold uppercase tracking-widest ${isSelected ? 'text-white' : isOccupiedByOthers || isOfficial ? 'text-amber-900' : 'text-slate-600'}`}>
                                                                        Meja {table.tableName?.replace('Meja ', '') || table.id}
                                                                    </span>
                                                                    
                                                                    <div className="p-2 rounded-xl bg-current/5">
                                                                        {isSelected ? (
                                                                            <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                                                                        ) : isActivelyOccupied ? (
                                                                            <Users className="w-5 h-5 text-amber-600" />
                                                                        ) : isPending ? (
                                                                            <Lock className="w-5 h-5 text-amber-500" />
                                                                        ) : (
                                                                            <Users className={`w-5 h-5 ${isOfficial ? 'text-amber-500' : 'text-slate-200'}`} />
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className={`w-full px-2 py-1.5 rounded-lg text-center ${isSelected ? 'bg-white/10' : isPending ? 'bg-amber-100/50' : 'bg-slate-100/50'}`}>
                                                                    <span className={`text-[9px] font-bold uppercase tracking-wider block truncate ${isSelected ? 'text-indigo-200' : isPending ? 'text-amber-600' : isOccupiedByOthers ? 'text-amber-700' : 'text-slate-400'}`}>
                                                                        {isSelected ? user?.name?.split(' ')[0] : isPending ? 'Menunggu Izin' : (occupants.length > 0 ? occupants.map(o => o.name.split(' ')[0]).join(', ') : (isOfficial ? 'Tugas Utama' : 'Kosong'))}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Cafe Section */}
                                        {cafeTables.length > 0 && (
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                                                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                                                        <LayoutDashboard className="w-4 h-4" />
                                                    </div>
                                                    <h5 className="font-bold text-slate-900">Meja Cafe</h5>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                    {cafeTables.map(table => {
                                                        const isSelected = selectedTables.some(t => t.type === 'CAFE' && t.id === table.id);
                                                        const occupants = tableOccupancy.CAFE[table.id] || [];
                                                        const isOccupiedByOthers = occupants.length > 0;
                                                        const isActivelyOccupied = occupants.some(o => o.isActive);
                                                        const isOfficial = (user?.assignedTableIds || []).some((t: any) => t.type === 'CAFE' && t.id === table.id);
                                                        const isPending = !!pendingRequests[`CAFE_${table.id}`];

                                                        return (
                                                            <button
                                                                key={table.id}
                                                                type="button"
                                                                onClick={() => !isActivelyOccupied && toggleTable('CAFE', table.id)}
                                                                className={`group relative aspect-square rounded-2xl border-2 transition-all flex flex-col items-center justify-between p-4 ${isSelected
                                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl -translate-y-1'
                                                                    : isOfficial
                                                                        ? 'bg-white border-amber-400 text-amber-900 shadow-sm'
                                                                        : isPending
                                                                            ? 'bg-amber-50 border-amber-200 text-amber-600 animate-pulse'
                                                                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                                                    } ${isActivelyOccupied ? 'opacity-90 cursor-not-allowed border-amber-200 bg-amber-50/30' : ''}`}
                                                            >
                                                                <div className="w-full flex justify-between items-center opacity-40">
                                                                    <span className="text-[10px] font-bold tracking-widest uppercase">C-{table.id < 10 ? `0${table.id}` : table.id}</span>
                                                                    <div className="flex gap-1">
                                                                        <div className={`w-1 h-1 rounded-full ${isOccupiedByOthers || isOfficial ? 'bg-amber-400' : 'bg-slate-300'}`} />
                                                                        <div className={`w-1 h-1 rounded-full ${isOccupiedByOthers || isOfficial ? 'bg-amber-400' : 'bg-slate-300'}`} />
                                                                        {isOccupiedByOthers && <div className="w-1 h-1 rounded-full bg-amber-400" />}
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-col items-center gap-2">
                                                                    <span className={`text-sm font-bold uppercase tracking-widest ${isSelected ? 'text-white' : isOccupiedByOthers || isOfficial ? 'text-amber-900' : 'text-slate-600'}`}>
                                                                        Meja {table.tableName?.replace('Meja Cafe ', '') || table.id}
                                                                    </span>
                                                                    
                                                                    <div className="p-2 rounded-xl bg-current/5">
                                                                        {isSelected ? (
                                                                            <CheckCircle2 className="w-5 h-5 text-white" />
                                                                        ) : isActivelyOccupied ? (
                                                                            <Users className="w-5 h-5 text-amber-600" />
                                                                        ) : isPending ? (
                                                                            <Lock className="w-5 h-5 text-amber-500" />
                                                                        ) : (
                                                                            <Users className={`w-5 h-5 ${isOfficial ? 'text-amber-500' : 'text-slate-200'}`} />
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className={`w-full px-2 py-1.5 rounded-lg text-center ${isSelected ? 'bg-white/10' : isPending ? 'bg-amber-100/50' : 'bg-slate-100/50'}`}>
                                                                    <span className={`text-[9px] font-bold uppercase tracking-wider block truncate ${isSelected ? 'text-indigo-100' : isPending ? 'text-amber-600' : isOccupiedByOthers ? 'text-amber-700' : 'text-slate-400'}`}>
                                                                        {isSelected ? user?.name?.split(' ')[0] : isPending ? 'Menunggu Izin' : (occupants.length > 0 ? occupants.map(o => o.name.split(' ')[0]).join(', ') : (isOfficial ? 'Tugas Utama' : 'Kosong'))}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Action Footer */}
                            <div className="pt-10 flex flex-col sm:flex-row gap-4">
                                {activeShift && activeShift.id ? (
                                    <div className="flex flex-col w-full gap-4">
                                        {Number(cashStart) !== Number(activeShift.cashStart || 0) && (
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    setLoading(true);
                                                    try {
                                                        await axios.post('/finance/shifts/active/update', {
                                                            cashStart: Number(cashStart)
                                                        });
                                                        await refetchShift();
                                                        showAlert('Berhasil', 'Modal awal berhasil diperbarui.', { variant: 'success' });
                                                    } catch (err) {
                                                        console.error("Update modal error:", err);
                                                        showAlert('Gagal', 'Gagal memperbarui modal.', { variant: 'error' });
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }}
                                                disabled={loading}
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-16 rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                                            >
                                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                                    <>
                                                        <Save className="w-5 h-5" />
                                                        <span>Simpan Perubahan Modal</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setIsManualOpen(false)}
                                            className="flex-1 bg-slate-900 hover:bg-black text-white h-16 rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-900/10 active:scale-[0.98]"
                                        >
                                            <LayoutDashboard className="w-5 h-5" />
                                            <span>Buka Dashboard Operasional</span>
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={loading || !shiftName || shiftName === 'CUSTOM'}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white h-16 rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <>
                                                <Settings2 className="w-5 h-5" />
                                                <span>AKTIFKAN SESI SHIFT</span>
                                                <ArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                            
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                                    Sistem Keamanan Terintegrasi • Session ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
                                </p>
                            </div>
                        </motion.form>
                    </div>
                    
                    <div className="h-20 pointer-events-none" />
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
