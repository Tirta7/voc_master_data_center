'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    UploadCloud, X, Download, FileSpreadsheet,
    CheckCircle2, AlertCircle, Users, ShieldCheck, Info,
} from 'lucide-react';
import axios from 'axios';
import * as xlsx from 'xlsx';

interface ImportExcelEmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ImportExcelEmployeeModal({ isOpen, onClose, onSuccess }: ImportExcelEmployeeModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<{ roles: number; employees: number } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen) return null;

    // ── Template Generator ────────────────────────────────────────────────────
    const handleDownloadTemplate = () => {
        const wb = xlsx.utils.book_new();

        // ── Sheet 1: Role Matrix ───────────────────────────────────────────────
        const roleData = [
            ['Nama Role', 'Level Approval', 'Deskripsi', 'Permissions'],
            [
                'SUPER_ADMIN', 4, 'Akses penuh ke seluruh sistem',
                'BILLIARD_VIEW,BILLIARD_START,BILLIARD_STOP,BILLIARD_PAY,BILLIARD_ORDER,CAFE_VIEW,CAFE_START,CAFE_ORDER,CAFE_PAY,INV_VIEW,FIN_REVENUE,USER_MANAGE,USER_ROLE,AUDIT_VIEW,SHIFT_START,SHIFT_MANAGE,REPORT_EXPORT,SETTING_TABLES,SETTING_IDENTITY,SETTING_HARDWARE'
            ],
            [
                'MANAGER', 3, 'Manajer operasional harian',
                'BILLIARD_VIEW,BILLIARD_START,BILLIARD_STOP,BILLIARD_PAY,BILLIARD_ORDER,CAFE_VIEW,CAFE_START,CAFE_ORDER,CAFE_PAY,INV_VIEW,FIN_REVENUE,FIN_DEBTS,BUSINESS_DAY_VIEW,SHIFT_START,SHIFT_MANAGE,REPORT_EXPORT,APPROVAL_VIEW,APPROVAL_ACTION'
            ],
            [
                'KASIR', 2, 'Kasir & operator transaksi',
                'BILLIARD_VIEW,BILLIARD_CARD_VIEW,BILLIARD_START,BILLIARD_EXTEND,BILLIARD_STOP,BILLIARD_PAY,BILLIARD_ORDER,BILLIARD_CANCEL_ITEM,BILLIARD_PREVIEW,CAFE_VIEW,CAFE_CARD_VIEW,CAFE_START,CAFE_ORDER,CAFE_PAY,CAFE_CANCEL_ITEM,PAYMENT_PROCESS,SHIFT_START,START_TABLE,WAITING_LIST_VIEW'
            ],
            [
                'WAITER', 1, 'Pelayan & order cafe',
                'BILLIARD_VIEW,BILLIARD_CARD_VIEW,BILLIARD_START,BILLIARD_STOP,BILLIARD_ORDER,BILLIARD_PAY,BILLIARD_PREVIEW,CAFE_VIEW,CAFE_CARD_VIEW,CAFE_START,CAFE_ORDER,CAFE_PAY,SHIFT_START,START_TABLE,DASHBOARD_TABLE'
            ],
            [
                'KITCHEN', 1, 'Dapur / Kitchen Display',
                'ACCESS_KDS,KDS_VIEW,KDS_PROCESS,KDS_SET_READY,KDS_HISTORY,SHIFT_START'
            ],
            [
                'BARTENDER', 1, 'Bar Display / Bartender',
                'ACCESS_BDS,BDS_VIEW,BDS_PROCESS,BDS_SET_READY,BDS_HISTORY,SHIFT_START'
            ],
            [
                'SECURITY', 1, 'Keamanan & monitoring',
                'DASHBOARD_TABLE,USER_MONITOR,AUDIT_VIEW'
            ],
        ];
        const wsRole = xlsx.utils.aoa_to_sheet(roleData);
        wsRole['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 35 }, { wch: 120 }];
        xlsx.utils.book_append_sheet(wb, wsRole, 'Role Matrix');

        // ── Sheet 2: Karyawan ─────────────────────────────────────────────────
        const empData = [
            [
                'Nama Lengkap', 'Username', 'Password', 'Role', 'PIN', 'RFID',
                'Telepon', 'Email', 'Jabatan', 'Shift', 'Jenis Kelamin',
                'Alamat', 'Mode Keamanan', 'Tanggal Bergabung'
            ],
            [
                'Budi Santoso', 'budi.santoso', 'budi123', 'KASIR', '1234', '',
                '08123456789', 'budi@billiard.com', 'Kasir Shift 1', 'SHIFT 1', 'Laki-laki',
                'Jl. Merdeka No. 1, Jakarta', 'HYBRID', '2024-01-15'
            ],
            [
                'Siti Rahayu', 'siti.rahayu', '', 'WAITER', '5678', 'RFID001',
                '08987654321', '', 'Pelayan', 'SHIFT 2', 'Perempuan',
                'Jl. Sudirman No. 5, Jakarta', 'RFID_ONLY', '2024-03-01'
            ],
            [
                'Ahmad Fauzi', 'ahmad.fauzi', 'manager123', 'MANAGER', '9999', '',
                '08111222333', 'ahmad@billiard.com', 'Manajer Operasional', 'SHIFT 1', 'Laki-laki',
                'Jl. Gatot Subroto No. 12', 'HYBRID', '2023-06-10'
            ],
            [
                'Dewi Lestari', 'dewi.lestari', '', 'KASIR', '4321', 'RFID002',
                '08555666777', '', 'Kasir Shift 2', 'SHIFT 2', 'Perempuan',
                'Jl. Thamrin No. 20, Jakarta', 'HYBRID', '2024-05-20'
            ],
            [
                'Rivan Kurniawan', 'rivan.kurniawan', 'aman123', 'SECURITY', '0000', 'RFID003',
                '08222333444', '', 'Security', 'SHIFT 3', 'Laki-laki',
                'Jl. Kebon Jeruk No. 8', 'RFID_ONLY', '2024-07-01'
            ],
        ];
        const wsEmp = xlsx.utils.aoa_to_sheet(empData);
        wsEmp['!cols'] = [
            { wch: 22 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 12 },
            { wch: 14 }, { wch: 25 }, { wch: 22 }, { wch: 10 }, { wch: 14 },
            { wch: 30 }, { wch: 16 }, { wch: 18 },
        ];
        xlsx.utils.book_append_sheet(wb, wsEmp, 'Karyawan');

        // ── Sheet 3: Panduan ─────────────────────────────────────────────────
        const guideData = [
            ['PANDUAN PENGISIAN - TEMPLATE IMPORT DATA SDM'],
            [''],
            ['SHEET 1: Role Matrix'],
            ['Kolom', 'Keterangan', 'Contoh'],
            ['Nama Role', 'Nama role (UPPERCASE, unik)', 'KASIR'],
            ['Level Approval', '1=Staff, 2=Kasir, 3=Manager, 4=Owner', '2'],
            ['Deskripsi', 'Deskripsi singkat role', 'Operator kasir harian'],
            ['Permissions', 'Daftar permission dipisah koma (lihat daftar di bawah)', 'BILLIARD_VIEW,CAFE_VIEW,SHIFT_START'],
            [''],
            ['━━━ DAFTAR SEMUA PERMISSION YANG TERSEDIA ━━━'],
            [''],
            ['[ Dashboard & Analytics ]'],
            ['DASHBOARD_STATS_VIEW', 'Lihat Angka Statistik (Total Rev, Omzet)'],
            ['DASHBOARD_CHART_VIEW', 'Lihat Grafik Pendapatan & Tren'],
            ['DASHBOARD_TABLE', 'Lihat Status Meja di Dashboard'],
            [''],
            ['[ Antrean & Waiting List ]'],
            ['WAITING_LIST_VIEW', 'Lihat Daftar Antrean Side-Bar'],
            ['WAITING_LIST_MANAGE', 'Kelola Antrean (Tambah/Hapus)'],
            [''],
            ['[ Membership & CRM ]'],
            ['MEMBER_VIEW', 'Akses Halaman Data Membership'],
            ['MEMBER_MANAGE', 'Tambah/Edit/Hapus Member'],
            ['MEMBER_TOPUP', 'Fitur Topup Saldo E-Wallet Member'],
            [''],
            ['[ Billing Billiard (Rental Station) ]'],
            ['BILLIARD_VIEW', 'Akses Halaman Billing Billiard (wajib untuk Rental Station muncul di sidebar)'],
            ['BILLIARD_CARD_VIEW', 'Lihat Kartu Meja Billiard'],
            ['BILLIARD_START', 'Buka Sesi Meja (Mulai)'],
            ['BILLIARD_EXTEND', 'Tambah Durasi / Perpanjang Sesi'],
            ['BILLIARD_STOP', 'Stop Sesi (Checkout Sementara)'],
            ['BILLIARD_PAY', 'Proses Bayar (Final)'],
            ['BILLIARD_MOVE', 'Pindah Sesi ke Meja Lain'],
            ['BILLIARD_ORDER', 'Tambah Pesanan F&B ke Meja'],
            ['BILLIARD_CANCEL_ITEM', 'Batalkan Item Pesanan'],
            ['BILLIARD_PREVIEW', 'Lihat Preview Nota Sementara'],
            ['BILLIARD_PRICING', 'Kelola Harga & Tarif Billiard'],
            [''],
            ['[ Cafe POS (Meja Cafe) ]'],
            ['CAFE_VIEW', 'Akses Dashboard Meja Cafe (wajib untuk Meja Cafe muncul di sidebar)'],
            ['CAFE_CARD_VIEW', 'Lihat Kartu Meja Cafe'],
            ['CAFE_START', 'Buka Meja Cafe Baru'],
            ['CAFE_ORDER', 'Input / Tambah Pesanan Cafe'],
            ['CAFE_PAY', 'Proses Pembayaran Cafe'],
            ['CAFE_CANCEL_ITEM', 'Batalkan Item Pesanan Cafe'],
            [''],
            ['[ Order Control & VOID ]'],
            ['PAYMENT_PROCESS', 'Finalisasi Pembayaran'],
            ['ORDER_CANCEL', 'Batalkan Pesanan'],
            ['ORDER_VOID', 'VOID Pesanan (Setelah Proses)'],
            ['ORDER_DISCOUNT', 'Berikan Diskon Item / Bill'],
            [''],
            ['[ Kitchen & Bar (KDS/BDS) ]'],
            ['ACCESS_KDS', 'Masuk Menu KDS (Kitchen) - wajib untuk Kitchen muncul di sidebar'],
            ['ACCESS_BDS', 'Masuk Menu BDS (Bar) - wajib untuk Bartender muncul di sidebar'],
            ['KDS_VIEW', 'Pantau Antrean Kitchen'],
            ['KDS_PROCESS', 'Proses Pesanan Kitchen'],
            ['KDS_SET_READY', 'Selesaikan Pesanan Kitchen'],
            ['BDS_VIEW', 'Pantau Antrean Bar'],
            ['BDS_PROCESS', 'Proses Pesanan Bar'],
            ['BDS_SET_READY', 'Selesaikan Pesanan Bar'],
            [''],
            ['[ Inventory & Stock ]'],
            ['INV_VIEW', 'Lihat Daftar Stok & Inventaris'],
            ['INV_ADD_ITEM', 'Tambah Bahan Baku Baru'],
            ['INV_EDIT_ITEM', 'Edit Detail Bahan Baku'],
            ['INV_DELETE_ITEM', 'Hapus Bahan Baku'],
            ['INV_RECIPE', 'Kelola Formula Resep'],
            ['INV_ADD_MENU', 'Tambah Menu Baru'],
            ['INV_EDIT_MENU', 'Edit Detail Menu'],
            ['INVENTORY_STOCK_IN', 'Penerimaan / Tambah Stok (+)'],
            ['INVENTORY_WASTE', 'Deklarasi Waste / Pembuangan'],
            ['INV_EXPORT', 'Export Data Inventory (Excel)'],
            [''],
            ['[ Keuangan & Laporan ]'],
            ['FIN_REVENUE', 'Lihat Laporan Omzet & Pendapatan'],
            ['FIN_DEBTS', 'Manajemen Hutang / Piutang Bon'],
            ['FIN_EXPENSES_VIEW', 'Lihat Riwayat Pengeluaran'],
            ['FIN_EXPENSES_ADD', 'Input Pengeluaran Baru'],
            ['FIN_LEDGER', 'Akses Buku Besar & Profit'],
            ['BUSINESS_DAY_VIEW', 'Lihat History Business Day'],
            ['BUSINESS_DAY_CLOSE', 'Lakukan Tutup Buku (Close Day)'],
            ['REPORT_EXPORT', 'Ekspor Laporan (Excel/PDF)'],
            [''],
            ['[ SDM & Keamanan ]'],
            ['USER_MANAGE', 'Kelola Akun & Hak Akses'],
            ['USER_ROLE', 'Konfigurasi Role & Matrix'],
            ['USER_MONITOR', 'Monitor Aktivitas (Audit Trail)'],
            ['USER_EXPORT', 'Export Data Karyawan (Excel)'],
            ['AUDIT_VIEW', 'Lihat Audit Log Aktivitas'],
            ['PAYROLL_VIEW', 'Lihat Laporan Gaji & Komisi'],
            ['SHIFT_START', 'Mulai Shift (Buka Kasir)'],
            ['SHIFT_MANAGE', 'Manajemen / Edit Shift'],
            ['APPROVAL_VIEW', 'Akses Halaman Approval Center'],
            ['APPROVAL_ACTION', 'Lakukan Setuju/Tolak Pengajuan'],
            [''],
            ['[ Pengaturan Sistem ]'],
            ['SETTING_TABLES', 'Akses Halaman Manajemen Meja'],
            ['TABLE_CREATE', 'Tambah Meja Baru'],
            ['TABLE_EDIT', 'Edit Konfigurasi Meja'],
            ['TABLE_BULK_CONFIG', 'Akses Fitur Bulk Config & Auto-Generate Meja'],
            ['SETTING_IDENTITY', 'Edit Profil & Identitas Bisnis'],
            ['SETTING_HARDWARE', 'Konfigurasi IoT, IP & Printer'],
            ['SETTING_LAYOUT', 'Desain Layout Ruangan'],
            ['LOCKER_MANAGE', 'Manajemen Locker'],
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
            ['- BILLIARD_VIEW wajib agar menu "Rental Station" muncul di sidebar.'],
            ['- CAFE_VIEW wajib agar menu "Meja Cafe" muncul di sidebar.'],
            ['- Setelah import, karyawan harus Logout & Login ulang agar permissions aktif.'],
        ];
        const wsGuide = xlsx.utils.aoa_to_sheet(guideData);
        wsGuide['!cols'] = [{ wch: 30 }, { wch: 80 }, { wch: 12 }];
        xlsx.utils.book_append_sheet(wb, wsGuide, 'Panduan');

        xlsx.writeFile(wb, 'Template_Import_Karyawan.xlsx');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setErrorMsg('');
            setResult(null);
        }
    };

    const handleSubmit = async () => {
        if (!file) return;
        setIsSubmitting(true);
        setErrorMsg('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post('/users/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setResult(res.data.stats);
            onSuccess();
        } catch (error: any) {
            setErrorMsg(
                error.response?.data?.message ||
                error.message ||
                'Terjadi kesalahan saat import data.',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setResult(null);
        setErrorMsg('');
        onClose();
    };

    const modalContent = (
        <div
            className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={handleReset}
        >
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" />
            <div
                className="relative bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div className="pt-4 pb-4 sm:py-8 px-6 sm:px-8 border-b border-slate-100 flex flex-col bg-indigo-50/50 shrink-0">
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden" />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
                                <FileSpreadsheet className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                    Import Data SDM
                                </h3>
                                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                                    Excel Spreadsheet (.xlsx)
                                </p>
                            </div>
                        </div>
                        <button onClick={handleReset} className="p-2 hover:bg-white rounded-full transition-colors shrink-0">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="p-6 sm:p-8 space-y-5 overflow-y-auto no-scrollbar pb-[calc(1.5rem+env(safe-area-inset-bottom,20px))] sm:pb-8">
                    {!result ? (
                        <>
                            {/* Info */}
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                                <p className="text-xs font-bold text-slate-600 leading-relaxed">
                                    Unduh template Excel untuk memastikan format kolom sesuai standar sistem. File berisi <strong>2 sheet utama</strong>: <em>Role Matrix</em> dan <em>Karyawan</em>, ditambah <em>Panduan</em> lengkap.
                                </p>
                                <div className="flex items-start gap-2 text-[11px] text-indigo-700 font-semibold bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
                                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>
                                        Sistem mendukung <strong>Upsert</strong>. Kolom Password opsional (default = Username jika kosong).
                                    </span>
                                </div>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="w-full py-3 rounded-xl font-black text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Template Excel + Panduan
                                </button>
                            </div>

                            {/* Sheet Preview */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 flex flex-col gap-2">
                                    <ShieldCheck className="w-5 h-5 text-violet-500" />
                                    <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Sheet 1</p>
                                    <p className="text-xs font-bold text-slate-700">Role Matrix</p>
                                    <p className="text-[10px] text-slate-500 leading-snug">Nama Role, Level Approval, Deskripsi, Permissions</p>
                                </div>
                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col gap-2">
                                    <Users className="w-5 h-5 text-emerald-500" />
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Sheet 2</p>
                                    <p className="text-xs font-bold text-slate-700">Karyawan</p>
                                    <p className="text-[10px] text-slate-500 leading-snug">Nama, Username, Role, PIN, RFID, dll</p>
                                </div>
                            </div>

                            {/* File Input */}
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    disabled={isSubmitting}
                                />
                                <div
                                    className={`w-full p-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 transition-all ${file
                                        ? 'border-indigo-500 bg-indigo-50/50'
                                        : 'border-slate-200 bg-slate-50 group-hover:border-indigo-300 group-hover:bg-indigo-50/30'
                                        }`}
                                >
                                    {file ? (
                                        <>
                                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-2">
                                                <FileSpreadsheet className="w-6 h-6" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-slate-700 truncate max-w-[200px] sm:max-w-[250px]">
                                                    {file.name}
                                                </p>
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">
                                                    Siap di-import
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-14 h-14 bg-white text-slate-400 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:text-indigo-500 transition-all">
                                                <UploadCloud className="w-6 h-6" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-slate-700">Pilih atau Tarik File Excel</p>
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">
                                                    .xlsx atau .xls
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {errorMsg && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 text-rose-600 items-start">
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <p className="text-xs font-bold leading-relaxed">{errorMsg}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleReset}
                                    className="px-6 py-3.5 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors text-xs uppercase tracking-widest"
                                    disabled={isSubmitting}
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!file || isSubmitting}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black py-3.5 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200/50 text-xs uppercase tracking-widest"
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <UploadCloud className="w-4 h-4" />
                                            Mulai Import
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="py-8 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-2xl font-black text-slate-900">Import Selesai!</h4>
                                <p className="text-sm font-bold text-slate-500">Data SDM berhasil dimasukkan ke dalam sistem.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full mb-2 text-left">
                                <div className="bg-violet-50 p-4 rounded-2xl border border-violet-100">
                                    <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-1">Role Diupdate</p>
                                    <p className="text-3xl font-black text-slate-700">
                                        {result.roles}
                                        <span className="text-xs font-bold text-slate-400 ml-1">Role</span>
                                    </p>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Karyawan</p>
                                    <p className="text-3xl font-black text-slate-700">
                                        {result.employees}
                                        <span className="text-xs font-bold text-slate-400 ml-1">Orang</span>
                                    </p>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-left w-full flex items-start gap-3">
                                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-amber-700 font-semibold leading-relaxed">
                                    Data karyawan berhasil disinkronisasi. Pastikan untuk mengingatkan karyawan baru mengubah password mereka setelah login pertama.
                                </p>
                            </div>

                            <button
                                onClick={handleReset}
                                className="w-full py-4 rounded-2xl font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95 uppercase tracking-widest text-xs"
                            >
                                Tutup & Refresh Data
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return mounted ? createPortal(modalContent, document.body) : null;
}

