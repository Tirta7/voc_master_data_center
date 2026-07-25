"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
    Users,
    UserPlus,
    Shield,
    Activity,
    DollarSign,
    Search,
    Filter,
    Plus,
    Save,
    X,
    Check,
    Trash2,
    Power,
    AlertTriangle,
    Monitor,
    Clock,
    ChevronRight,
    Edit2,
    RefreshCw,
    Wallet,
    TrendingUp,
    ShieldAlert,
    Calendar,
    Lock,
    Unlock,
    Mail,
    Hash,
    Zap,
    Coffee,
    Fingerprint,
    CheckCircle2,
    Key,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useMqtt } from "@/context/MqttContext";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";
import { useToast } from "@/components/ui/ToastProvider";
import { socket } from "@/lib/socket";
import { PERMISSION_GROUPS } from "@/constants/permissions";
import { BiometricModal } from "./components/BiometricModal";
import { DetailedPayrollAuditModal } from "./components/DetailedPayrollAuditModal";
import { ViolationModal, ViolationType } from "./components/ViolationModal";
import { RegisterModal } from "./components/RegisterModal";
import { RoleModal } from "./components/RoleModal";
import { ImportExcelEmployeeModal } from "./components/ImportExcelEmployeeModal";
import { EmployeeTable } from "./components/EmployeeTable";
import { EmployeeMobileList } from "./components/EmployeeMobileList";
import * as xlsx from "xlsx";

import { getApiUrl } from '@/utils/urlUtils';
const API_URL = `${getApiUrl()}/api`;

const fmt = (n: any) => {
    const val = Math.round(Number(n || 0));
    return `Rp ${val.toLocaleString("id-ID")}`;
};
const fmtPct = (n: any) => {
    const val = Number(n || 0);
    return `${val % 1 === 0 ? val : val.toFixed(1)}%`;
};
const fmtK = (n: number) => fmt(n);


interface Role {
    id: number;
    name: string;
    permissions: string[];
    description?: string;
    approvalLevel?: number;
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
    penaltyLateRate: number;
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
    baseShift?: string;
    phone?: string;
    jobTitle?: string;
    gender?: string;
    address?: string;
    currentActivePage?: string;
    fingerprintData?: string;
    rfid?: string;
    securityMode?: "RFID_ONLY" | "FINGERPRINT_ONLY" | "HYBRID" | "DUAL";
    isVerified?: boolean;
}

