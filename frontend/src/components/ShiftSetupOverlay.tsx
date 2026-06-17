'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Clock, 
    AlertTriangle,
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
import { useRouter } from 'next/navigation';

export default function ShiftSetupOverlay({ forcedOpen = false }: { forcedOpen?: boolean }) {
    const { user, activeShift, refetchShift, refetchProfile, logout, hasPermission } = useAuth();
    const router = useRouter();
    const { showAlert, showConfirm } = useAlert();
    const { subscribe } = useMqtt();
    const userRole = user?.role?.toUpperCase() || '';
    const isWaiter = userRole.includes('WAITER') || userRole.includes('WAITERS') || userRole.includes('PELAYAN');
    const isCashier = userRole.includes('KASIR') || userRole.includes('CASHIER');
    const isManagementRole = ['ADMIN', 'SUPERADMIN', 'OWNER', 'MANAGER'].some(r => userRole.includes(r));
    const isProductionRole = ['KITCHEN', 'BARTENDER', 'CHEF'].some(r => userRole.includes(r));
    
    const [isManualOpen, setIsManualOpen] = useState(false);

    const isStaff = isWaiter || isCashier;
    const shouldShow = forcedOpen || isManualOpen || (!!user && (isStaff || hasPermission('SHIFT_START')) && !activeShift && !isProductionRole && !isManagementRole);
    
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
    const [shiftMismatchWarning, setShiftMismatchWarning] = useState<{show: boolean, selectedShift: any, expectedShift: any}>({show: false, selectedShift: null, expectedShift: null});
    const [coverNote, setCoverNote] = useState<string>('');
    const [emergencyWarning, setEmergencyWarning] = useState<string | null>(null);

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

            const sortTables = (tables: any[]) => {
                return [...tables].sort((a, b) => {
                    const nameA = a.tableName || a.name || String(a.id);
                    const nameB = b.tableName || b.name || String(b.id);
                    const numA = nameA.match(/\d+/);
                    const numB = nameB.match(/\d+/);
                    if (numA && numB) {
                        const valA = parseInt(numA[0], 10);
                        const valB = parseInt(numB[0], 10);
                        if (valA !== valB) return valA - valB;
                    }
                    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
                });
            };

            setAvailableShifts(shiftRes.data.availableShifts || []);
            setCafeTables(sortTables(cafeRes.data || []));
            setBilliardTables(sortTables(billiardRes.data || []));
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

    const handleShiftSelect = (s: any) => {
        const now = new Date();
        let expectedShift: any = null;

        for (const shift of availableShifts) {
            if (!shift.startTime || !shift.endTime) continue;
            const [sh, sm] = shift.startTime.split(':').map(Number);
            const [eh, em] = shift.endTime.split(':').map(Number);
            
            const start = new Date(now);
            start.setHours(sh, sm, 0, 0);
            
            const end = new Date(now);
            end.setHours(eh, em, 0, 0);
            
            if (eh < sh) {
                // Crosses midnight
                if (now >= start || now < end) {
                    expectedShift = shift;
                    break;
                }
            } else {
                if (now >= start && now < end) {
                    expectedShift = shift;
                    break;
                }
            }
        }

        if (expectedShift && expectedShift.name !== s.name) {
            setShiftMismatchWarning({ show: true, selectedShift: s, expectedShift: expectedShift });
        } else {
            setShiftName(s.name);
        }
    };

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post(`/finance/shifts/start`, {
                cashStart: Number(cashStart),
                shiftName: shiftName || null,
                assignedTableIds: selectedTables.length > 0 ? selectedTables : null,
                coverNote: coverNote || null,
            });
            // Emergency cover: backend detected this user already had a shift today
            if (res.data?.warning) {
                setEmergencyWarning(res.data.warning);
                setLoading(false);
                return;
            }
            await refetchShift();
            setIsManualOpen(false);
            if (forcedOpen) {
                router.push('/');
            }
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
        <>
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex flex-col lg:flex-row bg-[#0A0F1E] overflow-hidden overscroll-contain font-sans"
                >
                    {/* ══════════════════════════════════════════════════════
                        MOBILE: Stacked layout (top header + scrollable body)
                        DESKTOP: Side-by-side (sidebar + content)
                    ══════════════════════════════════════════════════════ */}

                    {/* ── SIDEBAR / TOP HEADER (Mobile Hero & Desktop Sidebar) ─────────────────────────── */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                        className="relative w-full lg:w-[340px] xl:w-[380px] shrink-0
                                   bg-[#0A0F1E] lg:bg-gradient-to-br lg:from-[#0F1B35] lg:via-[#111827] lg:to-[#0A0F1E]
                                   border-b border-white/5 lg:border-b-0 lg:border-r lg:border-white/5
                                   flex flex-col lg:justify-between
                                   px-5 pb-6 lg:px-10 lg:pb-10 overflow-hidden"
                        style={{ paddingTop: 'max(72px, env(safe-area-inset-top))' }}
                    >
                        {/* Premium Background Glow for Mobile */}
                        <div className="absolute top-[-50%] left-[-20%] w-[140%] h-[150%] bg-gradient-to-b from-indigo-600/20 via-indigo-900/5 to-transparent blur-3xl lg:hidden pointer-events-none" />

                        {/* ── MOBILE HEADER (Centered Hero Layout) ── */}
                        <div className="lg:hidden relative z-10 flex flex-col items-center justify-center text-center gap-3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500 rounded-full blur-md opacity-50 animate-pulse" />
                                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-2xl border-2 border-indigo-400/50 shadow-xl">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1.5 justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                                    <h1 className="text-lg font-bold text-white tracking-tight leading-none">{user?.name}</h1>
                                </div>
                                <p className="text-[10px] font-black text-indigo-300/80 uppercase tracking-[0.2em] mt-1.5">{user?.role}</p>
                            </div>
                        </div>

                        {/* ── DESKTOP HEADER (Left Aligned Sidebar) ── */}
                        <div className="hidden lg:flex flex-col items-start gap-8 w-full z-10">
                            {/* Brand */}
                            <div className="flex items-center gap-2.5">
                                <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/40">
                                    <ShieldCheck className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-sm font-bold tracking-tight text-white leading-none">Management System</h1>
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">Internal Staff Portal</p>
                                </div>
                            </div>

                            {/* User info */}
                            <div className="space-y-6 w-full">
                                <div className="h-px w-full bg-white/5" />
                                <div className="space-y-1.5">
                                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.25em]">Current Session</p>
                                    <h2 className="text-3xl font-semibold tracking-tight text-white leading-tight">{user?.name}</h2>
                                    <div className="flex items-center gap-2 pt-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{user?.role}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    Konfigurasi modal dan pilih area penugasan untuk memulai operasional hari ini.
                                </p>
                            </div>
                        </div>

                        {/* ── DESKTOP BOTTOM ACTIONS ── */}
                        <div className="hidden lg:flex flex-col gap-2 w-full z-10">
                            <button
                                onClick={() => { refetchProfile(); fetchData(); }}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 transition-all group"
                            >
                                <RefreshCw className={`w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors ${fetchingData ? 'animate-spin' : ''}`} />
                                <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">Sinkronisasi Data</span>
                            </button>
                            <button
                                onClick={logout}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all group"
                            >
                                <LogOut className="w-4 h-4 text-slate-600 group-hover:text-rose-400 transition-colors" />
                                <span className="text-xs font-semibold text-slate-500 group-hover:text-rose-300 transition-colors">Keluar Sesi</span>
                            </button>
                            <div className="flex items-center justify-center gap-2 pt-3">
                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">v2.4.0 Final Release</span>
                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                            </div>
                        </div>
                    </motion.div>

                    {/* ── MAIN SCROLLABLE CONTENT ───────────────────────── */}
                    <div className="flex-1 overflow-y-auto overscroll-contain bg-[#F0F4F8] lg:bg-[#F1F5F9]">
                        <div 
                            className="max-w-2xl lg:max-w-4xl mx-auto px-4 pt-8 sm:px-6 sm:pt-10 lg:px-12 lg:pt-14"
                            style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))', paddingTop: 'max(72px, env(safe-area-inset-top))' }}
                        >
                            <motion.form
                                initial={{ y: 16, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1, duration: 0.5 }}
                                onSubmit={handleStart}
                                className="space-y-6 sm:space-y-8"
                            >
                                {/* ── Page Header ── */}
                                <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200">
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Persiapan Operasional</h3>
                                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Lengkapi detail berikut untuk mengaktifkan sesi kerja.</p>
                                    </div>
                                    {/* Mobile: compact action buttons */}
                                    <div className="flex items-center gap-1.5 lg:hidden shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => { refetchProfile(); fetchData(); }}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-all"
                                            title="Sinkronisasi"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${fetchingData ? 'animate-spin' : ''}`} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={logout}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-500 transition-all"
                                            title="Keluar"
                                        >
                                            <LogOut className="w-3.5 h-3.5 text-slate-500" />
                                        </button>
                                    </div>
                                </div>

                                {/* ── Emergency Cover Warning ── */}
                                {emergencyWarning && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl space-y-3">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                                                <span className="text-xs font-black text-orange-700 uppercase tracking-widest">⚡ Cover Darurat Terdeteksi</span>
                                            </div>
                                            <p className="text-[11px] font-semibold text-orange-600 leading-relaxed">{emergencyWarning}</p>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        setEmergencyWarning(null);
                                                        await refetchShift();
                                                        setIsManualOpen(false);
                                                        if (forcedOpen) router.push('/');
                                                    }}
                                                    className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all"
                                                >
                                                    Mengerti — Lanjutkan Shift
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEmergencyWarning(null)}
                                                    className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                                >
                                                    Kembali
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {!isWaiter && (
                                    <section className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-indigo-100 flex items-center justify-center">
                                                <Wallet className="w-3 h-3 text-indigo-600" />
                                            </div>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Modal Tunai Awal</h4>
                                        </div>
                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all overflow-hidden">
                                            <div className="flex items-center gap-3 px-5 py-4">
                                                <span className="text-sm font-bold text-slate-400 shrink-0">IDR</span>
                                                <input
                                                    type="text"
                                                    required
                                                    value={Number(cashStart).toLocaleString('id-ID')}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        setCashStart(val === '' ? 0 : parseInt(val));
                                                    }}
                                                    className="w-full bg-transparent text-3xl sm:text-4xl font-black text-slate-900 placeholder:text-slate-200 focus:outline-none tracking-tight"
                                                    placeholder="0"
                                                />
                                            </div>
                                            {/* Quick presets */}
                                            <div className="border-t border-slate-100 px-4 py-2.5 flex gap-2 flex-wrap">
                                                {[200000, 300000, 500000, 1000000].map(v => (
                                                    <button
                                                        key={v}
                                                        type="button"
                                                        onClick={() => setCashStart(v)}
                                                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${Number(cashStart) === v ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                                    >
                                                        {(v / 1000).toFixed(0)}rb
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {/* ── 2. Pilih Shift ── */}
                                <section className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-md bg-indigo-100 flex items-center justify-center">
                                            <Clock className="w-3 h-3 text-indigo-600" />
                                        </div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pilih Jadwal Shift</h4>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                        {fetchingData && availableShifts.length === 0 ? (
                                            [1, 2, 3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse border border-slate-100" />)
                                        ) : (
                                            <>
                                                {availableShifts.map((s: any) => (
                                                    <button
                                                        key={s.name}
                                                        type="button"
                                                        onClick={() => handleShiftSelect(s)}
                                                        className={`relative p-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.97] ${shiftName === s.name
                                                            ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200'
                                                            : 'bg-white border-slate-150 hover:border-indigo-200'
                                                        }`}
                                                    >
                                                        {shiftName === s.name && (
                                                            <div className="absolute top-2 right-2 w-4 h-4 bg-white/25 rounded-full flex items-center justify-center">
                                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                                            </div>
                                                        )}
                                                        <h5 className={`font-bold text-xs leading-tight ${shiftName === s.name ? 'text-white' : 'text-slate-800'}`}>{s.name}</h5>
                                                        <div className={`flex items-center gap-1 mt-1.5 ${shiftName === s.name ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                            <History className="w-2.5 h-2.5" />
                                                            <p className="text-[9px] font-medium">{s.startTime} — {s.endTime}</p>
                                                        </div>
                                                    </button>
                                                ))}

                                                <button
                                                    type="button"
                                                    onClick={() => setShiftName('CUSTOM')}
                                                    className={`p-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.97] ${shiftName === 'CUSTOM' || (!availableShifts.some((as: any) => as.name === shiftName) && shiftName !== '')
                                                        ? 'bg-slate-900 border-slate-900 shadow-lg'
                                                        : 'bg-white border-slate-150 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <h5 className={`font-bold text-xs ${shiftName === 'CUSTOM' ? 'text-white' : 'text-slate-800'}`}>Shift Khusus</h5>
                                                    <p className={`text-[9px] font-medium mt-1.5 ${shiftName === 'CUSTOM' ? 'text-slate-400' : 'text-slate-400'}`}>Nama kustom</p>
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    <AnimatePresence>
                                        {(shiftName === 'CUSTOM' || (!availableShifts.some((as: any) => as.name === shiftName) && shiftName !== '')) && (
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
                                                    className="w-full mt-2 px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-slate-900 text-sm"
                                                    placeholder="Contoh: Shift Lembur / Ramadhan..."
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Cover Note: optional note for any shift (emergency or regular) */}
                                    {shiftName && !isWaiter && (
                                        <AnimatePresence>
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-sm">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                        📝 Catatan Shift (Opsional)
                                                    </label>
                                                    <textarea
                                                        value={coverNote}
                                                        onChange={(e) => setCoverNote(e.target.value)}
                                                        rows={2}
                                                        className="w-full px-3 py-2 rounded-lg border border-slate-100 bg-slate-50 focus:outline-none focus:border-indigo-400 text-xs font-medium text-slate-700 resize-none transition-colors"
                                                        placeholder="Contoh: Cover menunggu kasir pengganti, atau shift lembur karena event..."
                                                    />
                                                </div>
                                            </motion.div>
                                        </AnimatePresence>
                                    )}
                                </section>

                                {/* ── 3. Penugasan Area Kerja ── */}
                                {isAssignmentRequired && (
                                    <section className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 border border-indigo-400/50">
                                                    <Briefcase className="w-3.5 h-3.5 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 leading-none">Area Penugasan</h4>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-1">Pilih meja yang akan dikelola</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full shadow-sm">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Live Sync</span>
                                            </div>
                                        </div>

                                        <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
                                            <div className="divide-y divide-slate-100/50">
                                                {/* Billiard Section */}
                                                {billiardTables.length > 0 && (
                                                    <div className="p-5 sm:p-6 space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-md">
                                                                <Activity className="w-4 h-4 text-white" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h5 className="text-sm font-bold text-slate-800 leading-tight">Meja Billiard</h5>
                                                                <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">IoT Real-Time Control</p>
                                                            </div>
                                                            <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-600">
                                                                {billiardTables.length} Unit
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
                                                            {billiardTables.map(table => {
                                                                const isSelected = selectedTables.some(t => t.type === 'BILLIARD' && t.id === table.id);
                                                                const occupants = tableOccupancy.BILLIARD[table.id] || [];
                                                                const isActivelyOccupied = occupants.some(o => o.isActive);
                                                                const isOfficial = (user?.assignedTableIds || []).some((t: any) => t.type === 'BILLIARD' && t.id === table.id);
                                                                const isPending = !!pendingRequests[`BILLIARD_${table.id}`];

                                                                return (
                                                                    <button
                                                                        key={table.id}
                                                                        type="button"
                                                                        onClick={() => !isActivelyOccupied && toggleTable('BILLIARD', table.id)}
                                                                        className={`relative h-[4.5rem] rounded-2xl transition-all duration-300 active:scale-95 flex flex-col items-center justify-center gap-1 p-2 overflow-hidden group
                                                                            ${isSelected
                                                                                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-lg shadow-indigo-600/30 border-0'
                                                                                : isOfficial
                                                                                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 border-0'
                                                                                    : isPending
                                                                                        ? 'bg-amber-50 border-2 border-dashed border-amber-300 animate-pulse'
                                                                                        : 'bg-white border-2 border-slate-100/80 hover:border-indigo-200 hover:shadow-md'
                                                                            } ${isActivelyOccupied ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200' : 'cursor-pointer'}`}
                                                                    >
                                                                        {/* Top Indicator */}
                                                                        <div className="absolute top-1.5 right-1.5 flex items-center justify-center">
                                                                            {isActivelyOccupied ? (
                                                                                <Users className="w-3 h-3 text-slate-400" />
                                                                            ) : isSelected ? (
                                                                                <CheckCircle2 className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                                                                            ) : isOfficial ? (
                                                                                <CheckCircle2 className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                                                                            ) : isPending ? (
                                                                                <Lock className="w-3 h-3 text-amber-500" />
                                                                            ) : (
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-indigo-300 transition-colors" />
                                                                            )}
                                                                        </div>
                                                                        
                                                                        {/* Main Label */}
                                                                        <span className={`text-[11px] font-semibold tracking-wide leading-none mt-1 truncate w-full text-center px-1 ${isSelected || isOfficial ? 'text-white' : isActivelyOccupied ? 'text-slate-400' : 'text-slate-700 group-hover:text-indigo-600'}`}>
                                                                            {table.tableName?.replace('Meja ', '') || table.id}
                                                                        </span>
                                                                        
                                                                        {/* Status Badge */}
                                                                        <div className={`text-[9px] font-medium px-2 py-[2px] rounded-full truncate max-w-[95%] text-center tracking-wide ${
                                                                            isSelected ? 'bg-black/20 text-indigo-50' :
                                                                            isOfficial ? 'bg-black/20 text-emerald-50' :
                                                                            isPending ? 'bg-amber-100 text-amber-600' :
                                                                            isActivelyOccupied ? 'bg-slate-200 text-slate-500' :
                                                                            'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-500'
                                                                        }`}>
                                                                            {isSelected ? user?.name?.split(' ')[0] : isPending ? 'Izin...' : occupants.length > 0 ? occupants[0].name.split(' ')[0] : isOfficial ? 'Utama' : 'Bebas'}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Cafe Section */}
                                                {cafeTables.length > 0 && (
                                                    <div className="p-5 sm:p-6 space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                                                                <LayoutDashboard className="w-4 h-4 text-white" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h5 className="text-sm font-bold text-slate-800 leading-tight">Area Cafe & Resto</h5>
                                                                <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">F&B Management</p>
                                                            </div>
                                                            <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-600">
                                                                {cafeTables.length} Unit
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
                                                            {cafeTables.map(table => {
                                                                const isSelected = selectedTables.some(t => t.type === 'CAFE' && t.id === table.id);
                                                                const occupants = tableOccupancy.CAFE[table.id] || [];
                                                                const isActivelyOccupied = occupants.some(o => o.isActive);
                                                                const isOfficial = (user?.assignedTableIds || []).some((t: any) => t.type === 'CAFE' && t.id === table.id);
                                                                const isPending = !!pendingRequests[`CAFE_${table.id}`];

                                                                return (
                                                                    <button
                                                                        key={table.id}
                                                                        type="button"
                                                                        onClick={() => !isActivelyOccupied && toggleTable('CAFE', table.id)}
                                                                        className={`relative h-[4.5rem] rounded-2xl transition-all duration-300 active:scale-95 flex flex-col items-center justify-center gap-1 p-2 overflow-hidden group
                                                                            ${isSelected
                                                                                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-lg shadow-indigo-600/30 border-0'
                                                                                : isOfficial
                                                                                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 border-0'
                                                                                    : isPending
                                                                                        ? 'bg-amber-50 border-2 border-dashed border-amber-300 animate-pulse'
                                                                                        : 'bg-white border-2 border-slate-100/80 hover:border-amber-200 hover:shadow-md'
                                                                            } ${isActivelyOccupied ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200' : 'cursor-pointer'}`}
                                                                    >
                                                                        {/* Top Indicator */}
                                                                        <div className="absolute top-1.5 right-1.5 flex items-center justify-center">
                                                                            {isActivelyOccupied ? (
                                                                                <Users className="w-3 h-3 text-slate-400" />
                                                                            ) : isSelected ? (
                                                                                <CheckCircle2 className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                                                                            ) : isOfficial ? (
                                                                                <CheckCircle2 className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                                                                            ) : isPending ? (
                                                                                <Lock className="w-3 h-3 text-amber-500" />
                                                                            ) : (
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-amber-300 transition-colors" />
                                                                            )}
                                                                        </div>
                                                                        
                                                                        {/* Main Label */}
                                                                        <span className={`text-[11px] font-semibold tracking-wide leading-none mt-1 truncate w-full text-center px-1 ${isSelected || isOfficial ? 'text-white' : isActivelyOccupied ? 'text-slate-400' : 'text-slate-700 group-hover:text-amber-600'}`}>
                                                                            {table.tableName?.replace('Meja Cafe ', '').replace('Meja ', '') || table.id}
                                                                        </span>
                                                                        
                                                                        {/* Status Badge */}
                                                                        <div className={`text-[9px] font-medium px-2 py-[2px] rounded-full truncate max-w-[95%] text-center tracking-wide ${
                                                                            isSelected ? 'bg-black/20 text-indigo-50' :
                                                                            isOfficial ? 'bg-black/20 text-emerald-50' :
                                                                            isPending ? 'bg-amber-100 text-amber-600' :
                                                                            isActivelyOccupied ? 'bg-slate-200 text-slate-500' :
                                                                            'bg-slate-100 text-slate-500 group-hover:bg-amber-50 group-hover:text-amber-600'
                                                                        }`}>
                                                                            {isSelected ? user?.name?.split(' ')[0] : isPending ? 'Izin...' : occupants.length > 0 ? occupants[0].name.split(' ')[0] : isOfficial ? 'Area Utama' : 'Bebas'}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Summary bar */}
                                            <div className="border-t border-slate-100/50 px-6 py-4 flex items-center justify-between bg-slate-50/50 backdrop-blur-sm">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ringkasan Area</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-slate-200 shadow-sm">
                                                        <Activity className="w-3 h-3 text-slate-800" />
                                                        <span className="text-[10px] font-black text-slate-800">{selectedTables.filter(t => t.type === 'BILLIARD').length}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-slate-200 shadow-sm">
                                                        <LayoutDashboard className="w-3 h-3 text-amber-600" />
                                                        <span className="text-[10px] font-black text-slate-800">{selectedTables.filter(t => t.type === 'CAFE').length}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {/* ── Action Footer ── */}
                                <div className="pt-2 flex flex-col gap-3">
                                    {activeShift && activeShift.id ? (
                                        <div className="flex flex-col gap-3">
                                            {Number(cashStart) !== Number(activeShift.cashStart || 0) && (
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        setLoading(true);
                                                        try {
                                                            await axios.post('/finance/shifts/active/update', { cashStart: Number(cashStart) });
                                                            await refetchShift();
                                                            showAlert('Berhasil', 'Modal awal berhasil diperbarui.', { variant: 'success' });
                                                        } catch (err) {
                                                            showAlert('Gagal', 'Gagal memperbarui modal.', { variant: 'error' });
                                                        } finally {
                                                            setLoading(false);
                                                        }
                                                    }}
                                                    disabled={loading}
                                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-14 rounded-2xl font-bold transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                                                >
                                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /><span>Simpan Perubahan Modal</span></>}
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => { setIsManualOpen(false); if (forcedOpen) router.push('/'); }}
                                                className="w-full bg-slate-900 hover:bg-black text-white h-14 rounded-2xl font-bold transition-all flex items-center justify-center gap-2.5 shadow-lg active:scale-[0.98]"
                                            >
                                                <LayoutDashboard className="w-4 h-4" />
                                                <span>Buka Dashboard Operasional</span>
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={loading || !shiftName || shiftName === 'CUSTOM'}
                                            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white h-14 rounded-2xl font-bold transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/25 active:scale-[0.98]"
                                        >
                                            {loading ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Zap className="w-4 h-4" />
                                                    <span>AKTIFKAN SESI SHIFT</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                    )}

                                    <p className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-[0.25em]">
                                        Sistem Keamanan Terintegrasi • v2.4.0
                                    </p>
                                </div>
                            </motion.form>
                        </div>

                        {/* Safe area bottom padding for iOS home indicator */}
                        <div className="h-6" style={{ height: 'max(24px, env(safe-area-inset-bottom))' }} />
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Premium Shift Mismatch Modal */}
            <AnimatePresence>
                {shiftMismatchWarning.show && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
                            onClick={() => setShiftMismatchWarning({ show: false, selectedShift: null, expectedShift: null })}
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-[2rem] w-full max-w-md shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
                        >
                            <div className="bg-amber-500 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <Clock className="w-32 h-32" />
                                </div>
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm relative z-10">
                                    <AlertTriangle className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight uppercase relative z-10">Peringatan Jadwal</h3>
                                <p className="text-amber-100 text-sm mt-2 font-medium relative z-10">Jadwal yang dipilih tidak sesuai dengan waktu saat ini.</p>
                            </div>

                            <div className="p-8 space-y-8 bg-slate-50">
                                <div className="space-y-4">
                                    <div className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Jadwal Seharusnya</span>
                                        <span className="text-sm font-black text-indigo-600">{shiftMismatchWarning.expectedShift?.name}</span>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm border-l-4 border-l-amber-500">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pilihan Anda</span>
                                        <span className="text-sm font-black text-amber-600">{shiftMismatchWarning.selectedShift?.name}</span>
                                    </div>
                                </div>

                                <p className="text-center text-slate-600 text-sm leading-relaxed font-medium">
                                    Apakah Anda sedang bekerja lembur atau menggantikan shift karyawan lain?
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShiftMismatchWarning({ show: false, selectedShift: null, expectedShift: null })}
                                        className="flex-1 bg-white hover:bg-slate-100 text-slate-600 border-2 border-slate-200 px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShiftName(shiftMismatchWarning.selectedShift.name);
                                            setShiftMismatchWarning({ show: false, selectedShift: null, expectedShift: null });
                                        }}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        Ya, Lanjutkan
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
