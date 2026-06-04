'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom'; // Added import
import { X, Receipt, Clock, Coffee, ChevronRight, Calculator, CreditCard, Printer, Bluetooth } from 'lucide-react';
import ThermalReceipt from './ThermalReceipt';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { printReceiptBluetooth } from '@/utils/bluetoothPrinter';

interface TableInvoicePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableId: number;
    tableName: string;
    initialData?: any;
    type?: 'billiard' | 'cafe';
}

interface TransactionPreview {
    id: number;
    invoiceNumber: string;
    fareName?: string | null;
    startTime: string; // from table/transaction
    durationMinutes: number;
    billiardTotal: number;
    cafeTotal: number;
    grandTotal: number;
    orderItems: Array<{
        id: number;
        quantity: number;
        priceAtOrder: number;
        customName?: string;
        menuItem: {
            name: string;
            price: number;
        };
    }>;
    billingDetails?: Array<{
        title?: string;
        name?: string; // Fallback
        slot?: string;
        duration?: number;
        subtotal?: number;
        price?: number; // Fallback
    }>;
    serviceChargeAmount?: number;
    vatAmount?: number;
    roundingAmount?: number;
    paidAmount?: number;
    paymentDetails?: { method?: string; amount?: number };
}

const TableInvoicePreviewModal: React.FC<TableInvoicePreviewModalProps> = ({ isOpen, onClose, tableId, tableName, initialData, type = 'billiard' }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isBluetoothPrinting, setIsBluetoothPrinting] = useState(false);
    const [paperSize, setPaperSize] = useState<58 | 80>(58);
    const { user, activeShift } = useAuth();

    useEffect(() => {
        setMounted(true);
    }, []);

    useBodyScrollLock(isOpen && mounted);

    useEffect(() => {
        if (isOpen && tableId) {
            // Only reset loading if we're switching to a different transaction
            const isNewTransaction = initialData?.id !== data?.id;
            
            if (isNewTransaction) {
                if (initialData) {
                    setData(initialData);
                    setLoading(false);
                } else {
                    setData(null);
                    setLoading(true);
                }
            } else if (initialData) {
                // Same transaction ID, but updated state (e.g. price update)
                // We update DATA without resetting loading to prevent flickering
                setData((prev: any) => ({ ...prev, ...initialData }));
            }
            
            // Fetch fresh data in background
            fetchData(isNewTransaction && !initialData);
        } else if (!isOpen) {
            // Clean up when closed to ensure fresh start next time
            setData(null);
            setLoading(true);
        }
    }, [isOpen, tableId, initialData?.id]); // Only react to ID change or open/close

    const fetchData = async (showLoading = false) => {
        if (showLoading) {
            setLoading(true);
        }
        setError(null);
        try {
            const [txRes, settingsRes] = await Promise.all([
                axios.get(`/transactions/table/${tableId}?type=${type}`),
                axios.get(`/settings`)
            ]);
            setData(txRes.data);
            setSettings(settingsRes.data);
        } catch (err) {
            console.error(err);
            // Only show error if we don't have any data to show
            if (!data) setError('Gagal memuat data nota.');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
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
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 table-preview-portal">
            <style jsx global>{`
                @media print {
                    /* Header & Footer removal */
                    @page { 
                        margin: 0; 
                        size: 80mm auto;
                    }
                    
                    /* Hide everything except the portal */
                    body > *:not(.table-preview-portal) {
                        display: none !important;
                    }
                    
                    /* Within portal, hide everything except the print container */
                    .table-preview-portal > *:not(.print-visible-modal-container) {
                        display: none !important;
                    }

                    /* Ensure background is white and clean */
                    body { 
                        background: white !important; 
                        margin: 0 !important; 
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact;
                        display: block !important; /* Ensure it's not flex which might center vertically */
                    }

                    /* Force top alignment for the print container */
                    .print-visible-modal-container {
                        display: block !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Hide specific elements that shouldn't print */
                    .no-print-modal { 
                        display: none !important; 
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
                            <h3 className="font-black text-slate-800 text-lg sm:text-xl tracking-tight leading-none text-left mb-1 sm:mb-0">Nota Sementara</h3>
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest sm:tracking-[0.2em] sm:mt-1.5 text-left">{tableName}</p>
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
                                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                                <Receipt className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-indigo-600" />
                            </div>
                            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Menghitung Tagihan...</p>
                        </div>
                    ) : error ? (
                        <div className="py-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto border-2 border-rose-100 shadow-lg shadow-rose-100/50">
                                <Clock className="w-8 h-8" />
                            </div>
                            <p className="text-rose-600 font-bold text-lg px-6">{error}</p>
                            <button onClick={() => fetchData(true)} className="px-6 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-black text-slate-600 shadow-sm hover:border-indigo-600 hover:text-indigo-600 transition-all">
                                Coba Lagi
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white shadow-2xl rounded-sm p-4 w-[85mm] transform origin-top">
                            <ThermalReceipt
                                tx={data}
                                settings={settings}
                                isTemporary={true}
                                cashierName={user?.name ? `${user?.name}${activeShift?.shiftName ? ` (${activeShift.shiftName})` : ''}` : (activeShift?.shiftName || 'ADMIN')}
                            />
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

            {/* Print-only container */}
            <div className="print-visible-modal-container hidden print:block">
                {!loading && !error && data && settings && (
                    <ThermalReceipt
                        tx={data}
                        settings={settings}
                        isTemporary={true}
                        cashierName={user?.name ? `${user?.name}${activeShift?.shiftName ? ` (${activeShift.shiftName})` : ''}` : (activeShift?.shiftName || 'ADMIN')}
                    />
                )}
            </div>
        </div>,
        document.body
    );
};

export default TableInvoicePreviewModal;
