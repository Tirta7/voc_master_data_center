import React, { useState } from 'react';
import { Printer, CheckCircle, CheckCircle2, X, CreditCard, PartyPopper, Bluetooth } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { printReceiptBluetooth } from '@/utils/bluetoothPrinter';

interface PaymentConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    onPrint: () => void;
    onDone: () => void;
    data: {
        total: number;
        method: string;
        payAmount: number;
        change: number;
    };
    isLoading?: boolean;
    isPaid?: boolean;
    transaction?: any;
    settings?: any;
    customerRatingStatus?: 'PENDING' | 'SUBMITTED';
}

export default function PaymentConfirmationModal({ isOpen, onClose, onConfirm, onPrint, onDone, data, isLoading, isPaid, transaction, settings, customerRatingStatus }: PaymentConfirmationModalProps) {
    useBodyScrollLock(isOpen);
    const [isBluetoothPrinting, setIsBluetoothPrinting] = useState(false);
    const [paperSize, setPaperSize] = useState<58 | 80>(58);

    const handleBluetoothPrint = async () => {
        try {
            setIsBluetoothPrinting(true);
            await printReceiptBluetooth(transaction, settings, paperSize, data.method, data.payAmount, data.change);
        } catch (error: any) {
            alert(error.message || 'Gagal mencetak struk bluetooth');
        } finally {
            setIsBluetoothPrinting(false);
        }
    };
    useBodyScrollLock(isOpen);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60  animate-in fade-in duration-200 print:hidden overscroll-contain">
            <div className="bg-white rounded-2xl shadow-2xl max-w-[280px] w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200">

                {isPaid ? (
                    /* ===== MODE SUKSES: Setelah pembayaran berhasil ===== */
                    <>
                        {/* Header Sukses */}
                        <div className="bg-emerald-50 p-3 px-4 border-b border-emerald-100 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                </div>
                                <h3 className="text-sm font-black text-emerald-700 uppercase tracking-wide">Pembayaran Sukses!</h3>
                            </div>
                        </div>

                        {/* Body Sukses */}
                        <div className="p-4">
                            {/* Summary Sukses */}
                            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 space-y-2 mb-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Dibayar</span>
                                    <span className="text-lg font-black text-emerald-700 font-mono">
                                        Rp {Math.round(data.total).toLocaleString()}
                                    </span>
                                </div>
                                <div className="w-full border-t border-emerald-200 border-dashed"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metode</span>
                                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-emerald-200">
                                        <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                                        <span className="text-sm font-bold text-slate-700 uppercase">{data.method}</span>
                                    </div>
                                </div>
                                {data.change > 0 && (
                                    <div className="bg-emerald-100 p-2.5 rounded-lg flex justify-between items-center border border-emerald-200 mt-2">
                                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Kembalian</span>
                                        <span className="text-base font-black text-emerald-700 font-mono">
                                            Rp {Math.round(data.change).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <p className="text-center text-[10px] text-slate-400 font-medium mb-5">
                                Silakan cetak struk lalu tekan Selesai.
                            </p>

                            {/* Actions Sukses */}
                            <div className="flex flex-col gap-2 mt-4">
                                <div className="flex items-stretch gap-1.5">
                                    <button
                                        onClick={onPrint}
                                        className="flex-1 py-2.5 rounded-lg bg-stone-100 text-stone-600 font-bold hover:bg-stone-200 transition-all active:scale-95 flex items-center justify-center gap-1 uppercase tracking-wider text-[9px]"
                                    >
                                        <Printer className="w-3 h-3" /> PDF/USB
                                    </button>
                                    
                                    <div className="flex bg-stone-100 rounded-lg p-0.5">
                                        <button onClick={() => setPaperSize(58)} className={`px-1.5 rounded-md text-[9px] font-bold transition-all ${paperSize === 58 ? 'bg-white shadow-sm text-indigo-600' : 'text-stone-400'}`}>58</button>
                                        <button onClick={() => setPaperSize(80)} className={`px-1.5 rounded-md text-[9px] font-bold transition-all ${paperSize === 80 ? 'bg-white shadow-sm text-indigo-600' : 'text-stone-400'}`}>80</button>
                                    </div>

                                    <button
                                        onClick={handleBluetoothPrint}
                                        disabled={isBluetoothPrinting}
                                        className="flex-[1.5] py-2.5 rounded-lg bg-indigo-600 text-white font-black hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-1.5 uppercase tracking-wider text-[9px] disabled:opacity-50"
                                    >
                                        {isBluetoothPrinting ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Bluetooth className="w-3 h-3" />}
                                        {isBluetoothPrinting ? 'Koneksi...' : 'Cetak BT'}
                                    </button>
                                </div>

                                <button
                                    onClick={onDone}
                                    className="py-2.5 rounded-lg border border-emerald-200 text-emerald-600 font-bold hover:bg-emerald-50 transition-all uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5"
                                >
                                    <CheckCircle2 className="w-3 h-3" /> Selesai
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* ===== MODE KONFIRMASI: Sebelum pembayaran ===== */
                    <>
                        {/* Header */}
                        <div className="bg-slate-50 p-3 px-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Konfirmasi</h3>
                            <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4">
                            <div className="space-y-4">
                                {/* Rating Status Badge */}
                                {customerRatingStatus && (
                                    <div className={`text-[10px] font-black uppercase tracking-widest p-2 rounded-lg text-center flex items-center justify-center gap-2 ${customerRatingStatus === 'SUBMITTED' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600 animate-pulse'}`}>
                                        {customerRatingStatus === 'SUBMITTED' ? (
                                            <><CheckCircle2 className="w-3.5 h-3.5" /> Customer Sudah Menilai</>
                                        ) : (
                                            <>Menunggu Penilaian Customer...</>
                                        )}
                                    </div>
                                )}

                                {/* Summary Card */}
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2.5">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tagihan</span>
                                        <span className="text-lg font-black text-slate-800 font-mono">
                                            Rp {Math.round(data.total).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="w-full border-t border-slate-200 border-dashed"></div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metode</span>
                                        <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                            <CreditCard className="w-3 h-3 text-indigo-500" />
                                            <span className="text-[10px] font-bold text-slate-700 uppercase">{data.method}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diterima</span>
                                        <span className="text-base font-bold text-slate-800 font-mono">
                                            Rp {Math.round(data.payAmount).toLocaleString()}
                                        </span>
                                    </div>
                                    {data.change > 0 && (
                                        <div className="bg-emerald-100/50 p-2.5 rounded-lg flex justify-between items-center border border-emerald-100 mt-2">
                                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Kembalian</span>
                                            <span className="text-base font-black text-emerald-600 font-mono">
                                                Rp {Math.round(data.change).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <p className="text-center text-[10px] text-slate-500 font-medium leading-snug">
                                    Pastikan pembayaran sesuai sebelum melanjutkan.
                                </p>
                            </div>

                            {/* Actions - NO PRINT BUTTON YET */}
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <button
                                    onClick={onClose}
                                    className="py-2.5 rounded-lg border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all uppercase tracking-wider text-[10px]"
                                >
                                    Batal
                                </button>

                                <button
                                    disabled={isLoading}
                                    onClick={onConfirm}
                                    className="py-2.5 rounded-lg bg-indigo-600 text-white font-black hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-1.5 uppercase tracking-wider text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-3 h-3" />
                                    )}
                                    {isLoading ? 'Tunggu...' : 'Bayar'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
