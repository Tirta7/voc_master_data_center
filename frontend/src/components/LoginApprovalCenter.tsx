'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { socket } from '@/lib/socket';
import { Users, CheckCircle2, XCircle, Clock, ShieldAlert, ChevronRight, Loader2, UserPlus } from 'lucide-react';
import { useToast } from './ui/ToastProvider';


const LoginApprovalCenter = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const { showToast } = useToast();

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/auth/access-requests/pending`);
            setRequests(response.data);
        } catch (error) {
            console.error('Failed to fetch access requests:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();

        socket.on('new_access_request', (request) => {
            setRequests(prev => [request, ...prev]);
            showToast("Permintaan Akses Baru", `${request.employeeName} meminta login.`, "info");
        });

        socket.on('access_request_handled', ({ requestId }) => {
            setRequests(prev => prev.filter(r => r.id !== requestId));
        });

        return () => {
            socket.off('new_access_request');
            socket.off('access_request_handled');
        };
    }, []);

    const handleAction = async (id: number, action: 'approve' | 'deny', employeeName: string) => {
        try {
            await axios.post(`/auth/access-requests/${id}/${action}`, {});

            setRequests(prev => prev.filter(r => r.id !== id));
            showToast(
                action === 'approve' ? "Akses Disetujui" : "Akses Ditolak",
                `${employeeName} telah ${action === 'approve' ? 'diizinkan' : 'ditolak'} masuk.`,
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
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 animate-pulse'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400'}
                `}
            >
                <div className="flex items-center gap-3">
                    <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center
                        ${requests.length > 0 ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-slate-700'}
                    `}>
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Persetujuan Akses</p>
                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-tight">
                            {requests.length} Permintaan Menunggu
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
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Tidak ada permintaan aktif</p>
                        </div>
                    ) : (
                        requests.map((req) => (
                            <div key={req.id} className="bg-slate-800/80 border border-slate-700 rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-indigo-500/50 transition-all">
                                {req.isOutOfShift && (
                                    <div className="absolute top-0 right-0 px-3 py-1 bg-rose-500 text-[8px] font-black text-white rounded-bl-xl uppercase tracking-widest">
                                        LUAR JAM KERJA
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center shrink-0 border border-indigo-500/30">
                                            <UserPlus className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-white truncate">{req.employeeName}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{req.roleName} • {req.username}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <div className={`px-3 py-1.5 rounded-xl flex items-center gap-2 text-[10px] font-bold uppercase border ${req.isOutOfShift ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-slate-700/50 border-slate-600 text-slate-400'}`}>
                                            <Clock className="w-3.5 h-3.5" />
                                            {req.shiftTimeRange || 'Shift Belum Diatur'}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <button
                                            onClick={() => handleAction(req.id, 'deny', req.employeeName)}
                                            className="bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <XCircle className="w-4 h-4" /> Tolak
                                        </button>
                                        <button
                                            onClick={() => handleAction(req.id, 'approve', req.employeeName)}
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

export default React.memo(LoginApprovalCenter);
