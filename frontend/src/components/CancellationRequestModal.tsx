'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, User, FileText, Send, Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface CancellationRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { reason: string; waiterName: string; managerPin?: string }) => void;
    itemName: string;
    isProcessing: boolean;
    isLoading?: boolean;
}

const CancellationRequestModal: React.FC<CancellationRequestModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    itemName,
    isProcessing,
    isLoading
}) => {
    useBodyScrollLock(isOpen);
    const { user } = useAuth();
    const [reason, setReason] = useState('');
    const [waiterName, setWaiterName] = useState(user?.name || '');
    const [managerPin, setManagerPin] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Sync waiter name if user changes or modal opens
    React.useEffect(() => {
        if (isOpen && user) {
            setWaiterName(user.name);
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!reason.trim()) {
            setError('Mohon isi alasan pembatalan.');
            return;
        }
        if (!waiterName.trim()) {
            setError('Mohon isi nama waiter/kasir.');
            return;
        }
        if (isProcessing && !managerPin.trim()) {
            setError('Mohon masukkan PIN Manager/Supervisor.');
            return;
        }

        onSubmit({ reason, waiterName, managerPin: isProcessing ? managerPin : undefined });
        setReason('');
        setWaiterName('');
        setManagerPin('');
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60  transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            ></div>

            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 z-[10000]">
                {/* Header */}
                <div className="bg-rose-50 border-b border-rose-100 p-5 flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white text-rose-600 flex items-center justify-center shadow-sm border border-rose-100 group-hover:scale-110 transition-transform">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-lg leading-tight uppercase tracking-tight">Request Pembatalan</h3>
                            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-0.5">Konfirmasi diperlukan</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white text-slate-400 hover:text-slate-600 transition-all active:scale-90 shadow-sm"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
                    {/* Item Info */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Item yang dibatalkan</p>
                        <p className="font-black text-slate-800 uppercase tracking-tight">{itemName}</p>
                    </div>

                    {isProcessing && (
                        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                            <div>
                                <p className="text-xs font-black text-amber-700 uppercase tracking-wide">Peringatan Dapur</p>
                                <p className="text-[10px] font-bold text-amber-600/80 leading-relaxed uppercase mt-0.5">
                                    Makanan sedang diproses! Pembatalan membutuhkan PIN Supervisor/Manajer.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Form Inputs */}
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                <FileText className="w-3 h-3" />
                                Alasan Pembatalan
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Kenapa pesanan dibatalkan? (misal: Salah input, Stok habis)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-slate-400 min-h-[100px] resize-none uppercase"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                <User className="w-3 h-3" />
                                Nama Waiter / Kasir
                            </label>
                            <input
                                type="text"
                                value={waiterName}
                                readOnly
                                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-500 cursor-not-allowed uppercase"
                            />
                        </div>

                        {isProcessing && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                    <Lock className="w-3 h-3" />
                                    PIN Manager / Supervisor
                                </label>
                                <input
                                    type="password"
                                    value={managerPin}
                                    onChange={(e) => setManagerPin(e.target.value)}
                                    placeholder="Masukkan PIN Otorisasi"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-slate-300"
                                    maxLength={6}
                                />
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="text-xs font-black text-rose-500 bg-rose-50 px-3 py-2 rounded-lg border border-rose-100 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-3.5 rounded-xl border border-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-rose-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Send className="w-3.5 h-3.5" />
                            )}
                            {isLoading ? 'MENGIRIM...' : 'Kirim Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CancellationRequestModal;
