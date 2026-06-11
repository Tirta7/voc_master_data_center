'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAlert } from '@/components/ui/AlertProvider';
import { Plus, Trash2, Edit2, Server, Power, RefreshCw, X, Save, Shield, Wifi, Coffee, ShieldOff, Activity, Zap, Sun, ChevronRight, ChevronLeft, FastForward, Shuffle, Loader, Hash, Building2, Signal } from 'lucide-react';
import InputField from '@/components/ui/InputField';
import { useAuth } from '@/context/AuthContext';
import { useMqtt } from '@/context/MqttContext';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/fetcher';
// import { API_URL } from '@/utils/urlUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

type HardwareType = 'PCF8575' | 'MOC3062' | 'ESPNOW_NODE';

interface BilliardTable {
    id: number;
    tableName: string;
    categoryId?: number;
    macAddress?: string;
    relayPin?: number;
    hardwareType?: HardwareType;
    floorNumber?: number;         // Lantai fisik (1–4)
    espnowGatewayMac?: string;    // MAC Gateway untuk ESPNOW_NODE
    productionZone?: string;      // Zona produksi (misal: "ZONE_A", "ZONE_B")
    stationType?: 'BILLIARD' | 'PLAYSTATION';
    ipAddress?: string;
    status: string;
    isLightOn: boolean;
    lastPingStatus?: 'online' | 'offline' | 'checking';
}

interface CafeTable {
    id: number;
    tableName: string;
    capacity?: number;
    status: string;
    currentCustomer?: string;
}

type TableType = 'billiard' | 'cafe';
type ModalMode = 'choose' | 'billiard-form' | 'cafe-form';

// ─── Component ────────────────────────────────────────────────────────────────

