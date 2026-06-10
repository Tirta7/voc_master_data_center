import React, { useState } from 'react';
import { Package, Truck, DollarSign, FileText, Save, X, Info } from 'lucide-react';
import { Ingredient } from '../types';
import InputField from '@/components/ui/InputField';
import axios from 'axios';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Calendar as CalendarIcon, CreditCard, Clock, ChevronDown, CheckCircle2, AlertCircle, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

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
    const { data: settings } = useSWR<any>('/settings', fetcher);
    const paymentMethods = settings?.availablePaymentMethods || ['CASH'];

    const [formData, setFormData] = useState({
        supplierId: '',
        quantity: '',
        purchaseUnit: ingredient.unit, // Default to base unit
        isCustomUnit: false,
        customUnitName: 'Pack',
        conversionFactor: '1',
        purchasePrice: '',
        totalPrice: '',
        notes: '',
        paymentStatus: 'PAID', // PAID, UNPAID, PARTIAL
        paidAmount: '',
        dueDate: '',
        paymentMethod: paymentMethods[0],
        customInstallmentDates: [] as string[],
        batches: ingredient.isBatchTracked ? [{ batchNumber: '', quantity: '' }] : []
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

    let baseQuantity = Number(formData.quantity || 0) * conversionFactor;
    if (ingredient.isBatchTracked) {
        baseQuantity = formData.batches.reduce((sum, b) => sum + (Number(b.quantity) || 0) * conversionFactor, 0);
    }
    const pricePerBaseUnit = Number(formData.purchasePrice || 0) / (ingredient.isBatchTracked ? 1 : conversionFactor);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!ingredient.isBatchTracked && !formData.quantity) || !formData.purchasePrice) return;

        setIsSubmitting(true);
        try {
            const totalToPayLater = Number(formData.totalPrice || 0) - Number(formData.paidAmount || 0);
            const installmentPlans = formData.paymentStatus === 'PARTIAL' ? formData.customInstallmentDates.map((dateStr) => {
                return {
                    dueDate: new Date(dateStr),
                    amount: totalToPayLater / formData.customInstallmentDates.length
                };
            }) : [];

            await axios.post('/inventory/stock-in', {
                ingredientId: ingredient.id,
                supplierId: formData.supplierId ? Number(formData.supplierId) : undefined,
                quantity: baseQuantity,
                purchasePrice: pricePerBaseUnit,
                notes: formData.notes,
                paymentStatus: formData.paymentStatus,
                paidAmount: formData.paymentStatus === 'PAID' ? Number(formData.totalPrice) : Number(formData.paidAmount || 0),
                dueDate: formData.dueDate || (installmentPlans.length > 0 ? installmentPlans[installmentPlans.length - 1].dueDate : undefined),
                paymentMethod: formData.paymentMethod,
                invoiceNumber: formData.notes,
                installmentPlans: installmentPlans,
                batches: ingredient.isBatchTracked ? formData.batches.map(b => ({
                    batchNumber: b.batchNumber || undefined,
                    initialQuantity: Number(b.quantity) * conversionFactor
                })) : undefined
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
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl animate-in fade-in duration-700" onClick={onClose} />

            <div className="relative bg-white rounded-[3rem] w-full max-w-7xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col lg:flex-row min-h-[750px]">
                {/* Left Panel: Item & Quantity */}
                <div className="flex-1 p-8 lg:p-10 bg-white flex flex-col">
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner transition-transform">
                                <Package className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">Terima Barang</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{ingredient.name}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="lg:hidden p-3 bg-slate-50 text-slate-300 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form id="receive-form" onSubmit={handleSubmit} className="flex-1 space-y-6">
                        {/* Section: Supplier & Basic Info */}
                        <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 space-y-5">
                            <div>
                                <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 ml-1">
                                    <Truck size={12} className="text-indigo-500" />
                                    Vendor / Pemasok
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full px-6 py-4 bg-white border-2 border-slate-100 focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-black text-slate-900 outline-none transition-all appearance-none shadow-sm"
                                        value={formData.supplierId}
                                        onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                                    >
                                        <option value="">-- Pilih Supplier (Opsional) --</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                                        <ChevronDown size={18} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section: Quantity & Price */}
                        <div className="p-7 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                            <div className="grid grid-cols-12 gap-6">
                                <div className="col-span-7">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 ml-1">Jumlah & Satuan Beli</label>
                                    <div className="flex gap-2">
                                        {!ingredient.isBatchTracked ? (
                                            <div className="flex-1">
                                                <InputField
                                                    label=""
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
                                                    placeholder="0"
                                                    required
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 text-sm font-black text-indigo-600">
                                                {baseQuantity / conversionFactor} {formData.isCustomUnit ? formData.customUnitName : formData.purchaseUnit}
                                            </div>
                                        )}
                                        <select
                                            className="w-36 px-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl text-[11px] font-black text-slate-600 outline-none transition-all uppercase shadow-inner"
                                            value={formData.isCustomUnit ? 'CUSTOM' : formData.purchaseUnit}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === 'CUSTOM') {
                                                    setFormData({ ...formData, isCustomUnit: true, purchaseUnit: formData.customUnitName });
                                                } else {
                                                    setFormData({ ...formData, isCustomUnit: false, purchaseUnit: val });
                                                }
                                            }}
                                        >
                                            <option value={ingredient.unit}>{ingredient.unit}</option>
                                            {ingredient.unit === 'Gram' && <option value="Kg">Kilogram (Kg)</option>}
                                            {ingredient.unit === 'Ml' && <option value="Liter">Liter (L)</option>}
                                            <option value="CUSTOM">📦 Lainnya</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="col-span-5">
                                    <InputField
                                        label={`Harga / ${formData.purchaseUnit}`}
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
                                </div>
                            </div>

                            <div className="relative pt-2">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-white border border-slate-100 rounded-full text-[8px] font-black text-slate-300 uppercase tracking-widest z-10">Total Transaksi</div>
                                <InputField
                                    label=""
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
                                    className="!text-2xl !py-6 text-indigo-600"
                                    suffix={<div className="px-4 py-2 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-xl uppercase shadow-sm">IDR / NOTA</div>}
                                />
                            </div>
                        </div>

                        {/* Batches Section for Tracked Items */}
                        {ingredient.isBatchTracked && (
                            <div className="p-6 bg-indigo-50/30 rounded-[2rem] border border-indigo-100 space-y-4">
                                <div className="flex justify-between items-center mb-2">
                                    <div>
                                        <label className="flex items-center gap-2 text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] ml-1">
                                            <Package size={12} className="text-indigo-500" />
                                            Daftar Batch / Roll
                                        </label>
                                        <p className="text-[10px] text-slate-500 font-medium ml-1">Masukkan panjang/qty tiap batch.</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData, 
                                            batches: [...formData.batches, { batchNumber: '', quantity: ingredient.conversionFactor?.toString() || '1' }]
                                        })}
                                        className="text-[10px] font-black bg-white border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-xl hover:bg-indigo-600 hover:text-white transition-colors flex items-center gap-1 shadow-sm"
                                    >
                                        <Plus size={12} /> Tambah Roll
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                    {formData.batches.map((b, idx) => (
                                        <div key={idx} className="flex gap-3 items-center bg-white p-3 rounded-2xl border border-indigo-100 shadow-sm">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center text-[10px] font-black shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={b.batchNumber}
                                                    onChange={e => {
                                                        const newBatches = [...formData.batches];
                                                        newBatches[idx].batchNumber = e.target.value;
                                                        setFormData({ ...formData, batches: newBatches });
                                                    }}
                                                    placeholder="No Batch (Auto-generate)"
                                                    className="w-full text-xs font-bold text-slate-700 bg-transparent outline-none placeholder:text-slate-300"
                                                />
                                            </div>
                                            <div className="w-24">
                                                <input
                                                    type="number"
                                                    value={b.quantity}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        const newBatches = [...formData.batches];
                                                        newBatches[idx].quantity = val;
                                                        const newBaseQuantity = newBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0) * conversionFactor, 0);
                                                        const price = Number(formData.purchasePrice || 0);
                                                        setFormData({ 
                                                            ...formData, 
                                                            batches: newBatches,
                                                            totalPrice: (price * newBaseQuantity / conversionFactor).toString()
                                                        });
                                                    }}
                                                    placeholder="Qty"
                                                    className="w-full text-sm font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none text-right focus:border-indigo-500"
                                                />
                                            </div>
                                            {formData.batches.length > 1 && (
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const newBatches = formData.batches.filter((_, i) => i !== idx);
                                                        setFormData({ ...formData, batches: newBatches });
                                                    }}
                                                    className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shrink-0"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {formData.isCustomUnit && (
                            <div className="p-6 bg-indigo-50/30 rounded-[2rem] border-2 border-dashed border-indigo-100/50 grid grid-cols-2 gap-4 animate-in zoom-in duration-500">
                                <InputField
                                    label="Nama Satuan Baru"
                                    value={formData.customUnitName}
                                    onChange={(v) => setFormData({ ...formData, customUnitName: v, purchaseUnit: v })}
                                    placeholder="Contoh: Slop"
                                />
                                <InputField
                                    label={`Konversi ke ${ingredient.unit}`}
                                    type="number"
                                    value={formData.conversionFactor}
                                    onChange={(v) => setFormData({ ...formData, conversionFactor: v })}
                                    suffix={<span className="text-[10px] font-bold text-indigo-300 uppercase">{ingredient.unit}</span>}
                                />
                            </div>
                        )}

                        {/* Section: Notes */}
                        <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100">
                            <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">
                                <FileText size={12} className="text-slate-400" />
                                Catatan & Nomor Invoice
                            </label>
                            <textarea
                                className="w-full bg-white border border-slate-100 rounded-2xl p-4 text-sm font-medium text-slate-600 outline-none resize-none focus:border-indigo-500 transition-all shadow-sm"
                                rows={2}
                                placeholder="Tulis keterangan tambahan atau nomor invoice di sini..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        {/* Summary Info */}
                        <div className="p-5 bg-emerald-50/50 rounded-[1.5rem] border border-emerald-100/50 flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-200/50 text-white">
                                <CheckCircle2 size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-emerald-800 leading-tight uppercase tracking-tight">
                                    Akan Menambah <span className="text-emerald-600 font-black">{baseQuantity.toLocaleString('id-ID')} {ingredient.unit}</span>
                                    {ingredient.isBatchTracked && ` (${formData.batches.length} Batch/Roll)`}
                                </p>
                                <p className="text-[9px] font-bold text-emerald-600/70 uppercase mt-0.5">
                                    HPP Estimasi: Rp {(Number(formData.totalPrice || 0) / (baseQuantity || 1)).toLocaleString('id-ID', { maximumFractionDigits: 2 })} / {ingredient.unit}
                                </p>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Right Panel: Finance & Status */}
                <div className="w-full lg:w-[500px] bg-slate-50/50 p-10 lg:p-12 flex flex-col relative border-l border-slate-100">
                    <div className="relative flex-1 flex flex-col">
                        <div className="hidden lg:flex justify-end mb-10">
                            <button onClick={onClose} className="p-3 bg-white text-slate-300 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm border border-slate-100">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-10 p-8 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200/50 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-all duration-700" />
                            <p className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.4em] mb-3 relative z-10">Nilai Transaksi</p>
                            <div className="flex items-baseline gap-3 relative z-10">
                                <span className="text-5xl font-black tracking-tighter">
                                    {(Number(formData.totalPrice || 0)).toLocaleString('id-ID')}
                                </span>
                                <span className="text-sm font-black text-indigo-200">IDR</span>
                            </div>
                        </div>

                        <div className="space-y-10 flex-1">
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-5 ml-1">Metode Pembayaran</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'PAID', label: 'LUNAS', icon: <CheckCircle2 size={16} />, color: 'emerald' },
                                        { id: 'PARTIAL', label: 'CICILAN', icon: <Clock size={16} />, color: 'amber' },
                                        { id: 'UNPAID', label: 'TEMPO', icon: <AlertCircle size={16} />, color: 'rose' }
                                    ].map(status => (
                                        <button
                                            key={status.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, paymentStatus: status.id as any })}
                                            className={`p-5 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-3 group ${formData.paymentStatus === status.id
                                                    ? 'bg-slate-900 border-slate-900 text-white shadow-xl -translate-y-1'
                                                    : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200 hover:bg-indigo-50/30'
                                                }`}
                                        >
                                            <div className={`${formData.paymentStatus === status.id ? 'text-white' : 'text-slate-300 group-hover:text-indigo-400'}`}>
                                                {status.icon}
                                            </div>
                                            <span className="text-[10px] font-black tracking-widest">{status.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6">
                                {formData.paymentStatus === 'PARTIAL' && (
                                    <div className="space-y-5 animate-in slide-in-from-top-4 duration-500">
                                        <InputField 
                                            label="Bayar Sekarang / DP (Rp)"
                                            type="number"
                                            value={formData.paidAmount}
                                            onChange={(v) => setFormData({...formData, paidAmount: v})}
                                            className="!bg-white shadow-sm"
                                        />

                                        <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                                            <div className="flex justify-between items-center mb-5">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Jadwal Pembayaran</label>
                                                <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black">
                                                    {formData.customInstallmentDates.length} Termin
                                                </div>
                                            </div>

                                            <div className="space-y-3 mb-6 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                                                {formData.customInstallmentDates.sort().map((date, idx) => (
                                                    <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50/80 rounded-2xl group/item hover:bg-slate-100 transition-all">
                                                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm">
                                                            <CalendarIcon size={14} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-[11px] font-black text-slate-700">
                                                                {new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </p>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase">
                                                                Rp {Math.round((Number(formData.totalPrice || 0) - Number(formData.paidAmount || 0)) / formData.customInstallmentDates.length).toLocaleString('id-ID')}
                                                            </p>
                                                        </div>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const newDates = formData.customInstallmentDates.filter((_, i) => i !== idx);
                                                                setFormData({...formData, customInstallmentDates: newDates});
                                                            }}
                                                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {formData.customInstallmentDates.length === 0 && (
                                                    <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-[1.5rem]">
                                                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed">
                                                            Belum ada jadwal<br/>dipilih
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="relative">
                                                <input 
                                                    type="date"
                                                    id="add-date-input"
                                                    className="absolute inset-0 opacity-0 pointer-events-none"
                                                    onChange={(e) => {
                                                        if (e.target.value && !formData.customInstallmentDates.includes(e.target.value)) {
                                                            setFormData({
                                                                ...formData, 
                                                                customInstallmentDates: [...formData.customInstallmentDates, e.target.value]
                                                            });
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const input = document.getElementById('add-date-input') as HTMLInputElement;
                                                        if (input && 'showPicker' in input) input.showPicker();
                                                    }}
                                                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition-all border border-slate-200/50"
                                                >
                                                    <Plus size={14} /> Tambah Tanggal
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {formData.paymentStatus === 'UNPAID' && (
                                    <div className="animate-in slide-in-from-top-4 duration-500 space-y-6">
                                        <InputField 
                                            label="Jatuh Tempo Pembayaran"
                                            type="date"
                                            value={formData.dueDate}
                                            onChange={(v) => setFormData({...formData, dueDate: v})}
                                            className="!bg-white shadow-sm"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Payment Method Selector - Always Visible */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">
                                    Metode Pembayaran {formData.paymentStatus === 'PARTIAL' ? '(DP)' : ''}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {paymentMethods.map((m: string) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, paymentMethod: m })}
                                            className={`px-6 py-3 rounded-xl text-[10px] font-black transition-all ${formData.paymentMethod === m
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105'
                                                    : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
                                                }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="mt-12 flex items-center gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || (ingredient.isBatchTracked ? formData.batches.length === 0 : !formData.quantity) || !formData.purchasePrice}
                                className="flex-[2] py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save size={16} />
                                        Konfirmasi
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
