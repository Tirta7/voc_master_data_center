'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Check, X, MoveRight, Gamepad2 } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface MoveTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMove: (toTableId: number) => void;
    tables: any[];
    currentTableId: number;
    isLoading?: boolean;
}

const MoveTableModal: React.FC<MoveTableModalProps> = ({ isOpen, onClose, onMove, tables, currentTableId, isLoading }) => {
    const [targetId, setTargetId] = useState<number | null>(null);

    useBodyScrollLock(isOpen);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            setTargetId(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const currentTable = tables.find(t => t.id === currentTableId);
    const availableTables = tables.filter(t => t.id !== currentTableId && t.status === 'available');
    const selectedTable = tables.find(t => t.id === targetId);

    const handleMove = () => {
        if (targetId) onMove(targetId);
    };

    return (
        /* ── BACKDROP ─────────────────────────────────────────────── */
        <div
            className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/*
             * Mobile  → bottom-sheet, max 90dvh
             * Desktop → centered card, max-w-lg
             */}
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
                        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="text-slate-900 font-bold uppercase tracking-widest text-[10px]">Memindahkan Meja...</p>
                    </div>
                )}
                {/* ── DRAG HANDLE (mobile only) ──────────────────────── */}
                <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-10 h-1 bg-slate-300 rounded-full" />
                </div>

                {/* ── HEADER ────────────────────────────────────────── */}
                <div className="shrink-0 px-6 pt-4 pb-5 sm:pt-6">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <ArrowRightLeft className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 leading-tight">Pindah Meja</h2>
                                <p className="text-xs text-slate-400 font-medium">Pilih meja tujuan yang tersedia</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Move preview banner */}
                    {selectedTable ? (
                        <div className="mt-4 flex items-center gap-3 p-3 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in fade-in duration-200">
                            <div className="flex-1 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Dari</p>
                                <p className="font-black text-slate-700 text-sm">{currentTable?.tableName || `Meja ${currentTableId}`}</p>
                            </div>
                            <div className="shrink-0">
                                <MoveRight className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div className="flex-1 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Ke</p>
                                <p className="font-black text-indigo-700 text-sm">{selectedTable.tableName}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <Gamepad2 className="w-4 h-4 text-slate-400 shrink-0" />
                            <p className="text-xs text-slate-400 font-medium">
                                Memindahkan billing dari{' '}
                                <span className="font-bold text-slate-600">{currentTable?.tableName || `Meja ${currentTableId}`}</span>{' '}
                                ke meja baru.
                            </p>
                        </div>
                    )}
                </div>

                {/* ── DIVIDER ───────────────────────────────────────── */}
                <div className="shrink-0 px-6 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {availableTables.length} Meja Tersedia
                        </span>
                        <div className="flex-1 h-px bg-slate-100" />
                    </div>
                </div>

                {/* ── TABLE GRID ────────────────────────────────────── */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pb-4">
                    {availableTables.length === 0 ? (
                        <div className="py-12 flex flex-col items-center text-center opacity-50">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                                <Gamepad2 className="w-7 h-7 text-slate-400" />
                            </div>
                            <p className="font-bold text-slate-500 text-sm">Tidak ada meja kosong</p>
                            <p className="text-xs text-slate-400 mt-1">Semua meja sedang digunakan.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                            {availableTables.map((table) => {
                                const isSelected = targetId === table.id;
                                return (
                                    <button
                                        key={table.id}
                                        onClick={() => setTargetId(table.id)}
                                        className={`relative flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-2xl border-2 transition-all active:scale-[0.97] ${isSelected
                                            ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200'
                                            : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md hover:shadow-slate-100'
                                            }`}
                                    >
                                        {/* Check mark when selected */}
                                        {isSelected && (
                                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                                                <Check className="w-2.5 h-2.5 text-indigo-600" />
                                            </div>
                                        )}
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                                            <Gamepad2 className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                                        </div>
                                        <span className={`text-[11px] font-black tracking-tight text-center leading-tight ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                                            {table.tableName}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── FOOTER ACTIONS ────────────────────────────────── */}
                <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-500 font-bold text-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
                    >
                        Batal
                    </button>
                    <button
                        disabled={!targetId || isLoading}
                        onClick={handleMove}
                        className={`flex-[2] py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 ${targetId
                            ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'
                            : 'bg-slate-100 text-slate-300 shadow-none cursor-not-allowed'
                            }`}
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <ArrowRightLeft className="w-4 h-4" />
                        )}
                        {isLoading ? 'MEMPROSES...' : (targetId ? `Pindah ke ${selectedTable?.tableName}` : 'Pilih Meja Tujuan')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MoveTableModal;
