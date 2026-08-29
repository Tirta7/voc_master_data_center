'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import { Plus, Edit, Trash2, Box, Check, X, ShieldAlert, Monitor, AlignLeft, Target } from 'lucide-react';

export default function CategoryMasterPage() {
    const { user, hasPermission } = useAuth();
    const { showToast } = useToast();
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        assetType: 'BILLIARD',
        isActive: true,
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setIsLoading(true);
            const res = await axios.get('/categories');
            setCategories(res.data);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
            showToast('Gagal', 'Tidak dapat memuat data kategori', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (category?: any) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                description: category.description || '',
                assetType: category.assetType || 'BILLIARD',
                isActive: category.isActive,
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: '',
                description: '',
                assetType: 'BILLIARD',
                isActive: true,
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            showToast('Peringatan', 'Nama kategori wajib diisi.', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            if (editingCategory) {
                await axios.patch(`/categories/${editingCategory.id}`, formData);
                showToast('Sukses', 'Kategori berhasil diperbarui', 'success');
            } else {
                await axios.post('/categories', formData);
                showToast('Sukses', 'Kategori baru berhasil ditambahkan', 'success');
            }
            handleCloseModal();
            fetchCategories();
        } catch (err: any) {
            console.error(err);
            showToast('Gagal', err.response?.data?.message || 'Gagal menyimpan kategori', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus kategori "${name}"?\nAksi ini bisa berdampak pada data yang berelasi dengannya.`)) return;

        try {
            await axios.delete(`/categories/${id}`);
            showToast('Sukses', 'Kategori dihapus', 'success');
            fetchCategories();
        } catch (err: any) {
            console.error(err);
            showToast('Gagal', err.response?.data?.message || 'Gagal menghapus kategori', 'error');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 lg:p-12 text-slate-900">
            {/* Header Section */}
            <header className="mb-12 max-w-7xl mx-auto">
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 rounded-3xl p-8 lg:p-12 text-white shadow-xl shadow-indigo-200">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-white/20  rounded-2xl flex items-center justify-center">
                                    <Box className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Master Data</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-2">Kategori Aset</h1>
                            <p className="text-white/60 text-sm font-semibold max-w-xl">
                                Kelola hierarki dan grup utama dari aset operasional Anda (Billiard, Playstation, Loker). 
                                Kategori ini akan menentukan warna, perilaku harga, dan pengelompokkan meja.
                            </p>
                        </div>

                        {hasPermission('SETTING_TABLES') && (
                            <button
                                onClick={() => handleOpenModal()}
                                className="group flex items-center justify-center gap-3 px-6 py-4 bg-white text-indigo-900 rounded-2xl font-black transition-all hover:shadow-lg hover:shadow-white/20 active:scale-95"
                            >
                                <div className="p-1.5 bg-indigo-100 rounded-lg group-hover:scale-110 transition-transform">
                                    <Plus className="w-4 h-4 text-indigo-600" />
                                </div>
                                TAMBAH KATEGORI
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Content Section */}
            <div className="max-w-7xl mx-auto">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-48 bg-white rounded-3xl border border-slate-100 shadow-sm animate-pulse"></div>
                    ))}
                </div>
            ) : categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                        <Box className="w-8 h-8 text-indigo-300" />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 mb-2">Belum ada Kategori</h2>
                    <p className="text-slate-500 text-sm mb-6 text-center max-w-md">Tambahkan kategori meja atau perangkat pertama Anda untuk mengatur tarif secara dinamis.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {categories.map((cat) => {
                        const isVip = cat.name.toLowerCase().includes('vip');
                        const color = isVip ? 'purple' : 'indigo';
                        const theme = {
                            bg: isVip ? 'bg-purple-50' : 'bg-indigo-50',
                            text: isVip ? 'text-purple-700' : 'text-indigo-700',
                            border: isVip ? 'border-purple-200' : 'border-indigo-200',
                            dot: isVip ? 'bg-purple-500' : 'bg-indigo-500',
                            shadow: isVip ? 'shadow-purple-500/20' : 'shadow-indigo-500/20',
                        };

                        return (
                            <div key={cat.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden">
                                <div className={`absolute top-0 left-0 w-1.5 h-full ${theme.bg} opacity-50 group-hover:opacity-100 transition-opacity`}></div>
                                
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-2xl ${theme.bg} flex items-center justify-center border border-white shadow-inner`}>
                                            <Box className={`w-5 h-5 ${theme.text}`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`w-2 h-2 rounded-full ${theme.dot} ${cat.isActive ? 'animate-pulse shadow-lg ' + theme.shadow : 'bg-slate-300'}`}></div>
                                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{cat.name}</h3>
                                            </div>
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg uppercase tracking-widest">{cat.assetType}</span>
                                        </div>
                                    </div>

                                    {hasPermission('SETTING_TABLES') && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenModal(cat)} className="p-2 hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 rounded-xl transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(cat.id, cat.name)} className="p-2 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-xl transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <div className="flex items-start gap-2">
                                        <AlignLeft className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                        <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                                            {cat.description || <span className="text-slate-400 italic">Tidak ada deskripsi.</span>}
                                        </p>
                                    </div>
                                </div>

                                {!cat.isActive && (
                                    <div className="mt-4 flex items-center justify-center gap-2 py-2 bg-slate-100 rounded-xl">
                                        <ShieldAlert className="w-3 h-3 text-slate-500" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nonaktif</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-[200]  flex items-center justify-center p-4 lg:p-0 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 lg:p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                                        {editingCategory ? 'Edit Kategori' : 'Kategori Baru'}
                                    </h2>
                                    <p className="text-sm font-bold text-slate-500">Konfigurasi master data aset.</p>
                                </div>
                                <button onClick={handleCloseModal} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-6">
                                {/* Name Input */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                                        Nama Kategori <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: VVIP, PLATINUM"
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl outline-none font-bold text-slate-700 transition-all uppercase placeholder:normal-case"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                                    />
                                </div>

                                {/* Asset Type Selector */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Tipe Aset</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { value: 'BILLIARD', label: 'Billiard', icon: Target },
                                            { value: 'PLAYSTATION', label: 'Console', icon: Monitor },
                                            { value: 'LOCKER', label: 'Loker', icon: Box }
                                        ].map(type => (
                                            <button
                                                key={type.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, assetType: type.value })}
                                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5
                                                    ${formData.assetType === type.value 
                                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                                        : 'border-slate-100 bg-white text-slate-400 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <type.icon className="w-5 h-5" />
                                                <span className="text-[10px] font-black uppercase tracking-wider">{type.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Description Input */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Deskripsi (Opsional)</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Jelaskan spesifikasi atau fitur dari kategori ini..."
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl outline-none font-bold text-slate-700 transition-all resize-none"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                {/* Status Toggle */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-700">Status Aktif</h4>
                                        <p className="text-[10px] font-bold text-slate-400">Kategori nonaktif tidak akan muncul di opsi Meja.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                        className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${formData.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full absolute transition-all ${formData.isActive ? 'right-1' : 'left-1'}`}></div>
                                    </button>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-xs transition-colors"
                                    >
                                        BATAL
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-indigo-200"
                                    >
                                        {isSaving ? (
                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                        ) : (
                                            <Check className="w-4 h-4" />
                                        )}
                                        {editingCategory ? 'SIMPAN PERUBAHAN' : 'TAMBAHKAN'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
