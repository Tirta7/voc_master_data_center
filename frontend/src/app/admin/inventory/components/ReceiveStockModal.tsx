import React, { useState } from 'react';
import { Package, Truck, DollarSign, FileText, Save, X, Info } from 'lucide-react';
import { Ingredient } from '../types';
import InputField from '@/components/ui/InputField';
import axios from 'axios';
import { mutate } from 'swr';

export function ReceiveStockModal({ 
    ingredient, 
    suppliers, 
    onClose, 
    onSuccess 
}: { 
    ingredient: Ingredient, 
    suppliers: any[], 
    onClose: () => void,
    onSuccess: () => void 
}) {
    const [formData, setFormData] = useState({
        supplierId: '',
        quantity: '',
        purchaseUnit: ingredient.unit, // Default to base unit
        isCustomUnit: false,
        customUnitName: 'Pack',
        conversionFactor: '1',
        purchasePrice: '',
        totalPrice: '',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dynamic Conversion Logic
    const getPresetFactor = (from: string, to: string) => {
        if (from === 'Kg' && to === 'Gram') return 1000;
        if (from === 'Liter' && to === 'Ml') return 1000;
        if (from === 'Gram' && to === 'Kg') return 0.001;
        if (from === 'Ml' && to === 'Liter') return 0.001;
        return 1;
    };

    const conversionFactor = formData.isCustomUnit 
        ? Number(formData.conversionFactor || 1) 
        : getPresetFactor(formData.purchaseUnit, ingredient.unit);
    
    const baseQuantity = Number(formData.quantity || 0) * conversionFactor;
    const pricePerBaseUnit = Number(formData.purchasePrice || 0) / conversionFactor;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.quantity || !formData.purchasePrice) return;

        setIsSubmitting(true);
        try {
            await axios.post('/inventory/stock-in', {
                ingredientId: ingredient.id,
                supplierId: formData.supplierId ? Number(formData.supplierId) : undefined,
                quantity: baseQuantity, // Send converted quantity to backend
                purchasePrice: pricePerBaseUnit, // Send price per base unit (e.g. price per gram)
                notes: formData.notes
            });
            mutate('/inventory/ingredients');
            mutate('/inventory/stock-in');
            mutate('/inventory/stats');
            onSuccess();
            onClose();
        } catch (error) {
            alert('Gagal menerima barang');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 sm:p-6 pb-24">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={onClose} />
            <div className="relative bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-12 duration-500">
                <div className="p-10 pb-6">
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                                <Package className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">Terima Barang</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{ingredient.name}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Pilih Supplier</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-indigo-600 text-slate-300 transition-colors">
                                        <Truck size={18} />
                                    </div>
                                    <select 
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-black text-slate-900 outline-none transition-all appearance-none"
                                        value={formData.supplierId}
                                        onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                                    >
                                        <option value="">-- Pilih Supplier (Opsional) --</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Satuan Beli</label>
                                <select 
                                    className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-black text-slate-900 outline-none transition-all appearance-none"
                                    value={formData.isCustomUnit ? 'CUSTOM' : formData.purchaseUnit}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === 'CUSTOM') {
                                            setFormData({...formData, isCustomUnit: true, purchaseUnit: formData.customUnitName});
                                        } else {
                                            setFormData({...formData, isCustomUnit: false, purchaseUnit: val});
                                        }
                                    }}
                                >
                                    <option value={ingredient.unit}>{ingredient.unit} (Satuan Dasar)</option>
                                    {ingredient.unit === 'Gram' && <option value="Kg">Kilogram (Kg)</option>}
                                    {ingredient.unit === 'Ml' && <option value="Liter">Liter</option>}
                                    <option value="CUSTOM">📦 Satuan Lain (Slop/Dus/Dll)</option>
                                </select>
                            </div>

                            {formData.isCustomUnit && (
                                <div className="col-span-2 md:col-span-1 animate-in slide-in-from-right-4 duration-300">
                                    <InputField 
                                        label="Nama Satuan (Slop/Dus/Dll)"
                                        type="text"
                                        value={formData.customUnitName}
                                        onChange={(v) => setFormData({...formData, customUnitName: v, purchaseUnit: v})}
                                        placeholder="Contoh: Slop"
                                        required
                                    />
                                </div>
                            )}

                            {formData.isCustomUnit && (
                                <div className="col-span-2 animate-in zoom-in duration-300">
                                    <div className="p-4 bg-indigo-50 rounded-2xl border-2 border-dashed border-indigo-200 flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-indigo-600 shadow-sm">1</div>
                                            <span className="font-bold text-indigo-900 uppercase text-xs">{formData.customUnitName}</span>
                                        </div>
                                        <div className="h-px flex-1 bg-indigo-200 mx-4" />
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">BERISI:</span>
                                            <div className="relative">
                                                <input 
                                                    type="number"
                                                    className="w-20 px-3 py-2 bg-white rounded-lg border-2 border-indigo-100 focus:border-indigo-500 font-black text-indigo-600 text-center outline-none shadow-sm transition-all"
                                                    value={formData.conversionFactor}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        const factor = Number(v || 1);
                                                        const qty = Number(formData.quantity || 0);
                                                        const total = Number(formData.totalPrice || 0);
                                                        setFormData({
                                                            ...formData, 
                                                            conversionFactor: v,
                                                            purchasePrice: qty > 0 && total > 0 ? (total / qty).toString() : formData.purchasePrice
                                                        });
                                                    }}
                                                />
                                            </div>
                                            <span className="font-bold text-indigo-900 uppercase text-xs">{ingredient.unit}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <InputField 
                                label={`Jumlah Masuk (${formData.purchaseUnit})`}
                                type="number"
                                value={formData.quantity}
                                onChange={(v) => {
                                    const qty = Number(v);
                                    const price = Number(formData.purchasePrice || 0);
                                    const total = Number(formData.totalPrice || 0);
                                    
                                    setFormData({
                                        ...formData, 
                                        quantity: v,
                                        purchasePrice: total > 0 && qty > 0 ? (total / qty).toString() : formData.purchasePrice,
                                        totalPrice: total > 0 ? formData.totalPrice : (price > 0 && qty > 0 ? (price * qty).toString() : formData.totalPrice)
                                    });
                                }}
                                placeholder="0.00"
                                required
                            />

                            <InputField 
                                label={`Harga Beli per ${formData.purchaseUnit} (Rp)`}
                                type="number"
                                value={formData.purchasePrice}
                                onChange={(v) => {
                                    const price = Number(v);
                                    const qty = Number(formData.quantity || 0);
                                    setFormData({
                                        ...formData, 
                                        purchasePrice: v,
                                        totalPrice: qty > 0 ? (price * qty).toString() : formData.totalPrice
                                    });
                                }}
                                placeholder="0"
                                required
                            />

                            <InputField 
                                label="Total Harga Beli (Nota)"
                                type="number"
                                value={formData.totalPrice}
                                onChange={(v) => {
                                    const total = Number(v);
                                    const qty = Number(formData.quantity || 0);
                                    setFormData({
                                        ...formData, 
                                        totalPrice: v,
                                        purchasePrice: qty > 0 ? (total / qty).toString() : formData.purchasePrice
                                    });
                                }}
                                placeholder="0"
                                required
                                suffix={<div className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-lg uppercase">Calc</div>}
                            />

                            <div className="col-span-2">
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                                    <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-[11px] font-medium text-amber-800 leading-relaxed">
                                        Sistem akan mencatat <span className="font-black">{(Number(formData.quantity || 0) * (formData.isCustomUnit ? Number(formData.conversionFactor || 1) : getPresetFactor(formData.purchaseUnit, ingredient.unit))).toLocaleString('id-ID')} {ingredient.unit}</span> ke dalam stok dengan harga rata-rata <span className="font-black">Rp {(Number(formData.purchasePrice || 0) / (formData.isCustomUnit ? Number(formData.conversionFactor || 1) : getPresetFactor(formData.purchaseUnit, ingredient.unit))).toLocaleString('id-ID')} per {ingredient.unit}</span>.
                                    </p>
                                </div>
                            </div>

                            <div className="col-span-2">
                                <InputField 
                                    label="Catatan / No. Invoice"
                                    type="textarea"
                                    value={formData.notes}
                                    onChange={(v) => setFormData({...formData, notes: v})}
                                    placeholder="Contoh: Inv#123 - Barang segar dari pasar"
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 flex gap-4 items-start">
                            <div className="p-2 bg-indigo-600 rounded-lg text-white shrink-0">
                                <DollarSign className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-indigo-900 uppercase tracking-tight">Estimasi Total Biaya</p>
                                <p className="text-xl font-black text-indigo-600">
                                    Rp {(Number(formData.quantity || 0) * Number(formData.purchasePrice || 0)).toLocaleString('id-ID')}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="flex-1 py-5 rounded-2xl font-black text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all uppercase tracking-widest text-xs"
                            >
                                Batal
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSubmitting || !formData.quantity || !formData.purchasePrice}
                                className="flex-[2] py-5 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs flex items-center justify-center gap-3"
                            >
                                <Save className="w-4 h-4" />
                                {isSubmitting ? 'Memproses...' : 'Konfirmasi Penerimaan'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