interface MonitoringSummary {
    userId: number;
    name: string;
    status: string;
    currentActivePage?: string;
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

const formatTime = (seconds: number) => {
    if (!seconds || seconds === 0) return "0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

const timeSince = (date: string) => {
    const seconds = Math.floor(
        (new Date().getTime() - new Date(date).getTime()) / 1000,
    );
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
};

const getPageName = (path: string) => {
    if (!path) return "Offline";
    if (path === "_OUTSIDE_APP_") return "⚠️ PINDAH APLIKASI (WA/IG/DLL)";
    if (path === "/admin/dashboard") return "Dashboard";
    if (path.includes("/admin/tables")) return "Billing Meja";
    if (path.includes("/admin/finance")) return "Keuangan";
    if (path.includes("/admin/inventory")) return "Inventori";
    if (path.includes("/admin/employees")) return "SDM / Monitoring";
    if (path.includes("/admin/reports")) return "Laporan";
    if (path.includes("/admin/settings")) return "Settings";
    if (path.includes("/admin/members")) return "Membership";
    if (path === "/kds") return "Kitchen Screen";
    if (path === "/bartender") return "Bartender Screen";
    if (path.includes("/admin/closing")) return "Closing Day";
    if (path.includes("/admin/waiter-assignments")) return "Waitress Assign";
    if (path.includes("/cafe")) return "Cafe Menu";
    return path.split("/").pop()?.toUpperCase() || "Navigating";
};

export default function EmployeePage() {
    const { hasPermission, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const { subscribe, publish } = useMqtt();
    const [activeTab, setActiveTab] = useState<
        "employees" | "roles" | "monitoring" | "payroll"
    >("employees");
    const [employees, setEmployees] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showImportEmployeeModal, setShowImportEmployeeModal] = useState(false);
    const [availableShifts, setAvailableShifts] = useState<
        { name: string; startTime: string; endTime: string }[]
    >([]);
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [roleLoading, setRoleLoading] = useState(false);
    const [payrollStats, setPayrollStats] = useState<Record<number, any>>({});
    const [violations, setViolations] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedDetailedEmployee, setSelectedDetailedEmployee] =
        useState<User | null>(null);
    const [detailedReport, setDetailedReport] = useState<DetailedReport | null>(
        null,
    );
    const [detailedLoading, setDetailedLoading] = useState(false);
    const [showDetailedModal, setShowDetailedModal] = useState(false);
    const [detailedTab, setDetailedTab] = useState<
        "status" | "sales" | "production" | "penalties"
    >("status");
    const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [monitoringSummary, setMonitoringSummary] = useState<
        MonitoringSummary[]
    >([]);
    const [stats, setStats] = useState<any>({}); // Added stats state as per instruction's fetchData snippet
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [employeeStatusFilter, setEmployeeStatusFilter] = useState<
        "ALL" | "ACTIVE" | "AWAY" | "OFFLINE"
    >("ALL");
    const [pendingAttendances, setPendingAttendances] = useState<any[]>([]);

    // Biometric Enrollment States
    const [showBiometricModal, setShowBiometricModal] = useState(false);
    const [biometricScanning, setBiometricScanning] = useState(false);
    const [biometricStep, setBiometricStep] = useState(0);
    const [biometricProgress, setBiometricProgress] = useState(0);
    const [biometricInstruction, setBiometricInstruction] = useState(
        "Siap Memulai Pemindaian",
    );
    const [biometricData, setBiometricData] = useState<string | null>(null);

    // RFID Enrollment States
    const [isScanningRFID, setIsScanningRFID] = useState(false);
    const registrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useBodyScrollLock(showRegisterModal || showRoleModal || showDetailedModal || showImportEmployeeModal);

    // Tab Permission Matrix
    const tabPermissions: Record<string, string> = {
        employees: "USER_MANAGE",
        roles: "USER_ROLE",
        monitoring: "USER_MONITOR",
        payroll: "PAYROLL_VIEW",
    };

    // Auto-switch to first available tab if activeTab is not allowed
    useEffect(() => {
        if (!authLoading && !hasPermission(tabPermissions[activeTab])) {
            const firstAvailable = Object.keys(tabPermissions).find((tab) =>
                hasPermission(tabPermissions[tab]),
            );
            if (firstAvailable) {
                setActiveTab(firstAvailable as any);
            }
        }
    }, [authLoading, hasPermission, activeTab]);

    // Form States
    const [newEmployee, setNewEmployee] = useState({
        name: "",
        username: "",
        password: "",
        email: "",
        pin: "",
        rfid: "",
        phone: "",
        roleId: "",
        basicSalary: 0,
        overtimeRate: 0,
        commissionService: 0,
        commissionSalesPercent: 0,
        categoryCommissions: {} as Record<string, number>,
        penaltyIdle: 5000,
        idleThreshold: 5,
        penaltyLate: 0,
        baseShift: "", // Added baseShift to newEmployee state
        fingerprintData: "",
        securityMode: "HYBRID" as
            | "RFID_ONLY"
            | "FINGERPRINT_ONLY"
            | "HYBRID"
            | "DUAL",
        isVerified: true,
    });

    const [showViolationModal, setShowViolationModal] = useState(false);
    const [manualViolation, setManualViolation] = useState({
        userId: 0,
        userName: "",
        type: "MANUAL_PENALTY" as ViolationType,
        description: "",
        penaltyAmount: 0,
        durationMinutes: 0,
    });
    const [newRole, setNewRole] = useState<{
        name: string;
        permissions: string[];
        description?: string;
        approvalLevel?: number;
    }>({
        name: "",
        permissions: [] as string[],
        description: "",
        approvalLevel: 0,
    });
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchData = useCallback(async (silent = false) => {
        // Only show full skeleton on first load — silent=true for background refreshes
        if (!silent) setLoading(true);
        try {
            const [
                empRes,
                rolesRes,
                monRes,
                settingsRes,
                violRes,
                catRes,
                payrollRes,
                pendingRes,
            ] = await Promise.all([
                axios.get(`/users/employees`),
                axios.get(`/users/roles`),
                axios.get(`/users/monitoring-summary`),
                axios.get(`/settings`),
                axios.get(`/users/violations`),
                axios.get(`/cafe/categories`),
                axios.get(
                    `/users/employees/payroll/bulk?month=${selectedMonth}&year=${selectedYear}`,
                ),
                axios.get(`/attendance/pending`),
            ]);
            setEmployees(empRes.data);
            setRoles(rolesRes.data);
            setMonitoringSummary(monRes.data);
            setAvailableShifts(settingsRes.data.availableShifts || []);
            setViolations(violRes.data);
            setCategories(catRes.data);
            setPayrollStats(payrollRes.data);
            setPendingAttendances(pendingRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    // Lightweight refresh — only fetch categories (called on modal open)
    const fetchCategories = async () => {
        try {
            const catRes = await axios.get(`/cafe/categories`);
            setCategories(catRes.data);
        } catch (error) {
            console.error("Failed to refresh categories", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData, selectedMonth, selectedYear]);

    // Real-time synchronization for Payroll & Monitoring
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const handleUpdate = () => {
            // Debounce refresh to 2 seconds to avoid API spam during burst updates
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                fetchData(true); // silent=true: no skeleton blink on background refresh
            }, 2000);
        };

        const handleUserStatusUpdate = (e: any) => {
            const { userId, status } = e.detail;
            const now = new Date().toISOString();
            setEmployees((prev) =>
                prev.map((emp) =>
                    emp.id === userId ? { ...emp, status, lastSeen: now } : emp,
                ),
            );
            // Trigger debounced full refresh (violations, counts, etc)
            handleUpdate();
        };

        const handleUserPageChange = (e: any) => {
            const { userId, page } = e.detail || e;
            setEmployees((prev) =>
                prev.map((emp) =>
                    emp.id === userId
                        ? { ...emp, status: "ACTIVE", currentActivePage: page }
                        : emp,
                ),
            );
            // Update summary locally for zero-latency feel
            setMonitoringSummary((prev) =>
                prev.map((s) =>
                    s.userId === userId
                        ? { ...s, status: "ACTIVE", currentActivePage: page }
                        : s,
                ),
            );
            // Schedule background sync
            handleUpdate();
        };

        const handleCommissionUpdate = (data: { userId: number }) => {
            // High priority refresh for a specific user's payroll
            axios
                .get(
                    `/users/${data.userId}/payroll?month=${selectedMonth}&year=${selectedYear}`,
                )
                .then((res) => {
                    setPayrollStats((prev) => ({ ...prev, [data.userId]: res.data }));
                });
        };

        const handleAttendanceUpdate = (payload: any) => {
            // Handle RFID Registration Mode from Socket/Backend
            if (payload.type === "RFID_REGISTRATION_MODE" && isScanningRFID) {
                const uid = payload.data?.uid;
                if (uid) {
                    setNewEmployee((prev) => ({ ...prev, rfid: uid }));
                    setIsScanningRFID(false);
                    if (registrationIntervalRef.current) {
                        clearInterval(registrationIntervalRef.current);
                        registrationIntervalRef.current = null;
                    }
                    showToast(
                        "RFID Terdeteksi",
                        `Kartu ${uid} berhasil dikaitkan (via Server).`,
                        "success",
                    );
                    publish("billiard/attendance/feedback", {
                        name: "KARTU TERBACA",
                        status: uid,
                        msg: "SUCCESS",
                    });
                }
            }
            handleUpdate();
        };

        const handleBiometricData = (payload: any) => {
            if (
                payload.type === "FINGERPRINT_PROGRESS" ||
                payload.type === "CAPTURE_PROGRESS"
            ) {
                setBiometricStep(payload.step);
                setBiometricInstruction(payload.instruction || "Memproses...");
                setBiometricProgress(payload.progress || payload.step * 20);
            } else if (
                payload.type === "FINGERPRINT_DATA_UPLOAD" ||
                payload.type === "CAPTURE_SUCCESS"
            ) {
                const data =
                    payload.data?.uid || payload.fingerprintData || payload.data;
                setBiometricData(data);

                if (payload.total && payload.current < payload.total) {
                    setBiometricInstruction(
                        `Berhasil (${payload.current}/${payload.total}). Siapkan sudut berikutnya...`,
                    );
                    setBiometricProgress((payload.current / payload.total) * 100);
                } else if (!payload.total) {
                    setBiometricScanning(false);
                    setBiometricProgress(100);
                    setBiometricInstruction("Pemindaian Selesai! Data Terverifikasi.");
                }

                setNewEmployee((prev) => {
                    const current = prev.fingerprintData || "";
                    // Extract just the ID number if it's in FINGER_XX format
                    const hardwareId = data.includes("FINGER_") ? data.split("_")[1] : data;

                    if (current.split(",").includes(hardwareId))
                        return prev;
                    const updated = current ? `${current},${hardwareId}` : hardwareId;
                    return { ...prev, fingerprintData: updated };
                });

                showToast("Biometrik", "Data sidik jari berhasil ditambahkan!", "success");
            } else if (payload.type === "BATCH_COMPLETE") {
                setBiometricScanning(false);
                setBiometricProgress(100);
                setBiometricInstruction("Semua Template Berhasil Disimpan!");
                showToast("Turbo Mode", "Pendaftaran borongan selesai.", "success");
            } else if (payload.type === "CAPTURE_ERROR") {
                setBiometricScanning(false);
                setBiometricInstruction("Gagal: " + payload.message);
                showToast("Gagal", payload.message, "error");
            }
        };

        const handleRawRfidScan = (data: any) => {
            if (!isScanningRFID) return;
            try {
                const payload = typeof data === "string" ? JSON.parse(data) : data;
                const uid = payload.uid || payload.data?.uid;
                if (uid) {
                    setNewEmployee((prev) => ({ ...prev, rfid: uid }));
                    setIsScanningRFID(false);
                    if (registrationIntervalRef.current) {
                        clearInterval(registrationIntervalRef.current);
                        registrationIntervalRef.current = null;
                    }
                    showToast(
                        "RFID Terdeteksi",
                        `Kartu ${uid} berhasil disalin (Direct).`,
                        "success",
                    );
                    publish("billiard/attendance/feedback", {
                        name: "KARTU TERBACA",
                        status: uid,
                        msg: "DONE",
                    });
                }
            } catch (e) {
                console.error("RFID Scan Parse Error:", e);
            }
        };

        const unsubs = [
            subscribe("billiard/tables/update", handleUpdate),
            subscribe("billiard/order/update", handleUpdate),
            subscribe("billiard/finance/transaction", handleUpdate),
            subscribe("billiard/user/+/violation", handleUpdate),
            subscribe("billiard/employee/update", handleUpdate),
            subscribe("billiard/role/update", handleUpdate),
            subscribe("billiard/user/+/commission", handleCommissionUpdate),
            subscribe("attendance/pending/update", handleUpdate),
            subscribe("billiard/attendance/raw_scan", handleRawRfidScan),
            subscribe("billiard/attendance/scan", handleRawRfidScan),
        ];

        window.addEventListener("userStatusUpdate", handleUserStatusUpdate);
        socket.on("tableUpdate", handleUpdate);
        socket.on("employee_updated", handleUpdate);
        socket.on("role_updated", handleUpdate);
        socket.on("commission_updated", handleCommissionUpdate);
        socket.on("attendance_updated", handleAttendanceUpdate);
        socket.on("attendance-updated", handleAttendanceUpdate);
        socket.on("biometric_data", handleBiometricData);
        socket.on("user_page_change", handleUserPageChange);
        socket.on("user_status_update", handleUpdate);

        return () => {
            clearTimeout(timeoutId);
            unsubs.forEach((u) => u());
            window.removeEventListener("userStatusUpdate", handleUserStatusUpdate);
            socket.off("tableUpdate", handleUpdate);
            socket.off("employee_updated", handleUpdate);
            socket.off("role_updated", handleUpdate);
            socket.off("commission_updated", handleCommissionUpdate);
            socket.off("attendance_updated", handleAttendanceUpdate);
            socket.off("attendance-updated", handleAttendanceUpdate);
            socket.off("user_page_change", handleUserPageChange);
            socket.off("user_status_update", handleUpdate);
            socket.off("biometric_data", handleBiometricData);
        };
    }, [
        fetchData,
        subscribe,
        selectedMonth,
        selectedYear,
        isScanningRFID,
        publish,
    ]);

    const resetRegisterForm = () => {
        setEditingEmployee(null);
        setNewEmployee({
            name: "",
            username: "",
            password: "",
            email: "",
            pin: "",
            rfid: "",
            phone: "",
            roleId: "",
            basicSalary: 0,
            overtimeRate: 0,
            commissionService: 0,
            commissionSalesPercent: 0,
            categoryCommissions: {},
            penaltyIdle: 5000,
            idleThreshold: 5,
            penaltyLate: 0,
            baseShift: "",
            fingerprintData: "",
            securityMode: "HYBRID",
            isVerified: true,
        });
    };

    const fetchDetailedReport = async (emp: User) => {
        setSelectedDetailedEmployee(emp);
        setDetailedLoading(true);
        setShowDetailedModal(true);
        try {
            const res = await axios.get(`/users/${emp.id}/payroll/detailed`);
            setDetailedReport(res.data);
        } catch (error) {
            console.error("Failed to fetch detailed report");
        } finally {
            setDetailedLoading(false);
        }
    };

    const handleCloseRegisterModal = async () => {
        try {
            await axios.post(`${API_URL}/attendance/command`, {
                type: "RESET_DEVICE",
                userId: "0",
            });
        } catch (e) {
            console.error("Failed to reset device on close:", e);
        }
        setShowRegisterModal(false);
        resetRegisterForm();
    };

    const handleCancelScan = async () => {
        // 1. Hentikan Loop Sinyal (Penting agar tidak terbuka lagi)
        if (registrationIntervalRef.current) {
            clearInterval(registrationIntervalRef.current);
            registrationIntervalRef.current = null;
        }

        try {
            // 2. Kirim sinyal RESET ke hardware
            await axios.post(`${API_URL}/attendance/command`, {
                type: "RESET_DEVICE",
                userId: "0",
            });
            setIsScanningRFID(false);
            showToast("Dibatalkan", "Proses pemindaian dihentikan", "info");
        } catch (error) {
            console.error("Gagal membatalkan scan:", error);
            setIsScanningRFID(false);
            showToast("Gagal", "Gagal mengirim perintah batal ke hardware", "error");
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...newEmployee,
                roleId: String(newEmployee.roleId) === "" ? null : Number(newEmployee.roleId),
                basicSalary: String(newEmployee.basicSalary) === "" ? 0 : Number(newEmployee.basicSalary),
                overtimeRate: String(newEmployee.overtimeRate) === "" ? 0 : Number(newEmployee.overtimeRate),
                commissionService: String(newEmployee.commissionService) === "" ? 0 : Number(newEmployee.commissionService),
                commissionSalesPercent: String(newEmployee.commissionSalesPercent) === "" ? 0 : Number(newEmployee.commissionSalesPercent),
                penaltyIdle: String(newEmployee.penaltyIdle) === "" ? 0 : Number(newEmployee.penaltyIdle),
                idleThreshold: String(newEmployee.idleThreshold) === "" ? 0 : Number(newEmployee.idleThreshold),
                penaltyLate: String(newEmployee.penaltyLate) === "" ? 0 : Number(newEmployee.penaltyLate)
            };

            if (editingEmployee) {
                await axios.patch(
                    `/users/employees/${editingEmployee.id}`,
                    payload,
                );
            } else {
                await axios.post(`/users/employees`, payload);
            }
            setShowRegisterModal(false);
            resetRegisterForm();
            fetchData();
        } catch (error: any) {
            const msg = error.response?.data?.message || (editingEmployee ? "Gagal memperbarui karyawan" : "Gagal mendaftarkan karyawan");
            alert(msg);
        }
    };

    const handleDeleteEmployee = async (idToDelete?: number | string) => {
        const targetId = typeof idToDelete === 'number' || typeof idToDelete === 'string' ? idToDelete : editingEmployee?.id;
        if (!targetId) return;
        
        const targetName = employees.find(e => e.id === targetId)?.name || editingEmployee?.name || 'ini';

        if (
            !confirm(
                `Yakin ingin menghapus akun ${targetName}? Semua data penggajian juga akan terhapus.`,
            )
        )
            return;

        try {
            await axios.delete(`/users/employees/${targetId}`);
            setShowRegisterModal(false);
            resetRegisterForm();
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.message || "Gagal menghapus karyawan");
        }
    };