export default function TableManagementPage() {
    const { hasPermission } = useAuth();
    const { showAlert, showConfirm } = useAlert();
    const { subscribe } = useMqtt();

    // SWR Data Fetching
    const { data: billiardTables, mutate: mutateBilliard, isLoading: loadingBilliard } = useSWR<BilliardTable[]>('/billiard/tables', fetcher);
    const { data: cafeTables, mutate: mutateCafe, isLoading: loadingCafe } = useSWR<CafeTable[]>('/cafe-table', fetcher);
    const { data: categoriesData, isLoading: loadingCategories } = useSWR<any[]>('/categories', fetcher);

    const [editingBilliard, setEditingBilliard] = useState<BilliardTable | null>(null);
    const [lastSavedBilliard, setLastSavedBilliard] = useState<BilliardTable | null>(null);
    const [billiardForm, setBilliardForm] = useState<{
        tableName: string;
        categoryId: number | '';
        macAddress: string;
        relayPin: number;
        hardwareType: HardwareType;
        floorNumber: number;
        espnowGatewayMac: string;
        productionZone: string;
        status: string;
        stationType: 'BILLIARD' | 'PLAYSTATION';
        ipAddress: string;
    }>({ tableName: '', categoryId: '', macAddress: '', relayPin: 4, hardwareType: 'ESPNOW_NODE', floorNumber: 1, espnowGatewayMac: '', productionZone: '', status: 'available', stationType: 'BILLIARD', ipAddress: '' });

    const [editingCafe, setEditingCafe] = useState<CafeTable | null>(null);
    const [cafeForm, setCafeForm] = useState<{ tableName: string; capacity: string }>({
        tableName: '',
        capacity: '',
    });

    const [modalMode, setModalMode] = useState<ModalMode | null>(null);
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // ── Sorted Tables ──────────────────────────────────────────────────────────
    const sortedBilliardTables = React.useMemo(() => {
        if (!billiardTables) return [];
        return [...billiardTables].sort((a, b) =>
            a.tableName.localeCompare(b.tableName, undefined, { numeric: true, sensitivity: 'base' })
        );
    }, [billiardTables]);

    const sortedCafeTables = React.useMemo(() => {
        if (!cafeTables) return [];
        return [...cafeTables].sort((a, b) =>
            a.tableName.localeCompare(b.tableName, undefined, { numeric: true, sensitivity: 'base' })
        );
    }, [cafeTables]);

    useEffect(() => {
        const onTableUpdate = (data: any) => {
            if (data.type === 'billiard' || !data.type) {
                mutateBilliard();
            } else if (data.type === 'cafe') {
                mutateCafe();
            }
        };

        const onHeartbeat = (data: any) => {
            if (data.tableId) {
                mutateBilliard(prev => {
                    if (!prev) return prev;
                    return prev.map(t => t.id === data.tableId 
                        ? { ...t, lastPingStatus: data.status === 'ONLINE' ? 'online' : 'offline' } 
                        : t
                    );
                }, false);
            }
        };

        const unsubMqtt = subscribe('billiard/tables/update', onTableUpdate);
        
        const { socket } = require('@/lib/socket');
        socket.on('heartbeat', onHeartbeat);

        return () => {
            unsubMqtt();
            socket.off('heartbeat', onHeartbeat);
        };
    }, [subscribe, mutateBilliard, mutateCafe]);

    const fetchBilliardTables = () => mutateBilliard();
    const fetchCafeTables = () => mutateCafe();

    // ── Billiard Handlers ──────────────────────────────────────────────────────

    const openAddBilliard = async () => {
        setEditingBilliard(null);
        setLastSavedBilliard(null);

        // Ambil usulan ID berikutnya dari database (untuk mesaId/relayPin)
        let suggestedId = 1;
        try {
            const res = await axios.get('/billiard/suggested-id');
            suggestedId = res.data.nextId || 1;
        } catch (e) {
            console.error('Gagal mengambil ID otomatis', e);
        }

        setBilliardForm({
            tableName: '',
            categoryId: '',
            macAddress: '',
            relayPin: suggestedId,
            hardwareType: 'ESPNOW_NODE',
            floorNumber: 1,
            espnowGatewayMac: '',
            productionZone: '',
            status: 'available',
            stationType: 'BILLIARD',
            ipAddress: ''
        });
        setTouched({});
        setHasUnsavedChanges(false);
        setModalMode('billiard-form');
    };

    const openAddPlaystation = async () => {
        setEditingBilliard(null);
        setLastSavedBilliard(null);

        setBilliardForm({
            tableName: '',
            categoryId: '',
            macAddress: '',
            relayPin: 1,
            hardwareType: 'ESPNOW_NODE',
            floorNumber: 1,
            espnowGatewayMac: '',
            productionZone: '',
            status: 'available',
            stationType: 'PLAYSTATION',
            ipAddress: ''
        });
        setTouched({});
        setHasUnsavedChanges(false);
        setModalMode('billiard-form');
    };

    const handleEditBilliard = (table: BilliardTable) => {
        setEditingBilliard(table);
        setLastSavedBilliard(table);
        const hwType: HardwareType = (table.hardwareType === 'MOC3062') ? 'MOC3062' : table.hardwareType === 'PCF8575' ? 'PCF8575' : 'ESPNOW_NODE';
        setBilliardForm({
            tableName: table.tableName,
            categoryId: table.categoryId || '',
            macAddress: table.macAddress || '',
            relayPin: table.relayPin ?? (hwType === 'MOC3062' ? 4 : 0),
            hardwareType: hwType,
            floorNumber: table.floorNumber ?? 1,
            espnowGatewayMac: table.espnowGatewayMac || '',
            productionZone: table.productionZone || '',
            status: (table.status as any) || 'available',
            stationType: table.stationType || 'BILLIARD',
            ipAddress: table.ipAddress || '',
        });
        setTouched({});
        setHasUnsavedChanges(false);
        setModalMode('billiard-form');
    };

    const handleDeleteBilliard = async (id: number) => {
        const confirmed = await showConfirm('Hapus Meja Billiard?', 'Tindakan ini tidak dapat dibatalkan.');
        if (!confirmed) return;
        try {
            await axios.delete(`/billiard/tables/${id}`);
            await showAlert('Berhasil', 'Meja billiard berhasil dihapus', { variant: 'success' });
            fetchBilliardTables();
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Gagal menghapus meja. Pastikan meja tidak sedang aktif.';
            showAlert('Gagal', msg, { variant: 'error' });
        }
    };

    const handleSubmitBilliard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!billiardForm.tableName.trim()) {
            setTouched({ tableName: true });
            showAlert('Validasi', 'Nama meja wajib diisi', { variant: 'warning' });
            return;
        }
        try {
            if (editingBilliard) {
                await axios.patch(`/billiard/tables/${editingBilliard.id}`, billiardForm);
                await showAlert('Berhasil', 'Data meja diperbarui', { variant: 'success' });
            } else {
                await axios.post(`/billiard/tables`, billiardForm);
                await showAlert('Berhasil', 'Meja billiard baru ditambahkan', { variant: 'success' });
            }
            setModalMode(null);
            setEditingBilliard(null);
            fetchBilliardTables();
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Gagal menyimpan data meja. Silakan periksa koneksi atau data input.';
            showAlert('Gagal Simpan', msg, { variant: 'error' });
        }
    };

    const handlePing = async (id: number) => {
        // Optimistic update via mutate is possible, but since ping is volatile, let's just trigger it
        try {
            const res = await axios.post(`/billiard/tables/${id}/ping`, {});
            if (res.data.success) {
                showAlert('Berhasil', `Sinyal PING terkirim ke alat.`, { variant: 'success' });
                // We could add a local state for ping, but for now let's just revalidate
                mutateBilliard();
            } else {
                showAlert('Ping Gagal', 'ESP32 tidak merespon/offline', { variant: 'warning' });
                mutateBilliard();
            }
        } catch {
            showAlert('Ping Gagal', 'ESP32 tidak merespon (timeout)', { variant: 'error' });
            mutateBilliard();
        }
    };

    const handleToggleLight = async (id: number, isOn: boolean) => {
        const confirmed = await showConfirm(`Kendalikan Lampu Manual?`, `Anda yakin ingin ${isOn ? 'MENYALAKAN' : 'MEMATIKAN'} lampu meja ini?`);
        if (!confirmed) return;
        try {
            await axios.patch(`/billiard/tables/${id}/toggle-light`, { isOn });
            showAlert('Berhasil', `Sinyal ${isOn ? 'ON' : 'OFF'} telah dikirim ke ESP32.`, { variant: 'success' });
            // Optimistic update for SWR
            mutateBilliard(
                (billiardTables || []).map(t => t.id === id ? { ...t, isLightOn: isOn } : t),
                false // don't revalidate immediately to keep the state
            );
        } catch {
            showAlert('Gagal', 'Koneksi ke ESP32 / Server gagal', { variant: 'error' });
        }
    };

    // ── Cafe Handlers ──────────────────────────────────────────────────────────

    const openAddCafe = () => {
        setEditingCafe(null);
        setCafeForm({ tableName: '', capacity: '' });
        setTouched({});
        setHasUnsavedChanges(false);
        setModalMode('cafe-form');
    };

    const handleEditCafe = (table: CafeTable) => {
        setEditingCafe(table);
        setCafeForm({ tableName: table.tableName, capacity: table.capacity?.toString() || '' });
        setTouched({});
        setHasUnsavedChanges(false);
        setModalMode('cafe-form');
    };

    const handleDeleteCafe = async (id: number) => {
        const confirmed = await showConfirm('Hapus Meja Cafe?', 'Tindakan ini tidak dapat dibatalkan.');
        if (!confirmed) return;
        try {
            await axios.delete(`/cafe-table/${id}`);
            await showAlert('Berhasil', 'Meja cafe berhasil dihapus', { variant: 'success' });
            fetchCafeTables();
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Gagal menghapus meja cafe. Pastikan sesi aktif sudah ditutup.';
            showAlert('Gagal', msg, { variant: 'error' });
        }
    };

    const handleSubmitCafe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cafeForm.tableName.trim()) {
            setTouched({ tableName: true });
            showAlert('Validasi', 'Nama meja wajib diisi', { variant: 'warning' });
            return;
        }
        const payload = {
            tableName: cafeForm.tableName.trim(),
            capacity: cafeForm.capacity ? Number(cafeForm.capacity) : undefined,
        };
        try {
            if (editingCafe) {
                await axios.patch(`/cafe-table/${editingCafe.id}`, payload);
                await showAlert('Berhasil', 'Meja cafe diperbarui', { variant: 'success' });
            } else {
                await axios.post(`/cafe-table`, payload);
                await showAlert('Berhasil', 'Meja cafe baru ditambahkan', { variant: 'success' });
            }
            setModalMode(null);
            setEditingCafe(null);
            fetchCafeTables();
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Gagal menyimpan meja cafe.';
            showAlert('Gagal Simpan', msg, { variant: 'error' });
        }
    };

    // ── Modal Close ────────────────────────────────────────────────────────────

    const handleCloseModal = async () => {
        if (hasUnsavedChanges) {
            const confirm = await showConfirm('Batalkan Perubahan?', 'Yakin ingin keluar? Perubahan tidak akan disimpan.');
            if (!confirm) return;
        }
        setModalMode(null);
        setEditingBilliard(null);
        setEditingCafe(null);
    };

    // ── Stats ──────────────────────────────────────────────────────────────────

    const activeBilliard = (sortedBilliardTables || []).filter(t => t.status === 'in_use').length;
    const activeCafe = (sortedCafeTables || []).filter(t => t.status === 'occupied').length;

    // ── Render ─────────────────────────────────────────────────────────────────

    if (!hasPermission('SETTING_TABLES')) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-10 text-center">
                <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mb-6 border-2 border-rose-100 shadow-xl shadow-rose-100/50">
                    <ShieldOff className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter uppercase">Akses Terbatas</h2>
                <p className="text-slate-500 max-w-md font-medium leading-relaxed">
                    Maaf, akun Anda tidak memiliki izin untuk mengelola konfigurasi meja.
                    Silakan hubungi Administrator untuk mendapatkan akses.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/40">
            <div className="p-4 lg:p-10 max-w-7xl mx-auto space-y-8">

                {/* Hero Header */}
                <div className="relative bg-gradient-to-br from-slate-800 via-indigo-900 to-purple-900 rounded-3xl p-8 lg:p-10 text-white shadow-2xl shadow-slate-300">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12" />
                    </div>
                    <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <Server className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Table Configuration</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Manajemen Meja</h1>
                            <p className="text-white/60 text-sm font-semibold mt-1">Kelola meja billiard IoT dan meja cafe dari satu halaman</p>
                            <div className="flex flex-wrap gap-3 mt-5">
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                    🎱 {sortedBilliardTables.length} Billiard
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                    ☕ {sortedCafeTables.length} Cafe
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black">
                                    🟢 {activeBilliard + activeCafe} Aktif
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto mt-4 lg:mt-0 relative">
                            {hasPermission('TABLE_CREATE') && (
                                <button onClick={() => setModalMode('choose')}
                                    className="bg-white text-slate-800 px-6 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-black/20 active:scale-95 text-xs hover:shadow-xl w-full sm:w-auto">
                                    <Plus className="w-4 h-4" /> TAMBAH MEJA
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Meja Billiard', value: sortedBilliardTables.length, icon: '🎱', gradient: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-700' },
                        { label: 'Billiard Aktif', value: activeBilliard, icon: '🟢', gradient: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700' },
                        { label: 'Meja Cafe', value: sortedCafeTables.length, icon: '☕', gradient: 'from-amber-500 to-orange-500', light: 'bg-amber-50', text: 'text-amber-700' },
                        { label: 'Cafe Aktif', value: activeCafe, icon: '🔴', gradient: 'from-rose-500 to-rose-600', light: 'bg-rose-50', text: 'text-rose-700' },
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

                {/* ════════════════ BILLIARD TABLES SECTION ════════════════ */}
                <section>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <Server className="w-4 h-4" />
                        </div>
                        <h2 className="text-xl font-black text-slate-800">Meja Billiard & PlayStation</h2>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">{sortedBilliardTables.length} station</span>
                    </div>

                    {loadingBilliard ? (
                        <div className="p-16 text-center animate-pulse bg-white rounded-2xl border border-slate-100">
                            <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-3" />
                            <div className="h-3 bg-slate-200 rounded max-w-[180px] mx-auto" />
                        </div>
                    ) : (billiardTables || []).length === 0 ? (
                        <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 border-dashed">
                            <Server className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                            <p className="font-bold text-slate-500">Belum ada meja billiard</p>
                            {hasPermission('TABLE_CREATE') && (
                                <button onClick={openAddBilliard} className="mt-3 text-sm text-indigo-600 font-bold hover:underline">+ Tambah Sekarang</button>
                            )}
                        </div>
                    ) : (
                        // ── Group by Floor ──────────────────────────────────────
                        <div className="space-y-8">
                            {[1, 2, 3, 4].map(floor => {
                                const floorTables = sortedBilliardTables.filter(t => (t.floorNumber ?? 1) === floor);
                                if (floorTables.length === 0) return null;
                                return (
                                    <div key={floor}>
                                        {/* Floor Header */}
                                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                                <Building2 className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lantai</p>
                                                <h3 className="text-base font-black text-slate-800 leading-tight">Lantai {floor}</h3>
                                            </div>
                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full ml-1">{floorTables.length} meja</span>
                                            <span className="text-xs font-bold text-emerald-600">{floorTables.filter(t => t.status === 'in_use').length} aktif</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                            {floorTables.map((table) => (
                                                <div key={table.id} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-3px] transition-all duration-300 flex flex-col overflow-hidden">
                                                    {/* Status strip with floor color */}
                                                    <div className={`h-1.5 w-full ${{
                                                        available: 'bg-emerald-500',
                                                        in_use: 'bg-indigo-600',
                                                        warning: 'bg-amber-500',
                                                        waiting_payment: 'bg-rose-500',
                                                        maintenance: 'bg-slate-400',
                                                    }[table.status] || 'bg-slate-200'}`} />

                                                    <div className="p-5 flex-1 flex flex-col">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div>
                                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${categoriesData?.find(c => c.id === table.categoryId)?.name?.toLowerCase().includes('vip') ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                                                        {categoriesData?.find(c => c.id === table.categoryId)?.name || 'NO CATEGORY'}
                                                                    </span>
                                                                    {table.hardwareType === 'ESPNOW_NODE' && table.stationType !== 'PLAYSTATION' && (
                                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-violet-100 text-violet-700 border border-violet-200">
                                                                            <Signal className="w-2.5 h-2.5" /> ESP-NOW
                                                                        </span>
                                                                    )}
                                                                    {table.stationType === 'PLAYSTATION' && (
                                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-700 border border-blue-200">
                                                                            <Server className="w-2.5 h-2.5" /> PS
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <h4 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{table.tableName}</h4>
                                                            </div>
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${{
                                                                    available: 'bg-emerald-50', in_use: 'bg-indigo-50', warning: 'bg-amber-50',
                                                                    waiting_payment: 'bg-rose-50', maintenance: 'bg-slate-100',
                                                                }[table.status]}`}>
                                                                    <div className={`w-2.5 h-2.5 rounded-full ${{
                                                                        available: 'bg-emerald-500', in_use: 'bg-indigo-600', warning: 'bg-amber-500',
                                                                        waiting_payment: 'bg-rose-500', maintenance: 'bg-slate-400',
                                                                    }[table.status]} ${table.status === 'in_use' ? 'animate-pulse' : ''}`} />
                                                                </div>
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase">{table.status.replace('_', ' ')}</span>
                                                            </div>
                                                        </div>
                                                        <div className="mt-auto space-y-3 pt-4">
                                                            <div className="flex items-center justify-between text-xs text-slate-500">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Wifi className="w-3.5 h-3.5 text-slate-300" />
                                                                    <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{table.stationType === 'PLAYSTATION' ? (table.ipAddress || 'NO IP') : (table.macAddress ? table.macAddress.slice(-8) : 'AUTO')}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <Power className={`w-3.5 h-3.5 ${table.stationType === 'PLAYSTATION' ? 'text-blue-500' : table.isLightOn ? 'text-emerald-500' : 'text-rose-500'}`} />
                                                                    <span className={`font-bold ${table.stationType === 'PLAYSTATION' ? 'text-blue-600' : table.isLightOn ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                                        {table.stationType === 'PLAYSTATION' ? 'TV CLIENT' : table.isLightOn ? 'LAMPU HIDUP' : 'LAMPU MATI'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between text-[10px] font-bold">
                                                                <span className="text-slate-400">Status Ping ESP32:</span>
                                                                <span className={table.lastPingStatus === 'online' ? 'text-emerald-600' : table.lastPingStatus === 'offline' ? 'text-rose-600' : table.lastPingStatus === 'checking' ? 'text-amber-500 animate-pulse' : 'text-slate-400'}>
                                                                    {table.lastPingStatus === 'checking' ? 'Mengecek...' : table.lastPingStatus === 'online' ? 'ONLINE' : table.lastPingStatus === 'offline' ? 'OFFLINE' : 'Belum dicek'}
                                                                </span>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                                                                <button onClick={() => handleToggleLight(table.id, !table.isLightOn)} className={`py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-colors flex items-center justify-center gap-1 border ${table.isLightOn ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:border-rose-300' : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300'}`}>
                                                                    <Power className="w-3 h-3" /> {table.isLightOn ? 'MATIKAN' : 'NYALAKAN'}
                                                                </button>
                                                                <button onClick={() => handlePing(table.id)} className="py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase bg-slate-50 border border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-colors flex items-center justify-center gap-1">
                                                                    <RefreshCw className={`w-3 h-3 ${table.lastPingStatus === 'checking' ? 'animate-spin' : ''}`} /> PING
                                                                </button>
                                                            </div>

                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-50">
                                                                {hasPermission('TABLE_EDIT') && (
                                                                    <button onClick={() => handleEditBilliard(table)} className="col-span-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
                                                                        <Edit2 className="w-3.5 h-3.5" /> Konfigurasi
                                                                    </button>
                                                                )}
                                                                {hasPermission('TABLE_DELETE') && (
                                                                    <button onClick={() => handleDeleteBilliard(table.id)} className="col-span-1 py-2 rounded-lg text-xs bg-white border border-slate-200 text-slate-400 hover:border-rose-500 hover:text-rose-500 hover:bg-rose-50 transition-colors flex items-center justify-center">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Meja tanpa floor (floorNumber null) */}
                            {sortedBilliardTables.filter(t => !t.floorNumber).length > 0 && (
                                <div>
                                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-dashed border-slate-200">
                                        <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center">
                                            <Building2 className="w-4 h-4 text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum dikonfigurasi</p>
                                            <h3 className="text-base font-black text-slate-600 leading-tight">Lantai tidak diketahui</h3>
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{sortedBilliardTables.filter(t => !t.floorNumber).length} meja</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                        {sortedBilliardTables.filter(t => !t.floorNumber).map((table) => (
                                            <div key={table.id} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-3px] transition-all duration-300 flex flex-col overflow-hidden opacity-80">
                                                <div className="h-1.5 w-full bg-slate-300" />
                                                <div className="p-5 flex-1 flex flex-col">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase mb-1.5 ${categoriesData?.find(c => c.id === table.categoryId)?.name?.toLowerCase().includes('vip') ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{categoriesData?.find(c => c.id === table.categoryId)?.name || 'NO CATEGORY'}</span>
                                                            <h4 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{table.tableName}</h4>
                                                        </div>
                                                    </div>
                                                    <div className="mt-auto pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-slate-50">
                                                        {hasPermission('TABLE_EDIT') && (
                                                            <button onClick={() => handleEditBilliard(table)} className="col-span-3 py-2 rounded-lg text-xs font-bold bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors flex items-center justify-center gap-2">
                                                                <Edit2 className="w-3.5 h-3.5" /> Set Lantai
                                                            </button>
                                                        )}
                                                        {hasPermission('TABLE_DELETE') && (
                                                            <button onClick={() => handleDeleteBilliard(table.id)} className="col-span-1 py-2 rounded-lg text-xs bg-white border border-slate-200 text-slate-400 hover:border-rose-500 hover:text-rose-500 hover:bg-rose-50 transition-colors flex items-center justify-center">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* ════════════════ CAFE TABLES SECTION ════════════════ */}
                <section>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                            <Coffee className="w-4 h-4" />
                        </div>
                        <h2 className="text-xl font-black text-slate-800">Meja Cafe</h2>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">{sortedCafeTables.length} meja</span>
                    </div>

                    {loadingCafe ? (
                        <div className="p-16 text-center animate-pulse bg-white rounded-2xl border border-slate-100">
                            <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-3" />
                            <div className="h-3 bg-slate-200 rounded max-w-[180px] mx-auto" />
                        </div>
                    ) : (cafeTables || []).length === 0 ? (
                        <div className="p-16 text-center bg-white rounded-2xl border border-amber-100 border-dashed">
                            <Coffee className="w-10 h-10 text-amber-200 mx-auto mb-3" />
                            <p className="font-bold text-slate-500">Belum ada meja cafe</p>
                            <p className="text-sm text-slate-400 mt-1">Tambah meja cafe agar bisa digunakan di Dashboard Cafe</p>
                            {hasPermission('TABLE_CREATE') && (
                                <button onClick={openAddCafe} className="mt-3 text-sm text-amber-600 font-bold hover:underline">+ Tambah Meja Cafe</button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {sortedCafeTables.map((table) => {
                                const isOccupied = table.status === 'occupied';
                                return (
                                    <div key={table.id} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-3px] transition-all duration-300 flex flex-col overflow-hidden">
                                        {/* Status strip */}
                                        <div className={`h-1.5 w-full ${isOccupied ? 'bg-amber-500' : 'bg-emerald-500'}`} />

                                        <div className="p-5 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase mb-1.5 bg-amber-100 text-amber-700">
                                                        CAFE
                                                    </span>
                                                    <h4 className="text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                                                        {table.tableName}
                                                    </h4>
                                                </div>
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isOccupied ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                                                        <div className={`w-2.5 h-2.5 rounded-full ${isOccupied ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{isOccupied ? 'OCCUPIED' : 'AVAILABLE'}</span>
                                                </div>
                                            </div>

                                            <div className="mt-auto space-y-3 pt-4">
                                                {table.capacity && (
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <span className="font-bold">Kapasitas:</span>
                                                        <span className="font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{table.capacity} kursi</span>
                                                    </div>
                                                )}
                                                {table.currentCustomer && (
                                                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100">
                                                        <span className="font-bold">Tamu:</span>
                                                        <span className="truncate">{table.currentCustomer}</span>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-50">
                                                    {hasPermission('TABLE_EDIT') && (
                                                        <button
                                                            onClick={() => handleEditCafe(table)}
                                                            disabled={isOccupied}
                                                            className="col-span-3 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:border-amber-500 hover:text-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" /> Edit
                                                        </button>
                                                    )}
                                                    {hasPermission('TABLE_DELETE') && (
                                                        <button
                                                            onClick={() => handleDeleteCafe(table.id)}
                                                            disabled={isOccupied}
                                                            className="col-span-1 py-2 rounded-lg text-xs bg-white border border-slate-200 text-slate-400 hover:border-rose-500 hover:text-rose-500 hover:bg-rose-50 transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                                {isOccupied && (
                                                    <p className="text-[10px] text-amber-600 font-bold text-center">Tutup sesi untuk mengedit/hapus</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            {/* ════════════════ MODALS ════════════════ */}

            {modalMode && (
                    <div className="fixed inset-0 bg-slate-900/60 z-[1000] backdrop-blur-sm flex items-center justify-center p-4 lg:p-0 animate-in fade-in duration-300" onClick={handleCloseModal}>
                        {/* ── Type Chooser ── */}
                        {modalMode === 'choose' && (
                            <div className="relative bg-white rounded-[2rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                                <div className="p-6 lg:p-8 lg:px-10">
                                    <div className="flex justify-between items-center mb-8">
                                        <div>
                                            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Tambah Meja Baru</h2>
                                            <p className="text-sm font-semibold text-slate-500 mt-2">Pilih jenis meja yang ingin ditambahkan:</p>
                                        </div>
                                        <button onClick={handleCloseModal} className="p-2 sm:p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors shrink-0">
                                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    {/* Billiard choice */}
                                    <button
                                        onClick={openAddBilliard}
                                        className="group h-full flex flex-col items-center justify-start gap-4 p-5 sm:p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all active:scale-95"
                                    >
                                        <div className="w-16 h-16 shrink-0 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 group-hover:scale-110 transition-all duration-300">
                                            <Server className="w-8 h-8" />
                                        </div>
                                        <div className="text-center flex flex-col items-center flex-1">
                                            <div className="font-black text-slate-800 group-hover:text-indigo-700 transition-colors">Billiard</div>
                                            <div className="text-xs text-slate-500 mt-2 leading-relaxed">Meja billiard dengan kontrol IoT otomatis</div>
                                        </div>
                                    </button>

                                    {/* PlayStation choice */}
                                    <button
                                        onClick={openAddPlaystation}
                                        className="group h-full flex flex-col items-center justify-start gap-4 p-5 sm:p-6 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50/50 transition-all active:scale-95"
                                    >
                                        <div className="w-16 h-16 shrink-0 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 group-hover:scale-110 transition-all duration-300">
                                            <Server className="w-8 h-8" />
                                        </div>
                                        <div className="text-center flex flex-col items-center flex-1">
                                            <div className="font-black text-slate-800 group-hover:text-blue-700 transition-colors">PlayStation</div>
                                            <div className="text-[11px] text-slate-500 mt-2 leading-relaxed">Sewa console dengan kontrol TV HTTP</div>
                                        </div>
                                    </button>

                                    {/* Cafe choice */}
                                    <button
                                        onClick={openAddCafe}
                                        className="group h-full flex flex-col items-center justify-start gap-4 p-5 sm:p-6 rounded-2xl border-2 border-slate-100 hover:border-amber-500 hover:bg-amber-50/50 transition-all active:scale-95"
                                    >
                                        <div className="w-16 h-16 shrink-0 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 group-hover:scale-110 transition-all duration-300">
                                            <Coffee className="w-8 h-8" />
                                        </div>
                                        <div className="text-center flex flex-col items-center flex-1">
                                            <div className="font-black text-slate-800 group-hover:text-amber-700 transition-colors">Cafe & Resto</div>
                                            <div className="text-[11px] text-slate-500 mt-2 leading-relaxed">Meja standar untuk area F&B (non-IoT)</div>
                                        </div>
                                    </button>
                                </div>
                                </div>
                            </div>
                        )}

                        {/* ── Billiard Form ── */}
                        {modalMode === 'billiard-form' && (
                            <div className="relative z-10 bg-white rounded-[2rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] w-full max-w-5xl 2xl:max-w-6xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in fade-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Server className={`w-5 h-5 ${billiardForm.stationType === 'PLAYSTATION' ? 'text-blue-600' : 'text-indigo-600'}`} />
                                            <span className={`text-xs font-bold ${billiardForm.stationType === 'PLAYSTATION' ? 'text-blue-600' : 'text-indigo-600'} uppercase tracking-widest`}>{billiardForm.stationType === 'PLAYSTATION' ? 'Meja PlayStation' : 'Meja Billiard'}</span>
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-800">
                                            {editingBilliard ? 'Edit Konfigurasi Meja' : (billiardForm.stationType === 'PLAYSTATION' ? 'Tambah PlayStation' : 'Tambah Meja Billiard')}
                                        </h2>
                                        {/* ✅ v7.0: Tampilkan DB ID (read-only) agar tidak bingung dengan Mesa ID */}
                                        {editingBilliard && (
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DB ID (Auto):</span>
                                                <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">#{editingBilliard.id}</span>
                                                <span className="text-[10px] text-slate-400">— bukan Mesa ID ESP-NOW</span>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={handleCloseModal} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="overflow-y-auto flex-1 bg-slate-50/50">
                                    <form onSubmit={handleSubmitBilliard} className="p-8">
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                            {/* Column 1: Identity */}
                                            <div className="lg:col-span-7 space-y-6">
                                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                            <Edit2 className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-slate-800">Identitas Meja</h3>
                                                            <p className="text-xs text-slate-500">Informasi dasar yang tampil di dashboard.</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-5">
                                                        <InputField
                                                            label="Nama Meja"
                                                            value={billiardForm.tableName}
                                                            savedValue={lastSavedBilliard?.tableName}
                                                            isEditing={!!editingBilliard}
                                                            onChange={(val) => { setBilliardForm(p => ({ ...p, tableName: val })); setHasUnsavedChanges(true); }}
                                                            required
                                                            placeholder="Contoh: Meja 01"
                                                        />

                                                        {/* ── Lantai Selector ── */}
                                                        <div>
                                                            <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                                                <Building2 className="w-4 h-4 text-indigo-500" />
                                                                Lantai Fisik
                                                            </label>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                                {[1, 2, 3, 4].map(fl => (
                                                                    <button
                                                                        key={fl}
                                                                        type="button"
                                                                        onClick={() => { setBilliardForm(p => ({ ...p, floorNumber: fl })); setHasUnsavedChanges(true); }}
                                                                        className={`py-3 rounded-xl border-2 font-black text-sm transition-all active:scale-95 ${
                                                                            billiardForm.floorNumber === fl
                                                                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                                                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                                                                        }`}
                                                                    >
                                                                        Lt {fl}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 mt-1.5">Lantai fisik tempat meja ini berada. Penting untuk routing Gateway ESP-NOW.</p>
                                                        </div>
                                                        
                                                        {/* ── Zona Produksi Selector ── */}
                                                        <div>
                                                            <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                                                <Zap className="w-4 h-4 text-amber-500" />
                                                                Zona Produksi (Routing Printer)
                                                            </label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {['', 'ZONE_A', 'ZONE_B', 'ZONE_C'].map(zone => (
                                                                    <button
                                                                        key={zone}
                                                                        type="button"
                                                                        onClick={() => { setBilliardForm(p => ({ ...p, productionZone: zone })); setHasUnsavedChanges(true); }}
                                                                        className={`px-4 py-2.5 rounded-xl border-2 font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 ${
                                                                            billiardForm.productionZone === zone
                                                                                ? 'border-amber-500 bg-amber-500 text-white shadow-lg shadow-amber-200'
                                                                                : 'border-slate-100 bg-white text-slate-500 hover:border-amber-300 hover:text-amber-600'
                                                                        }`}
                                                                    >
                                                                        {zone === '' ? 'DEFAULT (BROAD)' : zone.replace('_', ' ')}
                                                                    </button>
                                                                ))}
                                                                <div className="flex-1 min-w-[120px]">
                                                                    <input 
                                                                        type="text"
                                                                        placeholder="Custom Zone..."
                                                                        value={['', 'ZONE_A', 'ZONE_B', 'ZONE_C'].includes(billiardForm.productionZone) ? '' : billiardForm.productionZone}
                                                                        onChange={(e) => { setBilliardForm(p => ({ ...p, productionZone: e.target.value.toUpperCase().replace(/\s+/g, '_') })); setHasUnsavedChanges(true); }}
                                                                        className="w-full px-4 py-2 bg-white border-2 border-slate-100 rounded-xl text-[10px] font-bold focus:border-amber-500 outline-none transition-all"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 mt-1.5 italic">Gunakan Zona jika 1 lantai memiliki beberapa dapur/bar. Meja dengan zona yang sama akan dikirim ke printer yang sama.</p>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-bold text-slate-700 mb-2">Kategori & Tarif</label>
                                                            {loadingCategories ? (
                                                                <div className="animate-pulse bg-slate-100 h-24 rounded-xl"></div>
                                                            ) : (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                    {(categoriesData || [])
                                                                        .filter(c => c.assetType === billiardForm.stationType)
                                                                        .map(cat => (
                                                                        <div
                                                                            key={cat.id}
                                                                            onClick={() => { setBilliardForm(p => ({ ...p, categoryId: cat.id })); setHasUnsavedChanges(true); }}
                                                                            className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${billiardForm.categoryId === cat.id
                                                                                ? (cat.name.toLowerCase().includes('vip') ? 'border-amber-500 bg-amber-50/50' : 'border-indigo-600 bg-indigo-50/50')
                                                                                : 'border-slate-100 bg-white hover:border-slate-200'
                                                                                }`}
                                                                        >
                                                                            <div className="flex items-start justify-between mb-2">
                                                                                <span className={`font-black tracking-wider text-xs px-2 py-0.5 rounded ${billiardForm.categoryId === cat.id
                                                                                    ? (cat.name.toLowerCase().includes('vip') ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white')
                                                                                    : 'bg-slate-100 text-slate-500'}`}>{cat.name}</span>
                                                                                {billiardForm.categoryId === cat.id && <div className={`w-4 h-4 rounded-full ${cat.name.toLowerCase().includes('vip') ? 'bg-amber-500' : 'bg-indigo-600'} flex items-center justify-center`}><div className="w-1.5 h-1.5 bg-white rounded-full" /></div>}
                                                                            </div>
                                                                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                                                {cat.description || 'Meja dengan tarif sesuai kategori.'}
                                                                            </p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-bold text-slate-700 mb-2">Status Operasional</label>
                                                            <div className="relative">
                                                                <select
                                                                    value={billiardForm.status}
                                                                    onChange={(e) => { setBilliardForm(p => ({ ...p, status: e.target.value })); setHasUnsavedChanges(true); }}
                                                                    className="w-full p-3.5 appearance-none bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    disabled={editingBilliard?.status === 'in_use' || editingBilliard?.status === 'waiting_payment' || editingBilliard?.status === 'warning'}
                                                                >
                                                                    <option value="available">AVAILABLE — Siap Digunakan</option>
                                                                    <option value="maintenance">MAINTENANCE — Sedang Perbaikan</option>
                                                                    <option value="in_use">IN USE — Sedang Aktif</option>
                                                                    <option value="waiting_payment">WAITING PAYMENT — Menunggu Bayar</option>
                                                                </select>
                                                            </div>
                                                            {(editingBilliard?.status === 'in_use' || editingBilliard?.status === 'waiting_payment' || editingBilliard?.status === 'warning') && (
                                                                <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                                                                    <Shield className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                                                    <p className="text-xs text-amber-600 leading-relaxed">Status dikunci saat meja sedang aktif untuk menjaga integritas data transaksi.</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Column 2: IoT or TV Network */}
                                            <div className="lg:col-span-5 space-y-6">
                                                {billiardForm.stationType === 'PLAYSTATION' ? (
                                                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                                                        <div className="flex items-center gap-3 mb-5 relative z-10">
                                                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 border border-slate-700">
                                                                <Wifi className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-white">Jaringan TV</h3>
                                                                <p className="text-xs text-slate-400">Pengaturan IP Address Android TV.</p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="space-y-5 relative z-10">
                                                            <InputField
                                                                label="IP Address TV"
                                                                value={billiardForm.ipAddress}
                                                                savedValue={lastSavedBilliard?.ipAddress}
                                                                isEditing={!!editingBilliard}
                                                                onChange={(val) => { setBilliardForm(p => ({ ...p, ipAddress: val })); setHasUnsavedChanges(true); }}
                                                                placeholder="Contoh: 192.168.1.100"
                                                                suffix={<Wifi className="w-4 h-4" />}
                                                                className="bg-slate-800 text-blue-300 border-slate-700"
                                                                helper="Masukkan IP Address statis milik Android TV yang telah diinstal aplikasi Antygraviti TV Client."
                                                            />
                                                            
                                                            <div className="mt-4 p-3 rounded-xl border bg-blue-500/5 border-blue-500/20 text-blue-300 text-[10px] leading-relaxed">
                                                                <span className="font-black">🔌 TV API Mode:</span> Backend akan menembak endpoint HTTP <code>GET http://{billiardForm.ipAddress || '{ip}'}:1717/text</code> dan <code>/sleep</code> ke IP tersebut saat status meja berubah.
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                                                    <div className="flex items-center gap-3 mb-5 relative z-10">
                                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-violet-400 border border-slate-700">
                                                            <Wifi className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-white">Konfigurasi IoT</h3>
                                                            <p className="text-xs text-slate-400">Pengaturan controller lampu meja.</p>
                                                        </div>
                                                    </div>

                                                    {/* ── Mode Hardware Selector ── */}
                                                    <div className="relative z-10 mb-5">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Mode Hardware Controller</p>
                                                        <div className="grid grid-cols-1 gap-2.5">

                                                            {/* ✅ ESPNOW_NODE — Rekomendasi Utama */}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setBilliardForm(p => ({ ...p, hardwareType: 'ESPNOW_NODE', relayPin: 4 }));
                                                                    setHasUnsavedChanges(true);
                                                                }}
                                                                className={`p-3 rounded-xl border-2 text-left transition-all active:scale-95 relative ${
                                                                    billiardForm.hardwareType === 'ESPNOW_NODE'
                                                                        ? 'border-violet-500 bg-violet-500/10'
                                                                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                                                }`}
                                                            >
                                                                {billiardForm.hardwareType === 'ESPNOW_NODE' && (
                                                                    <span className="absolute top-2 right-2 text-[8px] font-black bg-violet-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">★ Hybrid</span>
                                                                )}
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                                        billiardForm.hardwareType === 'ESPNOW_NODE' ? 'border-violet-400' : 'border-slate-600'
                                                                    }`}>
                                                                        {billiardForm.hardwareType === 'ESPNOW_NODE' && <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
                                                                    </div>
                                                                    <span className={`text-[10px] font-black tracking-widest uppercase ${
                                                                        billiardForm.hardwareType === 'ESPNOW_NODE' ? 'text-violet-400' : 'text-slate-500'
                                                                    }`}>ESP-NOW Node (Prajurit)</span>
                                                                </div>
                                                                <p className="text-[9px] text-slate-400 leading-relaxed pl-5">Topologi Hybrid. Tidak connect WiFi — terima perintah dari Gateway via ESP-NOW. 1 Gateway kontrol 100+ meja.</p>
                                                            </button>

                                                            <div className="grid grid-cols-2 gap-2.5">
                                                                {/* MOC3062 Option */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setBilliardForm(p => ({ ...p, hardwareType: 'MOC3062', relayPin: p.hardwareType === 'PCF8575' ? 4 : p.relayPin }));
                                                                        setHasUnsavedChanges(true);
                                                                    }}
                                                                    className={`p-3 rounded-xl border-2 text-left transition-all active:scale-95 ${
                                                                        billiardForm.hardwareType === 'MOC3062'
                                                                            ? 'border-emerald-500 bg-emerald-500/10'
                                                                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2 mb-1.5">
                                                                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                                            billiardForm.hardwareType === 'MOC3062' ? 'border-emerald-400' : 'border-slate-600'
                                                                        }`}>
                                                                            {billiardForm.hardwareType === 'MOC3062' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                                                        </div>
                                                                        <span className={`text-[10px] font-black tracking-widest uppercase ${
                                                                            billiardForm.hardwareType === 'MOC3062' ? 'text-emerald-400' : 'text-slate-500'
                                                                        }`}>MOC3062</span>
                                                                    </div>
                                                                    <p className="text-[9px] text-slate-500 leading-relaxed pl-5">WiFi langsung. 1 ESP32 = 1 meja, GPIO ke TRIAC.</p>
                                                                </button>

                                                                {/* PCF8575 Option */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setBilliardForm(p => ({ ...p, hardwareType: 'PCF8575', relayPin: p.hardwareType === 'MOC3062' ? 0 : p.relayPin }));
                                                                        setHasUnsavedChanges(true);
                                                                    }}
                                                                    className={`p-3 rounded-xl border-2 text-left transition-all active:scale-95 ${
                                                                        billiardForm.hardwareType === 'PCF8575'
                                                                            ? 'border-cyan-500 bg-cyan-500/10'
                                                                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2 mb-1.5">
                                                                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                                            billiardForm.hardwareType === 'PCF8575' ? 'border-cyan-400' : 'border-slate-600'
                                                                        }`}>
                                                                            {billiardForm.hardwareType === 'PCF8575' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                                                                        </div>
                                                                        <span className={`text-[10px] font-black tracking-widest uppercase ${
                                                                            billiardForm.hardwareType === 'PCF8575' ? 'text-cyan-400' : 'text-slate-500'
                                                                        }`}>PCF8575</span>
                                                                    </div>
                                                                    <p className="text-[9px] text-slate-500 leading-relaxed pl-5">Panel box. 1 ESP32 via I2C kontrol 16 relay.</p>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Mode Info Banner */}
                                                        <div className={`mt-3 p-3 rounded-xl border text-[10px] leading-relaxed ${
                                                            billiardForm.hardwareType === 'ESPNOW_NODE'
                                                                ? 'bg-violet-500/5 border-violet-500/20 text-violet-300'
                                                                : billiardForm.hardwareType === 'MOC3062'
                                                                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                                                                    : 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400'
                                                        }`}>
                                                            {billiardForm.hardwareType === 'ESPNOW_NODE' ? (
                                                                <><span className="font-black">📡 ESP-NOW Node Mode:</span> Meja (Prajurit) tidak terhubung ke WiFi. MAC di bawah adalah <strong>MAC ESP32 Gateway</strong> (Komandan), bukan MAC meja ini. Masukkan <strong>ID Meja</strong> sebagai Relay PIN (1–100).</>
                                                            ) : billiardForm.hardwareType === 'MOC3062' ? (
                                                                <><span className="font-black">⚡ MOC3062 Mode:</span> Modul dipasang langsung di jalur 220V. PIN Control = GPIO ESP32 yang terhubung ke MOC3062 (contoh: 4 = D4).</>
                                                            ) : (
                                                                <><span className="font-black">🔌 PCF8575 Mode:</span> Panel box terpusat. PIN = channel relay PCF8575 (0–15, sesuai posisi kabel).</>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-5 relative z-10">
                                                        {/* MAC Address — konteks beda tergantung mode */}
                                                        <InputField
                                                            label={
                                                                billiardForm.hardwareType === 'ESPNOW_NODE'
                                                                    ? 'MAC Address Prajurit (Unique ID)'
                                                                    : 'MAC Address ESP32'
                                                            }
                                                            value={billiardForm.macAddress}
                                                            savedValue={lastSavedBilliard?.macAddress}
                                                            isEditing={!!editingBilliard}
                                                            onChange={(val) => {
                                                                const normalized = val.replace(/[:\-]/g, '').toUpperCase();
                                                                setBilliardForm(p => ({ ...p, macAddress: normalized }));
                                                                setHasUnsavedChanges(true);
                                                            }}
                                                            placeholder={
                                                                billiardForm.hardwareType === 'ESPNOW_NODE'
                                                                    ? 'MAC Prajurit (dari Serial Monitor Prajurit)'
                                                                    : billiardForm.hardwareType === 'MOC3062'
                                                                        ? 'Wajib (dari Serial Monitor ESP)'
                                                                        : 'MAC Address ESP32 controller'
                                                            }
                                                            suffix={<Wifi className="w-4 h-4" />}
                                                            className="bg-slate-800 text-indigo-300 border-slate-700"
                                                            helper={
                                                                billiardForm.hardwareType === 'ESPNOW_NODE'
                                                                    ? '📡 Salin MAC PRAJURIT (Node) dari Serial Monitor saat boot. Komandan akan mengenali identitas unik ini.'
                                                                    : billiardForm.hardwareType === 'MOC3062'
                                                                        ? 'Salin dari Serial Monitor saat boot: "MAC Address : XXXXXXXXXXXX"'
                                                                        : 'MAC Address ESP32 yang terpasang di panel PCF8575. Satu MAC bisa mengontrol banyak meja.'
                                                            }
                                                        />

                                                        {/* Relay PIN / Mesa ID */}
                                                        <InputField
                                                            label={
                                                                billiardForm.hardwareType === 'ESPNOW_NODE'
                                                                    ? 'ID Meja (mesaId, 1–100)'
                                                                    : billiardForm.hardwareType === 'MOC3062'
                                                                        ? 'PIN Control MOC (GPIO ESP32)'
                                                                        : 'Relay PIN (Channel PCF8575, 0–15)'
                                                            }
                                                            type="number"
                                                            value={billiardForm.relayPin}
                                                            savedValue={lastSavedBilliard?.relayPin}
                                                            isEditing={!!editingBilliard}
                                                            onChange={(val) => { setBilliardForm(p => ({ ...p, relayPin: Number(val) })); setHasUnsavedChanges(true); }}
                                                            suffix={<Power className="w-4 h-4" />}
                                                            className="bg-slate-800 text-indigo-300 border-slate-700"
                                                            helper={
                                                                billiardForm.hardwareType === 'ESPNOW_NODE'
                                                                    ? `ID unik meja di jaringan ESP-NOW (1–100). Isi sesuai "Mesa ID" di portal Prajurit. ⚠️ Ini BUKAN DB ID (DB ID = ${editingBilliard?.id ?? '?'}).`
                                                                    : billiardForm.hardwareType === 'MOC3062'
                                                                        ? `Nomor GPIO ESP32 yang terhubung ke MOC3062 (D4=4, D5=5, D6=6, dll). Default: 4`
                                                                        : 'Channel relay pada PCF8575 (0–15). Sesuaikan dengan posisi kabel lampu.'
                                                            }
                                                        />

                                                        {/* Gateway MAC — only for ESPNOW_NODE */}
                                                        {billiardForm.hardwareType === 'ESPNOW_NODE' && (
                                                            <InputField
                                                                label="MAC Address Komandan (Hub Routing)"
                                                                value={billiardForm.espnowGatewayMac}
                                                                savedValue={(lastSavedBilliard as any)?.espnowGatewayMac}
                                                                isEditing={!!editingBilliard}
                                                                onChange={(val) => {
                                                                    const normalized = val.replace(/[:\-]/g, '').toUpperCase();
                                                                    setBilliardForm(p => ({ ...p, espnowGatewayMac: normalized }));
                                                                    setHasUnsavedChanges(true);
                                                                }}
                                                                placeholder="MAC Gateway Lantai (sama dengan MAC di atas)"
                                                                suffix={<Signal className="w-4 h-4" />}
                                                                className="bg-slate-800 text-violet-300 border-slate-700"
                                                                helper="Masukkan MAC Gateway (Komandan) yang mengontrol meja ini. Digunakan server untuk routing perintah ON/OFF."
                                                            />
                                                        )}

                                                        {/* Preview Topic / Alur Sinyal */}
                                                        <div className="pt-4 border-t border-slate-800">
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                                                                {billiardForm.hardwareType === 'ESPNOW_NODE' ? 'Alur Sinyal' : 'Preview MQTT Topic'}
                                                            </p>
                                                            {billiardForm.hardwareType === 'ESPNOW_NODE' ? (
                                                                <div className="space-y-1.5">
                                                                    <div className="bg-black/30 p-2.5 rounded-lg border border-slate-800">
                                                                        <p className="text-[9px] text-slate-500 mb-1">① Server → Gateway</p>
                                                                        <code className="text-[10px] font-mono text-violet-400 break-all">
                                                                            billiard/meja/<span className="text-white font-bold">{billiardForm.relayPin || '{id}'}</span>/control
                                                                        </code>
                                                                    </div>
                                                                    <div className="flex items-center justify-center text-slate-600 text-[10px] font-bold">↓ ESP-NOW (Instan)</div>
                                                                    <div className="bg-black/30 p-2.5 rounded-lg border border-slate-800">
                                                                        <p className="text-[9px] text-slate-500 mb-1">② Gateway → Prajurit (ID {billiardForm.relayPin || '?'})</p>
                                                                        <code className="text-[10px] font-mono text-violet-300">MAC: {billiardForm.macAddress ? `${billiardForm.macAddress.slice(0,6)}...` : '{Gateway MAC}'}</code>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="bg-black/30 p-3 rounded-lg border border-slate-800">
                                                                    <code className="text-xs font-mono text-emerald-400 break-all">
                                                                        billiard/table/<span className="text-white font-bold">{billiardForm.macAddress || '{mac}'}</span>/light/set
                                                                    </code>
                                                                </div>
                                                            )}
                                                            <div className="mt-2 flex items-center gap-2">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${
                                                                    billiardForm.hardwareType === 'ESPNOW_NODE' ? 'bg-violet-400' :
                                                                    billiardForm.hardwareType === 'MOC3062' ? 'bg-emerald-400' : 'bg-cyan-400'
                                                                }`} />
                                                                <span className="text-[9px] text-slate-500 font-bold">
                                                                    {billiardForm.hardwareType === 'ESPNOW_NODE'
                                                                        ? `Hybrid MQTT + ESP-NOW — ID Meja ${billiardForm.relayPin || '?'}`
                                                                        : billiardForm.hardwareType === 'MOC3062'
                                                                            ? 'MOC3062 + TRIAC BTA16'
                                                                            : 'PCF8575 I2C Expander'
                                                                    }
                                                                    {billiardForm.hardwareType !== 'ESPNOW_NODE' && ` — PIN ${billiardForm.relayPin}`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
                                            <button type="button" onClick={handleCloseModal} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm">
                                                Batal
                                            </button>
                                            <button type="submit" className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 transition-all text-sm flex items-center gap-2">
                                                <Save className="w-4 h-4" />
                                                Simpan Konfigurasi
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* ── Cafe Form ── */}
                        {modalMode === 'cafe-form' && (
                            <div className="relative z-10 bg-white rounded-[2rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Coffee className="w-5 h-5 text-amber-600" />
                                            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Meja Cafe</span>
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-800">
                                            {editingCafe ? 'Edit Meja Cafe' : 'Tambah Meja Cafe'}
                                        </h2>
                                    </div>
                                    <button onClick={handleCloseModal} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmitCafe} className="p-8 space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            Nama Meja <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={cafeForm.tableName}
                                            onChange={e => { setCafeForm(p => ({ ...p, tableName: e.target.value })); setHasUnsavedChanges(true); }}
                                            placeholder="Contoh: Cafe Meja 1, Teras A"
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition-all"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            Kapasitas <span className="text-slate-400 font-normal">(opsional)</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={cafeForm.capacity}
                                            onChange={e => { setCafeForm(p => ({ ...p, capacity: e.target.value })); setHasUnsavedChanges(true); }}
                                            placeholder="Jumlah kursi, misal: 4"
                                            min={1}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                                        <Coffee className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-700 leading-relaxed font-medium">
                                            Meja cafe yang ditambahkan akan langsung tersedia di <strong>Dashboard Cafe</strong> untuk membuka sesi dan menerima pesanan.
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-end gap-3 pt-2">
                                        <button type="button" onClick={handleCloseModal} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm">
                                            Batal
                                        </button>
                                        <button type="submit" className="px-8 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 shadow-lg shadow-amber-200 active:scale-95 transition-all text-sm flex items-center gap-2">
                                            <Save className="w-4 h-4" />
                                            {editingCafe ? 'Simpan Perubahan' : 'Tambah Meja Cafe'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
            )}
        </div>
    );
}
