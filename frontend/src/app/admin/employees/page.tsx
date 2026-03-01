'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Users, UserPlus, Shield, Activity, DollarSign,
    Search, Filter, Plus, Save, X, Check, Trash2,
    Power, AlertTriangle, Monitor, Clock, ChevronRight, Edit2, RefreshCw,
    Wallet, TrendingUp, ShieldAlert, Calendar, Lock, Unlock, Mail, Hash, Zap, Coffee
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMqtt } from '@/context/MqttContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { socket } from '@/lib/socket';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Role {
    id: number;
    name: string;
    permissions: string[];
    description?: string;
}

interface PayrollConfig {
    id: number;
    basicSalary: number;
    overtimeRate: number;
    commissionService: number;
    commissionSalesPercent: number;
    categoryCommissions: Record<string, number> | null;
    penaltyIdle: number;
    idleThreshold: number;
}

interface User {
    id: number;
    name: string;
    username: string;
    email: string;
    role: Role | null;
    status: string;
    lastSeen: string;
    createdAt: string;
    joinedAt?: string;
    pin?: string;
    payrollConfig?: PayrollConfig;
    baseShift?: string; // Added baseShift
}

interface MonitoringSummary {
    userId: number;
    name: string;
    status: string;
    activeSeconds: number;
    activeHours: string;
}

interface StatusLog {
    id: number;
    status: string;
    startedAt: string;
    endedAt: string | null;
    durationSeconds: number;
}

interface SalesLedgerEntry {
    id: number;
    itemName: string;
    category: string;
    quantity: number;
    price: number;
    total: number;
    commissionPercent: number;
    commissionAmount: number;
    tableName: string;
    invoiceNumber: string;
    createdAt: string;
}

interface DailyActivity {
    date: string;
    active: number;
    away: number;
    offline: number;
}

interface PenaltyEntry {
    id: number;
    type: string;
    description: string;
    penaltyAmount: number;
    createdAt: string;
}

interface DetailedReport {
    statusLogs: StatusLog[];
    dailySummary: DailyActivity[];
    salesLedger: SalesLedgerEntry[];
    productionLedger: SalesLedgerEntry[];
    penaltyLedger: PenaltyEntry[];
}

const PERMISSION_GROUPS = [
    {
        label: 'Modul Antrean (Waiting List)',
        permissions: [
            { id: 'WAITING_LIST_VIEW', label: 'Lihat Daftar Antrean Side-Bar' },
            { id: 'WAITING_LIST_MANAGE', label: 'Kelola Antrean (Tambah/SIKAT!/Hapus)' },
        ]
    },
    {
        label: 'Modul Billing Billiard',
        permissions: [
            { id: 'BILLIARD_VIEW', label: 'Lihat Status & Daftar Meja' },
            { id: 'BILLIARD_START', label: 'Buka Sesi Meja (Mulai)' },
            { id: 'BILLIARD_EXTEND', label: 'Tambah Durasi / Perpanjang Sesi' },
            { id: 'BILLIARD_STOP', label: 'Stop Sesi (Checkout Sementara)' },
            { id: 'BILLIARD_PAY', label: 'Sinkronisasi & Proses Bayar (Final)' },
            { id: 'BILLIARD_MOVE', label: 'Pindah Sesi ke Meja Lain' },
            { id: 'BILLIARD_LIGHT', label: 'Kontrol Manual Lampu Meja' },
            { id: 'BILLIARD_ORDER', label: 'Tambah Pesan Makan/Minum ke Meja' },
            { id: 'BILLIARD_CANCEL_ITEM', label: 'Batalkan Item Pesanan F&B Meja' },
            { id: 'BILLIARD_PREVIEW', label: 'Lihat Preview Nota Sementara' },
            { id: 'BILLIARD_PRICING', label: 'Kelola Harga & Tarif Billiard' },
        ]
    },
    {
        label: 'Modul Cafe POS (Meja Cafe)',
        permissions: [
            { id: 'CAFE_VIEW', label: 'Akses Dashboard & Daftar Meja Cafe' },
            { id: 'CAFE_START', label: 'Buka Meja Cafe Baru' },
            { id: 'CAFE_ORDER', label: 'Input / Tambah Pesanan Cafe' },
            { id: 'CAFE_PAY', label: 'Proses Pembayaran / Checkout Cafe' },
            { id: 'CAFE_TRANSFER', label: 'Pindah Order / Gabung ke Meja Billiard' },
            { id: 'CAFE_CANCEL_ITEM', label: 'Batalkan Item Pesanan Cafe' },
        ]
    },
    {
        label: 'Modul Inventory & ERP',
        permissions: [
            { id: 'INV_VIEW', label: 'Lihat Daftar Stok & Nilai Inventaris' },
            { id: 'INV_UPDATE', label: 'Tambah/Edit/Hapus Bahan Baku' },
            { id: 'INV_RECIPE', label: 'Kelola Formula Resep & Menu' },
            { id: 'INV_ALERT', label: 'Akses Notifikasi & Laporan Stok Kritis' },
        ]
    },
    {
        label: 'Modul Keuangan & Laporan',
        permissions: [
            { id: 'FIN_REVENUE', label: 'Lihat Laporan Omzet & Pendapatan' },
            { id: 'FIN_EXPENSES_VIEW', label: 'Lihat Daftar Riwayat Pengeluaran' },
            { id: 'FIN_EXPENSES_ADD', label: 'Tambah Data Pengeluaran Baru' },
            { id: 'FIN_LEDGER', label: 'Akses Buku Besar (Laba Rugi Detail)' },
            { id: 'FIN_PRINT_REPRINT', label: 'Cetak Ulang / Download Invoice Lama' },
            { id: 'FIN_DEBTS', label: 'Manajemen Hutang & Piutang (Bon)' },
            { id: 'BUSINESS_DAY_VIEW', label: 'Lihat Laporan & History Business Day' },
            { id: 'BUSINESS_DAY_CLOSE', label: 'Lakukan Tutup Buku Harian (Close Day)' },
        ]
    },
    {
        label: 'SDM & Keamanan',
        permissions: [
            { id: 'USER_MANAGE', label: 'Kelola Akun Karyawan & Hak Akses' },
            { id: 'USER_MONITOR', label: 'Monitor Aktivitas (Audit Trail)' },
            { id: 'USER_FORCE_LOGOUT', label: 'Paksa Logout Sesi Aktif' },
            { id: 'SHIFT_START', label: 'Memulai Shift Baru (Buka Kasir)' },
        ]
    },
    {
        label: 'Modul Audit & Keamanan',
        permissions: [
            { id: 'AUDIT_VIEW', label: 'Lihat Audit Log Aktivitas Sistem' },
            { id: 'AUDIT_EXPORT', label: 'Export Data Audit ke Excel/CSV' },
            { id: 'USER_MANAGE', label: 'Tambah/Edit/Hapus Akun Karyawan' },
            { id: 'USER_ROLE', label: 'Konfigurasi Role & Matrix Izin' },
            { id: 'USER_MONITOR', label: 'Monitor Aktivitas & Log Pelanggaran' },
            { id: 'USER_FORCE_LOGOUT', label: 'Paksa Keluar User (Force Logout)' },
            { id: 'PAYROLL_VIEW', label: 'Lihat Laporan Gaji & Komisi' },
        ]
    },
    {
        label: 'Pengaturan Sistem (Settings)',
        permissions: [
            { id: 'SETTING_IDENTITY', label: 'Edit Identitas & Profil Bisnis' },
            { id: 'SETTING_POLICY', label: 'Atur Pajak, Biaya & Pembulatan' },
            { id: 'SETTING_OPERATION', label: 'Atur Jam Operasional (Offset)' },
            { id: 'SETTING_HARDWARE', label: 'Konfigurasi IoT, IP & Printer' },
            { id: 'SETTING_INVOICE', label: 'Kustomisasi Header/Footer Invoice' },
            { id: 'SETTING_DATABASE', label: 'Maintenance & Pembersihan DB' },
            { id: 'SETTING_TABLES', label: 'Manajemen Meja (Billiard & Cafe)' },
            { id: 'PROMO_MANAGE', label: 'Kelola Promo & Bundling' },
        ]
    },
    {
        label: 'Modul Workstation Display',
        permissions: [
            { id: 'ACCESS_KDS', label: 'Akses Kitchen Display (KDS)' },
            { id: 'ACCESS_BDS', label: 'Akses Bartender Display (BDS)' },
        ]
    }
];

