'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { X, Receipt, Printer, AlertCircle, Bluetooth } from 'lucide-react';
import ThermalReceipt from './ThermalReceipt';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { printReceiptBluetooth } from '@/utils/bluetoothPrinter';

interface TransactionReprintModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactionId: number | null;
}

const TransactionReprintModal: React.FC<TransactionReprintModalProps> = ({ isOpen, onClose, transactionId }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isBluetoothPrinting, setIsBluetoothPrinting] = useState(false);
    const [paperSize, setPaperSize] = useState<58 | 80>(58);

    useEffect(() => {
        setMounted(true);
    }, []);

    useBodyScrollLock(isOpen && mounted);

    useEffect(() => {
        if (isOpen && transactionId) {
            fetchData();
        } else {
            setData(null);
            setLoading(true);
            setError(null);
        }
    }, [isOpen, transactionId]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {

            const [txRes, settingsRes] = await Promise.all([
                axios.get(`/transactions/${transactionId}`),
                axios.get(`/settings`)
            ]);

            setData(txRes.data);
            setSettings(settingsRes.data);
        } catch (err: any) {
            console.error('Failed to fetch reprint data:', err);
            setError(err.response?.data?.message || 'Gagal memuat data invoice.');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        // beforeprint dipanggil SEBELUM browser menghitung layout print
        // Ini cara yang benar untuk memaksa ukuran halaman
        const handleBeforePrint = () => {
            document.documentElement.style.width = '80mm';
            document.documentElement.style.maxWidth = '80mm';
            document.documentElement.style.overflow = 'visible';
            document.body.style.width = '80mm';
            document.body.style.maxWidth = '80mm';
            document.body.style.overflow = 'visible';
        };

        const handleAfterPrint = () => {
            // Kembalikan semua style ke nilai asli setelah print selesai
            document.documentElement.style.width = '';
            document.documentElement.style.maxWidth = '';
            document.documentElement.style.overflow = '';
            document.body.style.width = '';
            document.body.style.maxWidth = '';
            document.body.style.overflow = '';
            window.removeEventListener('beforeprint', handleBeforePrint);
            window.removeEventListener('afterprint', handleAfterPrint);
        };

        window.addEventListener('beforeprint', handleBeforePrint);
        window.addEventListener('afterprint', handleAfterPrint);
        window.print();
    };

    const handleBluetoothPrint = async () => {
        if (!data) return;
        try {
            setIsBluetoothPrinting(true);
            await printReceiptBluetooth(data, settings, paperSize, '', 0, 0);
        } catch (err: any) {
            alert(err.message || 'Gagal mencetak struk bluetooth');
        } finally {
            setIsBluetoothPrinting(false);
        }
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 reprint-modal-portal">
            <style jsx global>{`
                @media print {
                    /* === @page: sama persis dengan ThermalReceipt.tsx === */
                    @page { 
                        margin: 0; 
                        size: 80mm auto;
                    }
                    
                    /* Sembunyikan semua kecuali portal print */
                    body > *:not(.reprint-modal-portal) {
                        display: none !important;
                    }
                    .reprint-modal-portal > *:not(.print-visible-modal-container) {
                        display: none !important;
                    }

                    /* Ubah portal dari fixed (viewport lebar) ke static (document flow 80mm)
                       agar mengikuti body 80mm, bukan lebar monitor */
                    .reprint-modal-portal {
                        position: static !important;
                        display: block !important;
                        width: 80mm !important;
                        height: auto !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        inset: unset !important;
                    }

                    /* === html, body: sama persis dengan ThermalReceipt.tsx === */
                    html, body { 
                        margin: 0 !important; 
                        padding: 0 !important;
                        height: auto !important;
                        background: white !important; 
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    /* === .receipt-container: sama persis dengan ThermalReceipt.tsx === */
                    .receipt-container {
                        width: 76mm !important;
                        padding: 5mm 2mm 1mm 2mm !important;
                        margin: 0 auto !important;
                        border: none !important;
                        /* Thermal printer = continuous roll, TIDAK BOLEH ada page break */
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        page-break-before: avoid !important;
                        page-break-after: avoid !important;
                    }

                    /* Semua elemen dalam receipt jangan terputus */
                    .receipt-container * {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    /* Print container: static agar tidak ada issue absolute positioning */
                    .print-visible-modal-container {
                        display: block !important;
                        position: static !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Sembunyikan elemen non-print */
                    .no-print-modal { 
                        display: none !important; 
                    }

                    /* === PENTING: Paksa Tailwind Grid utilities bekerja saat print ===
                       Tailwind's display:grid kadang tidak terapply di print mode Chrome */
                    .grid {
                        display: grid !important;
                    }
                    .grid-cols-\\[1fr_25px_auto\\] {
                        grid-template-columns: 1fr 25px auto !important;
                    }
                    .gap-x-2 {
                        column-gap: 0.5rem !important;
                    }
                    .items-start {
                        align-items: start !important;
                    }
                    /* Kolom QTY dan HARGA harus center/right */
                    .text-center {
                        text-align: center !important;
                    }
                    .text-right {
                        text-align: right !important;
                    }
                    .min-w-\\[70px\\] {
                        min-width: 70px !important;
                    }
                    .font-bold {
                        font-weight: 700 !important;
                    }
                    .justify-between {
                        justify-content: space-between !important;
                    }
                    .flex {
                        display: flex !important;
                    }
                }
            `}</style>

            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity no-print-modal" onClick={onClose}></div>

            <div className="relative bg-white rounded-t-[2rem] sm:rounded-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] sm:h-auto animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 z-[10000] no-print-modal">
                
                {/* Drag Indicator for Mobile */}
                <div className="w-full flex justify-center pt-3 pb-2 sm:hidden absolute top-0 z-20 bg-gradient-to-b from-slate-50 via-slate-50 to-transparent">
                    <div className="w-12 h-1.5 bg-slate-200/80 rounded-full" />
                </div>

                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-100 p-5 pt-10 sm:pt-6 sm:p-6 flex justify-between items-start sm:items-center shrink-0">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border-2 border-indigo-100 shadow-sm shrink-0">
                            <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="pt-0.5 sm:pt-0">
                            <h3 className="font-black text-slate-800 text-lg sm:text-xl tracking-tight leading-none text-left mb-1 sm:mb-0">Reprint Invoice</h3>
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest sm:tracking-[0.2em] sm:mt-1.5 text-left truncate">
                                {data?.invoiceNumber ? `${data.invoiceNumber}` : 'Thermal Preview'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 sm:p-3 rounded-xl sm:rounded-2xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all active:scale-90 shrink-0 bg-white sm:bg-transparent border border-slate-100 sm:border-transparent">
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar bg-slate-100/50 p-6 sm:p-8 flex flex-col items-center">
                    {loading ? (
                        <div className="py-20 text-center space-y-6">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                <Receipt className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-indigo-600" />
                            </div>
                            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Menyiapkan Dokumen...</p>
                        </div>
                    ) : error ? (
                        <div className="py-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto border-2 border-rose-100 shadow-lg shadow-rose-100/50">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <p className="text-rose-600 font-bold text-lg px-6">{error}</p>
                            <button onClick={fetchData} className="px-6 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-black text-slate-600 shadow-sm hover:border-indigo-600 hover:text-indigo-600 transition-all">
                                Coba Lagi
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white shadow-2xl rounded-sm p-4 w-[85mm] transform origin-top">
                            {/* The actual thermal receipt layout */}
                            <ThermalReceipt tx={data} settings={settings} isReprint={true} />
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!loading && !error && (
                    <div 
                        className="p-4 sm:p-6 bg-white border-t border-slate-100 flex flex-col gap-3 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] relative z-20"
                        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 16px)' }}
                    >
                        <div className="flex gap-2 w-full">
                            <button
                                onClick={handlePrint}
                                className="flex-[1] py-3.5 sm:py-4 bg-slate-900 hover:bg-black text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs transition-all active:scale-95 shadow-lg shadow-slate-200 flex items-center justify-center gap-2 uppercase"
                            >
                                <Printer className="w-4 h-4" />
                                PDF/USB
                            </button>
                            <div className="flex bg-slate-100 rounded-xl sm:rounded-2xl p-1">
                                <button onClick={() => setPaperSize(58)} className={`px-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${paperSize === 58 ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>58</button>
                                <button onClick={() => setPaperSize(80)} className={`px-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${paperSize === 80 ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>80</button>
                            </div>
                            <button
                                onClick={handleBluetoothPrint}
                                disabled={isBluetoothPrinting}
                                className="flex-[1.5] py-3.5 sm:py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs transition-all active:scale-95 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 uppercase disabled:opacity-50"
                            >
                                {isBluetoothPrinting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Bluetooth className="w-4 h-4" />}
                                Cetak BT
                            </button>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full py-3.5 sm:py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all active:scale-95 text-center"
                        >
                            TUTUP
                        </button>
                    </div>
                )}
            </div>

            {/* Print-only container for clean layout */}
            <div className="print-visible-modal-container hidden print:block">
                {!loading && !error && data && settings && (
                    <ThermalReceipt tx={data} settings={settings} isReprint={true} />
                )}
            </div>
        </div>,
        document.body
    );
};

export default TransactionReprintModal;
