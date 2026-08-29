'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { performKMeansClustering, rotateAssignments } from '@/utils/spatialClustering';
import {
    Users,
    Shield,
    Activity,
    RefreshCw,
    Search,
    ChevronRight,
    Lock,
    Unlock,
    Coffee,
    LayoutDashboard,
    CheckCircle2,
    AlertCircle,
    UserCircle2,
    Filter,
    Gamepad2,
    MousePointer2,
    Trash2,
    X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/components/ui/AlertProvider';
import { useMqtt } from '@/context/MqttContext';
import FloorPlanMap from '@/components/FloorPlanMap';

// import { API_URL } from '@/utils/urlUtils';

interface User {
    id: number;
    name: string;
    username: string;
    role: {
        id: number;
        name: string;
        permissions: string[];
    } | null;
    assignedTableIds?: { type: 'CAFE' | 'BILLIARD'; id: number }[] | null;
    status: string;
}

interface Shift {
    id: number;
    userId: number;
    user: User;
    shiftName: string;
    status: string;
    startTime: string;
    assignedTableIds: { type: 'CAFE' | 'BILLIARD'; id: number }[] | null;
}

interface Table {
    id: number;
    tableName: string;
    type: 'CAFE' | 'BILLIARD';
}

export default function WaiterAssignmentsPage() {
    const { hasPermission } = useAuth();
    const { showAlert } = useAlert();
    const { subscribe } = useMqtt();
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [employees, setEmployees] = useState<User[]>([]);
    const [cafeTables, setCafeTables] = useState<Table[]>([]);
    const [billiardTables, setBilliardTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingShift, setUpdatingShift] = useState<number | null>(null);
    const [updatingUser, setUpdatingUser] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [mounted, setMounted] = useState(false);
    
    // Auto Assign States
    const [autoAssigning, setAutoAssigning] = useState(false);
    const [floorElements, setFloorElements] = useState<any[]>([]);

    // Target Selection Modal States
    const [showTargetModal, setShowTargetModal] = useState(false);
    const [targetActionType, setTargetActionType] = useState<'assign' | 'rotate' | null>(null);
    const [selectedTargetIds, setSelectedTargetIds] = useState<number[]>([]);

    // UI state for modal
    const [selectedItem, setSelectedItem] = useState<{ shift?: Shift, user: User } | null>(null);
    const [localAssignments, setLocalAssignments] = useState<{ type: 'CAFE' | 'BILLIARD'; id: number }[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('map');

    useEffect(() => {
        setMounted(true);
        fetchData();

        // MQTT Listeners for Real-time Sync
        const silentFetch = () => fetchData(true);
        const unsubs = [
            subscribe('billiard/shift/started', silentFetch),
            subscribe('billiard/shift/ended', silentFetch),
            subscribe('billiard/assignments/updated', silentFetch),
            subscribe('billiard/user/+/status', silentFetch),
        ];

        return () => unsubs.forEach(u => u());
    }, [subscribe]);

    const fetchData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [shiftRes, employeeRes, cafeRes, billiardRes, settingsRes] = await Promise.all([
                axios.get(`/finance/shifts/open`),
                axios.get(`/users/employees`),
                axios.get(`/cafe-table`),
                axios.get(`/billiard/tables`),
                axios.get(`/settings`)
            ]);

            if (settingsRes.data?.floorPlanLayout) {
                const parsed = typeof settingsRes.data.floorPlanLayout === 'string' 
                    ? JSON.parse(settingsRes.data.floorPlanLayout) 
                    : settingsRes.data.floorPlanLayout;
                if (parsed.elements) setFloorElements(parsed.elements);
                else if (parsed.floors && parsed.floors.length > 0) {
                    setFloorElements(parsed.floors.flatMap((f: any) => f.elements || []));
                }
            }

            const sortTables = (tables: any[]) => {
                return [...tables].sort((a, b) => {
                    const nameA = a.tableName || a.name || String(a.id);
                    const nameB = b.tableName || b.name || String(b.id);
                    const matchA = nameA.match(/\d+/);
                    const matchB = nameB.match(/\d+/);
                    if (matchA && matchB) {
                        const numA = parseInt(matchA[0], 10);
                        const numB = parseInt(matchB[0], 10);
                        if (numA !== numB) return numA - numB;
                    }
                    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
                });
            };

            setShifts(shiftRes.data);
            setEmployees(employeeRes.data);
            setCafeTables(sortTables(cafeRes.data).map((t: any) => ({ ...t, type: 'CAFE' })));
            setBilliardTables(sortTables(billiardRes.data).map((t: any) => ({ ...t, type: 'BILLIARD' })));
        } catch (error) {
            console.error('Failed to fetch data:', error);
            showAlert('Error', 'Gagal memuat data penugasan.', { variant: 'error' });
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleOpenManageModal = (item: { shift?: Shift, user: User }) => {
        setSelectedItem(item);
        const rawAssignments = item.shift?.assignedTableIds || item.user.assignedTableIds || [];
        
        // Normalize IDs to numbers and FILTER only valid/existing tables to avoid "ghost" counts
        // CRITICAL: Only filter if table lists are loaded to prevent accidental data loss
        let validAssignments = rawAssignments.map((a: any) => ({ ...a, id: Number(a.id) }));
        
        if (billiardTables.length > 0 || cafeTables.length > 0) {
            validAssignments = validAssignments.filter((a: any) => {
                if (a.type === 'BILLIARD') {
                    return billiardTables.some((bt: any) => Number(bt.id) === a.id);
                }
                if (a.type === 'CAFE') {
                    return cafeTables.some((ct: any) => Number(ct.id) === a.id);
                }
                return false;
            });
        }

        // Deduplicate just in case
        const uniqueAssignments = validAssignments.filter((v, i, a) => a.findIndex(t => t.type === v.type && t.id === v.id) === i);
        
        setLocalAssignments(uniqueAssignments);
    };

    const handleSelectAll = (type: 'BILLIARD' | 'CAFE') => {
        const tables = type === 'BILLIARD' ? billiardTables : cafeTables;
        const newAssignments = tables.map(t => ({ type, id: Number(t.id) }));
        
        setLocalAssignments(prev => {
            const otherType = prev.filter(a => a.type !== type);
            return [...otherType, ...newAssignments];
        });
    };

    const handleClearAll = (type: 'BILLIARD' | 'CAFE') => {
        setLocalAssignments(prev => prev.filter(a => a.type !== type));
    };

    const toggleTable = (type: 'CAFE' | 'BILLIARD', id: number) => {
        const tableId = Number(id);
        setLocalAssignments(prev => {
            const exists = prev.find(t => t.type === type && Number(t.id) === tableId);
            if (exists) {
                return prev.filter(t => !(t.type === type && Number(t.id) === tableId));
            } else {
                return [...prev, { type, id: tableId }];
            }
        });
    };

    const handleSaveAssignments = async () => {
        if (!selectedItem) return;

        const isShift = !!selectedItem.shift;
        if (isShift) setUpdatingShift(selectedItem.shift!.id);
        else setUpdatingUser(selectedItem.user.id);

        try {
            // ALWAYS update user-level default assignments (persistent, survives shift end)
            await axios.post(`/finance/shifts/user/${selectedItem.user.id}/assignments`, {
                assignedTableIds: localAssignments
            });

            // ALSO update the active shift directly if we know the shift ID
            // This ensures instant hot-swap even if the backend query for active shift has issues
            if (isShift) {
                await axios.post(`/finance/shifts/${selectedItem.shift!.id}/assignments`, {
                    assignedTableIds: localAssignments
                });
            }

            showAlert('Sukses', `Penugasan untuk ${selectedItem.user.name} berhasil diperbarui.`, { variant: 'success' });
            setSelectedItem(null);
            fetchData(); // Refresh all
        } catch (error) {
            console.error('Update failed:', error);
            showAlert('Gagal', 'Gagal memperbarui penugasan.', { variant: 'error' });
        } finally {
            setUpdatingShift(null);
            setUpdatingUser(null);
        }
    };

    if (!hasPermission('USER_MANAGE')) {
        return <div className="p-10 text-center font-bold text-slate-400 uppercase tracking-widest">Akses Ditolak</div>;
    }

    // Merge Logic - Following "Matrix Izin" settings
    const assignmentList = employees
        .filter(emp => {
            if (!emp.role) return false;
            const roleName = emp.role.name.toUpperCase();

            // Exclude superadmin as it's a system role
            if (roleName === 'SUPERADMIN') return false;

            // Follow the settings: Show anyone who can handle tables/orders
            // OR anyone whose role name sounds relevant (flexible match)
            const perms = emp.role.permissions || [];
            const hasAccess = perms.some(p =>
                ['ORDER_MENU', 'DASHBOARD_TABLE', 'CAFE_ORDER', 'ACCESS_KDS', 'ACCESS_BDS', 'SHIFT_START'].includes(p)
            );

            // If they have the permissions or a relevant name, show them
            return hasAccess || ['WAITER', 'WAITERS', 'KASIR', 'CASHIER', 'STAFF', 'CHEF', 'BARTENDER'].some(n => roleName.includes(n));
        })
        .map(emp => {
            const activeShift = shifts.find(s => s.userId === emp.id);
            return {
                user: emp,
                shift: activeShift,
                assignedTableIds: activeShift?.assignedTableIds || emp.assignedTableIds || [],
                isActive: !!activeShift
            };
        });

    const filteredAssignments = assignmentList.filter(item =>
        item.user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate Table Occupancy for the "Cinema Seat" concept
    const tableOccupancy = {
        CAFE: {} as Record<number, { id: number, name: string, isActive: boolean }[]>,
        BILLIARD: {} as Record<number, { id: number, name: string, isActive: boolean }[]>
    };

    const getTableName = (type: 'CAFE' | 'BILLIARD', id: number | string) => {
        const tableId = Number(id);
        if (type === 'BILLIARD') {
            const table = billiardTables.find(t => t.id === tableId);
            return table ? table.tableName : `Billiard ${tableId}`;
        }
        const table = cafeTables.find(t => t.id === tableId);
        return table ? table.tableName : `Meja ${tableId}`;
    };

    if (selectedItem) {
        assignmentList.forEach(item => {
            if (item.user.id === selectedItem.user.id) return;

            (item.assignedTableIds || []).forEach(t => {
                const tableId = Number(t.id);
                if (!tableOccupancy[t.type][tableId]) {
                    tableOccupancy[t.type][tableId] = [];
                }
                tableOccupancy[t.type][tableId].push({
                    id: item.user.id,
                    name: item.user.name,
                    isActive: item.isActive
                });
            });
        });
    }

    const handleOpenTargetModal = (type: 'assign' | 'rotate') => {
        setTargetActionType(type);
        
        // Filter only those who are strictly WAITERS for smart assignment
        const eligibleWaiters = assignmentList.filter(item => {
            const roleName = item.user.role?.name?.toUpperCase() || '';
            return ['WAITER', 'WAITERS'].some(n => roleName.includes(n));
        });
        
        // Select all by default
        setSelectedTargetIds(eligibleWaiters.map(w => w.user.id));
        setShowTargetModal(true);
    };

    const executeAutoAssign = async () => {
        setShowTargetModal(false);
        const targetWaiters = assignmentList.filter(a => selectedTargetIds.includes(a.user.id));
        
        if (targetWaiters.length === 0) {
            showAlert('Peringatan', 'Tidak ada data waiter yang dipilih.', { variant: 'warning' });
            return;
        }
        if (floorElements.length === 0) {
            showAlert('Peringatan', 'Denah belum diatur. Silakan atur denah terlebih dahulu.', { variant: 'warning' });
            return;
        }

        const points = floorElements
            .filter(e => (e.type === 'BILLIARD' || e.type === 'CAFE') && e.tableId)
            .map(e => ({
                id: e.tableId,
                type: e.type as 'BILLIARD' | 'CAFE',
                x: e.x,
                y: e.y
            }));
            
        if (points.length === 0) {
            showAlert('Peringatan', 'Tidak ada meja valid di denah.', { variant: 'warning' });
            return;
        }

        setAutoAssigning(true);
        try {
            const clusters = performKMeansClustering(points, targetWaiters.length);
            const promises = targetWaiters.map(async (waiterItem, index) => {
                const tablesForWaiter = clusters[index] || [];
                const assignedTableIds = tablesForWaiter.map(t => ({ type: t.type, id: t.id }));
                await axios.post(`/finance/shifts/user/${waiterItem.user.id}/assignments`, { assignedTableIds });
                if (waiterItem.shift) {
                    await axios.post(`/finance/shifts/${waiterItem.shift.id}/assignments`, { assignedTableIds });
                }
            });

            await Promise.all(promises);
            showAlert('Sukses', 'Area penugasan berhasil dibagi secara cerdas!', { variant: 'success' });
            fetchData();
        } catch (error) {
            console.error('Auto assign failed', error);
            showAlert('Gagal', 'Terjadi kesalahan saat membagi area.', { variant: 'error' });
        } finally {
            setAutoAssigning(false);
        }
    };

    const executeRotateArea = async () => {
        setShowTargetModal(false);
        const targetWaiters = assignmentList.filter(a => selectedTargetIds.includes(a.user.id));
        
        if (targetWaiters.length <= 1) {
            showAlert('Peringatan', 'Butuh minimal 2 data waiter untuk rotasi.', { variant: 'warning' });
            return;
        }

        setAutoAssigning(true);
        try {
            const currentAssignments = targetWaiters.map(w => w.assignedTableIds || []);
            const rotatedAssignments = rotateAssignments(currentAssignments, 1);
            
            const promises = targetWaiters.map(async (waiterItem, index) => {
                const newAssignedTables = rotatedAssignments[index];
                await axios.post(`/finance/shifts/user/${waiterItem.user.id}/assignments`, { assignedTableIds: newAssignedTables });
                if (waiterItem.shift) {
                    await axios.post(`/finance/shifts/${waiterItem.shift.id}/assignments`, { assignedTableIds: newAssignedTables });
                }
            });

            await Promise.all(promises);
            showAlert('Sukses', 'Area penugasan berhasil dirotasi memutar!', { variant: 'success' });
            fetchData();
        } catch (error) {
            console.error('Rotate failed', error);
            showAlert('Gagal', 'Terjadi kesalahan saat merotasi area.', { variant: 'error' });
        } finally {
            setAutoAssigning(false);
        }
    };

    const handleClearAllAreas = async () => {
        if (!confirm('Anda yakin ingin MENGHAPUS SEMUA area penugasan dari seluruh waiter?')) return;
        
        const targetWaiters = assignmentList;
        if (targetWaiters.length === 0) return;

        setAutoAssigning(true);
        try {
            const promises = targetWaiters.map(async (waiterItem) => {
                const emptyAssignments: any[] = [];
                await axios.post(`/finance/shifts/user/${waiterItem.user.id}/assignments`, { assignedTableIds: emptyAssignments });
                if (waiterItem.shift) {
                    await axios.post(`/finance/shifts/${waiterItem.shift.id}/assignments`, { assignedTableIds: emptyAssignments });
                }
            });

            await Promise.all(promises);
            showAlert('Sukses', 'Seluruh penugasan berhasil dikosongkan!', { variant: 'success' });
            fetchData();
        } catch (error) {
            console.error('Clear failed', error);
            showAlert('Gagal', 'Terjadi kesalahan saat mengosongkan area.', { variant: 'error' });
        } finally {
            setAutoAssigning(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/40">
            <div className="p-4 lg:p-10 max-w-7xl mx-auto space-y-8">

                {/* ── Hero Header ── */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 rounded-3xl p-8 lg:p-10 text-white shadow-2xl shadow-indigo-200">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12" />
                    <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20  rounded-2xl flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Access Control</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Penugasan Waiter</h1>
                            <p className="text-white/60 text-sm font-semibold mt-1">Atur area kerja waiter secara real-time</p>
                            <div className="flex flex-wrap gap-3 mt-5">
                                <div className="bg-white/15  px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5">
                                    <Activity className="w-4 h-4" /> {shifts.length} Shift Aktif
                                </div>
                                <div className="bg-white/15  px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5">
                                    <Coffee className="w-4 h-4" /> {cafeTables.length} Meja Cafe
                                </div>
                                <div className="bg-white/15  px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5">
                                    <Gamepad2 className="w-4 h-4" /> {billiardTables.length} Billiard
                                </div>
                            </div>
                        </div>
                        <div className="w-full lg:w-72">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                                <input type="text" placeholder="Cari waiter / shift..."
                                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/20  border border-white/20 rounded-2xl font-bold text-white text-sm placeholder:text-white/50 focus:outline-none focus:bg-white/30" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Shift Aktif', value: shifts.length, icon: <Activity className="w-5 h-5 text-indigo-600" />, gradient: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-700' },
                        { label: 'Total Meja Cafe', value: cafeTables.length, icon: <Coffee className="w-5 h-5 text-amber-600" />, gradient: 'from-amber-500 to-orange-500', light: 'bg-amber-50', text: 'text-amber-700' },
                        { label: 'Total Billiard', value: billiardTables.length, icon: <Gamepad2 className="w-5 h-5 text-slate-700" />, gradient: 'from-slate-600 to-slate-700', light: 'bg-slate-100', text: 'text-slate-700' },
                        { 
                            label: 'Cakupan Area', 
                            value: `${(cafeTables.length + billiardTables.length) > 0 ? Math.round((new Set(assignmentList.flatMap(a => (a.assignedTableIds || []).map(t => `${t.type}-${t.id}`))).size / (cafeTables.length + billiardTables.length)) * 100) : 0}%`, 
                            icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, 
                            gradient: 'from-emerald-500 to-emerald-600', 
                            light: 'bg-emerald-50', 
                            text: 'text-emerald-700' 
                        },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-3xl p-5 lg:p-6 border border-slate-100 shadow-lg shadow-slate-100/60 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`w-10 h-10 ${s.light} rounded-2xl flex items-center justify-center text-lg`}>{s.icon}</div>
                                <div className={`h-1 w-8 rounded-full bg-gradient-to-r ${s.gradient}`} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                            <p className={`text-xl lg:text-2xl font-black ${s.text} leading-tight`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* ── Action Bar (AI & Tools) ── */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-md">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">Manajemen Cerdas</h2>
                            <p className="text-xs text-slate-500 font-medium">Bagi atau rotasi area kerja secara otomatis</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                        <button
                            onClick={handleClearAllAreas}
                            disabled={autoAssigning || loading}
                            className="flex-shrink-0 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-red-100"
                        >
                            <Trash2 className="w-4 h-4" /> Kosongkan
                        </button>
                        <button
                            onClick={() => handleOpenTargetModal('rotate')}
                            disabled={autoAssigning || loading}
                            className="flex-shrink-0 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${autoAssigning ? 'animate-spin' : ''}`} /> Rotasi Area
                        </button>
                        <button
                            onClick={() => handleOpenTargetModal('assign')}
                            disabled={autoAssigning || loading}
                            className="flex-shrink-0 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Activity className="w-4 h-4" /> Bagi Area Pintar
                        </button>
                    </div>
                </div>

                {/* Waiters List */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 bg-white rounded-[2rem] animate-pulse" />
                        ))}
                    </div>
                ) : filteredAssignments.length === 0 ? (
                    <div className="bg-white p-20 rounded-[3rem] border border-slate-200 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center mx-auto text-slate-300">
                            <Users className="w-10 h-10" />
                        </div>
                        <p className="text-slate-400 font-bold">Tidak ada staf yang ditemukan sesuai kriteria.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAssignments.map((item, idx) => (
                            <div key={idx} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col">
                                {/* Color Strip */}
                                <div className={`h-2 bg-gradient-to-r ${item.isActive ? 'from-indigo-500 to-violet-500' : 'from-slate-200 to-slate-300'}`} />

                                <div className={`p-8 space-y-6 flex-1 flex flex-col ${!item.isActive ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-semibold text-2xl shadow-sm border transition-all duration-500 ${item.isActive
                                                ? 'bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-110'
                                                : 'bg-slate-50 text-slate-400 border-slate-100'
                                                }`}>
                                                {item.user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h3 className="text-lg font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors tracking-tight">{item.user.name}</h3>
                                                    <div className={`w-2 h-2 rounded-full ${item.user.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} title={`User Status: ${item.user.status}`} />
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                                                    {item.user.role?.name || 'No Role'} {item.shift ? `• ${item.shift.shiftName || 'Standard'}` : '• OFF DUTY'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${item.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                            <span className={`w-1.5 h-1.5 bg-current rounded-full ${item.isActive ? 'animate-pulse' : ''}`} />
                                            <span className="text-[9px] font-semibold tracking-widest">{item.isActive ? 'DALAM SHIFT' : 'LUAR SHIFT'}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center px-1">
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Penugasan Area</p>
                                            <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${item.isActive ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 bg-slate-100'}`}>
                                                {item.assignedTableIds?.length || 0} Meja
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 min-h-[40px]">
                                            {item.assignedTableIds && item.assignedTableIds.length > 0 ? (
                                                <>
                                                    {item.assignedTableIds.slice(0, 8).map((t, tIdx) => (
                                                        <div key={tIdx} className={`px-2.5 py-1.5 rounded-xl text-[10px] font-medium tracking-tight flex items-center gap-1.5 ${t.type === 'BILLIARD' ? 'bg-slate-800 text-white shadow-sm' : 'bg-indigo-50 text-indigo-700 border border-indigo-100/50'
                                                            }`}>
                                                            {t.type === 'BILLIARD' ? <Gamepad2 className="w-2.5 h-2.5" /> : <Coffee className="w-2.5 h-2.5" />}
                                                            {getTableName(t.type, t.id)}
                                                        </div>
                                                    ))}
                                                    {item.assignedTableIds.length > 8 && (
                                                        <div className="px-2.5 py-1.5 rounded-xl text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200/60 tracking-tight">
                                                            +{item.assignedTableIds.length - 8} Lainya
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-2 text-slate-300 italic text-xs px-1">
                                                    <AlertCircle className="w-3.5 h-3.5" /> {item.isActive ? 'Belum ada penugasan (Hanya lihat)' : 'Belum ada penugasan default'}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100 mt-auto">
                                        <button
                                            onClick={() => handleOpenManageModal(item)}
                                            className="w-full bg-slate-50 group-hover:bg-indigo-600 hover:bg-indigo-700 text-slate-600 group-hover:text-white py-3.5 rounded-2xl font-semibold text-sm tracking-wide transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                                        >
                                            <MousePointer2 className="w-4 h-4 transition-transform group-hover:rotate-12" />
                                            Atur Penugasan
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
                }

                {/* Assignment Modal */}
                {selectedItem && mounted && createPortal(
                    <div className="fixed -inset-4 sm:inset-0 z-[9999] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/80 " onClick={() => setSelectedItem(null)} />
                        <div className="relative bg-white rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] w-full max-w-7xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/20">
                            {/* Modal Header */}
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-indigo-900 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-200">
                                        {selectedItem.user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 leading-none mb-1">Atur Penugasan</h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            Pilih meja untuk {selectedItem.user.name} {selectedItem.shift ? `(${selectedItem.shift.shiftName || 'Standard'})` : '(Default assignments)'}
                                        </p>
                                    </div>
                                </div>
                                    <div className="bg-slate-100 p-1 rounded-xl flex items-center mr-4">
                                        <button 
                                            onClick={() => setViewMode('map')} 
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all \${viewMode === 'map' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Peta (Denah)
                                        </button>
                                        <button 
                                            onClick={() => setViewMode('grid')} 
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all \${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Grid
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedItem(null)}
                                        className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all"
                                        title="Tutup Panel"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-8 overflow-y-auto space-y-12 custom-scrollbar flex-1 bg-slate-50/20">
                                {viewMode === 'map' ? (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-1">
                                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Peta Lokasi Interaktif</h3>
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => setLocalAssignments([])} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase hover:bg-rose-100 transition-colors shadow-sm">
                                                    Kosongkan Semua
                                                </button>
                                            </div>
                                        </div>
                                        <FloorPlanMap 
                                            localAssignments={localAssignments} 
                                            onToggleTable={toggleTable} 
                                            tableOccupancy={tableOccupancy}
                                            waiterColorClass="bg-indigo-600 border-indigo-700 text-white"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        {/* Billiard Section */}
                                <div className="space-y-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-indigo-400 flex items-center justify-center shadow-lg shadow-slate-200">
                                                <Gamepad2 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none mb-1">Meja Billiard</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">IOT Real-time Control</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                type="button"
                                                onClick={() => handleSelectAll('BILLIARD')}
                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-100 transition-colors border border-indigo-100 shadow-sm"
                                            >
                                                Pilih Semua
                                            </button>
                                            <button 
                                                onClick={() => handleClearAll('BILLIARD')}
                                                className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase hover:bg-rose-100 transition-colors border border-rose-100 shadow-sm"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {billiardTables.map(t => {
                                            const tableId = Number(t.id);
                                            const isAssigned = localAssignments.some(la => la.type === 'BILLIARD' && Number(la.id) === tableId);
                                            const occupants = tableOccupancy.BILLIARD[tableId] || [];
                                            const isOccupiedByOthers = occupants.length > 0;

                                            return (
                                                <button
                                                    key={`b-${t.id}`}
                                                    onClick={() => toggleTable('BILLIARD', t.id)}
                                                    className={`p-5 rounded-3xl border-2 transition-all relative group flex flex-col items-center gap-3 h-32 justify-center overflow-hidden ${isAssigned
                                                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-400 scale-[1.02]'
                                                        : isOccupiedByOthers
                                                            ? 'bg-amber-50/50 border-amber-200 text-amber-900'
                                                            : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-400 hover:bg-slate-50 hover:shadow-xl hover:-translate-y-1'
                                                        }`}
                                                >
                                                    {isOccupiedByOthers && (
                                                        <div className="absolute top-3 right-3 flex gap-1">
                                                            {occupants.slice(0, 3).map((occ, i) => (
                                                                <div key={i} className={`w-2 h-2 rounded-full border border-white ${occ.isActive ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-amber-200'}`} />
                                                            ))}
                                                        </div>
                                                    )}

                                                    <span className="text-xs font-black uppercase tracking-widest text-center px-1 truncate w-full">{t.tableName}</span>

                                                    <div className="flex flex-col items-center gap-1.5">
                                                        {isAssigned ? (
                                                            <div className="bg-indigo-500/20 p-2 rounded-xl animate-in zoom-in-50">
                                                                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                                                            </div>
                                                        ) : isOccupiedByOthers ? (
                                                            <Users className="w-5 h-5 text-amber-500" />
                                                        ) : (
                                                            <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-indigo-50 transition-colors">
                                                                <Lock className="w-4 h-4 text-slate-200 group-hover:text-indigo-300" />
                                                            </div>
                                                        )}

                                                        {isOccupiedByOthers && (
                                                            <div className="text-[8px] font-black uppercase tracking-tight truncate max-w-[80px] opacity-70 bg-amber-100/50 px-2 py-0.5 rounded-full">
                                                                {occupants.map(o => o.name.split(' ')[0]).join(', ')}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Selected Indicator Glow */}
                                                    {isAssigned && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Cafe Section */}
                                <div className="space-y-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                                                <Coffee className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none mb-1">Meja Cafe</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">POS Menu Access</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                type="button"
                                                onClick={() => handleSelectAll('CAFE')}
                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-100 transition-colors border border-indigo-100 shadow-sm"
                                            >
                                                Pilih Semua
                                            </button>
                                            <button 
                                                onClick={() => handleClearAll('CAFE')}
                                                className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase hover:bg-rose-100 transition-colors border border-rose-100 shadow-sm"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {cafeTables.map(t => {
                                            const tableId = Number(t.id);
                                            const isAssigned = localAssignments.some(la => la.type === 'CAFE' && Number(la.id) === tableId);
                                            const occupants = tableOccupancy.CAFE[tableId] || [];
                                            const isOccupiedByOthers = occupants.length > 0;

                                            return (
                                                <button
                                                    type="button"
                                                    key={`c-${t.id}`}
                                                    onClick={() => toggleTable('CAFE', t.id)}
                                                    className={`p-5 rounded-3xl border-2 transition-all relative group flex flex-col items-center gap-3 h-32 justify-center overflow-hidden ${isAssigned
                                                        ? 'bg-gradient-to-br from-indigo-600 to-violet-700 border-indigo-600 text-white shadow-2xl shadow-indigo-300 scale-[1.02]'
                                                        : isOccupiedByOthers
                                                            ? 'bg-amber-50/50 border-amber-200 text-amber-900'
                                                            : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-400 hover:bg-slate-50 hover:shadow-xl hover:-translate-y-1'
                                                        }`}
                                                >
                                                    {isOccupiedByOthers && (
                                                        <div className="absolute top-3 right-3 flex gap-1">
                                                            {occupants.slice(0, 3).map((occ, i) => (
                                                                <div key={i} className={`w-2 h-2 rounded-full border border-white ${occ.isActive ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-amber-200'}`} />
                                                            ))}
                                                        </div>
                                                    )}

                                                    <span className="text-xs font-black uppercase tracking-widest text-center px-1 truncate w-full">{t.tableName}</span>

                                                    <div className="flex flex-col items-center gap-1.5">
                                                        {isAssigned ? (
                                                            <div className="bg-white/20 p-2 rounded-xl animate-in zoom-in-50">
                                                                <CheckCircle2 className="w-5 h-5 text-white" />
                                                            </div>
                                                        ) : isOccupiedByOthers ? (
                                                            <Users className="w-5 h-5 text-amber-500" />
                                                        ) : (
                                                            <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-indigo-50 transition-colors">
                                                                <Unlock className="w-4 h-4 text-slate-200 group-hover:text-indigo-300" />
                                                            </div>
                                                        )}

                                                        {isOccupiedByOthers && (
                                                            <div className="text-[8px] font-black uppercase tracking-tight truncate max-w-[80px] opacity-70 bg-amber-100/50 px-2 py-0.5 rounded-full">
                                                                {occupants.map(o => o.name.split(' ')[0]).join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                    </>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-8 border-t border-slate-100 bg-white flex items-center justify-between gap-4">
                                <div className="text-sm font-bold text-slate-400">
                                    Total dipilih: <span className="text-indigo-600 font-black">{localAssignments.length} Meja</span>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedItem(null)}
                                        className="px-6 py-3.5 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all text-sm"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveAssignments}
                                        disabled={updatingShift !== null || updatingUser !== null}
                                        className="px-10 py-3.5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all text-sm flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {updatingShift !== null || updatingUser !== null ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                        Simpan & Sinkronisasi
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* ── Target Selection Modal ── */}
                {mounted && showTargetModal && createPortal(
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 " onClick={() => setShowTargetModal(false)} />
                        <div className="bg-white rounded-3xl w-full max-w-md relative flex flex-col max-h-[90vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-xl font-black text-slate-800">
                                    {targetActionType === 'assign' ? 'Pilih Target Auto-Assign' : 'Pilih Target Rotasi'}
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">Centang waiter yang akan diatur areanya. Agar tidak kacau, pastikan Anda hanya memilih waiter dalam satu shift yang sama (misal: Shift 1 saja).</p>
                            </div>
                            
                            <div className="p-6 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
                                {assignmentList.filter(item => {
                                    const roleName = item.user.role?.name?.toUpperCase() || '';
                                    return ['WAITER', 'WAITERS'].some(n => roleName.includes(n));
                                }).map(item => {
                                    const isSelected = selectedTargetIds.includes(item.user.id);
                                    return (
                                        <button
                                            key={item.user.id}
                                            onClick={() => setSelectedTargetIds(prev => isSelected ? prev.filter(id => id !== item.user.id) : [...prev, item.user.id])}
                                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-100'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                    {item.user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="text-left">
                                                    <p className={`font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{item.user.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                                                            {item.shift ? (
                                                                <span className="text-emerald-500">DALAM SHIFT: {item.shift.shiftName}</span>
                                                            ) : (
                                                                <span>OFF DUTY</span>
                                                            )}
                                                        </p>
                                                        {(item.user as any).baseShift && (
                                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest ${isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                                                                {(item.user as any).baseShift}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 border border-slate-200'}`}>
                                                {isSelected && <CheckCircle2 className="w-4 h-4" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-white flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowTargetModal(false)}
                                    className="flex-1 py-3.5 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all text-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={targetActionType === 'assign' ? executeAutoAssign : executeRotateArea}
                                    disabled={selectedTargetIds.length === 0}
                                    className="flex-1 py-3.5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {targetActionType === 'assign' ? <Activity className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                                    Mulai Proses
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
}
