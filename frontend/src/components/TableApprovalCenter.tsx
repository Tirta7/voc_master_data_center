'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { socket } from '@/lib/socket';
import { 
    Users, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    ShieldAlert, 
    ChevronRight, 
    Monitor,
    LayoutDashboard,
    Coffee
} from 'lucide-react';
import { useToast } from './ui/ToastProvider';

const TableApprovalCenter = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const { showToast } = useToast();

    const fetchRequests = async () => {
        try {
            const response = await axios.get(`/approval?status=PENDING&moduleType=TABLE_ACCESS`);
            setRequests(response.data);
        } catch (error) {
            console.error('Failed to fetch table access requests:', error);
        }
    };

    useEffect(() => {
        fetchRequests();

        socket.on('new_approval_request', (request) => {
            if (request.moduleType === 'TABLE_ACCESS') {
                setRequests(prev => [request, ...prev]);
                showToast("Izin Meja Baru", `${request.metadata.employeeName} meminta izin akses ${request.metadata.tableName}.`, "info");
            }
        });

        socket.on('approval_finalized', (payload) => {
            setRequests(prev => prev.filter(r => r.id !== payload.requestId));
        });

        return () => {
            socket.off('new_approval_request');
            socket.off('approval_finalized');
        };
    }, []);

    const handleAction = async (id: number, action: 'approve' | 'reject', employeeName: string) => {
        try {
            await axios.post(`/approval/${id}/${action}`, {});
            setRequests(prev => prev.filter(r => r.id !== id));
            showToast(
                action === 'approve' ? "Izin Diberikan" : "Izin Ditolak",
                `Akses meja untuk ${employeeName} telah ${action === 'approve' ? 'disetujui' : 'ditolak'}.`,
                action === 'approve' ? "info" : "warning"
            );
        } catch (error) {
            showToast("Gagal", "Gagal memproses permintaan.", "warning");
        }
    };

    if (requests.length === 0 && !isExpanded) return null;

    return (
        <div className="mx-4 mb-4 mt-2">
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className={`
                    w-full flex items-center justify-between p-4 rounded-3xl cursor-pointer transition-all duration-300 border
                    ${requests.length > 0
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 animate-pulse'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400'}
                `}
            >
                <div className="flex items-center gap-3">
                    <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center
                        ${requests.length > 0 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-slate-700'}
                    `}>
                        <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Izin Akses Meja</p>
                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-tight">
                            {requests.length} Permintaan Meja
                        </p>
                    </div>
                </div>
                <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
            </div>

            {isExpanded && (
                <div className="mt-3 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-4 duration-300">
                    {requests.length === 0 ? (
                        <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-6 text-center">
                            <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Tidak ada permintaan meja</p>
                        </div>
                    ) : (
                        requests.map((req) => (
                            <div key={req.id} className="bg-slate-800/80 border border-slate-700 rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-amber-500/50 transition-all">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0 border border-amber-500/30">
                                            {req.metadata.tableType === 'BILLIARD' ? <LayoutDashboard className="w-5 h-5 text-amber-400" /> : <Coffee className="w-5 h-5 text-amber-400" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-white truncate">{req.metadata.employeeName}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Minta Akses {req.metadata.tableName}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <button
                                            onClick={() => handleAction(req.id, 'reject', req.metadata.employeeName)}
                                            className="bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <XCircle className="w-4 h-4" /> Tolak
                                        </button>
                                        <button
                                            onClick={() => handleAction(req.id, 'approve', req.metadata.employeeName)}
                                            className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/30 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                                        >
                                            <CheckCircle2 className="w-4 h-4" /> Izinkan
                                        </button>
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

export default React.memo(TableApprovalCenter);
