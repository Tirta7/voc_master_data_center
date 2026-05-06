import React, { useState } from 'react';
import { User, Phone, MapPin, Plus, Edit2, Trash2, ShieldCheck, Mail, Star, X, Tag } from 'lucide-react';
import axios from 'axios';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/fetcher';
import InputField from '@/components/ui/InputField';

export function SuppliersView() {
    const { data: suppliers, isLoading } = useSWR<any[]>('/inventory/suppliers', fetcher);
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any>(null);
    const [newSupplier, setNewSupplier] = useState({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        category: '',
        description: ''
    });

    const openEdit = (s: any) => {
        setEditingSupplier(s);
        setNewSupplier({
            name: s.name,
            contactPerson: s.contactPerson || '',
            phone: s.phone || '',
            email: s.email || '',
            address: s.address || '',
            category: s.category || '',
            description: s.description || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingSupplier) {
                await axios.patch(`/inventory/suppliers/${editingSupplier.id}`, newSupplier);
                alert('Supplier berhasil diperbarui!');
            } else {
                await axios.post('/inventory/suppliers', newSupplier);
                alert('Supplier berhasil ditambahkan!');
            }
            setShowModal(false);
            setEditingSupplier(null);
            setNewSupplier({ name: '', contactPerson: '', phone: '', email: '', address: '', category: '', description: '' });
            mutate('/inventory/suppliers');
        } catch (error) {
            alert(editingSupplier ? 'Gagal update supplier' : 'Gagal menambah supplier');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus supplier ini?')) return;
        try {
            await axios.delete(`/inventory/suppliers/${id}`);
            mutate('/inventory/suppliers');
        } catch (error) {
            alert('Gagal menghapus supplier');
        }
    };

    if (isLoading) return <div className="p-10 text-center font-bold text-slate-400 animate-pulse uppercase tracking-widest">Memuat database pemasok...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none mb-2">Pemasok & Vendor</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Kelola database supplier bahan baku Anda</p>
                </div>
                <button 
                    onClick={() => {
                        setEditingSupplier(null);
                        setNewSupplier({ name: '', contactPerson: '', phone: '', email: '', address: '', category: '', description: '' });
                        setShowModal(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-3"
                >
                    <Plus className="w-5 h-5" /> Tambah Supplier
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(suppliers || []).map((s) => (
                    <div key={s.id} className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                        
                        <div className="relative">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform">
                                    <User className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">{s.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`w-3 h-3 ${i < Math.floor(s.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                                            ))}
                                        </div>
                                        {s.category && (
                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded text-[8px] font-black uppercase tracking-widest">{s.category}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-3 text-slate-500">
                                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider">{s.contactPerson || 'No Contact Person'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-500">
                                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold">{s.phone || '-'}</span>
                                </div>
                                <div className="flex items-start gap-3 text-slate-500">
                                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">
                                        <MapPin className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-medium leading-relaxed">{s.address || 'Alamat belum diatur'}</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => openEdit(s)}
                                    className="flex-1 h-12 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                >
                                    Edit Detail
                                </button>
                                <button 
                                    onClick={() => handleDelete(s.id)}
                                    className="w-12 h-12 bg-white text-rose-300 border border-slate-100 hover:bg-rose-600 hover:text-white hover:border-rose-600 rounded-xl flex items-center justify-center transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {suppliers?.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                        <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-slate-200 border border-slate-100">
                            <Plus className="w-12 h-12" />
                        </div>
                        <p className="font-black text-slate-300 uppercase tracking-widest">Belum ada supplier terdaftar</p>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-700" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col max-h-[90vh]">
                        <div className="p-8 lg:p-10 border-b border-slate-50 flex justify-between items-center bg-white shrink-0">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">
                                    {editingSupplier ? 'Update Database Supplier' : 'Registrasi Supplier Baru'}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lengkapi profil vendor untuk database inventaris</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-3 bg-slate-50 text-slate-300 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100">
                                <X size={20} />
                            </button>
                        </div>

                        <form id="supplier-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-10 space-y-8 bg-slate-50/30">
                            {/* Section: Identitas Utama */}
                            <div className="p-7 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                                <label className="flex items-center gap-2 text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2 ml-1">
                                    <ShieldCheck size={12} />
                                    Profil Perusahaan
                                </label>
                                <InputField 
                                    label="Nama Perusahaan / Nama Vendor" 
                                    value={newSupplier.name} 
                                    onChange={(v) => setNewSupplier({...newSupplier, name: v})}
                                    required 
                                    placeholder="Contoh: CV. Sumber Makmur"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField 
                                        label="Kategori Pemasok" 
                                        value={newSupplier.category} 
                                        onChange={(v) => setNewSupplier({...newSupplier, category: v})}
                                        placeholder="Contoh: ROKOK, SAYURAN..."
                                        suffix={<Tag size={12} className="text-slate-300" />}
                                    />
                                    <InputField 
                                        label="No. Telepon / WhatsApp" 
                                        value={newSupplier.phone} 
                                        onChange={(v) => setNewSupplier({...newSupplier, phone: v})}
                                        placeholder="0812xxxx"
                                    />
                                </div>
                                <InputField 
                                    label="Contact Person (Nama)" 
                                    value={newSupplier.contactPerson} 
                                    onChange={(v) => setNewSupplier({...newSupplier, contactPerson: v})}
                                    placeholder="Nama PIC"
                                />
                            </div>

                            {/* Section: Kontak & Lokasi */}
                            <div className="p-7 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                                <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
                                    <Mail size={12} className="text-slate-400" />
                                    Detail Kontak & Lokasi
                                </label>
                                <InputField 
                                    label="Alamat Email (Opsional)" 
                                    type="email"
                                    value={newSupplier.email} 
                                    onChange={(v) => setNewSupplier({...newSupplier, email: v})}
                                    placeholder="vendor@email.com"
                                />
                                <InputField 
                                    label="Alamat Lengkap Kantor/Gudang" 
                                    type="textarea" 
                                    value={newSupplier.address} 
                                    onChange={(v) => setNewSupplier({...newSupplier, address: v})}
                                    rows={3}
                                    placeholder="Masukkan alamat lengkap untuk keperluan pengiriman..."
                                />
                            </div>

                            {/* Section: Catatan Internal */}
                            <div className="p-7 bg-indigo-50/30 rounded-[2rem] border-2 border-dashed border-indigo-100/50 space-y-4">
                                <label className="flex items-center gap-2 text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 ml-1">
                                    <Star size={12} />
                                    Catatan Internal / Deskripsi
                                </label>
                                <textarea
                                    className="w-full bg-white/50 border border-transparent focus:border-indigo-200 rounded-2xl p-4 text-sm font-medium text-slate-600 outline-none resize-none transition-all"
                                    rows={2}
                                    placeholder="Tulis catatan khusus mengenai supplier ini (misal: Tempo maksimal 1 bulan)..."
                                    value={newSupplier.description}
                                    onChange={(e) => setNewSupplier({...newSupplier, description: e.target.value})}
                                />
                            </div>
                        </form>

                        <div className="p-8 lg:p-10 bg-white border-t border-slate-50 flex gap-4 shrink-0">
                            <button 
                                type="button" 
                                onClick={() => setShowModal(false)} 
                                className="flex-1 py-5 rounded-2xl font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest text-[11px]"
                            >
                                Batal
                            </button>
                            <button 
                                type="submit" 
                                form="supplier-form"
                                className="flex-[2] py-5 rounded-2xl font-black text-white bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-xl shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 transition-all uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3"
                            >
                                <Plus size={18} />
                                {editingSupplier ? 'Perbarui Database' : 'Simpan Supplier Baru'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
