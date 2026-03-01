'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMqtt } from '@/context/MqttContext';
import { Clock, DollarSign, ChevronRight, BellRing, History, X } from 'lucide-react';
import { useToast } from './ui/ToastProvider';

const TableExpiryCenter = () => {
    const [expiredTables, setExpiredTables] = useState<any[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const { showToast } = useToast();
    const { subscribe } = useMqtt();
    const router = useRouter();
    const notifiedTables = useRef<Set<number>>(new Set());
    const showToastRef = useRef(showToast);
    useEffect(() => { showToastRef.current = showToast; });

    useEffect(() => {
        return subscribe('billiard/tables/update', (updatedTable: any) => {
            if (updatedTable.type && updatedTable.type !== 'billiard') return;

            if (updatedTable.status === 'WAITING_PAYMENT' && !notifiedTables.current.has(updatedTable.id)) {
                setExpiredTables(prev => {
                    if (prev.find(t => t.id === updatedTable.id)) return prev;
                    return [updatedTable, ...prev];
                });
                showToastRef.current(
                    "Waktu Habis!",
                    `Meja ${updatedTable.tableName} waktu billiard selesai, Menunggu pembayaran.`,
                    "expiry",
                    updatedTable.id
                );
                const audio = new Audio('/sounds/notification.mp3');
                audio.play().catch(() => { });
                notifiedTables.current.add(updatedTable.id);
            }

            if (['AVAILABLE', 'IN_USE', 'WARNING'].includes(updatedTable.status)) {
                setExpiredTables(prev => prev.filter(t => t.id !== updatedTable.id));
                notifiedTables.current.delete(updatedTable.id);
            }
        });
    }, [subscribe]);

    const handleGoToBilling = (id: number) => {
        router.push(`/billing?tableId=${id}&type=billiard`);
    };

    const removeNotification = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setExpiredTables(prev => prev.filter(t => t.id !== id));
    };

    if (expiredTables.length === 0 && !isExpanded) return null;

    return (
        <div className="mx-4 mb-4 mt-2">
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className={`
                    w-full flex items-center justify-between p-4 rounded-3xl cursor-pointer transition-all duration-300 border
                    ${expiredTables.length > 0
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 animate-pulse'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400'}
                `}
            >
                <div className="flex items-center gap-3">
                    <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center
                        ${expiredTables.length > 0 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-slate-700'}
                    `}>
                        <BellRing className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Status Meja</p>
                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-tight">
                            {expiredTables.length} Meja Butuh Billing
                        </p>
                    </div>
                </div>
                <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
            </div>

            {isExpanded && (
                <div className="mt-3 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-4 duration-300">
                    {expiredTables.length === 0 ? (
                        <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-6 text-center">
                            <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Belum ada meja selesai</p>
                        </div>
                    ) : (
                        expiredTables.map((table) => (
                            <div
                                key={table.id}
                                onClick={() => handleGoToBilling(table.id)}
                                className="bg-slate-800/80 border border-slate-700 rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-amber-500/50 transition-all cursor-pointer"
                            >
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => removeNotification(e, table.id)}
                                        className="p-1 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                            <Clock className="w-5 h-5 text-amber-500 group-hover:text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-white truncate">{table.tableName}</p>
                                            <p className="text-[10px] text-amber-500 uppercase tracking-tight font-black">Waktu Habis</p>
                                        </div>
                                    </div>

                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-amber-500" />
                                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Menunggu Bayar</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default React.memo(TableExpiryCenter);
