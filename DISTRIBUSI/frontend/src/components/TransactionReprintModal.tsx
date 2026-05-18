'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { X, Receipt, Printer, Loader2, AlertCircle } from 'lucide-react';
import ThermalReceipt from './ThermalReceipt';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

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

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 reprint-modal-portal">
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

            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md transition-opacity no-print-modal" onClick={onClose}></div>

            <div className="relative bg-white rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 z-[10000] no-print-modal">
                {/* Header omitted for brevity in chunk but it's there in the file */}
                <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border-2 border-indigo-100 shadow-sm">
                            <Receipt className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-xl tracking-tight leading-none text-left">Reprint Invoice</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 text-left">
                                {data?.invoiceNumber ? `${data.invoiceNumber} • ` : ''}Thermal Receipt Preview
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 rounded-2xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all active:scale-90">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar bg-slate-100/50 p-8 flex flex-col items-center">
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
                        <div className="bg-white shadow-2xl rounded-sm p-4 w-[85mm] transform origin-top print:shadow-none print:p-0">
                            {/* The actual thermal receipt layout */}
                            <ThermalReceipt tx={data} settings={settings} isReprint={true} />
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!loading && !error && (
                    <div className="p-6 bg-white border-t border-slate-100 flex gap-4 shrink-0">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black text-sm transition-all active:scale-95"
                        >
                            BATAL
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-indigo-200 flex items-center justify-center gap-3"
                        >
                            <Printer className="w-5 h-5" />
                            CETAK NOTA
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
