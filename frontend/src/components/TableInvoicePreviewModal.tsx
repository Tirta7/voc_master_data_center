'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom'; // Added import
import { X, Receipt, Clock, Coffee, ChevronRight, Calculator, CreditCard, Printer } from 'lucide-react';
import ThermalReceipt from './ThermalReceipt';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface TableInvoicePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableId: number;
    tableName: string;
    initialData?: any;
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

const TableInvoicePreviewModal: React.FC<TableInvoicePreviewModalProps> = ({ isOpen, onClose, tableId, tableName, initialData }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const { user, activeShift } = useAuth();

    useEffect(() => {
        setMounted(true);
    }, []);

    useBodyScrollLock(isOpen && mounted);

    useEffect(() => {
        if (isOpen && tableId) {
            if (initialData) {
                setData(initialData);
                setLoading(false);
            } else {
                setData(null);
                setLoading(true);
            }
            fetchData();
        } else {
            setData(null);
            setLoading(true);
        }
    }, [isOpen, tableId, initialData]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const token = localStorage.getItem('token');
            const [txRes, settingsRes] = await Promise.all([
                axios.get(`${API_URL}/transactions/table/${tableId}?type=billiard`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                axios.get(`${API_URL}/settings`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);
            setData(txRes.data);
            setSettings(settingsRes.data);
        } catch (err) {
            console.error(err);
            setError('Gagal memuat data nota.');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 table-preview-portal">
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: 80mm auto; }
                    body > *:not(.table-preview-portal) { display: none !important; }
                    .table-preview-portal > *:not(.print-visible-modal-container) { display: none !important; }
                    body { 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        display: flex !important;
                        justify-content: center !important;
                        background: white !important; 
                    }
                    .print-visible-modal-container {
                        display: block !important;
                        width: 80mm !important;
                    }
                    .no-print-modal { display: none !important; }
                }
            `}</style>

            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity no-print-modal" onClick={onClose}></div>

            <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300 z-[10000] no-print-modal">
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border-2 border-indigo-100 shadow-sm">
                            <Receipt className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-xl tracking-tight leading-none text-left">Nota Sementara</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 text-left">{tableName}</p>
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
                            <button onClick={fetchData} className="px-6 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-black text-slate-600 shadow-sm hover:border-indigo-600 hover:text-indigo-600 transition-all">
                                Coba Lagi
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white shadow-2xl rounded-sm p-4 w-[85mm] transform origin-top">
                            <ThermalReceipt
                                tx={data}
                                settings={settings}
                                isTemporary={true}
                                cashierName={user?.name ? `${user.name}${activeShift?.shiftName ? ` (${activeShift.shiftName})` : ''}` : (activeShift?.shiftName || 'ADMIN')}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!loading && !error && (
                    <div className="p-6 bg-white border-t border-slate-100 flex gap-4 shrink-0">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black text-sm transition-all active:scale-95 text-center"
                        >
                            TUTUP
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex-[2] py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-slate-200 flex items-center justify-center gap-3"
                        >
                            <Printer className="w-5 h-5" />
                            CETAK NOTA SEMENTARA
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
                        cashierName={user?.name ? `${user.name}${activeShift?.shiftName ? ` (${activeShift.shiftName})` : ''}` : (activeShift?.shiftName || 'ADMIN')}
                    />
                )}
            </div>
        </div>,
        document.body
    );
};

export default TableInvoicePreviewModal;
