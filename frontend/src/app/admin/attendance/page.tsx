'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Calendar, Clock, UserCheck, AlertCircle, CalendarDays,
    ChevronLeft, ChevronRight, Shuffle, Plus, Filter, Search,
    ClipboardList, Users, Ban, UserX, Info, CheckCircle2, X, RefreshCw,
    Pencil, Trash2, AlarmClock, Moon, Sun, Sunrise, Zap,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { useMqtt } from '@/context/MqttContext';
import { socket } from '@/lib/socket';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AttendanceRecord {
    id: number;
    userId: number;
    date: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    workDurationMinutes: number | null;
    overtimeMinutes: number;
    status: 'PRESENT' | 'LATE' | 'OVERTIME' | 'ABSENT' | 'ALPHA' | 'SAKIT' | 'IZIN' | 'PENDING';
    note: string | null;
    isManual: boolean;
    shiftName?: string;
    user: { id: number; name: string; role?: { name: string }; baseShift?: string };
}

interface ShiftDef {
    name: string;
    startTime: string;
    endTime: string;
    crossesMidnight?: boolean;
}

interface ShiftSchedule {
    id: number;
    userId: number;
    date: string;
    shiftName: string;
    isSwap: boolean;
    swappedWithUserId?: number;
    swapNote?: string;
    user: { id: number; name: string; role?: { name: string } };
}

interface BusinessClosure {
    id: number;
    startDate: string;
    endDate: string;
    reason: string;
}

interface Employee {
    id: number;
    name: string;
    role?: { name: string };
    baseShift?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SHIFT_ICONS: Record<string, React.ReactNode> = {
    SHIFT1: <Sun className="w-3 h-3" />,
    SHIFT2: <Moon className="w-3 h-3" />,
    OVERTIME: <Sunrise className="w-3 h-3" />,
    DEFAULT: <AlarmClock className="w-3 h-3" />,
};

const SHIFT_COLORS: Record<string, string> = {
    SHIFT1: 'bg-amber-50 text-amber-700 border-amber-200',
    SHIFT2: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    OVERTIME: 'bg-rose-50 text-rose-700 border-rose-200',
    DEFAULT: 'bg-slate-50 text-slate-600 border-slate-200',
};

const STATUS_STYLES: Record<string, string> = {
    PRESENT: 'bg-emerald-50 text-emerald-700',
    LATE: 'bg-amber-50 text-amber-700',
    OVERTIME: 'bg-orange-50 text-orange-700 border-orange-200',
    ALPHA: 'bg-rose-50 text-rose-700',
    ABSENT: 'bg-slate-50 text-slate-500',
    SAKIT: 'bg-blue-50 text-blue-700',
    IZIN: 'bg-purple-50 text-purple-700',
    PENDING: 'bg-slate-100 text-slate-500',
};

const STATUS_LABELS: Record<string, string> = {
    PRESENT: 'Hadir',
    LATE: 'Terlambat',
    OVERTIME: 'Lembur',
    ALPHA: 'Alpha',
    ABSENT: 'Tidak Hadir',
    SAKIT: 'Sakit',
    IZIN: 'Izin',
    PENDING: 'Menunggu',
};

function getShiftColor(name?: string | null): string {
    if (!name) return SHIFT_COLORS.DEFAULT;
    return SHIFT_COLORS[name.toUpperCase()] || SHIFT_COLORS.DEFAULT;
}

function getShiftIcon(name?: string | null): React.ReactNode {
    if (!name) return SHIFT_ICONS.DEFAULT;
    return SHIFT_ICONS[name.toUpperCase()] || SHIFT_ICONS.DEFAULT;
}

function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

function getWeekDates(baseDate: Date): Date[] {
    const dayOfWeek = baseDate.getDay();
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

function toLocalDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'rekap' | 'jadwal' | 'tutup';

export default function AttendancePage() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { subscribe } = useMqtt();

    const [activeTab, setActiveTab] = useState<Tab>('rekap');
    const [isLoading, setIsLoading] = useState(true);
    const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [availableShifts, setAvailableShifts] = useState<ShiftDef[]>([]);
    const [schedules, setSchedules] = useState<ShiftSchedule[]>([]);
    const [closures, setClosures] = useState<BusinessClosure[]>([]);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState(toLocalDateStr(new Date()));
    const [dateTo, setDateTo] = useState(toLocalDateStr(new Date()));

    // Week navigator for Jadwal tab
    const [weekBase, setWeekBase] = useState(new Date());
    const weekDates = useMemo(() => getWeekDates(weekBase), [weekBase]);
    const weekFrom = useMemo(() => toLocalDateStr(weekDates[0]), [weekDates]);
    const weekTo = useMemo(() => toLocalDateStr(weekDates[6]), [weekDates]);

    // Modals
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [pinAction, setPinAction] = useState<'IN' | 'OUT' | null>(null);
    const [pin, setPin] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isScanningRFID, setIsScanningRFID] = useState(false);

    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [assignForm, setAssignForm] = useState({ userId: '', date: toLocalDateStr(new Date()), shiftName: '' });

    const [isSwapOpen, setIsSwapOpen] = useState(false);
    const [swapForm, setSwapForm] = useState({ userAId: '', userBId: '', date: toLocalDateStr(new Date()), reason: '' });

    const [isClosureOpen, setIsClosureOpen] = useState(false);
    const [closureForm, setClosureForm] = useState({ startDate: toLocalDateStr(new Date()), endDate: toLocalDateStr(new Date()), reason: '' });

