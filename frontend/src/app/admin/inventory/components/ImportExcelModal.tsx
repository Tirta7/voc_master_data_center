'use client';

import React, { useState } from 'react';
import { UploadCloud, X, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import * as xlsx from 'xlsx';

interface ImportExcelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ImportExcelModal({ isOpen, onClose, onSuccess }: ImportExcelModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<{ categories: number; ingredients: number; menuItems: number; recipes: number } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string>('');

    if (!isOpen) return null;

    const handleDownloadTemplate = () => {
        const wb = xlsx.utils.book_new();
        
        // Sheet 1: Kategori
        const catData = [
            ['Nama Kategori', 'Tipe', 'Target Produksi'],
            ['MAKANAN', 'MENU', 'KDS'],
            ['MINUMAN', 'MENU', 'BDS'],
            ['BAHAN DASAR', 'INGREDIENT', 'NONE']
        ];
        const wsCat = xlsx.utils.aoa_to_sheet(catData);
        xlsx.utils.book_append_sheet(wb, wsCat, 'Kategori');

        // Sheet 2: Bahan
        const ingData = [
            ['Nama Bahan', 'SKU', 'Kategori', 'Satuan', 'Harga Beli', 'Stok Awal', 'Min Stok', 'Departemen'],
            ['Kopi Bubuk Robusta', 'IG-001', 'BAHAN DASAR', 'Gram', 150, 1000, 200, 'BAR'],
            ['Gula Pasir', 'IG-002', 'BAHAN DASAR', 'Gram', 20, 5000, 1000, 'BAR'],
            ['Air Mineral Galon', 'IG-003', 'BAHAN DASAR', 'Ml', 5, 19000, 5000, 'BAR']
        ];
        const wsIng = xlsx.utils.aoa_to_sheet(ingData);
        xlsx.utils.book_append_sheet(wb, wsIng, 'Bahan Baku');

        // Sheet 3: Menu & Resep
        const menuData = [
            ['Nama Menu', 'SKU', 'Kategori', 'Harga Jual', 'Departemen', 'Resep Baku'],
            ['Kopi Hitam Panas', 'MN-001', 'MINUMAN', 15000, 'BAR', 'Kopi Bubuk Robusta: 15, Gula Pasir: 20, Air Mineral Galon: 200']
        ];
        const wsMenu = xlsx.utils.aoa_to_sheet(menuData);
        xlsx.utils.book_append_sheet(wb, wsMenu, 'Menu dan Resep');

        xlsx.writeFile(wb, 'Template_Import_Inventory.xlsx');
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
            const res = await axios.post('/inventory/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(res.data.stats);
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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={handleReset} />
            <div className="relative bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-emerald-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Import Data</h3>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Excel Spreadsheet (.xlsx)</p>
                        </div>
                    </div>
                    <button onClick={handleReset} className="p-2 hover:bg-white rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {!result ? (
                        <>
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                <p className="text-xs font-bold text-slate-600 mb-4 leading-relaxed">
                                    Unduh template Excel untuk memastikan format baris dan kolom sesuai standar sistem. Sistem mendukung Upsert (Otomatis menimpa/memperbarui jika data sudah ada).
                                </p>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="w-full py-3 rounded-xl font-black text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Template Excel
                                </button>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pilih File Excel (.xlsx)</label>
                                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${file ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}>
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <UploadCloud className={`w-8 h-8 mb-3 ${file ? 'text-emerald-500' : 'text-slate-400'}`} />
                                        <p className="text-sm font-bold text-slate-600">
                                            {file ? file.name : 'Klik untuk memilih file'}
                                        </p>
                                    </div>
                                    <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
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
                                className="w-full py-4 rounded-2xl font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 uppercase tracking-widest text-xs flex items-center justify-center gap-3"
                            >
                                {isSubmitting ? 'Memproses Data...' : 'Mulai Import'}
                            </button>
                        </>
                    ) : (
                        <div className="text-center py-6">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2">Import Selesai!</h3>
                            <p className="text-sm font-bold text-slate-500 mb-8">Data berhasil dimasukkan ke dalam database.</p>
                            
                            <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kategori</p>
                                    <p className="text-xl font-black text-slate-700">{result.categories} <span className="text-xs font-bold text-slate-400 ml-1">Data</span></p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bahan Baku</p>
                                    <p className="text-xl font-black text-slate-700">{result.ingredients} <span className="text-xs font-bold text-slate-400 ml-1">Data</span></p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Menu Jual</p>
                                    <p className="text-xl font-black text-slate-700">{result.menuItems} <span className="text-xs font-bold text-slate-400 ml-1">Data</span></p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Relasi Resep</p>
                                    <p className="text-xl font-black text-slate-700">{result.recipes} <span className="text-xs font-bold text-slate-400 ml-1">Data</span></p>
                                </div>
                            </div>

                            <button
                                onClick={handleReset}
                                className="w-full py-4 rounded-2xl font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95 uppercase tracking-widest text-xs"
                            >
                                Tutup & Refresh Halaman
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
