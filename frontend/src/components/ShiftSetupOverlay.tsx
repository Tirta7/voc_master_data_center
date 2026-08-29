'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import FloorPlanMap from './FloorPlanMap';

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
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('map');
    // Fresh assignment data fetched directly from API (not from stale user context)
    const [myAssignedTableIds, setMyAssignedTableIds] = useState<any[]>(user?.assignedTableIds || []);
    // Ref: always holds latest myAssignedTableIds (for use inside fetchData without stale closure)
    const myAssignedTableIdsRef = useRef<any[]>(user?.assignedTableIds || []);
    useEffect(() => {
        myAssignedTableIdsRef.current = myAssignedTableIds;
    }, [myAssignedTableIds]);
    // Ref: explicitly tracks ONLY tables approved via admin permission (NOT auto-selected from assignment)
    // This is the source of truth for "extra" selections. fetchData uses this to rebuild cleanly.
    const permissionApprovedTablesRef = useRef<{type: 'CAFE'|'BILLIARD', id: number}[]>([]);

    // ✅ SAFETY NET: Whenever official assignments change, immediately clean up selectedTables.
    // This catches any edge case where fetchData's setSelectedTables was stale or missed.
    useEffect(() => {
        if (!isWaiter || myAssignedTableIds.length === 0) return;
        setSelectedTables(prev => prev.filter(t =>
            // Keep: currently officially assigned tables
            myAssignedTableIds.some((a: any) => a.type === t.type && a.id === t.id) ||
            // Keep: explicitly permission-approved tables (never in official list)
            permissionApprovedTablesRef.current.some(a => a.type === t.type && a.id === t.id)
        ));
    }, [myAssignedTableIds, isWaiter]);

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

            if (isWaiter) {
                // ✅ Get fresh assignments from API (not stale user context)
                const currentEmployee = (employeesRes.data || []).find((e: any) => e.id === user?.id);
                const freshAssignedTableIds: any[] = currentEmployee?.assignedTableIds || user?.assignedTableIds || [];
                setMyAssignedTableIds(freshAssignedTableIds);

                const occupiedSet = new Set<string>();
                openShiftsRes.data.forEach((os: any) => {
                    if (os.userId === user?.id) return;
                    (os.assignedTableIds || []).forEach((t: any) => {
                        occupiedSet.add(`${t.type}_${t.id}`);
                    });
                });

                // Official tables from new assignment that are still free
                const freeAssignments = freshAssignedTableIds.filter((t: any) =>
                    !occupiedSet.has(`${t.type}_${t.id}`)
                );

                // ✅ CLEAN REBUILD: Always rebuild selectedTables from scratch.
                //    = official free assignments + permission-approved tables (still free)
                //    Tables removed from admin assignment are NOT preserved — they go back to Tersedia.
                const stillFreePermApproved = permissionApprovedTablesRef.current.filter(t =>
                    !occupiedSet.has(`${t.type}_${t.id}`)
                );
                // Update ref to remove occupied permission-approved tables
                permissionApprovedTablesRef.current = stillFreePermApproved;

                setSelectedTables([...freeAssignments, ...stillFreePermApproved]);
            }
        } catch (error) {
            console.error('Failed to fetch shift data', error);
        } finally {
            setFetchingData(false);
        }
    }, [user?.id, user?.assignedTableIds, isWaiter]);

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
            // ✅ Listen for user-specific assignment updates (fired when admin saves assignments)
            subscribe(`billiard/user/${user?.id}/assignments`, fetchData),
        ];
        return () => unsubs.forEach(u => u());
    }, [subscribe, fetchData, user?.id]);

    useEffect(() => {
        if (!socket) return;
        // ✅ FIX: Make handler async so we await profile refresh before fetching data
        // This ensures fetchData sees the latest assignedTableIds from the server
        const handler = async (data: { userId: number }) => {
            if (data.userId === user?.id) {
                await refetchProfile(); // Wait for profile (including new assignedTableIds) to load
                fetchData();           // Then fetch table data with fresh user context
            }
        };

        const approvalHandler = (payload: any) => {
            if (payload.moduleType === 'TABLE_ACCESS' && payload.requestedByUserId === user?.id) {
                const { tableType, tableId, tableName } = payload.metadata;
                const key = `${tableType}_${tableId}`;
                
                if (payload.status === 'APPROVED') {
                    showAlert('Akses Disetujui', `Izin akses ${tableName} telah diberikan.`, { variant: 'info' });
                    const approvedTable = { type: tableType as 'CAFE'|'BILLIARD', id: tableId };
                    // Track in ref so fetchData can preserve it across assignment syncs
                    permissionApprovedTablesRef.current = [
                        ...permissionApprovedTablesRef.current.filter(t => !(t.type === tableType && t.id === tableId)),
                        approvedTable
                    ];
                    setSelectedTables(prev => [...prev, approvedTable]);
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
                    className="fixed inset-0 z-[9999] flex flex-col lg:flex-row bg-[#F2F2F7] overflow-hidden overscroll-contain font-sans"
                >
                    {/* ══════════════════════════════════════════════════════
                        MOBILE: Stacked layout (top header + scrollable body)
                        DESKTOP: Side-by-side (sidebar + content)
                    ══════════════════════════════════════════════════════ */}

                    {/* ── TOP NAVIGATION BAR (iOS-style) ─────────────────────────── */}
                    <motion.div
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="relative w-full lg:w-[300px] xl:w-[320px] shrink-0
                                   bg-white/95 lg:bg-white
                                   border-b border-slate-200/80 lg:border-b-0 lg:border-r lg:border-slate-200/80
                                   flex flex-col lg:justify-between
                                   overflow-hidden"
                        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
                    >
                        {/* ── MOBILE HEADER (iOS Navigation Bar style) ── */}
                        <div className="lg:hidden">
                            {/* Status bar spacer — minimal, just enough for device notch */}
                            <div className="h-3" />

                            {/* iOS-style nav bar */}
                            <div className="relative flex items-center justify-between px-5 py-2.5 border-b border-slate-100">
                                {/* Left: Logout */}
                                <button
                                    type="button"
                                    onClick={logout}
                                    className="flex items-center gap-1.5 text-rose-500 active:opacity-60 transition-opacity"
                                >
                                    <LogOut className="w-4 h-4" strokeWidth={2} />
                                    <span className="text-[14px] font-medium">Keluar</span>
                                </button>

                                {/* Center: Title */}
                                <div className="absolute left-0 right-0 flex flex-col items-center pointer-events-none">
                                    <span className="text-[17px] font-semibold text-slate-900 tracking-tight">Persiapan Shift</span>
                                </div>

                                {/* Right: Refresh */}
                                <button
                                    type="button"
                                    onClick={() => { refetchProfile(); fetchData(); }}
                                    className="text-blue-500 active:opacity-60 transition-opacity"
                                >
                                    <RefreshCw className={`w-5 h-5 ${fetchingData ? 'animate-spin' : ''}`} strokeWidth={2} />
                                </button>
                            </div>

                            {/* User identity card */}
                            <div className="px-5 py-4 flex items-center gap-4">
                                <div className="relative shrink-0">
                                    <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-xl shadow-sm">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[18px] font-semibold text-slate-900 leading-tight truncate">{user?.name}</p>
                                    <p className="text-[13px] text-slate-500 mt-0.5">{user?.role}</p>
                                </div>
                            </div>
                        </div>

                        {/* ── DESKTOP SIDEBAR ── */}
                        <div className="hidden lg:flex flex-col h-full px-7 py-8">
                            {/* Brand */}
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 bg-blue-600 rounded-[14px] flex items-center justify-center shadow-sm">
                                    <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2} />
                                </div>
                                <div>
                                    <h1 className="text-[15px] font-semibold text-slate-900 leading-none">Billiard System</h1>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Staff Portal</p>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px w-full bg-slate-100 mb-6" />

                            {/* User info */}
                            <div className="space-y-1 mb-4">
                                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Sesi Aktif</p>
                                <h2 className="text-[22px] font-semibold text-slate-900 tracking-tight leading-tight">{user?.name}</h2>
                                <div className="flex items-center gap-2 pt-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-[13px] font-medium text-slate-500">{user?.role}</span>
                                </div>
                            </div>

                            <p className="text-[13px] text-slate-400 leading-relaxed">
                                Lengkapi detail di samping untuk memulai sesi operasional Anda hari ini.
                            </p>

                            {/* Spacer */}
                            <div className="flex-1" />

                            {/* Bottom actions */}
                            <div className="space-y-1">
                                <button
                                    onClick={() => { refetchProfile(); fetchData(); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 transition-colors group"
                                >
                                    <RefreshCw className={`w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors ${fetchingData ? 'animate-spin' : ''}`} strokeWidth={2} />
                                    <span className="text-[14px] font-medium text-slate-500 group-hover:text-slate-800 transition-colors">Sinkronisasi Data</span>
                                </button>
                                <button
                                    onClick={logout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rose-50 transition-colors group"
                                >
                                    <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" strokeWidth={2} />
                                    <span className="text-[14px] font-medium text-slate-500 group-hover:text-rose-500 transition-colors">Keluar Sesi</span>
                                </button>
                            </div>

                            <p className="text-center text-[11px] text-slate-300 mt-4">v2.4.0</p>
                        </div>
                    </motion.div>

                    {/* ── MAIN SCROLLABLE CONTENT ───────────────────────── */}
                    <div className="flex-1 overflow-y-auto overscroll-contain bg-[#F2F2F7]">
                        <div 
                            className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"
                            style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))', paddingTop: '10px' }}
                        >
                            <motion.form
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.05, duration: 0.35 }}
                                onSubmit={handleStart}
                                className="space-y-4"
                            >
                                {/* ── Page Header (Desktop only, mobile uses sidebar) ── */}
                                <div className="hidden lg:block pb-4 border-b border-slate-200">
                                    <h3 className="text-[22px] font-semibold text-slate-900 tracking-tight">Persiapan Operasional</h3>
                                    <p className="text-[14px] text-slate-500 mt-1">Lengkapi detail berikut untuk mengaktifkan sesi kerja.</p>
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
                                    <section className="space-y-2">
                                        <p className="text-[13px] font-medium text-slate-500 px-1">Modal Tunai Awal</p>
                                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                                            <div className="flex items-center gap-3 px-5 py-4">
                                                <span className="text-[15px] font-medium text-slate-400 shrink-0">IDR</span>
                                                <input
                                                    type="text"
                                                    required
                                                    value={Number(cashStart).toLocaleString('id-ID')}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        setCashStart(val === '' ? 0 : parseInt(val));
                                                    }}
                                                    className="w-full bg-transparent text-[34px] font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none tracking-tight"
                                                    placeholder="0"
                                                />
                                            </div>
                                            {/* Quick presets */}
                                            <div className="border-t border-slate-100 px-4 py-3 flex gap-2 flex-wrap">
                                                {[200000, 300000, 500000, 1000000].map(v => (
                                                    <button
                                                        key={v}
                                                        type="button"
                                                        onClick={() => setCashStart(v)}
                                                        className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all ${Number(cashStart) === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                    >
                                                        {(v / 1000).toFixed(0)}rb
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {/* ── 2. Pilih Shift ── */}
                                <section className="space-y-2">
                                    <p className="text-[13px] font-medium text-slate-500 px-1">Jadwal Shift</p>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                        {fetchingData && availableShifts.length === 0 ? (
                                            [1, 2, 3].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-slate-200/60" />)
                                        ) : (
                                            <>
                                                {availableShifts.map((s: any) => (
                                                    <button
                                                        key={s.name}
                                                        type="button"
                                                        onClick={() => handleShiftSelect(s)}
                                                        className={`relative p-4 rounded-2xl text-left transition-all active:scale-[0.97] border ${shiftName === s.name
                                                            ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-600/20'
                                                            : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                                                        }`}
                                                    >
                                                        {shiftName === s.name && (
                                                            <div className="absolute top-2.5 right-2.5">
                                                                <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2.5} />
                                                            </div>
                                                        )}
                                                        <h5 className={`font-semibold text-[14px] leading-tight pr-5 ${shiftName === s.name ? 'text-white' : 'text-slate-800'}`}>{s.name}</h5>
                                                        <div className={`flex items-center gap-1 mt-1.5 ${shiftName === s.name ? 'text-blue-200' : 'text-slate-400'}`}>
                                                            <History className="w-3 h-3" strokeWidth={2} />
                                                            <p className="text-[12px] font-medium">{s.startTime} — {s.endTime}</p>
                                                        </div>
                                                    </button>
                                                ))}

                                                <button
                                                    type="button"
                                                    onClick={() => setShiftName('CUSTOM')}
                                                    className={`p-4 rounded-2xl text-left transition-all active:scale-[0.97] border ${shiftName === 'CUSTOM' || (!availableShifts.some((as: any) => as.name === shiftName) && shiftName !== '')
                                                        ? 'bg-slate-800 border-slate-800 shadow-md'
                                                        : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                                                    }`}
                                                >
                                                    <h5 className={`font-semibold text-[14px] ${shiftName === 'CUSTOM' ? 'text-white' : 'text-slate-800'}`}>Khusus</h5>
                                                    <p className={`text-[12px] font-medium mt-1.5 ${shiftName === 'CUSTOM' ? 'text-slate-400' : 'text-slate-400'}`}>Nama kustom</p>
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
                                                    className="w-full mt-2 px-4 py-3.5 rounded-2xl bg-white border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-900 text-[15px]"
                                                    placeholder="Contoh: Shift Lembur / Ramadhan..."
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Cover Note */}
                                    {shiftName && !isWaiter && (
                                        <AnimatePresence>
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-2 bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                                                    <label className="text-[12px] font-medium text-slate-400 px-4 pt-3 flex items-center gap-1.5">
                                                        📝 Catatan Shift <span className="text-slate-300">(Opsional)</span>
                                                    </label>
                                                    <textarea
                                                        value={coverNote}
                                                        onChange={(e) => setCoverNote(e.target.value)}
                                                        rows={2}
                                                        className="w-full px-4 pb-3 pt-1.5 bg-transparent focus:outline-none text-[14px] font-medium text-slate-700 resize-none"
                                                        placeholder="Contoh: Cover menunggu kasir pengganti..."
                                                    />
                                                </div>
                                            </motion.div>
                                        </AnimatePresence>
                                    )}
                                </section>

                                {/* ── 3. Penugasan Area Kerja ── */}
                                {isAssignmentRequired && (
                                    <section className="space-y-2">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-3">
                                            <div className="flex items-center gap-3">
                                                <p className="text-[13px] font-medium text-slate-500">Area Penugasan</p>
                                                <div className="bg-white border border-slate-200 p-0.5 rounded-lg flex items-center shadow-sm">
                                                    <button 
                                                        type="button"
                                                        onClick={() => setViewMode('map')} 
                                                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${viewMode === 'map' ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                    >
                                                        Peta (Denah)
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setViewMode('grid')} 
                                                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                    >
                                                        Grid
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[12px] font-medium text-emerald-600">Live Sync</span>
                                            </div>
                                        </div>

                                        {/* ✨ COLOR LEGEND — Explains what each card color means */}
                                        <div className="bg-white rounded-2xl border border-slate-200/80 px-4 py-3 shadow-sm">
                                            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mb-3">Keterangan Warna</p>
                                            <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-[10px] bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[13px] font-semibold text-slate-700 leading-none">Penugasan Anda</p>
                                                        <p className="text-[11px] text-slate-400 mt-0.5">Otomatis terpilih</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-[10px] bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                                                        <ShieldCheck className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[13px] font-semibold text-slate-700 leading-none">Tambahan Izin</p>
                                                        <p className="text-[11px] text-slate-400 mt-0.5">Dipilih via persetujuan</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-[10px] bg-white border border-slate-300 shrink-0 shadow-sm" />
                                                    <div>
                                                        <p className="text-[13px] font-semibold text-slate-700 leading-none">Tersedia</p>
                                                        <p className="text-[11px] text-slate-400 mt-0.5">Bisa diminta izin</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-[10px] bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center shadow-sm">
                                                        <Users className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[13px] font-semibold text-slate-700 leading-none">Dipakai</p>
                                                        <p className="text-[11px] text-slate-400 mt-0.5">Waiter lain aktif</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white lg:bg-white/80 lg: sm:rounded-[2rem] rounded-[24px] shadow-sm border border-slate-200/60 overflow-hidden">
                                            {viewMode === 'map' ? (
                                                <div className="p-4 sm:p-6">
                                                    <FloorPlanMap 
                                                        localAssignments={selectedTables} 
                                                        onToggleTable={toggleTable} 
                                                        tableOccupancy={tableOccupancy}
                                                        waiterColorClass="bg-emerald-500 border-emerald-600 text-white"
                                                    />
                                                </div>
                                            ) : (
                                            <div className="divide-y divide-slate-100">
                                                {/* Billiard Section */}
                                                {billiardTables.length > 0 && (
                                                    <div className="p-5 sm:p-6 space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-slate-900 rounded-[14px] flex items-center justify-center shadow-sm">
                                                                <Activity className="w-5 h-5 text-white" strokeWidth={1.5} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h5 className="text-[15px] font-semibold text-slate-900 tracking-tight leading-tight">Meja Billiard</h5>
                                                                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">IoT Real-Time Control</p>
                                                            </div>
                                                            <span className="px-3 py-1 bg-slate-100/80 rounded-full text-[11px] font-semibold text-slate-500">
                                                                {billiardTables.length} Unit
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                                            {billiardTables.map(table => {
                                                                const isSelected = selectedTables.some(t => t.type === 'BILLIARD' && t.id === table.id);
                                                                const occupants = tableOccupancy.BILLIARD[table.id] || [];
                                                                const isActivelyOccupied = occupants.some(o => o.isActive);
                                                                // ✅ Use fresh myAssignedTableIds (updated by fetchData, not stale context)
                                                                const isOfficial = myAssignedTableIds.some((t: any) => t.type === 'BILLIARD' && t.id === table.id);
                                                                // isOfficialSelected = official AND in selection (auto-selected by system)
                                                                // isExtraSelected = NOT official BUT selected (via izin)
                                                                const isOfficialSelected = isOfficial && isSelected;
                                                                const isExtraSelected = !isOfficial && isSelected;
                                                                const isPending = !!pendingRequests[`BILLIARD_${table.id}`];

                                                                return (
                                                                    <button
                                                                        key={table.id}
                                                                        type="button"
                                                                        onClick={() => !isActivelyOccupied && toggleTable('BILLIARD', table.id)}
                                                                        className={`relative h-[5.5rem] rounded-[18px] transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-1 p-2 overflow-hidden
                                                                            ${isActivelyOccupied
                                                                                ? 'opacity-50 cursor-not-allowed bg-slate-100 border border-slate-200 shadow-none'
                                                                                : isOfficialSelected
                                                                                    ? 'bg-emerald-500 shadow-md shadow-emerald-500/25 border border-emerald-400 cursor-default'
                                                                                    : isExtraSelected
                                                                                        ? 'bg-blue-600 shadow-md shadow-blue-600/25 border border-blue-500 cursor-pointer'
                                                                                        : isPending
                                                                                            ? 'bg-amber-50 border border-amber-300 animate-pulse cursor-pointer'
                                                                                            : 'bg-white border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 shadow-sm cursor-pointer'
                                                                            }`}
                                                                    >
                                                                        {/* Status icon */}
                                                                        <div className="absolute top-2 right-2">
                                                                            {isActivelyOccupied ? (
                                                                                <Users className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                                                                            ) : isOfficialSelected ? (
                                                                                <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                                                                            ) : isExtraSelected ? (
                                                                                <ShieldCheck className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                                                                            ) : isPending ? (
                                                                                <Lock className="w-3 h-3 text-amber-500" strokeWidth={2} />
                                                                            ) : (
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                                            )}
                                                                        </div>

                                                                        {/* Table number */}
                                                                        <span className={`text-[11px] font-bold tracking-wide leading-none mt-2 w-full text-center px-1
                                                                            ${isActivelyOccupied ? 'text-slate-400' : (isOfficialSelected || isExtraSelected) ? 'text-white' : 'text-slate-700'}`}>
                                                                            {table.tableName?.replace(/meja\s*/i, '') || table.id}
                                                                        </span>

                                                                        {/* Status label */}
                                                                        <div className={`text-[10px] font-medium px-2 py-[2px] rounded-full truncate max-w-[95%] text-center mt-0.5
                                                                            ${isOfficialSelected ? 'bg-white/20 text-emerald-50' :
                                                                            isExtraSelected ? 'bg-white/20 text-blue-100' :
                                                                            isPending ? 'bg-amber-100 text-amber-700' :
                                                                            isActivelyOccupied ? 'text-slate-400' :
                                                                            'bg-slate-100 text-slate-500'}`}>
                                                                            {isOfficialSelected ? 'Penugasan' :
                                                                             isExtraSelected ? user?.name?.split(' ')[0] :
                                                                             isPending ? 'Menunggu...' :
                                                                             occupants.length > 0 ? occupants[0].name.split(' ')[0] :
                                                                             'Bebas'}
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
                                                            <div className="w-10 h-10 bg-orange-500 rounded-[14px] flex items-center justify-center shadow-sm">
                                                                <LayoutDashboard className="w-5 h-5 text-white" strokeWidth={1.5} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h5 className="text-[15px] font-semibold text-slate-900 tracking-tight leading-tight">Area Cafe & Resto</h5>
                                                                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">F&B Management</p>
                                                            </div>
                                                            <span className="px-3 py-1 bg-slate-100/80 rounded-full text-[11px] font-semibold text-slate-500">
                                                                {cafeTables.length} Unit
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                                            {cafeTables.map(table => {
                                                                const isSelected = selectedTables.some(t => t.type === 'CAFE' && t.id === table.id);
                                                                const occupants = tableOccupancy.CAFE[table.id] || [];
                                                                const isActivelyOccupied = occupants.some(o => o.isActive);
                                                                // ✅ Use fresh myAssignedTableIds
                                                                const isOfficial = myAssignedTableIds.some((t: any) => t.type === 'CAFE' && t.id === table.id);
                                                                const isOfficialSelected = isOfficial && isSelected;
                                                                const isExtraSelected = !isOfficial && isSelected;
                                                                const isPending = !!pendingRequests[`CAFE_${table.id}`];

                                                                return (
                                                                    <button
                                                                        key={table.id}
                                                                        type="button"
                                                                        onClick={() => !isActivelyOccupied && toggleTable('CAFE', table.id)}
                                                                        className={`relative h-[5.5rem] rounded-[18px] transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-1 p-2 overflow-hidden
                                                                            ${isActivelyOccupied
                                                                                ? 'opacity-50 cursor-not-allowed bg-slate-100 border border-slate-200 shadow-none'
                                                                                : isOfficialSelected
                                                                                    ? 'bg-emerald-500 shadow-md shadow-emerald-500/25 border border-emerald-400 cursor-default'
                                                                                    : isExtraSelected
                                                                                        ? 'bg-blue-600 shadow-md shadow-blue-600/25 border border-blue-500 cursor-pointer'
                                                                                        : isPending
                                                                                            ? 'bg-amber-50 border border-amber-300 animate-pulse cursor-pointer'
                                                                                            : 'bg-white border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 shadow-sm cursor-pointer'
                                                                            }`}
                                                                    >
                                                                        {/* Status icon */}
                                                                        <div className="absolute top-2 right-2">
                                                                            {isActivelyOccupied ? (
                                                                                <Users className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                                                                            ) : isOfficialSelected ? (
                                                                                <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                                                                            ) : isExtraSelected ? (
                                                                                <ShieldCheck className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                                                                            ) : isPending ? (
                                                                                <Lock className="w-3 h-3 text-amber-500" strokeWidth={2} />
                                                                            ) : (
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                                            )}
                                                                        </div>

                                                                        {/* Table number */}
                                                                        <span className={`text-[11px] font-bold tracking-wide leading-none mt-2 w-full text-center px-1
                                                                            ${isActivelyOccupied ? 'text-slate-400' : (isOfficialSelected || isExtraSelected) ? 'text-white' : 'text-slate-700'}`}>
                                                                            {table.tableName?.replace(/meja\s*(cafe\s*)?/i, '') || table.id}
                                                                        </span>

                                                                        {/* Status label */}
                                                                        <div className={`text-[10px] font-medium px-2 py-[2px] rounded-full truncate max-w-[95%] text-center mt-0.5
                                                                            ${isOfficialSelected ? 'bg-white/20 text-emerald-50' :
                                                                            isExtraSelected ? 'bg-white/20 text-blue-100' :
                                                                            isPending ? 'bg-amber-100 text-amber-700' :
                                                                            isActivelyOccupied ? 'text-slate-400' :
                                                                            'bg-slate-100 text-slate-500'}`}>
                                                                            {isOfficialSelected ? 'Penugasan' :
                                                                             isExtraSelected ? user?.name?.split(' ')[0] :
                                                                             isPending ? 'Menunggu...' :
                                                                             occupants.length > 0 ? occupants[0].name.split(' ')[0] :
                                                                             'Bebas'}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            )}

                                            {/* Summary bar */}
                                            <div className="border-t border-slate-100/80 px-6 py-4 flex items-center justify-between bg-slate-50/50">
                                                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Ringkasan Area</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-slate-200 shadow-sm">
                                                        <Activity className="w-3 h-3 text-slate-600" />
                                                        <span className="text-[11px] font-bold text-slate-700">{selectedTables.filter(t => t.type === 'BILLIARD').length}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-slate-200 shadow-sm">
                                                        <LayoutDashboard className="w-3 h-3 text-orange-500" />
                                                        <span className="text-[11px] font-bold text-slate-700">{selectedTables.filter(t => t.type === 'CAFE').length}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {/* ── Action Footer ── */}
                                <div className="pt-4 flex flex-col gap-3">
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
                                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-14 rounded-[20px] font-semibold text-[15px] transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                                                >
                                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" strokeWidth={2} /><span>Simpan Perubahan Modal</span></>}
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => { setIsManualOpen(false); if (forcedOpen) router.push('/'); }}
                                                className="w-full bg-slate-900 hover:bg-black text-white h-14 rounded-[20px] font-semibold text-[15px] transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.98]"
                                            >
                                                <LayoutDashboard className="w-5 h-5" strokeWidth={2} />
                                                <span>Buka Dashboard Operasional</span>
                                                <ChevronRight className="w-5 h-5 opacity-60" strokeWidth={2} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={loading || !shiftName || shiftName === 'CUSTOM'}
                                            className="w-full bg-[#E5E5EA] disabled:bg-[#F2F2F7] disabled:text-slate-400 hover:bg-blue-600 hover:text-white text-blue-600 h-14 rounded-[20px] font-semibold text-[15px] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                        >
                                            {loading ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Zap className="w-4 h-4" strokeWidth={2.5} />
                                                    <span>Aktifkan Sesi Shift</span>
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
                            className="absolute inset-0 bg-slate-900/80 "
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
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6  relative z-10">
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