    const [isManualOpen, setIsManualOpen] = useState(false);
    const [manualForm, setManualForm] = useState({ 
        userId: '', 
        date: toLocalDateStr(new Date()), 
        status: 'SAKIT', 
        note: '',
        checkInTime: '',
        checkOutTime: ''
    });

    // Logical Date from Server (Optional but better)
    const [serverDate, setServerDate] = useState<string>(toLocalDateStr(new Date()));

    // ─── Fetchers ─────────────────────────────────────────────────────────────

    const fetchAll = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        try {
            const [todayRes, histRes, empRes, settingsRes] = await Promise.all([
                axios.get('/attendance/today').catch(() => ({ data: null })),
                axios.get('/attendance/history', { params: { from: dateFrom, to: dateTo } }),
                axios.get('/users/employees'),
                axios.get('/settings'),
            ]);

            // Silently sync without persistent toasts

            setTodayRecord(todayRes.data);
            setRecords(histRes.data);
            setEmployees(empRes.data || []);
            setAvailableShifts(settingsRes.data?.availableShifts || []);
        } catch (err) {
            console.error('Failed to fetch attendance data', err);
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    }, [dateFrom, dateTo, showToast]);

    const fetchSchedules = useCallback(async () => {
        try {
            const res = await axios.get('/attendance/schedules', {
                params: { from: weekFrom, to: weekTo }
            });
            setSchedules(res.data || []);
        } catch (err) {
            console.error('Failed to fetch schedules', err);
        }
    }, [weekFrom, weekTo]);

    const fetchClosures = useCallback(async () => {
        try {
            const res = await axios.get('/attendance/closures');
            setClosures(res.data || []);
        } catch (err) {
            console.error('Failed to fetch closures', err);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);
    useEffect(() => { fetchSchedules(); }, [fetchSchedules]);
    useEffect(() => { fetchClosures(); }, [fetchClosures]);

    // Listen for RFID Scans from Device (Real-time Integration)
    useEffect(() => {
        // 1. MQTT Listener (Langsung dari Alat)
        const unsubMqtt = subscribe('billiard/attendance/scan', (data: any) => {
            try {
                const payload = typeof data === 'string' ? JSON.parse(data) : data;
                if (payload && payload.uid) {
                    const isFinger = payload.uid.startsWith('FINGER_');
                    showToast(isFinger ? 'Sidik Jari Terdeteksi' : 'RFID Terdeteksi', `${isFinger ? 'Biometrik' : 'Kartu'} [${payload.uid}] terbaca.`, 'info');
                }
            } catch (err) { console.error(err); }
        });

        const handleServerEvent = (event: any) => {
            if (event.type === 'RFID_ATTEMPT' || event.type === 'FINGERPRINT_ATTEMPT') {
                const isFinger = event.data.uid?.startsWith('FINGER_');
                showToast('Server Memproses', `Mencari data untuk ${isFinger ? 'sidik jari' : 'kartu'} [${event.data.uid}]...`, 'info');
            }
            if (event.type === 'RFID_USER_IDENTIFIED' || event.type === 'USER_IDENTIFIED') {
                if (isPinModalOpen) {
                    handlePinSubmit(event.data.uid);
                } else {
                    showToast('Identitas Terverifikasi', `Halo ${event.data.name}, silakan pilih menu di atas.`, 'success');
                }
                fetchAll(true); // Auto refresh
            }
            if (event.type === 'RFID_NOT_FOUND') {
                showToast('Gagal Mengenali', `Kartu [${event.data.uid}] tidak terdaftar di sistem.`, 'error');
            }
            if (event.type === 'ATTENDANCE_UPDATE' || event.type === 'attendance_updated' || event.type === 'ATTENDANCE_APPROVED' || event.type === 'ATTENDANCE_PENDING') {
                fetchAll(true);
            }
        };

        if (!socket.connected) socket.connect();
        socket.on('attendance-updated', handleServerEvent);
        socket.on('attendance_updated', handleServerEvent);

        return () => {
            unsubMqtt();
            socket.off('attendance-updated', handleServerEvent);
            socket.off('attendance_updated', handleServerEvent);
        };
    }, [subscribe, fetchAll, isPinModalOpen, isScanningRFID, showToast]);

    // ─── Check-In / Check-Out ─────────────────────────────────────────────────

    const handlePinSubmit = async (manualPin?: string) => {
        const pinToUse = manualPin || pin;
        if (pinToUse.length < 4) return;
        setIsSubmitting(true);
        try {
            const endpoint = pinAction === 'IN' ? '/attendance/public/checkin' : '/attendance/public/checkout';
            await axios.post(endpoint, { pin: pinToUse });
            showToast(
                pinAction === 'IN' ? 'Check-in Berhasil!' : 'Check-out Berhasil!',
                pinAction === 'IN' ? 'Semangat bekerja hari ini!' : 'Terima kasih sudah bekerja keras!',
                'success'
            );
            setIsPinModalOpen(false);
            setPin('');
            axios.post('/attendance/public/prompt', { mode: 'RESET' }).catch(() => { });
            fetchAll();
        } catch (error: any) {
            showToast('Gagal', error.response?.data?.message || 'Terjadi kesalahan', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Shift Assignment ─────────────────────────────────────────────────────

    const handleAssignShift = async () => {
        if (!assignForm.userId || !assignForm.shiftName) return;
        setIsSubmitting(true);
        try {
            await axios.post('/attendance/schedules', {
                userId: Number(assignForm.userId),
                date: assignForm.date,
                shiftName: assignForm.shiftName,
            });
            showToast('Berhasil', 'Jadwal shift berhasil diatur', 'success');
            setIsAssignOpen(false);
            setAssignForm({ userId: '', date: toLocalDateStr(new Date()), shiftName: '' });
            fetchSchedules();
        } catch (err: any) {
            showToast('Gagal', err.response?.data?.message || 'Gagal mengatur jadwal', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Shift Swap ───────────────────────────────────────────────────────────

    const handleSwapShifts = async () => {
        if (!swapForm.userAId || !swapForm.userBId) return;
        setIsSubmitting(true);
        try {
            await axios.post('/attendance/schedules/swap', {
                userAId: Number(swapForm.userAId),
                userBId: Number(swapForm.userBId),
                date: swapForm.date,
                reason: swapForm.reason,
            });
            showToast('Tukar Shift Berhasil', 'Jadwal shift kedua karyawan sudah ditukar', 'success');
            setIsSwapOpen(false);
            setSwapForm({ userAId: '', userBId: '', date: toLocalDateStr(new Date()), reason: '' });
            fetchSchedules();
        } catch (err: any) {
            showToast('Gagal', err.response?.data?.message || 'Gagal menukar jadwal', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Delete Schedule ──────────────────────────────────────────────────────

    const handleDeleteSchedule = async (id: number) => {
        if (!confirm('Hapus jadwal ini? Karyawan akan kembali ke jadwal default (baseShift).')) return;
        try {
            await axios.delete(`/attendance/schedules/${id}`);
            showToast('Berhasil', 'Jadwal dihapus', 'success');
            fetchSchedules();
        } catch {
            showToast('Gagal', 'Gagal menghapus jadwal', 'error');
        }
    };

    // ─── Business Closure ─────────────────────────────────────────────────────

    const handleAddClosure = async () => {
        if (!closureForm.reason) return;
        setIsSubmitting(true);
        try {
            await axios.post('/attendance/closures', closureForm);
            showToast('Berhasil', 'Hari tutup berhasil ditambahkan', 'success');
            setIsClosureOpen(false);
            setClosureForm({ startDate: toLocalDateStr(new Date()), endDate: toLocalDateStr(new Date()), reason: '' });
            fetchClosures();
        } catch {
            showToast('Gagal', 'Gagal menambahkan hari tutup', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClosure = async (id: number) => {
        if (!confirm('Hapus hari tutup ini?')) return;
        try {
            await axios.delete(`/attendance/closures/${id}`);
            showToast('Berhasil', 'Hari tutup dihapus', 'success');
            fetchClosures();
        } catch {
            showToast('Gagal', 'Gagal menghapus hari tutup', 'error');
        }
    };

    // ─── Manual Entry ─────────────────────────────────────────────────────────

    const handleManualEntry = async () => {
        if (!manualForm.userId || !manualForm.note) return;
        setIsSubmitting(true);
        try {
            await axios.post('/attendance/manual', {
                userId: Number(manualForm.userId),
                date: manualForm.date,
                status: manualForm.status,
                note: manualForm.note,
                checkInTime: manualForm.checkInTime || null,
                checkOutTime: manualForm.checkOutTime || null,
            });
            showToast('Berhasil', 'Data absensi berhasil disimpan', 'success');
            setIsManualOpen(false);
            setManualForm({ 
                userId: '', 
                date: toLocalDateStr(new Date()), 
                status: 'SAKIT', 
                note: '',
                checkInTime: '',
                checkOutTime: ''
            });
            fetchAll();
        } catch (err: any) {
            showToast('Gagal', err.response?.data?.message || 'Gagal menyimpan', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAttendance = async (id: number) => {
        if (!confirm('Hapus data absensi ini?')) return;
        try {
            await axios.delete(`/attendance/${id}`);
            showToast('Berhasil', 'Data absensi dihapus', 'success');
            fetchAll();
        } catch {
            showToast('Gagal', 'Gagal menghapus data absensi', 'error');
        }
    };

    const openEditModal = (record: AttendanceRecord) => {
        setManualForm({
            userId: String(record.userId),
            date: record.date,
            status: record.status as any,
            note: record.note || '',
            checkInTime: record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
            checkOutTime: record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
        });
        setIsManualOpen(true);
    };

    // ─── Computed ─────────────────────────────────────────────────────────────

    const filteredRecords = useMemo(() =>
        records.filter(r => r.user.name.toLowerCase().includes(searchQuery.toLowerCase())),
        [records, searchQuery]
    );

    const stats = useMemo(() => ({
        present: records.filter(r => r.status === 'PRESENT').length,
        late: records.filter(r => r.status === 'LATE').length,
        alpha: records.filter(r => r.status === 'ALPHA').length,
    }), [records]);

    // Get scheduled employees for week view
    const weekScheduleMap = useMemo(() => {
        const map: Record<string, Record<string, ShiftSchedule>> = {};
        schedules.forEach(s => {
            if (!map[s.date]) map[s.date] = {};
            map[s.date][s.userId] = s;
        });
        return map;
    }, [schedules]);

    const scheduledEmployees = useMemo(() => {
        const ids = new Set(schedules.map(s => s.userId));
        const withBase = employees.filter(e => e.baseShift);
        withBase.forEach(e => ids.add(e.id));
        return employees.filter(e => ids.has(e.id));
    }, [employees, schedules]);

    // ─── Render ───────────────────────────────────────────────────────────────

    const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const today = toLocalDateStr(new Date());

    return (
        <div className="min-h-screen bg-slate-50 w-full overflow-x-hidden p-0 md:p-8 lg:p-10 flex flex-col">
            <div className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* ── Hero Header ── */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-800 via-indigo-700 to-slate-900 rounded-3xl p-6 lg:p-10 text-white shadow-2xl shadow-indigo-200 mb-6 md:mb-10">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12" />
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white  border border-white/20 shrink-0">
                                <CalendarDays className="w-7 h-7" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">PRESENSI KARYAWAN</h1>
                                <p className="text-[10px] md:text-xs font-bold text-indigo-200 uppercase tracking-[0.2em] mt-1">Monitoring Kehadiran & Shift Kerja</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                            <button
                                onClick={() => {
                                    setPinAction('IN');
                                    setIsPinModalOpen(true);
                                    setIsScanningRFID(true);
                                    axios.post('/attendance/public/prompt', { mode: 'CHECKIN' }).catch(() => { });
                                }}
                                className="group px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all relative overflow-hidden bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 flex-1 border border-emerald-400"
                            >
                                <Zap className="w-4 h-4 animate-pulse text-emerald-100" />
                                RFID CHECK-IN
                            </button>
                            <button
                                onClick={() => {
                                    setPinAction('OUT');
                                    setIsPinModalOpen(true);
                                    setIsScanningRFID(true);
                                    axios.post('/attendance/public/prompt', { mode: 'CHECKOUT' }).catch(() => { });
                                }}
                                className="group px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all relative overflow-hidden bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:scale-105 active:scale-95 flex-1 border border-slate-700"
                            >
                                <Zap className="w-4 h-4 animate-pulse text-indigo-400" />
                                RFID CHECK-OUT
                            </button>
                        </div>
                    </div>
                </div>

            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Status Hari Ini</p>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${todayRecord?.checkInTime ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-lg font-black text-slate-900 leading-tight">
                                {todayRecord?.checkInTime ? new Date(todayRecord.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Jam Masuk</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Hadir (Periode)</p>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                            <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-lg font-black text-slate-900 leading-tight">{stats.present}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Karyawan Hadir</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Terlambat</p>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-lg font-black text-slate-900 leading-tight">{stats.late}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Karyawan Late</p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-center">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Server Date</p>
                        <p className="text-lg font-black text-white leading-tight">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mt-1">{new Date().toLocaleDateString('id-ID', { weekday: 'long' })}</p>
                    </div>
                    <Calendar className="absolute top-1/2 right-4 -translate-y-1/2 w-16 h-16 text-white/5" />
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar whitespace-nowrap pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                {([
                    { key: 'rekap', label: 'Rekap Kehadiran', icon: <ClipboardList className="w-3.5 h-3.5" /> },
                    { key: 'jadwal', label: 'Jadwal Shift', icon: <Users className="w-3.5 h-3.5" /> },
                    { key: 'tutup', label: 'Hari Tutup', icon: <Ban className="w-3.5 h-3.5" /> },
                ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all
                            ${activeTab === tab.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* ══════════════════════════ TAB: REKAP ══════════════════════════ */}
            {activeTab === 'rekap' && (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/30">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Cari nama karyawan..."
                                    className="bg-white border border-slate-200 rounded-2xl py-2.5 pl-10 pr-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 w-full md:w-56"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2">
                                <Filter className="w-4 h-4 text-slate-400" />
                                <input type="date" className="bg-transparent text-xs font-black text-slate-700 outline-none" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                                <span className="text-slate-300">–</span>
                                <input type="date" className="bg-transparent text-xs font-black text-slate-700 outline-none" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase">
                                <span className="text-indigo-600">{filteredRecords.length}</span> Catatan
                            </p>
                            <button
                                onClick={() => setIsManualOpen(true)}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> Input Manual
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white/80 ">
                                <tr className="border-b border-slate-100">
                                    {['Tanggal', 'Karyawan', 'Shift', 'Masuk', 'Keluar', 'Durasi', 'Lembur', 'Status', 'Aksi'].map(h => (
                                        <th key={h} className={`px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ${h === 'Aksi' ? 'text-right' : ''}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredRecords.map(record => (
                                    <tr key={record.id} className="hover:bg-slate-50/80 transition-all group">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-black text-slate-900 tabular-nums">
                                                {new Date(record.date + 'T12:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                            {record.isManual && (
                                                <span className="text-[9px] font-black text-purple-500 uppercase">Manual</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-[10px] shrink-0">
                                                    {record.user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 leading-tight">{record.user.name}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{record.user.role?.name || 'Staff'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {record.shiftName ? (
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border ${getShiftColor(record.shiftName)}`}>
                                                    {getShiftIcon(record.shiftName)} {record.shiftName}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-300 font-bold">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-black text-slate-700 tabular-nums">
                                                {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-black text-slate-700 tabular-nums">
                                                {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : record.checkInTime ? <span className="text-[10px] text-emerald-500 font-black">On Duty</span> : '—'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {record.workDurationMinutes ? (
                                                <p className="text-sm font-black text-indigo-600 tabular-nums">{formatDuration(record.workDurationMinutes)}</p>
                                            ) : <span className="text-slate-300 text-xs">—</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {record.overtimeMinutes > 0 ? (
                                                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded">+{formatDuration(record.overtimeMinutes)}</span>
                                            ) : <span className="text-slate-300 text-xs">—</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${STATUS_STYLES[record.status] || STATUS_STYLES.ABSENT}`}>
                                                {STATUS_LABELS[record.status] || record.status}
                                            </span>
                                            {record.note && (
                                                <p className="text-[9px] text-slate-400 mt-1 max-w-[120px] truncate" title={record.note}>{record.note}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEditModal(record)}
                                                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                    title="Edit Data"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteAttendance(record.id)}
                                                    className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                    title="Hapus Data"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRecords.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-24 text-center">
                                            <UserX className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                                            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Tidak ada data presensi</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════════════════════════ TAB: JADWAL ══════════════════════════ */}
            {activeTab === 'jadwal' && (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                            <button onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d); }} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 transition-all shrink-0">
                                <ChevronLeft className="w-4 h-4 text-slate-600" />
                            </button>
                            <span className="text-xs md:text-sm font-black text-slate-900 text-center flex-1 md:flex-none md:min-w-[200px]">
                                {weekDates[0].toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — {weekDates[6].toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <button onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d); }} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 transition-all shrink-0">
                                <ChevronRight className="w-4 h-4 text-slate-600" />
                            </button>
                            <button onClick={() => setWeekBase(new Date())} className="w-full md:w-auto px-4 py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-black uppercase hover:bg-indigo-600 hover:text-white transition-all mt-2 md:mt-0">Minggu Ini</button>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsAssignOpen(true)}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-indigo-700 transition-all"
                            >
                                <Plus className="w-3.5 h-3.5" /> Atur Jadwal
                            </button>
                            <button
                                onClick={() => setIsSwapOpen(true)}
                                className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-amber-600 transition-all"
                            >
                                <Shuffle className="w-3.5 h-3.5" /> Tukar Shift
                            </button>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-3">
                        {availableShifts.map(s => (
                            <span key={s.name} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black border ${getShiftColor(s.name)}`}>
                                {getShiftIcon(s.name)} {s.name}: {s.startTime}–{s.endTime}
                            </span>
                        ))}
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200">
                            <RefreshCw className="w-3 h-3" /> Swap = Tukar Shift
                        </span>
                    </div>

                    {/* Weekly Grid */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="px-5 py-4 text-left text-[10px] font-black text-slate-400 uppercase w-40">Karyawan</th>
                                        {weekDates.map((d, i) => {
                                            const dStr = toLocalDateStr(d);
                                            const isToday = dStr === today;
                                            const isClosed = closures.some(c => c.startDate <= dStr && c.endDate >= dStr);
                                            return (
                                                <th key={i} className={`px-3 py-4 text-center text-[10px] font-black uppercase ${isToday ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
                                                    <p>{DAY_NAMES[i]}</p>
                                                    <p className={`text-base font-black mt-0.5 ${isToday ? 'text-indigo-600' : 'text-slate-800'}`}>{d.getDate()}</p>
                                                    {isClosed && <span className="block text-[8px] text-rose-500 font-black mt-0.5 uppercase">TUTUP</span>}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {scheduledEmployees.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="py-16 text-center text-xs font-black text-slate-300 uppercase">
                                                Belum ada karyawan dengan jadwal shift
                                            </td>
                                        </tr>
                                    )}
                                    {scheduledEmployees.map(emp => (
                                        <tr key={emp.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 font-black text-[10px] flex items-center justify-center shrink-0">
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 leading-tight">{emp.name}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{emp.baseShift || '—'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {weekDates.map((d, i) => {
                                                const dStr = toLocalDateStr(d);
                                                const explicit = weekScheduleMap[dStr]?.[emp.id];
                                                const displayShift = explicit?.shiftName || emp.baseShift;
                                                const isClosed = closures.some(c => c.startDate <= dStr && c.endDate >= dStr);
                                                return (
                                                    <td key={i} className={`px-2 py-3 text-center ${dStr === today ? 'bg-indigo-50/50' : ''}`}>
                                                        {isClosed ? (
                                                            <span className="text-[9px] text-rose-300 font-black">TUTUP</span>
                                                        ) : displayShift ? (
                                                            <div className="relative group/cell">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black border ${getShiftColor(displayShift)} ${explicit?.isSwap ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}>
                                                                    {getShiftIcon(displayShift)} {displayShift}
                                                                    {explicit?.isSwap && <Shuffle className="w-2.5 h-2.5 text-amber-500" />}
                                                                </span>
                                                                {explicit && (
                                                                    <button
                                                                        onClick={() => handleDeleteSchedule(explicit.id)}
                                                                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full hidden group-hover/cell:flex items-center justify-center transition-all"
                                                                    >
                                                                        <X className="w-2.5 h-2.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-200 text-[10px]">—</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center gap-3">
                            <Info className="w-4 h-4 text-slate-400 shrink-0" />
                            <p className="text-[10px] font-bold text-slate-400">
                                Badge <span className="text-amber-500 font-black">⇄</span> menandakan tukar shift. Klik <X className="w-3 h-3 inline text-rose-400" /> untuk menghapus jadwal dan kembali ke jadwal default.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════ TAB: TUTUP ══════════════════════════ */}
            {activeTab === 'tutup' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-black text-slate-900">Hari Tutup Operasional</h2>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">
                                Karyawan <span className="text-rose-500">tidak</span> akan di-ALPHA pada hari yang ditandai tutup.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsClosureOpen(true)}
                            className="flex items-center gap-2 bg-rose-600 text-white px-5 py-3 rounded-xl text-xs font-black uppercase hover:bg-rose-700 transition-all"
                        >
                            <Plus className="w-3.5 h-3.5" /> Tandai Tutup
                        </button>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                        {closures.length === 0 ? (
                            <div className="py-20 text-center">
                                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Tidak ada hari tutup yang ditandai</p>
                                <p className="text-[10px] text-slate-300 mt-1">Otomatis: semua karyawan bershift akan dicek absensinya tiap hari</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {closures.map(c => {
                                    const start = new Date(c.startDate + 'T12:00:00');
                                    const end = new Date(c.endDate + 'T12:00:00');
                                    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
                                    return (
                                        <div key={c.id} className="flex items-center justify-between px-8 py-5 hover:bg-slate-50/50 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                                                    <Ban className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">{c.reason}</p>
                                                    <p className="text-xs font-bold text-slate-400 mt-0.5">
                                                        {start.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        {days > 1 && ` — ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                                                        <span className="ml-2 text-[10px] font-black text-rose-400 bg-rose-50 px-2 py-0.5 rounded">{days} hari</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteClosure(c.id)}
                                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══════════════════════════ MODAL: RFID & PIN ══════════════════════════ */}
            {isPinModalOpen && (
                <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="absolute inset-0 bg-slate-900/80  animate-in fade-in duration-300" onClick={() => {
                        setIsPinModalOpen(false);
                        axios.post('/attendance/public/prompt', { mode: 'RESET' }).catch(() => { });
                    }} />
                    <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 relative max-h-[90vh] flex flex-col">
                        <div className="p-8 text-center space-y-8 overflow-y-auto no-scrollbar pb-[calc(2rem+env(safe-area-inset-bottom,20px))] sm:pb-8 flex-1">
                            <div className="flex justify-center">
                                <div className="relative">
                                    {isScanningRFID && (
                                        <>
                                            <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20" />
                                            <div className="absolute inset-[-10px] bg-indigo-500 rounded-full animate-ping opacity-10 delay-300" />
                                        </>
                                    )}
                                    <div className={`relative w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-xl ${pinAction === 'IN' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
                                        <Zap className={`w-10 h-10 ${isScanningRFID ? 'animate-bounce' : ''}`} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                                    MODAL {pinAction === 'IN' ? 'CHECK-IN' : 'CHECK-OUT'}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                                    {isScanningRFID ? 'Silakan Tempelkan Kartu atau Sidik Jari Anda' : 'Masukkan PIN Keamanan Karyawan'}
                                </p>
                            </div>

                            {isScanningRFID ? (
                                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] py-12 px-6 space-y-4">
                                    <div className="flex justify-center gap-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                        ))}
                                    </div>
                                    <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">Menunggu Sinyal Perangkat...</p>
                                    <button
                                        onClick={() => setIsScanningRFID(false)}
                                        className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-200 hover:text-slate-900 transition-all pt-4"
                                    >
                                        Gunakan PIN Manual
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <input
                                        type="password" maxLength={6} placeholder="••••••"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-3xl py-6 text-center text-4xl font-black tracking-[0.5em] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 placeholder:text-slate-200"
                                        value={pin} onChange={e => setPin(e.target.value)} autoFocus
                                        onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
                                    />
                                    <button
                                        onClick={() => setIsScanningRFID(true)}
                                        className="text-[10px] font-black text-indigo-600 uppercase border-b border-indigo-200 hover:text-indigo-800 transition-all"
                                    >
                                        Kembali ke Mode Scan
                                    </button>
                                </div>
                            )}

                            <div className={`grid gap-4 ${isScanningRFID ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                <button onClick={() => {
                                    setIsPinModalOpen(false);
                                    setPin('');
                                    axios.post('/attendance/public/prompt', { mode: 'RESET' }).catch(() => { });
                                }} className="py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200 shadow-sm">
                                    Batal
                                </button>
                                {!isScanningRFID && (
                                    <button onClick={() => handlePinSubmit()} disabled={pin.length < 4 || isSubmitting} className={`py-4 rounded-2xl font-black text-[10px] uppercase text-white shadow-lg disabled:opacity-50 tracking-widest ${pinAction === 'IN' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-slate-900 shadow-slate-200'}`}>
                                        {isSubmitting ? 'PROSES...' : 'KONFIRMASI'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════ MODAL: ASSIGN SHIFT ══════════════════════════ */}
            {isAssignOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 ">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 space-y-5">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Atur Jadwal Shift</h3>
                                <p className="text-xs font-bold text-slate-400 mt-1">Assign shift spesifik ke karyawan pada tanggal tertentu</p>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Karyawan</label>
                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                                        value={assignForm.userId} onChange={e => setAssignForm(f => ({ ...f, userId: e.target.value }))}>
                                        <option value="">Pilih karyawan...</option>
                                        {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role?.name || 'Staff'})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Tanggal</label>
                                    <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                                        value={assignForm.date} onChange={e => setAssignForm(f => ({ ...f, date: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Shift</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {availableShifts.map(s => (
                                            <button key={s.name}
                                                onClick={() => setAssignForm(f => ({ ...f, shiftName: s.name }))}
                                                className={`flex items-center justify-between px-4 py-3 rounded-2xl border-2 text-sm font-black transition-all ${assignForm.shiftName === s.name ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-slate-300'}`}
                                            >
                                                <span className="flex items-center gap-2">{getShiftIcon(s.name)} {s.name}</span>
                                                <span className="text-xs font-bold text-slate-500">{s.startTime} – {s.endTime}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button onClick={() => setIsAssignOpen(false)} className="py-4 rounded-2xl font-black text-[10px] text-slate-400 uppercase hover:bg-slate-50">Batal</button>
                                <button onClick={handleAssignShift} disabled={!assignForm.userId || !assignForm.shiftName || isSubmitting}
                                    className="py-4 rounded-2xl font-black text-[10px] uppercase bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50">
                                    {isSubmitting ? 'Menyimpan...' : 'Simpan Jadwal'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════ MODAL: SWAP SHIFT ══════════════════════════ */}
            {isSwapOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 ">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 space-y-5">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                    <Shuffle className="w-5 h-5 text-amber-500" /> Tukar Shift
                                </h3>
                                <p className="text-xs font-bold text-slate-400 mt-1">Tukar jadwal shift antara dua karyawan pada tanggal yang sama</p>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Tanggal</label>
                                    <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                                        value={swapForm.date} onChange={e => setSwapForm(f => ({ ...f, date: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Karyawan A</label>
                                        <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                                            value={swapForm.userAId} onChange={e => setSwapForm(f => ({ ...f, userAId: e.target.value }))}>
                                            <option value="">Pilih...</option>
                                            {employees.filter(e => e.id !== Number(swapForm.userBId)).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Karyawan B</label>
                                        <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                                            value={swapForm.userBId} onChange={e => setSwapForm(f => ({ ...f, userBId: e.target.value }))}>
                                            <option value="">Pilih...</option>
                                            {employees.filter(e => e.id !== Number(swapForm.userAId)).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Alasan Tukar (Opsional)</label>
                                    <input type="text" placeholder="misal: ada acara keluarga..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                                        value={swapForm.reason} onChange={e => setSwapForm(f => ({ ...f, reason: e.target.value }))} />
                                </div>
                            </div>
                            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                                <p className="text-[10px] font-black text-indigo-700 uppercase tracking-wide">
                                    ℹ️ Sistem akan otomatis membaca shift default karyawan (dari data registrasi) jika belum ada jadwal khusus di tanggal ini. Tidak perlu "Atur Jadwal" terlebih dahulu.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setIsSwapOpen(false)} className="py-4 rounded-2xl font-black text-[10px] text-slate-400 uppercase hover:bg-slate-50">Batal</button>
                                <button onClick={handleSwapShifts} disabled={!swapForm.userAId || !swapForm.userBId || isSubmitting}
                                    className="py-4 rounded-2xl font-black text-[10px] uppercase bg-amber-500 text-white shadow-lg hover:bg-amber-600 disabled:opacity-50">
                                    {isSubmitting ? 'Proses...' : 'Konfirmasi Tukar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════ MODAL: CLOSURE ══════════════════════════ */}
            {isClosureOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 ">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 space-y-5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center"><Ban className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">Tandai Hari Tutup</h3>
                                    <p className="text-xs font-bold text-slate-400">Karyawan tidak akan di-ALPHA</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Dari Tanggal</label>
                                        <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3 text-sm font-bold outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400"
                                            value={closureForm.startDate} onChange={e => setClosureForm(f => ({ ...f, startDate: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Sampai Tanggal</label>
                                        <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3 text-sm font-bold outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400"
                                            value={closureForm.endDate} onChange={e => setClosureForm(f => ({ ...f, endDate: e.target.value }))} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Alasan / Keterangan</label>
                                    <input type="text" placeholder="misal: Renovasi, Libur Nasional..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400"
                                        value={closureForm.reason} onChange={e => setClosureForm(f => ({ ...f, reason: e.target.value }))} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setIsClosureOpen(false)} className="py-4 rounded-2xl font-black text-[10px] text-slate-400 uppercase hover:bg-slate-50">Batal</button>
                                <button onClick={handleAddClosure} disabled={!closureForm.reason || isSubmitting}
                                    className="py-4 rounded-2xl font-black text-[10px] uppercase bg-rose-600 text-white shadow-lg disabled:opacity-50">
                                    {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PREMIUM MANUAL INPUT MODAL (iOS Slide-Up Sheet) --- */}
            {isManualOpen && (
                <div className="fixed inset-0 z-[100] bg-black/15 flex flex-col justify-end md:justify-center animate-in fade-in duration-200">
                    <div className="absolute inset-0" onClick={() => setIsManualOpen(false)} />
                    
                    <div className="relative bg-white w-full h-[85vh] max-h-[calc(100vh-max(3.75rem,env(safe-area-inset-top)+1.5rem))] md:h-[88vh] md:max-w-md md:m-auto rounded-t-[2.25rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col transform transition-all border-0 outline-none animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 z-10">
                        
                        {/* Mobile Drag Handle Indicator Bar */}
                        <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800">
                            <div className="w-11 h-1 bg-white/40 rounded-full" />
                        </div>

                        {/* Modal Header with Gradient */}
                        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-6 py-5 text-white relative shrink-0">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <AlarmClock className="w-20 h-20 rotate-12" />
                            </div>
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 bg-white/20  rounded-2xl flex items-center justify-center border-0 shrink-0">
                                        <Plus className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black tracking-tight uppercase leading-tight">Input Absensi</h3>
                                        <p className="text-indigo-100 text-[9px] font-bold uppercase tracking-widest opacity-80">Manual Record Entry</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsManualOpen(false)}
                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Content Body */}
                        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 sm:py-6 space-y-5 custom-scrollbar">
                            {/* Karyawan Select */}
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    <Users className="w-3.5 h-3.5 text-indigo-500" /> Karyawan
                                </label>
                                <div className="relative">
                                    <select 
                                        className="w-full h-12 bg-slate-50 border border-slate-200/90 rounded-2xl px-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer appearance-none"
                                        value={manualForm.userId} 
                                        onChange={e => setManualForm(f => ({ ...f, userId: e.target.value }))}
                                    >
                                        <option value="" className="text-slate-400">Pilih karyawan...</option>
                                        {employees.map(e => <option key={e.id} value={e.id} className="text-slate-900">{e.name.toUpperCase()}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Tanggal Presensi (Bounded iOS Safe Wrapper) */}
                            <div className="space-y-1.5 w-full min-w-0">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Tanggal Presensi
                                </label>
                                <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl">
                                    <input 
                                        type="date" 
                                        className="w-full max-w-full h-12 bg-slate-50 border border-slate-200/90 rounded-2xl px-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer block text-center sm:text-left [color-scheme:light] box-border"
                                        value={manualForm.date} 
                                        onChange={e => setManualForm(f => ({ ...f, date: e.target.value }))} 
                                    />
                                </div>
                            </div>

                            {/* JAM MASUK & KELUAR (iOS WebKit Bounded Grid) */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full min-w-0">
                                <div className="space-y-1.5 w-full min-w-0">
                                    <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span className="truncate">Jam Masuk</span>
                                    </label>
                                    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl">
                                        <input 
                                            type="time" 
                                            className="w-full max-w-full h-12 bg-slate-50 border border-slate-200/90 rounded-2xl px-2 sm:px-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-center cursor-pointer block [color-scheme:light] box-border"
                                            value={manualForm.checkInTime} 
                                            onChange={e => setManualForm(f => ({ ...f, checkInTime: e.target.value }))} 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5 w-full min-w-0">
                                    <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                        <span className="truncate">Jam Keluar</span>
                                    </label>
                                    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl">
                                        <input 
                                            type="time" 
                                            className="w-full max-w-full h-12 bg-slate-50 border border-slate-200/90 rounded-2xl px-2 sm:px-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all text-center cursor-pointer block [color-scheme:light] box-border"
                                            value={manualForm.checkOutTime} 
                                            onChange={e => setManualForm(f => ({ ...f, checkOutTime: e.target.value }))} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Status Grid */}
                            <div className="space-y-2 pt-1">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    <Zap className="w-3.5 h-3.5 text-indigo-500" /> Pilih Status Presensi
                                </label>
                                <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                                    {[
                                        { id: 'PRESENT', label: 'Hadir', icon: CheckCircle2 },
                                        { id: 'LATE', label: 'Telat', icon: Clock },
                                        { id: 'OVERTIME', label: 'Lembur', icon: Zap },
                                        { id: 'SAKIT', label: 'Sakit', icon: Info },
                                        { id: 'IZIN', label: 'Izin', icon: Shuffle },
                                        { id: 'ALPHA', label: 'Alpha', icon: UserX },
                                        { id: 'ABSENT', label: 'Absen', icon: Ban },
                                    ].map(s => (
                                        <button 
                                            key={s.id}
                                            type="button"
                                            onClick={() => setManualForm(f => ({ ...f, status: s.id }))}
                                            className={`flex flex-col items-center justify-center py-2.5 sm:py-3 rounded-2xl border-2 transition-all duration-300 gap-1 active:scale-95 ${
                                                manualForm.status === s.id 
                                                ? `border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-md ring-2 ring-indigo-600/10 font-bold` 
                                                : 'border-slate-100 bg-slate-50/50 text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            <s.icon className={`w-4 h-4 ${manualForm.status === s.id ? 'text-indigo-600' : 'text-slate-300'}`} />
                                            <span className="text-[9px] font-black uppercase tracking-tight truncate max-w-full px-1">{s.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Keterangan */}
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    <ClipboardList className="w-3.5 h-3.5 text-indigo-500" /> Keterangan Catatan
                                </label>
                                <input 
                                    placeholder="Tulis catatan di sini..." 
                                    className="w-full h-12 bg-slate-50 border border-slate-200/90 rounded-2xl px-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
                                    value={manualForm.note} 
                                    onChange={e => setManualForm(f => ({ ...f, note: e.target.value }))} 
                                />
                            </div>
                        </div>

                        {/* Sticky Modal Footer (iOS Home Bar Safe) */}
                        <div className="px-5 py-4 bg-white border-t border-slate-100 shrink-0 flex items-center gap-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                            <button 
                                type="button"
                                onClick={() => setIsManualOpen(false)} 
                                className="py-3.5 px-4 rounded-2xl font-black text-[10px] text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all"
                            >
                                Batal
                            </button>
                            <button 
                                type="button"
                                onClick={handleManualEntry} 
                                disabled={!manualForm.userId || !manualForm.note || isSubmitting}
                                className="flex-1 py-3.5 px-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                {isSubmitting ? 'Menyimpan...' : 'Simpan Presensi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
);
}
