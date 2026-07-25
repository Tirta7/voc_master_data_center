'use client';

import React, { useState } from 'react';
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

    if (!isOpen) return null;

    // ── Template Generator ────────────────────────────────────────────────────
    const handleDownloadTemplate = () => {
        const wb = xlsx.utils.book_new();

        // ── Sheet 1: Role Matrix ───────────────────────────────────────────────
        const roleData = [
            ['Nama Role', 'Level Approval', 'Deskripsi', 'Permissions'],
            [
                'SUPER_ADMIN', 4, 'Akses penuh ke seluruh sistem',
                'DASHBOARD_TABLE,START_TABLE,END_TABLE,USER_MANAGE,USER_ROLE,INVENTORY_VIEW,INV_ADD_ITEM,INVENTORY_WASTE,TRANSACTION_VIEW,FINANCE_VIEW,REPORT_VIEW,AUDIT_TRAIL'
            ],
            [
                'MANAGER', 3, 'Manajer operasional harian',
                'DASHBOARD_TABLE,START_TABLE,END_TABLE,INVENTORY_VIEW,TRANSACTION_VIEW,FINANCE_VIEW,REPORT_VIEW'
            ],
            [
                'KASIR', 2, 'Kasir & operator transaksi',
                'DASHBOARD_TABLE,START_TABLE,END_TABLE,TRANSACTION_VIEW'
            ],
            [
                'WAITER', 1, 'Pelayan & order cafe',
                'DASHBOARD_TABLE,CAFE_ORDER'
            ],
            [
                'SECURITY', 1, 'Keamanan & monitoring',
                'DASHBOARD_TABLE'
            ],
        ];
        const wsRole = xlsx.utils.aoa_to_sheet(roleData);
        wsRole['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 35 }, { wch: 90 }];
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

    return (
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
                                <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 flex flex-col gap-2">
                                    <Users className="w-5 h-5 text-sky-500" />
                                    <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Sheet 2</p>
                                    <p className="text-xs font-bold text-slate-700">Data Karyawan</p>
                                    <p className="text-[10px] text-slate-500 leading-snug">Nama, Username, Role, PIN, RFID, Shift, dll.</p>
                                </div>
                            </div>

                            {/* Upload */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                    Pilih File Excel (.xlsx)
                                </label>
                                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${file ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}>
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <UploadCloud className={`w-8 h-8 mb-3 ${file ? 'text-indigo-500' : 'text-slate-400'}`} />
                                        <p className="text-sm font-bold text-slate-600">
                                            {file ? file.name : 'Klik untuk memilih file'}
                                        </p>
                                        {!file && (
                                            <p className="text-[10px] text-slate-400 mt-1">Mendukung .xlsx dan .xls</p>
                                        )}
                                    </div>
                                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
                                </label>
                            </div>

                            {/* Error */}
                            {errorMsg && (
                                <div className="bg-rose-50 rounded-xl p-4 border border-rose-100 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                    <p className="text-xs font-bold text-rose-700">{errorMsg}</p>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                onClick={handleSubmit}
                                disabled={!file || isSubmitting}
                                className="w-full py-4 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 uppercase tracking-widest text-xs flex items-center justify-center gap-3"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Memproses Data...
                                    </>
                                ) : (
                                    'Mulai Import'
                                )}
                            </button>
                        </>
                    ) : (
                        /* ── Success State ── */
                        <div className="text-center py-6">
                            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2">Import Selesai!</h3>
                            <p className="text-sm font-bold text-slate-500 mb-8">
                                Data SDM berhasil dimasukkan ke dalam sistem.
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-6 text-left">
                                <div className="bg-violet-50 p-4 rounded-2xl border border-violet-100">
                                    <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-1">Role Matrix</p>
                                    <p className="text-3xl font-black text-slate-700">
                                        {result.roles}
                                        <span className="text-xs font-bold text-slate-400 ml-1">Role</span>
                                    </p>
                                </div>
                                <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100">
                                    <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-1">Karyawan</p>
                                    <p className="text-3xl font-black text-slate-700">
                                        {result.employees}
                                        <span className="text-xs font-bold text-slate-400 ml-1">Orang</span>
                                    </p>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-left mb-6 flex items-start gap-3">
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
}

