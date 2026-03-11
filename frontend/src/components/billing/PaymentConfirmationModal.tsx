import React from 'react';
import { Printer, CheckCircle, X, Wallet, CreditCard } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface PaymentConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    onPrint: () => void;
    data: {
        total: number;
        method: string;
        payAmount: number;
        change: number;
    };
    isLoading?: boolean;
}

export default function PaymentConfirmationModal({ isOpen, onClose, onConfirm, onPrint, data, isLoading }: PaymentConfirmationModalProps) {
    useBodyScrollLock(isOpen);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 print:hidden overscroll-contain">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">Konfirmasi Pembayaran</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8">
                    <div className="space-y-6">
                        {/* Summary Card */}
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tagihan</span>
                                <span className="text-xl font-black text-slate-800 font-mono">
                                    Rp {Math.round(data.total).toLocaleString()}
                                </span>
                            </div>
                            <div className="w-full border-t border-slate-200 border-dashed"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metode</span>
                                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-200">
                                    <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                                    <span className="text-sm font-bold text-slate-700 uppercase">{data.method}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Diterima</span>
                                <span className="text-lg font-bold text-slate-800 font-mono">
                                    Rp {Math.round(data.payAmount).toLocaleString()}
                                </span>
                            </div>
                            {data.change > 0 && (
                                <div className="bg-emerald-100/50 p-3 rounded-xl flex justify-between items-center border border-emerald-100">
                                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Kembalian</span>
                                    <span className="text-lg font-black text-emerald-600 font-mono">
                                        Rp {Math.round(data.change).toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>

                        <p className="text-center text-sm text-slate-500 font-medium">
                            Pastikan data pembayaran sudah sesuai sebelum melanjutkan.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 mt-8">
                        <button
                            onClick={onPrint}
                            className="col-span-2 py-4 rounded-xl bg-slate-100 text-slate-700 font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
                        >
                            <Printer className="w-4 h-4" /> Cetak Struk / Bill
                        </button>

                        <button
                            onClick={onClose}
                            className="py-4 rounded-xl border-2 border-slate-100 text-slate-400 font-bold hover:bg-slate-50 hover:text-slate-600 transition-all uppercase tracking-wider text-xs"
                        >
                            Batal
                        </button>

                        <button
                            disabled={isLoading}
                            onClick={onConfirm}
                            className="py-4 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wider text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <CheckCircle className="w-4 h-4" />
                            )}
                            {isLoading ? 'Memproses...' : 'Bayar Sekarang'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
