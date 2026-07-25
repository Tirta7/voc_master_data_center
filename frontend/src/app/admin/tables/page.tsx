'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAlert } from '@/components/ui/AlertProvider';
import { Plus, Trash2, Edit2, Server, Power, RefreshCw, X, Save, Shield, Wifi, Coffee, ShieldOff, Activity, Zap, Sun, ChevronRight, ChevronLeft, FastForward, Shuffle, Loader, Hash, Building2, Signal, Gamepad2, Layers, Sparkles, ChevronDown, Check, AlertTriangle, Copy, ArrowDown } from 'lucide-react';
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
type ModalMode = 'choose' | 'billiard-form' | 'cafe-form' | 'bulk-config';

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

    // ── Bulk Config State ──────────────────────────────────────────────────────
    type BulkRow = {
        id: number;
        tableName: string;
        hardwareType: HardwareType;
        macAddress: string;
        relayPin: number | '';
        categoryId: number | '';
        floorNumber: number;
        espnowGatewayMac: string;
        productionZone: string;
        stationType: 'BILLIARD' | 'PLAYSTATION';
        status: string;
        dirty: boolean; // track which rows are changed
    };
    const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
    const [bulkSaving, setBulkSaving] = useState(false);
    const [bulkSkipped, setBulkSkipped] = useState<Array<{ id: number; reason: string }>>([]);
    const [generateForm, setGenerateForm] = useState({
        prefix: 'Meja',
        count: 10,
        startIndex: 1,
        hardwareType: 'ESPNOW_NODE' as HardwareType,
        categoryId: '' as number | '',
        floorNumber: 1,
        productionZone: '',
        macAddress: '',
        espnowGatewayMac: '',
        stationType: 'BILLIARD' as 'BILLIARD' | 'PLAYSTATION' | 'CAFE',
        autoPin: false,
    });
    const [generating, setGenerating] = useState(false);
    const [bulkPanel, setBulkPanel] = useState<'table' | 'generate'>('table');

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

    // ── Bulk Config Handlers ───────────────────────────────────────────────────

    const openBulkConfig = () => {
        const rows = sortedBilliardTables.map(t => ({
            id: t.id,
            tableName: t.tableName,
            hardwareType: (t.hardwareType as HardwareType) || 'ESPNOW_NODE',
            macAddress: t.macAddress || '',
            relayPin: (t.relayPin !== null && t.relayPin !== undefined ? t.relayPin : '') as number | '',
            categoryId: (t.categoryId !== null && t.categoryId !== undefined ? t.categoryId : '') as number | '',
            floorNumber: t.floorNumber || 1,
            espnowGatewayMac: (t as any).espnowGatewayMac || '',
            productionZone: t.productionZone || '',
            stationType: t.stationType || 'BILLIARD',
            status: t.status,
            dirty: false,
        }));
        setBulkRows(rows);
        setBulkSkipped([]);
        setBulkPanel('table');
        setModalMode('bulk-config');
    };

    const updateBulkRow = (id: number, field: string, value: any) => {
        setBulkRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value, dirty: true } : r));
    };

    const handleBulkSave = async () => {
        const dirtyRows = bulkRows.filter(r => r.dirty);
        if (dirtyRows.length === 0) {
            showAlert('Info', 'Tidak ada perubahan yang perlu disimpan.', { variant: 'warning' });
            return;
        }
        setBulkSaving(true);
        try {
            const updates = dirtyRows.map(r => ({
                id: r.id,
                hardwareType: r.hardwareType,
                macAddress: r.macAddress,
                relayPin: r.relayPin === '' ? null : Number(r.relayPin),
                categoryId: r.categoryId === '' ? null : Number(r.categoryId),
                floorNumber: r.floorNumber,
                espnowGatewayMac: r.espnowGatewayMac,
                productionZone: r.productionZone,
                stationType: r.stationType,
            }));
            const res = await axios.patch('/billiard/tables/bulk-update', { updates });
            const { updated, skipped } = res.data;
            setBulkSkipped(skipped || []);
            // Mark saved rows as not dirty
            const skippedIds = new Set((skipped || []).map((s: any) => s.id));
            setBulkRows(prev => prev.map(r => ({ ...r, dirty: skippedIds.has(r.id) ? r.dirty : false })));
            mutateBilliard();
            if (skipped?.length > 0) {
                showAlert('Sebagian Berhasil', `${updated} meja diperbarui. ${skipped.length} dilewati karena konflik atau sedang aktif.`, { variant: 'warning' });
            } else {
                showAlert('Berhasil', `${updated} meja berhasil diperbarui!`, { variant: 'success' });
            }
        } catch (err: any) {
            showAlert('Gagal', err.response?.data?.message || 'Terjadi kesalahan.', { variant: 'error' });
        } finally {
            setBulkSaving(false);
        }
    };

    const handleBulkGenerate = async () => {
        if (!generateForm.prefix.trim()) {
            showAlert('Validasi', 'Prefix nama meja wajib diisi.', { variant: 'warning' });
            return;
        }
        if (generateForm.count < 1 || generateForm.count > 200) {
            showAlert('Validasi', 'Jumlah meja harus antara 1 dan 200.', { variant: 'warning' });
            return;
        }
        setGenerating(true);
        try {
            let res;
            if (generateForm.stationType === 'CAFE') {
                res = await axios.post('/cafe-table/bulk-generate', {
                    count: generateForm.count,
                    prefix: generateForm.prefix,
                    startIndex: generateForm.startIndex,
                    capacity: 4
                });
                await mutateCafe();
                setBulkPanel('table');
            } else {
                res = await axios.post('/billiard/tables/bulk-generate', {
                    count: generateForm.count,
                    prefix: generateForm.prefix,
                    startIndex: generateForm.startIndex,
                    hardwareType: generateForm.hardwareType,
                    categoryId: generateForm.categoryId || undefined,
                    floorNumber: generateForm.floorNumber,
                    productionZone: generateForm.productionZone || undefined,
                    macAddress: generateForm.macAddress || undefined,
                    espnowGatewayMac: generateForm.espnowGatewayMac || undefined,
                    stationType: generateForm.stationType,
                    autoPin: generateForm.autoPin,
                });
                await mutateBilliard();
                // Refresh bulk rows with new tables
                const fresh = await axios.get('/billiard/tables');
                const freshSorted = [...(fresh.data || [])].sort((a: any, b: any) =>
                    a.tableName.localeCompare(b.tableName, undefined, { numeric: true, sensitivity: 'base' })
                );
                setBulkRows(freshSorted.map((t: any) => ({
                    id: t.id,
                    tableName: t.tableName,
                    hardwareType: t.hardwareType || 'ESPNOW_NODE',
                    macAddress: t.macAddress || '',
                    relayPin: t.relayPin ?? '',
                    categoryId: t.categoryId || '',
                    floorNumber: t.floorNumber || 1,
                    espnowGatewayMac: t.espnowGatewayMac || '',
                    productionZone: t.productionZone || '',
                    stationType: t.stationType || 'BILLIARD',
                    status: t.status,
                    dirty: false,
                })));
                setBulkPanel('table');
            }
            const { created, skipped } = res.data;
            if (skipped?.length > 0) {
                showAlert('Sebagian Berhasil', `${created} meja dibuat. ${skipped.length} nama sudah ada: ${skipped.slice(0,3).join(', ')}${skipped.length > 3 ? '...' : ''}`, { variant: 'warning' });
            } else {
                showAlert('Berhasil', `${created} meja berhasil dibuat!`, { variant: 'success' });
            }
        } catch (err: any) {
            showAlert('Gagal', err.response?.data?.message || 'Gagal generate meja.', { variant: 'error' });
        } finally {
            setGenerating(false);
        }
    };

    const applyMacToAll = (fromIndex: number) => {
        const baseRow = bulkRows[fromIndex];
        if (!baseRow?.macAddress) return;
        setBulkRows(prev => prev.map((r, i) => i >= fromIndex ? { ...r, macAddress: baseRow.macAddress, dirty: true } : r));
    };

    const autoPinFromRow = (fromIndex: number) => {
        const baseRow = bulkRows[fromIndex];
        const basePin = typeof baseRow.relayPin === 'number' ? baseRow.relayPin : 0;
        setBulkRows(prev => prev.map((r, i) => {
            if (i < fromIndex) return r;
            return { ...r, relayPin: basePin + (i - fromIndex), dirty: true };
        }));
    };

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
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5">
                                    <Gamepad2 className="w-4 h-4" /> {sortedBilliardTables.length} Billiard
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5">
                                    <Coffee className="w-4 h-4" /> {sortedCafeTables.length} Cafe
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5">
                                    <Activity className="w-4 h-4" /> {activeBilliard + activeCafe} Aktif
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto mt-4 lg:mt-0 relative">
                            {hasPermission('TABLE_BULK_CONFIG') && (
                                <button onClick={openBulkConfig}
                                    className="bg-white/15 backdrop-blur-sm border border-white/20 text-white px-5 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 text-xs hover:bg-white/25 w-full sm:w-auto">
                                    <Layers className="w-4 h-4" /> BULK CONFIG
                                </button>
                            )}
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
                        { label: 'Meja Billiard', value: sortedBilliardTables.length, icon: <Gamepad2 className="w-5 h-5 text-indigo-600" />, gradient: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-700' },
                        { label: 'Billiard Aktif', value: activeBilliard, icon: <Activity className="w-5 h-5 text-emerald-600" />, gradient: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700' },
                        { label: 'Meja Cafe', value: sortedCafeTables.length, icon: <Coffee className="w-5 h-5 text-amber-600" />, gradient: 'from-amber-500 to-orange-500', light: 'bg-amber-50', text: 'text-amber-700' },
                        { label: 'Cafe Aktif', value: activeCafe, icon: <Activity className="w-5 h-5 text-rose-600" />, gradient: 'from-rose-500 to-rose-600', light: 'bg-rose-50', text: 'text-rose-700' },
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
                    <div className="fixed inset-0 bg-slate-900/60 z-[1000] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 lg:p-0 animate-in fade-in duration-300" onClick={handleCloseModal}>
                        {/* ── Bulk Config Modal ── */}
                        {modalMode === 'bulk-config' && (
                            <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-[2rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.35)] w-full max-w-7xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>

                                {/* Header */}
                                <div className="shrink-0 bg-gradient-to-r from-slate-800 via-indigo-900 to-violet-900 px-6 py-5 sm:px-8 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center"><Layers className="w-5 h-5 text-white" /></div>
                                        <div>
                                            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Advanced Mode</p>
                                            <h2 className="text-xl font-black text-white">Bulk Config &amp; Generate Meja</h2>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-[10px] font-black text-white/50 bg-white/10 px-3 py-1.5 rounded-full">{bulkRows.length} Meja Total · {bulkRows.filter(r => r.dirty).length} Perubahan</div>
                                        <button onClick={() => setModalMode(null)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"><X className="w-5 h-5" /></button>
                                    </div>
                                </div>

                                {/* Tab Bar */}
                                <div className="shrink-0 flex border-b border-slate-100 bg-white px-6">
                                    <button onClick={() => setBulkPanel('table')} className={`px-5 py-3.5 text-xs font-black border-b-2 transition-all flex items-center gap-2 ${bulkPanel === 'table' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                        <Layers className="w-3.5 h-3.5" /> EDIT KONFIGURASI ({bulkRows.length} meja)
                                    </button>
                                    <button onClick={() => setBulkPanel('generate')} className={`px-5 py-3.5 text-xs font-black border-b-2 transition-all flex items-center gap-2 ${bulkPanel === 'generate' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                        <Sparkles className="w-3.5 h-3.5" /> AUTO-GENERATE MEJA
                                    </button>
                                </div>

                                {/* ── PANEL: EDIT TABLE ── */}
                                {bulkPanel === 'table' && (
                                    <div className="flex flex-col flex-1 overflow-hidden">
                                        {/* Toolbar */}
                                        <div className="shrink-0 flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-100 gap-3">
                                            <div className="text-xs text-slate-500 font-semibold">
                                                Klik sel untuk edit. Gunakan tombol <span className="font-black text-indigo-600">↓ MAC</span> atau <span className="font-black text-indigo-600">↓ PIN</span> untuk auto-fill ke bawah.
                                            </div>
                                            {bulkSkipped.length > 0 && (
                                                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                                    {bulkSkipped.length} baris dilewati. Periksa konflik di bawah.
                                                </div>
                                            )}
                                            <button onClick={handleBulkSave} disabled={bulkSaving || bulkRows.filter(r => r.dirty).length === 0}
                                                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                                                {bulkSaving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</> : <><Save className="w-3.5 h-3.5" /> SIMPAN {bulkRows.filter(r => r.dirty).length > 0 ? `(${bulkRows.filter(r => r.dirty).length})` : ''}</>}
                                            </button>
                                        </div>

                                        {/* Table */}
                                        <div className="flex-1 overflow-auto">
                                            {bulkRows.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                                    <Layers className="w-12 h-12 mb-3 opacity-30" />
                                                    <p className="font-bold text-lg">Belum ada meja billiard</p>
                                                    <p className="text-sm mt-1">Klik tab "Auto-Generate" untuk membuat meja secara massal</p>
                                                    <button onClick={() => setBulkPanel('generate')} className="mt-4 px-5 py-2.5 bg-violet-600 text-white rounded-xl font-black text-xs flex items-center gap-2 hover:bg-violet-700 transition-colors">
                                                        <Sparkles className="w-3.5 h-3.5" /> Generate Meja Sekarang
                                                    </button>
                                                </div>
                                            ) : (
                                                <table className="w-full text-xs border-collapse min-w-[900px]">
                                                    <thead className="sticky top-0 z-10">
                                                        <tr className="bg-slate-800 text-white">
                                                            <th className="px-4 py-3 text-left font-black text-[10px] uppercase tracking-widest w-8">#</th>
                                                            <th className="px-4 py-3 text-left font-black text-[10px] uppercase tracking-widest min-w-[110px]">Nama Meja</th>
                                                            <th className="px-4 py-3 text-left font-black text-[10px] uppercase tracking-widest w-[140px]">Mode Hardware</th>
                                                            <th className="px-4 py-3 text-left font-black text-[10px] uppercase tracking-widest min-w-[170px]">MAC Address</th>
                                                            <th className="px-4 py-3 text-left font-black text-[10px] uppercase tracking-widest w-[100px]">PIN / ID</th>
                                                            <th className="px-4 py-3 text-left font-black text-[10px] uppercase tracking-widest w-[130px]">Kategori</th>
                                                            <th className="px-4 py-3 text-left font-black text-[10px] uppercase tracking-widest w-[70px]">Lantai</th>
                                                            <th className="px-4 py-3 text-left font-black text-[10px] uppercase tracking-widest w-[90px]">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {bulkRows.map((row, idx) => {
                                                            const isSkipped = bulkSkipped.some(s => s.id === row.id);
                                                            const hwColors: Record<string, string> = {
                                                                PCF8575: 'text-cyan-600 bg-cyan-50 border-cyan-200',
                                                                MOC3062: 'text-emerald-600 bg-emerald-50 border-emerald-200',
                                                                ESPNOW_NODE: 'text-violet-600 bg-violet-50 border-violet-200',
                                                            };
                                                            return (
                                                                <tr key={row.id} className={`border-b border-slate-100 transition-colors ${row.dirty ? 'bg-indigo-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} ${isSkipped ? 'bg-rose-50' : ''}`}>
                                                                    {/* Row number */}
                                                                    <td className="px-4 py-2 text-slate-400 font-mono">{idx + 1}</td>

                                                                    {/* Table Name */}
                                                                    <td className="px-2 py-1.5">
                                                                        <div className="flex items-center gap-1.5">
                                                                            {row.dirty && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" title="Ada perubahan" />}
                                                                            {isSkipped && <span title={bulkSkipped.find(s => s.id === row.id)?.reason}><AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" /></span>}
                                                                            <span className="font-bold text-slate-700">{row.tableName}</span>
                                                                        </div>
                                                                    </td>

                                                                    {/* Hardware Mode */}
                                                                    <td className="px-2 py-1.5">
                                                                        <select
                                                                            value={row.hardwareType}
                                                                            onChange={e => updateBulkRow(row.id, 'hardwareType', e.target.value)}
                                                                            className={`w-full px-2 py-1.5 rounded-lg border font-bold text-[10px] uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${hwColors[row.hardwareType] || 'text-slate-600 bg-white border-slate-200'}`}
                                                                        >
                                                                            <option value="ESPNOW_NODE">ESP-NOW Node</option>
                                                                            <option value="PCF8575">PCF8575</option>
                                                                            <option value="MOC3062">MOC3062</option>
                                                                        </select>
                                                                    </td>

                                                                    {/* MAC Address */}
                                                                    <td className="px-2 py-1.5">
                                                                        <div className="flex items-center gap-1">
                                                                            <input
                                                                                type="text"
                                                                                value={row.macAddress}
                                                                                onChange={e => updateBulkRow(row.id, 'macAddress', e.target.value.replace(/[:\-]/g, '').toUpperCase())}
                                                                                placeholder="XXXXXXXXXXXX"
                                                                                className="flex-1 px-2 py-1.5 bg-slate-800 text-indigo-300 font-mono rounded-lg border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-[10px] transition-all placeholder:text-slate-600"
                                                                            />
                                                                            <button onClick={() => applyMacToAll(idx)} title="Terapkan MAC ini ke semua baris di bawah" className="p-1.5 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors shrink-0">
                                                                                <ArrowDown className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    </td>

                                                                    {/* Relay PIN */}
                                                                    <td className="px-2 py-1.5">
                                                                        <div className="flex items-center gap-1">
                                                                            <input
                                                                                type="number"
                                                                                value={row.relayPin}
                                                                                onChange={e => updateBulkRow(row.id, 'relayPin', e.target.value === '' ? '' : Number(e.target.value))}
                                                                                placeholder={row.hardwareType === 'PCF8575' ? '0-15' : row.hardwareType === 'ESPNOW_NODE' ? '1-100' : '4'}
                                                                                min={0} max={row.hardwareType === 'PCF8575' ? 15 : 100}
                                                                                className="flex-1 px-2 py-1.5 bg-slate-800 text-emerald-300 font-mono rounded-lg border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-[10px] transition-all"
                                                                            />
                                                                            <button onClick={() => autoPinFromRow(idx)} title="Auto-isi PIN urut dari baris ini ke bawah" className="p-1.5 hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors shrink-0">
                                                                                <ArrowDown className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    </td>

                                                                    {/* Category */}
                                                                    <td className="px-2 py-1.5">
                                                                        <select
                                                                            value={row.categoryId}
                                                                            onChange={e => updateBulkRow(row.id, 'categoryId', e.target.value === '' ? '' : Number(e.target.value))}
                                                                            className="w-full px-2 py-1.5 bg-white rounded-lg border border-slate-200 font-bold text-[10px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                                                                        >
                                                                            <option value="">— Pilih —</option>
                                                                            {(categoriesData || []).filter((c: any) => c.assetType === row.stationType || !c.assetType).map((c: any) => (
                                                                                <option key={c.id} value={c.id}>{c.name}</option>
                                                                            ))}
                                                                        </select>
                                                                    </td>

                                                                    {/* Floor */}
                                                                    <td className="px-2 py-1.5">
                                                                        <select
                                                                            value={row.floorNumber}
                                                                            onChange={e => updateBulkRow(row.id, 'floorNumber', Number(e.target.value))}
                                                                            className="w-full px-2 py-1.5 bg-white rounded-lg border border-slate-200 font-bold text-[10px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                                                                        >
                                                                            {[1, 2, 3, 4].map(f => <option key={f} value={f}>Lt {f}</option>)}
                                                                        </select>
                                                                    </td>

                                                                    {/* Status badge */}
                                                                    <td className="px-2 py-1.5">
                                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${row.status === 'in_use' ? 'bg-indigo-100 text-indigo-700' : row.status === 'available' ? 'bg-emerald-100 text-emerald-700' : row.status === 'maintenance' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>
                                                                            {row.status === 'in_use' ? 'AKTIF' : row.status === 'available' ? 'READY' : row.status === 'maintenance' ? 'MAINT.' : row.status.replace('_', ' ')}
                                                                        </span>
                                                                        {row.status === 'in_use' && <p className="text-[8px] text-rose-500 mt-0.5">Terkunci</p>}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>

                                        {/* Skipped warning list */}
                                        {bulkSkipped.length > 0 && (
                                            <div className="shrink-0 border-t border-rose-100 bg-rose-50 px-6 py-3 max-h-28 overflow-y-auto">
                                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1.5">Baris yang Dilewati ({bulkSkipped.length})</p>
                                                <ul className="space-y-1">
                                                    {bulkSkipped.map(s => (
                                                        <li key={s.id} className="text-[10px] text-rose-700 flex items-start gap-1.5">
                                                            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                                            {bulkRows.find(r => r.id === s.id)?.tableName || `ID ${s.id}`}: {s.reason}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── PANEL: AUTO-GENERATE ── */}
                                {bulkPanel === 'generate' && (
                                    <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                                        <div className="max-w-3xl mx-auto space-y-6">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center"><Sparkles className="w-5 h-5" /></div>
                                                <div>
                                                    <h3 className="font-black text-slate-800 text-lg">Auto-Generate Meja</h3>
                                                    <p className="text-xs text-slate-500">Buat banyak meja sekaligus dengan konfigurasi yang sudah diatur.</p>
                                                </div>
                                            </div>

                                            {/* Type Selection */}
                                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 mb-4">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Meja</p>
                                                <div className="flex gap-3">
                                                    {(['BILLIARD', 'PLAYSTATION', 'CAFE'] as const).map(type => (
                                                        <button key={type} type="button" onClick={() => setGenerateForm(p => ({ ...p, stationType: type }))}
                                                            className={`px-4 py-2 rounded-xl border-2 font-black text-xs transition-all active:scale-95 ${generateForm.stationType === type ? 'border-violet-600 bg-violet-600 text-white shadow-md' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-violet-300 hover:bg-violet-50'}`}>
                                                            {type === 'CAFE' ? 'Meja Cafe' : type}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Naming */}
                                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Penamaan Otomatis</p>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="col-span-1">
                                                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Prefix Nama</label>
                                                        <input type="text" value={generateForm.prefix} onChange={e => setGenerateForm(p => ({ ...p, prefix: e.target.value }))}
                                                            className="w-full px-3 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none transition-all"
                                                            placeholder="Meja" />
                                                        <p className="text-[10px] text-slate-400 mt-1">Contoh: "Meja", "Table", "Room"</p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Mulai dari Nomor</label>
                                                        <input type="number" min={1} value={generateForm.startIndex} onChange={e => setGenerateForm(p => ({ ...p, startIndex: Number(e.target.value) }))}
                                                            className="w-full px-3 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none transition-all" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Jumlah Meja</label>
                                                        <input type="number" min={1} max={200} value={generateForm.count} onChange={e => setGenerateForm(p => ({ ...p, count: Number(e.target.value) }))}
                                                            className="w-full px-3 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none transition-all" />
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl text-xs text-violet-700 font-medium">
                                                    ✨ Akan membuat: <span className="font-black">{generateForm.prefix} {generateForm.startIndex}</span> sampai <span className="font-black">{generateForm.prefix} {generateForm.startIndex + generateForm.count - 1}</span> ({generateForm.count} meja)
                                                </div>
                                            </div>

                                            {/* Hardware Mode - Only for Billiard/PS */}
                                            {generateForm.stationType !== 'CAFE' && (
                                                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-sm">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Mode Hardware Controller</p>
                                                <div className="grid grid-cols-3 gap-3 mb-4">
                                                    {([
                                                        { value: 'ESPNOW_NODE', label: 'ESP-NOW Node', desc: 'Prajurit tanpa WiFi, dikontrol Gateway', color: 'border-violet-500 bg-violet-500/10', badge: 'text-violet-400', tag: '★ Hybrid' },
                                                        { value: 'PCF8575', label: 'PCF8575', desc: 'Panel terpusat, 1 ESP32 kontrol 16 relay', color: 'border-cyan-500 bg-cyan-500/10', badge: 'text-cyan-400', tag: 'Panel Box' },
                                                        { value: 'MOC3062', label: 'MOC3062', desc: '1 ESP32 per meja, GPIO langsung ke TRIAC', color: 'border-emerald-500 bg-emerald-500/10', badge: 'text-emerald-400', tag: 'Per Meja' },
                                                    ] as const).map(opt => (
                                                        <button key={opt.value} type="button" onClick={() => setGenerateForm(p => ({ ...p, hardwareType: opt.value as HardwareType }))}
                                                            className={`p-3 rounded-xl border-2 text-left transition-all active:scale-95 relative ${generateForm.hardwareType === opt.value ? opt.color : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}>
                                                            <span className={`absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded-full ${generateForm.hardwareType === opt.value ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'}`}>{opt.tag}</span>
                                                            <div className={`flex items-center gap-1.5 mb-1 ${generateForm.hardwareType === opt.value ? opt.badge : 'text-slate-500'}`}>
                                                                <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${generateForm.hardwareType === opt.value ? 'border-current' : 'border-slate-600'}`}>
                                                                    {generateForm.hardwareType === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                                                </div>
                                                                <span className="text-[10px] font-black tracking-widest uppercase">{opt.label}</span>
                                                            </div>
                                                            <p className="text-[9px] text-slate-400 leading-relaxed pl-4">{opt.desc}</p>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* MAC fields */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{generateForm.hardwareType === 'ESPNOW_NODE' ? 'MAC Gateway (opsional)' : 'MAC Address ESP32 (opsional)'}</label>
                                                        <input type="text" value={generateForm.macAddress} onChange={e => setGenerateForm(p => ({ ...p, macAddress: e.target.value.replace(/[:\-]/g, '').toUpperCase() }))}
                                                            placeholder="Kosongkan jika belum ada"
                                                            className="w-full px-3 py-2 bg-slate-800 text-indigo-300 font-mono rounded-xl border border-slate-700 focus:border-indigo-500 outline-none text-xs transition-all" />
                                                    </div>
                                                    {generateForm.hardwareType === 'ESPNOW_NODE' && (
                                                        <div>
                                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">MAC Komandan Gateway</label>
                                                            <input type="text" value={generateForm.espnowGatewayMac} onChange={e => setGenerateForm(p => ({ ...p, espnowGatewayMac: e.target.value.replace(/[:\-]/g, '').toUpperCase() }))}
                                                                placeholder="MAC ESP32 Komandan"
                                                                className="w-full px-3 py-2 bg-slate-800 text-violet-300 font-mono rounded-xl border border-slate-700 focus:border-violet-500 outline-none text-xs transition-all" />
                                                        </div>
                                                    )}
                                                </div>

                                                {generateForm.hardwareType === 'PCF8575' && (
                                                    <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                                                        <input type="checkbox" id="autoPin" checked={generateForm.autoPin} onChange={e => setGenerateForm(p => ({ ...p, autoPin: e.target.checked }))}
                                                            className="w-4 h-4 accent-cyan-500 cursor-pointer" />
                                                        <label htmlFor="autoPin" className="text-[11px] text-cyan-300 font-bold cursor-pointer">
                                                            Auto-assign PIN mulai dari 0 (PIN 0, 1, 2, 3... per meja) — Otomatis sesuaikan ke channel PCF8575
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                            {/* Category & Floor - Only for Billiard/PS */}
                                            {generateForm.stationType !== 'CAFE' && (
                                                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori &amp; Penempatan</p>

                                                {/* Categories from master data */}
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-600 mb-2">Kategori Meja</label>
                                                    {loadingCategories ? (
                                                        <div className="animate-pulse h-10 bg-slate-100 rounded-xl" />
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            <button type="button" onClick={() => setGenerateForm(p => ({ ...p, categoryId: '' }))}
                                                                className={`px-4 py-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${generateForm.categoryId === '' ? 'border-slate-600 bg-slate-700 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                                                                — Tanpa Kategori —
                                                            </button>
                                                            {(categoriesData || []).filter((c: any) => c.assetType === 'BILLIARD' || !c.assetType).map((cat: any) => {
                                                                const isVip = cat.name?.toLowerCase().includes('vip');
                                                                const isSelected = generateForm.categoryId === cat.id;
                                                                return (
                                                                    <button key={cat.id} type="button" onClick={() => setGenerateForm(p => ({ ...p, categoryId: cat.id }))}
                                                                        className={`px-4 py-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${isSelected ? (isVip ? 'border-amber-500 bg-amber-500 text-white' : 'border-indigo-600 bg-indigo-600 text-white') : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                                                                        {cat.name}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Floor Selector */}
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-600 mb-2">Lantai Fisik</label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {[1, 2, 3, 4].map(fl => (
                                                            <button key={fl} type="button" onClick={() => setGenerateForm(p => ({ ...p, floorNumber: fl }))}
                                                                className={`py-2.5 rounded-xl border-2 font-black text-sm transition-all active:scale-95 ${generateForm.floorNumber === fl ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'}`}>
                                                                Lt {fl}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Production Zone */}
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-600 mb-2">Zona Produksi (Routing Printer)</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {['', 'ZONE_A', 'ZONE_B', 'ZONE_C'].map(zone => (
                                                            <button key={zone} type="button" onClick={() => setGenerateForm(p => ({ ...p, productionZone: zone }))}
                                                                className={`px-4 py-2 rounded-xl border-2 font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 ${generateForm.productionZone === zone ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-100 bg-white text-slate-500 hover:border-amber-300'}`}>
                                                                {zone === '' ? 'DEFAULT (BROAD)' : zone.replace('_', ' ')}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                </div>
                                            )}

                                            {/* Generate Button */}
                                            <button onClick={handleBulkGenerate} disabled={generating}
                                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.99] shadow-lg shadow-violet-200 disabled:opacity-60 disabled:cursor-not-allowed">
                                                {generating
                                                    ? <><RefreshCw className="w-5 h-5 animate-spin" /> Membuat {generateForm.count} meja...</>
                                                    : <><Sparkles className="w-5 h-5" /> GENERATE {generateForm.count} MEJA SEKARANG</>}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Type Chooser ── */}
                        {modalMode === 'choose' && (
                            <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-[2rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] w-full max-w-3xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                                <div className="pt-4 px-6 lg:p-8 lg:px-10 flex flex-col overflow-y-auto no-scrollbar pb-[calc(1.5rem+env(safe-area-inset-bottom,20px))] sm:pb-8">
                                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden shrink-0" />
                                    <div className="flex justify-between items-center mb-8 shrink-0">
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
                            <div className="relative z-10 bg-white rounded-t-[2.5rem] sm:rounded-[2rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] w-full max-w-5xl 2xl:max-w-6xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                                <div className="pt-4 pb-4 sm:py-6 px-6 sm:px-8 border-b border-slate-100 flex flex-col shrink-0 bg-white">
                                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden shrink-0" />
                                    <div className="flex justify-between items-start">
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
                            </div>

                            <div className="overflow-y-auto flex-1 bg-slate-50/50">
                                    <form onSubmit={handleSubmitBilliard} className="p-4 sm:p-8 pb-[calc(2rem+env(safe-area-inset-bottom,20px))] sm:pb-8">
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
                            <div className="relative z-10 bg-white rounded-t-[2.5rem] sm:rounded-[2rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
                                <div className="pt-4 pb-4 sm:py-6 px-6 sm:px-8 border-b border-slate-100 flex flex-col shrink-0 bg-white">
                                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden shrink-0" />
                                    <div className="flex justify-between items-start">
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
                            </div>

                            <form onSubmit={handleSubmitCafe} className="overflow-y-auto no-scrollbar p-6 sm:p-8 pb-[calc(2rem+env(safe-area-inset-bottom,20px))] sm:pb-8 space-y-6">
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
