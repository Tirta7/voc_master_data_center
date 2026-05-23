'use client';

import React from 'react';
import { X, CheckCircle2, AlertCircle, Info, Clock, Star, Zap, Coffee, Shield, Monitor } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface TableSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    tables: any[];
    customerName: string;
    targetTableId?: number;
    onSelect: (tableId: number) => void;
}

const TableSelectionModal: React.FC<TableSelectionModalProps> = ({ isOpen, onClose, tables, customerName, targetTableId: initialTargetTableId, onSelect }) => {
    const [selectedId, setSelectedId] = React.useState<number | undefined>(initialTargetTableId);

    useBodyScrollLock(isOpen);

    React.useEffect(() => {
        setSelectedId(initialTargetTableId);
    }, [initialTargetTableId, isOpen]);

    if (!isOpen) return null;

    const getCategoryIcon = (category?: string) => {
        const cat = category?.toUpperCase();
        if (cat === 'VIP') return <Star className="w-3 h-3 text-amber-500" />;
        if (cat === 'VVIP') return <Zap className="w-3 h-3 text-indigo-500" />;
        if (cat === 'CAFE') return <Coffee className="w-3 h-3 text-rose-500" />;
        return <Shield className="w-3 h-3 text-slate-400" />;
    };

    const handleConfirm = () => {
        if (selectedId) {
            onSelect(selectedId);
            onClose();
        }
    };

    return (
        <div className="fixed -inset-4 sm:inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white w-full max-w-4xl rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden overscroll-contain animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[92vh] my-4">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600">
                            <Monitor className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pilih Meja Operasional</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assignment For:</span>
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{customerName}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto overscroll-contain custom-scrollbar flex-1 bg-white">
                    {/* Compact Legend */}
                    <div className="flex items-center gap-4 mb-6 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-white border border-slate-300 rounded-md" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tersedia</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-indigo-100 border border-indigo-200 rounded-md" />
                            <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">Terisi</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-amber-100 border border-amber-200 rounded-md" />
                            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Booked</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {(() => {
                            const candidates = [...tables]
                                .filter(t => !t.isBooked && (t.status === 'available' || t.status === 'in_use' || t.status === 'warning' || t.status === 'waiting_payment'))
                                .sort((a, b) => {
                                    if (a.status === 'available' && b.status !== 'available') return -1;
                                    if (b.status === 'available' && a.status !== 'available') return 1;
                                    const aIsWp = a.status === 'waiting_payment';
                                    const bIsWp = b.status === 'waiting_payment';
                                    if (aIsWp && !bIsWp) return -1;
                                    if (bIsWp && !aIsWp) return 1;

                                    // Primary: Status (handled above), Secondary: Table Name (Numerical)
                                    return a.tableName.localeCompare(b.tableName, undefined, { numeric: true, sensitivity: 'base' });
                                });

                            const targetTable = selectedId ? tables.find(t => t.id === selectedId) : null;
                            const isTargetBusyLong = targetTable && (targetTable.status !== 'available' && (targetTable.remainingMinutes || 0) > 15);
                            const bestCandidateId = (!selectedId || isTargetBusyLong) && candidates.length > 0 ? candidates[0].id : null;

                            return [...tables]
                                .sort((a, b) => a.tableName.localeCompare(b.tableName, undefined, { numeric: true, sensitivity: 'base' }))
                                .map((table) => {
                                    const isAvailable = table.status === 'available';
                                    const isUsed = table.status === 'in_use' || table.status === 'warning';
                                    const isWaitingPayment = table.status === 'waiting_payment';
                                    const isBooked = table.isBooked;
                                    const isTarget = table.id === selectedId;
                                    const canSelect = isAvailable || ((isUsed || isWaitingPayment) && !isBooked) || isTarget;
                                    const isBest = table.id === bestCandidateId;
                                    const currentCustomer = table.activeTransaction?.customerName;
                                    const progress = isUsed && table.remainingMinutes !== null ? Math.max(0, 100 - (table.remainingMinutes / 60) * 100) : 0;

                                    // Category specific colors
                                    const isVip = table.category?.toUpperCase().includes('VIP');
                                    const isCafe = table.category?.toUpperCase() === 'CAFE';

                                    return (
                                        <button
                                            key={table.id}
                                            disabled={!canSelect}
                                            onClick={() => setSelectedId(isTarget ? undefined : table.id)}
                                            className={`relative rounded-xl border-2 p-5 transition-all flex flex-col items-center group
                                            ${canSelect
                                                    ? isTarget
                                                        ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-50 shadow-md z-10'
                                                        : isBest
                                                            ? 'border-emerald-400 bg-emerald-50/10 hover:border-emerald-500 hover:shadow-lg'
                                                            : isVip
                                                                ? 'border-amber-100 bg-amber-50/30 hover:border-amber-300 hover:shadow-lg'
                                                                : isCafe
                                                                    ? 'border-rose-100 bg-rose-50/30 hover:border-rose-300 hover:shadow-lg'
                                                                    : 'border-slate-100 bg-slate-50/40 hover:border-indigo-200 hover:shadow-lg hover:bg-white'
                                                    : 'border-slate-50 bg-slate-50/50 opacity-40 grayscale-[0.8] cursor-not-allowed'
                                                }`}
                                        >
                                            <div className={`absolute top-3 right-3 transition-opacity ${isTarget ? 'opacity-100 text-indigo-600' : 'opacity-0 group-hover:opacity-100 text-slate-300'}`}>
                                                <CheckCircle2 className={`w-5 h-5`} />
                                            </div>

                                            <div className="absolute top-4 left-4 flex items-center gap-1.5 opacity-80">
                                                {getCategoryIcon(table.category)}
                                                <span className="text-[7px] font-bold uppercase text-slate-400 tracking-wider">{(table.category || 'REGULAR').replace('PS_', 'PS ')}</span>
                                            </div>

                                            <div className="flex-1 flex flex-col items-center justify-center py-4 w-full">
                                                <div className={`text-4xl font-bold tracking-tight mb-1 ${canSelect ? 'text-slate-900' : 'text-slate-300'}`}>
                                                    {table.tableName?.replace('Meja ', '') || table.id}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full shadow-sm animate-pulse ${isAvailable ? 'bg-emerald-500 shadow-emerald-200' : isUsed ? 'bg-amber-500 shadow-amber-200' : isWaitingPayment ? 'bg-indigo-500 shadow-indigo-200' : 'bg-slate-300'}`} />
                                                    <span className={`text-[8px] font-black uppercase tracking-widest ${isAvailable ? 'text-emerald-600' : isUsed ? 'text-amber-600' : isWaitingPayment ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                        {isWaitingPayment ? 'Checkout' : isUsed ? (table.status === 'warning' ? 'Ending' : 'Active') : table.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="w-full space-y-3 relative z-10">
                                                {isUsed && (
                                                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-1000 ${table.status === 'warning' ? 'bg-rose-500' : 'bg-amber-500'}`}
                                                            style={{ width: `${Math.min(100, progress)}%` }}
                                                        />
                                                    </div>
                                                )}

                                                <div className="flex flex-col gap-1.5">
                                                    {currentCustomer ? (
                                                        <div className="flex items-center justify-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-200/50">
                                                            <span className="text-[9px] font-bold text-slate-700 truncate">{currentCustomer}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-[8px] font-bold text-slate-300 text-center uppercase tracking-widest py-1">Ready</div>
                                                    )}

                                                    <div className="flex items-center justify-center gap-3">
                                                        {isUsed && table.remainingMinutes !== null && (
                                                            <div className="flex items-center gap-1 text-slate-500">
                                                                <Clock className={`w-3 h-3 ${table.status === 'warning' ? 'text-rose-500' : 'text-amber-500'}`} />
                                                                <span className="text-[10px] font-bold text-slate-600">{table.remainingMinutes}′</span>
                                                            </div>
                                                        )}
                                                        {isBooked && (
                                                            <div className="flex items-center gap-1 text-rose-500">
                                                                <AlertCircle className="w-3 h-3" />
                                                                <span className="text-[8px] font-bold uppercase">Reserved</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {isBest && !isTarget && (
                                                <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500" />
                                            )}
                                            {isBest && !isTarget && (
                                                <div className="absolute -top-px left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[7px] font-black px-2 py-0.5 rounded-b uppercase tracking-widest z-20 shadow-sm">
                                                    Recommend
                                                </div>
                                            )}
                                        </button>
                                    );
                                });
                        })()}
                    </div>

                    {tables.filter(t => t.status === 'available' || (t.status === 'in_use' && !t.isBooked)).length === 0 && (
                        <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
                            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Kapasitas Penuh</h3>
                            <p className="text-xs font-medium text-slate-500 mt-1">Seluruh meja sedang dalam penggunaan aktif atau telah dipesan.</p>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 flex-1">
                        <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[9px] font-bold text-indigo-800 uppercase tracking-widest leading-none">Smart Assistant</p>
                            <p className="text-[10px] font-medium text-slate-500 mt-1 leading-relaxed">Sistem menganalisa waktu tersisa untuk memberikan rekomendasi penugasan meja tercepat.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 md:flex-none px-6 py-3 bg-white text-slate-500 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-slate-100 border border-slate-200 transition-all"
                        >
                            BATAL
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!selectedId}
                            className={`flex-1 md:flex-none px-10 py-3 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm ${selectedId
                                ? 'bg-slate-900 text-white hover:bg-slate-800'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            KONFIRMASI PENUGASAN
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TableSelectionModal;
