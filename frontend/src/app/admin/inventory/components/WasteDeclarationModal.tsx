'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle, Info, Save, X, Database, DollarSign, Calendar } from 'lucide-react';
import InputField from '@/components/ui/InputField';
import { Ingredient } from '../types';
import { formatRupiah as fmt } from '@/utils/formatUtils';
import axios from 'axios';

interface WasteDeclarationModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: Ingredient[];
    onSuccess: () => void;
}

export function WasteDeclarationModal({ isOpen, onClose, items, onSuccess }: WasteDeclarationModalProps) {
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [quantity, setQuantity] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const selectedItem = items.find(i => i.id.toString() === selectedItemId);
    const valuation = selectedItem ? Number(selectedItem.costPrice || 0) * Number(quantity || 0) : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItemId || !quantity || !reason) return;

        setIsSubmitting(true);
        try {
            await axios.post('/inventory/waste', {
                ingredientId: Number(selectedItemId),
                quantity: Number(quantity),
                reason,
                type: 'BASI' // Default for this context, could be customized
            });
            onSuccess();
            onClose();
            // Reset form
            setSelectedItemId('');
            setQuantity('');
            setReason('');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Gagal melaporkan waste');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={onClose} />
            <div className="relative bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-rose-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-200">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Deklarasi Waste</h3>
                            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Penghapusan Stok & Valuasi</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pilih Bahan Baku</label>
                        <div className="relative group">
                            <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                            <select
                                value={selectedItemId}
                                onChange={(e) => setSelectedItemId(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-rose-100 focus:bg-white rounded-2xl font-bold text-slate-700 outline-none transition-all appearance-none"
                                required
                            >
                                <option value="">-- Pilih Item --</option>
                                {items.map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.name.toUpperCase()} ({item.unit}) - Stok: {item.stockQuantity}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <InputField
                            label={`Jumlah Dibuang`}
                            type="number"
                            value={quantity}
                            onChange={setQuantity}
                            placeholder="0.00"
                            required
                        />
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Estimasi Kerugian</label>
                            <div className="h-14 bg-slate-50 rounded-2xl flex items-center px-4 border-2 border-transparent font-black text-rose-600 text-lg">
                                <DollarSign className="w-4 h-4 mr-2" />
                                {fmt(valuation)}
                            </div>
                        </div>
                    </div>

                    <InputField
                        label="Alasan Pembuangan"
                        type="textarea"
                        value={reason}
                        onChange={setReason}
                        placeholder="Contoh: Barang basi setelah libur lebaran, rusak saat penyimpanan..."
                        required
                        rows={3}
                    />

                    <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 flex gap-4">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-amber-100">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-tight mb-1">Peringatan Approval</p>
                            <p className="text-[10px] leading-relaxed text-amber-600 font-bold uppercase tracking-tight">
                                Deklarasi ini akan diproses melalui sistem Multi-Tier Approval. Stok akan dipotong otomatis setelah disetujui oleh Manager/Owner.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl font-black text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all active:scale-95 uppercase tracking-widest text-xs"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !selectedItemId || !quantity}
                            className="flex-[2] py-4 rounded-2xl font-black text-white bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-100 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? 'Memproses...' : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Ajukan Approval
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
