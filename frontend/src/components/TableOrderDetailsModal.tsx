'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, CheckCircle2, Loader2, AlertTriangle, Ban, Trash2, Utensils, CheckCircle, ChevronDown } from 'lucide-react';
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
    const [expandedBundles, setExpandedBundles] = useState<Record<string, boolean>>({});

    const toggleBundle = (groupId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedBundles(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

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
                        (() => {
                            const groupedItems: any[] = [];
                            const renderedBundleIds = new Set<string>();

                            activeItems.forEach(item => {
                                if (item.bundleGroupId) {
                                    if (!renderedBundleIds.has(item.bundleGroupId)) {
                                        renderedBundleIds.add(item.bundleGroupId);
                                        const bundleItems = activeItems.filter(i => i.bundleGroupId === item.bundleGroupId);
                                        const headerItem = bundleItems.find(i => i.customName?.includes('[PAKET]')) || bundleItems[0];
                                        const components = bundleItems.filter(i => i.id !== headerItem.id);
                                        groupedItems.push({
                                            isBundleGroup: true,
                                            bundleGroupId: item.bundleGroupId,
                                            headerItem,
                                            components,
                                            id: headerItem.id
                                        });
                                    }
                                } else {
                                    groupedItems.push(item);
                                }
                            });

                            return groupedItems.map((group, idx) => {
                                const item = group.isBundleGroup ? group.headerItem : group;
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

                                const renderCard = () => (
                                    <div
                                        key={item.id || idx}
                                        onClick={() => !isPaid && onToggleItem(item.id)}
                                        className={`group relative flex flex-col p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${isPaid
                                            ? 'bg-emerald-50/30 border-emerald-100/40'
                                            : isSelected
                                                ? 'bg-indigo-50/50 border-indigo-200 shadow-sm ring-1 ring-indigo-200/50'
                                                : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Checkbox / Paid Indicator */}
                                            <div className="pt-0.5 shrink-0">
                                                {!isPaid ? (
                                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected
                                                        ? 'bg-indigo-600 border-indigo-600 scale-110'
                                                        : 'bg-white border-slate-300 group-hover:border-slate-400'
                                                        }`}>
                                                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                    </div>
                                                ) : (
                                                    <div className="w-5 h-5 rounded-md bg-emerald-100/80 flex items-center justify-center">
                                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0 pr-6">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className={`text-sm font-bold leading-tight ${isPaid ? 'text-slate-500' : 'text-slate-800'}`}>
                                                            {(item.customName || item.itemName || item.menuItem?.name || item.name || 'Menu').toUpperCase()}
                                                        </p>
                                                        {item.note && !group.isBundleGroup && (
                                                            <p className="text-[11px] text-amber-600 font-medium italic mt-0.5 truncate max-w-[200px] sm:max-w-full">
                                                                "{item.note}"
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                        <div className={`px-2 py-0.5 rounded-md text-sm font-black ${isPaid ? 'bg-emerald-100/50 text-emerald-600' : 'bg-slate-100 text-slate-700'}`}>
                                                            x{item.quantity}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mt-2.5">
                                                    <div className="flex items-center flex-wrap gap-1.5">
                                                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${statusBg} ${statusColor}`}>
                                                            {statusIcon}
                                                            {isPaid ? 'LUNAS' : displayStatus}
                                                        </div>
                                                        {item.station && (
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded-md">
                                                                {item.station}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Cancel Button */}
                                                    {onCancelItem && hasCancelPermission && !isPaid && !['DONE', 'SERVED', 'COMPLETED'].includes(s) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onCancelItem(item, s);
                                                            }}
                                                            className="p-1.5 -mr-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                            title="Batalkan Item"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {group.isBundleGroup && (
                                            <div className="absolute top-4 right-4">
                                                <button 
                                                    onClick={(e) => toggleBundle(group.bundleGroupId, e)} 
                                                    className={`p-1.5 rounded-lg transition-all ${isPaid ? 'hover:bg-emerald-100/50 text-emerald-600/50' : isSelected ? 'hover:bg-indigo-100/50 text-indigo-400' : 'hover:bg-slate-100 text-slate-400'}`}
                                                >
                                                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedBundles[group.bundleGroupId] !== false ? 'rotate-180' : ''}`} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );

                                if (group.isBundleGroup) {
                                    return (
                                        <div key={`bundle-${group.bundleGroupId}`} className="flex flex-col gap-1.5">
                                            {renderCard()}
                                            {expandedBundles[group.bundleGroupId] !== false && (
                                                <div className="pl-12 space-y-1.5 animate-in slide-in-from-top-2 duration-200 fade-in">
                                                    {group.components.map((comp: any) => {
                                                        const sComp = comp.status?.toUpperCase() || 'PENDING';
                                                        const isCompPaid = !!comp.isPaid;
                                                        
                                                        let compStatusIcon = <Clock className="w-3 h-3 text-slate-400" />;
                                                        let compStatusColor = "text-slate-500";
                                                        let compStatusBg = "bg-slate-50";

                                                        if (['PROCESSING', 'COOKING'].includes(sComp)) {
                                                            compStatusIcon = <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
                                                            compStatusColor = "text-blue-600";
                                                            compStatusBg = "bg-blue-50/50";
                                                        } else if (['DONE', 'SERVED', 'COMPLETED'].includes(sComp)) {
                                                            compStatusIcon = <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
                                                            compStatusColor = "text-emerald-600";
                                                            compStatusBg = "bg-emerald-50/50";
                                                        } else if (sComp === 'CANCEL_REQUESTED') {
                                                            compStatusIcon = <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse" />;
                                                            compStatusColor = "text-red-600";
                                                            compStatusBg = "bg-red-50 animate-pulse border border-red-100";
                                                        } else if (sComp === 'CANCEL_REJECTED') {
                                                            compStatusIcon = <Ban className="w-3 h-3 text-rose-500" />;
                                                            compStatusColor = "text-rose-600";
                                                            compStatusBg = "bg-rose-50";
                                                        }

                                                        const compDisplayStatus = {
                                                            'QUEUED': 'ANTRI',
                                                            'PENDING': 'ANTRI',
                                                            'PROCESSING': 'PROSES',
                                                            'COOKING': 'PROSES',
                                                            'DONE': 'SIAP',
                                                            'SERVED': 'SIAP',
                                                            'CANCEL_REQUESTED': 'BATAL?',
                                                            'CANCEL_REJECTED': 'DITOLAK'
                                                        }[sComp as string] || sComp;

                                                        return (
                                                            <div key={comp.id} className={`p-2.5 rounded-xl border flex flex-col gap-2 transition-all ${isSelected ? 'bg-indigo-50/30 border-indigo-100' : 'bg-slate-50/50 border-slate-100'}`}>
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex items-start gap-2">
                                                                        <div className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${isSelected ? 'bg-indigo-400' : 'bg-slate-300'}`}></div>
                                                                        <div>
                                                                            <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{(comp.customName || comp.menuItem?.name || 'Menu').toUpperCase()}</p>
                                                                            {comp.note && <p className="text-[10px] text-amber-600 font-medium italic mt-0.5">"{comp.note}"</p>}
                                                                        </div>
                                                                    </div>
                                                                    <div className={`text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm shrink-0 ${isSelected ? 'bg-white text-indigo-500' : 'bg-white text-slate-400'}`}>
                                                                        x{comp.quantity}
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-between items-center pl-3">
                                                                    <div className="flex items-center flex-wrap gap-1">
                                                                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider ${compStatusBg} ${compStatusColor}`}>
                                                                            {compStatusIcon}
                                                                            {isCompPaid ? 'LUNAS' : compDisplayStatus}
                                                                        </div>
                                                                        {comp.station && (
                                                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-white border border-slate-100 px-1.5 py-0.5 rounded-md">
                                                                                {comp.station}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {onCancelItem && hasCancelPermission && !isCompPaid && !['DONE', 'SERVED', 'COMPLETED'].includes(sComp) && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onCancelItem(comp, sComp);
                                                                            }}
                                                                            className="p-1 -mr-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
                                                                            title="Batalkan Item"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                return renderCard();
                            });
                        })()
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
