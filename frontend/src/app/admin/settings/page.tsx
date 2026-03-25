'use client';



import React, { useState, useEffect, useCallback } from 'react';

import axios from 'axios';

import { useRouter } from 'next/navigation';

import { Save, Building2, Receipt, Settings2, Cpu, CheckCircle2, Loader2, Database, Trash2, Archive, BarChart3, AlertTriangle, RefreshCw, ChevronRight, Clock, HardDrive, Tag, Package, ShieldOff, Globe, Languages, Target, Sparkles, Calculator, Info, Orbit, DollarSign, Monitor, Image, Upload, Zap, AlertCircle, Terminal, Plus, MessageCircle, X } from 'lucide-react';

import { QRCodeCanvas } from 'qrcode.react';



import InputField from '@/components/ui/InputField';

import { useAuth } from '@/context/AuthContext';

import { useLanguage, type Locale } from '@/context/LanguageContext';



import { getFullImageUrl } from '@/utils/urlUtils';



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



    // WhatsApp State

    const [waStatus, setWaStatus] = useState<any>(null);

    const [waLoading, setWaLoading] = useState(false);

    const [broadcastMsg, setBroadcastMsg] = useState('');

    const [isBroadcastingLocal, setIsBroadcastingLocal] = useState(false);



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

        'whatsapp': 'SETTING_IDENTITY', // Fallback to identity permission

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
                axios.get(`/settings`),
                axios.get(`/settings/network`)
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

            const res = await axios.post(`/settings/upload/${type}`, formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                },
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
            const res = await axios.get(`/admin/maintenance/stats`);
            setDbStats(res.data);

        } catch (err) {

            console.error('Failed to load DB stats', err);

        } finally {

            setDbStatsLoading(false);

        }

    }, []);



    const fetchWaStatus = useCallback(async () => {

        setWaLoading(true);

        try {


            const res = await axios.get(`/whatsapp/status`);

            setWaStatus(res.data);

        } catch (err) {

            console.error('Failed to fetch WhatsApp status');

        } finally {

            setWaLoading(false);

        }

    }, []);



    const handleWaLogout = async () => {

        if (!confirm('Anda yakin ingin memutus koneksi WhatsApp? Barcode harus di-scan ulang nanti.')) return;

        try {


            await axios.post(`/whatsapp/logout`, {});

            fetchWaStatus();

        } catch (err) {

            alert('Gagal logout WhatsApp');

        }

    };



    const handleWaBroadcast = async () => {

        if (!broadcastMsg.trim()) return;

        if (!confirm(`Kirim pesan ini ke SEMUA member aktif?`)) return;

        

        setIsBroadcastingLocal(true);

        try {


            await axios.post(`/members/broadcast`, { message: broadcastMsg });

            alert('Proses broadcast telah dimulai di background.');

            setBroadcastMsg('');

        } catch (err: any) {

            alert(err.response?.data?.message || 'Gagal memulai broadcast');

        } finally {

            setIsBroadcastingLocal(false);

        }

    };



    useEffect(() => {

        if (activeTab === 'database' && !dbStats && !dbStatsLoading) fetchDbStats();

        

        if (activeTab === 'whatsapp') {

            fetchWaStatus();

            const interval = setInterval(fetchWaStatus, 5000);

            return () => clearInterval(interval);

        }

        

        if (activeTab === 'gamification' && !gamificationStats && !gamiStatsLoading) {

            setGamiStatsLoading(true);


            axios.get(`/loyalty/admin/analytics`)

            .then(res => setGamificationStats(res.data))

            .catch(err => console.error("Stats Error:", err))

            .finally(() => setGamiStatsLoading(false));

        }

    }, [activeTab, dbStats, fetchDbStats, gamificationStats, dbStatsLoading, gamiStatsLoading]);



    const fetchPreview = useCallback(async (form: typeof maintenanceForm) => {

        setPreviewLoading(true);

        try {

            const res = await axios.get(`/admin/maintenance/preview`, {
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

                const res = await axios.post(`/admin/maintenance/purge-audit-logs?days=${maintenanceForm.auditLogDays}`, {});

                results.push(`🧹 Audit Logs: ${res.data.message}`);

            }

            if (maintenanceForm.purgeSessions) {

                const res = await axios.post(`/admin/maintenance/purge-sessions?days=${maintenanceForm.sessionDays}`, {});

                results.push(`⌛ Sessions: ${res.data.message}`);

            }

            if (maintenanceForm.archiveTransactions) {

                const res = await axios.post(`/admin/maintenance/archive-transactions?days=${maintenanceForm.transactionDays}`, {});

                results.push(`📦 Transaksi: ${res.data.message}`);

            }

            if (maintenanceForm.archiveCashflow) {

                const res = await axios.post(`/admin/maintenance/archive-cashflow?days=${maintenanceForm.cashflowDays}`, {});

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
            await axios.patch(`/settings`, settings);
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

            <div className="max-w-7xl mx-auto">

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



                <div className="flex flex-col gap-10">

                    {/* Top Navigation - Grouped Horizontal Bar */}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 bg-white/40 backdrop-blur-md p-6 rounded-[3rem] border border-white shadow-xl shadow-slate-200/40">

                        {/* Group 1: Inti Bisnis */}

                        <div className="space-y-4">

                            <h4 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">

                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>

                                Konfigurasi Utama

                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">

                                {hasPermission('SETTING_IDENTITY') && (

                                    <TabButton

                                        active={activeTab === 'identity'}

                                        onClick={() => setActiveTab('identity')}

                                        icon={<Building2 className="w-5 h-5" />}

                                        label={t('settings.tabs.identity')}

                                        desc="Profil & Kontak Bisnis"

                                    />

                                )}

                                {hasPermission('SETTING_POLICY') && (

                                    <TabButton

                                        active={activeTab === 'policy'}

                                        onClick={() => setActiveTab('policy')}

                                        icon={<Receipt className="w-5 h-5" />}

                                        label={t('settings.tabs.policy')}

                                        desc="PPN, Service & Billing"

                                    />

                                )}

                                {hasPermission('SETTING_OPERATION') && (

                                    <TabButton

                                        active={activeTab === 'operation'}

                                        onClick={() => setActiveTab('operation')}

                                        icon={<Settings2 className="w-5 h-5" />}

                                        label={t('settings.tabs.operation')}

                                        desc="Shift & Aturan Main"

                                    />

                                )}

                            </div>

                        </div>



                        {/* Group 2: Marketing & Growth */}

                        <div className="space-y-4 border-t md:border-t-0 md:border-x border-slate-100 px-0 md:px-6 lg:px-8">

                            <h4 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">

                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>

                                Ekosistem Pelanggan

                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">

                                {hasPermission('SETTING_DISPLAY') && (

                                    <TabButton

                                        active={activeTab === 'cfd'}

                                        onClick={() => setActiveTab('cfd')}

                                        icon={<Monitor className="w-5 h-5" />}

                                        label="Display & Marketing"

                                        desc="Customer Face Display"

                                    />

                                )}

                                {hasPermission('SETTING_GAMIFICATION') && (

                                    <TabButton

                                        active={activeTab === 'gamification'}

                                        onClick={() => setActiveTab('gamification')}

                                        icon={<Target className="w-5 h-5" />}

                                        label="Gamifikasi & Loyalty"

                                        desc="Point Economy & ARME"

                                    />

                                )}

                                {hasPermission('SETTING_INVOICE') && (

                                    <TabButton

                                        active={activeTab === 'invoice'}

                                        onClick={() => setActiveTab('invoice')}

                                        icon={<Languages className="w-5 h-5" />}

                                        label="Kustomisasi Invoice"

                                        desc="Tampilan Struk Pelanggan"

                                    />

                                )}

                            </div>

                        </div>



                        {/* Group 3: Technical & Infrastructure */}

                        <div className="space-y-4 border-t md:border-t-0 border-slate-100">

                            <h4 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">

                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>

                                Infrastruktur IT

                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">

                                {hasPermission('SETTING_HARDWARE') && (

                                    <TabButton

                                        active={activeTab === 'hardware'}

                                        onClick={() => setActiveTab('hardware')}

                                        icon={<Cpu className="w-5 h-5" />}

                                        label={t('settings.tabs.hardware')}
                                        desc="Printer & MQTT Broker"
                                    />
                                )}

                                {hasPermission('SETTING_HARDWARE') && (
                                    <TabButton
                                        active={false}
                                        onClick={() => router.push('/admin/settings/firmware')}
                                        icon={<Terminal className="w-5 h-5" />}
                                        label="Firmware & OTA"
                                        desc="Remote Code Injection"
                                    />
                                )}

                                {hasPermission('SETTING_DATABASE') && (

                                    <TabButton

                                        active={activeTab === 'database'}

                                        onClick={() => setActiveTab('database')}

                                        icon={<Database className="w-5 h-5" />}

                                        label={t('settings.tabs.database')}

                                        desc="Maintenance & Storage"

                                    />

                                )}

                                {hasPermission('SETTING_IDENTITY') && (

                                    <TabButton

                                        active={activeTab === 'whatsapp'}

                                        onClick={() => setActiveTab('whatsapp')}

                                        icon={<MessageCircle className="w-5 h-5" />}

                                        label="WhatsApp Link"

                                        desc="Baileys WA Gateway"

                                    />

                                )}

                                {hasPermission('SETTING_PREFERENCES') && (

                                    <TabButton

                                        active={activeTab === 'preferences'}

                                        onClick={() => setActiveTab('preferences')}

                                        icon={<Globe className="w-5 h-5" />}

                                        label={t('settings.tabs.preferences')}

                                        desc="Bahasa & Regional"

                                    />

                                )}

                            </div>

                        </div>

                    </div>



                    {/* Form Content Area */}

                    <div className="w-full">

                        <form onSubmit={handleUpdate} className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 md:p-10 border border-slate-100">

                            {activeTab === 'identity' && (

                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">

                                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic ml-2">Informasi Bisnis</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

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

                                    <div className="pt-12 border-t border-slate-100 mt-12">

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">

                                            <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 flex items-start gap-5">

                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">

                                                    <Monitor className="w-6 h-6" />

                                                </div>

                                                <div>

                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">UKURAN IDEAL</p>

                                                    <p className="text-xs font-bold text-slate-600 leading-relaxed">Resolusi <span className="text-indigo-600">1920 &times; 1080</span> (16:9). Gambar secara otomatis akan dikonversi ke format WebP untuk performa.</p>

                                                </div>

                                            </div>

                                            <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-8 flex items-start gap-5">

                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shrink-0 shadow-sm">

                                                    <Zap className="w-6 h-6" />

                                                </div>

                                                <div>

                                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-2">ATURAN DESAIN</p>

                                                    <p className="text-xs font-bold text-amber-900/60 leading-relaxed">Gunakan teks dengan kontras tinggi agar terlihat jelas di layar besar pelanggan. Hindari teks terlalu kecil.</p>

                                                </div>

                                            </div>

                                        </div>

                                        <div className="flex items-center gap-5 mb-10 bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100/50">

                                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm shrink-0">

                                                <AlertCircle className="w-7 h-7" />

                                            </div>

                                            <div>

                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">PANDUAN LOGO</p>

                                                <p className="text-xs font-bold text-slate-600 leading-relaxed">

                                                    Gunakan format <span className="text-indigo-600 font-extrabold">PNG Transparan</span> dengan aspek rasio <span className="text-indigo-600 font-extrabold">1:1 (Kotak)</span>. Ukuran ideal <span className="text-indigo-600 font-extrabold">512px &times; 512px</span>, maksimal <span className="text-indigo-600 font-extrabold">2MB</span>.

                                                </p>

                                            </div>

                                        </div>



                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">

                                            <div className="md:col-span-1 border-2 border-dashed border-slate-200 rounded-[2.5rem] aspect-square flex items-center justify-center overflow-hidden bg-white p-4 group/logo relative">

                                                {settings?.logoPath ? (

                                                    <img src={getFullImageUrl(settings.logoPath)} alt="Logo Preview" className="w-full h-full object-contain group-hover/logo:scale-110 transition-transform duration-700" />

                                                ) : (

                                                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center">No Logo<br/>Uploaded</div>

                                                )}

                                                <div className="absolute inset-x-4 bottom-4 opacity-0 group-hover/logo:opacity-100 transition-opacity">

                                                    <div className="bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest text-center">Live Preview</div>

                                                </div>

                                            </div>

                                            <div className="md:col-span-2">

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

                                                <label className="cursor-pointer bg-slate-900 text-white font-black text-xs px-6 py-[22px] rounded-2xl flex items-center justify-center gap-3 transition-all border-2 border-transparent h-full shadow-xl shadow-slate-200 active:scale-95 group">

                                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />}

                                                    <span className="uppercase tracking-[0.2em] font-black text-[10px]">Ganti Logo</span>

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

                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">

                                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic ml-2">Kebijakan Finansial</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

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

                                        <div className="md:col-span-2 mt-4">

                                            <label className="block text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2 italic">Metode Pembayaran Tersedia</label>

                                            <div className="flex flex-wrap gap-4 mb-8">

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



                                        <div className="md:col-span-2 mt-12 pt-12 border-t border-slate-100">

                                            <label className="block text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 ml-2 italic">Pembulatan Kelipatan (Rounding)</label>

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

                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">

                                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic ml-2">Aturan Operasional</h3>

                                    <div className="bg-slate-50/50 p-10 rounded-[3rem] border border-slate-100 flex flex-col md:flex-row gap-12 items-center">

                                        <div className="flex-1 space-y-10">

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



                                    <div className="pt-12 border-t border-slate-100 mt-12">

                                        <div className="flex justify-between items-end mb-10">

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



                                        <div className="space-y-10">

                                            {(!settings.availableShifts || settings.availableShifts.length === 0) && (

                                                <div className="p-12 border-4 border-dashed border-slate-100 rounded-[3rem] text-center bg-slate-50/50">

                                                    <p className="text-slate-300 text-xs font-black uppercase tracking-[0.3em]">Belum Ada Shift Didefinisikan</p>

                                                </div>

                                            )}

                                            {(settings.availableShifts || []).map((shift: any, idx: number) => (

                                                <div key={idx} className="bg-white border-2 border-slate-50 rounded-[3rem] p-10 relative group/shift shadow-sm hover:shadow-2xl hover:shadow-indigo-100/40 hover:border-indigo-100 transition-all duration-500">

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

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

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

                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">

                                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic ml-2">Infrastruktur Hardware</h3>



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

                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">

                                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic ml-2">Tampilan Invoice</h3>



                                    <div className="bg-white p-2 border border-slate-100 rounded-[3rem] shadow-inner mb-10 overflow-hidden">

                                        <div className="bg-slate-50/50 p-10 md:p-14 rounded-[2.9rem] space-y-10">

                                            <p className="text-sm text-slate-400 mb-6 font-bold uppercase tracking-widest text-center opacity-60 italic">Konfigurasi Identitas pada Bukti Pembayaran</p>



                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

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



                                            <div className="space-y-10">

                                                <InputField

                                                    label="Alamat Lengkap"

                                                    value={settings.invoiceAddress ?? settings.address}

                                                    savedValue={lastSavedSettings?.invoiceAddress ?? lastSavedSettings?.address}

                                                    isEditing={true}

                                                    onChange={(val) => setSettings({ ...settings, invoiceAddress: val })}

                                                    placeholder="Alamat lengkap usaha"

                                                />

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

                                    </div>



                                    <div className="bg-slate-50/30 p-10 rounded-[2.5rem] border border-slate-100">

                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2 italic">Catatan Kaki (Footer Note)</label>

                                        <textarea

                                            value={settings.invoiceFooterNote || ''}

                                            onChange={(e) => setSettings({ ...settings, invoiceFooterNote: e.target.value })}

                                            placeholder="Contoh: Barang yang sudah dibeli tidak dapat ditukar kembali. Terima kasih atas kunjungan Anda."

                                            className="w-full bg-white border-2 border-slate-100 rounded-[2rem] px-8 py-6 font-bold text-slate-700 focus:border-indigo-500 focus:outline-none transition-all min-h-[160px] shadow-sm focus:ring-[6px] focus:ring-indigo-500/10"

                                        />

                                        <p className="mt-4 text-[10px] font-bold text-slate-400/80 ml-2 uppercase tracking-widest">Pesan ini akan muncul di bagian paling bawah struk fisik dan digital</p>

                                    </div>

                                </div>

                            )}



                            {activeTab === 'database' && (

                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">

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

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">

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

                                    <div className="border-2 border-slate-100 rounded-[3rem] overflow-hidden shadow-sm">

                                        <div className="bg-slate-50 px-10 py-8 border-b border-slate-100">

                                            <h4 className="text-lg font-black text-slate-700 uppercase tracking-tighter italic">Pilih Tugas Maintenance</h4>

                                            <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest opacity-60">Centang tugas yang ingin dijalankan, lalu klik tombol eksekusi</p>

                                        </div>



                                        <div className="divide-y divide-slate-100 divide-dashed">

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
                                        <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-center justify-center p-4">
                                            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setConfirmOpen(false)} />
                                            <div className="relative bg-white rounded-[2.5rem] sm:rounded-[3.5rem] w-full max-w-lg shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-300">
                                                <div className="bg-slate-900 p-8 text-white relative">
                                                    <button onClick={() => setConfirmOpen(false)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all">
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                    <div className="flex items-center gap-4">
                                                        <div className="bg-amber-500/20 p-3 rounded-2xl backdrop-blur-md border border-amber-500/20">
                                                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-2xl font-black tracking-tighter uppercase">{t('settings.maintenance.confirmTitle') || 'Konfirmasi Maintenance'}</h3>
                                                            <p className="text-amber-500/60 text-[10px] font-black uppercase tracking-[0.2em] leading-none">Security Protocol Required</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-10 space-y-8">
                                                    <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 italic text-center">
                                                        <p className="text-slate-500 font-bold leading-relaxed">
                                                            {t('settings.maintenance.confirmDesc') || 'Tindakan ini tidak dapat dibatalkan. Pastikan Anda sudah melakukan backup data terlebih dahulu sebelum melanjutkan.'}
                                                        </p>
                                                    </div>

                                                    <div className="flex flex-col sm:flex-row gap-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmOpen(false)}
                                                            className="flex-1 px-8 py-5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all"
                                                        >
                                                            Batalkan
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={runSelectedMaintenance}
                                                            className="flex-[2] px-8 py-5 bg-slate-900 hover:bg-black text-white rounded-3xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-slate-200 uppercase tracking-widest text-[10px]"
                                                        >
                                                            <ChevronRight className="w-5 h-5" /> Ya, Eksekusi Sekarang
                                                        </button>
                                                    </div>
                                                </div>
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

                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">

                                    <div className="ml-2">

                                        <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">{t('settings.preferences.title')}</h3>

                                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-60">{t('settings.preferences.languageDesc')}</p>

                                    </div>

                                    <div>

                                        <label className="block text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 ml-2 italic">

                                            <Languages className="w-4 h-4 inline mr-2" />

                                            {t('settings.preferences.language')}

                                        </label>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">

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

                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">

                                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">

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

                                        <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 shadow-sm hover:border-emerald-200 transition-all flex flex-col justify-between">
                                            <div className="mb-6">
                                                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                                                    <DollarSign className="w-6 h-6 text-emerald-600" />
                                                </div>
                                                <h4 className="font-black text-slate-800 text-lg mb-2">Nilai Penukaran Poin</h4>
                                                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                                    Tentukan harga 1 poin saat ditukarkan dengan item reward. Ini adalah dasar "Cashback" yang diterima member.
                                                </p>
                                            </div>
                                            <InputField
                                                label="Nilai Per 1 Poin (Rp)"
                                                type="number"
                                                value={settings?.royaltyPointRedeemValue}
                                                savedValue={lastSavedSettings?.royaltyPointRedeemValue}
                                                isEditing={true}
                                                onChange={(val) => setSettings({ ...settings, royaltyPointRedeemValue: Number(val) })}
                                                placeholder="Standard: 200"
                                                suffix="IDR"
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

                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">

                                    {/* SECTION 1: TERMINAL & PAIRING SYSTEM */}

                                    <div className="relative group">

                                        <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 rounded-[4rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                                        <div className="relative bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-indigo-100/40 overflow-hidden">

                                            <div className="grid grid-cols-1 lg:grid-cols-2">

                                                {/* TECH SIDE: The Engine Room */}

                                                <div className="bg-slate-950 p-10 md:p-14 relative overflow-hidden">

                                                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] -mr-20 -mt-20"></div>

                                                    <div className="relative z-10">

                                                        <div className="flex items-center gap-5 mb-10">

                                                            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">

                                                                <Terminal className="w-7 h-7 text-white" />

                                                            </div>

                                                            <div>

                                                                <h4 className="text-2xl font-black text-white tracking-widest uppercase italic">Pairing Center</h4>

                                                                <p className="text-indigo-400 text-[10px] font-black tracking-[0.3em] uppercase mt-1">Terminal Synchronization</p>

                                                            </div>

                                                        </div>



                                                        <div className="space-y-8">

                                                            <div className="space-y-3">

                                                                <label className="block text-[10px] font-black text-indigo-300/60 uppercase tracking-[0.4em] ml-1">Terminal Identity Code</label>

                                                                <div className="flex gap-4">

                                                                    <div className="flex-1 relative group/input">

                                                                        <Monitor className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 group-focus-within/input:text-white transition-colors" />

                                                                        <input 

                                                                            type="text"

                                                                            value={terminalId || ''}

                                                                            onChange={(e) => setTerminalId(e.target.value.toUpperCase())}

                                                                            placeholder="KSR-MAIN-01"

                                                                            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl pl-16 pr-6 py-5 text-lg font-black text-white focus:border-indigo-500 focus:bg-white/10 outline-none transition-all placeholder:text-white/10 tracking-widest font-mono"

                                                                        />

                                                                    </div>

                                                                    <button 

                                                                        type="button"

                                                                        onClick={() => {

                                                                            const randomId = `T-${Math.floor(100 + Math.random() * 900)}`;

                                                                            setTerminalId(randomId);

                                                                        }}

                                                                        className="px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg shadow-indigo-500/20"

                                                                    >

                                                                        Shuffle

                                                                    </button>

                                                                </div>

                                                            </div>



                                                            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">

                                                                <div className="flex items-start gap-4">

                                                                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">

                                                                        <Zap className="w-5 h-5 text-amber-400" />

                                                                    </div>

                                                                    <p className="text-[11px] text-white/50 font-bold leading-relaxed">

                                                                        ID ini harus <span className="text-white italic">MATCH</span> dengan yang diinput pada Tablet Customer Display agar data sinkron seketika.

                                                                    </p>

                                                                </div>

                                                            </div>

                                                        </div>

                                                    </div>

                                                </div>



                                                {/* INTERACTION SIDE: Connectivity */}

                                                <div className="p-10 md:p-14 flex flex-col justify-center">

                                                    <div className="mb-8">

                                                        <div className="flex items-center gap-3 mb-4">

                                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>

                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Network Broadcasting</span>

                                                        </div>

                                                        <h5 className="text-lg font-black text-slate-800 uppercase tracking-tighter italic">Target Device Endpoint</h5>

                                                        <p className="text-sm text-slate-400 font-medium mt-1">Salin link di bawah dan buka di Browser Tablet / TV</p>

                                                    </div>



                                                    <div className="space-y-6">

                                                        <div 

                                                            onClick={() => {

                                                                const url = `${window.location.protocol}//${window.location.host}/display?terminalId=${terminalId || 'KSR-XX'}`;

                                                                navigator.clipboard.writeText(url);

                                                                alert('Link berhasil disalin!');

                                                            }}

                                                            className="bg-slate-50 hover:bg-indigo-50 border-2 border-slate-100 hover:border-indigo-100 rounded-[1.5rem] p-6 font-mono text-sm break-all cursor-pointer transition-all active:scale-[0.98] text-indigo-600 group/url relative shadow-inner"

                                                        >

                                                            {typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/display?terminalId=${terminalId || 'KSR-XX'}` : 'Loading...'}

                                                            <div className="absolute right-4 top-4 opacity-0 group-hover/url:opacity-100 transition-opacity">

                                                                <span className="px-3 py-1 bg-indigo-600 text-white text-[8px] font-black uppercase rounded-lg">Copy URL</span>

                                                            </div>

                                                        </div>



                                                        <div className="flex gap-4">

                                                            <button 

                                                                type="button"

                                                                onClick={(e) => {

                                                                    e.preventDefault();

                                                                    if (terminalId) window.open(`/display?terminalId=${terminalId}`, '_blank');

                                                                    else alert('Isi ID Terminal dahulu');

                                                                }}

                                                                className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all hover:bg-black active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-slate-200"

                                                            >

                                                                <Monitor className="w-4 h-4 text-indigo-400" /> Launch Local Display

                                                            </button>

                                                        </div>

                                                    </div>

                                                </div>

                                            </div>

                                        </div>

                                    </div>



                                    {/* SECTION 2: ADVERTISING & CAMPAIGN MANAGEMENT */}

                                    <div className="space-y-8">

                                        <div className="flex flex-col md:flex-row justify-between items-end gap-6">

                                            <div className="space-y-2">

                                                <div className="flex items-center gap-3">

                                                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-200">

                                                        <Sparkles className="w-5 h-5" />

                                                    </div>

                                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] italic leading-none">Campaign Engine</span>

                                                </div>

                                                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none italic mt-2">Marketing Banners</h3>

                                                <p className="text-sm text-slate-400 font-bold">Kelola tampilan promosi visual pada layar pelanggan.</p>

                                            </div>

                                            <button 

                                                type="button"

                                                onClick={() => {

                                                    const newPromo = { title: "Special Deal", desc: "Nikmati promo terbatas hari ini!", tag: "PROMO", color: "from-indigo-600 to-blue-600", image: "" };

                                                    setSettings({ ...settings, displayPromotions: [...(settings.displayPromotions || []), newPromo] });

                                                }}

                                                className="px-10 py-5 bg-indigo-600 hover:bg-slate-950 text-white rounded-[1.5rem] font-black text-[10px] transition-all shadow-2xl shadow-indigo-100 flex items-center gap-4 active:scale-95 uppercase tracking-[0.2em]"

                                            >

                                                <Plus className="w-5 h-5" /> Buat Kampanye Baru

                                            </button>

                                        </div>



                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">

                                            {(!settings.displayPromotions || settings.displayPromotions.length === 0) && (

                                                <div className="xl:col-span-2 p-24 border-4 border-dashed border-slate-100 rounded-[4rem] text-center bg-slate-50/50">

                                                     <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-slate-100 text-slate-200 shadow-inner">

                                                        <Image className="w-10 h-10" />

                                                     </div>

                                                     <h5 className="text-2xl font-black text-slate-400 uppercase tracking-[0.2em] leading-none italic">Banner Empty</h5>

                                                     <p className="text-slate-300 text-[10px] font-bold uppercase tracking-[0.4em] mt-5">Siapkan materi visual untuk meningkatkan engagement pelanggan</p>

                                                </div>

                                            )}

                                            

                                            {(settings.displayPromotions || []).map((promo: any, idx: number) => (

                                                <div key={idx} className="bg-white border border-slate-100 rounded-[3rem] p-2 shadow-2xl shadow-slate-100/50 overflow-hidden group/promo transition-all duration-500 hover:-translate-y-2 flex flex-col">

                                                    {/* LIVE PREVIEW - 16:9 Aspect Ratio Focus */}

                                                    <div className="relative aspect-video w-full rounded-[2.5rem] overflow-hidden border-4 border-slate-50 shadow-inner bg-slate-100">

                                                        <div className={`absolute inset-0 bg-gradient-to-br ${promo.color} opacity-90 transition-all duration-700`}></div>

                                                        {promo.image && <img src={getFullImageUrl(promo.image)} alt="Preview" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40 group-hover/promo:scale-110 transition-transform duration-[2s]" />}

                                                        <div className="absolute inset-x-8 bottom-8 text-white">

                                                            <div className="flex items-center gap-3 mb-4">

                                                                <span className="px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-[0.2em]">{promo.tag || 'PROMO'}</span>

                                                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>

                                                            </div>

                                                            <h4 className="text-3xl font-black uppercase tracking-tighter leading-tight mb-2 drop-shadow-lg">{promo.title || 'YOUR HEADER'}</h4>

                                                            <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest leading-relaxed max-w-sm line-clamp-2">{promo.desc || 'Campaign details appear here...'}</p>

                                                        </div>

                                                        <div className="absolute top-6 left-6 w-12 h-12 bg-black/30 backdrop-blur-xl text-white rounded-2xl flex items-center justify-center font-black text-lg border border-white/10 italic">

                                                            {idx + 1}

                                                        </div>

                                                        <button

                                                            type="button"

                                                            onClick={() => {

                                                                const newPromos = [...settings.displayPromotions];

                                                                newPromos.splice(idx, 1);

                                                                setSettings({ ...settings, displayPromotions: newPromos });

                                                            }}

                                                            className="absolute top-6 right-6 w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center opacity-0 group-hover/promo:opacity-100 transition-all shadow-xl active:scale-90 hover:bg-rose-600 scale-90"

                                                        >

                                                            <Trash2 className="w-5 h-5" />

                                                        </button>

                                                    </div>



                                                    {/* EDITING ZONE */}

                                                    <div className="p-10 space-y-10 flex-1">

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">

                                                            <InputField label="Headline Kampanye" value={promo.title} isEditing={true} onChange={(val) => {

                                                                const newPromos = [...settings.displayPromotions];

                                                                newPromos[idx].title = val;

                                                                setSettings({ ...settings, displayPromotions: newPromos });

                                                            }} placeholder="E.G. HAPPY HOUR BLAST" />

                                                            <InputField label="Badge Label" value={promo.tag} isEditing={true} onChange={(val) => {

                                                                const newPromos = [...settings.displayPromotions];

                                                                newPromos[idx].tag = val.toUpperCase();

                                                                setSettings({ ...settings, displayPromotions: newPromos });

                                                            }} placeholder="PROMO / EXCLUSIVE" />

                                                        </div>

                                                        <InputField label="Body Copy / Keterangan" value={promo.desc} isEditing={true} onChange={(val) => {

                                                            const newPromos = [...settings.displayPromotions];

                                                            newPromos[idx].desc = val;

                                                            setSettings({ ...settings, displayPromotions: newPromos });

                                                        }} placeholder="Contoh: Diskon 20% khusus member pukul 14:00 - 17:00" />

                                                        

                                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                                                            <div className="lg:col-span-7 relative group/file">

                                                                <InputField label="Path Visual / Image" value={promo.image} isEditing={true} onChange={(val) => {

                                                                    const newPromos = [...settings.displayPromotions];

                                                                    newPromos[idx].image = val;

                                                                    setSettings({ ...settings, displayPromotions: newPromos });

                                                                }} placeholder="/uploads/promos/event.jpg" />

                                                                <label className="absolute right-3 top-[34px] cursor-pointer bg-slate-900 border border-white/10 p-2.5 px-4 rounded-xl text-white hover:bg-indigo-600 transition-all shadow-lg flex items-center gap-3 active:scale-95">

                                                                    {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}

                                                                    <span className="text-[9px] font-black uppercase tracking-widest">Select</span>

                                                                    <input type="file" className="hidden" accept="image/*" onChange={async (e) => {

                                                                        const file = e.target.files?.[0];

                                                                        if (file) {

                                                                            const url = await handleFileUpload(file, 'promo');

                                                                            if (url) {

                                                                                const newPromos = [...settings.displayPromotions];

                                                                                newPromos[idx].image = url;

                                                                                setSettings({ ...settings, displayPromotions: newPromos });

                                                                            }

                                                                        }

                                                                    }} />

                                                                </label>

                                                            </div>

                                                            <div className="lg:col-span-5">

                                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 italic leading-none">Vibe Theme</label>

                                                                <div className="flex gap-2">

                                                                    {[

                                                                        { name: 'Deep Blue', class: 'from-indigo-600 to-blue-600' },

                                                                        { name: 'Royal', class: 'from-rose-600 to-purple-600' },

                                                                        { name: 'Sunset', class: 'from-amber-500 to-orange-600' },

                                                                        { name: 'Midnight', class: 'from-slate-800 to-slate-900' }

                                                                    ].map(color => (

                                                                        <button key={color.name} type="button" onClick={() => {

                                                                            const newPromos = [...settings.displayPromotions];

                                                                            newPromos[idx].color = color.class;

                                                                            setSettings({ ...settings, displayPromotions: newPromos });

                                                                        }} className={`h-11 flex-1 rounded-xl transition-all border-2 ${promo.color === color.class ? 'border-slate-900 scale-105 shadow-md ring-4 ring-slate-100' : 'border-transparent opacity-40 hover:opacity-100'} bg-gradient-to-br ${color.class}`} />

                                                                    ))}

                                                                </div>

                                                            </div>

                                                        </div>

                                                    </div>

                                                </div>

                                            ))}

                                        </div>

                                    </div>

                                    

                                    {/* SECTION 3: PRO TIPS & SPECS */}

                                    <div className="bg-gradient-to-br from-indigo-50 to-white rounded-[3.5rem] p-10 md:p-14 border border-indigo-100 shadow-xl shadow-indigo-100/20 relative overflow-hidden">

                                        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-indigo-200/20 rounded-full blur-[80px]"></div>

                                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">

                                            <div className="lg:col-span-1 border-r-0 lg:border-r border-indigo-100 pr-0 lg:pr-12">

                                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-indigo-100 border border-indigo-50">

                                                    <Info className="w-8 h-8 text-indigo-500" />

                                                </div>

                                                <h5 className="text-2xl font-black text-indigo-900 uppercase tracking-tighter mb-3 italic">Visual Guide</h5>

                                                <p className="text-indigo-900/60 text-xs font-bold leading-relaxed">Pahami aturan main konten visual agar tampilan di hadapan pelanggan terlihat sangat premium dan meyakinkan.</p>

                                            </div>

                                            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">

                                                {[

                                                    { label: 'Aspect Ratio', val: '16:9 Landscape', desc: 'Sesuai dengan resolusi TV/Tablet standar.' },

                                                    { label: 'Color Format', val: 'WebP / PNG', desc: 'Kompresi terbaik untuk performa loading cepat.' },

                                                    { label: 'Typography', val: 'High Contrast', desc: 'Pastikan teks dapat terbaca dari jarak 3 meter.' },

                                                    { label: 'File Size', val: 'Max 2MB/Image', desc: 'Agar slideshow tetap berjalan smooth.' }

                                                ].map(item => (

                                                    <div key={item.label} className="group/item">

                                                        <div className="flex items-center gap-3 mb-2">

                                                            <div className="w-2 h-2 bg-indigo-500 rounded-full group-hover/item:scale-150 transition-transform"></div>

                                                            <p className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.2em]">{item.label}</p>

                                                        </div>

                                                        <p className="text-sm font-black text-slate-800 mb-1">{item.val}</p>

                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.desc}</p>

                                                    </div>

                                                ))}

                                            </div>

                                        </div>

                                    </div>

                                </div>

                            )}



                            {activeTab === 'whatsapp' && (

                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">

                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                                        <div>

                                            <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic ml-2">WhatsApp Gateway (Baileys)</h3>

                                            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-60 ml-2">Hubungkan sistem dengan nomor WhatsApp untuk notifikasi otomatis</p>

                                        </div>

                                        <div className="flex items-center gap-3">

                                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${

                                                waStatus?.status === 'CONNECTED' ? 'bg-emerald-100 text-emerald-600' : 

                                                waStatus?.status === 'CONNECTING' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'

                                            }`}>

                                                <div className={`w-2 h-2 rounded-full ${

                                                    waStatus?.status === 'CONNECTED' ? 'bg-emerald-500' : 

                                                    waStatus?.status === 'CONNECTING' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'

                                                }`}></div>

                                                {waStatus?.status || 'UNKNOWN'}

                                            </div>

                                            <button 

                                                type="button"

                                                onClick={fetchWaStatus}

                                                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"

                                            >

                                                <RefreshCw className={`w-4 h-4 ${waLoading ? 'animate-spin' : ''}`} />

                                            </button>

                                        </div>

                                    </div>



                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                                        <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden group">

                                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>

                                            <div className="relative z-10">

                                                <div className="flex items-center gap-4 mb-8">

                                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">

                                                        <Zap className="w-6 h-6 text-indigo-400" />

                                                    </div>

                                                    <div>

                                                        <h4 className="text-xl font-black tracking-tight">Status Koneksi</h4>

                                                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Server-side Library</p>

                                                    </div>

                                                </div>



                                                <div className="space-y-6">

                                                    {waStatus?.status === 'CONNECTED' ? (

                                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">

                                                            <div className="flex items-center gap-4 mb-2">

                                                                <CheckCircle2 className="w-6 h-6 text-emerald-400" />

                                                                <p className="font-black text-emerald-500">WHATSAPP TERHUBUNG</p>

                                                            </div>

                                                            <p className="text-xs text-white/60 leading-relaxed font-medium">Sistem siap mengirimkan notifikasi kartu member, tanda terima, dan peringatan saldo secara otomatis.</p>

                                                        </div>

                                                    ) : (

                                                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">

                                                            <div className="flex items-center gap-4 mb-2">

                                                                <AlertCircle className="w-6 h-6 text-amber-400" />

                                                                <p className="font-black text-amber-500">BELUM TERHUBUNG</p>

                                                            </div>

                                                            <p className="text-xs text-white/50 leading-relaxed font-medium">Scan QR Code di samping untuk menghubungkan nomor WhatsApp utama Bisnis dengan sistem Baileys.</p>

                                                        </div>

                                                    )}



                                                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5">

                                                        <h5 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">LOG AKTIVITAS</h5>

                                                        <div className="font-mono text-[9px] text-indigo-300 space-y-2">

                                                            <p className="opacity-50">[{new Date().toLocaleTimeString()}] System initializing...</p>

                                                            <p className="opacity-80">[{new Date().toLocaleTimeString()}] Baileys: {waStatus?.status}</p>

                                                            {waStatus?.qr && <p className="text-amber-400 animate-pulse">[{new Date().toLocaleTimeString()}] New QR generated, waiting for scan...</p>}

                                                        </div>

                                                    </div>



                                                    <div className="flex flex-col sm:flex-row gap-3">

                                                        <button 

                                                            type="button"

                                                            onClick={async () => {

                                                                try {

                                                        
                                                                    await axios.post(`/whatsapp/reconnect`, {});

                                                                    fetchWaStatus();

                                                                    alert('Signal reconnect dikirim. Silakan tunggu 5-10 detik.');

                                                                } catch (err) {

                                                                    alert('Gagal mengirim signal reconnect');

                                                                }

                                                            }}

                                                            className="flex-1 py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"

                                                        >

                                                            Reconnect

                                                        </button>

                                                        {waStatus?.status === 'CONNECTED' && (

                                                            <button 

                                                                type="button"

                                                                onClick={handleWaLogout}

                                                                className="flex-1 py-4 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/20 rounded-2xl text-[10px] font-black text-rose-400 uppercase tracking-widest transition-all active:scale-95"

                                                            >

                                                                Disconnect / Logout

                                                            </button>

                                                        )}

                                                    </div>

                                                </div>

                                            </div>

                                        </div>



                                        <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center group transition-all hover:border-indigo-100">

                                            {waStatus?.status === 'CONNECTED' ? (

                                                <div className="space-y-6">

                                                    <div className="w-32 h-32 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center text-emerald-500 mx-auto shadow-xl shadow-emerald-100 transition-transform group-hover:scale-110">

                                                        <CheckCircle2 className="w-16 h-16" />

                                                    </div>

                                                    <div>

                                                        <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Koneksi Berhasil</h4>

                                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Nomor Anda Telah Tertaut</p>

                                                    </div>

                                                    <div className="pt-6 border-t border-slate-50 w-full">

                                                        <p className="text-[10px] text-slate-400 leading-relaxed font-medium">Jika Anda ingin mengganti nomor, silakan Logout dari aplikasi WhatsApp di HP Anda pada menu <span className="text-slate-900 font-bold">Linked Devices</span>.</p>

                                                    </div>

                                                </div>

                                            ) : waStatus?.qr ? (

                                                <div className="space-y-8 flex flex-col items-center">

                                                    <div className="p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl shadow-indigo-100 relative group/qr">

                                                        <div className="absolute -inset-2 bg-indigo-500/10 rounded-[3rem] blur-xl opacity-0 group-hover/qr:opacity-100 transition-opacity"></div>

                                                        <QRCodeCanvas 

                                                            value={waStatus.qr} 

                                                            size={220} 

                                                            level="H"

                                                            includeMargin={true}

                                                            className="relative z-10"

                                                        />

                                                    </div>

                                                    <div className="space-y-3">

                                                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest mx-auto w-fit">

                                                            <RefreshCw className="w-3 h-3 animate-spin" />

                                                            Menunggu Scan...

                                                        </div>

                                                        <h4 className="text-lg font-black text-slate-800 tracking-tight italic uppercase">Scan QR Code</h4>

                                                        <p className="text-[11px] text-slate-400 font-bold max-w-[240px] leading-relaxed uppercase tracking-widest">

                                                            Pilih 'Tautkan Perangkat' di WhatsApp HP Anda dan arahkan ke layar ini.

                                                        </p>

                                                    </div>

                                                </div>

                                            ) : (

                                                <div className="space-y-6">

                                                    <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mx-auto animate-pulse">

                                                        <MessageCircle className="w-16 h-16" />

                                                    </div>

                                                    <div className="space-y-3">

                                                        <p className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">Menyiapkan Library...</p>

                                                        <p className="text-[10px] text-slate-400 font-bold max-w-[200px]">QR Code akan muncul dalam beberapa saat. Silakan tunggu.</p>

                                                    </div>

                                                </div>

                                            )}

                                        </div>

                                    </div>



                                    {/* BROADCAST SECTION */}

                                    {waStatus?.status === 'CONNECTED' && (

                                        <div className="bg-slate-50 border-2 border-slate-100 rounded-[3rem] p-10">

                                            <div className="flex items-center gap-4 mb-8">

                                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">

                                                    <Zap className="w-6 h-6" />

                                                </div>

                                                <div>

                                                    <h4 className="text-xl font-black text-slate-800 tracking-tight italic uppercase">WhatsApp Broadcast</h4>

                                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Marketing & Pengumuman ke Member</p>

                                                </div>

                                            </div>



                                            <div className="space-y-6">

                                                <div className="space-y-3">

                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Isi Pesan Broadcast</label>

                                                    <textarea 

                                                        value={broadcastMsg}

                                                        onChange={(e) => setBroadcastMsg(e.target.value)}

                                                        placeholder="Contoh: Promo Spesial Weekend! Main 2 Jam Gratis 1 Jam. Berlaku hari ini..."

                                                        className="w-full p-6 bg-white border-2 border-slate-100 border-dashed rounded-3xl text-sm font-bold focus:border-indigo-500 focus:ring-0 transition-all min-h-[120px] resize-none shadow-sm"

                                                    />

                                                </div>



                                                <button 

                                                    type="button"

                                                    disabled={!broadcastMsg.trim() || isBroadcastingLocal}

                                                    onClick={handleWaBroadcast}

                                                    className="w-full md:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-xs tracking-widest"

                                                >

                                                    {isBroadcastingLocal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}

                                                    {isBroadcastingLocal ? 'Memroses...' : 'Kirim Ke Semua Member'}

                                                </button>



                                                <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-4">

                                                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />

                                                    <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase">

                                                        Hati-hati: Hindari mengirim pesan terlalu sering atau mengandung spam agar nomor tidak diblokir oleh WhatsApp. 

                                                        Sistem akan memberikan jeda otomatis 2-4 detik antar pesan.

                                                    </p>

                                                </div>

                                            </div>

                                        </div>

                                    )}



                                    {/* MESSAGE TEMPLATES SECTION */}

                                    <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 mt-10">

                                        <div className="flex items-center gap-4 mb-8">

                                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">

                                                <MessageCircle className="w-6 h-6" />

                                            </div>

                                            <div>

                                                <h4 className="text-xl font-black text-slate-800 tracking-tight italic uppercase">Customized Message Templates</h4>

                                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Atur isi pesan otomatis untuk Member</p>

                                            </div>

                                        </div>



                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

                                            <div className="space-y-4">

                                                <div className="flex items-center justify-between mb-2">

                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Pendaftaran Member (Registration)</label>

                                                    <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">Welcome Message</span>

                                                </div>

                                                <textarea 

                                                    value={settings.waTemplateWelcome || ''}

                                                    onChange={(e) => setSettings({ ...settings, waTemplateWelcome: e.target.value })}

                                                    placeholder="Contoh: Halo {{name}}, selamat bergabung! ID Member Anda: {{code}}"

                                                    className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl text-sm font-bold focus:border-indigo-500 focus:bg-white transition-all min-h-[150px] resize-none"

                                                />

                                                <div className="flex flex-wrap gap-2 px-2">

                                                    {['name', 'code', 'category', 'expiry'].map(tag => (

                                                        <span key={tag} className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-lg cursor-help" title={`Placeholder untuk ${tag}`}>{'{{'}{tag}{'}}'}</span>

                                                    ))}

                                                </div>

                                            </div>



                                            <div className="space-y-4">

                                                <div className="flex items-center justify-between mb-2">

                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Sesi Billiard Selesai (Session End)</label>

                                                    <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">Billing Notification</span>

                                                </div>

                                                <textarea 

                                                    value={settings.waTemplateSessionEnd || ''}

                                                    onChange={(e) => setSettings({ ...settings, waTemplateSessionEnd: e.target.value })}

                                                    placeholder="Contoh: Sesi {{table}} selesai! Total: Rp {{grand_total}}"

                                                    className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl text-sm font-bold focus:border-indigo-500 focus:bg-white transition-all min-h-[150px] resize-none"

                                                />

                                                <div className="flex flex-wrap gap-2 px-2">

                                                    {['name', 'table', 'duration', 'grand_total', 'balance', 'points_earned', 'order_details'].map(tag => (

                                                        <span key={tag} className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-lg cursor-help" title={`Placeholder untuk ${tag}`}>{'{{'}{tag}{'}}'}</span>

                                                    ))}

                                                </div>

                                            </div>

                                        </div>

                                        

                                        <div className="mt-8 p-6 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-4">

                                            <Info className="w-5 h-5 text-indigo-600 shrink-0" />

                                            <div>

                                                <p className="text-[10px] text-indigo-900 font-bold uppercase mb-1">Panduan Template:</p>

                                                <p className="text-[9px] text-indigo-800/70 font-medium leading-relaxed">

                                                    Gunakan kode kurawal double <span className="font-bold underline">{'{{tag}}'}</span> untuk menyisipkan data otomatis. Kosongkan template untuk kembali ke pesan standar sistem. <span className="font-black">{'{{order_details}}'}</span> menampilkan daftar pesanan, dan <span className="font-black">{'{{points_earned}}'}</span> menampilkan poin yang didapat.

                                                </p>

                                            </div>

                                        </div>

                                    </div>



                                    {/* OWNER REPORT CONFIGURATION SECTION */}

                                    <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 mt-10">

                                        <div className="flex items-center gap-4 mb-8">

                                            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">

                                                <BarChart3 className="w-6 h-6" />

                                            </div>

                                            <div>

                                                <h4 className="text-xl font-black text-slate-800 tracking-tight italic uppercase">Laporan Owner (PDF)</h4>

                                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Kirim Laporan Otomatis ke WhatsApp Owner</p>

                                            </div>

                                        </div>



                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

                                            <InputField

                                                label="Nomor WhatsApp Owner"

                                                value={settings.ownerPhone}

                                                savedValue={lastSavedSettings?.ownerPhone}

                                                isEditing={true}

                                                onChange={(val) => setSettings({ ...settings, ownerPhone: val })}

                                                placeholder="Contoh: 628123456789"

                                                helper="Gunakan format internasional (628...). Laporan akan dikirim ke nomor ini."

                                            />

                                            <div className="space-y-4">

                                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">

                                                    <div>

                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Laporan Otomatis</p>

                                                        <p className="text-xs font-bold text-slate-600">Kirim laporan harian setiap hari</p>

                                                    </div>

                                                    <label className="relative inline-flex items-center cursor-pointer">

                                                        <input 

                                                            type="checkbox" 

                                                            checked={settings.autoReportEnabled}

                                                            onChange={(e) => setSettings({ ...settings, autoReportEnabled: e.target.checked })}

                                                            className="sr-only peer" 

                                                        />

                                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>

                                                    </label>

                                                </div>

                                                {settings.autoReportEnabled && (

                                                    <InputField

                                                        label="Jadwal Kirim (WIB)"

                                                        type="time"

                                                        value={settings.reportSchedule}

                                                        savedValue={lastSavedSettings?.reportSchedule}

                                                        isEditing={true}

                                                        onChange={(val) => setSettings({ ...settings, reportSchedule: val })}

                                                        helper="Laporan harian akan dikirim otomatis setiap jam ini."

                                                    />

                                                )}

                                            </div>

                                        </div>

                                    </div>



                                    {/* NOTIFICATION POLICY SECTION */}

                                    <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 mt-10">

                                        <div className="flex items-center gap-4 mb-8">

                                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">

                                                <ShieldOff className="w-6 h-6 text-indigo-400" />

                                            </div>

                                            <div>

                                                <h4 className="text-xl font-black text-slate-800 tracking-tight italic uppercase">Kebijakan Notifikasi</h4>

                                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Aturan sistem cut-off & peringatan otomatis</p>

                                            </div>

                                        </div>



                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

                                            <InputField

                                                label="Batas Saldo Cut-off (Rp)"

                                                type="number"

                                                value={settings.balanceBuffer}

                                                savedValue={lastSavedSettings?.balanceBuffer}

                                                isEditing={true}

                                                onChange={(val) => setSettings({ ...settings, balanceBuffer: val })}

                                                placeholder="Contoh: 2000"

                                                helper="Sistem akan menghentikan sesi meja otomatis jika sisa saldo member mencapai angka ini."

                                            />

                                            <InputField

                                                label="Peringatan WA (Menit)"

                                                type="number"

                                                value={settings.balanceWarningMinutes}

                                                savedValue={lastSavedSettings?.balanceWarningMinutes}

                                                isEditing={true}

                                                onChange={(val) => setSettings({ ...settings, balanceWarningMinutes: val })}

                                                placeholder="Contoh: 15"

                                                helper="Menit sisa waktu bermain sebelum sistem mengirim notifikasi WhatsApp peringatan saldo menipis."

                                            />

                                        </div>

                                    </div>



                                    <div className="bg-indigo-50 border border-indigo-100 rounded-[2.5rem] p-8 md:p-10 mt-10">

                                        <div className="flex items-start gap-5">

                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm shrink-0">

                                                <Info className="w-6 h-6" />

                                            </div>

                                            <div className="space-y-4">

                                                <h5 className="font-black text-indigo-900 uppercase tracking-tight">Kenapa Menggunakan Baileys?</h5>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                                    <div className="space-y-1">

                                                        <p className="text-xs font-black text-indigo-700 tracking-widest uppercase">Gratis & Tanpa API Pihak Ke-3</p>

                                                        <p className="text-[11px] text-indigo-900/60 leading-relaxed font-medium capitalize">Anda tidak perlu membayar biaya berlangganan bulanan karena sistem berjalan langsung di server lokal Anda.</p>

                                                    </div>

                                                    <div className="space-y-1">

                                                        <p className="text-xs font-black text-indigo-700 tracking-widest uppercase">Keamanan Data & Privasi</p>

                                                        <p className="text-[11px] text-indigo-900/60 leading-relaxed font-medium capitalize">Pesan dikirim langsung melalui nomor Anda tanpa melalui intermediary, menjaga kerahasiaan data member.</p>

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



function TabButton({ active, onClick, icon, label, desc }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, desc?: string }) {

    return (

        <button

            onClick={onClick}

            type="button"

            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105 z-10' : 'bg-transparent text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-lg hover:shadow-slate-100 border border-transparent'}`}

        >

            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-indigo-50'}`}>

                {icon}

            </div>

            <div className="text-left flex-1 min-w-0">

                <p className="text-sm font-black uppercase tracking-tight truncate">{label}</p>

                {desc && <p className={`text-[9px] font-bold uppercase tracking-widest truncate ${active ? 'text-indigo-200' : 'text-slate-400 group-hover:text-indigo-400'}`}>{desc}</p>}

            </div>

            {active && <ChevronRight className="w-4 h-4 text-white/40" />}

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

        <div className={`p-8 transition-all duration-500 ${checked ? 'bg-white' : 'bg-slate-50/20 opacity-40 hover:opacity-60'}`}>

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

