/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Receipt, Calendar, Printer, CreditCard, ArrowLeft, ChevronRight, DollarSign, Wallet, History, AlertCircle, Timer, Search, XSquare, CheckCircle2, QrCode, Merge, Clock, Receipt as ReceiptIcon, Calculator, Coffee } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import { useAlert } from '@/components/ui/AlertProvider';
import PaymentConfirmationModal from '@/components/billing/PaymentConfirmationModal';
import SplitBillDashboard from '@/components/billing/SplitBillDashboard';
import { useAuth } from '@/context/AuthContext';
import ThermalReceipt from '@/components/ThermalReceipt';
import { useMqtt } from '@/context/MqttContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function BillingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showAlert, showConfirm } = useAlert();
    const { user, activeShift } = useAuth();
    const { subscribe } = useMqtt();
    const tableId = searchParams.get('tableId');
    const tableType = searchParams.get('type');
    const transactionId = searchParams.get('transactionId');
    const [transaction, setTransaction] = useState<any>(null);
    const [tables, setTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [settings, setSettings] = useState<any>(null);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [isPartialMode, setIsPartialMode] = useState(false);
    const [splitResult, setSplitResult] = useState<any>(null);
    const [isSplitBillOpen, setIsSplitBillOpen] = useState(false);

    const fetchSettings = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSettings(response.data);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    }, []);

    const fetchTransaction = useCallback(async () => {
        try {
            // Prefer fetching by transactionId first (more reliable, works for PARTIAL status)
            // Fall back to tableId only if no transactionId available
            const knownTxId = transactionId || transaction?.id;
            const url = knownTxId
                ? `${API_URL}/transactions/${knownTxId}`
                : `${API_URL}/transactions/table/${tableId}${tableType ? `?type=${tableType}` : ''}`;
            const token = localStorage.getItem('token');
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTransaction(response.data);
            setPaymentAmount(Math.round(
                Math.max(0, Number(response.data.grandTotal) - Number(response.data.paidAmount || 0))
            ).toString());
        } catch (error) {
            console.error('Failed to fetch transaction:', error);
            showAlert('Data Tidak Ditemukan', 'Tidak ada billing aktif untuk data ini.', { variant: 'error' });
            router.push(tableType === 'cafe' ? '/cafe' : '/');
        } finally {
            setLoading(false);
        }
    }, [transactionId, tableId, transaction?.id, router, showAlert]);

    const fetchTables = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/billiard/tables`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTables(response.data);
        } catch (error) {
            console.error('Failed to fetch tables:', error);
        }
    }, []);

    useEffect(() => {
        if (tableId || transactionId) {
            fetchTransaction();
            fetchTables();
            fetchSettings();

            // Handle pre-selected items from URL (Partial Payment)
            const queryItems = searchParams.get('selectedItems');
            if (queryItems) {
                const ids = queryItems.split(',').map(Number);
                setSelectedItems(ids);
                setIsPartialMode(true);
            }
        }
    }, [tableId, transactionId, searchParams, fetchTransaction, fetchTables, fetchSettings]);

    const transactionRef = useRef<any>(null);
    useEffect(() => { transactionRef.current = transaction; }, [transaction]);

    useEffect(() => {
        return subscribe('billiard/member/+/balance', (data: { memberId: number, balance: number }) => {
            const tx = transactionRef.current;
            if (tx && tx.member && tx.member.id === data.memberId) {
                setTransaction((prev: any) => ({
                    ...prev,
                    member: { ...prev.member, balance: data.balance }
                }));
            }
        });
    }, [subscribe]); // subscribe is stable — no other deps needed



    const handleMergePrompt = async () => {
        const targetTableId = prompt('Masukkan ID Meja target untuk gabung billing:');
        if (targetTableId) {
            handleMergeBill(Number(targetTableId));
        }
    };

    const handleMergeBill = async (targetTableId: number) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/transactions/merge`, {
                sourceTableId: Number(tableId),
                targetTableId,
                userId: user?.id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await showAlert('Berhasil', 'Billing berhasil digabung ke meja target!', { variant: 'success' });
            router.push(tableType === 'cafe' ? `/cafe?refresh=${Date.now()}` : `/?refresh=${Date.now()}`);
        } catch (error) {
            showAlert('Gagal', 'Gagal menggabung meja. Pastikan meja target memiliki billing aktif.', { variant: 'error' });
        }
    };

    const handlePayment = () => {
        if (!transaction) return;
        if (!paymentMethod) {
            showAlert('Metode Pembayaran', 'Silakan pilih metode transaksi terlebih dahulu!', { variant: 'warning' });
            return;
        }
        setIsConfirmModalOpen(true);
    };

    const processPayment = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            if (isPartialMode && selectedItems.length > 0) {
                // Partial payment for specific items
                await axios.post(`${API_URL}/transactions/${transaction.id}/pay-items`, {
                    orderItemIds: selectedItems,
                    paymentMethod: paymentMethod.toLowerCase(),
                    userId: user?.id
                }, config);
                await showAlert('Pembayaran Parsial Berhasil', `Berhasil membayar ${selectedItems.length} item!`, { variant: 'success' });
                // Reset mode and reload
                setIsPartialMode(false);
                setSelectedItems([]);
                fetchTransaction();
            } else {
                // Full payment
                await axios.post(`${API_URL}/transactions/${transaction.id}/pay`, {
                    amount: Number(paymentAmount),
                    method: paymentMethod.toUpperCase(), // Ensure uppercase for backend
                    staff: user?.name || 'Staff',
                    userId: user?.id
                }, config);
                await showAlert('Pembayaran Berhasil', `Pembayaran Berhasil menggunakan ${paymentMethod}!`, { variant: 'success' });
                router.push(tableType === 'cafe' ? '/cafe' : '/');
            }
            setIsConfirmModalOpen(false);
        } catch (error) {
            console.error('Payment failed:', error);
            showAlert('Gagal', 'Pembayaran gagal diproses.', { variant: 'error' });
        }
    };

    const handleSplitEvenly = async () => {
        setIsSplitBillOpen(true);
    };

    const toggleItemSelection = (itemId: number) => {
        const item = transaction.orderItems.find((i: any) => i.id === itemId);
        if (!item) return;

        const itemIdsToToggle = item.bundleGroupId
            ? transaction.orderItems.filter((i: any) => i.bundleGroupId === item.bundleGroupId).map((i: any) => i.id)
            : [itemId];

        setSelectedItems(prev => {
            const isAlreadySelected = prev.includes(itemId);
            if (isAlreadySelected) {
                return prev.filter(id => !itemIdsToToggle.includes(id));
            } else {
                return [...prev, ...itemIdsToToggle];
            }
        });
    };

    const calculateVitals = (itemsList: any[], billiardAmt: number = 0) => {
        const itemsSubtotal = itemsList
            .filter((item: any) => item.status?.toUpperCase() !== 'CANCELLED')
            .reduce((sum: number, item: any) => sum + (Number(item.priceAtOrder) * item.quantity), 0);

        const subtotal = itemsSubtotal + billiardAmt;

        // Apply promotional logic if it's a full receipt
        let totalDiscount = 0;
        const isFullBill = itemsList.length === (transaction?.orderItems?.filter((i: any) => i.status?.toUpperCase() !== 'CANCELLED').length || 0);

        if (isFullBill && transaction?.appliedPromos && Array.isArray(transaction.appliedPromos)) {
            totalDiscount = transaction.appliedPromos.reduce((sum: number, p: any) => sum + Number(p.discount || 0), 0);
        }

        const discountedSubtotal = Math.max(0, subtotal - totalDiscount);

        const scPercent = Number(settings?.serviceChargePercentage || 0) / 100;
        const vatPercent = Number(settings?.ppnPercentage || 0) / 100;

        const sc = Math.round(discountedSubtotal * scPercent);
        const vat = Math.round((discountedSubtotal + sc) * vatPercent);
        const rawTotal = discountedSubtotal + sc + vat;

        const kelipatan = Math.max(1, Number(settings?.roundingKelipatan || 1));
        const grandTotal = Math.ceil(rawTotal / kelipatan) * kelipatan;
        const rounding = grandTotal - rawTotal;

        return { subtotal, sc, vat, rounding, grandTotal, totalDiscount };
    };

    const calculateSelectedTotal = () => {
        if (!transaction) return 0;
        const itemsToPay = (transaction.orderItems || []).filter((item: any) => selectedItems.includes(item.id));
        return calculateVitals(itemsToPay, 0).grandTotal;
    };

    useEffect(() => {
        if (isPartialMode) {
            setPaymentAmount(calculateSelectedTotal().toString());
        } else if (!splitResult && transaction) {
            const fullVitals = calculateVitals(
                (transaction.orderItems || []).filter((i: any) => !i.isPaid),
                Number(transaction.billiardTotal || 0)
            );
            const remaining = Math.round(fullVitals.grandTotal);
            setPaymentAmount(Math.max(0, remaining).toString());
        }
    }, [selectedItems, isPartialMode, transaction, settings, splitResult]);

    const handleHoldBill = async () => {
        if (!transaction) return;

        const confirmMsg = transaction.status === 'DEBT'
            ? 'Simpan perubahan rincian tagihan (piutang tetap aktif)?'
            : 'Lepas meja dan simpan tagihan untuk dibayar nanti?';

        const isInfos = await showConfirm(
            transaction.status === 'DEBT' ? 'Update Piutang' : 'Hold Bill / Bayar Nanti',
            confirmMsg,
            { confirmLabel: 'Ya, Simpan' }
        );

        if (isInfos) {
            try {
                const token = localStorage.getItem('token');
                await axios.post(`${API_URL}/transactions/${transaction.id}/hold`, {
                    userId: user?.id
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                await showAlert('Berhasil', 'Tagihan disimpan sebagai PIUTANG (Hutang).', { variant: 'success' });
                router.push('/admin/finance/debts');
            } catch (error) {
                console.error('Hold failed:', error);
                showAlert('Gagal', 'Gagal memproses piutang.', { variant: 'error' });
            }
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const getRemainingBalance = () => {
        if (!transaction) return 0;
        const remainingItems = (transaction.orderItems || []).filter((i: any) => !i.isPaid);
        const vitals = calculateVitals(remainingItems, Number(transaction.billiardTotal || 0));
        return vitals.grandTotal;
    };

    const remainingBalance = getRemainingBalance();
    const requiredAmount = isPartialMode ? calculateSelectedTotal() : remainingBalance;

    if (loading || !transaction) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 font-bold animate-pulse">Menyiapkan Informasi Billing...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F1F5F9] pb-20 print:bg-white print:pb-0 print:min-h-0">
            {/* Elegant Print Styles */}
            <style jsx global>{`
                @media print {
                    @page { 
                        margin: 0; 
                        size: 80mm auto;
                    }
                    html, body { 
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    #printable-invoice {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        z-index: 99999 !important;
                        background: white !important;
                    }
                    .print-hidden, nav, aside, header, footer { display: none !important; }
                    .print-only { display: block !important; }
                }
            `}</style>

            {/* Navigation Bar */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-50 print:hidden shadow-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <button onClick={() => router.push(tableType === 'cafe' ? '/cafe' : '/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors group">
                            <ArrowLeft className="w-6 h-6 text-slate-400 group-hover:text-indigo-600" />
                        </button>
                        <div>
                            <h1 className="text-lg font-black text-slate-900 leading-tight">Billing Kasir</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                KASIR: {user?.name ? `${user.name}${activeShift?.shiftName ? ` (${activeShift.shiftName})` : ''}` : (activeShift?.shiftName || 'ADMIN').toUpperCase()}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">


                        <button
                            onClick={handleMergePrompt}
                            className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                            <Merge className="w-4 h-4" /> GABUNG
                        </button>

                        <button
                            onClick={handleSplitEvenly}
                            className="bg-indigo-50 border border-indigo-100 text-indigo-600 px-4 py-2.5 rounded-2xl font-bold hover:bg-indigo-100 transition-all flex items-center gap-2"
                        >
                            <Calculator className="w-4 h-4" /> SPLIT BILL
                        </button>

                        {isPartialMode && (
                            <button
                                onClick={() => {
                                    setIsPartialMode(false);
                                    setSelectedItems([]);
                                }}
                                className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-2.5 rounded-2xl font-bold hover:bg-rose-100 transition-all flex items-center gap-2"
                                title="Batalkan Bayar Cicil"
                            >
                                <XSquare className="w-4 h-4" /> BATAL CICIL
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10 print:block print:p-0 print:m-0">
                {/* Invoice Body (Left Column) */}
                <div className="lg:col-span-7 flex flex-col gap-6 print:block">
                    {/* Visual Invoice Preview (Elegant Design) */}
                    <div id="printable-invoice" className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-white relative overflow-hidden print:shadow-none print:border-none print:rounded-none print:bg-white">
                        {/* Decorative Top Bar */}
                        <div className="h-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 print:hidden"></div>

                        <div className="p-8 lg:p-12 print:p-0">


                            {/* Standard Thermal Component for Print/Preview */}
                            <div className="flex flex-col items-center">
                                <div className="bg-white p-0 w-full print:shadow-none print:border-none">
                                    <ThermalReceipt
                                        tx={transaction}
                                        settings={settings}
                                        cashierName={user?.name ? `${user.name}${activeShift?.shiftName ? ` (${activeShift.shiftName})` : ''}` : (activeShift?.shiftName || 'ADMIN')}
                                        selectedItemIds={isPartialMode ? selectedItems : []}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Vertical Payment Sidebar (On-Screen Only) */}
                <div className="lg:col-span-5 flex flex-col gap-8 print:hidden">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-10 border border-white sticky top-28">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 shadow-xl shadow-green-100/50">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 leading-tight">Proses Pembayaran</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Final Step Check-out</p>
                            </div>
                        </div>

                        {/* Payment Method Selector */}
                        <div className="mb-10">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">1. Metode Pembayaran</label>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {(() => {
                                    const payEmoji = (m: string) => {
                                        const s = m.toLowerCase();
                                        if (s.includes('cash') || s.includes('tunai')) return '💵';
                                        if (s.includes('qris') || s.includes('qr')) return '📱';
                                        if (s.includes('debit') || s.includes('card') || s.includes('bank')) return '💳';
                                        if (s.includes('transfer')) return '🏦';
                                        return '💰';
                                    };

                                    const baseMethods = (settings?.availablePaymentMethods || ['Cash', 'QRIS', 'Debit Card']);
                                    const availableMethods = transaction?.memberId ? Array.from(new Set(['MEMBERSHIP', ...baseMethods])) : baseMethods;

                                    return availableMethods.map((method: string) => (
                                        <button
                                            key={method}
                                            onClick={() => setPaymentMethod(method)}
                                            className={`py-4 px-6 rounded-2xl font-black text-xs uppercase transition-all border-2 relative overflow-hidden group ${paymentMethod === method
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-2xl shadow-slate-300'
                                                : method === 'MEMBERSHIP'
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                                                    : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-100 hover:text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                <span className="text-base">{method === 'MEMBERSHIP' ? '👤' : payEmoji(method)}</span>
                                                {method}
                                            </span>
                                            {paymentMethod === method && (
                                                <div className="absolute right-0 top-0 w-8 h-8 bg-white/10 rotate-[20deg] translate-x-3 -translate-y-3"></div>
                                            )}
                                        </button>
                                    ));
                                })()}
                            </div>
                        </div>

                        {/* Numeric Keypad Input */}
                        <div className="mb-8">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 block mb-4">2. Nominal Pembayaran (Rp)</label>
                            <div className="relative mb-6">
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className={`w-full p-6 bg-slate-50 border-2 rounded-[1.5rem] text-4xl font-black focus:ring-8 focus:outline-none transition-all text-center ${Number(paymentAmount) < requiredAmount
                                        ? 'border-red-100 text-red-600 focus:ring-red-50 ring-offset-3'
                                        : 'border-slate-50 text-slate-900 focus:ring-indigo-50 shadow-inner'
                                        }`}
                                />
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl">Rp</div>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0, '00'].map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setPaymentAmount(prev => (prev === '0' || prev === '' ? num.toString() : prev + num.toString()))}
                                        className="py-5 bg-white border border-slate-100 hover:bg-slate-50 text-slate-700 text-xl font-black rounded-2xl transition-all shadow-sm active:scale-90 hover:shadow-md"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button type="button" onClick={() => setPaymentAmount('')} className="py-5 bg-white border border-rose-100 hover:bg-rose-50 text-rose-500 text-xl font-black rounded-2xl transition-all shadow-sm active:scale-90">
                                    C
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentAmount(Math.max(0, requiredAmount).toString())}
                                    className="col-span-2 py-5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-600 hover:text-white text-indigo-600 text-[10px] font-black rounded-2xl transition-all shadow-sm active:scale-95 uppercase tracking-widest"
                                >
                                    Bayar Sisa (Pas)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const current = Number(paymentAmount || 0);
                                        const next50 = Math.ceil((current + 1) / 50000) * 50000;
                                        setPaymentAmount(next50.toString());
                                    }}
                                    className="col-span-2 py-5 bg-slate-900 border border-slate-900 text-white text-[10px] font-black rounded-2xl transition-all shadow-xl shadow-slate-200 active:scale-95 uppercase tracking-widest"
                                >
                                    Bulat Ke 50K
                                </button>
                            </div>
                        </div>

                        {/* Change Money Display */}
                        {Number(paymentAmount) > (Number(transaction?.grandTotal || 0) - Number(transaction?.paidAmount || 0)) && (
                            <div className="bg-emerald-50 rounded-[1.5rem] p-6 border border-emerald-100 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Kembalian</p>
                                    <p className="text-2xl font-black text-emerald-700 font-mono">
                                        <span className="text-lg text-emerald-400/60 mr-1">Rp</span>
                                        {Math.round(Number(paymentAmount) - requiredAmount).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-4 mt-6">
                            {paymentMethod === 'MEMBERSHIP' && transaction?.member && (
                                <div className={`mb-6 p-6 rounded-3xl border-2 transition-all ${Number(transaction.member.balance) < Number(paymentAmount)
                                    ? 'bg-rose-50 border-rose-200 animate-pulse'
                                    : 'bg-emerald-50 border-emerald-200'
                                    }`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Member</p>
                                        <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${Number(transaction.member.balance) < Number(paymentAmount) ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                            {Number(transaction.member.balance) < Number(paymentAmount) ? 'Saldo Kurang' : 'Saldo Cukup'}
                                        </div>
                                    </div>
                                    <p className={`text-3xl font-black ${Number(transaction.member.balance) < Number(paymentAmount) ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        <span className="text-sm mr-1">Rp</span>
                                        {Number(transaction.member.balance).toLocaleString('id-ID')}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-tight">
                                        {transaction.member.name} ({transaction.member.tier?.name || 'MEMBER'})
                                    </p>
                                </div>
                            )}

                            <button
                                disabled={!paymentMethod || Number(paymentAmount) < requiredAmount || (paymentMethod === 'MEMBERSHIP' && Number(transaction?.member?.balance || 0) < Number(paymentAmount))}
                                onClick={handlePayment}
                                className={`w-full py-6 rounded-[1.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all relative overflow-hidden flex items-center justify-center gap-3 ${(!paymentMethod || Number(paymentAmount) < requiredAmount || (paymentMethod === 'MEMBERSHIP' && Number(transaction?.member?.balance || 0) < Number(paymentAmount)))
                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 ring-4 ring-indigo-50'
                                    }`}
                            >
                                <Printer className="w-6 h-6" />
                                {!paymentMethod ? 'PILIH METODE' : (Number(paymentAmount) < requiredAmount ? 'NOMINAL KURANG' : (paymentMethod === 'MEMBERSHIP' && Number(transaction?.member?.balance || 0) < Number(paymentAmount) ? 'SALDO MEMBER KURANG' : 'BAYAR & CETAK STRUK'))}
                            </button>

                            <button onClick={handleHoldBill} className="w-full bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-400 py-4 rounded-[1.25rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all active:scale-95">
                                ⏱️ Simpan / Bayar Nanti
                            </button>
                        </div>
                    </div>
                </div>
            </main>


            <PaymentConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={processPayment}
                onPrint={handlePrint}
                data={{
                    total: requiredAmount,
                    method: paymentMethod || '',
                    payAmount: Number(paymentAmount || 0),
                    change: Math.max(0, Number(paymentAmount || 0) - requiredAmount)
                }}
            />

            {isSplitBillOpen && (
                <SplitBillDashboard
                    transaction={transaction}
                    settings={settings}
                    onPaymentSuccess={(updatedTx) => {
                        if (updatedTx) {
                            setTransaction(updatedTx);
                        } else {
                            fetchTransaction();
                        }
                    }}
                    onClose={() => setIsSplitBillOpen(false)}
                />
            )}
        </div>
    );
}

export default function BillingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            </div>
        }>
            <BillingContent />
        </Suspense>
    );
}