const formatTime = (seconds: number) => {
    if (!seconds || seconds === 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

const timeSince = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
};

export default function EmployeePage() {
    const { hasPermission, loading: authLoading } = useAuth();
    const { subscribe } = useMqtt();
    const [activeTab, setActiveTab] = useState<'employees' | 'roles' | 'monitoring' | 'payroll'>('employees');
    const [employees, setEmployees] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [availableShifts, setAvailableShifts] = useState<{ name: string; startTime: string; endTime: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [roleLoading, setRoleLoading] = useState(false);
    const [payrollStats, setPayrollStats] = useState<Record<number, any>>({});
    const [violations, setViolations] = useState<any[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedDetailedEmployee, setSelectedDetailedEmployee] = useState<User | null>(null);
    const [detailedReport, setDetailedReport] = useState<DetailedReport | null>(null);
    const [detailedLoading, setDetailedLoading] = useState(false);
    const [showDetailedModal, setShowDetailedModal] = useState(false);
    const [detailedTab, setDetailedTab] = useState<'status' | 'sales' | 'production' | 'penalties'>('status');
    const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [monitoringSummary, setMonitoringSummary] = useState<MonitoringSummary[]>([]);
    const [stats, setStats] = useState<any>({}); // Added stats state as per instruction's fetchData snippet

    useBodyScrollLock(showRegisterModal || showRoleModal || showDetailedModal);

    // Tab Permission Matrix
    const tabPermissions: Record<string, string> = {
        'employees': 'USER_MANAGE',
        'roles': 'USER_ROLE',
        'monitoring': 'USER_MONITOR',
        'payroll': 'PAYROLL_VIEW'
    };

    // Auto-switch to first available tab if activeTab is not allowed
    useEffect(() => {
        if (!authLoading && !hasPermission(tabPermissions[activeTab])) {
            const firstAvailable = Object.keys(tabPermissions).find(tab => hasPermission(tabPermissions[tab]));
            if (firstAvailable) {
                setActiveTab(firstAvailable as any);
            }
        }
    }, [authLoading, hasPermission, activeTab]);

    // Form States
    const [newEmployee, setNewEmployee] = useState({
        name: '', username: '', password: '', email: '', pin: '',
        roleId: '', basicSalary: 0, overtimeRate: 0, commissionService: 0, commissionSalesPercent: 0,
        categoryCommissions: {} as Record<string, number>,
        penaltyIdle: 5000, idleThreshold: 5,
        baseShift: '' // Added baseShift to newEmployee state
    });
    const [newRole, setNewRole] = useState<{ name: string; permissions: string[]; description?: string }>({
        name: '',
        permissions: [] as string[],
        description: '',
    });
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [empRes, rolesRes, monRes, settingsRes, violRes, catRes, payrollRes] = await Promise.all([
                axios.get(`${API_URL}/users/employees`),
                axios.get(`${API_URL}/users/roles`),
                axios.get(`${API_URL}/users/monitoring-summary`),
                axios.get(`${API_URL}/settings`), // Fetch settings
                axios.get(`${API_URL}/users/violations`), // Fetch violations
                axios.get(`${API_URL}/cafe/categories`), // Fetch categories
                axios.get(`${API_URL}/users/employees/payroll/bulk`) // Bulk payroll
            ]);
            setEmployees(empRes.data);
            setRoles(rolesRes.data);
            setMonitoringSummary(monRes.data);
            setAvailableShifts(settingsRes.data.availableShifts || []); // Set available shifts
            setViolations(violRes.data); // Set violations
            setCategories(catRes.data.map((c: any) => c.name)); // Set categories
            setPayrollStats(payrollRes.data);

        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Lightweight refresh — only fetch categories (called on modal open)
    const fetchCategories = async () => {
        try {
            const catRes = await axios.get(`${API_URL}/cafe/categories`);
            setCategories(catRes.data.map((c: any) => c.name));
        } catch (error) {
            console.error('Failed to refresh categories', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Real-time synchronization for Payroll & Monitoring
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const handleUpdate = () => {
            // Debounce refresh to 2 seconds to avoid API spam during burst updates
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                fetchData();
            }, 2000);
        };

        const handleCommissionUpdate = (data: { userId: number }) => {
            // High priority refresh for a specific user's payroll
            axios.get(`${API_URL}/users/${data.userId}/payroll`)
                .then(res => {
                    setPayrollStats(prev => ({ ...prev, [data.userId]: res.data }));
                });
        };

        const unsubs = [
            subscribe('billiard/tables/update', handleUpdate),
            subscribe('billiard/order/update', handleUpdate),
            subscribe('billiard/finance/transaction', handleUpdate),
            subscribe('billiard/user/+/violation', handleUpdate),
            subscribe('billiard/employee/update', handleUpdate),
            subscribe('billiard/role/update', handleUpdate),
            subscribe('billiard/user/+/commission', handleCommissionUpdate),
        ];

        // WebSocket Fallback
        socket.on('tableUpdate', handleUpdate);
        socket.on('employee_updated', handleUpdate);
        socket.on('role_updated', handleUpdate);
        socket.on('commission_updated', handleCommissionUpdate);

        return () => {
            clearTimeout(timeoutId);
            unsubs.forEach(u => u());
            socket.off('tableUpdate', handleUpdate);
            socket.off('employeeUpdated', handleUpdate);
            socket.off('roleUpdated', handleUpdate);
            socket.off('commission_updated', handleCommissionUpdate);
        };
    }, [fetchData, subscribe]);

    const resetRegisterForm = () => {
        setEditingEmployee(null);
        setNewEmployee({
            name: '', username: '', password: '', email: '', pin: '',
            roleId: '', basicSalary: 0, overtimeRate: 0, commissionService: 0, commissionSalesPercent: 0,
            categoryCommissions: {},
            penaltyIdle: 5000, idleThreshold: 5,
            baseShift: ''
        });
    };

    const fetchDetailedReport = async (emp: User) => {
        setSelectedDetailedEmployee(emp);
        setDetailedLoading(true);
        setShowDetailedModal(true);
        try {
            const res = await axios.get(`${API_URL}/users/${emp.id}/payroll/detailed`);
            setDetailedReport(res.data);
        } catch (error) {
            console.error('Failed to fetch detailed report');
        } finally {
            setDetailedLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingEmployee) {
                await axios.patch(`${API_URL}/users/employees/${editingEmployee.id}`, newEmployee);
            } else {
                await axios.post(`${API_URL}/users/employees`, newEmployee);
            }
            setShowRegisterModal(false);
            resetRegisterForm();
            fetchData();
        } catch (error) {
            alert(editingEmployee ? 'Gagal memperbarui karyawan' : 'Gagal mendaftarkan karyawan');
        }
    };

    const handleDeleteEmployee = async () => {
        if (!editingEmployee) return;
        if (!confirm(`Yakin ingin menghapus akun ${editingEmployee.name}? Semua data penggajian juga akan terhapus.`)) return;

        try {
            await axios.delete(`${API_URL}/users/employees/${editingEmployee.id}`);
            setShowRegisterModal(false);
            resetRegisterForm();
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Gagal menghapus karyawan');
        }
    };

    const handleEdit = (emp: User) => {
        const stats = payrollStats[emp.id] || { basicSalary: 0, overtimeRate: 0, commissionService: 0, commissionSalesPercent: 0, penaltyIdle: 5000, idleThreshold: 5 };
        setEditingEmployee(emp);
        setNewEmployee({
            name: emp.name,
            username: emp.username,
            password: '', // Keep empty unless changing
            email: emp.email || '',
            pin: '', // Pin not handled in list yet
            roleId: emp.role?.id.toString() || '',
            basicSalary: stats.basicSalaryRate || 0,
            overtimeRate: stats.overtimeRate || 0,
            commissionService: stats.commissionServiceRate || 0,
            commissionSalesPercent: stats.commissionSalesPercent || 0,
            categoryCommissions: emp.payrollConfig?.categoryCommissions || {},
            penaltyIdle: stats.penaltyIdle || 0,
            idleThreshold: stats.idleThreshold || 0,
            baseShift: emp.baseShift || '' // Populating baseShift for editing
        });
        fetchCategories(); // Refresh categories before opening modal
        setShowRegisterModal(true);
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        setRoleLoading(true);
        try {
            if (editingRole) {
                await axios.patch(`${API_URL}/users/roles/${editingRole.id}`, newRole);
            } else {
                await axios.post(`${API_URL}/users/roles`, newRole);
            }
            setShowRoleModal(false);
            setEditingRole(null);
            setNewRole({ name: '', permissions: [], description: '' });
            fetchData();
        } catch (error) {
            alert(editingRole ? 'Gagal memperbarui role' : 'Gagal membuat role');
        } finally {
            setRoleLoading(false);
        }
    };

    const handleEditRole = (role: Role) => {
        setEditingRole(role);
        setNewRole({
            name: role.name,
            permissions: role.permissions,
            description: role.description || ''
        });
        setShowRoleModal(true);
    };

    const handleDeleteRole = async (roleId: number) => {
        if (!confirm('Yakin ingin menghapus role ini?')) return;
        try {
            await axios.delete(`${API_URL}/users/roles/${roleId}`);
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Gagal menghapus role');
        }
    };

    const togglePermission = (permId: string) => {
        setNewRole(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permId)
                ? prev.permissions.filter(p => p !== permId)
                : [...prev.permissions, permId]
        }));
    };

    const handleForceLogout = async (userId: number) => {
        const message = prompt('Masukkan pesan untuk karyawan (Opsional):', 'Hubungi admin, Anda Melakukan pelanggaran kerja.');
        if (message === null) return; // Cancelled

        try {
            await axios.post(`${API_URL}/users/${userId}/force-logout`, { message });
        } catch (error) {
            alert('Gagal mengirim sinyal force logout');
        }
    };

    useEffect(() => {
        const handleUserStatusUpdate = (e: any) => {
            const { userId, status } = e.detail;
            setEmployees(prev => prev.map(emp =>
                emp.id === userId ? { ...emp, status } : emp
            ));
            // Refresh violations if needed (optional optimization: only fetch if status changes to ACTIVE/AWAY)
            axios.get(`${API_URL}/users/violations`).then(res => setViolations(res.data));
        };
        window.addEventListener('userStatusUpdate', handleUserStatusUpdate);
        return () => window.removeEventListener('userStatusUpdate', handleUserStatusUpdate);
    }, []);

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 lg:p-12 selection:bg-indigo-100 selection:text-indigo-900">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden h-screen w-screen">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full" />
            </div>

            <div className="max-w-7xl mx-auto space-y-8 relative z-10">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                            <Shield className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Enterprise Security</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                            SDM & <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">KEAMANAN</span>
                        </h1>
                        <p className="text-slate-500 font-medium text-sm md:text-base max-w-2xl leading-relaxed">
                            Pusat kendali manajemen personil, audit aktivitas, dan konfigurasi hak akses terintegrasi.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {hasPermission('USER_ROLE') && (
                            <button
                                onClick={() => setShowRoleModal(true)}
                                className="flex-1 md:flex-none bg-white text-slate-700 border border-slate-200 px-5 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2.5 hover:bg-slate-50 hover:border-slate-300 hover:shadow-lg transition-all active:scale-95 group"
                            >
                                <Shield className="w-5 h-5 text-indigo-500 transition-transform group-hover:rotate-12" />
                                <span className="whitespace-nowrap">Manajemen Role</span>
                            </button>
                        )}
                        {hasPermission('USER_MANAGE') && (
                            <button
                                onClick={() => { resetRegisterForm(); fetchCategories(); setShowRegisterModal(true); }}
                                className="flex-1 md:flex-none bg-slate-900 text-white px-5 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2.5 hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-600/20 transition-all active:scale-95 group"
                            >
                                <UserPlus className="w-5 h-5 transition-transform group-hover:scale-110" />
                                <span className="whitespace-nowrap">Registrasi Baru</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                                <Activity className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Now</p>
                                <p className="text-xl md:text-2xl font-black text-slate-900 leading-none">{employees.filter(e => e.status === 'ACTIVE').length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                                <Clock className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Away/Idle</p>
                                <p className="text-xl md:text-2xl font-black text-slate-900 leading-none">{employees.filter(e => e.status === 'AWAY').length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="hidden lg:flex bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Unit</p>
                                <p className="text-2xl font-black text-slate-900 leading-none">{employees.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="hidden lg:flex bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Alerts</p>
                                <p className="text-2xl font-black text-slate-900 leading-none">{violations.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Responsive Tabs Navigation */}
                <div className="w-full flex overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
                    <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit min-w-full md:min-w-0 whitespace-nowrap">
                        {hasPermission('USER_MANAGE') && (
                            <button
                                onClick={() => setActiveTab('employees')}
                                className={`whitespace-nowrap px-6 md:px-8 py-3 rounded-xl font-bold transition-all text-sm md:text-base ${activeTab === 'employees' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Karyawan
                            </button>
                        )}
                        {hasPermission('USER_ROLE') && (
                            <button
                                onClick={() => setActiveTab('roles')}
                                className={`whitespace-nowrap px-6 md:px-8 py-3 rounded-xl font-bold transition-all text-sm md:text-base ${activeTab === 'roles' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Roles
                            </button>
                        )}
                        {hasPermission('USER_MONITOR') && (
                            <button
                                onClick={() => setActiveTab('monitoring')}
                                className={`whitespace-nowrap px-6 md:px-8 py-3 rounded-xl font-bold transition-all text-sm md:text-base ${activeTab === 'monitoring' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Monitoring
                            </button>
                        )}
                        {hasPermission('PAYROLL_VIEW') && (
                            <button
                                onClick={() => setActiveTab('payroll')}
                                className={`flex-shrink-0 whitespace-nowrap px-6 md:px-8 py-3 rounded-xl font-bold transition-all text-sm md:text-base ${activeTab === 'payroll' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Payroll
                            </button>
                        )}
                    </div>
                </div>

                {/* List Container */}
                {loading ? (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-24 bg-white rounded-3xl animate-skeleton border border-slate-200" />
                            ))}
                        </div>
                        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
                            <div className="p-8 border-b border-slate-100 space-y-4">
                                <div className="h-4 w-1/4 bg-slate-50 rounded animate-skeleton" />
                                <div className="h-10 w-full bg-slate-50 rounded-2xl animate-skeleton" />
                            </div>
                            <div className="p-8 space-y-4">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="h-20 w-full bg-slate-50 rounded-2xl animate-skeleton" />
                                ))}
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'employees' ? (
                    <div className="space-y-4">
                        {/* Desktop Table View */}
                        <div className="hidden md:block bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Karyawan</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Access & Security</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Joined Date</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {employees.map((emp) => (
                                        <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-base shadow-inner">
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 leading-none mb-1">{emp.name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">@{emp.username}</p>
                                                            {emp.email && (
                                                                <>
                                                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                                                                        <Mail className="w-2.5 h-2.5" />
                                                                        {emp.email}
                                                                    </div>
                                                                </>
                                                            )}
                                                            {emp.baseShift && (
                                                                <>
                                                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                                                                        <Clock className="w-2.5 h-2.5" />
                                                                        {emp.baseShift}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                            {emp.role?.name || 'N/A'}
                                                        </span>
                                                        {emp.pin ? (
                                                            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100/50" title="PIN Registered">
                                                                <Lock className="w-2.5 h-2.5" />
                                                                <span className="text-[8px] font-black uppercase">PIN</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-400 rounded-lg border border-slate-100" title="No PIN">
                                                                <Unlock className="w-2.5 h-2.5" />
                                                                <span className="text-[8px] font-black uppercase">NO PIN</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Calendar className="w-3.5 h-3.5 opacity-40" />
                                                    <span className="text-xs font-bold">
                                                        {new Date(emp.createdAt || (emp.joinedAt as string) || new Date()).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${emp.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : emp.status === 'AWAY' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                                        <span className={`text-[10px] font-black tracking-widest uppercase ${emp.status === 'ACTIVE' ? 'text-emerald-600' : emp.status === 'AWAY' ? 'text-amber-600' : 'text-slate-400'}`}>
                                                            {emp.status}
                                                        </span>
                                                    </div>
                                                    {emp.status === 'OFFLINE' && emp.lastSeen && (
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Last Active: {timeSince(emp.lastSeen)}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {hasPermission('USER_MANAGE') && (
                                                        <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-md rounded-xl transition-all" title="Edit Karyawan" onClick={() => handleEdit(emp)}>
                                                            <Edit2 className="w-4.5 h-4.5" />
                                                        </button>
                                                    )}
                                                    {hasPermission('USER_FORCE_LOGOUT') && (
                                                        <button className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-md rounded-xl transition-all" title="Force Logout" onClick={() => handleForceLogout(emp.id)}>
                                                            <Power className="w-4.5 h-4.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden grid grid-cols-1 gap-4">
                            {employees.map((emp) => (
                                <div key={emp.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl shadow-inner">
                                                {emp.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 leading-tight mb-1">{emp.name}</p>
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">@{emp.username}</p>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${emp.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : emp.status === 'AWAY' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            {emp.pin ? (
                                                <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100/50 mb-2">
                                                    <Lock className="w-2.5 h-2.5" />
                                                    <span className="text-[8px] font-black uppercase">SECURED</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-400 rounded-lg border border-slate-100 mb-2">
                                                    <Unlock className="w-2.5 h-2.5" />
                                                    <span className="text-[8px] font-black uppercase">NO-PIN</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Position</p>
                                            <p className="text-[10px] font-black text-slate-700 uppercase">{emp.role?.name || 'Staff'}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Joined At</p>
                                            <p className="text-[10px] font-black text-slate-700 tabular-nums">
                                                {new Date(emp.createdAt || (emp.joinedAt as string) || new Date()).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-3.5 h-3.5 text-slate-300" />
                                            <span className="text-[10px] font-bold text-slate-400 lowercase">{emp.email || 'N/A'}</span>
                                            {emp.baseShift && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {emp.baseShift}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {hasPermission('USER_MANAGE') && (
                                                <button className="p-3 bg-slate-900 text-white rounded-xl shadow-lg active:scale-95 transition-all" onClick={() => handleEdit(emp)}>
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            {hasPermission('USER_FORCE_LOGOUT') && (
                                                <button className="p-3 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all" onClick={() => handleForceLogout(emp.id)}>
                                                    <Power className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : activeTab === 'roles' ? (
                    <div className="space-y-4">
                        {/* Desktop Roles Table */}
                        <div className="hidden md:block bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Role</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total User</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {roles.map((role) => (
                                        <tr key={role.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                                        <Shield className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800">{role.name}</span>
                                                        {role.description && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{role.description}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-wrap gap-1.5 max-w-sm">
                                                    {[
                                                        { label: 'Bill', icon: Shield, ids: ['BILLIARD_VIEW', 'BILLIARD_START', 'BILLIARD_PAY'] },
                                                        { label: 'POS', icon: Users, ids: ['CAFE_VIEW', 'CAFE_ORDER', 'CAFE_PAY'] },
                                                        { label: 'Inv', icon: Activity, ids: ['INV_VIEW', 'INV_UPDATE'] },
                                                        { label: 'Fin', icon: DollarSign, ids: ['FIN_REVENUE', 'FIN_LEDGER'] },
                                                        { label: 'Sec', icon: Monitor, ids: ['AUDIT_VIEW', 'USER_MANAGE'] },
                                                    ].map((grp) => {
                                                        const count = role.permissions.filter(p => grp.ids.includes(p)).length;
                                                        if (count === 0) return null;
                                                        return (
                                                            <div key={grp.label} className="flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-500">
                                                                <grp.icon className="w-2.5 h-2.5" />
                                                                <span className="text-[9px] font-black uppercase">{grp.label} ({count})</span>
                                                            </div>
                                                        );
                                                    })}
                                                    <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-black text-[9px] uppercase tracking-widest">
                                                        Total: {role.permissions.length}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2 text-slate-500 font-medium">
                                                    <Users className="w-4 h-4" />
                                                    {employees.filter(e => e.role?.id === role.id).length} Personil
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEditRole(role)}
                                                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-md rounded-xl transition-all"
                                                        title="Edit Role"
                                                    >
                                                        <Edit2 className="w-4.5 h-4.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRole(role.id)}
                                                        className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-md rounded-xl transition-all"
                                                        title="Hapus Role"
                                                    >
                                                        <Trash2 className="w-4.5 h-4.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="md:hidden grid grid-cols-1 gap-4">
                            {roles.map((role) => (
                                <div key={role.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                                <Shield className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 leading-none mb-1.5">{role.name}</p>
                                                {role.description && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{role.description}</p>}
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">{employees.filter(e => e.role?.id === role.id).length} Personil Aktif</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEditRole(role)} className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteRole(role.id)} className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center active:scale-95 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-50">
                                        {[
                                            { label: 'Bill', icon: Shield, ids: ['BILLIARD_VIEW', 'BILLIARD_START', 'BILLIARD_PAY'] },
                                            { label: 'POS', icon: Users, ids: ['CAFE_VIEW', 'CAFE_ORDER', 'CAFE_PAY'] },
                                            { label: 'Inv', icon: Activity, ids: ['INV_VIEW', 'INV_UPDATE'] },
                                            { label: 'Fin', icon: DollarSign, ids: ['FIN_REVENUE', 'FIN_LEDGER'] },
                                            { label: 'Sec', icon: Monitor, ids: ['AUDIT_VIEW', 'USER_MANAGE'] },
                                        ].map((grp) => {
                                            const count = role.permissions.filter(p => grp.ids.includes(p)).length;
                                            if (count === 0) return null;
                                            return (
                                                <div key={grp.label} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-500">
                                                    <grp.icon className="w-2.5 h-2.5" />
                                                    <span className="text-[8px] font-black uppercase tracking-tighter">{grp.label} ({count})</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : activeTab === 'monitoring' ? (
                    <div className="space-y-6">
                        {/* Live Overview Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* System Status Card */}
                            <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
                                <div className="relative z-10 space-y-8">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live Infrastructure</span>
                                    </div>
                                    <div>
                                        <p className="text-4xl md:text-5xl font-black tracking-tighter tabular-nums leading-none">
                                            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">{currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                                    </div>
                                    <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Active</p>
                                            <p className="text-xl font-black text-emerald-400">{employees.filter(e => e.status === 'ACTIVE').length}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Alerts</p>
                                            <p className="text-xl font-black text-rose-400">{violations.length}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Clock className="w-24 h-24 rotate-12" />
                                </div>
                            </div>

                            {/* Activity Timeline Card */}
                            <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Kronologi Aktivitas</h3>
                                    <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">View All</button>
                                </div>
                                <div className="flex-1 overflow-y-auto max-h-[300px] p-2 space-y-1 custom-scrollbar">
                                    {violations.slice(0, 10).map((v) => (
                                        <div key={v.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors group border-b border-slate-50 last:border-0">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${v.type === 'IDLE_TIMEOUT' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                                                <AlertTriangle className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-slate-800">
                                                    {v.user?.name}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{v.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-900 tabular-nums">
                                                    {new Date(v.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <p className="text-[9px] font-bold text-rose-500">-Rp {Number(v.penaltyAmount).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {violations.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 py-10">
                                            <Activity className="w-8 h-8 opacity-20 mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">No Recent Incidents</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Employee Monitoring Matrix */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 md:p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Personnel Matrix</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                {employees.map((emp) => {
                                    const stats = monitoringSummary.find(s => s.userId === emp.id);
                                    return (
                                        <div key={emp.id} className="flex flex-col items-center group">
                                            <div className="relative mb-3">
                                                <div className="w-20 h-20 bg-slate-50 rounded-[1.8rem] border border-slate-100 flex items-center justify-center text-slate-300 font-black text-2xl shadow-inner group-hover:border-indigo-100 group-hover:bg-white group-hover:shadow-lg transition-all">
                                                    {emp.name.charAt(0)}
                                                </div>
                                                <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-4 border-white ${emp.status === 'ACTIVE' ? 'bg-emerald-500' : emp.status === 'AWAY' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                            </div>
                                            <p className="text-xs font-bold text-slate-900 truncate max-w-full px-2">{emp.name.split(' ')[0]}</p>
                                            <div className="flex flex-col items-center">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">{emp.role?.name || 'N/A'}</p>
                                                <p className="text-[9px] font-black text-indigo-500 tabular-nums">{stats?.activeHours || '0.00'}h Today</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Header Statistics - Desktop Only */}
                        <div className="hidden lg:grid grid-cols-4 gap-6">
                            {[
                                { label: 'Total Payroll', val: employees.reduce((sum, e) => sum + (payrollStats[e.id]?.total || 0), 0), icon: DollarSign, color: 'indigo' },
                                { label: 'Base Salaries', val: employees.reduce((sum, e) => sum + (payrollStats[e.id]?.basicSalary || 0), 0), icon: Wallet, color: 'slate' },
                                { label: 'Total Commissions', val: employees.reduce((sum, e) => sum + ((payrollStats[e.id]?.commissionService || 0) + (payrollStats[e.id]?.commissionSales || 0)), 0), icon: TrendingUp, color: 'emerald' },
                                { label: 'System Penalties', val: employees.reduce((sum, e) => sum + (payrollStats[e.id]?.penalties || 0), 0), icon: ShieldAlert, color: 'rose' },
                            ].map((stat, i) => (
                                <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-indigo-200 transition-all">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600`}>
                                            <stat.icon className="w-5 h-5" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                                    </div>
                                    <p className="text-2xl font-black text-slate-900 tabular-nums">Rp {stat.val.toLocaleString()}</p>
                                </div>
                            ))}
                        </div>

                        {/* Employee Payroll List */}
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Employee Ledger</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Periode: {new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</p>
                                </div>
                                <button className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95">
                                    Export CSV
                                </button>
                            </div>

                            {/* Desktop View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/30">
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Personnel</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Base Salary</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Commissions</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-rose-400 uppercase tracking-[0.15em]">Penalties</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-indigo-500 uppercase tracking-[0.15em]">Take Home Pay</th>
                                            <th className="px-8 py-5 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {employees.map((emp) => {
                                            const stats = payrollStats[emp.id] || { basicSalary: 0, commissionService: 0, commissionSales: 0, penalties: 0, total: 0 };
                                            return (
                                                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-500 border border-slate-200">
                                                                {emp.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-800 leading-none mb-1">{emp.name}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{emp.role?.name || 'Staff'}</p>
                                                                    {emp.baseShift && (
                                                                        <>
                                                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{emp.baseShift}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="text-sm font-bold text-slate-600 tabular-nums">Rp {stats.basicSalary.toLocaleString()}</p>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="text-sm font-black text-emerald-600 tabular-nums">
                                                            +Rp {(stats.commissionService + stats.commissionSales + (stats.commissionProduction || 0)).toLocaleString()}
                                                        </p>
                                                        {/* Per-category breakdown — dynamic */}
                                                        {((stats.salesBreakdown && Object.keys(stats.salesBreakdown).length > 0) || (stats.productionBreakdown && Object.keys(stats.productionBreakdown).length > 0)) && (
                                                            <div className="mt-2 space-y-0.5">
                                                                {/* Sales Breakdown (Waiters) */}
                                                                {stats.salesBreakdown && Object.entries(stats.salesBreakdown as Record<string, { volume: number; commission: number; percent: number }>).map(([cat, val]) => (
                                                                    (val.volume > 0 || val.percent > 0) && (
                                                                        <div key={`sales-${cat}`} className="flex items-center gap-2">
                                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate max-w-[70px]">{cat}</span>
                                                                            <span className="text-[9px] font-black text-emerald-500 tabular-nums whitespace-nowrap">+Rp {Math.round(val.commission).toLocaleString()}</span>
                                                                            <span className="text-[8px] text-slate-300 tabular-nums">({val.percent}%)</span>
                                                                        </div>
                                                                    )
                                                                ))}
                                                                {/* Production Breakdown (Kitchen/Bar) */}
                                                                {stats.productionBreakdown && Object.entries(stats.productionBreakdown as Record<string, { volume: number; commission: number; percent: number }>).map(([cat, val]) => (
                                                                    val.volume > 0 && (
                                                                        <div key={`prod-${cat}`} className="flex items-center gap-2">
                                                                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 truncate max-w-[70px]">{cat}</span>
                                                                            <span className="text-[9px] font-black text-emerald-500 tabular-nums whitespace-nowrap">+Rp {Math.round(val.commission).toLocaleString()}</span>
                                                                            <span className="text-[8px] text-slate-300 tabular-nums">(Prod)</span>
                                                                        </div>
                                                                    )
                                                                ))}
                                                                {stats.commissionService > 0 && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Billiard</span>
                                                                        <span className="text-[9px] font-black text-emerald-500 tabular-nums whitespace-nowrap">+Rp {Math.round(stats.commissionService).toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="text-sm font-black text-rose-500 tabular-nums">-Rp {stats.penalties.toLocaleString()}</p>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="text-lg font-black text-slate-900 tabular-nums">Rp {stats.total.toLocaleString()}</p>
                                                        <div className="flex items-center gap-3 mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                            <span className="flex items-center gap-1"><Hash className="w-2.5 h-2.5" /> {stats.totalSessions || 0} Sesi</span>
                                                            <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> {stats.activeDays || 0} Hari</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <button
                                                            onClick={() => fetchDetailedReport(emp)}
                                                            className="p-3 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-md active:scale-95"
                                                        >
                                                            <Activity className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View */}
                            <div className="md:hidden p-4 space-y-4">
                                {employees.map((emp) => {
                                    const stats = payrollStats[emp.id] || { basicSalary: 0, commissionService: 0, commissionSales: 0, penalties: 0, total: 0 };
                                    return (
                                        <div key={emp.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center font-black text-indigo-600">
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900">{emp.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{emp.role?.name || 'Staff'}</p>
                                                            {emp.baseShift && (
                                                                <>
                                                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{emp.baseShift}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => fetchDetailedReport(emp)}
                                                    className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center"
                                                >
                                                    <Activity className="w-5 h-5" />
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="p-4 bg-emerald-50/60 rounded-2xl">
                                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Earnings</p>
                                                    <p className="text-sm font-black text-emerald-600">+Rp {(stats.commissionService + stats.commissionSales + (stats.commissionProduction || 0)).toLocaleString()}</p>
                                                    {/* Per-category breakdown (mobile) */}
                                                    {((stats.salesBreakdown && Object.keys(stats.salesBreakdown).length > 0) || (stats.productionBreakdown && Object.keys(stats.productionBreakdown).length > 0)) && (
                                                        <div className="mt-2 pt-2 border-t border-emerald-100 space-y-1">
                                                            {/* Sales Breakdown (Waiters) */}
                                                            {stats.salesBreakdown && Object.entries(stats.salesBreakdown as Record<string, { volume: number; commission: number; percent: number }>).map(([cat, val]) => (
                                                                (val.volume > 0 || val.percent > 0) && (
                                                                    <div key={`sales-mob-${cat}`} className="flex items-center justify-between">
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{cat} <span className="text-slate-300">({val.percent}%)</span></span>
                                                                        <span className="text-[9px] font-black text-emerald-500 tabular-nums">+Rp {Math.round(val.commission).toLocaleString()}</span>
                                                                    </div>
                                                                )
                                                            ))}
                                                            {/* Production Breakdown (Kitchen/Bar) */}
                                                            {stats.productionBreakdown && Object.entries(stats.productionBreakdown as Record<string, { volume: number; commission: number; percent: number }>).map(([cat, val]) => (
                                                                val.volume > 0 && (
                                                                    <div key={`prod-mob-${cat}`} className="flex items-center justify-between">
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">{cat} <span className="text-amber-300/50">(Prod)</span></span>
                                                                        <span className="text-[9px] font-black text-emerald-500 tabular-nums">+Rp {Math.round(val.commission).toLocaleString()}</span>
                                                                    </div>
                                                                )
                                                            ))}
                                                            {stats.commissionService > 0 && (
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Billiard (Meja)</span>
                                                                    <span className="text-[9px] font-black text-emerald-500 tabular-nums">+Rp {Math.round(stats.commissionService).toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-4 bg-rose-50/60 rounded-2xl">
                                                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Deductions</p>
                                                    <p className="text-sm font-black text-rose-600">-Rp {stats.penalties.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                                        <span className="flex items-center gap-1"><Hash className="w-2 h-2" /> {stats.totalSessions || 0} SESI</span>
                                                        <span className="flex items-center gap-1"><Calendar className="w-2 h-2" /> {stats.activeDays || 0} HARI</span>
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">NET PAYABLE</p>
                                                    <p className="text-2xl font-black text-slate-900 leading-none tabular-nums">Rp {stats.total.toLocaleString()}</p>
                                                </div>
                                                <div className="text-[10px] font-black px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg uppercase tracking-widest">
                                                    Processed
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Role Modal */}
                {showRoleModal && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 overscroll-contain">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowRoleModal(false)} />
                        <form onSubmit={handleCreateRole} className="bg-white w-full max-w-[900px] h-[95vh] sm:h-[90vh] rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-full sm:zoom-in duration-300">
                            <div className="p-10 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                        {editingRole ? 'EDIT ROLE' : 'KONFIGURASI ROLE BARU'}
                                    </h2>
                                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Atur Hak Akses Berdasarkan Matrix Izin</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setShowRoleModal(false); setEditingRole(null); setNewRole({ name: '', permissions: [] }); }}
                                    className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Nama Jabatan / Role</label>
                                        <input
                                            type="text"
                                            placeholder="Misal: WAITRESS, KASIR, OWNER"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 px-8 text-xl font-black outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                                            value={newRole.name}
                                            onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Deskripsi Singkat</label>
                                        <textarea
                                            placeholder="Misal: Akses penuh untuk manajemen kasir..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-8 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300 h-[68px] resize-none"
                                            value={newRole.description}
                                            onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Pilih Template Akses Masal (Presets)</label>
                                    <div className="flex flex-wrap gap-3">
                                        {[
                                            { name: 'KASIR', label: 'Kasir (Full Billiard & Cafe)', color: 'bg-emerald-500', perms: ['DASHBOARD_VIEW', 'DASHBOARD_TABLE', 'START_TABLE', 'STOP_TABLE', 'CAFE_ORDER', 'CAFE_VIEW', 'BILLING_VIEW', 'PAYMENT_PROCESS', 'TABLE_MANAGE', 'BILLIARD_PRICING'] },
                                            { name: 'WAITER', label: 'Waiter (Order & Table)', color: 'bg-indigo-500', perms: ['DASHBOARD_VIEW', 'DASHBOARD_TABLE', 'START_TABLE', 'STOP_TABLE', 'CAFE_ORDER', 'CAFE_VIEW'] },
                                            { name: 'KITCHEN', label: 'Kitchen (KDS Only)', color: 'bg-orange-500', perms: ['ACCESS_KDS'] },
                                            { name: 'BARTENDER', label: 'Bartender (BDS Only)', color: 'bg-blue-500', perms: ['ACCESS_BDS'] },
                                            { name: 'INVENTORY', label: 'Logistik (Gudang)', color: 'bg-slate-700', perms: ['INV_VIEW', 'INV_MANAGE', 'SUPPLIER_MANAGE'] },
                                        ].map((tmpl) => (
                                            <button
                                                key={tmpl.name}
                                                type="button"
                                                onClick={() => setNewRole({ ...newRole, name: tmpl.name, permissions: tmpl.perms, description: tmpl.label })}
                                                className={`px-5 py-3 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 ${tmpl.color} hover:brightness-110 flex items-center gap-2`}
                                            >
                                                <Zap className="w-3 h-3" />
                                                {tmpl.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                        <Shield className="w-5 h-5 text-indigo-500" />
                                        Permission Checklist Matrix
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {PERMISSION_GROUPS.map((group) => (
                                            <div key={group.label} className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                                <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest">{group.label}</h4>
                                                <div className="space-y-3">
                                                    {group.permissions.map((perm) => (
                                                        <label key={perm.id} className="flex items-center gap-3 cursor-pointer group">
                                                            <div
                                                                onClick={() => togglePermission(perm.id)}
                                                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${newRole.permissions.includes(perm.id) ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-600/30 font-bold text-white' : 'bg-white border-slate-200 group-hover:border-indigo-300'}`}
                                                            >
                                                                {newRole.permissions.includes(perm.id) && <Check className="w-4 h-4" />}
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900">{perm.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 border-t border-slate-100 flex justify-end gap-4 bg-slate-50/50">
                                <button
                                    type="button"
                                    onClick={() => { setShowRoleModal(false); setEditingRole(null); setNewRole({ name: '', permissions: [] }); }}
                                    className="px-8 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={roleLoading || !newRole.name || newRole.permissions.length === 0}
                                    className={`bg-indigo-600 text-white px-10 py-3 rounded-xl font-black shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {roleLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {editingRole ? 'SIMPAN PERUBAHAN' : 'BUAT ROLE SEKARANG'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Register Modal */}
                {showRegisterModal && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 overscroll-contain">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setShowRegisterModal(false); resetRegisterForm(); }} />
                        <div className="bg-white w-full max-w-[1000px] h-[95vh] sm:h-[90vh] rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-full sm:zoom-in duration-300">
                            <div className="p-10 border-b border-slate-100">
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{editingEmployee ? 'EDIT DATA KARYAWAN' : 'REGISTRASI KARYAWAN'}</h2>
                                <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">{editingEmployee ? 'Perbarui Data Personal & Hak Akses' : 'Lengkapi Data Personal & Hak Akses'}</p>
                            </div>

                            <form onSubmit={handleRegister} className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/30">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    {/* Personal & Access Card */}
                                    <div className="space-y-8">
                                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500">
                                            <div className="flex items-center gap-4 mb-8">
                                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                                                    <Users className="w-6 h-6 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none mb-1">Identitas Karyawan</h3>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Authentication & Profile</p>
                                                </div>
                                            </div>

                                            <div className="space-y-5">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nama Lengkap</label>
                                                    <div className="relative group/input">
                                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-indigo-500 transition-colors">
                                                            <Users className="w-4 h-4" />
                                                        </div>
                                                        <input type="text" required placeholder="Nama asli sesuai identitas" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300" value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Username</label>
                                                        <div className="relative group/input">
                                                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-indigo-500 transition-colors">
                                                                <Monitor className="w-4 h-4" />
                                                            </div>
                                                            <input type="text" required placeholder="ID Login" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300" value={newEmployee.username} onChange={(e) => setNewEmployee({ ...newEmployee, username: e.target.value })} />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Password</label>
                                                        <div className="relative group/input">
                                                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-indigo-500 transition-colors">
                                                                <Power className="w-4 h-4" />
                                                            </div>
                                                            <input type="password" required={!editingEmployee} placeholder={editingEmployee ? "Tersimpan" : "Min 8 karakter"} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300" value={newEmployee.password} onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Jabatan & Hak Akses</label>
                                                        <div className="relative group/input">
                                                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-indigo-500 transition-colors">
                                                                <Shield className="w-4 h-4" />
                                                            </div>
                                                            <select required className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-10 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer" value={newEmployee.roleId} onChange={(e) => setNewEmployee({ ...newEmployee, roleId: e.target.value })}>
                                                                <option value="">Pilih Role Akses Sistem...</option>
                                                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Shift Kerja Utama</label>
                                                        <div className="relative group/input">
                                                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-indigo-500 transition-colors">
                                                                <Clock className="w-4 h-4" />
                                                            </div>
                                                            <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-10 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer" value={newEmployee.baseShift} onChange={(e) => setNewEmployee({ ...newEmployee, baseShift: e.target.value })}>
                                                                <option value="">None (Freelance/Other)</option>
                                                                {availableShifts.map(s => (
                                                                    <option key={s.name} value={s.name}>{s.name} ({s.startTime} - {s.endTime})</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/5 blur-[50px] rounded-full" />
                                        </div>

                                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                                    <Activity className="w-6 h-6 text-indigo-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black uppercase tracking-widest leading-none mb-1 text-white">Security Policy</h3>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Idle Monitoring Control</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Batas Idle (Menit)</label>
                                                    <div className="relative group/input">
                                                        <input type="number" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 font-bold text-white outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all tabular-nums" value={newEmployee.idleThreshold} onChange={(e) => setNewEmployee({ ...newEmployee, idleThreshold: e.target.value === '' ? '' : +e.target.value } as any)} />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] ml-2">Denda (Rp/Sesi)</label>
                                                    <div className="relative group/input">
                                                        <input type="number" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 font-bold text-rose-400 outline-none focus:ring-4 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all tabular-nums" value={newEmployee.penaltyIdle} onChange={(e) => setNewEmployee({ ...newEmployee, penaltyIdle: e.target.value === '' ? '' : +e.target.value } as any)} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                                                <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic">
                                                    "Sistem akan memotong saldo komisi setiap kali user melampaui batas idle yang ditentukan secara otomatis."
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Financial & Compensation Card */}
                                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                                                <DollarSign className="w-6 h-6 text-emerald-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none mb-1">Financial Structure</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base Salary & Commissions</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Gaji Pokok Utama</label>
                                                <div className="relative group/input">
                                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">Rp</div>
                                                    <input type="number" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 pl-14 pr-6 text-xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all tabular-nums" value={newEmployee.basicSalary} onChange={(e) => setNewEmployee({ ...newEmployee, basicSalary: e.target.value === '' ? '' : +e.target.value } as any)} />
                                                </div>
                                            </div>

                                            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-6">
                                                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-3">Bonus & Service Multipliers</h4>

                                                <div className="grid grid-cols-1 gap-5">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Uang Lembur (Rate/Jam)</label>
                                                        <input type="number" className="w-full bg-white border border-slate-200 rounded-xl py-3 px-5 font-bold outline-none focus:border-indigo-500 transition-all tabular-nums" value={newEmployee.overtimeRate} onChange={(e) => setNewEmployee({ ...newEmployee, overtimeRate: e.target.value === '' ? '' : +e.target.value } as any)} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Insentif Per Meja (Billiard)</label>
                                                        <input type="number" className="w-full bg-white border border-slate-200 rounded-xl py-3 px-5 font-bold outline-none focus:border-indigo-500 transition-all tabular-nums" value={newEmployee.commissionService} onChange={(e) => setNewEmployee({ ...newEmployee, commissionService: e.target.value === '' ? '' : +e.target.value } as any)} />
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">General Revenue Share (%)</label>
                                                            <div className="relative">
                                                                <input type="number" className="w-full bg-white border border-slate-200 rounded-xl py-3 px-5 font-bold outline-none focus:border-indigo-500 transition-all tabular-nums" value={newEmployee.commissionSalesPercent} onChange={(e) => setNewEmployee({ ...newEmployee, commissionSalesPercent: e.target.value === '' ? '' : +e.target.value } as any)} />
                                                                <div className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-300">%</div>
                                                            </div>
                                                            <p className="text-[9px] text-slate-400 ml-2 italic">Digunakan jika kategori menu tidak diatur khusus di bawah.</p>
                                                        </div>

                                                        {categories.length > 0 && (
                                                            <div className="pt-4 border-t border-slate-200 space-y-4">
                                                                <h5 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-2">Breakdown Per Kategori</h5>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    {categories.map(cat => (
                                                                        <div key={cat} className="space-y-2">
                                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 leading-tight">{cat} (%)</label>
                                                                            <div className="relative">
                                                                                <input
                                                                                    type="number"
                                                                                    className="w-full bg-white border border-slate-200 rounded-xl py-3 px-5 font-bold outline-none focus:border-indigo-500 transition-all tabular-nums"
                                                                                    value={newEmployee.categoryCommissions[cat] ?? ''}
                                                                                    placeholder={`${newEmployee.commissionSalesPercent}%`}
                                                                                    onChange={(e) => {
                                                                                        const val = e.target.value === '' ? '' : +e.target.value;
                                                                                        setNewEmployee({
                                                                                            ...newEmployee,
                                                                                            categoryCommissions: {
                                                                                                ...newEmployee.categoryCommissions,
                                                                                                [cat]: val
                                                                                            }
                                                                                        } as any)
                                                                                    }}
                                                                                />
                                                                                <div className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-300 text-[10px]">%</div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-emerald-500/5 blur-[60px] rounded-full" />
                                    </div>
                                </div>
                            </form>

                            {/* Modal Footer Acts */}
                            <div className="px-12 py-8 border-t border-slate-100 flex justify-between items-center bg-white">
                                <div>
                                    {editingEmployee && (
                                        <button
                                            type="button"
                                            onClick={handleDeleteEmployee}
                                            className="px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-rose-500 hover:bg-rose-50 border-2 border-rose-50 transition-all flex items-center gap-3 group"
                                        >
                                            <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                            Hapus Unit
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => { setShowRegisterModal(false); resetRegisterForm(); }}
                                        className="px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all"
                                    >
                                        Dismiss
                                    </button>
                                    <button
                                        type="submit"
                                        onClick={handleRegister}
                                        className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:bg-indigo-600 active:scale-95 transition-all flex items-center gap-3"
                                    >
                                        <Save className="w-4 h-4" />
                                        {editingEmployee ? 'Update Profile' : 'Deploy Account'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Detailed Payroll Audit Modal */}
                {showDetailedModal && selectedDetailedEmployee && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overscroll-contain">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowDetailedModal(false)} />
                        <div className="relative w-full max-w-6xl bg-white rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
                            {/* Header */}
                            <div className="px-12 py-8 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">
                                            {selectedDetailedEmployee.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black tracking-tight">{selectedDetailedEmployee.name}</h2>
                                            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">Detailed Operational Ledger • USR-0{selectedDetailedEmployee.id}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4 relative z-10 no-print">
                                    <button
                                        onClick={() => window.print()}
                                        className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/10 flex items-center gap-2"
                                    >
                                        <DollarSign className="w-4 h-4" />
                                        Print Audit Report
                                    </button>
                                    <button onClick={() => setShowDetailedModal(false)} className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all border border-white/10">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full" />
                            </div>

                            {/* Tabs */}
                            <div className="px-12 py-4 bg-slate-50 border-b border-slate-200 flex gap-8">
                                {[
                                    { id: 'status', label: 'Shift & Activity', icon: Clock },
                                    { id: 'sales', label: 'Sales Ledger', icon: DollarSign },
                                    { id: 'production', label: 'Production Ledger', icon: Coffee },
                                    { id: 'penalties', label: 'Penalty Ledger', icon: AlertTriangle },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setDetailedTab(tab.id as any)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${detailedTab === tab.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200 font-black scale-105' : 'text-slate-400 font-bold hover:text-slate-600'}`}
                                    >
                                        <tab.icon className="w-4 h-4" />
                                        <span className="text-xs uppercase tracking-widest">{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                                {detailedLoading ? (
                                    <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                                        <RefreshCw className="w-12 h-12 animate-spin mb-4 text-indigo-500/20" />
                                        <p className="text-xs font-black uppercase tracking-widest">Compiling Operational Data...</p>
                                    </div>
                                ) : detailedReport ? (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        {/* Performance Overview in Ledger */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {[
                                                { label: 'Total Sales Revenue', val: detailedReport.salesLedger.reduce((sum, item) => sum + item.total, 0), icon: DollarSign, color: 'emerald', prefix: 'Rp ' },
                                                { label: 'Prod. Commission', val: (detailedReport.productionLedger || []).reduce((sum, item) => sum + (item.commissionAmount || 0), 0), icon: Zap, color: 'amber', prefix: 'Rp ' },
                                                { label: 'Incident Penalties', val: detailedReport.penaltyLedger.reduce((sum, item) => sum + item.penaltyAmount, 0), icon: AlertTriangle, color: 'rose', prefix: 'Rp ' },
                                            ].map((stat, i) => (
                                                <div key={i} className={`bg-${stat.color}-50/50 border border-${stat.color}-100 p-6 rounded-[2rem] flex items-center gap-4`}>
                                                    <div className={`w-12 h-12 bg-${stat.color}-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-${stat.color}-600/20`}>
                                                        <stat.icon className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className={`text-[10px] font-black text-${stat.color}-600 uppercase tracking-widest leading-none mb-1.5`}>{stat.label}</p>
                                                        <p className="text-xl font-black text-slate-900 tabular-nums">{stat.prefix}{stat.val.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {detailedTab === 'status' && (
                                            <div className="space-y-12">
                                                {/* Daily Summary Aggregate */}
                                                <div className="space-y-6">
                                                    <h3 className="text-xl font-black text-slate-900 px-2 flex items-center gap-3">
                                                        <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                                                        Daily Activity Aggregation
                                                    </h3>
                                                    <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                                                        <table className="w-full text-left">
                                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                                <tr>
                                                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Operating Date</th>
                                                                    <th className="px-8 py-5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Hours</th>
                                                                    <th className="px-8 py-5 text-[10px] font-black text-amber-600 uppercase tracking-widest">Away Hours</th>
                                                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Offline Hours</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {detailedReport.dailySummary.map(day => (
                                                                    <tr key={day.date} className="hover:bg-slate-50/50 transition-colors">
                                                                        <td className="px-8 py-5">
                                                                            <p className="text-xs font-black text-slate-900">{new Date(day.date).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                                                        </td>
                                                                        <td className="px-8 py-5">
                                                                            <p className="text-sm font-black text-emerald-600 tabular-nums">
                                                                                {Math.floor(day.active / 3600)}h {Math.floor((day.active % 3600) / 60)}m
                                                                            </p>
                                                                        </td>
                                                                        <td className="px-8 py-5">
                                                                            <p className="text-sm font-black text-amber-600 tabular-nums">
                                                                                {Math.floor(day.away / 3600)}h {Math.floor((day.away % 3600) / 60)}m
                                                                            </p>
                                                                        </td>
                                                                        <td className="px-8 py-5 text-slate-400">
                                                                            <p className="text-xs font-bold tabular-nums">
                                                                                {Math.floor(day.offline / 3600)}h {Math.floor((day.offline % 3600) / 60)}m
                                                                            </p>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                <div className="space-y-6 pt-6 border-t border-slate-100">
                                                    <h3 className="text-xl font-black text-slate-900 px-2 flex items-center gap-3">
                                                        <div className="w-2 h-8 bg-slate-900 rounded-full" />
                                                        Raw Status Timeline
                                                    </h3>
                                                    <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                                                        <table className="w-full text-left">
                                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                                <tr>
                                                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Time</th>
                                                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Transition</th>
                                                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {detailedReport.statusLogs.map(log => (
                                                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                                        <td className="px-8 py-4">
                                                                            <p className="text-xs font-black text-slate-700">{new Date(log.startedAt).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
                                                                            <p className="text-[10px] text-slate-400 font-bold tabular-nums">Started: {new Date(log.startedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                                                        </td>
                                                                        <td className="px-8 py-4">
                                                                            <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${log.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : log.status === 'AWAY' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                                                                {log.status}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-8 py-4">
                                                                            <p className="text-sm font-black text-slate-900 tabular-nums">
                                                                                {log.durationSeconds > 0 ? `${Math.floor(log.durationSeconds / 60)} Menit ${log.durationSeconds % 60} Detik` : 'Running...'}
                                                                            </p>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {detailedTab === 'sales' && (
                                            <div className="space-y-6">
                                                <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                                                    <table className="w-full text-left">
                                                        <thead className="bg-slate-50 border-b border-slate-200">
                                                            <tr>
                                                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Description</th>
                                                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Table</th>
                                                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Revenue</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {detailedReport.salesLedger.map(entry => (
                                                                <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className="px-8 py-6">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600">
                                                                                {entry.itemName.charAt(0)}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm font-black text-slate-900 leading-none mb-1">{entry.itemName}</p>
                                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{entry.category} • {new Date(entry.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-6">
                                                                        <span className="bg-slate-100/50 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200/50">
                                                                            {entry.tableName}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-8 py-6 text-right">
                                                                        <p className="text-sm font-black text-slate-900 tabular-nums">Rp {entry.total.toLocaleString()}</p>
                                                                        <div className="flex flex-col items-end gap-1">
                                                                            <p className="text-[10px] font-bold text-slate-400 italic">Share: {entry.commissionPercent}% (+Rp {Math.round(entry.commissionAmount).toLocaleString()})</p>
                                                                            <p className="text-[10px] font-bold text-slate-400">{entry.quantity} x Rp {entry.price.toLocaleString()}</p>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {detailedTab === 'production' && (
                                            <div className="space-y-6">
                                                <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                                                    <table className="w-full text-left">
                                                        <thead className="bg-slate-50 border-b border-slate-200">
                                                            <tr>
                                                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Prepped Item</th>
                                                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Table</th>
                                                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Production Share</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {(detailedReport.productionLedger || []).map(entry => (
                                                                <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className="px-8 py-6">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-[10px] font-black text-amber-600">
                                                                                {entry.itemName.charAt(0)}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm font-black text-slate-900 leading-none mb-1">{entry.itemName}</p>
                                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{entry.category} • {new Date(entry.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-6">
                                                                        <span className="bg-slate-100/50 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200/50">
                                                                            {entry.tableName}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-8 py-6 text-right">
                                                                        <p className="text-sm font-black text-amber-600 tabular-nums">+ Rp {Math.round(entry.commissionAmount).toLocaleString()}</p>
                                                                        <div className="flex flex-col items-end gap-1">
                                                                            <p className="text-[10px] font-bold text-slate-400 italic">{entry.commissionPercent}% of Rp {entry.total.toLocaleString()}</p>
                                                                            <p className="text-[10px] font-bold text-slate-400">Qty: {entry.quantity}</p>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {detailedTab === 'penalties' && (
                                            <div className="space-y-6">
                                                <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                                                    <table className="w-full text-left">
                                                        <thead className="bg-slate-50 border-b border-slate-200">
                                                            <tr>
                                                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Incident History</th>
                                                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason / Description</th>
                                                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Deduction</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {detailedReport.penaltyLedger.map(v => (
                                                                <tr key={v.id} className="hover:bg-rose-50/20 transition-colors">
                                                                    <td className="px-8 py-6">
                                                                        <p className="text-xs font-black text-slate-900 mb-1">{v.type.replace('_', ' ')}</p>
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(v.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} • {new Date(v.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                                                    </td>
                                                                    <td className="px-8 py-6">
                                                                        <p className="text-xs text-slate-500 font-medium max-w-md">{v.description}</p>
                                                                    </td>
                                                                    <td className="px-8 py-6 text-right">
                                                                        <p className="text-sm font-black text-rose-600 tabular-nums">- Rp {Number(v.penaltyAmount).toLocaleString()}</p>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
                                            <Activity className="w-8 h-8 opacity-20" />
                                        </div>
                                        <p className="text-xs font-black uppercase tracking-widest">No Operational Data Available</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-12 py-8 border-t border-slate-100 flex justify-end bg-slate-50">
                                <button
                                    onClick={() => setShowDetailedModal(false)}
                                    className="px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-200 transition-all border-2 border-slate-100"
                                >
                                    Close Ledger
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <style jsx global>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .fixed.inset-0.z-\\[100\\], .fixed.inset-0.z-\\[100\\] * {
                            visibility: visible;
                        }
                        .fixed.inset-0.z-\\[100\\] {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: auto;
                            display: block !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                        .max-h-\\[90vh\\] {
                            max-height: none !important;
                        }
                        .overflow-y-auto {
                            overflow: visible !important;
                        }
                        .bg-slate-900\\/40 {
                            display: none !important;
                        }
                        .shadow-2xl {
                            shadow: none !important;
                        }
                        .rounded-\\[3rem\\] {
                            border-radius: 0 !important;
                        }
                    }
                `}</style>
            </div>
        </div >
    );
}
