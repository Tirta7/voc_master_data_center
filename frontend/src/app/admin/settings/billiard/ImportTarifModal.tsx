'use client';

import React, { useState, useEffect } from 'react';
import { UploadCloud, X, Download, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';
import * as xlsx from 'xlsx';

interface ImportTarifModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ImportTarifModal({ isOpen, onClose, onSuccess }: ImportTarifModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [result, setResult] = useState<{ created: number; updated: number } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [categories, setCategories] = useState<{ name: string; assetType: string }[]>([]);
    const [loadingCats, setLoadingCats] = useState(false);

    // Fetch available categories when modal is opened
    useEffect(() => {
        if (!isOpen) return;
        setLoadingCats(true);
        axios.get('/categories')
            .then(res => {
                const cats = (res.data || []).filter((c: any) =>
                    c.isActive && (c.assetType === 'BILLIARD' || c.assetType === 'PLAYSTATION')
                );
                setCategories(cats.map((c: any) => ({ name: c.name, assetType: c.assetType })));
            })
            .catch(() => setCategories([]))
            .finally(() => setLoadingCats(false));
    }, [isOpen]);

    if (!isOpen) return null;

    const handleDownloadTemplate = async () => {
        setIsDownloading(true);
        try {
            const wb = xlsx.utils.book_new();

            // --- Sheet 1: Paket Tarif ---
            // Use real categories if available, else use example data
            const catNames = categories.length > 0
                ? categories.map(c => c.name)
                : ['REGULAR', 'VIP'];
            const firstCat = catNames[0] || 'REGULAR';
            const secondCat = catNames[1] || 'VIP';

            const paketData: any[][] = [
                ['nama', 'tipe', 'kategori_meja', 'durasi_menit', 'harga', 'hari_berlaku'],
                ['1 Jam', 'DURATION', firstCat, 60, 20000, 'MON,TUE,WED,THU,FRI'],
                ['2 Jam', 'DURATION', firstCat, 120, 35000, ''],
                ['3 Jam', 'DURATION', firstCat, 180, 50000, ''],
                ['Open Table', 'PLAYTIME', firstCat, '', 15000, ''],
                ...(secondCat !== firstCat ? [
                    ['1 Jam ' + secondCat, 'DURATION', secondCat, 60, 30000, ''],
                    ['Open Table ' + secondCat, 'PLAYTIME', secondCat, '', 20000, ''],
                ] : []),
            ];
            const wsPaket = xlsx.utils.aoa_to_sheet(paketData);
            wsPaket['!cols'] = [
                { wch: 25 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 35 }
            ];
            xlsx.utils.book_append_sheet(wb, wsPaket, 'Paket Tarif');

            // --- Sheet 2: Happy Hour Slots ---
            const slotData = [
                ['nama_paket', 'jam_mulai', 'jam_selesai', 'harga', 'hari_berlaku'],
                ['Open Table', '10:00', '17:00', 15000, 'MON,TUE,WED,THU,FRI'],
                ['Open Table', '17:00', '02:00', 20000, ''],
                ['Open Table', '02:00', '10:00', 25000, 'SAT,SUN'],
            ];
            const wsSlot = xlsx.utils.aoa_to_sheet(slotData);
            wsSlot['!cols'] = [
                { wch: 25 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 35 }
            ];
            xlsx.utils.book_append_sheet(wb, wsSlot, 'Happy Hour Slots');

            // --- Sheet 3: Daftar Kategori (diambil dari sistem) ---
            const catSheetData: any[][] = [
                ['DAFTAR KATEGORI MEJA AKTIF DI SISTEM'],
                ['(Gunakan nama persis sama di kolom kategori_meja pada Sheet "Paket Tarif")'],
                [''],
                ['Nama Kategori', 'Tipe Aset'],
            ];
            if (categories.length > 0) {
                categories.forEach(c => {
                    catSheetData.push([c.name, c.assetType]);
                });
            } else {
                catSheetData.push(['REGULAR', 'BILLIARD']);
                catSheetData.push(['VIP', 'BILLIARD']);
                catSheetData.push(['(Tidak dapat mengambil data — isi manual)', '']);
            }
            const wsCat = xlsx.utils.aoa_to_sheet(catSheetData);
            wsCat['!cols'] = [{ wch: 30 }, { wch: 20 }];
            xlsx.utils.book_append_sheet(wb, wsCat, 'Kategori Aktif');

            // --- Sheet 4: Panduan ---
            const panduanData: any[][] = [
                ['PANDUAN IMPORT TARIF RENTAL BILLIARD'],
                [''],
                ['LANGKAH-LANGKAH:'],
                ['1. Lihat sheet "Kategori Aktif" untuk mengetahui nama kategori yang tersedia di sistem.'],
                ['2. Isi sheet "Paket Tarif" dengan menggunakan nama kategori yang sama persis.'],
                ['3. Isi sheet "Happy Hour Slots" jika paket memiliki harga berbeda per jam.'],
                ['4. Upload file ini kembali melalui tombol "Import dari Excel".'],
                [''],
                ['=== Sheet "Paket Tarif" ==='],
                ['Kolom', 'Keterangan', 'Nilai Valid'],
                ['nama', 'Nama paket tarif (wajib)', 'Teks bebas, contoh: "1 Jam", "Open Table"'],
                ['tipe', 'Tipe paket (wajib)', 'DURATION (durasi tetap) atau PLAYTIME (terbuka/per jam)'],
                ['kategori_meja', 'Nama kategori (wajib — lihat sheet Kategori Aktif)', 'Harus SAMA PERSIS dengan nama di sistem'],
                ['durasi_menit', 'Durasi (khusus DURATION)', 'Angka bulat, kosongkan jika tipe PLAYTIME'],
                ['harga', 'Harga dasar dalam Rupiah (wajib)', 'Angka bulat tanpa titik/koma'],
                ['hari_berlaku', 'Hari aktif (kosong = setiap hari)', 'MON,TUE,WED,THU,FRI,SAT,SUN dipisah koma'],
                [''],
                ['=== Sheet "Happy Hour Slots" ==='],
                ['Kolom', 'Keterangan', 'Nilai Valid'],
                ['nama_paket', 'Nama paket (harus sama persis dengan Sheet Paket Tarif)', 'Harus cocok persis'],
                ['jam_mulai', 'Jam mulai slot', 'Format HH:MM, contoh: 10:00'],
                ['jam_selesai', 'Jam selesai (boleh melewati tengah malam)', 'Format HH:MM, contoh: 02:00'],
                ['harga', 'Harga untuk slot waktu ini', 'Angka bulat dalam Rupiah'],
                ['hari_berlaku', 'Hari slot aktif (kosong = setiap hari)', 'MON,TUE,WED,THU,FRI,SAT,SUN dipisah koma'],
                [''],
                ['=== CATATAN PENTING ==='],
                ['1. Sistem bersifat UPSERT — paket yang sama (nama + kategori + tipe) akan diperbarui otomatis.'],
                ['2. Jika ada kategori baru, buat dulu di menu "Master Kategori", lalu download ulang template ini.'],
                ['3. Nama di "Happy Hour Slots" harus SAMA PERSIS dengan nama di "Paket Tarif".'],
                ['4. Kolom hari_berlaku kosong = berlaku setiap hari tanpa batasan.'],
                ['5. (PENTING) Aturan Hierarki Hari Berlaku (Paket vs Slot):'],
                ['   - Jika "hari_berlaku" Paket diisi (misal SAT,SUN), maka Paket tsb HANYA MUNCUL di hari Sabtu & Minggu.'],
                ['   - Meskipun Slot di dalamnya Bapak isi MON,TUE, slot tsb tidak akan berguna karena pintu utamanya (Paket) sudah tertutup.'],
                ['   - REKOMENDASI FLEKSIBEL: Kosongkan "hari_berlaku" Paket (agar paket selalu muncul setiap hari),'],
                ['     Lalu cukup isi "hari_berlaku" di level Slot untuk varian harga spesifik (misal Happy Hour khusus Weekend).'],
            ];
            const wsPanduan = xlsx.utils.aoa_to_sheet(panduanData);
            wsPanduan['!cols'] = [{ wch: 30 }, { wch: 55 }, { wch: 55 }];
            xlsx.utils.book_append_sheet(wb, wsPanduan, 'Panduan');

            xlsx.writeFile(wb, 'Template_Import_Tarif_Rental.xlsx');
        } finally {
            setIsDownloading(false);
        }
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
            const res = await axios.post('/billiard/packages/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(res.data);
            onSuccess();
        } catch (error: any) {
            setErrorMsg(error.response?.data?.message || error.message || 'Terjadi kesalahan saat import data.');
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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 pt-14 sm:pt-4 pb-safe">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={handleReset} />
            <div className="relative bg-white flex flex-col rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Header (Sticky untuk mobile scroll) */}
                <div className="p-6 sm:p-8 border-b border-slate-50 flex items-center justify-between bg-indigo-50/50 shrink-0 rounded-t-[2rem] sm:rounded-t-[2.5rem]">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Import Tarif Rental</h3>
                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Excel Spreadsheet (.xlsx)</p>
                        </div>
                    </div>
                    <button onClick={handleReset} className="p-2 hover:bg-white rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
                {/* Content Area dengan scroll mandiri */}
                <div className="p-6 sm:p-8 space-y-4 sm:space-y-5 overflow-y-auto no-scrollbar">
                    {!result ? (
                        <>
                            {/* Kategori Aktif Box */}
                            <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                        📋 Kategori Aktif di Sistem
                                    </p>
                                    {loadingCats && <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />}
                                </div>
                                {loadingCats ? (
                                    <p className="text-xs text-indigo-400 font-bold">Memuat kategori...</p>
                                ) : categories.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map((cat) => (
                                            <span
                                                key={cat.name}
                                                className="px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-[10px] font-black text-indigo-700 shadow-sm"
                                            >
                                                {cat.name}
                                                <span className="ml-1.5 text-indigo-300 font-bold">{cat.assetType}</span>
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-indigo-400 font-bold">Tidak ada kategori ditemukan.</p>
                                )}
                                <p className="text-[9px] font-bold text-indigo-400 mt-3 leading-relaxed">
                                    ⚠️ Nama di kolom <code className="bg-indigo-100 px-1 rounded">kategori_meja</code> harus <strong>sama persis</strong> dengan nama di atas. Jika ada kategori baru, buat dulu di <strong>Master Kategori</strong>, lalu download ulang template.
                                </p>
                            </div>

                            {/* Info Template */}
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                <p className="text-xs font-bold text-slate-600 mb-4 leading-relaxed">
                                    Template Excel sudah otomatis terisi nama kategori dari sistem. Tinggal isi data paket tarif Bapak.
                                </p>
                                <button
                                    onClick={handleDownloadTemplate}
                                    disabled={isDownloading}
                                    className="w-full py-3 rounded-xl font-black text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {isDownloading
                                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Menyiapkan...</>
                                        : <><Download className="w-4 h-4" /> Download Template Excel</>
                                    }
                                </button>
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pilih File Excel (.xlsx)</label>
                                <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${file ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}>
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <UploadCloud className={`w-7 h-7 mb-2 ${file ? 'text-indigo-500' : 'text-slate-400'}`} />
                                        <p className="text-sm font-bold text-slate-600">
                                            {file ? file.name : 'Klik untuk memilih file'}
                                        </p>
                                        {!file && <p className="text-xs text-slate-400 mt-1">Format: .xlsx atau .xls</p>}
                                    </div>
                                    <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileChange} />
                                </label>
                            </div>

                            {errorMsg && (
                                <div className="bg-rose-50 rounded-xl p-4 border border-rose-100 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                    <p className="text-xs font-bold text-rose-700">{errorMsg}</p>
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={!file || isSubmitting}
                                className="w-full py-3.5 sm:py-4 mt-2 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 uppercase tracking-widest text-xs flex items-center justify-center gap-3 shrink-0 sticky bottom-0"
                            >
                                {isSubmitting ? 'Memproses Data...' : 'Mulai Import'}
                            </button>
                        </>
                    ) : (
                        <div className="text-center py-6">
                            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2">Import Selesai!</h3>
                            <p className="text-sm font-bold text-slate-500 mb-8">Data tarif berhasil dimasukkan ke dalam sistem.</p>

                            <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Paket Baru</p>
                                    <p className="text-xl font-black text-indigo-700">{result.created} <span className="text-xs font-bold text-indigo-400 ml-1">Paket</span></p>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Diperbarui</p>
                                    <p className="text-xl font-black text-amber-600">{result.updated} <span className="text-xs font-bold text-amber-400 ml-1">Paket</span></p>
                                </div>
                            </div>

                            <button
                                onClick={handleReset}
                                className="w-full py-4 rounded-2xl font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95 uppercase tracking-widest text-xs"
                            >
                                Tutup & Refresh
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
