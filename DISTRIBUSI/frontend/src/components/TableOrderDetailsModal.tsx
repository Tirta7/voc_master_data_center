'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, CheckCircle2, Loader2, AlertTriangle, Ban, Trash2, Utensils, CheckCircle } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface TableOrderDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableName: string;
    orderItems: any[];
    selectedItemIds: number[];
    onToggleItem: (itemId: number) => void;
    onCancelItem?: (item: any, status: string) => void;
    hasCancelPermission?: boolean;
}

const TableOrderDetailsModal: React.FC<TableOrderDetailsModalProps> = ({
    isOpen,
    onClose,
    tableName,
    orderItems = [],
    selectedItemIds = [],
    onToggleItem,
    onCancelItem,
    hasCancelPermission = false
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useBodyScrollLock(isOpen && mounted);

    useEffect(() => {
        if (!isOpen) {
            // No action needed here as useBodyScrollLock handles it
        }
    }, [isOpen]);

    if (!mounted || !isOpen) return null;

    const activeItems = (orderItems || []).filter(i => i.status?.toUpperCase() !== 'CANCELLED');

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-start bg-white sticky top-0 z-10">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="p-2 bg-indigo-50 rounded-xl">
                                <Utensils className="w-5 h-5 text-indigo-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Daftar Pesanan</h3>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-0.5">{tableName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-50 text-slate-300 hover:text-slate-600 rounded-2xl transition-all active:scale-90"
                    >
                        <X className="w-7 h-7" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-8 py-4 space-y-3 no-scrollbar pb-10">
                    {activeItems.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-100">
                                <Utensils className="w-8 h-8 text-slate-200" />
                            </div>
                            <p className="font-black text-slate-300 uppercase tracking-widest text-[10px]">Belum ada pesanan aktif</p>
                        </div>
                    ) : (
                        activeItems.map((item, idx) => {
                            const isPaid = !!item.isPaid;
                            const isSelected = selectedItemIds.includes(item.id);
                            const s = item.status?.toUpperCase() || 'PENDING';

                            // Status Config
                            let statusIcon = <Clock className="w-3.5 h-3.5 text-slate-400" />;
                            let statusColor = "text-slate-500";
                            let statusBg = "bg-slate-50";

                            if (['PROCESSING', 'COOKING'].includes(s)) {
                                statusIcon = <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />;
                                statusColor = "text-blue-600";
                                statusBg = "bg-blue-50/50";
                            } else if (['DONE', 'SERVED', 'COMPLETED'].includes(s)) {
                                statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
                                statusColor = "text-emerald-600";
                                statusBg = "bg-emerald-50/50";
                            } else if (s === 'CANCEL_REQUESTED') {
                                statusIcon = <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />;
                                statusColor = "text-red-600";
                                statusBg = "bg-red-50 animate-pulse border border-red-100";
                            } else if (s === 'CANCEL_REJECTED') {
                                statusIcon = <Ban className="w-3.5 h-3.5 text-rose-500" />;
                                statusColor = "text-rose-600";
                                statusBg = "bg-rose-50";
                            }

                            const displayStatus = {
                                'QUEUED': 'ANTRI',
                                'PENDING': 'ANTRI',
                                'PROCESSING': 'PROSES',
                                'COOKING': 'PROSES',
                                'DONE': 'SIAP',
                                'SERVED': 'SIAP',
                                'CANCEL_REQUESTED': 'BATAL?',
                                'CANCEL_REJECTED': 'DITOLAK'
                            }[s as string] || s;

                            return (
                                <div
                                    key={item.id || idx}
                                    onClick={() => !isPaid && onToggleItem(item.id)}
                                    className={`group flex items-center justify-between gap-4 p-5 rounded-[1.5rem] border transition-all cursor-pointer ${isPaid
                                        ? 'bg-emerald-50/40 border-emerald-100/50 opacity-80'
                                        : isSelected
                                            ? 'bg-indigo-50 border-indigo-200 shadow-xl shadow-indigo-100/30 ring-2 ring-indigo-200/20 active:scale-[0.98]'
                                            : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100 active:scale-[0.99]'
                                        }`}
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        {/* Selection Indicator */}
                                        {!isPaid && (
                                            <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${isSelected
                                                ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200 scale-110'
                                                : 'bg-white border-slate-200 group-hover:border-slate-400'
                                                }`}>
                                                {isSelected && <div className="w-2 h-2 bg-white rounded-full animate-in zoom-in duration-300"></div>}
                                            </div>
                                        )}
                                        {isPaid && (
                                            <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                                <div className="p-1 bg-emerald-100 rounded-lg">
                                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                                </div>
                                            </div>
                                        )}

                                        <div className="min-w-0">
                                            <p className={`text-sm font-black tracking-tight leading-[1.1] mb-1.5 ${isPaid ? 'text-slate-400' : 'text-slate-800'
                                                }`}>
                                                {(item.menuItem?.name || item.name || 'Menu').toUpperCase()}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${statusBg} ${statusColor}`}>
                                                    {statusIcon}
                                                    {isPaid ? 'SUDAH BAYAR' : displayStatus}
                                                </div>
                                                {item.station && (
                                                    <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest">{item.station}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className={`px-4 py-2 rounded-2xl text-base font-black transition-all ${isPaid ? 'bg-emerald-50 text-emerald-400' : 'bg-slate-100 text-slate-800'
                                            }`}>
                                            x{item.quantity}
                                        </div>
                                        {onCancelItem && hasCancelPermission && !isPaid && !['DONE', 'SERVED', 'COMPLETED'].includes(s) && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onCancelItem(item, s);
                                                }}
                                                className="p-3 text-slate-100 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all active:scale-90"
                                                title="Batalkan Item"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col gap-4">
                    {selectedItemIds.length > 0 && (
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedItemIds.length} Item Terpilih</span>
                            </div>
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Siap Dicicil</span>
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-[1.5rem] font-black tracking-[0.3em] text-[10px] shadow-2xl shadow-slate-200 active:scale-[0.98] transition-all uppercase"
                    >
                        Tutup Detail
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TableOrderDetailsModal;
