'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Save, Building2, Receipt, Settings2, Cpu, CheckCircle2, Loader2, Database, Trash2, Archive, BarChart3, AlertTriangle, RefreshCw, ChevronRight, Clock, HardDrive, Tag, Package, ShieldOff, Globe, Languages, Target, Sparkles, Calculator, Info, Orbit, DollarSign, Monitor, Image, Upload, Zap, AlertCircle, Terminal, Plus } from 'lucide-react';

import InputField from '@/components/ui/InputField';
import { useAuth } from '@/context/AuthContext';
import { useLanguage, type Locale } from '@/context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function BusinessSettings() {
    const router = useRouter();
    const { hasPermission, loading: authLoading, terminalId, setTerminalId } = useAuth();
    const { locale, setLocale, t } = useLanguage();
    const [settings, setSettings] = useState<any>(null);
    const [lastSavedSettings, setLastSavedSettings] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('identity');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [networkInfo, setNetworkInfo] = useState<{ primaryIp: string, ipAddresses: string[] } | null>(null);

    // Maintenance state
    const [dbStats, setDbStats] = useState<any>(null);
    const [dbStatsLoading, setDbStatsLoading] = useState(false);
    const [maintenanceForm, setMaintenanceForm] = useState({
        purgeAuditLogs: true,
        auditLogDays: 30,
        purgeSessions: true,
        sessionDays: 90,
        archiveTransactions: false,
        transactionDays: 90,
        archiveCashflow: false,
        cashflowDays: 365,
    });
    const [maintenanceRunning, setMaintenanceRunning] = useState(false);
    const [maintenanceResult, setMaintenanceResult] = useState<string | null>(null);
    const [maintenanceError, setMaintenanceError] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [previewCounts, setPreviewCounts] = useState<{ auditLogs: number; sessions: number; transactions: number; cashflow: number } | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // AI Gamification Analytics State
    const [gamificationStats, setGamificationStats] = useState<any>(null);
    const [gamiStatsLoading, setGamiStatsLoading] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    // Tab Permission Matrix — preferences is always accessible
    const tabPermissions: Record<string, string> = React.useMemo(() => ({
        'identity': 'SETTING_IDENTITY',
        'policy': 'SETTING_POLICY',
        'operation': 'SETTING_OPERATION',
        'hardware': 'SETTING_HARDWARE',
        'invoice': 'SETTING_INVOICE',
        'database': 'SETTING_DATABASE',
        'gamification': 'SETTING_GAMIFICATION',
        'cfd': 'SETTING_DISPLAY',
        'preferences': 'SETTING_PREFERENCES'
    }), []);

    // Auto-switch to first available tab if activeTab is not allowed
    useEffect(() => {
        if (!authLoading && !hasPermission(tabPermissions[activeTab])) {
            const firstAvailable = Object.keys(tabPermissions).find(tab => hasPermission(tabPermissions[tab]));
            if (firstAvailable && firstAvailable !== activeTab) {
                setActiveTab(firstAvailable);
            }
        }
    }, [authLoading, hasPermission, activeTab, tabPermissions]);

    const fetchSettings = async () => {
        try {
            const [settingsRes, networkRes] = await Promise.all([
                axios.get(`${API_URL}/settings`),
                axios.get(`${API_URL}/settings/network`)
            ]);
            setSettings(settingsRes.data);
            setLastSavedSettings(settingsRes.data);
            setNetworkInfo(networkRes.data);
        } catch (err) {
            console.error('Failed to load settings', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (file: File, type: 'logo' | 'promo') => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            setUploading(true);
            const res = await axios.post(`${API_URL}/settings/upload/${type}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data.url;
        } catch (err) {
            console.error('Upload failed', err);
            alert('Gagal mengunggah gambar. Pastikan format file benar (JPG/PNG).');
            return null;
        } finally {
            setUploading(false);
        }
    };

    const fetchDbStats = useCallback(async () => {
        setDbStatsLoading(true);
        try {
            const res = await axios.get(`${API_URL}/admin/maintenance/stats`);
            setDbStats(res.data);
        } catch (err) {
            console.error('Failed to load DB stats', err);
        } finally {
            setDbStatsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'database' && !dbStats && !dbStatsLoading) fetchDbStats();
        
        if (activeTab === 'gamification' && !gamificationStats && !gamiStatsLoading) {
            setGamiStatsLoading(true);
            const token = localStorage.getItem('token');
            axios.get(`${API_URL}/loyalty/admin/analytics`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(res => setGamificationStats(res.data))
            .catch(err => console.error("Stats Error:", err))
            .finally(() => setGamiStatsLoading(false));
        }
    }, [activeTab, dbStats, fetchDbStats, gamificationStats, dbStatsLoading, gamiStatsLoading]);

    const fetchPreview = useCallback(async (form: typeof maintenanceForm) => {
        setPreviewLoading(true);
        try {
            const res = await axios.get(`${API_URL}/admin/maintenance/preview`, {
                params: {
                    auditLogDays: form.auditLogDays,
                    sessionDays: form.sessionDays,
                    transactionDays: form.transactionDays,
                    cashflowDays: form.cashflowDays,
                }
            });
            setPreviewCounts(res.data);
        } catch (err) {
            console.error('Preview failed', err);
        } finally {
            setPreviewLoading(false);
        }
    }, []);

    // Auto-fetch preview saat tab database dibuka atau form berubah (debounced 600ms)
    useEffect(() => {
        if (activeTab !== 'database') return;
        const timer = setTimeout(() => fetchPreview(maintenanceForm), 600);
        return () => clearTimeout(timer);
    }, [activeTab, maintenanceForm, fetchPreview]);

    const runSelectedMaintenance = async () => {
        setMaintenanceRunning(true);
        setMaintenanceResult(null);
        setMaintenanceError(null);
        setConfirmOpen(false);
        const results: string[] = [];
        try {
            if (maintenanceForm.purgeAuditLogs) {
                const res = await axios.post(`${API_URL}/admin/maintenance/purge-audit-logs?days=${maintenanceForm.auditLogDays}`);
                results.push(`🧹 Audit Logs: ${res.data.message}`);
            }
            if (maintenanceForm.purgeSessions) {
                const res = await axios.post(`${API_URL}/admin/maintenance/purge-sessions?days=${maintenanceForm.sessionDays}`);
                results.push(`⌛ Sessions: ${res.data.message}`);
            }
            if (maintenanceForm.archiveTransactions) {
                const res = await axios.post(`${API_URL}/admin/maintenance/archive-transactions?days=${maintenanceForm.transactionDays}`);
                results.push(`📦 Transaksi: ${res.data.message}`);
            }
            if (maintenanceForm.archiveCashflow) {
                const res = await axios.post(`${API_URL}/admin/maintenance/archive-cashflow?days=${maintenanceForm.cashflowDays}`);
                results.push(`💰 Cashflow: ${res.data.message}`);
            }

            if (results.length === 0) {
                setMaintenanceError('Tidak ada tugas yang dipilih.');
            } else {
                setMaintenanceResult(results.join('\n'));
                // Delay 1s before refreshing stats to allow DB to settle
                setTimeout(() => fetchDbStats(), 1000);
            }
        } catch (err: any) {
            console.error('Maintenance error:', err);
            setMaintenanceError(err?.response?.data?.message || 'Terjadi kesalahan saat menjalankan maintenance database.');
        } finally {
            setMaintenanceRunning(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.patch(`${API_URL}/settings`, settings);
            setLastSavedSettings(settings); // Update placeholders after save
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            alert('Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
        }
    };

    if (loading || authLoading) return <div className="p-12 text-center text-indigo-600 font-bold flex items-center justify-center gap-3">
        <Loader2 className="animate-spin" /> Memuat Pengaturan...
    </div>;

    const availableTabs = Object.keys(tabPermissions).filter(tab => hasPermission(tabPermissions[tab]));

    if (availableTabs.length === 0) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-10 text-center">
                <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mb-6 border-2 border-rose-100 shadow-xl shadow-rose-100/50">
                    <ShieldOff className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter uppercase">Akses Terbatas</h2>
                <p className="text-slate-500 max-w-md font-medium leading-relaxed">
                    Maaf, akun Anda tidak memiliki izin untuk mengakses pengaturan sistem ini.
                    Silakan hubungi Administrator untuk mendapatkan akses.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-5xl mx-auto">
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 rounded-3xl p-8 lg:p-10 text-white shadow-2xl shadow-indigo-200 mb-8 md:mb-10">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12" />
                    <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <Settings2 className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">System Configuration</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight">{t('settings.title')}</h1>
                            <p className="text-white/60 text-sm font-semibold mt-1">{t('settings.subtitle')}</p>
                        </div>
                        {showSuccess && (
                            <div className="flex items-center gap-2 bg-emerald-500/20 backdrop-blur-sm text-emerald-100 border border-emerald-400 px-4 py-3 rounded-2xl text-sm font-black animate-bounce shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                                <CheckCircle2 className="w-5 h-5 text-emerald-300" /> {t('settings.savedSuccess')}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar Tabs */}
                    <div className="w-full md:w-64 flex md:flex-col overflow-x-auto md:overflow-visible pb-4 md:pb-0 scrollbar-hide gap-2">
                        {hasPermission('SETTING_IDENTITY') && (
                            <TabButton
                                active={activeTab === 'identity'}
                                onClick={() => setActiveTab('identity')}
                                icon={<Building2 className="w-5 h-5" />}
                                label={t('settings.tabs.identity')}
                            />
                        )}
                        {hasPermission('SETTING_POLICY') && (
                            <TabButton
                                active={activeTab === 'policy'}
                                onClick={() => setActiveTab('policy')}
                                icon={<Receipt className="w-5 h-5" />}
                                label={t('settings.tabs.policy')}
                            />
                        )}
                        {hasPermission('SETTING_OPERATION') && (
                            <TabButton
                                active={activeTab === 'operation'}
                                onClick={() => setActiveTab('operation')}
                                icon={<Settings2 className="w-5 h-5" />}
                                label={t('settings.tabs.operation')}
                            />
                        )}
                        {hasPermission('SETTING_HARDWARE') && (
                            <TabButton
                                active={activeTab === 'hardware'}
                                onClick={() => setActiveTab('hardware')}
                                icon={<Cpu className="w-5 h-5" />}
                                label={t('settings.tabs.hardware')}
                            />
                        )}
                        {hasPermission('SETTING_INVOICE') && (
                            <TabButton
                                active={activeTab === 'invoice'}
                                onClick={() => setActiveTab('invoice')}
                                icon={<Receipt className="w-5 h-5" />}
                                label={t('settings.tabs.invoice')}
                            />
                        )}
                        {hasPermission('SETTING_DATABASE') && (
                            <TabButton
                                active={activeTab === 'database'}
                                onClick={() => setActiveTab('database')}
                                icon={<Database className="w-5 h-5" />}
                                label={t('settings.tabs.database')}
                            />
                        )}
                        {hasPermission('SETTING_GAMIFICATION') && (
                            <TabButton
                                active={activeTab === 'gamification'}
                                onClick={() => setActiveTab('gamification')}
                                icon={<Target className="w-5 h-5" />}
                                label="Gamifikasi & Poin"
                            />
                        )}

                        {hasPermission('SETTING_DISPLAY') && (
                            <TabButton
                                active={activeTab === 'cfd'}
                                onClick={() => setActiveTab('cfd')}
                                icon={<Monitor className="w-5 h-5" />}
                                label="Display & Marketing"
                            />
                        )}

                        {hasPermission('SETTING_PREFERENCES') && (
                            <TabButton
                                active={activeTab === 'preferences'}
                                onClick={() => setActiveTab('preferences')}
                                icon={<Globe className="w-5 h-5" />}
                                label={t('settings.tabs.preferences')}
                            />
                        )}
                    </div>

                    {/* Form Content */}
                    <div className="flex-1">
                        <form onSubmit={handleUpdate} className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 md:p-10 border border-slate-100">
                            {activeTab === 'identity' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <h3 className="text-xl font-black text-slate-800 mb-6">Informasi Bisnis</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <InputField
                                            label="Nama Bisnis"
                                            value={settings?.businessName}
                                            savedValue={lastSavedSettings?.businessName}
                                            isEditing={true}
                                            onChange={(val) => setSettings({ ...settings, businessName: val })}
                                            placeholder="Contoh: SpotOn Billiard"
                                        />
                                        <InputField
                                            label="Nomor Kontak"
                                            value={settings.contact}
                                            savedValue={lastSavedSettings?.contact}
                                            isEditing={true}
                                            onChange={(val) => setSettings({ ...settings, contact: val })}
                                            placeholder="Contoh: 0812-3456-7890"
                                        />
                                    </div>
                                    <InputField
                                        label="Alamat Lengkap"
                                        value={settings.address}
                                        savedValue={lastSavedSettings?.address}
                                        isEditing={true}
                                        onChange={(val) => setSettings({ ...settings, address: val })}
                                        placeholder="Jalan, Kota, Kode Pos"
                                    />
                                    <InputField
                                        label="Link Social Media (QR Code)"
                                        value={settings.socialMediaLink}
                                        savedValue={lastSavedSettings?.socialMediaLink}
                                        isEditing={true}
                                        onChange={(val) => setSettings({ ...settings, socialMediaLink: val })}
                                        placeholder="https://instagram.com/your-business"
                                    />
                                    <div className="pt-8 border-t border-slate-100">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-white border border-slate-100 rounded-3xl p-6 flex items-start gap-4">
                                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                                                    <Monitor className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">UKURAN IDEAL</p>
                                                    <p className="text-xs font-bold text-slate-600">Resolusi <span className="text-indigo-600">1920 &times; 1080</span> (16:9). Gambar secara otomatis akan dikonversi ke format WebP untuk performa.</p>
                                                </div>
                                            </div>
                                            <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex items-start gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                                                    <Zap className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">ATURAN DESAIN</p>
                                                    <p className="text-xs font-bold text-amber-900/60">Gunakan teks dengan kontras tinggi agar terlihat jelas di layar besar pelanggan. Hindari teks terlalu kecil.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 mb-6 bg-amber-50 p-6 rounded-[2rem] border border-amber-100/50">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm shrink-0">
                                                <AlertCircle className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">PANDUAN LOGO</p>
                                                <p className="text-xs font-bold text-amber-900/60 leading-relaxed">
                                                    Gunakan format <span className="text-amber-600 font-extrabold">PNG Transparan</span> dengan aspek rasio <span className="text-amber-600 font-extrabold">1:1 (Kotak)</span>. Ukuran ideal <span className="text-amber-600 font-extrabold">512px &times; 512px</span>, maksimal <span className="text-amber-600 font-extrabold">2MB</span>.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                                            <div className="md:col-span-3">
                                                <InputField
                                                    label="Logo Bisnis"
                                                    value={settings?.logoPath}
                                                    savedValue={lastSavedSettings?.logoPath}
                                                    isEditing={true}
                                                    onChange={(val) => setSettings({ ...settings, logoPath: val })}
                                                    placeholder="/uploads/logos/logo-example.webp"
                                                    helper="Gambar akan ditampilkan pada Header CFD, Struk, dan Laporan."
                                                />
                                            </div>
                                            <div className="pb-1">
                                                <label className="cursor-pointer bg-white hover:bg-slate-50 text-slate-800 font-black text-xs px-6 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all border-2 border-slate-200 h-[64px] shadow-sm hover:border-indigo-500 hover:text-indigo-600 group">
                                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> : <Upload className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />}
                                                    <span className="uppercase tracking-widest font-black text-[10px]">Pilih File</span>
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        accept="image/*"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                const url = await handleFileUpload(file, 'logo');
                                                                if (url) setSettings({ ...settings, logoPath: url });
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'policy' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <h3 className="text-xl font-black text-slate-800 mb-6">Kebijakan Finansial</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <InputField
                                            label="PPN / VAT (%)"
                                            type="number"
                                            value={settings.ppnPercentage}
                                            savedValue={lastSavedSettings?.ppnPercentage}
                                            isEditing={true}
                                            onChange={(val) => setSettings({ ...settings, ppnPercentage: val })}
                                            placeholder="Misal: 11"
                                            suffix="%"
                                        />
                                        <InputField
                                            label="Service Charge (%)"
                                            type="number"
                                            value={settings.serviceChargePercentage}
                                            savedValue={lastSavedSettings?.serviceChargePercentage}
                                            isEditing={true}
                                            onChange={(val) => setSettings({ ...settings, serviceChargePercentage: val })}
                                            placeholder="Misal: 5"
                                            suffix="%"
                                        />
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Metode Pembayaran Tersedia</label>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {(settings.availablePaymentMethods || []).map((method: string, index: number) => (
                                                    <div key={index} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 border border-indigo-100">
                                                        {method}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newMethods = [...(settings.availablePaymentMethods || [])];
                                                                newMethods.splice(index, 1);
                                                                setSettings({ ...settings, availablePaymentMethods: newMethods });
                                                            }}
                                                            className="hover:text-rose-500 transition-colors"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    id="new-payment-method"
                                                    type="text"
                                                    placeholder="Tambah metode (misal: ShopeePay)"
                                                    className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:border-indigo-500 focus:outline-none transition-all"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const val = (e.currentTarget as HTMLInputElement).value;
                                                            if (val && !(settings.availablePaymentMethods || []).includes(val)) {
                                                                setSettings({
                                                                    ...settings,
                                                                    availablePaymentMethods: [...(settings.availablePaymentMethods || []), val]
                                                                });
                                                                (e.currentTarget as HTMLInputElement).value = '';
                                                            }
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const input = document.getElementById('new-payment-method') as HTMLInputElement;
                                                        const val = input.value;
                                                        if (val && !(settings.availablePaymentMethods || []).includes(val)) {
                                                            setSettings({
                                                                ...settings,
                                                                availablePaymentMethods: [...(settings.availablePaymentMethods || []), val]
                                                            });
                                                            input.value = '';
                                                        }
                                                    }}
                                                    className="bg-indigo-600 text-white px-6 rounded-2xl font-black"
                                                >
                                                    Tambah
                                                </button>
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 mt-4 pt-6 border-t border-slate-100">
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Pembulatan Kelipatan (Rounding)</label>
                                            <select
                                                value={settings.roundingKelipatan}
                                                onChange={(e) => setSettings({ ...settings, roundingKelipatan: Number(e.target.value) })}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:border-indigo-500 focus:outline-none appearance-none"
                                            >
                                                <option value={1}>Tanpa Pembulatan</option>
                                                <option value={100}>Ke Atas (Kelipatan 100)</option>
                                                <option value={500}>Ke Atas (Kelipatan 500)</option>
                                                <option value={1000}>Ke Atas (Kelipatan 1.000)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'operation' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <h3 className="text-xl font-black text-slate-800 mb-6">Aturan Operasional</h3>
                                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row gap-8 items-center">
                                        <div className="flex-1 space-y-6">
                                            <InputField
                                                label="Business Day Offset (Jam Potong Laporan)"
                                                value={settings.businessDayOffset}
                                                savedValue={lastSavedSettings?.businessDayOffset}
                                                isEditing={true}
                                                onChange={(val) => setSettings({ ...settings, businessDayOffset: val })}
                                                placeholder="Misal: 02:00"
                                                helper="Waktu sistem menganggap hari berganti (untuk operasional 24 jam)"
                                            />
                                            <InputField
                                                label="Waktu Alert Sesi Berakhir (Menit)"
                                                type="number"
                                                value={settings.endingSoonThreshold}
                                                savedValue={lastSavedSettings?.endingSoonThreshold}
                                                isEditing={true}
                                                onChange={(val) => setSettings({ ...settings, endingSoonThreshold: Number(val) })}
                                                placeholder="Misal: 5"
                                                suffix="Menit"
                                                helper="Munculkan 'Ending Soon' jika sisa waktu di bawah angka ini (Berlaku tipe Duration)"
                                            />
                                        </div>
                                        <div className="w-full md:w-80 bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-inner flex flex-col items-center justify-center text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Preview LOGIKA HARI</p>
                                            <div className="flex flex-col items-center">
                                                <p className="text-xs font-bold text-slate-500 mb-1">Jika sekarang jam {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, maka:</p>
                                                <div className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-lg shadow-lg shadow-indigo-100">
                                                    Tanggal Bisnis: {(() => {
                                                        const [h, m] = (settings.businessDayOffset || '00:00').split(':').map(Number);
                                                        const now = new Date();
                                                        const cutoff = new Date(now);
                                                        cutoff.setHours(h, m, 0, 0);
                                                        const logical = new Date(now);
                                                        if (now < cutoff) logical.setDate(logical.getDate() - 1);
                                                        return logical.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100 mt-6">
                                        <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <h4 className="font-black text-slate-800">Shift Kerja Utama</h4>
                                                <p className="text-xs text-slate-400 font-medium">Definisikan shift kerja untuk mempermudah pendaftaran karyawan</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newShift = { name: `SHIFT ${(settings.availableShifts?.length || 0) + 1}`, startTime: '08:00', endTime: '16:00' };
                                                    setSettings({
                                                        ...settings,
                                                        availableShifts: [...(settings.availableShifts || []), newShift]
                                                    });
                                                }}
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95 transition-all"
                                            >
                                                Tambah Shift
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            {(!settings.availableShifts || settings.availableShifts.length === 0) && (
                                                <div className="p-8 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                                                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Belum Ada Shift Didefinisikan</p>
                                                </div>
                                            )}
                                            {(settings.availableShifts || []).map((shift: any, idx: number) => (
                                                <div key={idx} className="bg-white border-2 border-slate-50 rounded-[2rem] p-8 relative group/shift shadow-sm hover:shadow-xl hover:shadow-indigo-100/40 hover:border-indigo-100 transition-all duration-300">
                                                    <div className="absolute -top-3 -left-3 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-xs shadow-lg shadow-indigo-100">
                                                        {idx + 1}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newShifts = [...settings.availableShifts];
                                                            newShifts.splice(idx, 1);
                                                            setSettings({ ...settings, availableShifts: newShifts });
                                                        }}
                                                        className="absolute top-6 right-6 w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center opacity-0 group-hover/shift:opacity-100 transition-all hover:bg-rose-500 hover:text-white shadow-sm"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <InputField
                                                            label="Nama Shift"
                                                            value={shift.name}
                                                            isEditing={true}
                                                            onChange={(val) => {
                                                                const newShifts = [...settings.availableShifts];
                                                                newShifts[idx].name = val.toUpperCase();
                                                                setSettings({ ...settings, availableShifts: newShifts });
                                                            }}
                                                            placeholder="Contoh: SHIFT PAGI"
                                                        />
                                                        <InputField
                                                            label="Jam Mulai"
                                                            type="time"
                                                            value={shift.startTime}
                                                            isEditing={true}
                                                            onChange={(val) => {
                                                                const newShifts = [...settings.availableShifts];
                                                                newShifts[idx].startTime = val;
                                                                setSettings({ ...settings, availableShifts: newShifts });
                                                            }}
                                                        />
                                                        <InputField
                                                            label="Jam Selesai"
                                                            type="time"
                                                            value={shift.endTime}
                                                            isEditing={true}
                                                            onChange={(val) => {
                                                                const newShifts = [...settings.availableShifts];
                                                                newShifts[idx].endTime = val;
                                                                setSettings({ ...settings, availableShifts: newShifts });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'hardware' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <h3 className="text-xl font-black text-slate-800 mb-6">Infrastruktur Hardware</h3>

                                    {/* Server IP Info Card */}
                                    <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100 mb-10 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                                            <Cpu className="w-32 h-32" />
                                        </div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                                    <Settings2 className="w-5 h-5" />
                                                </div>
                                                <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Server Local Access</span>
                                            </div>
                                            <h4 className="text-4xl font-black tracking-tighter mb-2">
                                                {networkInfo?.primaryIp || 'Detecting...'}
                                            </h4>
                                            <p className="text-indigo-100 font-medium text-sm max-w-md leading-relaxed">
                                                Gunakan alamat IP di atas untuk membuka aplikasi ini dari handphone atau perangkat lain yang terhubung ke WiFi yang sama.
                                            </p>
                                            <div className="mt-6 flex items-center gap-4">
                                                <div className="px-4 py-2 bg-white text-indigo-600 rounded-xl text-xs font-black shadow-lg">
                                                    PORT: 3000
                                                </div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-200">
                                                    Status: Connected & External Ready
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <InputField
                                            label="Printer Kasir (IP)"
                                            value={settings.printerMapping?.cashier}
                                            savedValue={lastSavedSettings?.printerMapping?.cashier}
                                            isEditing={true}
                                            onChange={(val) => setSettings({ ...settings, printerMapping: { ...settings.printerMapping, cashier: val } })}
                                            placeholder="192.168.1.100"
                                        />
                                        <InputField
                                            label="Printer Dapur (IP)"
                                            value={settings.printerMapping?.kitchen}
                                            savedValue={lastSavedSettings?.printerMapping?.kitchen}
                                            isEditing={true}
                                            onChange={(val) => setSettings({ ...settings, printerMapping: { ...settings.printerMapping, kitchen: val } })}
                                            placeholder="192.168.1.101"
                                        />
                                    </div>
                                    <InputField
                                        label="Alamat MQTT Broker (Server IoT)"
                                        value={settings.mqttBrokerAddress}
                                        savedValue={lastSavedSettings?.mqttBrokerAddress}
                                        isEditing={true}
                                        onChange={(val) => setSettings({ ...settings, mqttBrokerAddress: val })}
                                        placeholder="localhost atau 192.168.1.50"
                                    />
                                </div>
                            )}

                            {activeTab === 'invoice' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <h3 className="text-xl font-black text-slate-800 mb-6">Tampilan Invoice</h3>

                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6">
                                        <p className="text-sm text-slate-500 mb-4 font-medium">Pengaturan ini akan diterapkan pada cetakan struk dan invoice digital.</p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InputField
                                                label="Nama Bisnis (Header)"
                                                value={settings.invoiceBusinessName ?? settings.businessName}
                                                savedValue={lastSavedSettings?.invoiceBusinessName ?? lastSavedSettings?.businessName}
                                                isEditing={true}
                                                onChange={(val) => setSettings({ ...settings, invoiceBusinessName: val })}
                                                placeholder="Contoh: SpotOn Billiard"
                                                helper="Nama yang muncul paling atas di struk (Kosongkan untuk pakai nama utama)"
                                            />
                                            <InputField
                                                label="Nomor Kontak"
                                                value={settings.invoiceContact ?? settings.contact}
                                                savedValue={lastSavedSettings?.invoiceContact ?? lastSavedSettings?.contact}
                                                isEditing={true}
                                                onChange={(val) => setSettings({ ...settings, invoiceContact: val })}
                                                placeholder="0812-3456-7890"
                                            />
                                        </div>
                                        <div className="mt-4">
                                            <InputField
                                                label="Alamat Lengkap"
                                                value={settings.invoiceAddress ?? settings.address}
                                                savedValue={lastSavedSettings?.invoiceAddress ?? lastSavedSettings?.address}
                                                isEditing={true}
                                                onChange={(val) => setSettings({ ...settings, invoiceAddress: val })}
                                                placeholder="Alamat lengkap usaha"
                                            />
                                        </div>
                                        <div className="mt-4">
                                            <InputField
                                                label="Social Media / Info Tambahan"
                                                value={settings.invoiceSocialMedia ?? settings.socialMediaLink}
                                                savedValue={lastSavedSettings?.invoiceSocialMedia ?? lastSavedSettings?.socialMediaLink}
                                                isEditing={true}
                                                onChange={(val) => setSettings({ ...settings, invoiceSocialMedia: val })}
                                                placeholder="@instagram_akun"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Catatan Kaki (Footer Note)</label>
                                        <textarea
                                            value={settings.invoiceFooterNote || ''}
                                            onChange={(e) => setSettings({ ...settings, invoiceFooterNote: e.target.value })}
                                            placeholder="Contoh: Barang yang sudah dibeli tidak dapat ditukar kembali. Terima kasih atas kunjungan Anda."
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:border-indigo-500 focus:outline-none transition-all min-h-[120px]"
                                        />
                                        <p className="mt-2 text-[10px] font-bold text-slate-400 ml-1 uppercase">Pesan ini akan muncul di bagian paling bawah struk</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'database' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Header */}
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800">Database Maintenance</h3>
                                            <p className="text-sm text-slate-400 font-medium mt-1">Bersihkan data lama agar database tetap ringan</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={fetchDbStats}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-bold text-sm transition-all active:scale-95"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${dbStatsLoading ? 'animate-spin' : ''}`} />
                                            Refresh
                                        </button>
                                    </div>

                                    {/* Database Stats Cards */}
                                    {dbStats && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {[
                                                { key: 'transactions', label: 'Transaksi', color: 'indigo', icon: <BarChart3 className="w-4 h-4" /> },
                                                { key: 'orderItems', label: 'Order Items', color: 'amber', icon: <BarChart3 className="w-4 h-4" /> },
                                                { key: 'cashflow', label: 'Cashflow', color: 'emerald', icon: <BarChart3 className="w-4 h-4" /> },
                                                { key: 'auditLogs', label: 'Audit Logs', color: 'rose', icon: <Trash2 className="w-4 h-4" /> },
                                                { key: 'sessions', label: 'Sessions', color: 'violet', icon: <Clock className="w-4 h-4" /> },
                                            ].map(({ key, label, color, icon }) => (
                                                <div key={key} className={`bg-${color}-50 border border-${color}-100 rounded-2xl p-4`}>
                                                    <div className={`flex items-center gap-2 text-${color}-500 mb-2`}>
                                                        {icon}
                                                        <span className="text-xs font-black uppercase tracking-widest">{label}</span>
                                                    </div>
                                                    <div className={`text-3xl font-black text-${color}-700`}>
                                                        {(dbStats.activeCounts?.[key] ?? 0).toLocaleString()}
                                                    </div>
                                                    <div className="text-xs text-slate-400 font-bold mt-1">baris aktif</div>
                                                </div>
                                            ))}
                                            {/* Tabel Size terbesar */}
                                            {dbStats.tableSizes?.[0] && (
                                                <div className="bg-slate-800 rounded-2xl p-4 text-white">
                                                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                                                        <HardDrive className="w-4 h-4" />
                                                        <span className="text-xs font-black uppercase tracking-widest">Tabel Terbesar</span>
                                                    </div>
                                                    <div className="text-2xl font-black">
                                                        {dbStats.tableSizes[0].sizeMB} <span className="text-slate-400 text-sm font-bold">MB</span>
                                                    </div>
                                                    <div className="text-xs text-slate-400 font-bold mt-1">{dbStats.tableSizes[0].tableName}</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {dbStatsLoading && !dbStats && (
                                        <div className="flex items-center justify-center py-12 text-slate-400 gap-3">
                                            <Loader2 className="animate-spin w-5 h-5" /> Memuat statistik database...
                                        </div>
                                    )}

                                    {/* Jadwal Otomatis Info */}
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="p-2 bg-indigo-100 rounded-xl shrink-0">
                                                <Clock className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="font-black text-indigo-800 text-sm">Maintenance Otomatis Aktif</p>
                                                <p className="text-indigo-600 text-xs font-medium mt-1">
                                                    Sistem secara otomatis membersihkan data usang setiap hari pada jam yang ditentukan.
                                                    Form di bawah untuk menjalankan manual kapan saja.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="pl-14">
                                            <InputField
                                                label="Waktu Maintenance Otomatis (Jam:Menit)"
                                                type="time"
                                                value={settings.autoMaintenanceTime || '03:00'}
                                                savedValue={lastSavedSettings?.autoMaintenanceTime || '03:00'}
                                                isEditing={true}
                                                onChange={(val) => setSettings({ ...settings, autoMaintenanceTime: val })}
                                            />
                                            {dbStats?.nextScheduledMaintenance && (
                                                <p className="text-indigo-500 text-xs font-black mt-2">
                                                    Jadwal manual berikutnya: {new Date(dbStats.nextScheduledMaintenance).toLocaleString('id-ID')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Maintenance Form */}
                                    <div className="border-2 border-slate-100 rounded-3xl overflow-hidden">
                                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                                            <h4 className="font-black text-slate-700">Pilih Tugas Maintenance</h4>
                                            <p className="text-xs text-slate-400 font-medium mt-0.5">Centang tugas yang ingin dijalankan, lalu klik tombol eksekusi</p>
                                        </div>

                                        <div className="divide-y divide-slate-100">
                                            {/* Purge Audit Logs */}
                                            <MaintenanceRow
                                                checked={maintenanceForm.purgeAuditLogs}
                                                onToggle={(v) => setMaintenanceForm(f => ({ ...f, purgeAuditLogs: v }))}
                                                title="Hapus Audit Logs"
                                                description="Log aktivitas sistem yang sudah tidak relevan"
                                                icon={<Trash2 className="w-4 h-4" />}
                                                color="rose"
                                                days={maintenanceForm.auditLogDays}
                                                onDaysChange={(d) => setMaintenanceForm(f => ({ ...f, auditLogDays: d }))}
                                                min={0}
                                                max={90}
                                                safe={true}
                                                previewCount={previewCounts?.auditLogs}
                                                previewLoading={previewLoading}
                                            />
                                            {/* Purge Sessions */}
                                            <MaintenanceRow
                                                checked={maintenanceForm.purgeSessions}
                                                onToggle={(v) => setMaintenanceForm(f => ({ ...f, purgeSessions: v }))}
                                                title="Hapus Sessions Lama"
                                                description="Data sesi billing yang sudah selesai dan terbayar"
                                                icon={<Clock className="w-4 h-4" />}
                                                color="amber"
                                                days={maintenanceForm.sessionDays}
                                                onDaysChange={(d) => setMaintenanceForm(f => ({ ...f, sessionDays: d }))}
                                                min={0}
                                                max={365}
                                                safe={true}
                                                previewCount={previewCounts?.sessions}
                                                previewLoading={previewLoading}
                                            />
                                            {/* Archive Transactions */}
                                            <MaintenanceRow
                                                checked={maintenanceForm.archiveTransactions}
                                                onToggle={(v) => setMaintenanceForm(f => ({ ...f, archiveTransactions: v }))}
                                                title="Arsipkan Transaksi"
                                                description="Transaksi PAID/CANCELLED dipindah ke tabel arsip (data tidak hilang)"
                                                icon={<Archive className="w-4 h-4" />}
                                                color="violet"
                                                days={maintenanceForm.transactionDays}
                                                onDaysChange={(d) => setMaintenanceForm(f => ({ ...f, transactionDays: d }))}
                                                min={0}
                                                max={365}
                                                safe={false}
                                                previewCount={previewCounts?.transactions}
                                                previewLoading={previewLoading}
                                            />
                                            {/* Archive Cashflow */}
                                            <MaintenanceRow
                                                checked={maintenanceForm.archiveCashflow}
                                                onToggle={(v) => setMaintenanceForm(f => ({ ...f, archiveCashflow: v }))}
                                                title="Arsipkan Cashflow"
                                                description="Data cashflow lama dipindah ke tabel arsip (data tidak hilang)"
                                                icon={<Archive className="w-4 h-4" />}
                                                color="emerald"
                                                days={maintenanceForm.cashflowDays}
                                                onDaysChange={(d) => setMaintenanceForm(f => ({ ...f, cashflowDays: d }))}
                                                min={90}
                                                max={730}
                                                safe={false}
                                                previewCount={previewCounts?.cashflow}
                                                previewLoading={previewLoading}
                                            />
                                        </div>
                                    </div>

                                    {/* Warning jika semua 0 */}
                                    {previewCounts && (previewCounts.auditLogs + previewCounts.sessions + previewCounts.transactions + previewCounts.cashflow) === 0 && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
                                            <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <div>
                                                <p className="font-black text-blue-700 text-sm">Tidak ada data yang perlu dibersihkan</p>
                                                <p className="text-blue-600 text-xs font-medium mt-1">
                                                    Semua data masih dalam batas usia yang ditentukan. Ini normal jika aplikasi masih baru digunakan.
                                                    Kurangi slider hari untuk melihat data lebih lama, atau tunggu beberapa bulan hingga data menumpuk.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Result / Error / Confirm Dialog */}
                                    {maintenanceResult && (
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                                            <p className="font-black text-emerald-700 text-sm flex items-center gap-2 mb-3"><CheckCircle2 className="w-4 h-4" /> Maintenance Selesai</p>
                                            <pre className="text-xs text-emerald-700 font-medium whitespace-pre-wrap">{maintenanceResult}</pre>
                                        </div>
                                    )}
                                    {maintenanceError && (
                                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
                                            <p className="font-black text-rose-700 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {maintenanceError}</p>
                                        </div>
                                    )}

                                    {/* Confirm Dialog */}
                                    {confirmOpen && (
                                        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 space-y-4">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="w-6 h-6 text-amber-500 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="font-black text-amber-800">Konfirmasi Maintenance</p>
                                                    <p className="text-sm text-amber-600 font-medium mt-1">Tindakan ini tidak dapat dibatalkan. Pastikan Anda sudah melakukan backup data terlebih dahulu sebelum melanjutkan.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={runSelectedMaintenance}
                                                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                                                >
                                                    <ChevronRight className="w-4 h-4" /> Ya, Jalankan Sekarang
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmOpen(false)}
                                                    className="flex-1 bg-white border-2 border-slate-200 text-slate-600 font-black py-3 rounded-2xl transition-all active:scale-95"
                                                >
                                                    Batal
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Execute Button */}
                                    {!confirmOpen && (
                                        <button
                                            type="button"
                                            disabled={maintenanceRunning || (!maintenanceForm.purgeAuditLogs && !maintenanceForm.purgeSessions && !maintenanceForm.archiveTransactions && !maintenanceForm.archiveCashflow)}
                                            onClick={() => setConfirmOpen(true)}
                                            className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-slate-200 active:scale-[0.98] transition-all"
                                        >
                                            {maintenanceRunning
                                                ? <><Loader2 className="animate-spin w-5 h-5" /> Menjalankan Maintenance...</>
                                                : <><Database className="w-5 h-5" /> Jalankan Maintenance Sekarang</>
                                            }
                                        </button>
                                    )}
                                </div>
                            )}

                            {activeTab === 'preferences' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 mb-1">{t('settings.preferences.title')}</h3>
                                        <p className="text-sm text-slate-400 font-medium">{t('settings.preferences.languageDesc')}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">
                                            <Languages className="w-3.5 h-3.5 inline mr-1.5" />
                                            {t('settings.preferences.language')}
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <button type="button" onClick={() => setLocale('id')}
                                                className={`relative flex items-center gap-5 p-6 rounded-3xl border-2 transition-all duration-300 text-left active:scale-[0.98] ${locale === 'id' ? 'border-indigo-500 bg-indigo-50 shadow-xl shadow-indigo-100' : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'}`}
                                            >
                                                <div className="text-5xl select-none">🇮🇩</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-black text-lg ${locale === 'id' ? 'text-indigo-700' : 'text-slate-800'}`}>Bahasa Indonesia</p>
                                                    <p className={`text-xs font-semibold ${locale === 'id' ? 'text-indigo-500' : 'text-slate-400'}`}>Bahasa default aplikasi</p>
                                                </div>
                                                {locale === 'id' && <span className="absolute top-4 right-4 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">{t('settings.preferences.current')}</span>}
                                            </button>
                                            <button type="button" onClick={() => setLocale('en')}
                                                className={`relative flex items-center gap-5 p-6 rounded-3xl border-2 transition-all duration-300 text-left active:scale-[0.98] ${locale === 'en' ? 'border-indigo-500 bg-indigo-50 shadow-xl shadow-indigo-100' : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'}`}
                                            >
                                                <div className="text-5xl select-none">🇬🇧</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-black text-lg ${locale === 'en' ? 'text-indigo-700' : 'text-slate-800'}`}>English</p>
                                                    <p className={`text-xs font-semibold ${locale === 'en' ? 'text-indigo-500' : 'text-slate-400'}`}>Application default language</p>
                                                </div>
                                                {locale === 'en' && <span className="absolute top-4 right-4 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">{t('settings.preferences.current')}</span>}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
                                        <Globe className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-black text-blue-700 text-sm">{t('settings.preferences.saved')}</p>
                                            <p className="text-blue-500 text-xs font-medium mt-1">
                                                {locale === 'id' ? 'Perubahan bahasa diterapkan langsung tanpa perlu reload halaman.' : 'Language changes are applied instantly without needing to reload the page.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'gamification' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Pengaturan Gamifikasi & Loyalty</h3>
                                            <p className="text-sm text-slate-400 font-medium">Kelola kebijakan poin dan ekonomi loyalitas member.</p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => router.push('/admin/loyalty/arme')}
                                            className="px-6 py-3 bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl font-black text-xs transition-all shadow-xl shadow-indigo-100 flex items-center gap-3 active:scale-95 uppercase tracking-widest"
                                        >
                                            <Orbit className="w-4 h-4" /> ARME Terminal Control
                                        </button>
                                    </header>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between">
                                            <div className="mb-6">
                                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                                                    <DollarSign className="w-6 h-6 text-indigo-600" />
                                                </div>
                                                <h4 className="font-black text-slate-800 text-lg mb-2">Nilai Perolehan Poin</h4>
                                                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                                    Tentukan nominal transaksi yang setara dengan 1 poin. Nilai ini menjadi basis ekonomi seluruh sistem reward.
                                                </p>
                                            </div>
                                            <InputField
                                                label="Nominal Per 1 Poin (Rp)"
                                                type="number"
                                                value={settings?.royaltyPointsPerAmount}
                                                savedValue={lastSavedSettings?.royaltyPointsPerAmount}
                                                isEditing={true}
                                                onChange={(val) => setSettings({ ...settings, royaltyPointsPerAmount: Number(val) })}
                                                placeholder="Standard: 10000"
                                                suffix="Pts"
                                            />
                                        </div>

                                        <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between">
                                            <div className="mb-6">
                                                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
                                                    <Clock className="w-6 h-6 text-rose-600" />
                                                </div>
                                                <h4 className="font-black text-slate-800 text-lg mb-2">Masa Aktif Poin</h4>
                                                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                                    Kebijakan anti-inflasi untuk menghapus poin dari akun member yang tidak memiliki aktivitas dalam jangka waktu tertentu.
                                                </p>
                                            </div>
                                            <InputField
                                                label="Point Expiry Period"
                                                type="number"
                                                value={settings?.pointExpiryDays}
                                                savedValue={lastSavedSettings?.pointExpiryDays}
                                                isEditing={true}
                                                onChange={(val) => setSettings({ ...settings, pointExpiryDays: Number(val) })}
                                                placeholder="Misal: 90"
                                                suffix="Hari"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden shadow-2xl group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-pulse">
                                                    <Orbit className="w-8 h-8 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="text-2xl font-black text-white tracking-tighter uppercase">AI ARME & Gamifikasi</h4>
                                                    <p className="text-indigo-400 text-xs font-bold tracking-[0.2em]">AUTONOMOUS REVENUE MANAGEMENT ENGINE</p>
                                                </div>
                                            </div>
                                            <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-8 max-w-2xl font-medium">
                                                Konfigurasi teknis untuk permainan <span className="text-white font-bold italic">Scratch Bomb</span>, pengaturan volatilitas (Win Rate), dan algoritma <span className="text-white font-bold">Auto-Pilot</span> kini telah dipindahkan ke Terminal ARME khusus untuk kemudahan monitoring & kontrol yang lebih presisi.
                                            </p>
                                            <button 
                                                type="button"
                                                onClick={() => router.push('/admin/loyalty/arme')}
                                                className="bg-white hover:bg-indigo-50 text-slate-900 px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95 flex items-center gap-3 uppercase tracking-widest"
                                            >
                                                Buka Terminal ARME Now
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'cfd' && (
                                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* TERMINAL PAIRING SECTION - PREMIUM STATION DESIGN */}
                                    <div className="bg-slate-900 rounded-[3rem] p-1 shadow-2xl shadow-indigo-200/40 overflow-hidden relative group">
                                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -mr-20 -mt-20 group-hover:bg-indigo-500/20 transition-all duration-1000"></div>
                                        <div className="bg-white/5 backdrop-blur-3xl rounded-[2.9rem] p-8 md:p-12 border border-white/10 relative z-10">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                                        <Terminal className="w-9 h-9 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Konfigurasi Terminal</h4>
                                                        <p className="text-indigo-400 text-[10px] font-black tracking-[0.3em] uppercase mt-2 italic opacity-80">Pairing Display specific to this machine</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
                                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">System Ready</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
                                                <div className="space-y-8">
                                                    <div className="space-y-4">
                                                        <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-[0.4em] ml-1 italic">KSR IDENTITY CODE</label>
                                                        <div className="flex gap-4">
                                                            <div className="flex-1 relative">
                                                                <Monitor className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                                                                <input 
                                                                    type="text"
                                                                    value={terminalId || ''}
                                                                    onChange={(e) => setTerminalId(e.target.value.toUpperCase())}
                                                                    placeholder="E.G. KSR-MAIN-01"
                                                                    className="w-full bg-white/5 border-2 border-white/10 rounded-2xl pl-16 pr-8 py-5 text-lg font-black text-white focus:border-indigo-500 outline-none transition-all placeholder:text-white/10 tracking-widest font-mono"
                                                                />
                                                            </div>
                                                            <button 
                                                                onClick={() => {
                                                                    const randomId = `T-${Math.floor(100 + Math.random() * 900)}`;
                                                                    setTerminalId(randomId);
                                                                }}
                                                                className="px-8 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95"
                                                            >
                                                                Shuffle
                                                            </button>
                                                        </div>
                                                        <div className="flex items-start gap-3 bg-white/[0.03] p-5 rounded-2xl border border-white/5">
                                                            <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                                                            <p className="text-[10px] text-white/40 font-bold leading-relaxed uppercase tracking-wider">
                                                                ID ini menghubungkan <span className="text-white">Kasir</span> dengan <span className="text-white">Customer Display</span>. Gunakan ID yang sama pada Tablet agar transaksi muncul di sana.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[2.5rem] p-10 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden">
                                                    <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
                                                    <div className="relative z-10">
                                                        <div className="flex items-center gap-3 mb-6">
                                                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                                                <Globe className="w-4 h-4" />
                                                            </div>
                                                            <h5 className="text-sm font-black uppercase tracking-[0.3em] italic">Pairing Protocol</h5>
                                                        </div>
                                                        <p className="text-indigo-100/60 text-[10px] font-black uppercase tracking-widest mb-4">Target Tablet URL:</p>
                                                        <div 
                                                            onClick={() => {
                                                                const url = `${window.location.protocol}//${window.location.host}/display?terminalId=${terminalId || 'KSR-XX'}`;
                                                                navigator.clipboard.writeText(url);
                                                                alert('Link berhasil disalin ke clipboard!');
                                                            }}
                                                            className="bg-black/20 hover:bg-black/30 border border-white/10 rounded-2xl p-5 font-mono text-xs break-all cursor-pointer transition-all active:scale-95 text-indigo-200 italic shadow-inner mb-8 group/url"
                                                        >
                                                            {typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/display?terminalId=${terminalId || 'KSR-XX'}` : 'Loading...'}
                                                            <div className="mt-3 flex items-center gap-2 opacity-0 group-hover/url:opacity-100 transition-opacity">
                                                                <span className="text-[8px] font-black uppercase tracking-widest text-white px-2 py-0.5 bg-indigo-500 rounded">Click to Copy</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-4 mt-auto">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                if (terminalId) {
                                                                    window.open(`/display?terminalId=${terminalId}`, '_blank');
                                                                } else {
                                                                    alert('Silakan isi ID Terminal terlebih dahulu');
                                                                }
                                                            }}
                                                            className="flex-1 py-5 bg-white text-indigo-900 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all hover:bg-indigo-50 active:scale-95 flex items-center justify-center gap-3 shadow-xl"
                                                        >
                                                            <Monitor className="w-4 h-4" /> Open Test
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-between items-end gap-6 pt-10 border-t border-slate-200">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-200">
                                                    <Sparkles className="w-4 h-4" />
                                                </div>
                                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] italic">Promotion Engine</span>
                                            </div>
                                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Display & Marketing</h3>
                                            <p className="text-sm text-slate-400 font-bold mt-2">Atur konten visual dan kampanye yang muncul di layar pelanggan.</p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                const newPromo = { 
                                                    title: "Promo Baru", 
                                                    desc: "Deskripsi promo menarik di sini...", 
                                                    tag: "PROMO", 
                                                    color: "from-indigo-600 to-blue-600", 
                                                    image: "" 
                                                };
                                                setSettings({ 
                                                    ...settings, 
                                                    displayPromotions: [...(settings.displayPromotions || []), newPromo] 
                                                });
                                            }}
                                            className="px-8 py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[1.5rem] font-black text-xs transition-all shadow-xl shadow-slate-200 flex items-center gap-4 active:scale-95 uppercase tracking-widest border border-white/10"
                                        >
                                            <Plus className="w-5 h-5 text-indigo-400" /> Tambah Banner
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-2 space-y-6">
                                            {(!settings.displayPromotions || settings.displayPromotions.length === 0) && (
                                                <div className="p-20 border-4 border-dashed border-slate-100 rounded-[3rem] text-center bg-slate-50/50">
                                                     <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-slate-100 text-slate-200 shadow-inner">
                                                        <Image className="w-10 h-10" />
                                                     </div>
                                                     <h5 className="text-xl font-black text-slate-400 uppercase tracking-widest leading-none">No Active Banners</h5>
                                                     <p className="text-slate-300 text-xs font-bold uppercase tracking-[0.3em] mt-4 italic">Ready to blast your marketing campaigns?</p>
                                                </div>
                                            )}
                                            
                                            {(settings.displayPromotions || []).map((promo: any, idx: number) => (
                                                <div key={idx} className="bg-white border border-slate-100 rounded-[3rem] p-1 shadow-2xl shadow-slate-200/50 overflow-hidden group/promo transition-all duration-500 hover:-translate-y-1">
                                                    <div className="p-10">
                                                        <div className="flex justify-between items-start mb-10">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-xl shadow-indigo-200 italic">
                                                                    {idx + 1}
                                                                </div>
                                                                <div>
                                                                    <h5 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Banner Config</h5>
                                                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] italic">Sequence Slot #{idx + 1}</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newPromos = [...settings.displayPromotions];
                                                                    newPromos.splice(idx, 1);
                                                                    setSettings({ ...settings, displayPromotions: newPromos });
                                                                }}
                                                                className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-lg active:scale-90"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                                            <div className="lg:col-span-12 space-y-10">
                                                                {/* LIVE PREVIEW MOCKUP */}
                                                                <div className="relative aspect-[21/9] w-full bg-slate-100 rounded-[2rem] overflow-hidden group/preview border-4 border-slate-50 shadow-inner">
                                                                    <div className={`absolute inset-0 bg-gradient-to-br ${promo.color} opacity-90 transition-all duration-700`}></div>
                                                                    {promo.image && (
                                                                        <img 
                                                                            src={promo.image} 
                                                                            alt="Preview" 
                                                                            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40 group-hover/preview:scale-110 transition-transform duration-1000"
                                                                        />
                                                                    )}
                                                                    <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
                                                                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[8px] font-black uppercase tracking-[0.2em] w-fit mb-3">{promo.tag || 'PROMO'}</span>
                                                                        <h4 className="text-2xl font-black uppercase tracking-tighter leading-none mb-2">{promo.title || 'JUDUL PROMOSI'}</h4>
                                                                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-relaxed max-w-sm">{promo.desc || 'Deskripsi promosi akan tampil di sini...'}</p>
                                                                    </div>
                                                                    <div className="absolute top-4 right-4 px-3 py-1 bg-black/20 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                                                                        <span className="text-[8px] font-black text-white/80 uppercase tracking-widest">Live Preview</span>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                    <InputField 
                                                                        label="Judul Promosi"
                                                                        value={promo.title}
                                                                        isEditing={true}
                                                                        onChange={(val) => {
                                                                            const newPromos = [...settings.displayPromotions];
                                                                            newPromos[idx].title = val;
                                                                            setSettings({ ...settings, displayPromotions: newPromos });
                                                                        }}
                                                                        placeholder="E.G. HAPPY HOUR BLAST"
                                                                    />
                                                                    <InputField 
                                                                        label="Tag Visual"
                                                                        value={promo.tag}
                                                                        isEditing={true}
                                                                        onChange={(val) => {
                                                                            const newPromos = [...settings.displayPromotions];
                                                                            newPromos[idx].tag = val.toUpperCase();
                                                                            setSettings({ ...settings, displayPromotions: newPromos });
                                                                        }}
                                                                        placeholder="PROMO / EXCLUSIVE"
                                                                    />
                                                                </div>
                                                                <InputField 
                                                                    label="Deskripsi Kampanye"
                                                                    value={promo.desc}
                                                                    isEditing={true}
                                                                    onChange={(val) => {
                                                                        const newPromos = [...settings.displayPromotions];
                                                                        newPromos[idx].desc = val;
                                                                        setSettings({ ...settings, displayPromotions: newPromos });
                                                                    }}
                                                                    placeholder="Jelaskan detail kampanye Anda di sini..."
                                                                />
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                    <div className="relative">
                                                                        <InputField 
                                                                            label="Path Image / Background"
                                                                            value={promo.image}
                                                                            isEditing={true}
                                                                            onChange={(val) => {
                                                                                const newPromos = [...settings.displayPromotions];
                                                                                newPromos[idx].image = val;
                                                                                setSettings({ ...settings, displayPromotions: newPromos });
                                                                            }}
                                                                            placeholder="/uploads/promos/hero.png"
                                                                        />
                                                                        <label className="absolute right-4 top-[38px] cursor-pointer bg-slate-900 border border-white/10 p-2.5 px-4 rounded-xl text-white hover:bg-indigo-600 transition-all shadow-lg flex items-center gap-3">
                                                                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                                            <span className="text-[10px] font-black uppercase tracking-widest">Upload</span>
                                                                            <input 
                                                                                type="file" 
                                                                                className="hidden" 
                                                                                accept="image/*"
                                                                                onChange={async (e) => {
                                                                                    const file = e.target.files?.[0];
                                                                                    if (file) {
                                                                                        const url = await handleFileUpload(file, 'promo');
                                                                                        if (url) {
                                                                                            const newPromos = [...settings.displayPromotions];
                                                                                            newPromos[idx].image = url;
                                                                                            setSettings({ ...settings, displayPromotions: newPromos });
                                                                                        }
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </label>
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 italic">Atmosphere Theme</label>
                                                                        <div className="grid grid-cols-5 gap-2">
                                                                            {[
                                                                                { name: 'Deep Blue', class: 'from-indigo-600 to-blue-600' },
                                                                                { name: 'Royal', class: 'from-rose-600 to-purple-600' },
                                                                                { name: 'Sunset', class: 'from-amber-500 to-orange-600' },
                                                                                { name: 'Emerald', class: 'from-emerald-600 to-teal-700' },
                                                                                { name: 'Midnight', class: 'from-slate-800 to-slate-900' }
                                                                            ].map(color => (
                                                                                <button
                                                                                    key={color.name}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const newPromos = [...settings.displayPromotions];
                                                                                        newPromos[idx].color = color.class;
                                                                                        setSettings({ ...settings, displayPromotions: newPromos });
                                                                                    }}
                                                                                    title={color.name}
                                                                                    className={`h-12 rounded-xl transition-all border-4 ${promo.color === color.class ? 'border-slate-900 scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'} bg-gradient-to-br ${color.class}`}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                        </div>

                                        <div className="space-y-6">
                                            <div className="bg-amber-50 rounded-[2.5rem] p-8 border border-amber-200/50 shadow-xl shadow-amber-100/20 sticky top-10">
                                                <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-200">
                                                    <Info className="w-7 h-7 text-white" />
                                                </div>
                                                <h5 className="text-xl font-black text-amber-900 uppercase tracking-tighter mb-2 italic">Marketing SOP</h5>
                                                <p className="text-amber-900/40 text-[10px] font-black uppercase tracking-[0.2em] mb-8 leading-relaxed">
                                                    Ikuti panduan berikut untuk hasil display maksimal:
                                                </p>
                                                <div className="space-y-6">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center text-[10px] font-black text-amber-800 uppercase tracking-widest">
                                                            <span>Ideal Aspect Ratio</span>
                                                            <span className="text-amber-500">16:9 / 4:3</span>
                                                        </div>
                                                        <div className="h-1.5 bg-amber-900/10 rounded-full overflow-hidden">
                                                            <div className="w-full h-full bg-amber-500"></div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        {[
                                                            { label: 'Resolusi', val: '1920x1080 (WEBX)' },
                                                            { label: 'Format', val: 'PNG / WEBP (Min 2MB)' },
                                                            { label: 'Text Contras', val: 'High / White Text' },
                                                            { label: 'Max Slide', val: '5 Active Banners' }
                                                        ].map(item => (
                                                            <div key={item.label} className="flex items-center gap-3">
                                                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></div>
                                                                <div>
                                                                    <p className="text-[9px] font-black text-amber-800 uppercase tracking-widest leading-none">{item.label}</p>
                                                                    <p className="text-[10px] font-bold text-amber-900/40 mt-1">{item.val}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-10 pt-8 border-t border-slate-100">
                                <button
                                    type="submit"
                                    disabled={saving || activeTab === 'preferences'}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                                >
                                    {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex-shrink-0 md:w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-100'}`}
        >
            {icon}
            {label}
        </button>
    );
}

// Local InputField removed in favor of global ui/InputField component

function MaintenanceRow({
    checked, onToggle, title, description, icon, color, days, onDaysChange, min, max, safe, previewCount, previewLoading
}: {
    checked: boolean;
    onToggle: (v: boolean) => void;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    days: number;
    onDaysChange: (d: number) => void;
    min: number;
    max: number;
    safe: boolean;
    previewCount?: number;
    previewLoading?: boolean;
}) {
    return (
        <div className={`p-5 transition-all ${checked ? 'bg-white' : 'bg-slate-50/50 opacity-60'}`}>
            <div className="flex items-start gap-4">
                {/* Toggle Checkbox */}
                <button
                    type="button"
                    onClick={() => onToggle(!checked)}
                    className={`shrink-0 mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${checked ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white'
                        }`}
                >
                    {checked && (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </button>

                {/* Content */}
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-500">{icon}</span>
                        <span className="font-black text-slate-800">{title}</span>
                        {previewLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin text-slate-300" />
                        ) : previewCount !== undefined && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${previewCount > 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                {previewCount} records
                            </span>
                        )}
                        {safe ? (
                            <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">Aman</span>
                        ) : (
                            <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Perlu Konfirmasi</span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{description}</p>

                    {/* Days Slider — hanya tampil saat diaktifkan */}
                    {checked && (
                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Data lebih dari</span>
                                <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{days} hari</span>
                            </div>
                            <input
                                type="range"
                                min={min}
                                max={max}
                                step={max > 90 ? 30 : 7}
                                value={days}
                                onChange={(e) => onDaysChange(Number(e.target.value))}
                                className="w-full accent-indigo-500"
                            />
                            <div className="flex justify-between text-[10px] text-slate-300 font-bold mt-1">
                                <span>{min} hari</span>
                                <span>{max} hari</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
