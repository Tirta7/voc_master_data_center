import React, { useState } from 'react';
import { ClipboardCheck, Search, AlertCircle, Save, History, RefreshCw, CheckCircle2, Database } from 'lucide-react';
import { Ingredient, MenuItem } from '../types';
import InputField from '@/components/ui/InputField';
import { formatNumber as fn } from '@/utils/formatUtils';
import axios from 'axios';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/fetcher';

export function StockAuditView({
    ingredients,
    menuItems,
    initialFilterMandatory = true
}: {
    ingredients: Ingredient[],
    menuItems: MenuItem[],
    initialFilterMandatory?: boolean
}) {
    const [selectedDept, setSelectedDept] = useState<'ALL' | 'KITCHEN' | 'BAR' | 'CASHIER'>('ALL');
    const { data: activeShift } = useSWR('/finance/shifts/active', fetcher, { refreshInterval: 5000 });
    const { data: pendingData, isLoading, mutate: mutatePending } = useSWR(
        activeShift ? `/finance/shifts/${activeShift.id}/pending-stock/${selectedDept}` : null,
        fetcher,
        { refreshInterval: 5000 }
    );

    const [filterMandatory, setFilterMandatory] = useState(initialFilterMandatory);
    const [searchTerm, setSearchTerm] = useState('');
    const [auditData, setAuditData] = useState<Record<string, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Use backend pending data if in active shift, otherwise fallback to props for simulation
    const combinedData = (activeShift && pendingData) ? [
        ...(pendingData?.ingredients || []).map((i: any) => ({ ...i, type: 'INGREDIENT' as const, auditId: `ING_${i.id}`, stockQuantity: i.currentStock })),
        ...(pendingData?.menuItems || []).map((m: any) => ({ ...m, type: 'MENU' as const, auditId: `MNU_${m.id}`, stockQuantity: m.currentStock }))
    ] : [
        ...(ingredients || []).map(i => ({ ...i, type: 'INGREDIENT' as const, auditId: `ING_${i.id}` })),
        ...(menuItems || []).map(m => ({ ...m, type: 'MENU' as const, auditId: `MNU_${m.id}` }))
    ];

    const filtered = combinedData.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());

        // If in active audit mode (backend-driven), just filter by search
        if (activeShift && pendingData) return matchesSearch;

        // If in simulation mode, apply local filters
        const matchesDept = selectedDept === 'ALL' || item.department === selectedDept;
        const matchesMandatory = !filterMandatory || (item.isHighValue || item.isMandatoryReporting);

        return matchesSearch && matchesDept && matchesMandatory;
    });

    const handleInputChange = (id: string, val: string) => {
        setAuditData(prev => ({ ...prev, [id]: Number(val) }));
    };

    const handleSubmitAudit = async () => {
        if (Object.keys(auditData).length === 0) return;
        setIsSubmitting(true);
        try {
            if (!activeShift) {
                alert('Tidak ada shift aktif. Silakan buka shift terlebih dahulu.');
                return;
            }

            const reports = Object.entries(auditData).map(([auditId, actual]) => {
                const item = combinedData.find(i => i.auditId === auditId);
                return {
                    ingredientId: auditId.startsWith('ING_') ? Number(auditId.split('_')[1]) : null,
                    menuItemId: auditId.startsWith('MNU_') ? Number(auditId.split('_')[1]) : null,
                    itemName: item?.name,
                    unit: item?.unit || 'Pcs',
                    systemStock: Number(item?.stockQuantity || 0),
                    actualStock: actual,
                    discrepancy: actual - Number(item?.stockQuantity || 0)
                };
            });

            // If we have multiple departments, we should ideally split them or let the backend handle it.
            // For simplicity, we use the submission endpoint that handles a batch of reports for the active shift.
            await axios.post(`/finance/shifts/${activeShift.id}/stock-report/${selectedDept}`, {
                reports: reports.map(r => ({
                    ...r,
                    physicalStock: r.actualStock // Backend expects physicalStock
                }))
            });

            alert('Stock Opname berhasil disimpan! Laporan selisih telah dicatat dalam shift ini.');
            setAuditData({});
            mutatePending(); // Refresh pending list
        } catch (error: any) {
            alert(error.response?.data?.message || 'Gagal menyimpan Stock Opname');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-4 md:p-10 space-y-10 bg-[#f8fafc]/30 min-h-screen">
            {/* ── STRATEGIC AUDIT HEADER ────────────────────────────────────────── */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/20">
                            <ClipboardCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Stock Audit</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Physical Inventory Verification</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                    {/* Premium Search Hub */}
                    <div className="relative group flex-1 md:min-w-[320px]">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-all" />
                        <input 
                            type="text"
                            placeholder="Cari item dalam audit..."
                            className="w-full pl-16 pr-6 py-5 bg-white border border-slate-100 shadow-sm focus:border-indigo-100 focus:ring-[12px] focus:ring-indigo-500/5 rounded-[2rem] text-sm font-bold text-slate-800 outline-none transition-all h-16"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Department Selector (Neo-Segmented) */}
                    <div className="flex gap-1.5 p-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                        {['ALL', 'KITCHEN', 'BAR', 'CASHIER'].map(dept => (
                            <button
                                key={dept}
                                onClick={() => setSelectedDept(dept as any)}
                                className={`px-6 py-3.5 rounded-[1.5rem] text-[10px] font-black tracking-widest transition-all active:scale-95 ${selectedDept === dept ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'text-slate-400 hover:bg-slate-50'}`}
                            >
                                {dept}
                            </button>
                        ))}
                    </div>

                    {/* Mandatory Toggle */}
                    <button 
                        onClick={() => setFilterMandatory(!filterMandatory)}
                        className={`flex items-center gap-3 px-6 py-4 rounded-[2rem] border transition-all h-16 ${filterMandatory ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-white border-slate-100 text-slate-400'}`}
                    >
                        <AlertCircle className={`w-5 h-5 ${filterMandatory ? 'animate-pulse' : ''}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Wajib Lapor</span>
                        <div className={`w-8 h-4 rounded-full relative transition-colors ${filterMandatory ? 'bg-amber-400' : 'bg-slate-200'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${filterMandatory ? 'right-0.5' : 'left-0.5'}`} />
                        </div>
                    </button>
                </div>
            </div>

            {/* ── AUDIT WORKSPACE ──────────────────────────────────────────────── */}
            {/* ── AUDIT WORKSPACE ──────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl md:rounded-[3.5rem] border border-slate-100 shadow-xl md:shadow-2xl shadow-slate-200/40 overflow-hidden">
                
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-10 py-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Item Registry</th>
                                <th className="px-8 py-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">System Log</th>
                                <th className="px-8 py-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Physical Entry</th>
                                <th className="px-10 py-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Audit Result</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-10 py-32 text-center">
                                        <div className="relative inline-block">
                                            <RefreshCw className="w-12 h-12 animate-spin text-indigo-500 mb-6 opacity-20" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Database className="w-5 h-5 text-indigo-600" />
                                            </div>
                                        </div>
                                        <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Synchronizing Audit Data...</p>
                                    </td>
                                </tr>
                            ) : filtered.length > 0 ? filtered.map((item) => {
                                const actual = auditData[item.auditId] ?? null;
                                const diff = actual !== null ? actual - Number(item.stockQuantity) : 0;
                                
                                return (
                                    <tr key={item.auditId} className="group hover:bg-slate-50/50 transition-all duration-500">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-5">
                                                <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center border shadow-sm group-hover:scale-110 transition-transform duration-500 ${item.type === 'MENU' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                                    {item.type === 'MENU' ? <RefreshCw className="w-6 h-6" /> : <Database className="w-6 h-6" />}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-black text-slate-900 text-base uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{item.name}</p>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest ${item.type === 'MENU' ? 'bg-indigo-50/50 text-indigo-500 border-indigo-100' : 'bg-emerald-50/50 text-emerald-500 border-emerald-100'}`}>
                                                            {item.type}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                            {typeof item.category === 'object' ? (item.category as any)?.name : (item.category || 'STORE')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8 text-right">
                                            <div className="flex flex-col items-center">
                                                <span className="font-black text-slate-900 text-2xl leading-none tracking-tighter">{fn(item.stockQuantity)}</span>
                                                <span className="text-[9px] font-black text-slate-300 uppercase mt-2 tracking-widest leading-none">{item.unit || 'PCS'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8">
                                            <div className="max-w-[160px] mx-auto group/input relative">
                                                <input 
                                                    type="number"
                                                    className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white rounded-[2rem] text-center font-black text-slate-900 text-xl outline-none transition-all shadow-inner"
                                                    placeholder="0"
                                                    value={auditData[item.auditId] || ''}
                                                    onChange={(e) => handleInputChange(item.auditId, e.target.value)}
                                                />
                                                <div className="absolute -top-3 right-4 px-2 py-1 bg-indigo-600 text-white rounded-lg opacity-0 group-focus-within/input:opacity-100 transition-opacity text-[8px] font-black uppercase">Fisik</div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            {actual !== null ? (
                                                <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
                                                    <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-[1.25rem] font-black text-xs uppercase tracking-widest shadow-lg ${diff === 0 ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-rose-500 text-white shadow-rose-200'}`}>
                                                        {diff === 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                                        {diff > 0 ? `+${fn(diff)}` : fn(diff)}
                                                    </div>
                                                    <p className={`text-[9px] font-black uppercase mt-2 tracking-widest ${diff === 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                        {diff === 0 ? 'Verified' : 'Anomaly Detected'}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center opacity-20 grayscale">
                                                     <div className="w-24 h-8 bg-slate-200 rounded-xl" />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={4} className="px-10 py-40 text-center">
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="w-24 h-24 bg-slate-50 rounded-[3rem] flex items-center justify-center text-slate-200 border border-slate-100 shadow-inner">
                                                <Search className="w-10 h-10" />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-slate-900 font-black uppercase tracking-[0.3em] text-xs">Queue is Clear</p>
                                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Semua item wajib lapor telah terverifikasi untuk departemen ini.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Grid View (Compact) */}
                <div className="lg:hidden grid grid-cols-2 gap-3 p-3 bg-slate-50/30">
                    {isLoading ? (
                        <div className="col-span-2 py-20 text-center">
                            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4 opacity-20" />
                            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[8px]">Syncing Data...</p>
                        </div>
                    ) : filtered.length > 0 ? filtered.map((item) => {
                        const actual = auditData[item.auditId] ?? null;
                        const diff = actual !== null ? actual - Number(item.stockQuantity) : 0;
                        
                        return (
                            <div key={item.auditId} className="bg-white rounded-2xl border border-slate-200/60 p-3 shadow-sm flex flex-col relative overflow-hidden group">
                                <div className="flex items-start gap-2 mb-2">
                                    <div className={`w-8 h-8 rounded-lg flex shrink-0 items-center justify-center border shadow-sm ${item.type === 'MENU' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                        {item.type === 'MENU' ? <RefreshCw className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-tight leading-tight line-clamp-2 mb-1">{item.name}</h3>
                                        <span className={`text-[6px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest ${item.type === 'MENU' ? 'bg-indigo-50/50 text-indigo-500 border-indigo-100' : 'bg-emerald-50/50 text-emerald-500 border-emerald-100'}`}>
                                            {item.type}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 mb-2 bg-slate-50 p-2 rounded-xl border border-slate-100/50">
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">System</span>
                                        <span className="font-black text-slate-900 text-[10px]">{fn(item.stockQuantity)} <span className="text-[7px] text-slate-400">{item.unit || 'PCS'}</span></span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Diff</span>
                                        {actual !== null ? (
                                            <span className={`font-black text-[10px] ${diff === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {diff > 0 ? `+${fn(diff)}` : fn(diff)}
                                            </span>
                                        ) : (
                                            <span className="font-black text-[10px] text-slate-300">-</span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-auto relative">
                                    <input 
                                        type="number"
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-center font-black text-slate-900 text-xs outline-none transition-all shadow-inner"
                                        placeholder="Fisik?"
                                        value={auditData[item.auditId] || ''}
                                        onChange={(e) => handleInputChange(item.auditId, e.target.value)}
                                    />
                                    {actual !== null && (
                                        <div className={`absolute -right-1 -top-2 w-4 h-4 rounded-full flex items-center justify-center border shadow-sm ${diff === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
                                            {diff === 0 ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="col-span-2 py-10 text-center">
                            <Search className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest">Tidak ada item wajib lapor.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── FINALIZATION HUB ─────────────────────────────────────────────── */}
            <div className="bg-slate-900 rounded-[4rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-slate-900/40">
                <div className="absolute bottom-0 right-0 p-12 opacity-5 pointer-events-none">
                    <ClipboardCheck className="w-64 h-64 rotate-12" />
                </div>
                
                <div className="relative z-10 flex flex-col xl:flex-row justify-between items-center gap-12">
                    <div className="flex items-center gap-8">
                        <div className="w-20 h-20 bg-white/10  rounded-[2.5rem] flex items-center justify-center text-white border border-white/20 shadow-2xl">
                            <Save className="w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-3xl font-black uppercase tracking-tight">Execute Stock Finalization</h3>
                            <p className="text-slate-400 font-medium text-sm max-w-xl">
                                Mengirim data opname fisik ke pusat data. Selisih stok akan otomatis disesuaikan dan dicatat secara permanen dalam laporan keuangan shift.
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleSubmitAudit}
                        disabled={isSubmitting || Object.keys(auditData).length === 0}
                        className="w-full xl:w-auto bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-900 px-16 py-8 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 group"
                    >
                        {isSubmitting ? <RefreshCw className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6 group-hover:scale-125 transition-transform" />}
                        Commit & Validate Shift
                    </button>
                </div>
            </div>
        </div>
    );
}
