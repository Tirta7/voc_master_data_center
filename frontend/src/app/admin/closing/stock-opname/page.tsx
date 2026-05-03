'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    ClipboardCheck, 
    Save, 
    ArrowLeft, 
    AlertCircle, 
    CheckCircle2, 
    ChefHat, 
    Wine, 
    Store 
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/components/ui/AlertProvider';
import InputField from '@/components/ui/InputField';

interface StockItem {
    id: number;
    name: string;
    unit: string;
    currentStock: number;
    type: 'INGREDIENT' | 'MENU_ITEM';
    physicalStock?: number;
    note?: string;
    reportedStatus?: 'PENDING' | 'DONE';
}

export default function StockOpnamePage() {
    const { user, activeShift, hasPermission } = useAuth();
    const { showAlert } = useAlert();
    const router = useRouter();
    
    const searchParams = useSearchParams();
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [items, setItems] = useState<StockItem[]>([]);
    const [department, setDepartment] = useState<string>('');
    const [isSuccess, setIsSuccess] = useState(false);

    // Initial effect to determine department and fetch items
    useEffect(() => {
        if (!user) return;

        // 1. Priority: URL Param (passed from KDS/BDS button)
        const paramDept = searchParams.get('dept');
        
        let dept = '';
        if (paramDept) {
            dept = paramDept.toUpperCase();
        } else {
            // 2. Fallback: User Role
            const role = user.role?.toUpperCase();
            if (role === 'KITCHEN') dept = 'KITCHEN';
            else if (role === 'BARTENDER') dept = 'BAR';
            else if (role === 'CASHIER') dept = 'CASHIER';
            else if (role === 'ADMIN' || role === 'OWNER') {
                // For admin, try to guess from station hint before defaulting to KITCHEN
                if (typeof window !== 'undefined') {
                    if (localStorage.getItem('bartender_station')) dept = 'BAR';
                    else dept = 'KITCHEN';
                } else {
                    dept = 'KITCHEN';
                }
            }
        }

        setDepartment(dept);
        if (activeShift && dept) {
            fetchPendingItems(activeShift.id, dept);
        } else {
            setLoading(false);
        }
    }, [user, activeShift, searchParams]);

    const fetchPendingItems = async (shiftId: number, dept: string) => {
        setLoading(true);
        try {
            const res = await axios.get(`/finance/shifts/${shiftId}/pending-stock/${dept}`);
            const { ingredients, menuItems } = res.data;
            
            const combined: StockItem[] = [
                ...ingredients.map((i: any) => ({ ...i, physicalStock: i.currentStock })),
                ...menuItems.map((m: any) => ({ ...m, physicalStock: m.currentStock }))
            ];
            
            setItems(combined);
        } catch (error) {
            console.error('Failed to fetch pending items', error);
            showAlert('Gagal', 'Gagal mengambil daftar barang wajib lapor.', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (index: number, field: keyof StockItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeShift || !department) return;

        setSubmitting(true);
        try {
            const reports = items.map(item => ({
                ingredientId: item.type === 'INGREDIENT' ? item.id : undefined,
                menuItemId: item.type === 'MENU_ITEM' ? item.id : undefined,
                physicalStock: Number(item.physicalStock),
                itemName: item.name,
                unit: item.unit,
                note: item.note || ''
            }));

            await axios.post(`/finance/shifts/${activeShift.id}/stock-report/${department}`, { reports });
            
            setIsSuccess(true);
            showAlert('Berhasil', `Laporan stok ${department} telah dikirim.`, { variant: 'success' });
            
            // Redirect after 2 seconds
            setTimeout(() => {
                router.push('/admin/dashboard');
            }, 2000);
        } catch (error: any) {
            console.error('Submission failed', error);
            showAlert('Gagal', error.response?.data?.message || 'Gagal mengirim laporan stok.', { variant: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4 mx-auto" />
                <p className="text-slate-500 font-bold">Memuat Daftar Barang...</p>
            </div>
        </div>
    );

    if (!activeShift) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md border border-slate-100">
                <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-4">Tidak Ada Shift Aktif</h1>
                <p className="text-slate-500 mb-8">Laporan stok hanya bisa dilakukan saat shift sedang berjalan.</p>
                <button onClick={() => router.push('/')} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all">
                    Kembali
                </button>
            </div>
        </div>
    );

    const getDeptIcon = (dept: string) => {
        switch(dept) {
            case 'KITCHEN': return <ChefHat className="w-6 h-6" />;
            case 'BAR': return <Wine className="w-6 h-6" />;
            default: return <Store className="w-6 h-6" />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 lg:p-10">
            <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-800 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Kembali
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 italic text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Shift ID: #{activeShift.id}
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 opacity-50" />
                    
                    <div className="relative">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-indigo-100">
                                    <ClipboardCheck className="w-8 h-8" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Stock Opname</h1>
                                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Laporan Stok Per Departemen</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {(user?.role === 'ADMIN' || user?.role === 'OWNER') && (
                                    <select 
                                        className="px-6 py-3 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 font-bold text-slate-800 outline-none transition-all cursor-pointer"
                                        value={department}
                                        onChange={(e) => {
                                            setDepartment(e.target.value);
                                            fetchPendingItems(activeShift.id, e.target.value);
                                        }}
                                    >
                                        <option value="KITCHEN">Dapur (Kitchen)</option>
                                        <option value="BAR">Bar (Bartender)</option>
                                        <option value="CASHIER">Kasir / Retail</option>
                                    </select>
                                )}
                                <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest ${
                                    department === 'KITCHEN' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                    department === 'BAR' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                    'bg-blue-50 text-blue-600 border border-blue-100'
                                }`}>
                                    {getDeptIcon(department)}
                                    {department}
                                </div>
                            </div>
                        </div>

                        {items.length === 0 ? (
                            <div className="py-20 text-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-20" />
                                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Semua barang aman. Tidak ada barang wajib lapor hari ini.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {items.map((item: any, idx) => (
                                        <div key={`${item.type}-${item.id}`} className={`p-5 rounded-3xl border transition-all group relative overflow-hidden ${
                                            item.reportedStatus === 'DONE' 
                                            ? 'bg-emerald-50/30 border-emerald-100 opacity-80' 
                                            : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
                                        }`}>
                                            {item.reportedStatus === 'DONE' && (
                                                <div className="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-1 rounded-bl-2xl flex items-center gap-1 shadow-lg">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    <span className="text-[10px] font-black uppercase">Selesai</span>
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                                        item.reportedStatus === 'DONE'
                                                        ? 'bg-emerald-100 text-emerald-600'
                                                        : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                                                    }`}>
                                                        {item.type === 'INGREDIENT' ? <Store className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.type}</p>
                                                        <h4 className={`font-black tracking-tight ${item.reportedStatus === 'DONE' ? 'text-slate-500' : 'text-slate-800'}`}>
                                                            {item.name}
                                                        </h4>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistem</p>
                                                    <p className="font-black text-indigo-600">{item.currentStock} <span className="text-[10px] text-slate-400">{item.unit}</span></p>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                                <InputField
                                                    label="Stok Fisik"
                                                    type="number"
                                                    disabled={item.reportedStatus === 'DONE'}
                                                    value={item.physicalStock}
                                                    onChange={(val) => handleInputChange(idx, 'physicalStock', val)}
                                                    placeholder="Realitas"
                                                    required
                                                />
                                                <InputField
                                                    label="Catatan"
                                                    disabled={item.reportedStatus === 'DONE'}
                                                    value={item.note || ''}
                                                    onChange={(val) => handleInputChange(idx, 'note', val)}
                                                    placeholder="Opsional"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-6 border-t border-slate-50 flex justify-end">
                                    {(() => {
                                        const allDone = items.length > 0 && items.every(i => i.reportedStatus === 'DONE');
                                        return (
                                            <button
                                                type="submit"
                                                disabled={submitting || isSuccess || allDone}
                                                className={`px-10 py-5 bg-slate-900 text-white font-black rounded-[2rem] shadow-2xl shadow-slate-200 hover:bg-black transition-all flex items-center gap-3 active:scale-[0.98] ${submitting || isSuccess || allDone ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <Save className="w-5 h-5" />
                                                {submitting ? 'Mengirim Laporan...' : isSuccess ? 'Berhasil Terkirim' : allDone ? 'Semua Stok Selesai' : 'Kirim Laporan Stok'}
                                            </button>
                                        );
                                    })()}
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4 items-start">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-amber-900 uppercase tracking-wider mb-1">Penting</p>
                        <p className="text-[11px] text-amber-700 font-bold leading-relaxed">
                            Pastikan hitungan fisik akurat. Selisih stok yang material akan dilaporkan otomatis ke manajemen sebagai potensi kerugian.
                            Setelah laporan dikirim, stok di sistem akan disesuaikan secara otomatis mengikuti angka fisik Anda.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