    // Expose to window for modal access
    useEffect(() => {
        (window as any).triggerDeleteEmployee = handleDeleteEmployee;
        return () => { delete (window as any).triggerDeleteEmployee; };
    }, [editingEmployee]);

    const handleToggleVerification = async (emp: User) => {
        const newStatus = !emp.isVerified;
        try {
            await axios.patch(`/users/employees/${emp.id}`, {
                isVerified: newStatus,
            });
            showToast(
                newStatus ? "Karyawan Diverifikasi" : "Karyawan Dinonaktifkan",
                `${emp.name} sekarang ${newStatus ? "bisa" : "tidak bisa"} login & absensi.`,
                newStatus ? "success" : "info",
            );
            fetchData(true);
        } catch (error: any) {
            showToast("Gagal", "Gagal mengubah status verifikasi", "error");
        }
    };

    const handleManualAttendance = async (
        userId: number,
        status: "SAKIT" | "IZIN",
    ) => {
        const label = status === "SAKIT" ? "Sakit" : "Izin";
        const note = prompt(
            `Masukkan alasan/catatan untuk status ${label}:`,
            `${label} hari ini`,
        );
        if (note === null) return; // Dibatalkan admin

        const today = new Date().toISOString().split("T")[0];
        try {
            await axios.post(`/attendance/manual`, {
                userId,
                date: today,
                status,
                note,
            });
            fetchData(true);
            showToast(
                "Absensi Manual",
                `Status ${label} berhasil dicatat.`,
                "success",
            );
        } catch (err: any) {
            showToast(
                "Error",
                err.response?.data?.message || `Gagal mencatat status ${label}.`,
                "error",
            );
        }
    };

    const handleCloseBiometricModal = async () => {
        try {
            // Selalu reset device saat menutup modal registrasi
            await axios.post(`${API_URL}/attendance/command`, {
                type: "RESET_DEVICE",
                userId: "0",
            });
        } catch (e) {
            console.error("Failed to reset device on close:", e);
        }
        setShowBiometricModal(false);
        setBiometricScanning(false);
    };

    const handleKickEmployee = async (emp: User) => {
        const message = prompt(
            `Keluarkan ${emp.name} secara paksa? Masukkan alasan (opsional):`,
            "Hubungi admin, Anda Melakukan pelanggaran kerja."
        );
        if (message === null) return; // User cancelled

        try {
            await axios.post(`/users/${emp.id}/force-logout`, { message });
            showToast(
                "Employee Kicked",
                `${emp.name} telah dipaksa logout.`,
                "success"
            );
            fetchData(true);
        } catch (error: any) {
            showToast("Gagal", "Gagal melakukan kick pada karyawan", "error");
        }
    };

    const handleStartBiometricScan = (count: number = 1) => {
        setBiometricScanning(true);
        setBiometricStep(0);
        setBiometricProgress(0);
        setBiometricData(null);
        setBiometricInstruction(
            count > 1
                ? `Mode Turbo Aktif (0/${count})...`
                : "Menunggu Jari Ditempel ke Sensor...",
        );
        setShowBiometricModal(true);

        // Calculate visual ID (1, 2, 3...) based on current count
        const existingCount = newEmployee.fingerprintData ? newEmployee.fingerprintData.split(',').filter(Boolean).length : 0;
        const visualId = existingCount + 1;

        publish("billiard/attendance/feedback", {
            type: "CAPTURE_FINGERPRINT",
            name: "REGISTRASI ID " + visualId, // Force name to show ID 1, 2...
            status: "ID " + visualId + ": TEMPEL JARI", // Force status to show ID 1, 2...
            msg: "DAFTAR ID " + visualId, // Force message to show ID 1, 2...
            userId: editingEmployee?.id ? editingEmployee.id.toString() : "NEW",
            id: visualId,
            count: count,
            command: "CLEAR_LCD"
        });

        // Simulate initial progress for immediate feedback
        const interval = setInterval(() => {
            setBiometricProgress((prev) => {
                if (prev >= 40) {
                    // Only simulate up to 40%, let real feedback handle the rest
                    clearInterval(interval);
                    return prev;
                }
                return prev + 5;
            });
        }, 300);
    };

    const handleStartRfidScan = async () => {
        setIsScanningRFID(true);
        showToast("RFID Mode", "Silakan tempelkan kartu RFID ke reader...", "info");

        // 1. Panggil API untuk "Lock" backend agar tidak kirim sinyal IDLE
        try {
            await axios.post(`${API_URL}/attendance/command`, {
                type: "START_RFID_REGISTRATION",
                userId: editingEmployee?.id ? editingEmployee.id.toString() : "0",
            });
        } catch (err) {
            console.error("Gagal mengunci backend:", err);
        }

        // 2. Bersihkan interval lama jika ada
        if (registrationIntervalRef.current) clearInterval(registrationIntervalRef.current);

        const sendRegistrationSignal = () => {
            publish("billiard/attendance/feedback", {
                type: "REGISTRATION_MODE",
                name: "REGESTRASI",
                status: "TEMPEL KARTU",
                msg: "WAITING CARD",
                userId: editingEmployee?.id ? editingEmployee.id.toString() : "0",
            });
        };

        // Kirim sekali langsung
        sendRegistrationSignal();

        // Keep-alive setiap 5 detik agar hardware tidak timeout ke IDLE
        // (Interval 5 detik adalah "sweet spot" antara mencegah timeout dan meminimalkan kedip)
        registrationIntervalRef.current = setInterval(sendRegistrationSignal, 5000);

        console.log("[Hardware] TFT Registration keep-alive started (10s interval).");
    };

    const handleEdit = (employee: any) => {
        setEditingEmployee(employee);
        setNewEmployee({
            name: employee.name,
            username: employee.username,
            password: "",
            email: employee.email || "",
            pin: employee.pin || "",
            rfid: employee.rfid || "",
            phone: employee.phone || "",
            roleId: employee.role?.id?.toString() || "",
            basicSalary: employee.payrollConfig?.basicSalary || 0,
            overtimeRate: employee.payrollConfig?.overtimeRate || 0,
            commissionService: employee.payrollConfig?.commissionService || 0,
            commissionSalesPercent:
                employee.payrollConfig?.commissionSalesPercent || 0,
            categoryCommissions: employee.payrollConfig?.categoryCommissions || {},
            penaltyIdle: employee.payrollConfig?.penaltyIdle || 0,
            idleThreshold: employee.payrollConfig?.idleThreshold || 0,
            penaltyLate: employee.payrollConfig?.penaltyLate || 0,
            baseShift: employee.baseShift || "",
            fingerprintData: employee.fingerprintData || "",
            securityMode: employee.securityMode || "HYBRID",
            isVerified:
                employee.isVerified !== undefined ? employee.isVerified : true,
        });
        fetchCategories(); // Refresh categories before opening modal
        setShowRegisterModal(true);
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        setRoleLoading(true);
        try {
            if (editingRole) {
                await axios.patch(`/users/roles/${editingRole.id}`, newRole);
            } else {
                await axios.post(`/users/roles`, newRole);
            }
            setShowRoleModal(false);
            setEditingRole(null);
            setNewRole({ name: "", permissions: [], description: "" });
            fetchData();
        } catch (error) {
            alert(editingRole ? "Gagal memperbarui role" : "Gagal membuat role");
        } finally {
            setRoleLoading(false);
        }
    };

    const handleEditRole = (role: Role) => {
        setEditingRole(role);
        setNewRole({
            name: role.name,
            permissions: role.permissions,
            description: role.description || "",
            approvalLevel: role.approvalLevel || 0,
        });
        setShowRoleModal(true);
    };

