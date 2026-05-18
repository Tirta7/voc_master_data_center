'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Check, X, MoveRight, Gamepad2, Coffee } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface TransferToBilliardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTransfer: (billiardTableId: number) => void;
    billiardTables: any[];
    cafeTable: any;
    isLoading?: boolean;
}

const TransferToBilliardModal: React.FC<TransferToBilliardModalProps> = ({ isOpen, onClose, onTransfer, billiardTables, cafeTable, isLoading }) => {
    const [targetId, setTargetId] = useState<number | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    useBodyScrollLock(isOpen);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            setTargetId(null);
            setIsConfirming(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Only allow occupied billiard tables (as backend requires an active session)
    const activeBilliardTables = billiardTables.filter(t => t.status !== 'available');
    const selectedTable = billiardTables.find(t => t.id === targetId);
    const selectedCustomer = selectedTable?.activeTransaction?.customerName || selectedTable?.currentCustomer || 'Guest';

    const handleTransfer = () => {
        if (targetId) onTransfer(targetId);
    };

    return (
        <div
            className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="
                w-full sm:max-w-lg sm:mx-4
                bg-white
                rounded-t-[2rem] sm:rounded-[2rem]
                max-h-[90dvh]
                overflow-hidden
                flex flex-col
                shadow-2xl
                animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300
                relative
            ">
                {/* ── SAFETY OVERLAY ────────────────────────────────────── */}
                {isLoading && (
                    <div className="absolute inset-0 z-[110] bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                        <p className="text-slate-900 font-bold uppercase tracking-widest text-[10px]">Memindahkan Billing...</p>
                    </div>
                )}
                <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-10 h-1 bg-slate-300 rounded-full" />
                </div>

                <div className="shrink-0 px-6 pt-4 pb-5 sm:pt-6">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-100">
                                <ArrowRightLeft className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 leading-tight">Gabung Billing</h2>
                                <p className="text-xs text-slate-400 font-medium">Pindahkan order ke meja billiard</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {selectedTable ? (
                        <div className="mt-4 flex items-center gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-100 animate-in fade-in duration-200">
                            <div className="flex-1 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Cafe</p>
                                <p className="font-black text-slate-700 text-sm">{cafeTable?.tableName}</p>
                            </div>
                            <div className="shrink-0">
                                <MoveRight className="w-5 h-5 text-amber-500" />
                            </div>
                            <div className="flex-1 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Billiard</p>
                                <p className="font-black text-indigo-700 text-sm">{selectedTable.tableName}</p>
                                <p className="text-[10px] font-bold text-indigo-400 truncate mt-0.5">{selectedCustomer}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <Coffee className="w-4 h-4 text-amber-500 shrink-0" />
                            <p className="text-xs text-slate-400 font-medium">
                                Pilih meja billiard yang sedang bermain untuk menggabungkan billing.
                            </p>
                        </div>
                    )}
                </div>

                <div className="shrink-0 px-6 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {activeBilliardTables.length} Meja Aktif
                        </span>
                        <div className="flex-1 h-px bg-slate-100" />
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pb-4">
                    {activeBilliardTables.length === 0 ? (
                        <div className="py-12 flex flex-col items-center text-center opacity-50">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                                <Gamepad2 className="w-7 h-7 text-slate-400" />
                            </div>
                            <p className="font-bold text-slate-500 text-sm">Tidak ada meja billiard aktif</p>
                            <p className="text-xs text-slate-400 mt-1">Order cafe hanya bisa dipindah ke meja billiard yang sedang bermain.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                            {activeBilliardTables.map((table) => {
                                const isSelected = targetId === table.id;
                                const customerName = table.activeTransaction?.customerName || table.currentCustomer || 'Guest';
                                return (
                                    <button
                                        key={table.id}
                                        onClick={() => {
                                            setTargetId(table.id);
                                            setIsConfirming(false);
                                        }}
                                        className={`relative flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-2xl border-2 transition-all active:scale-[0.97] ${isSelected
                                            ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200'
                                            : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md hover:shadow-slate-100'
                                            }`}
                                    >
                                        {isSelected && (
                                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                                                <Check className="w-2.5 h-2.5 text-indigo-600" />
                                            </div>
                                        )}
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                                            <Gamepad2 className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                                        </div>
                                        <div className="text-center w-full">
                                            <p className={`text-[11px] font-black tracking-tight leading-tight ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                                                {table.tableName}
                                            </p>
                                            <p className={`text-[8px] font-bold uppercase truncate w-full px-1 mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                {customerName}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex flex-col gap-3">
                    {isConfirming && selectedTable && (
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl animate-in slide-in-from-bottom-2 duration-200">
                            <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider mb-1">Konfirmasi Pemindahan</p>
                            <p className="text-xs text-amber-700 leading-snug">
                                Anda akan memindahkan order <span className="font-bold">{cafeTable?.tableName}</span> ke <span className="font-bold">{selectedTable.tableName}</span> ({selectedCustomer}).
                                <br />Yakin ini sudah benar?
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                if (isConfirming) setIsConfirming(false);
                                else onClose();
                            }}
                            className="flex-1 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-500 font-bold text-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
                        >
                            {isConfirming ? 'Batal' : 'Tutup'}
                        </button>
                        <button
                            disabled={!targetId || isLoading}
                            onClick={() => {
                                if (isConfirming) handleTransfer();
                                else setIsConfirming(true);
                            }}
                            className={`flex-[2] py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 ${targetId
                                ? isConfirming
                                    ? 'bg-green-600 text-white shadow-green-100 hover:bg-green-700'
                                    : 'bg-amber-500 text-white shadow-amber-100 hover:bg-amber-600'
                                : 'bg-slate-100 text-slate-300 shadow-none cursor-not-allowed'
                                }`}
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : isConfirming ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <ArrowRightLeft className="w-4 h-4" />
                            )}
                            {isLoading ? 'MEMPROSES...' : isConfirming ? 'Ya, Pindahkan Sekarang' : (targetId ? `Pilih ${selectedTable?.tableName}` : 'Pilih Meja Billiard')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransferToBilliardModal;