    const handleDeleteRole = async (roleId: number) => {
        if (!confirm("Yakin ingin menghapus role ini?")) return;
        try {
            await axios.delete(`/users/roles/${roleId}`);
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.message || "Gagal menghapus role");
        }
    };

    const handleClearAllBiometrics = async () => {
        if (
            !confirm(
                "PERINGATAN: Ini akan menghapus SEMUA sidik jari dari sensor dan database. Karyawan harus mendaftar ulang. Lanjutkan?",
            )
        )
            return;

        try {
            await axios.post(`/attendance/command`, {
                type: "CLEAR_ALL_BIOMETRICS",
                userId: "SYSTEM",
            });
            showToast(
                "Reset Berhasil",
                "Sensor dan Database telah dikosongkan.",
                "success",
            );
            fetchData();
        } catch (err: any) {
            showToast(
                "Reset Gagal",
                err.response?.data?.message || "Terjadi kesalahan sistem.",
                "error",
            );
        }
    };

    const handleApproveAttendance = async (attendanceId: number) => {
        try {
            await axios.post(`/attendance/${attendanceId}/approve`);
            fetchData(true);
            alert("Absensi berhasil disetujui");
        } catch (error) {
            alert("Gagal menyetujui absensi");
        }
    };

    const handleApproveAll = async () => {
        if (
            !confirm(
                `Setujui semua (${pendingAttendances.length}) permintaan absensi sekaligus?`,
            )
        )
            return;
        try {
            await axios.post(`/attendance/approve-all`);
            fetchData(true);
            alert("Semua absensi berhasil disetujui");
        } catch (error) {
            alert("Gagal menyetujui absensi massal");
        }
    };

    const handleReleaseSalary = async (empId: number, name: string) => {
        console.log(
            `[Payroll] Initiating salary release for ${name} (ID: ${empId})`,
        );
        const stats = payrollStats[empId];

        const total = stats?.total ?? 0;
        const month = stats?.month ?? selectedMonth;
        const year = stats?.year ?? selectedYear;

        if (!stats || total <= 0) {
            showToast(
                "Peringatan",
                "Belum ada gaji yang bisa diselesaikan periode ini.",
                "error",
            );
            return;
        }

        const confirmMsg = `Konfirmasi penyerahan gaji Rp ${Number(total).toLocaleString("id-ID")} ke ${name}?\n\nSemua data komisi & denda periode ini akan diarsipkan (Ledger Reset).`;

        if (!window.confirm(confirmMsg)) return;

        try {
            console.log(
                `[Payroll] Sending release request for month ${month}/${year}`,
            );
            await axios.post(`/users/${empId}/payroll/release`, {
                month,
                year,
            });

            await fetchData(true);
            showToast(
                "Gaji Diselesaikan",
                `Gaji ${name} berhasil diselesaikan & diarsipkan.`,
                "success",
            );
        } catch (error: any) {
            console.error("Failed to release salary:", error);
            const msg =
                error.response?.data?.message || "Gagal menyelesaikan pembayaran gaji.";
            showToast("Error", msg, "error");
        }
    };

    const handleShowViolationModal = (emp: any) => {
        setManualViolation({
            ...manualViolation,
            userId: emp.id,
            userName: emp.name,
        });
        setShowViolationModal(true);
    };

    const handleLogViolation = async (e: React.FormEvent, payloadOverride?: any) => {
        e.preventDefault();
        try {
            const payload = payloadOverride || manualViolation;
            const response = await axios.post(`/users/violations`, payload);
            setShowViolationModal(false);
            setManualViolation({
                userId: 0,
                userName: "",
                type: "MANUAL_PENALTY" as ViolationType,
                description: "",
                penaltyAmount: 0,
                durationMinutes: 0,
            });
            fetchData(true);
            
            if (response.data?.isPendingApproval) {
                alert(`Berhasil! ${response.data.message || 'Pengajuan Denda / Koreksi sedang menunggu persetujuan atasan.'}`);
            } else {
                alert("Pelanggaran berhasil dicatat.");
            }
        } catch (error) {
            console.error("Failed to log violation", error);
            alert("Gagal mencatat pelanggaran.");
        }
    };

    const togglePermission = (permId: string) => {
        setNewRole((prev) => ({
            ...prev,
            permissions: prev.permissions.includes(permId)
                ? prev.permissions.filter((p) => p !== permId)
                : [...prev.permissions, permId],
        }));
    };

    const toggleGroup = (groupLabel: string) => {
        const group = PERMISSION_GROUPS.find((g) => g.label === groupLabel);
        if (!group) return;

        const groupPermIds = group.permissions.map((p) => p.id);
        const allInGroupSelected = groupPermIds.every((id) =>
            newRole.permissions.includes(id),
        );

        if (allInGroupSelected) {
            // Unselect all in group
            setNewRole((prev) => ({
                ...prev,
                permissions: prev.permissions.filter(
                    (id) => !groupPermIds.includes(id),
                ),
            }));
        } else {
            // Select all in group (avoid duplicates)
            setNewRole((prev) => {
                const newPerms = [...prev.permissions];
                groupPermIds.forEach((id) => {
                    if (!newPerms.includes(id)) newPerms.push(id);
                });
                return { ...prev, permissions: newPerms };
            });
        }
    };

    const handleExportExcel = () => {
        try {
            const wb = xlsx.utils.book_new();

            // 1. Sheet Role Matrix
            const roleData = [
                ['Nama Role', 'Level Approval', 'Deskripsi', 'Permissions'],
                ...roles.map(r => [
                    r.name,
                    r.approvalLevel?.toString() || '1',
                    r.description || '',
                    r.permissions.join(',')
                ])
            ];
            const wsRole = xlsx.utils.aoa_to_sheet(roleData);
            wsRole['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 35 }, { wch: 90 }];
            xlsx.utils.book_append_sheet(wb, wsRole, 'Role Matrix');

            // 2. Sheet Karyawan
            const empHeader = [
                'Nama Lengkap', 'Username', 'Password', 'Role', 'PIN', 'RFID',
                'Telepon', 'Email', 'Jabatan', 'Shift', 'Jenis Kelamin',
                'Alamat', 'Mode Keamanan', 'Tanggal Bergabung'
            ];
            const empDataRows = employees.map(emp => [
                emp.name,
                emp.username,
                "", // Password blank for security
                emp.role?.name || 'KASIR',
                emp.pin || '',
                emp.rfid || '',
                emp.phone || '',
                emp.email || '',
                emp.jobTitle || '',
                emp.baseShift || 'SHIFT 1',
                emp.gender || '',
                emp.address || '',
                emp.securityMode || 'HYBRID',
                emp.joinedAt || ''
            ]);
            const wsEmp = xlsx.utils.aoa_to_sheet([empHeader, ...empDataRows]);
            wsEmp['!cols'] = [
                { wch: 22 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 12 },
                { wch: 14 }, { wch: 25 }, { wch: 22 }, { wch: 10 }, { wch: 14 },
                { wch: 30 }, { wch: 16 }, { wch: 18 },
            ];
            xlsx.utils.book_append_sheet(wb, wsEmp, 'Karyawan');

            // 3. Sheet Panduan
            const guideData = [
                ['PANDUAN PENGISIAN - TEMPLATE IMPORT DATA SDM'],
                [''],
                ['SHEET 1: Role Matrix'],
                ['Kolom', 'Keterangan', 'Contoh'],
                ['Nama Role', 'Nama role (UPPERCASE, unik)', 'KASIR'],
                ['Level Approval', '1=Staff, 2=Kasir, 3=Manager, 4=Owner', '2'],
                ['Deskripsi', 'Deskripsi singkat role', 'Operator kasir harian'],
                ['Permissions', 'Daftar permission dipisah koma', 'DASHBOARD_TABLE,START_TABLE'],
                [''],
                ['DAFTAR PERMISSION YANG TERSEDIA:'],
                ['DASHBOARD_TABLE', 'Akses dashboard & monitoring meja'],
                ['START_TABLE', 'Mulai sesi meja billiard'],
                ['END_TABLE', 'Akhiri sesi meja billiard'],
                ['USER_MANAGE', 'Kelola data karyawan'],
                ['USER_ROLE', 'Kelola role & permission'],
                ['INVENTORY_VIEW', 'Lihat inventory'],
                ['INV_ADD_ITEM', 'Tambah/edit bahan baku'],
                ['INVENTORY_WASTE', 'Deklarasi waste'],
                ['TRANSACTION_VIEW', 'Lihat histori transaksi'],
                ['FINANCE_VIEW', 'Akses laporan keuangan'],
                ['REPORT_VIEW', 'Akses laporan bisnis'],
                ['CAFE_ORDER', 'Input order cafe'],
                ['AUDIT_TRAIL', 'Lihat audit log'],
                [''],
                ['SHEET 2: Karyawan'],
                ['Kolom', 'Keterangan', 'Wajib?'],
                ['Nama Lengkap', 'Nama lengkap karyawan', 'Ya'],
                ['Username', 'Username login (huruf kecil, tanpa spasi)', 'Ya'],
                ['Password', 'Kosongkan jika ingin password = username', 'Opsional'],
                ['Role', 'Nama Role dari Sheet 1', 'Ya'],
                ['PIN', 'PIN 4-6 digit untuk akses cepat', 'Opsional'],
                ['RFID', 'Kode RFID kartu karyawan', 'Opsional'],
                ['Telepon', 'Nomor HP aktif', 'Opsional'],
                ['Email', 'Alamat email karyawan', 'Opsional'],
                ['Jabatan', 'Judul jabatan/posisi', 'Opsional'],
                ['Shift', 'SHIFT 1 / SHIFT 2 / SHIFT 3', 'Opsional'],
                ['Jenis Kelamin', 'Laki-laki / Perempuan', 'Opsional'],
                ['Alamat', 'Alamat lengkap', 'Opsional'],
                ['Mode Keamanan', 'HYBRID / RFID_ONLY / FINGERPRINT_ONLY / DUAL', 'Opsional'],
                ['Tanggal Bergabung', 'Format: YYYY-MM-DD', 'Opsional'],
                [''],
                ['CATATAN PENTING:'],
                ['- Sistem UPSERT: username sudah ada = data diperbarui, belum ada = data baru dibuat.'],
                ['- Password karyawan BARU dapat disetel di kolom Password (atau = Username jika kosong).'],
                ['- Role pada Sheet 2 harus sudah ada di Sheet 1 atau sudah ada di sistem.'],
            ];
            const wsGuide = xlsx.utils.aoa_to_sheet(guideData);
            wsGuide['!cols'] = [{ wch: 25 }, { wch: 60 }, { wch: 12 }];
            xlsx.utils.book_append_sheet(wb, wsGuide, 'Panduan');

            const fileName = `Data_Karyawan_${new Date().toISOString().split("T")[0]}.xlsx`;
            xlsx.writeFile(wb, fileName);
            showToast("Export Berhasil", "Data karyawan berhasil diunduh", "success");
        } catch (error) {
            console.error("Export error", error);
            showToast("Export Gagal", "Gagal mengekspor data karyawan", "error");
        }
    };

    const filteredEmployees = useMemo(() => {
        return employees
            .filter((emp) => {
                const search = (employeeSearch || "").toLowerCase();
                const matchSearch =
                    search === "" ||
                    emp.name.toLowerCase().includes(search) ||
                    emp.username.toLowerCase().includes(search) ||
                    (emp.role?.name || "").toLowerCase().includes(search);
                const matchStatus =
                    employeeStatusFilter === "ALL" || emp.status === employeeStatusFilter;
                return matchSearch && matchStatus;
            })
            .map((emp) => ({
                ...emp,
                estimatedPayroll: payrollStats[emp.id]?.total || 0,
            }));
    }, [employees, employeeSearch, employeeStatusFilter, payrollStats]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 lg:p-12 selection:bg-indigo-100 selection:text-indigo-900">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden h-screen w-screen">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full" />
            </div>

            <div className="max-w-7xl mx-auto space-y-8 relative z-10">
                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 rounded-3xl p-8 lg:p-10 text-white shadow-2xl shadow-indigo-200">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12" />
                    <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">
                                    Enterprise Security
                                </span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight">
                                SDM & Keamanan
                            </h1>
                            <p className="text-white/60 text-sm font-semibold mt-1">
                                Pusat kendali manajemen personil dan konfigurasi hak akses
                                terintegrasi
                            </p>
                            <div className="flex flex-wrap gap-3 mt-5">
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5">
                                    <Users className="w-4 h-4" /> Total {employees.length} Karyawan
                                </div>
                                <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5">
                                    <Activity className="w-4 h-4" /> {employees.filter((e) => e.status === "ACTIVE").length}{" "}
                                    Aktif
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                            {hasPermission("USER_MANAGE") && (
                                <button
                                    onClick={handleClearAllBiometrics}
                                    className="flex-1 lg:flex-none bg-rose-500/10 hover:bg-rose-500/20 backdrop-blur-sm border border-rose-500/30 text-rose-200 px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 group text-xs"
                                    title="Reset Sensor"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span className="whitespace-nowrap">Reset Sensor</span>
                                </button>
                            )}
                            {hasPermission("USER_ROLE") && (
                                <button
                                    onClick={() => setShowRoleModal(true)}
                                    className="flex-1 lg:flex-none bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 group text-xs"
                                >
                                    <Shield className="w-4 h-4" />
                                    <span className="whitespace-nowrap">Roles</span>
                                </button>
                            )}
                            {hasPermission("USER_MANAGE") && (
                                <button
                                    onClick={() => setShowImportEmployeeModal(true)}
                                    className="flex-1 lg:flex-none bg-emerald-500/20 hover:bg-emerald-500/30 backdrop-blur-sm border border-emerald-400/40 text-emerald-100 px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                                    <span className="whitespace-nowrap">Import Excel</span>
                                </button>
                            )}
                            {hasPermission("USER_MANAGE") && (
                                <button
                                    onClick={handleExportExcel}
                                    className="flex-1 lg:flex-none bg-indigo-500/20 hover:bg-indigo-500/30 backdrop-blur-sm border border-indigo-400/40 text-indigo-100 px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    <span className="whitespace-nowrap">Export</span>
                                </button>
                            )}
                            {hasPermission("USER_MANAGE") && (
                                <button
                                    onClick={() => {
                                        resetRegisterForm();
                                        fetchCategories();
                                        setShowRegisterModal(true);
                                    }}
                                    className="flex-1 lg:flex-none bg-white text-indigo-600 px-4 py-2 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-indigo-50 shadow-lg transition-all active:scale-95 group uppercase tracking-widest text-xs"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    <span className="whitespace-nowrap">Deploy</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        {
                            label: "Active Now",
                            value: employees.filter((e) => e.status === "ACTIVE").length,
                            icon: <Activity className="w-5 h-5 text-emerald-600" />,
                            gradient: "from-emerald-400 to-emerald-500",
                            light: "bg-emerald-50",
                            text: "text-emerald-700",
                        },
                        {
                            label: "Away / Idle",
                            value: employees.filter((e) => e.status === "AWAY").length,
                            icon: <Clock className="w-5 h-5 text-amber-600" />,
                            gradient: "from-amber-400 to-amber-500",
                            light: "bg-amber-50",
                            text: "text-amber-700",
                        },
                        {
                            label: "Total Unit",
                            value: employees.length,
                            icon: <Users className="w-5 h-5 text-indigo-600" />,
                            gradient: "from-indigo-500 to-indigo-600",
                            light: "bg-indigo-50",
                            text: "text-indigo-700",
                        },
                        {
                            label: "Alerts",
                            value: violations.length,
                            icon: <AlertTriangle className="w-5 h-5 text-rose-600" />,
                            gradient: "from-rose-500 to-rose-600",
                            light: "bg-rose-50",
                            text: "text-rose-700",
                        },
                    ].map((s, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div
                                    className={`w-8 h-8 ${s.light} rounded-xl flex items-center justify-center text-base`}
                                >
                                    {s.icon}
                                </div>
                                <div
                                    className={`h-0.5 w-6 rounded-full bg-gradient-to-r ${s.gradient}`}
                                />
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                {s.label}
                            </p>
                            <p className={`text-xl font-black ${s.text} leading-none`}>
                                {s.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Responsive Tabs Navigation */}
                <div className="w-full flex overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit min-w-full md:min-w-0 whitespace-nowrap">
                        {hasPermission("USER_MANAGE") && (
                            <button
                                onClick={() => setActiveTab("employees")}
                                className={`relative whitespace-nowrap px-5 md:px-6 py-2 rounded-lg font-bold transition-all text-xs md:text-sm ${activeTab === "employees" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                Personnel
                                {pendingAttendances.length > 0 && (
                                    <span className="absolute -top-1 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-rose-500/30 border border-slate-50">
                                        {pendingAttendances.length}
                                    </span>
                                )}
                            </button>
                        )}
                        {hasPermission("USER_ROLE") && (
                            <button
                                onClick={() => setActiveTab("roles")}
                                className={`whitespace-nowrap px-5 md:px-6 py-2 rounded-lg font-bold transition-all text-xs md:text-sm ${activeTab === "roles" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                Roles
                            </button>
                        )}
                        {hasPermission("USER_MONITOR") && (
                            <button
                                onClick={() => setActiveTab("monitoring")}
                                className={`whitespace-nowrap px-5 md:px-6 py-2 rounded-lg font-bold transition-all text-xs md:text-sm ${activeTab === "monitoring" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                Analytics
                            </button>
                        )}
                        {hasPermission("PAYROLL_VIEW") && (
                            <button
                                onClick={() => setActiveTab("payroll")}
                                className={`flex-shrink-0 whitespace-nowrap px-5 md:px-6 py-2 rounded-lg font-bold transition-all text-xs md:text-sm ${activeTab === "payroll" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                Ledger
                            </button>
                        )}
                    </div>
                </div>

                {/* List Container */}
                {loading ? (
                    <div className="space-y-8">{/* ... loading skeleton ... */}</div>
                ) : activeTab === "employees" ? (
                    <div className="space-y-4">
                        {/* Pending Approvals Section */}
                        {pendingAttendances.length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 overflow-hidden relative group">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-50 rounded-full -mr-24 -mt-24 opacity-40 group-hover:scale-110 transition-transform duration-700" />

                                <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20 animate-pulse">
                                            <ShieldAlert className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none">
                                                Attendance Validation
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[8px] font-black uppercase tracking-widest">
                                                    Awaiting Action
                                                </span>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">
                                                    {pendingAttendances.length} requests pending review
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full md:w-auto">
                                        <button
                                            onClick={handleApproveAll}
                                            className="flex-1 md:flex-none bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                            Approve All
                                        </button>
                                        <button
                                            onClick={handleCloseBiometricModal}
                                            className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-all active:rotate-180"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {pendingAttendances.map((pa) => {
                                        const isLate = pa.status === "LATE";
                                        return (
                                            <div
                                                key={pa.id}
                                                className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between group/card hover:bg-white hover:border-amber-200 hover:shadow-md transition-all duration-300"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-400 border border-slate-100 group-hover/card:bg-amber-50 group-hover/card:text-amber-600 group-hover/card:border-amber-100 transition-all text-base shadow-sm">
                                                            {pa.user?.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900 leading-none mb-1">
                                                                {pa.user?.name}
                                                            </p>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-[4px] text-[8px] font-black uppercase tracking-tight">
                                                                    {pa.user?.role?.name || "Staff"}
                                                                </span>
                                                                {pa.user?.baseShift && (
                                                                    <span className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase">
                                                                        <Clock className="w-2 h-2" />
                                                                        {pa.user.baseShift}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white border border-slate-100 rounded-xl p-3 mb-4 flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none mb-0.5">
                                                            Time Log
                                                        </span>
                                                        <span className="text-xs font-black text-slate-700 tabular-nums">
                                                            {new Date(
                                                                pa.checkOutTime || pa.checkInTime,
                                                            ).toLocaleTimeString("id-ID", {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </span>
                                                    </div>
                                                    <div className="text-right flex flex-col items-center gap-1">
                                                        <span
                                                            className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${pa.checkOutTime ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"}`}
                                                        >
                                                            {pa.checkOutTime ? "Out" : "In"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleApproveAttendance(pa.id)}
                                                    className="w-full bg-white border border-slate-900 text-slate-900 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95"
                                                >
                                                    Approve
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Search & Filter Bar */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={employeeSearch}
                                    onChange={(e) => setEmployeeSearch(e.target.value)}
                                    placeholder="Search personnel..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 shadow-sm transition-all"
                                />
                                {employeeSearch && (
                                    <button
                                        onClick={() => setEmployeeSearch("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-lg"
                                    >
                                        <X className="w-3 h-3 text-slate-400" />
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-1.5">
                                {(["ALL", "ACTIVE", "AWAY", "OFFLINE"] as const).map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setEmployeeStatusFilter(s)}
                                        className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${employeeStatusFilter === s
                                                ? s === "ACTIVE"
                                                    ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                                    : s === "AWAY"
                                                        ? "bg-amber-400 text-white border-amber-400 shadow-sm"
                                                        : s === "OFFLINE"
                                                            ? "bg-slate-500 text-white border-slate-500 shadow-sm"
                                                            : "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                : "bg-white text-slate-400 border-slate-200 hover:border-indigo-300 hover:text-indigo-500"
                                            }`}
                                    >
                                        {s === "ALL" ? `Total (${employees.length})` : s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Desktop Table View */}
                        <EmployeeTable
                            filteredEmployees={filteredEmployees}
                            fmt={fmt}
                            handleEditEmployee={handleEdit}
                            handleDeleteEmployee={handleDeleteEmployee}
                            handleShowViolationModal={handleShowViolationModal}
                            handleViewDetailedPayroll={fetchDetailedReport}
                            handleKickEmployee={handleKickEmployee}
                            handleToggleVerification={handleToggleVerification}
                        />

                        <EmployeeMobileList
                            filteredEmployees={filteredEmployees}
                            fmt={fmt}
                            handleEditEmployee={handleEdit}
                            handleDeleteEmployee={handleDeleteEmployee}
                            handleShowViolationModal={handleShowViolationModal}
                            handleViewDetailedPayroll={fetchDetailedReport}
                            handleKickEmployee={handleKickEmployee}
                            handleToggleVerification={handleToggleVerification}
                        />
                    </div>
                ) : activeTab === "roles" ? (
                    <div className="space-y-4">
                        {/* Desktop Roles Table */}
                        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            Role Designation
                                        </th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            Active Personnel
                                        </th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {roles.map((role) => (
                                        <tr
                                            key={role.id}
                                            className="hover:bg-slate-50/50 transition-colors group"
                                        >
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                                        <Shield className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800">
                                                            {role.name}
                                                        </span>
                                                        {role.description && (
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                                {role.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-wrap gap-1.5 max-w-sm">
                                                    {[
                                                        {
                                                            label: "Bill",
                                                            icon: Shield,
                                                            ids: [
                                                                "BILLIARD_VIEW",
                                                                "BILLIARD_START",
                                                                "BILLIARD_PAY",
                                                            ],
                                                        },
                                                        {
                                                            label: "POS",
                                                            icon: Users,
                                                            ids: ["CAFE_VIEW", "CAFE_ORDER", "CAFE_PAY"],
                                                        },
                                                        {
                                                            label: "Inv",
                                                            icon: Activity,
                                                            ids: ["INV_VIEW", "INV_UPDATE"],
                                                        },
                                                        {
                                                            label: "Fin",
                                                            icon: DollarSign,
                                                            ids: ["FIN_REVENUE", "FIN_LEDGER"],
                                                        },
                                                        {
                                                            label: "Sec",
                                                            icon: Monitor,
                                                            ids: ["AUDIT_VIEW", "USER_MANAGE"],
                                                        },
                                                    ].map((grp) => {
                                                        const count = role.permissions.filter((p) =>
                                                            grp.ids.includes(p),
                                                        ).length;
                                                        if (count === 0) return null;
                                                        return (
                                                            <div
                                                                key={grp.label}
                                                                className="flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-500"
                                                            >
                                                                <grp.icon className="w-2.5 h-2.5" />
                                                                <span className="text-[9px] font-black uppercase">
                                                                    {grp.label} ({count})
                                                                </span>
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
                                                    {
                                                        employees.filter((e) => e.role?.id === role.id)
                                                            .length
                                                    }{" "}
                                                    Personil
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
                                <div
                                    key={role.id}
                                    className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-5"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                                <Shield className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 leading-none mb-1.5">
                                                    {role.name}
                                                </p>
                                                {role.description && (
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                                                        {role.description}
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">
                                                    {
                                                        employees.filter((e) => e.role?.id === role.id)
                                                            .length
                                                    }{" "}
                                                    Personil Aktif
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditRole(role)}
                                                className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRole(role.id)}
                                                className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center active:scale-95 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-50">
                                        {[
                                            {
                                                label: "Bill",
                                                icon: Shield,
                                                ids: [
                                                    "BILLIARD_VIEW",
                                                    "BILLIARD_START",
                                                    "BILLIARD_PAY",
                                                ],
                                            },
                                            {
                                                label: "POS",
                                                icon: Users,
                                                ids: ["CAFE_VIEW", "CAFE_ORDER", "CAFE_PAY"],
                                            },
                                            {
                                                label: "Inv",
                                                icon: Activity,
                                                ids: ["INV_VIEW", "INV_UPDATE"],
                                            },
                                            {
                                                label: "Fin",
                                                icon: DollarSign,
                                                ids: ["FIN_REVENUE", "FIN_LEDGER"],
                                            },
                                            {
                                                label: "Sec",
                                                icon: Monitor,
                                                ids: ["AUDIT_VIEW", "USER_MANAGE"],
                                            },
                                        ].map((grp) => {
                                            const count = role.permissions.filter((p) =>
                                                grp.ids.includes(p),
                                            ).length;
                                            if (count === 0) return null;
                                            return (
                                                <div
                                                    key={grp.label}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-500"
                                                >
                                                    <grp.icon className="w-2.5 h-2.5" />
                                                    <span className="text-[8px] font-black uppercase tracking-tighter">
                                                        {grp.label} ({count})
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : activeTab === "monitoring" ? (
                    <div className="space-y-6">
                        {/* Live Overview Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* System Status Card */}
                            <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
                                <div className="relative z-10 space-y-8">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                            Live Infrastructure
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-4xl md:text-5xl font-black tracking-tighter tabular-nums leading-none">
                                            {currentTime.toLocaleTimeString("id-ID", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                        <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">
                                            {currentTime.toLocaleDateString("id-ID", {
                                                weekday: "long",
                                                day: "numeric",
                                                month: "short",
                                            })}
                                        </p>
                                    </div>
                                    <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                                Active
                                            </p>
                                            <p className="text-xl font-black text-emerald-400">
                                                {employees.filter((e) => e.status === "ACTIVE").length}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                                Alerts
                                            </p>
                                            <p className="text-xl font-black text-rose-400">
                                                {violations.length}
                                            </p>
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
                                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">
                                        Kronologi Aktivitas
                                    </h3>
                                    <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">
                                        View All
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto max-h-[300px] p-2 space-y-1 custom-scrollbar">
                                    {violations.slice(0, 10).map((v) => (
                                        <div
                                            key={v.id}
                                            className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors group border-b border-slate-50 last:border-0"
                                        >
                                            <div
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${v.type === "IDLE_TIMEOUT" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}
                                            >
                                                <AlertTriangle className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-slate-800">
                                                    {v.user?.name}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                                                    {v.description}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-900 tabular-nums">
                                                    {new Date(v.createdAt).toLocaleTimeString("id-ID", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                                <p className="text-[9px] font-bold text-rose-500">
                                                    -Rp {Number(v.penaltyAmount).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {violations.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 py-10">
                                            <Activity className="w-8 h-8 opacity-20 mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">
                                                No Recent Incidents
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Employee Monitoring Matrix */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 md:p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                    Personnel Matrix
                                </h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Live
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                {employees.map((emp) => {
                                    const stats = monitoringSummary.find(
                                        (s) => s.userId === emp.id,
                                    );
                                    return (
                                        <div
                                            key={emp.id}
                                            className="flex flex-col items-center group relative"
                                        >
                                            <div className="relative mb-4">
                                                {/* Outer Glow for Active Users */}
                                                {emp.status === "ACTIVE" && (
                                                    <div className="absolute -inset-2 bg-emerald-500/10 rounded-[2.2rem] animate-pulse blur-md" />
                                                )}

                                                <div
                                                    className={`w-20 h-20 rounded-[2rem] border-2 flex items-center justify-center font-black text-2xl transition-all duration-500 shadow-sm ${emp.status === "ACTIVE"
                                                            ? "bg-white border-emerald-200 text-emerald-600 shadow-emerald-100 shadow-lg scale-105"
                                                            : emp.status === "AWAY"
                                                                ? "bg-amber-50 border-amber-100 text-amber-500"
                                                                : "bg-slate-50 border-slate-100 text-slate-300 grayscale"
                                                        }`}
                                                >
                                                    {emp.name.charAt(0)}

                                                    {/* Status Badge Over Avatar */}
                                                    <div
                                                        className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-[3px] border-white flex items-center justify-center shadow-md ${emp.status === "ACTIVE"
                                                                ? "bg-emerald-500"
                                                                : emp.status === "AWAY"
                                                                    ? "bg-amber-500"
                                                                    : "bg-slate-400"
                                                            }`}
                                                    >
                                                        {emp.status === "ACTIVE" ? (
                                                            <Zap className="w-3 h-3 text-white fill-current" />
                                                        ) : emp.status === "AWAY" ? (
                                                            <Clock className="w-3 h-3 text-white" />
                                                        ) : (
                                                            <Power className="w-3 h-3 text-white" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-center w-full px-2">
                                                <p className="text-xs font-black text-slate-800 truncate mb-1.5 leading-none">
                                                    {emp.name}
                                                </p>

                                                <div className="flex flex-col items-center gap-1">
                                                    <div
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-300 ${emp.status === "ACTIVE"
                                                                ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                                                : "bg-slate-50 border-slate-100 text-slate-400"
                                                            }`}
                                                    >
                                                        {emp.status === "ACTIVE" && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        )}
                                                        <span className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">
                                                            {emp.status === "ACTIVE"
                                                                ? emp.currentActivePage ||
                                                                    stats?.currentActivePage
                                                                    ? getPageName(
                                                                        emp.currentActivePage ||
                                                                        stats?.currentActivePage ||
                                                                        "",
                                                                    )
                                                                    : "Dashboard"
                                                                : emp.status}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <Activity className="w-2.5 h-2.5 text-slate-300" />
                                                        <p className="text-[9px] font-bold text-slate-400 tabular-nums uppercase tracking-tighter">
                                                            {stats?.activeHours || "0.00"}h session
                                                        </p>
                                                    </div>
                                                </div>
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
                                {
                                    label: "Total Payroll",
                                    val: employees.reduce(
                                        (sum, e) => sum + Number(payrollStats[e.id]?.total || 0),
                                        0,
                                    ),
                                    icon: DollarSign,
                                    color: "indigo",
                                },
                                {
                                    label: "Base Salaries",
                                    val: employees.reduce(
                                        (sum, e) =>
                                            sum + Number(payrollStats[e.id]?.basicSalary || 0),
                                        0,
                                    ),
                                    icon: Wallet,
                                    color: "slate",
                                },
                                {
                                    label: "Total Commissions",
                                    val: employees.reduce(
                                        (sum, e) =>
                                            sum +
                                            (Number(payrollStats[e.id]?.commissionService || 0) +
                                                Number(payrollStats[e.id]?.commissionSales || 0) +
                                                Number(payrollStats[e.id]?.commissionProduction || 0) +
                                                Number(payrollStats[e.id]?.overtimePay || 0)),
                                        0,
                                    ),
                                    icon: TrendingUp,
                                    color: "emerald",
                                },
                                {
                                    label: "System Penalties",
                                    val: employees.reduce(
                                        (sum, e) =>
                                            sum + Number(payrollStats[e.id]?.penalties || 0),
                                        0,
                                    ),
                                    icon: ShieldAlert,
                                    color: "rose",
                                },
                            ].map((stat, i) => (
                                <div
                                    key={i}
                                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-indigo-200 transition-all"
                                >
                                    <div className="flex items-center gap-4 mb-3">
                                        <div
                                            className={`w-10 h-10 rounded-xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600`}
                                        >
                                            <stat.icon className="w-5 h-5" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {stat.label}
                                        </span>
                                    </div>
                                    <p className="text-2xl font-black text-slate-900 tabular-nums">
                                        {fmt(stat.val)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Employee Payroll List */}
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">
                                        Employee Ledger
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                            Periode:
                                        </p>
                                        <select
                                            value={selectedMonth}
                                            onChange={(e) => setSelectedMonth(+e.target.value)}
                                            className="text-[10px] bg-transparent font-black text-indigo-600 focus:outline-none uppercase cursor-pointer"
                                        >
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <option key={i + 1} value={i + 1}>
                                                    {new Date(0, i).toLocaleString("id-ID", {
                                                        month: "long",
                                                    })}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(+e.target.value)}
                                            className="text-[10px] bg-transparent font-black text-indigo-600 focus:outline-none uppercase cursor-pointer"
                                        >
                                            {[2024, 2025, 2026].map((y) => (
                                                <option key={y} value={y}>
                                                    {y}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
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
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                                Personnel
                                            </th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                                Base Salary
                                            </th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                                Commissions
                                            </th>
                                            <th className="px-8 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">
                                                        Total Penalties
                                                    </span>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">
                                                            Late
                                                        </span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                        <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">
                                                            Idle
                                                        </span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">
                                                            Manual/Koreksi
                                                        </span>
                                                    </div>
                                                </div>
                                            </th>

                                            <th className="px-8 py-5 text-[10px] font-black text-indigo-500 uppercase tracking-[0.15em]">
                                                Take Home Pay
                                            </th>
                                            <th className="px-8 py-5 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {employees.map((emp) => {
                                            const stats = payrollStats[emp.id] || {
                                                basicSalary: 0,
                                                commissionService: 0,
                                                commissionSales: 0,
                                                penalties: 0,
                                                total: 0,
                                            };
                                            return (
                                                <tr
                                                    key={emp.id}
                                                    className="hover:bg-slate-50/50 transition-colors group"
                                                >
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-500 border border-slate-200">
                                                                {emp.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-800 leading-none mb-1">
                                                                    {emp.name}
                                                                </p>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                        {emp.role?.name || "Staff"}
                                                                    </p>
                                                                    {emp.baseShift && (
                                                                        <>
                                                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                                                                {emp.baseShift}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="text-sm font-bold text-slate-600 tabular-nums">
                                                            {fmt(stats.basicSalary)}
                                                        </p>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="text-sm font-black text-emerald-600 tabular-nums">
                                                            +{" "}
                                                            {fmt(
                                                                stats.commissionService +
                                                                stats.commissionSales +
                                                                (stats.commissionProduction || 0),
                                                            )}
                                                        </p>
                                                        {/* Per-category breakdown — dynamic */}
                                                        {((stats.salesBreakdown &&
                                                            Object.keys(stats.salesBreakdown).length > 0) ||
                                                            (stats.productionBreakdown &&
                                                                Object.keys(stats.productionBreakdown).length >
                                                                0)) && (
                                                                <div className="mt-2 space-y-0.5">
                                                                    {/* Sales Breakdown (Waiters) */}
                                                                    {stats.salesBreakdown &&
                                                                        Object.entries(
                                                                            stats.salesBreakdown as Record<
                                                                                string,
                                                                                {
                                                                                    volume: number;
                                                                                    commission: number;
                                                                                    percent: number;
                                                                                }
                                                                            >,
                                                                        ).map(
                                                                            ([cat, val]) =>
                                                                                (val.volume > 0 || val.percent > 0) && (
                                                                                    <div
                                                                                        key={`sales-${cat}`}
                                                                                        className="flex items-center gap-2"
                                                                                    >
                                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate max-w-[70px]">
                                                                                            {cat}
                                                                                        </span>
                                                                                        <span className="text-[9px] font-black text-emerald-500 tabular-nums whitespace-nowrap">
                                                                                            + {fmt(val.commission)}
                                                                                        </span>
                                                                                        <span className="text-[8px] text-slate-300 tabular-nums">
                                                                                            ({fmtPct(val.percent)})
                                                                                        </span>
                                                                                    </div>
                                                                                ),
                                                                        )}
                                                                    {/* Production Breakdown (Kitchen/Bar) */}
                                                                    {stats.productionBreakdown &&
                                                                        Object.entries(
                                                                            stats.productionBreakdown as Record<
                                                                                string,
                                                                                {
                                                                                    volume: number;
                                                                                    commission: number;
                                                                                    percent: number;
                                                                                }
                                                                            >,
                                                                        ).map(
                                                                            ([cat, val]) =>
                                                                                val.volume > 0 && (
                                                                                    <div
                                                                                        key={`prod-${cat}`}
                                                                                        className="flex items-center gap-2"
                                                                                    >
                                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 truncate max-w-[70px]">
                                                                                            {cat}
                                                                                        </span>
                                                                                        <span className="text-[9px] font-black text-emerald-500 tabular-nums whitespace-nowrap">
                                                                                            + {fmt(val.commission)}
                                                                                        </span>
                                                                                        <span className="text-[8px] text-slate-300 tabular-nums">
                                                                                            (Prod)
                                                                                        </span>
                                                                                    </div>
                                                                                ),
                                                                        )}
                                                                    {stats.commissionService > 0 && (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                                                Billiard
                                                                            </span>
                                                                            <span className="text-[9px] font-black text-emerald-500 tabular-nums whitespace-nowrap">
                                                                                + {fmt(stats.commissionService)}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {stats.overtimePay > 0 && (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">
                                                                                LEMBUR
                                                                            </span>
                                                                            <span className="text-[9px] font-black text-indigo-500 tabular-nums whitespace-nowrap">
                                                                                + {fmt(stats.overtimePay)}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col">
                                                            <p className="text-sm font-black text-rose-500 tabular-nums">
                                                                - {fmt(stats.penalties)}
                                                            </p>

                                                            <div className="flex flex-wrap items-center gap-2.5 mt-1 text-[9px] font-bold">
                                                                <span
                                                                    className={
                                                                        stats.penaltiesLate > 0
                                                                            ? "text-amber-600"
                                                                            : "text-slate-200"
                                                                    }
                                                                >
                                                                    {stats.penaltiesLate > 0
                                                                        ? fmt(stats.penaltiesLate)
                                                                        : "BERSIH"}
                                                                </span>
                                                                <span
                                                                    className={
                                                                        stats.penaltiesIdle > 0
                                                                            ? "text-rose-400"
                                                                            : "text-slate-200"
                                                                    }
                                                                >
                                                                    {stats.penaltiesIdle > 0
                                                                        ? fmt(stats.penaltiesIdle)
                                                                        : "BERSIH"}
                                                                </span>
                                                                <span
                                                                    className={
                                                                        (stats.penalties || 0) - ((stats.penaltiesLate || 0) + (stats.penaltiesIdle || 0)) !== 0
                                                                            ? ((stats.penalties || 0) - ((stats.penaltiesLate || 0) + (stats.penaltiesIdle || 0)) < 0 ? "text-emerald-500" : "text-indigo-400")
                                                                            : "text-slate-200"
                                                                    }
                                                                >
                                                                    {(stats.penalties || 0) - ((stats.penaltiesLate || 0) + (stats.penaltiesIdle || 0)) !== 0
                                                                        ? (((stats.penalties || 0) - ((stats.penaltiesLate || 0) + (stats.penaltiesIdle || 0)) < 0 ? "+" : "- ") + fmt(Math.abs((stats.penalties || 0) - ((stats.penaltiesLate || 0) + (stats.penaltiesIdle || 0)))))
                                                                        : "BERSIH"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="text-lg font-black text-slate-900 tabular-nums">
                                                            {fmt(stats.total)}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                            <span className="flex items-center gap-1">
                                                                <Hash className="w-2.5 h-2.5" />{" "}
                                                                {stats.totalSessions || 0} Sesi
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-2.5 h-2.5" />{" "}
                                                                {stats.activeDays || 0} Hari
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setManualViolation({
                                                                        ...manualViolation,
                                                                        userId: emp.id,
                                                                        userName: emp.name,
                                                                    });
                                                                    setShowViolationModal(true);
                                                                }}
                                                                title="Catat Pelanggaran Manual"
                                                                className="p-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all shadow-md active:scale-95"
                                                            >
                                                                <AlertTriangle className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => fetchDetailedReport(emp)}
                                                                title="Audit Aktivitas & Komisi"
                                                                className="p-3 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-md active:scale-95"
                                                            >
                                                                <Activity className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    handleReleaseSalary(emp.id, emp.name)
                                                                }
                                                                title="Selesaikan & Arsipkan Gaji (Reset Ledger)"
                                                                className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                        </div>
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
                                    const stats = payrollStats[emp.id] || {
                                        basicSalary: 0,
                                        commissionService: 0,
                                        commissionSales: 0,
                                        penalties: 0,
                                        total: 0,
                                    };
                                    return (
                                        <div
                                            key={emp.id}
                                            className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center font-black text-indigo-600">
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900">
                                                            {emp.name}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                {emp.role?.name || "Staff"}
                                                            </p>
                                                            {emp.baseShift && (
                                                                <>
                                                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                                                        {emp.baseShift}
                                                                    </span>
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
                                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                                                        Total Earnings
                                                    </p>
                                                    <p className="text-sm font-black text-emerald-600">
                                                        +{" "}
                                                        {fmt(
                                                            stats.commissionService +
                                                            stats.commissionSales +
                                                            (stats.commissionProduction || 0),
                                                        )}
                                                    </p>
                                                    {/* Per-category breakdown (mobile) */}
                                                    {((stats.salesBreakdown &&
                                                        Object.keys(stats.salesBreakdown).length > 0) ||
                                                        (stats.productionBreakdown &&
                                                            Object.keys(stats.productionBreakdown).length >
                                                            0)) && (
                                                            <div className="mt-2 pt-2 border-t border-emerald-100 space-y-1">
                                                                {/* Sales Breakdown (Waiters) */}
                                                                {stats.salesBreakdown &&
                                                                    Object.entries(
                                                                        stats.salesBreakdown as Record<
                                                                            string,
                                                                            {
                                                                                volume: number;
                                                                                commission: number;
                                                                                percent: number;
                                                                            }
                                                                        >,
                                                                    ).map(
                                                                        ([cat, val]) =>
                                                                            (val.volume > 0 || val.percent > 0) && (
                                                                                <div
                                                                                    key={`sales-mob-${cat}`}
                                                                                    className="flex items-center justify-between"
                                                                                >
                                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                                                        {cat}{" "}
                                                                                        <span className="text-slate-300">
                                                                                            ({fmtPct(val.percent)})
                                                                                        </span>
                                                                                    </span>
                                                                                    <span className="text-[9px] font-black text-emerald-500 tabular-nums">
                                                                                        + {fmt(val.commission)}
                                                                                    </span>
                                                                                </div>
                                                                            ),
                                                                    )}
                                                                {/* Production Breakdown (Kitchen/Bar) */}
                                                                {stats.productionBreakdown &&
                                                                    Object.entries(
                                                                        stats.productionBreakdown as Record<
                                                                            string,
                                                                            {
                                                                                volume: number;
                                                                                commission: number;
                                                                                percent: number;
                                                                            }
                                                                        >,
                                                                    ).map(
                                                                        ([cat, val]) =>
                                                                            val.volume > 0 && (
                                                                                <div
                                                                                    key={`prod-mob-${cat}`}
                                                                                    className="flex items-center justify-between"
                                                                                >
                                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">
                                                                                        {cat}{" "}
                                                                                        <span className="text-amber-300/50">
                                                                                            (Prod)
                                                                                        </span>
                                                                                    </span>
                                                                                    <span className="text-[9px] font-black text-emerald-500 tabular-nums">
                                                                                        + {fmt(val.commission)}
                                                                                    </span>
                                                                                </div>
                                                                            ),
                                                                    )}
                                                                {stats.commissionService > 0 && (
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                                            Billiard (Meja)
                                                                        </span>
                                                                        <span className="text-[9px] font-black text-emerald-500 tabular-nums">
                                                                            + {fmt(stats.commissionService)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                </div>
                                                <div className="p-4 bg-rose-50/60 rounded-2xl">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">
                                                            Total Deductions
                                                        </p>
                                                        <p className="text-sm font-black text-rose-600 tabular-nums">
                                                            - {fmt(stats.penalties)}
                                                        </p>
                                                    </div>
                                                    <div className="mt-2 pt-2 border-t border-rose-100/50 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Late Login</span>
                                                            <span className={`text-[8px] font-black tabular-nums ${stats.penaltiesLate > 0 ? "text-amber-600" : "text-slate-300"}`}>{stats.penaltiesLate > 0 ? "- " + fmt(stats.penaltiesLate) : "0"}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Idle / Out</span>
                                                            <span className={`text-[8px] font-black tabular-nums ${stats.penaltiesIdle > 0 ? "text-rose-500" : "text-slate-300"}`}>{stats.penaltiesIdle > 0 ? "- " + fmt(stats.penaltiesIdle) : "0"}</span>
                                                        </div>
                                                        {((stats.penalties || 0) - ((stats.penaltiesLate || 0) + (stats.penaltiesIdle || 0))) !== 0 && (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500">Manual/Koreksi</span>
                                                                <span className={`text-[8px] font-black tabular-nums ${((stats.penalties || 0) - ((stats.penaltiesLate || 0) + (stats.penaltiesIdle || 0))) < 0 ? "text-emerald-500" : "text-rose-600"}`}>
                                                                    {((stats.penalties || 0) - ((stats.penaltiesLate || 0) + (stats.penaltiesIdle || 0))) < 0 ? "+" : "-"} {fmt(Math.abs((stats.penalties || 0) - ((stats.penaltiesLate || 0) + (stats.penaltiesIdle || 0))))}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                                        <span className="flex items-center gap-1">
                                                            <Hash className="w-2 h-2" />{" "}
                                                            {stats.totalSessions || 0} SESI
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-2 h-2" />{" "}
                                                            {stats.activeDays || 0} HARI
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                                                        NET PAYABLE
                                                    </p>
                                                    <p className="text-2xl font-black text-slate-900 leading-none tabular-nums">
                                                        {fmt(stats.total)}
                                                    </p>
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

                <RoleModal
                    isMounted={isMounted}
                    showRoleModal={showRoleModal}
                    setShowRoleModal={setShowRoleModal}
                    editingRole={editingRole}
                    setEditingRole={setEditingRole}
                    newRole={newRole}
                    setNewRole={setNewRole}
                    handleCreateRole={handleCreateRole}
                    roleLoading={roleLoading}
                    toggleGroup={toggleGroup}
                    togglePermission={togglePermission}
                />

                {/* ── Import Excel Employee Modal ── */}
                <ImportExcelEmployeeModal
                    isOpen={showImportEmployeeModal}
                    onClose={() => setShowImportEmployeeModal(false)}
                    onSuccess={() => {
                        setShowImportEmployeeModal(false);
                        fetchData(true);
                    }}
                />

                <RegisterModal
                    isMounted={isMounted}
                    showRegisterModal={showRegisterModal}
                    setShowRegisterModal={setShowRegisterModal}
                    editingEmployee={editingEmployee}
                    newEmployee={newEmployee}
                    setNewEmployee={setNewEmployee}
                    roles={roles}
                    categories={categories}
                    availableShifts={availableShifts}
                    handleRegister={handleRegister}
                    resetRegisterForm={resetRegisterForm}
                    handleStartBiometricScan={handleStartBiometricScan}
                    isScanningRFID={isScanningRFID}
                    handleStartRfidScan={handleStartRfidScan}
                    handleCancelScan={handleCancelScan}
                />

                {/* Detailed Payroll Audit Modal */}
                <DetailedPayrollAuditModal
                    isMounted={isMounted}
                    showDetailedModal={showDetailedModal}
                    setShowDetailedModal={setShowDetailedModal}
                    selectedDetailedEmployee={selectedDetailedEmployee}
                    detailedTab={detailedTab}
                    setDetailedTab={setDetailedTab}
                    detailedLoading={detailedLoading}
                    detailedReport={detailedReport}
                    fmt={fmt}
                />

                <ViolationModal
                    showViolationModal={showViolationModal}
                    setShowViolationModal={setShowViolationModal}
                    manualViolation={manualViolation}
                    setManualViolation={setManualViolation}
                    handleLogViolation={handleLogViolation}
                />

                <BiometricModal
                    isMounted={isMounted}
                    showBiometricModal={showBiometricModal}
                    biometricScanning={biometricScanning}
                    handleCloseBiometricModal={handleCloseBiometricModal}
                    biometricData={biometricData}
                    biometricInstruction={biometricInstruction}
                    biometricStep={biometricStep}
                    handleStartBiometricScan={handleStartBiometricScan}
                />

                <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .fixed.inset-0.z-\\[100\\],
            .fixed.inset-0.z-\\[100\\] * {
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
            @keyframes scan {
              0%,
              100% {
                top: 0%;
                opacity: 0;
              }
              50% {
                top: 100%;
                opacity: 1;
              }
            }
          }
        `}</style>
            </div>
        </div>
    );
}
